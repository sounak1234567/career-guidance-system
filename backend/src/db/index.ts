import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { cosineDistance, desc, eq, gt, sql } from "drizzle-orm"
import { configDotenv } from "dotenv"
import * as schema from "./schema"

configDotenv();

const client = neon(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema })

export async function saveUserResume({
    userId, 
    title,
    rawText, 
    structuredData, 
    atsScore, 
    atsFeedback, 
    embedding
} : {
    userId: number;
    title: string;
    rawText: string;
    structuredData: any;
    atsScore: number;
    atsFeedback: any;
    embedding: number[];
}) {
    var t;
    if(title === ""){
        t = `${userId}_AI_resume`;
    }
    else{
        t = title;
    }
    const [inserted] = await db
        .insert(schema.resumes)
        .values({
            userId, 
            rawText,
            title: t,
            structuredData,
            atsScore,
            atsFeedback,
            embedding,
        }).returning();
    return inserted;
}

export async function matchResumeToJobEmbedding(resumeId: number, jobEmbedding: number[]) {
    const similarity = sql<number>`1 - (${cosineDistance(schema.resumes.embedding, jobEmbedding)})`;
    const [match] = await db.select({
        resumeId: schema.resumes.id,
        similarityScore: similarity,
        skills: schema.resumes.structuredData
    }).from(schema.resumes).where(eq(schema.resumes.id, resumeId))
    return match;
}

export async function bookmarkJob(data: {
    userId: number, 
    jobUrl: string, 
    title: string, 
    company: string, 
    matchScore?: number,
    missingSkills?: string[]
}) {
    const [saved] = await db
        .insert(schema.savedJobs)
        .values(data)
        .returning();
    return saved;
}
