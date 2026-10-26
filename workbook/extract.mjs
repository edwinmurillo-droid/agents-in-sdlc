// Parses the lesson Markdown under docs/ into structured lesson records:
// title, objectives, sections, prompts, commands and a content hash used to
// detect when a lesson changed after its workbook content was written.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TRACKS = [
  { id: 'cli', name: 'Copilot CLI', blurb: 'Agentic coding from the terminal.' },
  { id: 'vscode', name: 'VS Code', blurb: 'Agent mode, MCP and custom agents in the IDE.' },
  { id: 'cloud', name: 'Cloud agent', blurb: 'Assign issues and review asynchronous pull requests.' },
  { id: 'app', name: 'Copilot app', blurb: 'Parallel agent sessions from the desktop app.' },
];

const OBJECTIVE_LEAD = /(in this (exercise|lesson),? you will|you will learn how|you'll explore the following|in this exercise you will)/i;
const SKIPPED_SECTIONS = /^(summary|resources|next step|review and next steps)/i;
const FENCE = /^(\s*)```(\w*)\s*$/;

/** Splits YAML frontmatter from the Markdown body and returns the title. */
function splitFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { title: '', body: raw };
  const title = (match[1].match(/^title:\s*"?(.*?)"?\s*$/m) || [])[1] || '';
  return { title, body: raw.slice(match[0].length) };
}

/** Removes the "Exercise 3 - " / "Lesson 3 - " prefix from a lesson title. */
function cleanTitle(title) {
  return title.replace(/^(exercise|lesson)\s+\d+\s*[-:–]\s*/i, '').trim();
}

/** Strips Markdown link, emphasis and code syntax for plain-text display. */
export function plain(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1$2')
    .replace(/<kbd>(.*?)<\/kbd>/g, '$1')
    .trim();
}

/** Decides what a fenced block is from its language and the sentence that introduces it. */
function classifyBlock(lang, text, context) {
  if (lang === 'bash' || lang === 'shell') {
    return /should see|similar to/i.test(context) ? 'output' : 'command';
  }
  if (lang === 'markdown' || lang === '' || lang === 'plaintext' || lang === 'text') {
    if (/description/i.test(context)) return 'issue';
    if (lang === 'markdown') return 'instructions';
    if (text === 'exit') return 'command';
    if (text.startsWith('/') && !text.includes('\n') && text.length < 40) return 'slash';
    return 'prompt';
  }
  return 'code';
}

/** Extracts one lesson file into a lesson record. */
export function parseLesson(track, file, raw) {
  const { title, body } = splitFrontmatter(raw);
  const lines = body.split('\n');
  const num = Number.parseInt(file, 10);
  const lesson = {
    id: `${track}-${num}`,
    track,
    num,
    file: `docs/${track}/${file}`,
    slug: file.replace(/\.md$/, ''),
    title: cleanTitle(title),
    hash: createHash('sha256').update(raw).digest('hex').slice(0, 12),
    objectives: [],
    sections: [],
    blocks: [],
    steps: 0,
    words: 0,
  };

  let section = '';
  let context = '';
  let objectiveMode = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(FENCE);
    if (fence) {
      const indent = fence[1].length;
      const lang = fence[2].toLowerCase();
      const content = [];
      i++;
      while (i < lines.length && !FENCE.test(lines[i])) {
        content.push(lines[i].slice(Math.min(indent, lines[i].search(/\S|$/))));
        i++;
      }
      const text = content.join('\n').trim();
      const kind = classifyBlock(lang, text, context);
      if (text && kind !== 'output' && !lesson.blocks.some((b) => b.text === text)) {
        lesson.blocks.push({ kind, lang, text, section, context });
      }
      continue;
    }
    if (line.startsWith('>')) continue;

    const heading = line.match(/^##\s+(.*)/);
    if (heading) {
      section = plain(heading[1]);
      objectiveMode = false;
      if (!SKIPPED_SECTIONS.test(section) && !line.startsWith('###')) lesson.sections.push(section);
      continue;
    }
    if (OBJECTIVE_LEAD.test(line) && lesson.objectives.length === 0) {
      objectiveMode = true;
      continue;
    }
    const bullet = line.match(/^- (.*)/);
    if (objectiveMode) {
      if (bullet) {
        lesson.objectives.push(plain(bullet[1]).replace(/[.,]$/, ''));
        continue;
      }
      if (line.trim() !== '' || lesson.objectives.length > 0) objectiveMode = false;
    }
    if (/^\s*\d+\.\s/.test(line)) lesson.steps++;
    const text = plain(line.replace(/^\s*(\d+\.|-)\s+/, ''));
    if (text) {
      context = text;
      lesson.words += text.split(/\s+/).length;
    }
  }
  return lesson;
}

/** Reads every numbered lesson in every track under docsDir. */
export function extract(docsDir) {
  const lessons = [];
  for (const track of TRACKS) {
    const files = readdirSync(join(docsDir, track.id))
      .filter((f) => /^\d+-.*\.md$/.test(f))
      .sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10));
    for (const file of files) {
      lessons.push(parseLesson(track.id, file, readFileSync(join(docsDir, track.id, file), 'utf8')));
    }
  }
  return lessons;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const here = dirname(fileURLToPath(import.meta.url));
  const lessons = extract(join(here, '..', 'docs'));
  mkdirSync(join(here, 'dist'), { recursive: true });
  writeFileSync(join(here, 'dist', 'lessons.json'), JSON.stringify(lessons, null, 2));
  console.log(`Extracted ${lessons.length} lessons to workbook/dist/lessons.json`);
}
