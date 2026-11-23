import { configDotenv } from "dotenv";
import { GoogleGenAI } from "@google/genai";

configDotenv();

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY
});

export interface ResumeData {
    targetRole: string[];
    education: string;
    skills: string[];
    projects: string[];
    jobExperience: string[];
}

export async function embedResumeData(
    resumeData: ResumeData, 
    taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"
) : Promise<number[]> {
    const searchableText = [
        Array.isArray(resumeData.targetRole) ? `Target Role: ${resumeData.targetRole.join("; ")}` : "",
        resumeData.education ? `Education: ${resumeData.education}` : "",
        Array.isArray(resumeData.skills) ? `Skills: ${resumeData.skills.join("; ")}` : "", 
        Array.isArray(resumeData.projects) ? `Projects: ${resumeData.projects.join("; ")}` : "",
        Array.isArray(resumeData.jobExperience) ? `Job Experience: ${resumeData.jobExperience.join("; ")}` : ""
    ]
    .filter(Boolean)
    .join("\n");

    const response = await ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: searchableText,
        config: {
            taskType, 
            outputDimensionality: 768,
        }
    });
    const values = response.embeddings?.[0]?.values;
    if(!values || values.length !== 768){
        throw new Error(`Expected 768-dimensional embedding, got ${values?.length}`);
    }
    return values;
}
