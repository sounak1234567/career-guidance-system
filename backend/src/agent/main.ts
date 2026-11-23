import { StateSchema, MessagesValue, ReducedValue, type GraphNode, StateGraph, START, END, ConditionalEdgeRouter, LangGraphRunnableConfig, interrupt } from "@langchain/langgraph";
import { DynamicStructuredTool, Tool, tool, ToolRuntime } from "@langchain/core/tools";
import { trimMessages } from "@langchain/core/messages";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { PostgresStore } from "@langchain/langgraph-checkpoint-postgres/store";
import { SystemMessage, AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages"
import { ChatGoogle } from "@langchain/google"; 
import { configDotenv } from "dotenv";
import * as pdfmake from "pdfmake";
import { TDocumentDefinitions } from "pdfmake/interfaces";
import { string, z } from "zod/v4";
import * as readline from "readline";
import { BaseStore } from "@langchain/core/stores";
import { db, saveUserResume } from "../db/index";
import { embedResumeData, ResumeData } from "./embeddings";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { HitlDecision } from "../../../shared/types";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

configDotenv();

const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL_UNPOOLED!);
const store = PostgresStore.fromConnString(process.env.DATABASE_URL_UNPOOLED!);
async function setupCheckpoint(){
    await checkpointer.setup();
}
setupCheckpoint();
const State = new StateSchema({
    messages: MessagesValue,
    LLM_calls: new ReducedValue(
        z.number().default(0),
        { reducer: (x, y) => x + y }
    ),
});

const makeResume = tool(
    async ({ summary }, config: LangGraphRunnableConfig) => {
        const [u] = await db
            .select()
            .from(users)
            .where(eq(users.id, config.configurable?.userId));
        const existing = await config.store?.get(["memories" + `${config.configurable?.userId}`], "career_details");
        const jobTitle = existing?.value?.jobTitle || null;
        const contactParts = [
            u.email,
            existing?.value?.gitHub || null,
            existing?.value?.linkedIn || null,
            existing?.value?.phone || null,
            existing?.value?.location || null,
        ].filter(Boolean);
        const docDefinition: TDocumentDefinitions = {
            pageSize: "A4",
            pageMargins: [40, 40, 40, 40], // 40pt margins all around
            defaultStyle: {
                font: "Roboto",
                fontSize: 10,
                color: "#222222",
                lineHeight: 1.2,
            },
            content: [
                // --- HEADER SECTION ---
                {
                    text: u.name,
                    fontSize: 22,
                    bold: true,
                    color: "#111111",
                    alignment: "center",
                    margin: [0, 0, 0, 4],
                },
                {
                    text: (jobTitle && jobTitle !== "Not specified") ? jobTitle.toUpperCase() : "Your job title",
                    fontSize: 11,
                    bold: true,
                    color: "#555555",
                    alignment: "center",
                    margin: [0, 0, 0, 8],
                },
                {
                    text: contactParts.join("  |  "),
                    fontSize: 9,
                    color: "#444444",
                    alignment: "center",
                    margin: [0, 0, 0, 15],
                },

                // --- DIVIDER LINE ---
                {
                    canvas: [
                        {
                            type: "line",
                            x1: 0,
                            y1: 0,
                            x2: 515, // Page width (595) minus left/right margins (80)
                            y2: 0,
                            lineWidth: 0.75,
                            lineColor: "#cccccc",
                        },
                    ],
                    margin: [0, 0, 0, 15],
                },

                // --- SECTION PLACEHOLDER (Ready for your deeper agent sections) ---
                {
                    text: "SUMMARY",
                    style: "sectionHeader",
                },
                {
                    text: summary,
                    margin: [0, 0, 0, 12],
                },
            ],

            styles: {
                sectionHeader: {
                    fontSize: 11,
                    bold: true,
                    color: "#1a365d",
                    margin: [0, 10, 0, 4],
                    decoration: "underline",
                },
            },
        };
        const decision: HitlDecision = interrupt({
            type: "RESUME_GENERATION_CONFIRMATION",
            message: "Please confirm that you want to generate the resume.",
            proposedChanges: {"Create Resume?": "Need confirmation"}
        });
        // pdfmake.createPdf(docDefinition).write("document.pdf").catch((err) => {
        //     return `Error creating resume: ${err.message}`;
        // });
        if(decision.action == "approve"){
            const userProfile = existing?.value;
            const rData: ResumeData = {
                targetRole: Array.isArray(userProfile?.targetRole) ? userProfile.targetRole : [],
                education: userProfile?.graduationYear || "",
                skills: Array.isArray(userProfile?.skills) ? userProfile.skills : [],
                projects: Array.isArray(userProfile?.projects) ? userProfile.projects : [],
                jobExperience: Array.isArray(userProfile?.jobExperience) ? userProfile.jobExperience : []
            };
            const structData = {
                contact: {
                    email: u.email, 
                    phone: existing?.value.phone || "", 
                    gitHub: existing?.value.gitHub || "", 
                    linkedin: existing?.value.linkedin || ""
                }, 
                summary: summary, 
                experience: {role: "", company: "", duration: "", bullets: ["", ""]}
            };
            const embeddings = await embedResumeData(rData, "RETRIEVAL_DOCUMENT");
            const ins = await saveUserResume({  userId: config.configurable?.userId, title: "", rawText: JSON.stringify(docDefinition), structuredData: structData, atsScore: 0, atsFeedback: {}, embedding: embeddings });
            if(!ins) return `Error saving resume. Draft: ${docDefinition}`;
            return "Resume created and saved to database successfully";
        }
        else return "rejected";
    }, {
    name: "make_resume",
    description: "Just input a generated summary of user's professional career, and the resume draft will be generated",
    schema: z.object({
        summary: z.string().describe("Generate user's professional summary").default("Not provided")
    })
}
);

