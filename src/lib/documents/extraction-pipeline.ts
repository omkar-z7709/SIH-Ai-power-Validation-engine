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
      let extractedText = "";
      let pageCount = 1;

      // Extract digital text using isolated helper to prevent Next.js Turbopack from breaking worker chunk resolution
      try {
        const { spawnSync } = await import("child_process");
        const path = await import("path");
        const fs = await import("fs/promises");
        const os = await import("os");

        const tempFile = path.join(os.tmpdir(), `aicte_parse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.pdf`);
        await fs.writeFile(tempFile, buffer);

        const cliScript = path.resolve(process.cwd(), "src", "lib", "documents", "extract-pdf-cli.mjs");
        const res = spawnSync(process.execPath, [cliScript, tempFile], { encoding: "utf8" });

        await fs.unlink(tempFile).catch(() => {});

        if (res.status === 0 && res.stdout) {
          const parsed = JSON.parse(res.stdout);
          if (parsed.success) {
            extractedText = parsed.text || "";
            pageCount = parsed.numPages || 1;
          }
        }
      } catch (cliErr) {
        console.warn("CLI PDF extraction error:", cliErr);
      }

      const text = extractedText.trim();
      const isScanned = text.length < 50;

      // If text extraction yielded fewer than 50 chars, check for embedded scanned images (JPEGs)
      if (isScanned) {
        const start = buffer.indexOf(Buffer.from([0xFF, 0xD8, 0xFF]));
        const end = buffer.indexOf(Buffer.from([0xFF, 0xD9]));
        if (start !== -1 && end !== -1 && end > start) {
          const embeddedJpg = buffer.subarray(start, end + 2);

          // Priority 1: Try ultra-fast Qwen Vision OCR on embedded scan
          const openRouterKey = process.env.OPENROUTER_API_KEY || process.env.OCR;
          if (openRouterKey) {
            try {
              const qwenOcr = new OpenRouterVisionExtractionProvider();
              const qwenResult = await qwenOcr.extract(embeddedJpg, "image/jpeg", "embedded_scan.jpg");
              if (qwenResult.text.length > 0) {
                return {
                  text: qwenResult.text,
                  confidence: 0.99,
                  isScanned: true,
                  pageCount,
                  provider: "QwenVisionOCR",
                };
              }
            } catch (qwenErr) {
              console.warn("Qwen Vision OCR on embedded image failed, falling back to local Tesseract:", qwenErr);
            }
          }

          // Priority 2: Local Tesseract OCR fail-safe
          try {
            const { spawnSync } = await import("child_process");
            const path = await import("path");
            const fs = await import("fs/promises");
            const os = await import("os");

            const tempImg = path.join(os.tmpdir(), `aicte_scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`);
            await fs.writeFile(tempImg, embeddedJpg);

            const ocrScript = path.resolve(process.cwd(), "src", "lib", "documents", "extract-ocr-cli.mjs");
            const ocrRes = spawnSync(process.execPath, [ocrScript, tempImg], { encoding: "utf8", timeout: 30000 });

            await fs.unlink(tempImg).catch(() => {});

            if (ocrRes.status === 0 && ocrRes.stdout) {
              const parsed = JSON.parse(ocrRes.stdout);
              if (parsed.success && parsed.text) {
                return {
                  text: parsed.text,
                  confidence: parsed.confidence || 0.85,
                  isScanned: true,
                  pageCount,
                  provider: "ScannedPdfOcrParser",
                };
              }
            }
          } catch (ocrErr) {
            console.warn("OCR on embedded PDF image failed:", ocrErr);
          }
        }
      }

      return {
        text,
        confidence: isScanned ? 0.3 : 0.98,
        isScanned,
        pageCount,
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

// 2. Google Cloud Vision OCR Provider (Primary Production OCR)
export class CloudVisionExtractionProvider implements IExtractionProvider {
  name = "CloudVisionOCR";

  supports(mimeType: string, filename: string): boolean {
    const isImage = mimeType.startsWith("image/") || filename.toLowerCase().match(/\.(png|jpe?g|webp|bmp)$/) !== null;
    const hasKey = Boolean(
      process.env.GOOGLE_CLOUD_VISION_API_KEY ||
      process.env.CLOUD_VISION_API_KEY ||
      process.env.CLOUDEVISION_API_KEY ||
      process.env.VISION_API_KEY ||
      process.env.VISION
    );
    return isImage && hasKey;
  }

  async extract(buffer: Buffer, mimeType: string, _filename: string): Promise<ExtractionResult> {
    const apiKey =
      process.env.GOOGLE_CLOUD_VISION_API_KEY ||
      process.env.CLOUD_VISION_API_KEY ||
      process.env.CLOUDEVISION_API_KEY ||
      process.env.VISION_API_KEY ||
      process.env.VISION;
    if (!apiKey) {
      return { text: "", confidence: 0, isScanned: true, provider: this.name };
    }

    try {
      const base64Data = buffer.toString("base64");
      const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
      const payload = {
        requests: [
          {
            image: { content: base64Data },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          },
        ],
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const json = await res.json();
        const fullText = json.responses?.[0]?.fullTextAnnotation?.text || "";
        return {
          text: fullText.trim(),
          confidence: 0.99,
          isScanned: true,
          provider: this.name,
        };
      }
    } catch (err) {
      console.warn("Cloud Vision OCR failed, continuing down extraction pipeline:", err);
    }

    return { text: "", confidence: 0, isScanned: true, provider: this.name };
  }
}

// 3. OpenRouter Qwen / Nemotron Vision OCR Provider (Ultra-Fast SOTA Cloud Vision)
export class OpenRouterVisionExtractionProvider implements IExtractionProvider {
  name = "OpenRouterVisionOCR";

  supports(mimeType: string, filename: string): boolean {
    const isImage = mimeType.startsWith("image/") || filename.toLowerCase().match(/\.(png|jpe?g|webp|bmp)$/) !== null;
    const hasKey = Boolean(process.env.OPENROUTER_API_KEY || process.env.OCR);
    return isImage && hasKey;
  }

  async extract(buffer: Buffer, mimeType: string, _filename: string): Promise<ExtractionResult> {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OCR;
    if (!apiKey) {
      return { text: "", confidence: 0, isScanned: true, provider: this.name };
    }

    try {
      const validMime = mimeType && mimeType.startsWith("image/") ? mimeType : "image/jpeg";
      const base64Data = buffer.toString("base64");
      const dataUri = `data:${validMime};base64,${base64Data}`;

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://aicte.gov.in",
          "X-Title": "AICTE Document Checker",
        },
        body: JSON.stringify({
          model: "qwen/qwen3-vl-8b-instruct",
          max_tokens: 1500,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Extract all legible text from this institutional document image verbatim. Return only the extracted text with no commentary." },
                { type: "image_url", image_url: { url: dataUri } },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        const json = await res.json();
        const extracted = (json.choices?.[0]?.message?.content || "").trim();
        if (extracted.length > 0) {
          return {
            text: extracted,
            confidence: 0.99,
            isScanned: true,
            provider: "QwenVisionOCR",
          };
        }
      } else {
        console.warn("OpenRouter Vision OCR returned non-ok status:", res.status);
      }
    } catch (err) {
      console.warn("OpenRouter Vision OCR failed, falling back:", err);
    }

    return { text: "", confidence: 0, isScanned: true, provider: this.name };
  }
}

// 4. Google Gemini Vision OCR Provider (Multimodal AI OCR Fallback)
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
        signal: AbortSignal.timeout(15000),
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
    try {
      const { spawnSync } = await import("child_process");
      const path = await import("path");
      const fs = await import("fs/promises");
      const os = await import("os");

      const tempImg = path.join(os.tmpdir(), `aicte_img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.png`);
      await fs.writeFile(tempImg, buffer);

      const ocrScript = path.resolve(process.cwd(), "src", "lib", "documents", "extract-ocr-cli.mjs");
      const ocrRes = spawnSync(process.execPath, [ocrScript, tempImg], { encoding: "utf8", timeout: 30000 });

      await fs.unlink(tempImg).catch(() => {});

      if (ocrRes.status === 0 && ocrRes.stdout) {
        const parsed = JSON.parse(ocrRes.stdout);
        if (parsed.success && parsed.text) {
          return {
            text: parsed.text,
            confidence: parsed.confidence || 0.85,
            isScanned: true,
            provider: this.name,
          };
        }
      }
    } catch (err) {
      console.warn("Local OCR worker extraction failed:", err);
    }

    return {
      text: "",
      confidence: 0,
      isScanned: true,
      provider: this.name,
    };
  }
}

export class CompositeExtractionPipeline {
  private providers: IExtractionProvider[] = [];

  constructor() {
    this.providers = [
      new NativePdfExtractionProvider(),
      new OpenRouterVisionExtractionProvider(),
      new CloudVisionExtractionProvider(),
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
