import Database from "better-sqlite3";
import { randomBytes } from "node:crypto";
import { join } from "path";

const db = new Database(join(process.cwd(), "../db/users.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'Beginner'
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('admin', 'standard')),
    PRIMARY KEY (user_id, role)
  );
`);

// ── Migrations ────────────────────────────────────────────────────────────────

try {
  db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''");
} catch { /* already exists */ }

// Give any pre-existing users (created before roles were added) the standard role
{
  const orphans = db.prepare(
    "SELECT id FROM users WHERE id NOT IN (SELECT DISTINCT user_id FROM user_roles)"
  ).all() as { id: number }[];
  const giveStandard = db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, 'standard')");
  for (const u of orphans) giveStandard.run(u.id);
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Skill {
  id: number;
  user_id: number;
  name: string;
  level: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  roles: string[];
  skills: Skill[];
}

interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToUser(row: UserRow, skills: Skill[], roles: string[]): User {
  return { id: row.id, name: row.name, email: row.email, created_at: row.created_at, roles, skills };
}

function fetchRolesMap(): Map<number, string[]> {
  const rows = db.prepare("SELECT user_id, role FROM user_roles").all() as {
    user_id: number;
    role: string;
  }[];
  const map = new Map<number, string[]>();
  for (const r of rows) {
    const list = map.get(r.user_id) ?? [];
    list.push(r.role);
    map.set(r.user_id, list);
  }
  return map;
}

// ── User queries ──────────────────────────────────────────────────────────────

/** All users (for admin management — not filtered by role). */
export function getAllUsers(): User[] {
  const users = db.prepare("SELECT * FROM users ORDER BY created_at DESC").all() as UserRow[];
  const skills = db.prepare("SELECT * FROM skills").all() as Skill[];
  const rolesMap = fetchRolesMap();
  return users.map((u) =>
    rowToUser(u, skills.filter((s) => s.user_id === u.id), rolesMap.get(u.id) ?? [])
  );
}

/**
 * Users shown on the dashboard: have the 'standard' role but NOT the 'admin' role.
 * Admins are never shown here, even if they also hold the standard role.
 */
export function getDashboardUsers(): User[] {
  const users = db.prepare(`
    SELECT u.* FROM users u
    INNER JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'standard'
    WHERE u.id NOT IN (SELECT user_id FROM user_roles WHERE role = 'admin')
    ORDER BY u.created_at DESC
  `).all() as UserRow[];
  if (users.length === 0) return [];
  const skills = db.prepare("SELECT * FROM skills").all() as Skill[];
  return users.map((u) =>
    rowToUser(u, skills.filter((s) => s.user_id === u.id), ["standard"])
  );
}

export function getUserById(id: number): User | null {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  if (!row) return null;
  const skills = db.prepare("SELECT * FROM skills WHERE user_id = ?").all(id) as Skill[];
  const roles = (db.prepare("SELECT role FROM user_roles WHERE user_id = ?").all(id) as { role: string }[]).map(
    (r) => r.role
  );
  return rowToUser(row, skills, roles);
}

/** Returns the full row including password_hash — only for authentication. */
export function getUserForAuth(email: string): UserRow | null {
  return (db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow) ?? null;
}

function _insertUser(
  name: string,
  email: string,
  passwordHash: string,
  skills: { name: string; level: string }[],
  roles: string[]
): User {
  const stmtUser = db.prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)");
  const stmtSkill = db.prepare("INSERT INTO skills (user_id, name, level) VALUES (?, ?, ?)");
  const stmtRole = db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, ?)");

  let userId!: number;
  db.transaction(() => {
    userId = stmtUser.run(name, email, passwordHash).lastInsertRowid as number;
    for (const skill of skills) {
      if (skill.name.trim()) stmtSkill.run(userId, skill.name.trim(), skill.level);
    }
    for (const role of roles) stmtRole.run(userId, role);
  })();

  return getUserById(userId)!;
}

/** Creates a standard user without a password (admin-initiated). */
export function createUser(
  name: string,
  email: string,
  skills: { name: string; level: string }[]
): User {
  return _insertUser(name, email, "", skills, ["standard"]);
}

/** Creates a self-registered user with a password and the standard role. */
export function registerUser(
  name: string,
  email: string,
  passwordHash: string,
  skills: { name: string; level: string }[]
): User {
  return _insertUser(name, email, passwordHash, skills, ["standard"]);
}

export function deleteUser(id: number): boolean {
  return db.prepare("DELETE FROM users WHERE id = ?").run(id).changes > 0;
}

/** All distinct skill names across dashboard users, sorted alphabetically. */
export function getAllSkillNames(): string[] {
  const rows = db.prepare(`
    SELECT DISTINCT s.name FROM skills s
    INNER JOIN user_roles ur ON ur.user_id = s.user_id AND ur.role = 'standard'
    WHERE s.user_id NOT IN (SELECT user_id FROM user_roles WHERE role = 'admin')
    ORDER BY s.name
  `).all() as { name: string }[];
  return rows.map((r) => r.name);
}

/** Returns the stored password_hash for a user (for the change-password flow). */
export function getUserPasswordHash(id: number): string | null {
  const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(id) as { password_hash: string } | undefined;
  return row?.password_hash ?? null;
}

/** Updates a user's name and/or email. Caller must verify email uniqueness. */
export function updateUser(id: number, fields: { name?: string; email?: string }): User | null {
  if (fields.name !== undefined) {
    db.prepare("UPDATE users SET name = ? WHERE id = ?").run(fields.name, id);
  }
  if (fields.email !== undefined) {
    db.prepare("UPDATE users SET email = ? WHERE id = ?").run(fields.email, id);
  }
  return getUserById(id);
}

/** Replaces a user's password_hash. */
export function updatePassword(id: number, hash: string): void {
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, id);
}

/** Adds a skill to a user's profile. Returns the new skill row. */
export function addSkill(userId: number, name: string, level: string): Skill {
  const result = db.prepare("INSERT INTO skills (user_id, name, level) VALUES (?, ?, ?)").run(userId, name.trim(), level);
  return { id: result.lastInsertRowid as number, user_id: userId, name: name.trim(), level };
}

/** Removes a skill by id, scoped to a specific user. Returns true if deleted. */
export function removeSkill(skillId: number, userId: number): boolean {
  return db.prepare("DELETE FROM skills WHERE id = ? AND user_id = ?").run(skillId, userId).changes > 0;
}

/** Updates an existing skill's name and level, scoped to a specific user. */
export function updateSkill(skillId: number, userId: number, name: string, level: string): boolean {
  return db.prepare("UPDATE skills SET name = ?, level = ? WHERE id = ? AND user_id = ?")
    .run(name.trim(), level, skillId, userId).changes > 0;
}

// ── Role management ───────────────────────────────────────────────────────────

export function hasRole(userId: number, role: string): boolean {
  return !!db.prepare("SELECT 1 FROM user_roles WHERE user_id = ? AND role = ?").get(userId, role);
}

export function addRole(userId: number, role: string): void {
  db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, ?)").run(userId, role);
}

export function removeRole(userId: number, role: string): void {
  db.prepare("DELETE FROM user_roles WHERE user_id = ? AND role = ?").run(userId, role);
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export function createSession(userId: number): string {
  const token = randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, userId);
  return token;
}

export function getSession(token: string): { user_id: number } | null {
  return (db.prepare("SELECT user_id FROM sessions WHERE token = ?").get(token) as { user_id: number }) ?? null;
}

export function deleteSession(token: string): void {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}
