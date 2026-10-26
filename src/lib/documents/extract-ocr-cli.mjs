import fs from "fs";
import { createWorker } from "tesseract.js";

async function main() {
  const filePath = process.argv[2];
  if (!filePath || !fs.existsSync(filePath)) {
    process.stderr.write(JSON.stringify({ success: false, error: "Missing valid image file path" }));
    process.exit(1);
  }

  try {
    const worker = await createWorker("eng");
    const result = await worker.recognize(filePath);
    await worker.terminate();

    const ocrText = (result.data.text || "").trim();
    const confidence = (result.data.confidence || 0) / 100;

    process.stdout.write(JSON.stringify({ success: true, text: ocrText, confidence }));
  } catch (err) {
    process.stderr.write(JSON.stringify({ success: false, error: err.message }));
    process.exit(1);
  }
}

main();
