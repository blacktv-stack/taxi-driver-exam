/**
 * vite build 결과(dist/index.html + dist/assets/*.js)를 단일 index.html 로 합친다.
 * - 앱인토스 .ait 번들에 sources/index.html 하나만 들어가고,
 * - deed.page / 브라우저에서도 index.html 단독 파일로 그대로 동작하게 하기 위함.
 */
import { readFile, writeFile, rm, readdir } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve('dist');
const htmlPath = path.join(dist, 'index.html');
let html = await readFile(htmlPath, 'utf8');

const scriptTag = /<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g;
const matches = [...html.matchAll(scriptTag)];

if (matches.length === 0) {
  console.log('[inline] 인라인할 외부 스크립트가 없습니다.');
}

for (const m of matches) {
  const [tag, src] = m;
  const rel = src.replace(/^\//, '').replace(/^\.\//, '');
  const filePath = path.join(dist, rel);
  let code;
  try {
    code = await readFile(filePath, 'utf8');
  } catch (e) {
    console.warn(`[inline] 파일을 찾지 못해 건너뜁니다: ${rel}`);
    continue;
  }
  const isModule = /\btype="module"/.test(tag);
  const safe = code.replace(/<\/script/gi, '<\\/script');
  const inlineTag = isModule ? `<script type="module">\n${safe}\n</script>` : `<script>\n${safe}\n</script>`;
  html = html.split(tag).join(inlineTag);
}

// modulepreload / preload 로 남은 assets 링크 정리
html = html.replace(/<link[^>]*rel="modulepreload"[^>]*>\s*/g, '');

await writeFile(htmlPath, html, 'utf8');

// assets 디렉토리 정리
const assetsDir = path.join(dist, 'assets');
try {
  await rm(assetsDir, { recursive: true, force: true });
} catch (e) {
  /* noop */
}

const rest = await readdir(dist, { withFileTypes: true });
console.log('[inline] dist 구성:', rest.map((d) => (d.isDirectory() ? d.name + '/' : d.name)).join(', '));
const remaining = html.match(/<script\b[^>]*\bsrc=/g);
console.log('[inline] 남은 외부 스크립트 태그:', remaining ? remaining.length : 0);
