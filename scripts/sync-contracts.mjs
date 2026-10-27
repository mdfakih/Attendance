// Copies the shared contracts package from the backend repo (expected as a sibling folder)
// into this repo. Run after the backend changes any enum, schema or error code.
import { cpSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const source = process.argv[2] ?? resolve(process.cwd(), '..', 'Backend', 'packages', 'contracts');
const target = resolve(process.cwd(), 'packages', 'contracts');

if (!existsSync(source)) {
  console.error(`Backend contracts not found at ${source}. Pass the path as an argument.`);
  process.exit(1);
}
rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true, filter: (p) => !/node_modules|[\\/]dist([\\/]|$)/.test(p) });
console.log(`Synced contracts from ${source}`);
