import type { NextFunction, Request, Response } from 'express'
import type { ZodType } from 'zod'
import { NotFoundError, ValidationError } from './data/store'

export function delay(ms: number) {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    if (ms <= 0) return next()
    setTimeout(next, ms)
  }
}

/** Parse and replace req.body / req.query with the schema output, or 400 with details. */
export function validate<T>(schema: ZodType<T>, source: 'body' | 'query') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source])
    if (!result.success) {
      res.status(400).json({ error: 'Validation failed', details: result.error.issues })
      return
    }
    if (source === 'query') {
      // Express 5 exposes `query` as a getter; stash the parsed value elsewhere.
      ;(req as Request & { parsedQuery: T }).parsedQuery = result.data
    } else {
      req.body = result.data
    }
    next()
  }
}

export function parsedQuery<T>(req: Request): T {
  return (req as Request & { parsedQuery: T }).parsedQuery
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message })
    return
  }
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message, details: err.details })
    return
  }
  if (
    err &&
    typeof err === 'object' &&
    'type' in err &&
    (err as { type: string }).type === 'entity.parse.failed'
  ) {
    res.status(400).json({ error: 'Malformed JSON body' })
    return
  }
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
}
