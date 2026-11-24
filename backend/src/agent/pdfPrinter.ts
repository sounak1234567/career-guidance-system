import { createRequire } from "node:module";
import type { TDocumentDefinitions } from "pdfmake/interfaces";

const require = createRequire(import.meta.url);
const pdfmake = require("pdfmake");
const vfsFonts = require("pdfmake/build/vfs_fonts");

const vfs = vfsFonts.pdfmake ? vfsFonts.pdfmake.vfs : vfsFonts;
if(typeof pdfmake.addVirtualFileSystem === "function") {
    pdfmake.addVirtualFileSystem(vfs);
}
else {
    pdfmake.vfs = vfs;
}

const fonts = {
    Roboto: {
        normal: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf',
    bold:   'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf',
    italics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Italic.ttf',
    bolditalics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-MediumItalic.ttf'
    },
};

if(pdfmake.addFonts === "function") {
    pdfmake.addFonts(fonts);
}
else{
    pdfmake.fonts = fonts;
}

export async function buildPdfBuffer(docDefinitions: TDocumentDefinitions) {
    const pdf = pdfmake.createPdf(docDefinitions);
    const result = await pdf.getBuffer();
    return Buffer.isBuffer(result) ? result : Buffer.from(result);
}
