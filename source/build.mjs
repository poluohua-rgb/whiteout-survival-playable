// Bundles everything into one self-contained HTML file (fonts, script and styles inlined; no external requests).
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const out = await build({
  entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', target: 'es2020',
  loader: { '.glb': 'binary' },
  write: false, legalComments: 'none', logLevel: 'warning',
});
let js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
js = `try{${js}}catch(e){var f=document.getElementById('fail');if(f){f.style.display='flex';f.textContent+=' ('+e.message+')'}}`;

const font = (file, family) => {
  const b64 = readFileSync(`assets/fonts/${file}`).toString('base64');
  return `@font-face{font-family:'${family}';src:url(data:font/ttf;base64,${b64}) format('truetype');font-display:block}`;
};
const fonts = [font('LilitaOne-Regular.ttf', 'Lilita One'), font('RussoOne-Regular.ttf', 'Russo One')].join('\n');

let html = readFileSync('src/index.template.html', 'utf8');
html = html.replace('/*FONTS*/', () => fonts).replace('/*SCRIPT*/', () => js);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', html);
console.log('dist/index.html', (html.length / 1024).toFixed(0) + ' KB');
