import { describe, it, expect } from "vitest";
import fs from "fs";
import { processUploadedFile } from "../src/lib/documents/document-processor";

describe("Test processUploadedFile with real storage sample", () => {
  it("processes Doc 1 and extracts fields correctly", async () => {
    const buf = fs.readFileSync("storage/documents/1793023401511-36916b046e37804b.pdf");
    const doc = await processUploadedFile(buf, "A1_Application_Form.pdf", "application/pdf", "app_test");

    console.log("ExtractionStatus:", doc.extractionStatus);
    console.log("ExtractedText length:", doc.extractedText.length);
    console.log("ExtractedFields:", doc.extractedFields);

    expect(doc.extractionStatus).toBe("SUCCESS");
    expect(doc.extractedText.length).toBeGreaterThan(50);
    expect(doc.extractedFields.institutionName).toBe("Apex Institute of Advanced Technology");
  });
});
