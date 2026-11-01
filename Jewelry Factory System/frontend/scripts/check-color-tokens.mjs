import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('src');
const supportedExtensions = new Set(['.css', '.ts', '.tsx']);
const tokenSource = path.normalize(path.join(root, 'index.css'));
const ignoreMarker = 'color-lint-ignore-file';

const checks = [
  {
    label: 'literal color',
    pattern: /#[\da-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklab|oklch|lab|lch)\s*\(/gi,
  },
  {
    label: 'Tailwind palette color',
    pattern: /\b(?:bg|text|border|ring|from|via|to|fill|stroke)-(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?(?:\/\d+)?\b/g,
  },
  {
    label: 'named inline color',
    pattern: /\b(?:background|backgroundColor|color|borderColor)\s*:\s*['"](?:white|black|red|green|blue|orange|yellow|purple|pink|gray|grey)['"]/gi,
  },
];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(target);
    return supportedExtensions.has(path.extname(entry.name)) ? [target] : [];
  }));
  return nested.flat();
}

const violations = [];
for (const file of await collectFiles(root)) {
  if (path.normalize(file) === tokenSource) continue;

  const source = await readFile(file, 'utf8');
  if (source.includes(ignoreMarker)) continue;

  const relativeFile = path.relative(process.cwd(), file);
  const isSalesOrCustomerUi = /(?:^|[\\/])(?:components[\\/]sales|pages[\\/](?:Sales|Customer))/i.test(relativeFile);
  const lines = source.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    for (const check of checks) {
      check.pattern.lastIndex = 0;
      if (check.pattern.test(line)) {
        violations.push(`${path.relative(process.cwd(), file)}:${index + 1} ${check.label}`);
      }
    }

    if (isSalesOrCustomerUi && /--color-proc-/.test(line)) {
      violations.push(`${relativeFile}:${index + 1} production-stage color in Sales/Customer UI`);
    }
  }
}

if (violations.length > 0) {
  console.error('Use design tokens from src/index.css instead of hardcoded UI colors:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Color token check passed.');
