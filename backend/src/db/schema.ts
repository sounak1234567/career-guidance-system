import {
    pgTable, 
    serial, 
    text, 
    timestamp, 
    jsonb, 
    integer, 
    vector, 
    index, 
    uniqueIndex
} from "drizzle-orm/pg-core"

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    email: text("email").unique(),
    name: text("name"),
    passwordHash: text("password_hash"),
    targetRoles: jsonb("target_roles").default([]),
    createdAt: timestamp("created_at").defaultNow(),
});

export const resumes = pgTable("resumes", 
    {
        id: serial("id").primaryKey(),
        userId: integer("user_id")
            .references(() => users.id, { onDelete: "cascade" })
            .notNull(),
        title: text("title").default("Untitled Resume").notNull(),
        rawText: text("raw_text").notNull(),
        structuredData: jsonb("structured_data").$type<{
            contact: {email: string; phone?: string; github?: string; linkedin?: string};
            summary: string;
            experience: Array<{
                role: string; company: string; duration: string; bullets: string[]
            }>;
        }>(),
        atsScore: integer("ats_score").default(0),
        atsFeedback: jsonb("ats_feedback"),
        embedding: vector("embedding", { dimensions: 768 }),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
    },
    (table) => [
        index("resume_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
    ]
);

export const jobSearchCache = pgTable("job_search_cache", {
    queryHash: text("query_hash").primaryKey(),
    queryParams: jsonb("results_json").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const savedJobs = pgTable(
    "saved_jobs", 
    {
        id: serial("id").primaryKey(),
        userId: integer("user_id")
            .references(() => users.id, { onDelete: "cascade" })
            .notNull(),
        jobUrl: text("job_url").notNull(),
        title: text("title").notNull(),
        company: text("company").notNull(),
        matchScore: integer("match_score"),
        missingSkills: jsonb("missing_skills").$type<string[]>().default([]),
        status: text("status").default("saved").notNull().$type<"saved" | "applied" | "interviewing" | "rejected">(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    }, 
    (table) => [
        uniqueIndex("user_job_url_idx").on(table.userId, table.jobUrl)
    ]
);

export const chatMessages = pgTable("chat_messages", {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
        .references(() => users.id, { onDelete: "cascade" })
        .notNull(),
    threadId: text("thread-id").notNull(),
    role: text("role").notNull().$type<"user" | "assistant" | "tool">(),
    content: text("content").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
