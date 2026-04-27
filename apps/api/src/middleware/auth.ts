import type { Request, Response, NextFunction } from 'express'

// TODO: Week 2–3 — validate Supabase JWT from Authorization header, attach clientId to req
export function authenticate(_req: Request, _res: Response, next: NextFunction): void {
  next()
}
