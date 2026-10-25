import { z } from "zod";
import { DecisionStatus, Finding } from "@/types";

export interface JevDecisionRequest {
  institutionName: string;
  referenceId: string;
  documentCount: number;
  deterministicFindings: Finding[];
  extractedSummary: Record<string, unknown>;
}

export const JevDecisionResponseSchema = z.object({
  usedModel: z.string(),
  proposedStatus: z.enum([
    "PASSED_INITIAL_CHECKS",
    "INCOMPLETE",
    "NEEDS_REVIEW",
    "VERIFICATION_REQUIRED",
    "VERIFICATION_FAILED",
    "UNABLE_TO_PROCESS",
    "AWAITING_HUMAN_REVIEW",
  ]),
  reviewPriority: z.enum(["URGENT", "STANDARD", "LOW"]),
  recommendedNextStep: z.string(),
  advisoryNotes: z.string(),
  timestamp: z.string(),
  isRuleBasedFallback: z.boolean(),
  calibrationConfidence: z.number().min(0).max(1).optional(),
});

export type JevDecisionResponse = z.infer<typeof JevDecisionResponseSchema>;

export class JevDecisionAdapter {
  private openRouterKey?: string;
  private typesafeKey?: string;
  private apiEndpoint: string;

  constructor() {
    this.openRouterKey = process.env.OPENROUTER_API_KEY;
    this.typesafeKey = process.env.TYPESAFE_API_KEY || process.env.JEV_API_KEY;
    this.apiEndpoint = process.env.JEV_API_ENDPOINT || "https://api.typesafe.ai/v1/decide";
  }

  isAvailable(): boolean {
    return Boolean(
      (this.openRouterKey && this.openRouterKey.startsWith("sk-or-")) ||
      (this.typesafeKey && this.typesafeKey.trim().length > 0)
    );
  }

  async getDecisionSupport(request: JevDecisionRequest): Promise<JevDecisionResponse> {
    // 1. If OpenRouter Key is configured, use OpenRouter AI decision model
    if (this.openRouterKey && this.openRouterKey.startsWith("sk-or-")) {
      try {
        const prompt = `You are a strict institutional scrutiny decision system for AICTE.
Analyze the following institution data and risk-categorized findings:
Institution: "${request.institutionName}"
Reference ID: "${request.referenceId}"
Document Count: ${request.documentCount}
Findings: ${JSON.stringify(request.deterministicFindings.map((f) => ({ rule: f.ruleId, severity: f.severity, title: f.title })))}

The system classifies risk into 4 explicit tiers:
- TIER_1_CRITICAL: Entity / Signatory identity divergence (e.g. Dr S. Rao vs Dr Suresh Rao, or College vs Polytechnic) or Chronological Inversion.
- TIER_2_HIGH: Mandatory document missing, expired certificate, or different entity.
- TIER_3_MEDIUM: Ambiguous reference numbers or registry verification required.
- TIER_4_COSMETIC: Accepted abbreviations (Inst. vs Institute) or casing.

Return ONLY a valid JSON object matching this structure:
{
  "proposedStatus": "PASSED_INITIAL_CHECKS" | "INCOMPLETE" | "NEEDS_REVIEW" | "VERIFICATION_REQUIRED" | "UNABLE_TO_PROCESS",
  "reviewPriority": "URGENT" | "STANDARD" | "LOW",
  "recommendedNextStep": "string explanation of the exact next step for the human officer",
  "confidence": 0.95
}`;

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.openRouterKey}`,
          },
          body: JSON.stringify({
            model: "recursive/flint-v1.0:free",
            messages: [{ role: "user", content: prompt }],
          }),
          signal: AbortSignal.timeout(6000),
        });

        if (res.ok) {
          const json = await res.json();
          const content = json.choices?.[0]?.message?.content || "";
          const match = content.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            return JevDecisionResponseSchema.parse({
              usedModel: "OpenRouter / flint-v1.0 (Jev Decision Mode)",
              proposedStatus: parsed.proposedStatus || "NEEDS_REVIEW",
              reviewPriority: parsed.reviewPriority || "STANDARD",
              recommendedNextStep: parsed.recommendedNextStep || "Review flagged findings.",
              advisoryNotes: "Real-time decision support from OpenRouter AI proxy.",
              timestamp: new Date().toISOString(),
              isRuleBasedFallback: false,
              calibrationConfidence: parsed.confidence || 0.95,
            });
          }
        }
      } catch (err) {
        console.warn("OpenRouter API query failed, reverting to local rules engine:", err);
      }
    }

    // 2. If TypeSafe Jev API is configured
    if (this.typesafeKey && !this.typesafeKey.startsWith("sk-or-")) {
      try {
        const payload = {
          model: "jev-latest",
          state: {
            institution: request.institutionName,
            referenceId: request.referenceId,
            documentCount: request.documentCount,
            activeFindings: request.deterministicFindings.map((f) => ({
              id: f.id,
              rule: f.ruleId,
              severity: f.severity,
              title: f.title,
            })),
          },
          questions: [
            { id: "reviewPriority", type: "choice", choices: ["URGENT", "STANDARD", "LOW"] },
            { id: "proposedStatus", type: "choice", choices: ["PASSED_INITIAL_CHECKS", "INCOMPLETE", "NEEDS_REVIEW", "VERIFICATION_REQUIRED", "UNABLE_TO_PROCESS"] },
            { id: "recommendedNextStep", type: "text" },
          ],
        };

        const res = await fetch(this.apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.typesafeKey}`,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(4000),
        });

