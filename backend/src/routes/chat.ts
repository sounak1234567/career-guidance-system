import { Router } from "express";
import { HumanMessage } from "@langchain/core/messages";
import { Command, isInterrupted, INTERRUPT } from "@langchain/langgraph";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { graph } from "../agent/main";

const router = Router();

function extractReplyText(messages: any[]): string {
    const lastMsg = messages.at(-1);
    if(!lastMsg) return "";
    if(typeof lastMsg.text === "string" && lastMsg.text.trim()) return lastMsg.text;
    if(Array.isArray(lastMsg.content)){
        return lastMsg.content
            .filter((block: any) => block.type === "text")
            .map((block: any) => block.text)
            .join("") ?? "";
    }
    return String(lastMsg.content ?? "");
}

router.post("/", requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const { message, threadId = "default" } = req.body;
        
        if(!message || typeof message !== "string"){
            res.status(400).json({ error: "Message is required" })
            return;
        }
        const config = {
            configurable: {
                thread_id: `user_${userId}_${threadId}`, 
                userId
            }
        };
        const result = await graph.invoke(
            { messages: [new HumanMessage(message)], },
            config 
        );
        if(isInterrupted(result) && result.__interrupt__?.length > 0){
            res.json({
                status: "interrupted",
                interruptPayload: result.__interrupt__[0].value,
            });
            return;
        }
        res.json({
            status: "completed",
            reply: extractReplyText(result.messages),
        });
    } catch (err) {
        console.error("Chat error:", err);
        res.status(500).json({ error: "Agent execution failed" });
    }
});

router.post("/resume", requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const { threadId = "default", decision } = req.body;

        if(!decision || !decision.action){
            res.status(400).json({ error: "valid decision payload is required" });
            return;
        }

        const config = {
            configurable: {
                thread_id: `user_${userId}_${threadId}`,
                userId,
            },
        };

        const result = await graph.invoke(
            new Command({ resume: decision }), 
            config
        );
        if(isInterrupted(result) && result.__interrupt__?.length > 0){
            res.json({
                status: "interrupted",
                interruptPayload: result.__interrupt__[0].value,
            });
            return;
        }
        res.json({
            status: "completed",
            reply: extractReplyText(result.messages),
        });
    } catch(err) {
        console.error("Resume error:", err);
        res.status(500).json({ error: "Failed to resume conversation" });
    }
});

export default router;
