// Clones the production D1 database into the local dev D1 for testing.
//
// Does a full schema + data export from prod, wipes the local D1 state, then
// imports the clone. Repeatable: run it any time to re-sync local with prod.
//
//   npm run db:refresh
//
// Reads CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID from .dev.vars (see
// CLAUDE.md — this project uses a non-default Cloudflare account). Credentials
// are passed to wrangler via the child process env, never via a shell prefix
// (which does not work on Windows).

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wranglerBin = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const DB_NAME = 'f3_the_union';
const dumpPath = path.join(root, '.wrangler', 'prod-clone.sql');
const importPath = path.join(root, '.wrangler', 'prod-clone.import.sql');

function readDevVars() {
  const file = path.join(root, '.dev.vars');
  if (!existsSync(file)) {
    console.error('Missing .dev.vars — cannot read Cloudflare credentials.');
    process.exit(1);
  }
  const out = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[match[1]] = value;
  }
  return out;
}

const vars = readDevVars();
if (!vars.CLOUDFLARE_API_TOKEN || !vars.CLOUDFLARE_ACCOUNT_ID) {
  console.error('CLOUDFLARE_API_TOKEN and/or CLOUDFLARE_ACCOUNT_ID missing from .dev.vars.');
  process.exit(1);
}

const env = {
  ...process.env,
  XDG_CONFIG_HOME: path.join(root, '.wrangler-config'),
  CLOUDFLARE_API_TOKEN: vars.CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_ACCOUNT_ID: vars.CLOUDFLARE_ACCOUNT_ID,
};

function wrangler(args) {
  execFileSync(process.execPath, [wranglerBin, ...args], { cwd: root, env, stdio: 'inherit' });
}

console.log('[1/3] Exporting production database (schema + data)...');
if (!existsSync(path.dirname(dumpPath))) mkdirSync(path.dirname(dumpPath), { recursive: true });
wrangler(['d1', 'export', DB_NAME, '--remote', '--output', dumpPath]);

// Build an import file that first drops every table the dump recreates, so the
// clone applies cleanly in-place (no need to delete the local D1 files, which
// Windows locks while `npm run dev` is running). Tables are dropped children-
// first (dependency order) because dropping a table implicitly deletes its rows,
// which trips a foreign-key check if another table still references them.
console.log('[2/3] Preparing reset + import script...');
const dump = readFileSync(dumpPath, 'utf8');

const refsByTable = {};
for (const block of dump.split(/CREATE TABLE /).slice(1)) {
  const nameMatch = block.match(/^(?:IF NOT EXISTS )?["'`]?([A-Za-z0-9_]+)["'`]?/);
  if (!nameMatch) continue;
  const name = nameMatch[1];
  const createStmt = block.slice(0, block.indexOf('\n);') >= 0 ? block.indexOf('\n);') : block.length);
  const parents = new Set(
    [...createStmt.matchAll(/REFERENCES\s+["'`]?([A-Za-z0-9_]+)["'`]?/g)].map((m) => m[1])
  );
  parents.delete(name); // ignore self-references
  refsByTable[name] = parents;
}

// Order so a table is dropped before any table it references (children first).
const remaining = new Set(Object.keys(refsByTable));
const dropOrder = [];
while (remaining.size) {
  const stillReferenced = new Set();
  for (const t of remaining) {
    for (const parent of refsByTable[t]) if (remaining.has(parent)) stillReferenced.add(parent);
  }
  const droppable = [...remaining].filter((t) => !stillReferenced.has(t));
  if (!droppable.length) { dropOrder.push(...remaining); break; } // cycle fallback
  for (const t of droppable) { dropOrder.push(t); remaining.delete(t); }
}

const drops = dropOrder.map((t) => `DROP TABLE IF EXISTS "${t}";`).join('\n');
writeFileSync(importPath, `${drops}\n${dump}`);

console.log(`[3/3] Importing clone into local database (${dropOrder.length} tables)...`);
wrangler(['d1', 'execute', DB_NAME, '--local', '--file', importPath]);

console.log('\nDone. Local D1 is now a clone of production. Start the app with: npm run dev');
