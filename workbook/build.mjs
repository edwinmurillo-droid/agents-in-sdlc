// Builds the workbook from docs/ plus the authored content in workbook/content/.
//
//   node workbook/build.mjs                 build everything into workbook/dist/
//   node workbook/build.mjs --check         also exit 1 if any lesson is new or changed since its content was written
//   node workbook/build.mjs --accept ids    record the current lesson hashes (comma-separated ids, or "all")
//                                           after updating their content in content/lessons.json

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extract, TRACKS } from './extract.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, 'dist');
const CONTENT = join(HERE, 'content');
const SITE = 'https://github-samples.github.io/copilot-workshops';
const REPO = 'https://github.com/edwinmurillo-droid/agents-in-sdlc';
const LIBRARY_KINDS = ['prompt', 'issue', 'instructions', 'slash'];

const readJSON = (name) => JSON.parse(readFileSync(join(CONTENT, name), 'utf8'));

/** Deterministic permutation of 0..n-1 seeded by a string, so builds are reproducible. */
function permutation(n, seed) {
  const order = [...Array(n).keys()];
  let h = createHash('sha256').update(seed).digest();
  for (let i = n - 1; i > 0; i--) {
    if (i >= h.length) h = createHash('sha256').update(h).digest();
    const j = h[i] % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Shuffles a question's options (authored with the correct one first) or scrambles an ordering question. */
function prepareQuestion(q, id) {
  if (q.type === 'order') {
    let start = permutation(q.items.length, id);
    if (start.every((v, i) => v === i)) start = start.slice().reverse();
    return { id, type: 'order', q: q.q, items: q.items, start, why: q.why };
  }
  const keepOrder = q.options.length === 2 && /^True$/.test(q.options[0]);
  const order = keepOrder ? [0, 1] : permutation(q.options.length, id);
  return { id, type: 'choice', q: q.q, options: order.map((i) => q.options[i]), answer: order.indexOf(0), why: q.why };
}

/** A two-minute recording outline for a lesson's Bubbles walkthrough. */
function recordingScript(lesson, content, next) {
  const demo = lesson.blocks.find((b) => b.kind === 'prompt' || b.kind === 'issue');
  return {
    hook: content.summary,
    show: (lesson.sections.length ? lesson.sections : ['The lesson page']).slice(0, 5),
    say: content.concepts.slice(0, 3),
    demo: demo ? demo.text : '',
    close: next ? `Next up: ${next.title}.` : 'That completes the track. Try the track quiz in the workbook.',
  };
}

function build({ check, accept }) {
  const lessons = extract(join(HERE, '..', 'docs'));
  const content = readJSON('lessons.json');
  const videos = readJSON('videos.json').links;
  const cheatsheets = readJSON('cheatsheets.json');

  if (accept) {
    const ids = accept === 'all' ? lessons.map((l) => l.id) : accept.split(',');
    for (const id of ids) {
      const lesson = lessons.find((l) => l.id === id);
      if (!lesson || !content[id]) throw new Error(`Can't accept ${id}: no lesson or no content entry.`);
      const { sourceHash, ...rest } = content[id];
      content[id] = { sourceHash: lesson.hash, ...rest };
    }
    writeFileSync(join(CONTENT, 'lessons.json'), JSON.stringify(content, null, 2) + '\n');
    console.log(`Recorded current source hashes for ${ids.length} lesson(s).`);
  }

  const missing = lessons.filter((l) => !content[l.id]).map((l) => l.id);
  if (missing.length) {
    console.error(`No workbook content for: ${missing.join(', ')}. Add entries to workbook/content/lessons.json.`);
    process.exit(1);
  }
  const orphaned = Object.keys(content).filter((id) => !lessons.some((l) => l.id === id));
  const stale = lessons.filter((l) => content[l.id].sourceHash !== l.hash).map((l) => l.id);

  const out = { generated: new Date().toISOString().slice(0, 10), tracks: [], lessons: {}, prompts: [], cheatsheets };
  for (const track of TRACKS) {
    const trackLessons = lessons.filter((l) => l.track === track.id);
    out.tracks.push({ ...track, lessons: trackLessons.map((l) => l.id) });
    trackLessons.forEach((l, i) => {
      const c = content[l.id];
      const prompts = l.blocks.filter((b) => LIBRARY_KINDS.includes(b.kind)).map(({ kind, text, section }) => ({ kind, text, section }));
      out.lessons[l.id] = {
        id: l.id, track: l.track, num: l.num, title: l.title, file: l.file,
        url: `${SITE}/${l.track}/${l.slug}/`,
        sourceUrl: `${REPO}/blob/main/${l.file}`,
        objectives: l.objectives, sections: l.sections, steps: l.steps,
        minutes: Math.max(2, Math.round(l.words / 200)),
        summary: c.summary, concepts: c.concepts,
        prompts,
        commands: l.blocks.filter((b) => b.kind === 'command').map((b) => b.text),
        questions: c.questions.map((q, qi) => ({ lesson: l.id, ...prepareQuestion(q, `${l.id}-q${qi + 1}`) })),
        video: videos[l.id] || '',
        script: recordingScript(l, c, trackLessons[i + 1]),
        stale: stale.includes(l.id),
      };
      for (const p of prompts) {
        if (!out.prompts.some((x) => x.track === l.track && x.text === p.text)) {
          out.prompts.push({ ...p, track: l.track, lesson: l.id, lessonTitle: l.title });
        }
      }
    });
  }

  mkdirSync(DIST, { recursive: true });
  const json = JSON.stringify(out).replace(/</g, '\\u003c');
  writeFileSync(join(DIST, 'index.html'), readFileSync(join(HERE, 'template.html'), 'utf8').replace('__WORKBOOK_DATA__', () => json));
  writeFileSync(join(DIST, 'print.html'), printHTML(out));
  writeFileSync(join(DIST, 'recording-scripts.md'), scriptsMarkdown(out));
  writeFileSync(join(DIST, 'status.md'), statusMarkdown(out, stale, orphaned));

  const qCount = Object.values(out.lessons).reduce((n, l) => n + l.questions.length, 0);
  console.log(`Built ${lessons.length} lessons, ${out.prompts.length} prompts, ${qCount} questions, ${Object.keys(videos).length} videos → workbook/dist/`);
  if (orphaned.length) console.warn(`Content for removed lessons (delete or rename): ${orphaned.join(', ')}`);
  if (stale.length) {
    console.warn(`Lessons changed since their content was written: ${stale.join(', ')}`);
    if (check) process.exit(1);
  }
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function statusMarkdown(out, stale, orphaned) {
  const lines = [`# Workbook status (${out.generated})`, ''];
  lines.push(stale.length ? `**Needs review:** ${stale.join(', ')}` : 'All lesson content matches the current docs.', '');
  if (orphaned.length) lines.push(`**Content for removed lessons:** ${orphaned.join(', ')}`, '');
  lines.push('| Lesson | Title | Prompts | Questions | Video |', '|---|---|---|---|---|');
  for (const l of Object.values(out.lessons)) {
    lines.push(`| ${l.id} | ${l.title} | ${l.prompts.length} | ${l.questions.length} | ${l.video ? 'yes' : 'not recorded'} |`);
  }
  return lines.join('\n') + '\n';
}

function scriptsMarkdown(out) {
  const lines = ['# Bubbles recording scripts', '', 'One short walkthrough per lesson, about two minutes each. After recording, paste the share link into `workbook/content/videos.json` under the lesson id and rebuild.', ''];
  for (const t of out.tracks) {
    lines.push(`## ${t.name}`, '');
    for (const id of t.lessons) {
      const l = out.lessons[id], s = l.script;
      lines.push(`### ${id} · ${l.title}${l.video ? ' (recorded)' : ''}`, '', `**Open with:** ${s.hook}`, '', '**Show on screen:**');
      s.show.forEach((x, i) => lines.push(`${i + 1}. ${x}`));
      lines.push('', '**Say:**', ...s.say.map((x) => `- ${x}`), '');
      if (s.demo) lines.push('**Demo prompt:**', '', '```text', s.demo, '```', '');
      lines.push(`**Close with:** ${s.close}`, '', `Lesson: ${l.url}`, '');
    }
  }
  return lines.join('\n');
}

function printHTML(out) {
  const L = 'ABCDEFGH';
  const all = Object.values(out.lessons);
  const lessonHTML = (l, t) => `
    <section class="lesson">
      <p class="eyebrow">${esc(t.name)} · Lesson ${l.num}</p>
      <h2 id="${l.id}">${esc(l.title)}</h2>
      <p>${esc(l.summary)}</p>
      ${l.objectives.length ? `<h3>In this lesson you will</h3><ul>${l.objectives.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>` : ''}
      <h3>Key ideas</h3><ul>${l.concepts.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
      ${l.prompts.length ? `<h3>Prompts</h3>${l.prompts.map((p) => `<pre>${esc(p.text)}</pre>`).join('')}` : ''}
      ${l.commands.length ? `<h3>Commands</h3><pre>${esc(l.commands.join('\n'))}</pre>` : ''}
      <h3>Check your understanding</h3>
      <ol class="qs">${l.questions.map((q) => q.type === 'order'
        ? `<li>${esc(q.q)}<ul class="blank">${q.start.map((i) => `<li>☐ ${esc(q.items[i])}</li>`).join('')}</ul></li>`
        : `<li>${esc(q.q)}<ul class="blank">${q.options.map((o, i) => `<li>${L[i]}. ${esc(o)}</li>`).join('')}</ul></li>`).join('')}</ol>
      <p class="src">Full lesson: ${esc(l.url)}${l.video ? ` · Video: ${esc(l.video)}` : ''}</p>
    </section>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Copilot Workshops Workbook</title><style>
    @page { size: A4; margin: 18mm 16mm; }
    body { font: 10.5pt/1.5 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1c1f27; }
    h1 { font-size: 26pt; margin: 0 0 6pt; } h2 { font-size: 16pt; margin: 0 0 6pt; } h3 { font-size: 11pt; margin: 12pt 0 4pt; }
    .eyebrow { text-transform: uppercase; letter-spacing: .05em; color: #5b5f6b; font-size: 8.5pt; margin: 0; }
    .cover { height: 240mm; display: flex; flex-direction: column; justify-content: center; }
    .mark { width: 40px; height: 40px; border-radius: 50%; background: #2563eb; color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 20px; margin-bottom: 16pt; }
    .lesson, .part { break-before: page; }
    pre { font: 9pt/1.45 ui-monospace, Menlo, Consolas, monospace; white-space: pre-wrap; background: #f3f4f7; border: 1px solid #d9dce3; border-radius: 4px; padding: 6pt 8pt; break-inside: avoid; }
    table { border-collapse: collapse; width: 100%; font-size: 9.5pt; margin-bottom: 10pt; } th, td { border-bottom: 1px solid #d9dce3; padding: 4pt 6pt; text-align: left; vertical-align: top; }
    th { background: #f3f4f7; } .qs > li { margin-bottom: 8pt; break-inside: avoid; } .blank { list-style: none; padding-left: 12pt; margin: 3pt 0 0; }
    .src { color: #5b5f6b; font-size: 8.5pt; margin-top: 12pt; } a { color: inherit; }
  </style></head><body>
  <section class="cover"><div class="mark">A</div><p class="eyebrow">GitHub Copilot agents across the software development lifecycle</p>
    <h1>Copilot Workshops Workbook</h1><p>${all.length} lessons · ${out.prompts.length} prompts · ${all.reduce((n, l) => n + l.questions.length, 0)} questions · ${out.generated}</p></section>
  <section class="part"><h2>Index</h2>${out.tracks.map((t) => `<h3>${esc(t.name)}</h3><table><tr><th>#</th><th>Lesson</th><th>Prompts</th><th>Questions</th></tr>
    ${t.lessons.map((id) => { const l = out.lessons[id]; return `<tr><td>${l.num}</td><td><a href="#${id}">${esc(l.title)}</a></td><td>${l.prompts.length}</td><td>${l.questions.length}</td></tr>`; }).join('')}</table>`).join('')}</section>
  ${out.tracks.map((t) => t.lessons.map((id) => lessonHTML(out.lessons[id], t)).join('')).join('')}
  <section class="part"><h2>Cheat sheets</h2>${out.cheatsheets.map((c) => `<h3>${esc(c.title)}</h3><p>${esc(c.intro)}</p><table><tr>${c.columns.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>${c.rows.map((r) => `<tr>${r.map((x) => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</table>`).join('')}</section>
  <section class="part"><h2>Answer key</h2>${out.tracks.map((t) => `<h3>${esc(t.name)}</h3><table><tr><th>Lesson</th><th>Answers</th></tr>${t.lessons.map((id) => { const l = out.lessons[id];
    return `<tr><td>${l.num}. ${esc(l.title)}</td><td>${l.questions.map((q, i) => `${i + 1}: ${q.type === 'order' ? `see the order below` : L[q.answer]}`).join(' · ')}
      ${l.questions.filter((q) => q.type === 'order').map((q) => `<ol>${q.items.map((it) => `<li>${esc(it)}</li>`).join('')}</ol>`).join('')}</td></tr>`; }).join('')}</table>`).join('')}</section>
  </body></html>`;
}

const args = process.argv.slice(2);
const acceptAt = args.indexOf('--accept');
build({ check: args.includes('--check'), accept: acceptAt >= 0 ? args[acceptAt + 1] : null });
