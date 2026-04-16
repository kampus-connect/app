#!/usr/bin/env node
/**
 * Creates an admin-only user (not visible in the dashboard).
 *
 * Usage:
 *   node scripts/create-admin.mjs <name> <email> <password>
 *
 * Example:
 *   node scripts/create-admin.mjs "Super Admin" admin@example.com s3cur3pass
 *
 * Run from the project root. The database file (users.db) must already exist
 * or will be created on first run.
 */

import Database from "better-sqlite3";
import { scryptSync, randomBytes } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DB_PATH = join(__dirname, "..", "users.db");

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const [, , name, email, password] = process.argv;

if (!name || !email || !password) {
  console.error("Usage: node scripts/create-admin.mjs <name> <email> <password>");
  process.exit(1);
}

if (password.length < 6) {
  console.error("Error: Password must be at least 6 characters.");
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    PRIMARY KEY (user_id, role)
  );
`);

const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
if (existing) {
  console.error(`Error: A user with email "${email}" already exists.`);
  db.close();
  process.exit(1);
}

const passwordHash = hashPassword(password);
const { lastInsertRowid: userId } = db
  .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
  .run(name, email, passwordHash);

db.prepare("INSERT INTO user_roles (user_id, role) VALUES (?, 'admin')").run(userId);

console.log(`Admin created: ${name} <${email}> (id: ${userId})`);
console.log("This account has the 'admin' role only — it will not appear in the dashboard.");
db.close();
