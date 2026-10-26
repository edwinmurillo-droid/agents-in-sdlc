// Renders workbook/dist/print.html to workbook/dist/Copilot-Workshops-Workbook.pdf.
// Run `node workbook/build.mjs` first. Uses the preinstalled Playwright Chromium.

import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const DIST = join(dirname(fileURLToPath(import.meta.url)), 'dist');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(join(DIST, 'print.html')).href);
await page.pdf({
  path: join(DIST, 'Copilot-Workshops-Workbook.pdf'),
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#5b5f6b">Copilot Workshops Workbook · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  margin: { top: '16mm', bottom: '18mm', left: '16mm', right: '16mm' },
});
await browser.close();
console.log('Wrote workbook/dist/Copilot-Workshops-Workbook.pdf');
