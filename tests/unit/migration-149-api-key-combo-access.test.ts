import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import DatabaseSync from "better-sqlite3";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migrationPath = path.join(repoRoot, "src/lib/db/migrations/149_api_key_combo_access.sql");

test("combo-access migration preserves legacy allow-all rows and named allowlists", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE api_keys (
      id TEXT PRIMARY KEY,
      allowed_combos TEXT
    );

    INSERT INTO api_keys (id, allowed_combos) VALUES
      ('legacy-null', NULL),
      ('legacy-empty', '[]'),
      ('legacy-blank', ''),
      ('legacy-malformed', 'not-json'),
      ('named', '["fast-chat"]'),
      ('all', '["combo/*"]');
  `);

  db.exec(sql);
  db.exec(sql);

  const rows = db.prepare("SELECT id, allowed_combos FROM api_keys ORDER BY id").all() as Array<{
    id: string;
    allowed_combos: string;
  }>;
  const combosById = new Map(
    rows.map((row) => [row.id, JSON.parse(row.allowed_combos) as string[]])
  );

  assert.deepEqual(combosById.get("legacy-null"), ["combo/*"]);
  assert.deepEqual(combosById.get("legacy-empty"), ["combo/*"]);
  assert.deepEqual(combosById.get("legacy-blank"), ["combo/*"]);
  assert.deepEqual(combosById.get("legacy-malformed"), ["combo/*"]);
  assert.deepEqual(combosById.get("named"), ["fast-chat"]);
  assert.deepEqual(combosById.get("all"), ["combo/*"]);
});
