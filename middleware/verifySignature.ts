    import crypto from 'crypto';
    import type { Request, Response, NextFunction } from 'express';

    // TODO const = WEBHOOK_SECRET process.env.GITHUB_WEBHOOK_SECRET ?? secretKey;
    const secretKey = '1234'
    
    export function isValid(req: Request, res: Response, next: NextFunction) {
        const signatureHeader = req.headers['x-hub-signature-256'];

        if (!signatureHeader){
            return res.sendStatus(401);
        }

        const theirSignature = Buffer.from(signatureHeader.replace('sha256=', ''), 'hex');
        const mySignature = Buffer.from(
            crypto.createHmac('sha256', secretKey).update(req.rawBody).digest('hex'), 'hex'
        );
        const isAuthentic = theirSignature.length === mySignature.length && crypto.timingSafeEqual(theirSignature, mySignature);

        if (!isAuthentic){
            return res.sendStatus(401);
        }

        next();
    };