import { Request, Response, NextFunction } from "express";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export interface AuthRequest extends Request{
    user?: {
        id: number;
        email: string;
    }
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer") ? authHeader.slice(7) : undefined;

    if(!token){
        res.status(401).json({ error: "Missing authorization token" });
        return;
    }

    try{
        const { payload } = await jwtVerify(token, JWT_SECRET);
        req.user = {
            id: Number(payload.sub),
            email: String(payload.email),
        };
        next();
    } catch { res.status(401).json({ error: "Invalid authorization token" }); 
    }
}
