import { Router } from "express";
import PdfPrinter from "pdfmake";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { store } from "../agent/main"; 
