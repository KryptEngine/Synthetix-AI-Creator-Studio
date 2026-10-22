import type { Request, Response, NextFunction } from 'express';

const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001'
];

/**
 * Baseline browser hardening. Helmet is not installed (it pulls native deps
 * that do not build on this arm64 target), so the headers that matter are set
 * directly.
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  if (process.env.HTTPS === 'on') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

/** Only same-origin browser clients and the local dev servers may call the API. */
export function corsAllowlist(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  const allowed = (process.env.CORS_ORIGINS || DEFAULT_ORIGINS.join(','))
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (origin && !allowed.includes(origin)) {
    return res.status(403).json({ error: 'CORS_REJECTED', message: 'Origin not allowed.' });
  }
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
}

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window per-IP limiter. Keeps a single-process map and prunes expired
 * buckets so it cannot grow without bound.
 */
export function rateLimit(options: { windowMs: number; max: number; message?: string }) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${req.ip || 'unknown'}:${req.baseUrl || ''}${req.path}`;

    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { count: 0, resetAt: now + options.windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;

    res.setHeader('X-RateLimit-Limit', String(options.max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, options.max - bucket.count)));

    if (bucket.count > options.max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({
        error: 'RATE_LIMITED',
        message: options.message || 'Too many requests. Try again shortly.'
      });
    }
    next();
  };
}

/**
 * Every unmatched route and thrown error must answer with JSON — an HTML error
 * page breaks the client-side request helper.
 */
export function jsonErrorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const status = Number(err?.status || err?.statusCode || 500);
  const isClientError = status >= 400 && status < 500;
  if (!isClientError) {
    console.error(`[api] ${req.method} ${req.originalUrl} failed:`, err?.message || err);
  }
  res.status(status).json({
    error: err?.code || err?.error || (isClientError ? 'REQUEST_FAILED' : 'INTERNAL_ERROR'),
    message: isClientError ? err?.message || 'Request failed.' : 'Something went wrong on our side.'
  });
}

/** 404 handler for unmatched /api routes. */
export function apiNotFound(req: Request, res: Response) {
  res.status(404).json({ error: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` });
}
