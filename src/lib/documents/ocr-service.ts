export interface IOcrService {
  recognize(imageBuffer: Buffer, mimeType: string): Promise<{ text: string; confidence: number }>;
}

export class TesseractOcrService implements IOcrService {
  async recognize(imageBuffer: Buffer, _mimeType: string): Promise<{ text: string; confidence: number }> {
    try {
      // Dynamic import to prevent bundler SSR issues in Next.js
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const ret = await worker.recognize(imageBuffer);
      await worker.terminate();

      return {
        text: ret.data.text || "",
        confidence: (ret.data.confidence || 0) / 100,
      };
    } catch (err) {
      console.error("Tesseract OCR execution error:", err);
      return {
        text: "",
        confidence: 0,
      };
    }
  }
}

export class FallbackOcrService implements IOcrService {
  async recognize(_imageBuffer: Buffer, _mimeType: string): Promise<{ text: string; confidence: number }> {
    return {
      text: "[OCR Fallback: Image received for optical character recognition]",
      confidence: 0.8,
    };
  }
}

export const ocrService: IOcrService = new TesseractOcrService();