const updateMemory = tool(
    async (patch, config: LangGraphRunnableConfig) => {
        const store =  config.store;
        const userId = config.configurable?.userId;
        if(!store || !userId) return "Memory store not available or offline";
        const namespace = ["memories" + `${userId}`];
        const existing = await store.get(namespace, "career_details");
        const currentProfile = (existing?.value as Record<string, any>) ?? {
            skills: [],
            projects: [], 
            graduationYear: [],
            jobExperience: [],
            hobbies: []
        };
        
        const updatesProfile = {
            ...currentProfile,
            ...(patch.name && { name: patch.name }), 
            ...(patch.location && { location: patch.location }),
            ...(patch.targetRole && { jobTitle: patch.targetRole }),
            ...(patch.education && { education: patch.education }),
            skills: Array.from(new Set([...(currentProfile.skills ?? []), ...(patch.addSkills ?? [])])), 
            projects: Array.from(new Set([...(currentProfile.projects ?? []), ...(patch.addProjects ?? [])])), 
            jobExperience: Array.from(new Set([...(currentProfile.jobExperience ?? []), ...(patch.addJobExperience ?? [])])), 
            hobbies: Array.from(new Set([...(currentProfile.hobbies ?? []), ...(patch.addHobbies ?? [])])), 
            updatedAt: new Date().toISOString(),
        }; 
        await store.put(namespace, "career_details", updatesProfile);
        return `Successfully updated user profile in long-term memory`;
    }, {
        name: "update_user_memory", 
        description: "call this tool whenever the user explicitly shares new personal details, skills, projects, education, job experience, hobbies, or changes their career goals.", 
        schema: z.object({
            name: z.string().optional().describe("User's name if newly stated or corrected"), 
            location: z.string().optional().describe("User's current city/location"),
            targetRole: z.string().optional().describe("User's target job role or career goal"),
            education: z.string().optional().describe("Degree, university, graduation year, or CGPA/SGPA/DGPA/YGPA"),
            addSkills: z.array(z.string()).optional().describe("New technical or soft skills to add"), 
            addProjects: z.array(z.string()).optional().describe("New projects built by the user"), 
            addJobExperience: z.array(z.string()).optional().describe("New internships, tutoring, or work roles"), 
            addHobbies: z.array(z.string()).optional().describe("New hobbies or extracurricular interests")
        })
    }
);

