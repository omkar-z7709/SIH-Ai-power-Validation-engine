import { ApplicationRecord, Finding } from "@/types";

export interface GroupedFinding {
  id: string;
  ruleId: string;
  severity: string;
  title: string;
  evidence?: string;
  affectedDocuments: string[];
}

export interface ReportStats {
  total: number;
  tier1: number;
  tier2: number;
  tier3: number;
  tier4: number;
}

export interface GeminiNarrativeOutput {
  executiveSummary: string;
  verdict: "READY" | "NEEDS_REVIEW" | "NOT_READY";
  stats: ReportStats;
  findings: Array<{
    id: string;
    plainEnglish: string;
    whyItMatters: string;
    recommendedAction: string;
  }>;
  officerChecklist: string[];
}

export interface PreparedReportData {
  institution: string;
  referenceId: string;
  academicYear: string;
  applicationType: string;
  currentStatus: string;
  stats: ReportStats;
  groupedFindings: GroupedFinding[];
}

/**
 * Deduplicates individual findings into clean grouped items with affectedDocuments list
 */
export function groupApplicationFindings(app: ApplicationRecord): {
  groupedFindings: GroupedFinding[];
  stats: ReportStats;
} {
  const map = new Map<string, GroupedFinding>();

  const activeFindings = (app.allFindings || []).filter((f) => !f.dismissed);

  let tier1 = 0;
  let tier2 = 0;
  let tier3 = 0;
  let tier4 = 0;

  for (const f of activeFindings) {
    if (f.severity === "TIER_1_CRITICAL" || (f.severity as any) === "CRITICAL") tier1++;
    else if (f.severity === "TIER_2_HIGH" || (f.severity as any) === "HIGH") tier2++;
    else if (f.severity === "TIER_3_MEDIUM" || (f.severity as any) === "MEDIUM") tier3++;
    else tier4++;

    // Grouping key: ruleId + title
    const key = `${f.ruleId}::${f.title}`;
    const existing = map.get(key);
    const docName = f.documentFilename || (f.documentId ? `Document (${f.documentId})` : "General Application Form");

    if (existing) {
      if (!existing.affectedDocuments.includes(docName)) {
        existing.affectedDocuments.push(docName);
      }
    } else {
      map.set(key, {
        id: f.id,
        ruleId: f.ruleId,
        severity: f.severity,
        title: f.title,
        evidence: f.evidenceSnippet || f.explanation,
        affectedDocuments: [docName],
      });
    }
  }

  const groupedFindings = Array.from(map.values());
  const stats: ReportStats = {
    total: activeFindings.length,
    tier1,
    tier2,
    tier3,
    tier4,
  };

  return { groupedFindings, stats };
}

const SYSTEM_PROMPT = `You write the authoritative regulatory narrative for an AICTE scrutiny audit report reviewed by human inspection officers.
You will receive structured JSON input containing:
institution, referenceId, stats { total, tier1, tier2, tier3, tier4 }, and groupedFindings [ { id, severity, ruleId, title, evidence, affectedDocuments } ].

CRITICAL RULES:
1. Never change, add, remove, or re-tier any finding.
2. Never change any count in stats. Echo stats exactly as given in input.
3. Use only facts present in the input. If information is unknown, explicitly state so.
4. For each finding in the findings array:
   - Provide one clear plainEnglish sentence describing what is wrong.
   - Provide whyItMatters explaining the regulatory risk to AICTE approval.
   - Provide one concrete recommendedAction for the officer.
5. executiveSummary: 3-4 sentences, objective, administrative tone, no marketing jargon.
6. verdict:
   - Set to "NOT_READY" if tier1 > 0.
   - Set to "NEEDS_REVIEW" if tier2 > 0 or tier3 > 0.
   - Set to "READY" only if total === 0.
7. Return ONLY valid JSON matching the requested schema.`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    executiveSummary: { type: "STRING" },
    verdict: { type: "STRING", enum: ["READY", "NEEDS_REVIEW", "NOT_READY"] },
    stats: {
      type: "OBJECT",
      properties: {
        total: { type: "INTEGER" },
        tier1: { type: "INTEGER" },
        tier2: { type: "INTEGER" },
        tier3: { type: "INTEGER" },
        tier4: { type: "INTEGER" },
      },
      required: ["total", "tier1", "tier2", "tier3", "tier4"],
    },
    findings: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          plainEnglish: { type: "STRING" },
          whyItMatters: { type: "STRING" },
          recommendedAction: { type: "STRING" },
        },
        required: ["id", "plainEnglish", "whyItMatters", "recommendedAction"],
      },
    },
    officerChecklist: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },
  required: ["executiveSummary", "verdict", "stats", "findings", "officerChecklist"],
};

