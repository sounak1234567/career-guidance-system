import { Router } from "express";
import { createRequire } from "node:module";
import type { TDocumentDefinitions } from "pdfmake/interfaces";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { store, makeResume } from "../agent/main"; 
import { db } from "../db/index";
import { resumes, users } from "../db/schema";
import { eq } from "drizzle-orm";
import { buildPdfBuffer } from "../agent/pdfPrinter";

const require = createRequire(import.meta.url);
const pdfPrinter = require("pdfmake/js/Printer.js").default || require("pdfmake/js/Printer.js");

const router = Router();

const fonts = {
    Roboto: {
        normal: "node_modules/pdfmake/examples/fonts/Roboto-Regular.ttf", 
        bold: "node_modules/pdfmake/examples/fonts/Roboto-Medium.ttf",
        italic: "node_modules/pdfmake/examples/fonts/Roboto-Italic.ttf",
        bolditalics: "node_modules/pdfmake/examples/fonts/Roboto-MediumItalic.ttf"
    },
};

const printer = new pdfPrinter(fonts);

router.get("/", requireAuth, async (req: AuthRequest, res: any) => {
    const userId = req.user!.id;
    const item = await store.get(["memories" + `${userId}`], "career_details");
    res.json({ profile: item?.value ?? {} });
});

router.post("/resume-pdf", requireAuth, async (req: AuthRequest, res: any) => {
    try {
        const userId = req.user!.id;
        const [resumeData] = await db.select()
            .from(resumes)
            .where(eq(resumes.title, `${userId}_AI_resume`))
            .limit(1);
        if (!resumeData) {
            return res.status(404).json({ error: "Resume not found" });
        }
        console.log("Resume Data:", resumeData.rawText);
        const raw = JSON.parse(resumeData.rawText);
        const docDefinition = <TDocumentDefinitions>raw;
        console.log(docDefinition);
        const pdfBuffer = await buildPdfBuffer(docDefinition);
        const safeFilename = `Resume.pdf`;
        console.log(`Generated PDF: ${safeFilename}`);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
        res.setHeader("Content-Length", pdfBuffer.length);
        res.send(pdfBuffer);
    } catch (err) {
        console.error("Error generating resume PDF:", err);
        res.status(500).json({ error: "Failed to generate resume PDF" });
    }
});

export default router;
