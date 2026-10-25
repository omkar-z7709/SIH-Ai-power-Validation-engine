import { ApplicationRecord, DocumentRecord, Finding, DecisionStatus } from "@/types";

export interface RuleExecutionContext {
  application: ApplicationRecord;
  documents: DocumentRecord[];
  referenceDate: Date;
}

export interface IRule {
  id: string;
  title: string;
  description: string;
  evaluate(context: RuleExecutionContext): Finding[];
}

export class RuleRegistry {
  private rules: Map<string, IRule> = new Map();

  register(rule: IRule): this {
    if (this.rules.has(rule.id)) {
      console.warn(`Rule with ID '${rule.id}' is already registered. Overwriting.`);
    }
    this.rules.set(rule.id, rule);
    return this;
  }

  unregister(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  getRules(): IRule[] {
    return Array.from(this.rules.values());
  }

  evaluateAll(context: RuleExecutionContext): {
    findings: Finding[];
    computedStatus: DecisionStatus;
  } {
    const findings: Finding[] = [];

    for (const rule of this.rules.values()) {
      try {
        const ruleFindings = rule.evaluate(context);
        findings.push(...ruleFindings);
      } catch (err) {
        console.error(`Error executing rule ${rule.id}:`, err);
        findings.push({
          id: `f_rule_err_${rule.id}_${Date.now()}`,
          ruleId: rule.id,
          title: `Rule Evaluation Error: ${rule.title}`,
          severity: "MEDIUM",
          explanation: `System encountered an unexpected error while evaluating rule ${rule.id}.`,
          suggestedAction: "Notify system administrator to check server rule diagnostics.",
          source: "DETERMINISTIC",
        });
      }
    }

    // Build lookup of previous findings to preserve reviewer dismissals
    const existingDismissals = new Map<string, { dismissed: boolean; dismissalReason?: string }>();
    if (context.application?.allFindings) {
      for (const ef of context.application.allFindings) {
        if (ef.dismissed) {
          const key = ef.documentId ? `${ef.ruleId}_${ef.documentId}` : ef.id;
          existingDismissals.set(key, { dismissed: true, dismissalReason: ef.dismissalReason });
        }
      }
    }

    // Preserve dismissal state on newly evaluated findings
    for (const f of findings) {
      const key = f.documentId ? `${f.ruleId}_${f.documentId}` : f.id;
      if (existingDismissals.has(key)) {
        const d = existingDismissals.get(key)!;
        f.dismissed = d.dismissed;
        f.dismissalReason = d.dismissalReason;
      }
    }

    // Attach document-scoped findings
    for (const doc of context.documents) {
      doc.findings = findings.filter((f) => f.documentId === doc.id);
    }

    // Compute status via strict state priority
    let computedStatus: DecisionStatus = "PASSED_INITIAL_CHECKS";

    const hasExtractionFailures = findings.some(
      (f) => !f.dismissed && f.ruleId === "RULE_EXTRACTION_FAILURE"
    );
    const hasMissingDocs = findings.some(
      (f) => !f.dismissed && f.ruleId === "RULE_REQ_DOC_MISSING"
    );
    const hasCriticalOrHigh = findings.some(
      (f) =>
        !f.dismissed &&
        (f.severity === "TIER_1_CRITICAL" ||
          f.severity === "TIER_2_HIGH" ||
          f.severity === "CRITICAL" ||
          f.severity === "HIGH")
    );
    const hasVerificationRequired = findings.some(
      (f) => !f.dismissed && f.ruleId === "RULE_VERIFICATION_REQUIRED"
    );

    if (hasExtractionFailures) {
      computedStatus = "UNABLE_TO_PROCESS";
    } else if (hasMissingDocs) {
      computedStatus = "INCOMPLETE";
    } else if (hasCriticalOrHigh) {
      computedStatus = "NEEDS_REVIEW";
    } else if (hasVerificationRequired) {
      computedStatus = "VERIFICATION_REQUIRED";
    } else {
      computedStatus = "PASSED_INITIAL_CHECKS";
    }

    return { findings, computedStatus };
  }
}
