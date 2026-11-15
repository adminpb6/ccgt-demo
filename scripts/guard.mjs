// Blokuje build, gdy w repo jest plik .xer bez prefiksu PL5001_SYNTH_ (ochrona przed prawdziwymi danymi).
import { execSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const SKIP = new Set(['node_modules', '.git', 'dist']);
function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (SKIP.has(n)) continue;
    const p = join(dir, n);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}
const bad = walk('.').filter((p) => /\.xer$/i.test(p) && !basename(p).startsWith('PL5001_SYNTH_'));
let tracked = [];
try {
  tracked = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter((p) => /\.xer$/i.test(p) && !basename(p).startsWith('PL5001_SYNTH_'));
} catch { /* brak gita w CI-checkout nie jest błędem */ }
const all = [...new Set([...bad, ...tracked])];
if (all.length) {
  console.error('GUARD: pliki .xer bez prefiksu PL5001_SYNTH_ są zabronione:\n' + all.join('\n'));
  process.exit(1);
}
console.log('guard: OK');
