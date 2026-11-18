import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { configDotenv } from "dotenv";
configDotenv();

async function runMigrations(){
    console.log(process.env.DATABASE_URL_UNPOOLED!);
    const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
    const db = drizzle({ client: sql });
    console.log("Pushing migrations over HTTPS...");
    await migrate(db, { migrationsFolder: "./drizzle" });
}
runMigrations().catch((err) => {
    console.error("Error running migrations:", err);
    process.exit(1);
});
