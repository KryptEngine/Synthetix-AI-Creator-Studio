import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../src/types/index.ts';

// The admin seed runs at import time, so the environment must be loaded here —
// server.ts calls dotenv.config() too late for this module.
dotenv.config();

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), '.data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
export const SESSION_COOKIE = 'synthetix_sid';

const ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'];
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  handle: string;
  avatarUrl: string;
  role: UserRole;
  passwordHash: string;
  passwordSalt: string;
  passwordSource: 'env' | 'manual';
  createdAt: string;
}

interface SessionRecord {
  token: string;
  userId: string;
  expiresAt: number;
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function readJson<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, value: unknown) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value, null, 2), { mode: 0o600 });
  } catch {
    // Persistence is best-effort; the in-memory copy still works.
  }
}

function seedSuperAdmin(): UserRecord[] {
  const email = (process.env.ADMIN_EMAIL || 'admin@synthetix.ai').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
  const salt = crypto.randomBytes(16).toString('hex');
  const user: UserRecord = {
    id: 'user-1',
    email,
    name: process.env.ADMIN_NAME || 'Alex Reed (Synthetix)',
    handle: '@alexreed',
    avatarUrl: '/assets/avatar_alex_reed_1792602672415.jpg',
    role: 'SUPER_ADMIN',
    passwordHash: hashPassword(password, salt),
    passwordSalt: salt,
    passwordSource: 'env',
    createdAt: new Date().toISOString()
  };
  console.log(`\n  ┌─ First-run super admin ─────────────────────────────`);
  console.log(`  │  email:    ${email}`);
  console.log(`  │  password: ${password}`);
  console.log(`  └──────────────────────────────────────────────────────\n`);
  return [user];
}

class AuthStore {
  users: UserRecord[] = readJson<UserRecord[]>(USERS_FILE, []);
  sessions: SessionRecord[] = readJson<SessionRecord[]>(SESSIONS_FILE, []);

  constructor() {
    if (!this.users.length) {
      this.users = seedSuperAdmin();
      this.persistUsers();
    } else {
      this.applyEnvPassword();
    }
    this.pruneSessions();
  }

  /**
   * Keeps ADMIN_PASSWORD authoritative for the auto-seeded super admin, while
   * leaving a password the user changed by hand untouched.
   */
  private applyEnvPassword() {
    const password = process.env.ADMIN_PASSWORD;
    const email = (process.env.ADMIN_EMAIL || 'admin@synthetix.ai').toLowerCase();
    if (!password) return;
    const target = this.users.find(
      (u) => u.email === email && (!u.passwordSource || u.passwordSource === 'env')
    );
    if (!target) return;
    const salt = crypto.randomBytes(16).toString('hex');
    target.passwordSalt = salt;
    target.passwordHash = hashPassword(password, salt);
    this.persistUsers();
  }

  private persistUsers() {
    writeJson(USERS_FILE, this.users);
  }

  private persistSessions() {
    writeJson(SESSIONS_FILE, this.sessions);
  }

  private pruneSessions() {
    const now = Date.now();
    const kept = this.sessions.filter((s) => s.expiresAt > now);
    if (kept.length !== this.sessions.length) {
      this.sessions = kept;
      this.persistSessions();
    }
  }

  findByEmail(email: string): UserRecord | undefined {
    return this.users.find((u) => u.email === email.trim().toLowerCase());
  }

  findById(id: string): UserRecord | undefined {
    return this.users.find((u) => u.id === id);
  }

  verifyPassword(user: UserRecord, password: string): boolean {
    const candidate = Buffer.from(hashPassword(password, user.passwordSalt), 'hex');
    const expected = Buffer.from(user.passwordHash, 'hex');
    return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
  }

  createUser(input: { email: string; name: string; role: UserRole }): UserRecord {
    const salt = crypto.randomBytes(16).toString('hex');
    const user: UserRecord = {
      id: `user-${crypto.randomUUID()}`,
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      handle: `@${input.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 16) || 'creator'}`,
      avatarUrl: '/assets/avatar_alex_reed_1792602672415.jpg',
      role: ROLES.includes(input.role) ? input.role : 'USER',
      passwordHash: '',
      passwordSalt: salt,
      passwordSource: 'manual',
      createdAt: new Date().toISOString()
    };
    this.users = [...this.users, user];
    this.persistUsers();
    return user;
  }

  setPassword(userId: string, password: string, source: 'env' | 'manual' = 'manual'): UserRecord | undefined {
    const user = this.findById(userId);
    if (!user) return undefined;
    const salt = crypto.randomBytes(16).toString('hex');
    user.passwordSalt = salt;
    user.passwordHash = hashPassword(password, salt);
    user.passwordSource = source;
    this.persistUsers();
    return user;
  }

  setRole(userId: string, role: UserRole): UserRecord | undefined {
    const user = this.findById(userId);
    if (!user || !ROLES.includes(role)) return undefined;
    user.role = role;
    this.persistUsers();
    return user;
  }

  /** Applies display fields to a user record and persists them. */
  updateIdentity(
    userId: string,
    patch: { name?: string; handle?: string; avatarUrl?: string }
  ): UserRecord | undefined {
    const user = this.findById(userId);
    if (!user) return undefined;
    if (patch.name !== undefined) user.name = patch.name;
    if (patch.handle !== undefined) user.handle = patch.handle;
    if (patch.avatarUrl !== undefined) user.avatarUrl = patch.avatarUrl;
    this.persistUsers();
    return user;
  }

  issueSession(userId: string): string {
    this.pruneSessions();
    const token = crypto.randomBytes(32).toString('base64url');
    this.sessions = [...this.sessions, { token, userId, expiresAt: Date.now() + SESSION_TTL_MS }];
    this.persistSessions();
    return token;
  }

  destroySession(token: string) {
    this.sessions = this.sessions.filter((s) => s.token !== token);
    this.persistSessions();
  }

  resolveSession(token: string | undefined): UserRecord | undefined {
    if (!token) return undefined;
    const session = this.sessions.find((s) => s.token === token);
    if (!session) return undefined;
    if (session.expiresAt <= Date.now()) {
      this.destroySession(session.token);
      return undefined;
    }
    return this.findById(session.userId);
  }
}

export const auth = new AuthStore();

/** Reads the session cookie without requiring one. */
export function readSessionToken(req: Request): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

export function setSessionCookie(res: Response, token: string) {
  const secure = process.env.HTTPS === 'on' || process.env.COOKIE_SECURE === 'on';
  const attrs = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`
  ];
  if (secure) attrs.push('Secure');
  res.append('Set-Cookie', attrs.join('; '));
}

export function clearSessionCookie(res: Response) {
  res.append('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
}

/** Rejects the request unless a valid session cookie is present. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = auth.resolveSession(readSessionToken(req));
  if (!user) {
    return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Sign in to continue.' });
  }
  (req as Request & { user?: UserRecord }).user = user;
  next();
}

/** Rejects the request unless the session holds one of the given roles. */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as Request & { user?: UserRecord }).user;
    if (!user) {
      return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Sign in to continue.' });
    }
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Your role cannot perform this action.' });
    }
    next();
  };
}

/** Attaches the session user when one exists, but never blocks the request. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const user = auth.resolveSession(readSessionToken(req));
  if (user) (req as Request & { user?: UserRecord }).user = user;
  next();
}

export function currentUser(req: Request): UserRecord | undefined {
  return (req as Request & { user?: UserRecord }).user;
}
