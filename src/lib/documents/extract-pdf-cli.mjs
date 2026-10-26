import { pathToFileURL } from "url";
import path from "path";
import fs from "fs";

async function main() {
  const filePath = process.argv[2];
  if (!filePath || !fs.existsSync(filePath)) {
    process.stderr.write(JSON.stringify({ success: false, error: "Missing valid file path" }));
    process.exit(1);
  }

  try {
    const fullWorkerPath = path.resolve(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs");
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(fullWorkerPath).href;

    const buf = fs.readFileSync(filePath);
    const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    const doc = await pdfjs.getDocument({
      data: uint8,
      disableFontFace: true,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;

    const parts = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => (item && typeof item.str === "string" ? item.str : ""))
        .join(" ");
      parts.push(pageText);
    }

    const fullText = parts.join("\n\n").trim();
    process.stdout.write(JSON.stringify({ success: true, text: fullText, numPages: doc.numPages }));
  } catch (err) {
    process.stderr.write(JSON.stringify({ success: false, error: err.message }));
    process.exit(1);
  }
}

main();
