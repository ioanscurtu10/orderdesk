import { createHmac, timingSafeEqual } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import type { Role, User } from '@orderdesk/shared'
import { config } from './config'

interface DemoAccount extends User {
  password: string
}

/** Demo accounts. Documented in the README and shown on the login screen. */
export const ACCOUNTS: DemoAccount[] = [
  {
    id: 'usr_admin',
    email: 'admin@orderdesk.dev',
    name: 'Ana Admin',
    role: 'admin',
    password: 'admin123',
  },
  {
    id: 'usr_viewer',
    email: 'viewer@orderdesk.dev',
    name: 'Victor Viewer',
    role: 'viewer',
    password: 'viewer123',
  },
]

interface TokenPayload {
  sub: string
  role: Role
  exp: number
}

const b64url = (s: string | Buffer) => Buffer.from(s).toString('base64url')

function sign(data: string): string {
  return createHmac('sha256', config.tokenSecret).update(data).digest('base64url')
}

/** Minimal signed token (JWT-like) with no external dependency. */
export function issueToken(
  user: User,
  ttlMs = config.tokenTtlMs,
): { token: string; expiresAt: number } {
  const exp = Date.now() + ttlMs
  const payload: TokenPayload = { sub: user.id, role: user.role, exp }
  const body = b64url(JSON.stringify(payload))
  return { token: `${body}.${sign(body)}`, expiresAt: exp }
}

export function verifyToken(token: string): User | null {
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = sign(body)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as TokenPayload
    if (payload.exp < Date.now()) return null
    const account = ACCOUNTS.find((u) => u.id === payload.sub)
    if (!account) return null
    const { password: _pw, ...user } = account
    return user
  } catch {
    return null
  }
}

export function authenticate(email: string, password: string): User | null {
  const account = ACCOUNTS.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (!account || account.password !== password) return null
  const { password: _pw, ...user } = account
  return user
}

export interface AuthedRequest extends Request {
  user: User
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined
  const user = token ? verifyToken(token) : null
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  ;(req as AuthedRequest).user = user
  next()
}

export function requireRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthedRequest).user
    if (user?.role !== role) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  }
}
