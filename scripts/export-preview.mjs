import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { build, root } from './build.mjs';

// Export linked, portable pages with embedded assets. Open index.html after extraction.
const destination = process.argv[2];
if (!destination || !path.isAbsolute(destination) || path.extname(destination)) throw new Error('Pass an absolute output directory, not an HTML filename.');
const result = await build();
const css = await readFile(path.join(root, 'public/assets/styles.css'), 'utf8');
const js = await readFile(path.join(root, 'public/assets/main.js'), 'utf8');
const mimeTypes = { '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.pdf': 'application/pdf' };
await mkdir(destination, { recursive: true });
for (const page of result.pages) {
  let html = page.html;
  html = html.replace('<link rel="stylesheet" href="./assets/styles.css">', () => `<style>${css}</style>`);
  html = html.replace('<script src="./assets/main.js" defer></script>', '');
  html = html.replace('</body>', () => `<script>${js}</script></body>`);
  const assets = new Set([...html.matchAll(/(?:src|href)="(\.\/assets\/[^"#]+)"/g)].map(match => match[1]));
  for (const asset of assets) {
    const data = await readFile(path.join(result.output, asset));
    const mime = mimeTypes[path.extname(asset)];
    if (!mime) throw new Error(`Unsupported preview asset: ${asset}`);
    html = html.replaceAll(asset, `data:${mime};base64,${data.toString('base64')}`);
  }
  await writeFile(path.join(destination, page.file), html);
}
console.log(`Saved ${result.pages.length} linked preview pages → ${destination}`);
