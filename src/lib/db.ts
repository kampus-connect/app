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
    level TEXT NOT NULL DEFAULT 'Beginner',
    learning INTEGER NOT NULL DEFAULT 0,
    learning_note TEXT NOT NULL DEFAULT '',
    teaching INTEGER NOT NULL DEFAULT 0,
    teaching_note TEXT NOT NULL DEFAULT '',
    doing INTEGER NOT NULL DEFAULT 0,
    doing_note TEXT NOT NULL DEFAULT ''
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
  CREATE TABLE IF NOT EXISTS initiatives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    max_users INTEGER NOT NULL DEFAULT 5,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS initiative_skills (
    initiative_id INTEGER NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    PRIMARY KEY (initiative_id, skill_name)
  );
  CREATE TABLE IF NOT EXISTS initiative_participants (
    initiative_id INTEGER NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (initiative_id, user_id)
  );
`);

// ── Migrations ────────────────────────────────────────────────────────────────

try {
  db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''");
} catch { /* already exists */ }

try { db.exec("ALTER TABLE skills ADD COLUMN learning INTEGER NOT NULL DEFAULT 0"); } catch { /* already exists */ }
try { db.exec("ALTER TABLE skills ADD COLUMN learning_note TEXT NOT NULL DEFAULT ''"); } catch { /* already exists */ }
try { db.exec("ALTER TABLE skills ADD COLUMN teaching INTEGER NOT NULL DEFAULT 0"); } catch { /* already exists */ }
try { db.exec("ALTER TABLE skills ADD COLUMN teaching_note TEXT NOT NULL DEFAULT ''"); } catch { /* already exists */ }
try { db.exec("ALTER TABLE skills ADD COLUMN doing INTEGER NOT NULL DEFAULT 0"); } catch { /* already exists */ }
try { db.exec("ALTER TABLE skills ADD COLUMN doing_note TEXT NOT NULL DEFAULT ''"); } catch { /* already exists */ }

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
  learning: boolean;
  learning_note: string;
  teaching: boolean;
  teaching_note: string;
  doing: boolean;
  doing_note: string;
}

export type SkillInput = {
  name: string;
  learning?: boolean;
  learning_note?: string;
  teaching?: boolean;
  teaching_note?: string;
  doing?: boolean;
  doing_note?: string;
};

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

interface SkillRow {
  id: number;
  user_id: number;
  name: string;
  learning: number;
  learning_note: string;
  teaching: number;
  teaching_note: string;
  doing: number;
  doing_note: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToSkill(row: SkillRow): Skill {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    learning: row.learning !== 0,
    learning_note: row.learning_note ?? "",
    teaching: row.teaching !== 0,
    teaching_note: row.teaching_note ?? "",
    doing: row.doing !== 0,
    doing_note: row.doing_note ?? "",
  };
}

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
  const skills = (db.prepare("SELECT * FROM skills").all() as SkillRow[]).map(rowToSkill);
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
  const skills = (db.prepare("SELECT * FROM skills").all() as SkillRow[]).map(rowToSkill);
  return users.map((u) =>
    rowToUser(u, skills.filter((s) => s.user_id === u.id), ["standard"])
  );
}

export function getUserById(id: number): User | null {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  if (!row) return null;
  const skills = (db.prepare("SELECT * FROM skills WHERE user_id = ?").all(id) as SkillRow[]).map(rowToSkill);
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
  skills: SkillInput[],
  roles: string[]
): User {
  const stmtUser = db.prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)");
  const stmtSkill = db.prepare(`
    INSERT INTO skills (user_id, name, level, learning, learning_note, teaching, teaching_note, doing, doing_note)
    VALUES (?, ?, 'Beginner', ?, ?, ?, ?, ?, ?)
  `);
  const stmtRole = db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, ?)");

  let userId!: number;
  db.transaction(() => {
    userId = stmtUser.run(name, email, passwordHash).lastInsertRowid as number;
    for (const skill of skills) {
      if (skill.name.trim()) stmtSkill.run(
        userId, skill.name.trim(),
        skill.learning ? 1 : 0, skill.learning_note ?? "",
        skill.teaching ? 1 : 0, skill.teaching_note ?? "",
        skill.doing ? 1 : 0, skill.doing_note ?? ""
      );
    }
    for (const role of roles) stmtRole.run(userId, role);
  })();

  return getUserById(userId)!;
}

/** Creates a standard user without a password (admin-initiated). */
export function createUser(
  name: string,
  email: string,
  skills: SkillInput[]
): User {
  return _insertUser(name, email, "", skills, ["standard"]);
}

/** Creates a self-registered user with a password and the standard role. */
export function registerUser(
  name: string,
  email: string,
  passwordHash: string,
  skills: SkillInput[]
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

/** Skill names with count of distinct dashboard users who have each skill, sorted by count desc. */
export function getAllSkillsWithCounts(): { name: string; count: number }[] {
  return db.prepare(`
    SELECT s.name, COUNT(DISTINCT s.user_id) AS count
    FROM skills s
    INNER JOIN user_roles ur ON ur.user_id = s.user_id AND ur.role = 'standard'
    WHERE s.user_id NOT IN (SELECT user_id FROM user_roles WHERE role = 'admin')
    GROUP BY s.name
    ORDER BY count DESC, s.name
  `).all() as { name: string; count: number }[];
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

/** Adds an activity to a user's profile. Returns the new skill row. */
export function addSkill(userId: number, name: string, options: Omit<SkillInput, "name">): Skill {
  const result = db.prepare(`
    INSERT INTO skills (user_id, name, level, learning, learning_note, teaching, teaching_note, doing, doing_note)
    VALUES (?, ?, 'Beginner', ?, ?, ?, ?, ?, ?)
  `).run(
    userId, name.trim(),
    options.learning ? 1 : 0, options.learning_note ?? "",
    options.teaching ? 1 : 0, options.teaching_note ?? "",
    options.doing ? 1 : 0, options.doing_note ?? ""
  );
  return {
    id: result.lastInsertRowid as number,
    user_id: userId,
    name: name.trim(),
    learning: !!options.learning,
    learning_note: options.learning_note ?? "",
    teaching: !!options.teaching,
    teaching_note: options.teaching_note ?? "",
    doing: !!options.doing,
    doing_note: options.doing_note ?? "",
  };
}

/** Removes a skill by id, scoped to a specific user. Returns true if deleted. */
export function removeSkill(skillId: number, userId: number): boolean {
  return db.prepare("DELETE FROM skills WHERE id = ? AND user_id = ?").run(skillId, userId).changes > 0;
}

/** Updates an existing activity's name and options, scoped to a specific user. */
export function updateSkill(skillId: number, userId: number, name: string, options: Omit<SkillInput, "name">): boolean {
  return db.prepare(`
    UPDATE skills SET name = ?, learning = ?, learning_note = ?, teaching = ?, teaching_note = ?, doing = ?, doing_note = ?
    WHERE id = ? AND user_id = ?
  `).run(
    name.trim(),
    options.learning ? 1 : 0, options.learning_note ?? "",
    options.teaching ? 1 : 0, options.teaching_note ?? "",
    options.doing ? 1 : 0, options.doing_note ?? "",
    skillId, userId
  ).changes > 0;
}

// ── Initiatives ───────────────────────────────────────────────────────────────

export interface Initiative {
  id: number;
  title: string;
  description: string;
  max_users: number;
  created_by: number;
  active: boolean;
  created_at: string;
  skills: string[];
  participant_count: number;
  is_participant: boolean;
}

function attachInitiativeMeta(
  rows: { id: number; title: string; description: string; max_users: number; created_by: number; active: number; created_at: string }[],
  userId: number
): Initiative[] {
  if (rows.length === 0) return [];
  const skillRows = db.prepare(
    `SELECT initiative_id, skill_name FROM initiative_skills WHERE initiative_id IN (${rows.map(() => "?").join(",")})`,
  ).all(...rows.map((r) => r.id)) as { initiative_id: number; skill_name: string }[];
  const countRows = db.prepare(
    `SELECT initiative_id, COUNT(*) as cnt FROM initiative_participants WHERE initiative_id IN (${rows.map(() => "?").join(",")}) GROUP BY initiative_id`,
  ).all(...rows.map((r) => r.id)) as { initiative_id: number; cnt: number }[];
  const partRows = db.prepare(
    `SELECT initiative_id FROM initiative_participants WHERE user_id = ? AND initiative_id IN (${rows.map(() => "?").join(",")})`,
  ).all(userId, ...rows.map((r) => r.id)) as { initiative_id: number }[];

  const skillsMap = new Map<number, string[]>();
  for (const s of skillRows) {
    const list = skillsMap.get(s.initiative_id) ?? [];
    list.push(s.skill_name);
    skillsMap.set(s.initiative_id, list);
  }
  const countMap = new Map(countRows.map((c) => [c.initiative_id, c.cnt]));
  const partSet = new Set(partRows.map((p) => p.initiative_id));

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    max_users: r.max_users,
    created_by: r.created_by,
    active: r.active !== 0,
    created_at: r.created_at,
    skills: skillsMap.get(r.id) ?? [],
    participant_count: countMap.get(r.id) ?? 0,
    is_participant: partSet.has(r.id),
  }));
}

export function getActiveInitiatives(userId: number): Initiative[] {
  const rows = db.prepare(
    "SELECT * FROM initiatives WHERE active = 1 ORDER BY created_at DESC"
  ).all() as any[];
  return attachInitiativeMeta(rows, userId);
}

export function getCompletedInitiativesForUser(userId: number): Initiative[] {
  const rows = db.prepare(`
    SELECT i.* FROM initiatives i
    INNER JOIN initiative_participants p ON p.initiative_id = i.id AND p.user_id = ?
    WHERE i.active = 0
    ORDER BY i.created_at DESC
  `).all(userId) as any[];
  return attachInitiativeMeta(rows, userId);
}

export function createInitiative(
  title: string,
  description: string,
  maxUsers: number,
  createdBy: number,
  skills: string[]
): Initiative {
  const stmtInit = db.prepare(
    "INSERT INTO initiatives (title, description, max_users, created_by) VALUES (?, ?, ?, ?)"
  );
  const stmtSkill = db.prepare(
    "INSERT OR IGNORE INTO initiative_skills (initiative_id, skill_name) VALUES (?, ?)"
  );
  let id!: number;
  db.transaction(() => {
    id = stmtInit.run(title, description, maxUsers, createdBy).lastInsertRowid as number;
    for (const s of skills) if (s.trim()) stmtSkill.run(id, s.trim());
  })();
  return attachInitiativeMeta(
    [db.prepare("SELECT * FROM initiatives WHERE id = ?").get(id) as any],
    createdBy
  )[0];
}

export function joinInitiative(
  initiativeId: number,
  userId: number
): { initiative: Initiative } | null {
  const init = db.prepare("SELECT * FROM initiatives WHERE id = ?").get(initiativeId) as any;
  if (!init || !init.active) return null;

  db.prepare(
    "INSERT OR IGNORE INTO initiative_participants (initiative_id, user_id) VALUES (?, ?)"
  ).run(initiativeId, userId);

  const count = (db.prepare(
    "SELECT COUNT(*) as cnt FROM initiative_participants WHERE initiative_id = ?"
  ).get(initiativeId) as { cnt: number }).cnt;

  if (count >= init.max_users) {
    db.prepare("UPDATE initiatives SET active = 0 WHERE id = ?").run(initiativeId);
  }

  return { initiative: attachInitiativeMeta([db.prepare("SELECT * FROM initiatives WHERE id = ?").get(initiativeId) as any], userId)[0] };
}

// ── Badges ────────────────────────────────────────────────────────────────────

export type BadgeTier = "none" | "bronze" | "silver" | "gold" | "platinum";

export interface BadgeValue {
  id: string;
  value: number;
  tier: BadgeTier;
}

function tier(value: number): BadgeTier {
  if (value >= 20) return "platinum";
  if (value >= 10) return "gold";
  if (value >= 3)  return "silver";
  if (value >= 1)  return "bronze";
  return "none";
}

/**
 * Compute all badge values for a user.
 * To add a new badge: add one query + one push() here, add translation keys,
 * add one entry to BADGE_DEFS in the profile page.
 */
export function computeBadges(userId: number): BadgeValue[] {
  const badges: BadgeValue[] = [];

  // Teacher — unique users who joined initiatives created by this user (excl. self)
  const taught = (db.prepare(`
    SELECT COUNT(DISTINCT p.user_id) AS cnt
    FROM initiative_participants p
    INNER JOIN initiatives i ON i.id = p.initiative_id AND i.created_by = ?
    WHERE p.user_id != ?
  `).get(userId, userId) as { cnt: number }).cnt;
  badges.push({ id: "teacher", value: taught, tier: tier(taught) });

  // Learner — completed initiatives joined by this user where they were not the creator
  const learned = (db.prepare(`
    SELECT COUNT(*) AS cnt
    FROM initiative_participants p
    INNER JOIN initiatives i ON i.id = p.initiative_id
    WHERE p.user_id = ? AND i.created_by != ? AND i.active = 0
  `).get(userId, userId) as { cnt: number }).cnt;
  badges.push({ id: "learner", value: learned, tier: tier(learned) });

  // Meeting — total initiatives this user has participated in (any role, any state)
  const meetings = (db.prepare(`
    SELECT COUNT(*) AS cnt FROM initiative_participants WHERE user_id = ?
  `).get(userId) as { cnt: number }).cnt;
  badges.push({ id: "meeting", value: meetings, tier: tier(meetings) });

  return badges;
}

export function leaveInitiative(initiativeId: number, userId: number): boolean {
  const init = db.prepare("SELECT active FROM initiatives WHERE id = ?").get(initiativeId) as { active: number } | undefined;
  if (!init || !init.active) return false;
  return db.prepare(
    "DELETE FROM initiative_participants WHERE initiative_id = ? AND user_id = ?"
  ).run(initiativeId, userId).changes > 0;
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
