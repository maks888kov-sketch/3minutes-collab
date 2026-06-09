import fs from 'node:fs';
import path from 'node:path';

const marker = '/* b44-full-sync 2026-06-01 */\n';

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(jsx?|tsx?)$/.test(name)) continue;
    const content = fs.readFileSync(full, 'utf8');
    if (content.includes('b44-full-sync')) continue;
    fs.writeFileSync(full, marker + content, 'utf8');
    console.log('marked', full);
  }
}

walk('src');