        if (res.ok) {
          const rawJson = await res.json();
          return JevDecisionResponseSchema.parse({
            usedModel: "TypeSafe Jev System One",
            proposedStatus: rawJson.proposedStatus || "NEEDS_REVIEW",
            reviewPriority: rawJson.reviewPriority || "STANDARD",
            recommendedNextStep: rawJson.recommendedNextStep || "Review flagged deterministic findings.",
            advisoryNotes: "Calibrated decision support delivered by TypeSafe Jev model.",
            timestamp: new Date().toISOString(),
            isRuleBasedFallback: false,
            calibrationConfidence: typeof rawJson.confidence === "number" ? rawJson.confidence : 0.92,
          });
        }
      } catch (err) {
        console.warn("Jev API request failed, falling back to deterministic engine:", err);
      }
    }

    // 3. Deterministic Local Fallback
    return this.ruleBasedFallbackDecision(request);
  }

  private ruleBasedFallbackDecision(request: JevDecisionRequest): JevDecisionResponse {
    const findings = request.deterministicFindings;
    const hasCritical = findings.some(
      (f) => !f.dismissed && (f.severity === "TIER_1_CRITICAL" || f.severity === "CRITICAL")
    );
    const hasHigh = findings.some(
      (f) => !f.dismissed && (f.severity === "TIER_2_HIGH" || f.severity === "HIGH")
    );
    const hasUnreadable = findings.some(
      (f) => !f.dismissed && f.ruleId === "RULE_EXTRACTION_FAILURE"
    );
    const hasMissingDocs = findings.some(
      (f) => !f.dismissed && f.ruleId === "RULE_REQ_DOC_MISSING"
    );

    let priority: "URGENT" | "STANDARD" | "LOW" = "LOW";
    let status: DecisionStatus = "PASSED_INITIAL_CHECKS";
    let nextStep = "Forward application to authorized scrutiny officer for standard approval.";

    if (hasCritical || hasUnreadable) {
      priority = "URGENT";
      status = hasUnreadable ? "UNABLE_TO_PROCESS" : "NEEDS_REVIEW";
      nextStep = "Priority investigation required: potential signatory identity divergence or date order violation.";
    } else if (hasHigh || hasMissingDocs) {
      priority = "STANDARD";
      status = hasMissingDocs ? "INCOMPLETE" : "NEEDS_REVIEW";
      nextStep = "Request clarifying documentation or verify data discrepancy with applicant.";
    } else if (findings.some((f) => !f.dismissed && f.ruleId === "RULE_VERIFICATION_REQUIRED")) {
      priority = "STANDARD";
      status = "VERIFICATION_REQUIRED";
      nextStep = "Verify certificate registration numbers against statutory university/NAAC records.";
    }

    return {
      usedModel: "Deterministic Rules Engine (Jev Fallback Mode)",
      proposedStatus: status,
      reviewPriority: priority,
      recommendedNextStep: nextStep,
      advisoryNotes: "Decision rendered by local deterministic rules engine.",
      timestamp: new Date().toISOString(),
      isRuleBasedFallback: true,
      calibrationConfidence: 1.0,
    };
  }
}

export const jevAdapter = new JevDecisionAdapter();
