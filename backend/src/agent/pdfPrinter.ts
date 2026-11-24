import { createRequire } from "node:module";
import type { TDocumentDefinitions } from "pdfmake/interfaces";

const require = createRequire(import.meta.url);
const pdfPrinter = require("pdfmake/js/Printer.js").default  || require("pdfmake/js/Printer.js");

const robotoBase = "pdfmake/build/fonts/Roboto/";

const fonts = {
    Roboto: {
        normal: `${robotoBase}Roboto-Regular.ttf`, 
        bold: `${robotoBase}Roboto-Medium.ttf`, 
        italics: `${robotoBase}Roboto-Italic.ttf`,
        boldItalics: `${robotoBase}Roboto-MediumItalic.ttf`
    }
}

const printer = new pdfPrinter(fonts);

export async function buildPdfBuffer(docDefinition: TDocumentDefinitions): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
        try {
            const pdfDoc = await printer.createPdf(docDefinition);
            const chunks: Uint8Array[] = [];
            console.log(pdfDoc);

            pdfDoc.on("data", (chunk: Uint8Array) => chunks.push(chunk));
            pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
            pdfDoc.on("error", (err: Error) => reject(err));

            pdfDoc.end();
        } catch (error) {
            reject(error);
        }
    })
} 
