import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const agentsFile = 'AGENTS.md';
const claudeFile = 'CLAUDE.md';
const guideFiles = [agentsFile, claudeFile];
const filePath = (file) => resolve(root, file);

function ensureGuides() {
  for (const file of guideFiles) {
    if (!existsSync(filePath(file))) throw new Error('Falta ' + file + '. Las dos guías deben existir.');
  }
}
function assertMatch() {
  if (!readFileSync(filePath(agentsFile)).equals(readFileSync(filePath(claudeFile)))) {
    throw new Error('AGENTS.md y CLAUDE.md difieren. Ejecuta node scripts/sync-agent-guides.mjs --write.');
  }
}
function gitText(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' });
}
function gitBuffer(args) {
  return execFileSync('git', args, { cwd: root });
}
function unstaged(file) {
  const result = spawnSync('git', ['diff', '--quiet', '--', file], { cwd: root });
  if (result.status === 0) return false;
  if (result.status === 1) return true;
  throw new Error('No se pudo comprobar ' + file + '.');
}
function stagedGuides() {
  return gitText(['diff', '--cached', '--name-only', '--diff-filter=ACMR'])
    .split(/\r?\n/).filter(Boolean).filter((file) => guideFiles.includes(file));
}
function stageCopy(target, contents) {
  writeFileSync(filePath(target), contents);
  gitText(['add', '--', target]);
}
function syncStaged() {
  ensureGuides();
  const changed = stagedGuides();
  if (changed.length === 0) return assertMatch();
  const dirty = guideFiles.filter(unstaged);
  if (dirty.length) throw new Error('Hay cambios sin preparar en ' + dirty.join(', ') + '.');
  if (changed.length === 2) {
    if (!gitBuffer(['show', ':' + agentsFile]).equals(gitBuffer(['show', ':' + claudeFile]))) {
      throw new Error('Las dos guías fueron preparadas con contenido distinto. Resuelve la diferencia antes de confirmar.');
    }
    return assertMatch();
  }
  const source = changed[0];
  const target = source === agentsFile ? claudeFile : agentsFile;
  stageCopy(target, readFileSync(filePath(source)));
  console.log('Sincronizado ' + target + ' desde ' + source + '.');
}
function syncWorking() {
  ensureGuides();
  const source = process.argv.includes('--from=claude') ? claudeFile : agentsFile;
  const target = source === agentsFile ? claudeFile : agentsFile;
  writeFileSync(filePath(target), readFileSync(filePath(source)));
  console.log('Sincronizado ' + target + ' desde ' + source + '.');
}

try {
  const mode = process.argv[2];
  if (mode === '--check') { ensureGuides(); assertMatch(); }
  else if (mode === '--write') syncWorking();
  else if (mode === '--staged') syncStaged();
  else throw new Error('Uso: node scripts/sync-agent-guides.mjs --check|--write|--staged [--from=claude]');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
