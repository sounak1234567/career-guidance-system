import { Router } from "express";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { users } from "../db/schema.ts";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";

const router = Router();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

async function createToken(user: {id: number; email: string | null }){
    if(user.email === null){
        return null;
    }
    return await new SignJWT({ email: user.email })
        .setProtectedHeader({ alg: "HS512" })
        .setSubject(String(user.id))
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(JWT_SECRET);
}

router.post("/register", async (req, res) => {
    try{
        const { name, email, password, targetRoles } = req.body;
        if(!name || !email || !password){
            res.status(400).json({ error: "Name, email, and password are required" });
            return;
        }
        
        const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if(existing.length > 0){
            res.status(409).json({ error: "User with this email already exists" });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const [created] = await db
            .insert(users)
            .values({ name, email, passwordHash, targetRoles })
            .returning({ id: users.id, email: users.email });
        const token = await createToken(created);
        res.status(201).json({ user: created, token });
    } catch (err){
        console.error("Register error: ", err);
        res.status(500).json({ error: "Registration failed" });
    }
});

router.post("/login", async (req, res) => {
    try{
        const { email, password } = req.body;
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))){
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }

        const token = await createToken(user);
        res.json({
            user: {id: user.id, name: user.name, email: user.email, targetRoles: user.targetRoles},
            token,
        });
    } catch (err) {
        console.error("Login error: ", err);
        res.status(500).json({ error: "Login failed" });
    }
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
    const [user] = await db
        .select({ id: users.id, name: users.name, email: users.email, targetRoles: users.targetRoles })
        .from(users)
        .where(eq(users.id, req.user!.id))
        .limit(1);
    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    res.json({ user });
});

export default router;
