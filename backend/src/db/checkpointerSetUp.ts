import { configDotenv } from "dotenv";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

configDotenv();

const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL_UNPOOLED!);

async function setupCheckpoint(){
    console.log("Setting up checkpoint...");
    await checkpointer.setup();
    console.log("Checkpoint setup complete.");
}
setupCheckpoint();
