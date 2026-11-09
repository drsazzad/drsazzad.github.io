import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { build, root } from './build.mjs';

const output = path.join(root, 'dist');
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.pdf': 'application/pdf', '.txt': 'text/plain' };
await build();
const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
  try {
    const url = new URL(request.url, 'http://localhost');
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    let target = path.resolve(output, relative);
    if (target !== output && !target.startsWith(output + path.sep)) { response.writeHead(403); response.end(); return; }
    if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
    const data = await readFile(target);
    response.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch { response.writeHead(404); response.end('Not found'); }
});
server.on('error', (error) => { console.error(error.message); process.exit(1); });
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}`));
let timer;
let queue = Promise.resolve();
for (const directory of ['src', 'content', 'public']) {
  watch(path.join(root, directory), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => { queue = queue.then(() => build()).catch((error) => console.error(error.message)); }, 120);
  });
}
console.log('Watching source, content and assets. Refresh the browser after edits.');
