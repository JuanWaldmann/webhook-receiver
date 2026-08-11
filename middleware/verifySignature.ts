import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  throw new Error('GITHUB_WEBHOOK_SECRET is not set');
}

/**
 * Express middleware that verifies a GitHub webhook's HMAC-SHA256 signature.
 * Rejects the request with 401 if the signature header is missing or invalid;
 * otherwise calls next() to continue to the route handler.
 */
export function isValid(req: Request, res: Response, next: NextFunction) {
  const signatureHeader = req.headers['x-hub-signature-256'];

  if (!signatureHeader) {
    return res.sendStatus(401);
  }

  const theirSignature = Buffer.from(signatureHeader.replace('sha256=', ''), 'hex');
  const mySignature = Buffer.from(
    crypto.createHmac('sha256', WEBHOOK_SECRET).update(req.rawBody).digest('hex'),
    'hex'
  );

  const isAuthentic =
    theirSignature.length === mySignature.length &&
    crypto.timingSafeEqual(theirSignature, mySignature);

  if (!isAuthentic) {
    return res.sendStatus(401);
  }

  next();
}