export async function generateGeminiNarrative(
  input: PreparedReportData
): Promise<{ narrative: GeminiNarrativeOutput; provenance: { model: string; mode: "live" | "fallback" } }> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_REPORT_MODEL || "gemini-3.5-flash-lite";

  if (!apiKey) {
    return {
      narrative: createFallbackNarrative(input),
      provenance: { model: "DeterministicRulesFallback", mode: "fallback" },
    };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify(input) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: SCHEMA,
          temperature: 0.1,
        },
      }),
      signal: AbortSignal.timeout(9000),
    });

    if (!res.ok) {
      console.warn(`Gemini API returned ${res.status}, falling back to deterministic narrative.`);
      return {
        narrative: createFallbackNarrative(input),
        provenance: { model, mode: "fallback" },
      };
    }

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("Empty candidate content from Gemini");

    const parsed: GeminiNarrativeOutput = JSON.parse(rawText);

    // Validate: Stats echo must match exact code-computed counts
    if (
      parsed.stats.total !== input.stats.total ||
      parsed.stats.tier1 !== input.stats.tier1 ||
      parsed.stats.tier2 !== input.stats.tier2 ||
      parsed.stats.tier3 !== input.stats.tier3 ||
      parsed.stats.tier4 !== input.stats.tier4
    ) {
      console.warn("Gemini stats echo mismatch, enforcing code-computed truth.");
      parsed.stats = { ...input.stats };
    }

    // Ensure all grouped findings have an explanation entry
    const findingMap = new Map(parsed.findings.map((f) => [f.id, f]));
    for (const gf of input.groupedFindings) {
      if (!findingMap.has(gf.id)) {
        parsed.findings.push({
          id: gf.id,
          plainEnglish: `${gf.title}: Identified in ${gf.affectedDocuments.join(", ")}.`,
          whyItMatters: `Regulatory compliance requires addressing this statutory violation.`,
          recommendedAction: `Inspect submitted documents and verify credentials with the issuing authority.`,
        });
      }
    }

    return {
      narrative: parsed,
      provenance: { model, mode: "live" },
    };
  } catch (err: any) {
    console.warn("Gemini narrative synthesis error, using fallback narrative:", err.message);
    return {
      narrative: createFallbackNarrative(input),
      provenance: { model, mode: "fallback" },
    };
  }
}

function createFallbackNarrative(input: PreparedReportData): GeminiNarrativeOutput {
  const isClean = input.stats.total === 0;
  const hasTier1 = input.stats.tier1 > 0;

  const verdict = isClean ? "READY" : hasTier1 ? "NOT_READY" : "NEEDS_REVIEW";

  const executiveSummary = isClean
    ? `Preliminary scrutiny for ${input.institution} (${input.referenceId}) shows no statutory violations. All submitted documents and institutional credentials align with AICTE norms for the ${input.academicYear} academic cycle.`
    : `Scrutiny analysis for ${input.institution} (${input.referenceId}) identified ${input.stats.total} statutory discrepancy item(s), including ${input.stats.tier1} Tier-1 critical violation(s). Physical verification or documented justification is required prior to approval determination.`;

  return {
    executiveSummary,
    verdict,
    stats: { ...input.stats },
    findings: input.groupedFindings.map((gf) => ({
      id: gf.id,
      plainEnglish: `${gf.title}. Affected documentation: ${gf.affectedDocuments.join(", ")}.`,
      whyItMatters: `Statutory guidelines under AICTE Approval Process Handbook (APH) mandate resolving this issue.`,
      recommendedAction: `Inspect the uploaded certificate and obtain verified confirmation from the competent authority.`,
    })),
    officerChecklist: [
      "Verify cross-document institutional naming consistency.",
      "Check accreditation and university affiliation validity dates.",
      "Review land deed and continuous parcel survey coordinates.",
      "Record official decision with justification in scrutiny audit trail.",
    ],
  };
}
