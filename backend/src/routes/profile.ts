import { Router } from "express";
import PdfPrinter from "pdfmake";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { store, makeResume } from "../agent/main"; 

const router = Router();

const fonts = {
    Roboto: {
        normal: "node_modules/pdfmake/examples/fonts/Roboto-Regular.ttf", 
        bold: "node_modules/pdfmake/examples/fonts/Roboto-Medium.ttf",
        italic: "node_modules/pdfmake/examples/fonts/Roboto-Italic.ttf",
        bolditalics: "node_modules/pdfmake/examples/fonts/Roboto-MediumItalic.ttf"
    },
};
