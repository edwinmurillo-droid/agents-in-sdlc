# Copilot Workshops Workbook

An interactive workbook generated from the lessons in [`docs/`](../docs/). It covers all four tracks (Copilot CLI, VS Code, cloud agent and the Copilot app) and includes:

- **Index** of every lesson, with per-learner progress.
- **Lesson pages**: summary, objectives, key ideas, outline, every prompt and command with a copy button, and a knowledge check.
- **Prompt library**: every prompt, issue text and instruction snippet, searchable and filterable.
- **Video library**: one Bubbles walkthrough per lesson, with a two-minute recording script for lessons not yet recorded.
- **Cheat sheets**: file locations, CLI commands, surfaces, session modes, building blocks and guardrails.
- **Track quizzes** with a score.
- A printable **PDF** with an answer key.

## How it's built

| File | Role |
| --- | --- |
| `extract.mjs` | Parses `docs/<track>/<n>-*.md` into lessons: title, objectives, outline, prompts, commands and a content hash. |
| `content/lessons.json` | Authored per lesson: summary, key ideas and questions. Write the correct option **first**; the build shuffles options in a stable way. `sourceHash` records which version of the lesson the content was written against. |
| `content/videos.json` | Lesson id → Bubbles share link. |
| `content/cheatsheets.json` | Cheat sheet tables. |
| `template.html` | The page shell (styles and script). Uses the *Agents in SDLC* design system tokens. |
| `build.mjs` | Merges everything into `dist/`. |
| `pdf.mjs` | Prints `dist/print.html` to `dist/Copilot-Workshops-Workbook.pdf`. |

`dist/` is generated and not committed.

```bash
node workbook/build.mjs            # dist/index.html, print.html, recording-scripts.md, status.md
node workbook/pdf.mjs              # dist/Copilot-Workshops-Workbook.pdf (needs Playwright)
node workbook/build.mjs --check    # exits 1 if any lesson changed since its content was written
```

## When the lessons change

1. Run `node workbook/build.mjs --check`. It lists lessons that are new (no content entry) or changed (hash differs).
2. Read each listed lesson and update its entry in `content/lessons.json`: summary, key ideas and questions.
3. Record the new hashes: `node workbook/build.mjs --accept cli-3,app-4` (or `--accept all`).
4. Rebuild, regenerate the PDF and republish the workbook page.

Prompts, commands, objectives and outlines come straight from the lessons, so they update on every build without any authoring.

## Adding a video

1. Record the lesson in Bubbles using its script in `dist/recording-scripts.md` (or the **Recording script** link in the Video library).
2. Add the share link to `content/videos.json`:

   ```json
   { "links": { "cli-3": "https://app.usebubbles.com/..." } }
   ```

3. Rebuild and republish. The lesson page and Video library switch to **Watch on Bubbles**.
