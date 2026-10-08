import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const changed = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { cwd: root, encoding: 'utf8' })
  .split(/\r?\n/).filter(Boolean);
const isDocumentation = (file) => file === 'README.md' || file === 'AGENTS.md' || file === 'CLAUDE.md' || file.startsWith('docs/');
const isImplementation = (file) => {
  if (file.startsWith('src/') || file.startsWith('tests/') || file.startsWith('scripts/') || file.startsWith('.githooks/')) return true;
  if (['package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'tsconfig.json', '.gitignore'].includes(file)) return true;
  return /\.(?:[cm]?[jt]sx?|py|rb|go|rs|java|cs|php|sh|ps1|ya?ml|toml|json)$/i.test(file) && !isDocumentation(file);
};
if (changed.some(isImplementation) && !changed.some(isDocumentation)) {
  console.error('Hay cambios de implementación preparados sin documentación. Actualiza README.md, AGENTS.md, CLAUDE.md o docs/.');
  process.exitCode = 1;
}
