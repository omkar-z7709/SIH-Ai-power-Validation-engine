export interface ExtractionResult {
  text: string;
  confidence: number;
  isScanned: boolean;
  pageCount?: number;
  provider: string;
}

export interface IExtractionProvider {
  name: string;
  supports(mimeType: string, filename: string): boolean;
  extract(buffer: Buffer, mimeType: string, filename: string): Promise<ExtractionResult>;
}

// 1. Digital PDF extraction (Instant, 0-latency)
export class NativePdfExtractionProvider implements IExtractionProvider {
  name = "NativePdfParser";

  supports(mimeType: string, filename: string): boolean {
    return mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
  }

  async extract(buffer: Buffer, _mimeType: string, _filename: string): Promise<ExtractionResult> {
    try {
      const pdfParseModule: any = await import("pdf-parse");
      const pdfParse = pdfParseModule.default || pdfParseModule;
      const data = await pdfParse(buffer);
      const text = (data.text || "").trim();

      const isScanned = text.length < 50;
      return {
        text,
        confidence: isScanned ? 0.3 : 0.98,
        isScanned,
        pageCount: data.numpages,
        provider: this.name,
      };
    } catch (err) {
      console.warn("Native PDF text parsing failed:", err);
      return {
        text: "",
        confidence: 0,
        isScanned: true,
        provider: this.name,
      };
    }
  }
}

// 2. Google Gemini Vision OCR Provider (Multimodal AI OCR)
export class GeminiVisionExtractionProvider implements IExtractionProvider {
  name = "GeminiVisionOCR";

  supports(mimeType: string, filename: string): boolean {
    const isImage = mimeType.startsWith("image/") || filename.toLowerCase().match(/\.(png|jpe?g|webp|bmp)$/) !== null;
    const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GEMINI);
    return isImage && hasKey;
  }

  async extract(buffer: Buffer, mimeType: string, _filename: string): Promise<ExtractionResult> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI;
    if (!apiKey) {
      return { text: "", confidence: 0, isScanned: true, provider: this.name };
    }

    try {
      const base64Data = buffer.toString("base64");
      const validMime = mimeType && mimeType.startsWith("image/") ? mimeType : "image/png";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;

      const payload = {
        contents: [
          {
            parts: [
              { text: "Extract all legible text from this institutional document image verbatim. Return only the extracted text with no introductory pleasantries." },
              { inline_data: { mime_type: validMime, data: base64Data } }
            ]
          }
        ]
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const json = await res.json();
        const extracted = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return {
          text: extracted.trim(),
          confidence: 0.96,
          isScanned: true,
          provider: this.name,
        };
      }
    } catch (err) {
      console.warn("Gemini Vision OCR extraction failed, falling back:", err);
    }

    return { text: "", confidence: 0, isScanned: true, provider: this.name };
  }
}

// 3. Local Tesseract OCR Provider (100% Offline Fail-Safe)
export class ImageOcrExtractionProvider implements IExtractionProvider {
  name = "TesseractOcr";

  supports(mimeType: string, filename: string): boolean {
    return (
      mimeType.startsWith("image/") ||
      filename.toLowerCase().match(/\.(png|jpe?g|webp|bmp)$/) !== null
    );
  }

  async extract(buffer: Buffer, mimeType: string, _filename: string): Promise<ExtractionResult> {
    let worker: any = null;
    try {
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("eng");
      const res = await worker.recognize(buffer);

      return {
        text: (res.data.text || "").trim(),
        confidence: (res.data.confidence || 0) / 100,
        isScanned: true,
        provider: this.name,
      };
    } catch (err) {
      console.warn("Tesseract OCR execution failed:", err);
      return {
        text: "",
        confidence: 0,
        isScanned: true,
        provider: this.name,
      };
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (termErr) {
          console.warn("Error terminating worker:", termErr);
        }
      }
    }
  }
}

export class CompositeExtractionPipeline {
  private providers: IExtractionProvider[] = [];

  constructor() {
    this.providers = [
      new NativePdfExtractionProvider(),
      new GeminiVisionExtractionProvider(),
      new ImageOcrExtractionProvider(),
    ];
  }

  registerProvider(provider: IExtractionProvider): this {
    this.providers.unshift(provider);
    return this;
  }

  async process(buffer: Buffer, mimeType: string, filename: string): Promise<ExtractionResult> {
    for (const provider of this.providers) {
      if (provider.supports(mimeType, filename)) {
        const result = await provider.extract(buffer, mimeType, filename);
        if (result.text.length > 0) {
          return result;
        }
      }
    }

    return {
      text: "",
      confidence: 0,
      isScanned: false,
      provider: "None",
    };
  }
}

export const extractionPipeline = new CompositeExtractionPipeline();