const toolByName: Record<string, DynamicStructuredTool> = {
    [makeResume.name]: makeResume,
    [updateMemory.name]: updateMemory
};
const tools = Object.values(toolByName);
const llm = new ChatGoogle({ model: "gemma-4-26b-a4b-it" });
const llmWithTools = llm.bindTools(tools);

async function fetchMemory(namespace: string[], store: PostgresStore){
    const params = ["user_info", "location", "experience", "skills", "past_jobs"];
    var user_info: Record<string, unknown> = {};
    for(const param of params){
        const info = await store.get(namespace, param);
        user_info[param] = info;
    }
    return user_info;
}

const llm_node: GraphNode<typeof State> = async (state, runtime) => {
    const userId = runtime.configurable?.userId;
    const namespace = ["memories" + `${userId}`];
    const existing = await runtime.store?.get(namespace, "career_details");
    const userProfile = existing?.value ? JSON.stringify(existing.value, null, 2) : " ";
    // const message = await trimMessages(state.messages, {
    //     strategy: "last",
    //     maxTokens: 1024,
    //     startOn: "human",
    //     endOn: ["human", "tool"],
    //     tokenCounter: llm
    // })
    console.log(`User Profile: ${userProfile}`);
    const response = await llmWithTools.invoke([
        new SystemMessage(`
            You are an AI Career Advisor.
            Current User Long-Term Memory:
            ${userProfile}

            If the user mentions any new skills, projects, experience, or personal facts not listed above (or contradicts existing ones), call 'update_user_memory' to save them.
        `),
        ...state.messages
    ])
    return { messages: [response], LLM_calls: 1 }
}

const toolNode: GraphNode<typeof State> = async (state) => {
    const lastMessage = state.messages.at(-1);

    if(lastMessage == null || !AIMessage.isInstance(lastMessage)) return {messages: []};

    const result: ToolMessage[] = [];
    for(const toolCall of lastMessage.tool_calls ?? []) {      
        const req_tool = toolByName[toolCall.name];
        console.log(`Invoking tool: ${req_tool}`);
        const observation = await req_tool.invoke(toolCall.args);
        const content = JSON.stringify(observation);
        result.push(new ToolMessage({content,  tool_call_id: <string>toolCall.id,}));
    }
    return { messages: result };
};

const shouldContinue: ConditionalEdgeRouter<{ InputSchema: typeof State; Nodes: "tool" }> = (state) => {
    console.log("Checking if conversation should continue...");
    const lastMessage = state.messages.at(-1);
    if(lastMessage == null || !AIMessage.isInstance(lastMessage)) return END;
    if(lastMessage.tool_calls?.length) return "tool";
    return END;
}

const graph = new StateGraph(State)
    .addNode("llm", llm_node)
    .addNode("tool", toolNode)
    .addEdge(START, "llm")
    .addConditionalEdges("llm", shouldContinue, ["tool", END])
    .addEdge("tool", "llm")
    .addEdge("llm", END)
    .compile({ checkpointer, store });

// const userId = "test"; // req.user.id
// const conversationId = "stupidity"; //req.body.conversationId
// const config = {
//     configurable: {
//         thread_id: `user_${userId}_thread_${conversationId}`
//     },
//     context: { user_id: userId }
// }

export { graph, store, makeResume };

// const query = "Hi, I am an AI/ML developer"
// const result = await graph.invoke({ messages: [new HumanMessage(query)] }, config);
// const lastMessage = result.messages.at(-1);
// const finalOutput = lastMessage?.contentBlocks
//     .filter((block) => block.type === "text")
//     .map((block) => block.text)
//     .join("") ?? "";
// console.log(`Cora: ${finalOutput}`);

// var flag = true;
// while(flag){
//     rl.question("You: ", async (query) => {
//         if(query.toLowerCase() === "exit") {
//             flag = false;
//             rl.close();
//             return;
//         }
//         await agentLoop(query);
//     })
// }
