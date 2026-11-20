import { Router } from "express";
import { createRequire } from "node:module";
import type { TDocumentDefinitions } from "pdfmake/interfaces";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { store, makeResume } from "../agent/main"; 
import { db } from "../db/index";
import { resumes, users } from "../db/schema";
import { eq } from "drizzle-orm";

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
        const [resumeData] = await db.select().from(resumes).where(eq(resumes.title, `${userId}_AI_resume`)).limit(1);
        const summary = resumeData.rawText;
        const { email, phone, github, linkedin } = resumeData.structuredData?.contact || {};
        const contactParts = [
            email,
            github !== "Not provided" ? github : null,
            linkedin !== "Not provided" ? linkedin : null,
            phone !== "Not provided" ? phone : null
        ].filter(Boolean);
        const item = await store.get(["memories" + `${userId}`], "career_details");
        const uname = item?.value?.name || "Your Name";
        const jobTitle = item?.value?.jobTitle || "Your job title";
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
                    text: uname,
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
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=resume.pdf");
        pdfDoc.pipe(res);
        pdfDoc.end();
    } catch (error) {
        console.error("Error generating resume PDF:", error);
        res.status(500).json({ error: "Failed to generate resume PDF" });
    }
});

export default router;
