import { parse, isValid, isBefore } from "date-fns";

const DATE_FORMATS = [
  "yyyy-MM-dd",
  "dd/MM/yyyy",
  "dd-MM-yyyy",
  "dd.MM.yyyy",
  "d/M/yyyy",
  "d-M-yyyy",
  "dd MMMM yyyy",
  "dd MMM yyyy",
  "MMMM dd, yyyy",
  "MMM dd, yyyy",
];

export function parseFlexibleDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const cleanStr = dateStr.trim();

  // Try direct ISO date
  const isoDate = new Date(cleanStr);
  if (isValid(isoDate) && !isNaN(isoDate.getTime()) && cleanStr.length >= 8) {
    return isoDate;
  }

  for (const fmt of DATE_FORMATS) {
    try {
      const parsed = parse(cleanStr, fmt, new Date());
      if (isValid(parsed) && !isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch {
      // try next format
    }
  }

  return null;
}

export function isDateInPast(dateStr?: string, referenceDate: Date = new Date()): boolean {
  const parsed = parseFlexibleDate(dateStr);
  if (!parsed) return false;
  return isBefore(parsed, referenceDate);
}

export function isIssueAfterExpiry(issueStr?: string, expiryStr?: string): boolean {
  const issue = parseFlexibleDate(issueStr);
  const expiry = parseFlexibleDate(expiryStr);
  if (!issue || !expiry) return false;
  return isBefore(expiry, issue);
}

export function normalizeInstitutionName(name?: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\b(institute|institution|of|technology|engineering|science|sciences|college|and|the)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function areInstitutionNamesConflicting(name1?: string, name2?: string): boolean {
  if (!name1 || !name2) return false;
  const n1 = normalizeInstitutionName(name1);
  const n2 = normalizeInstitutionName(name2);
  if (!n1 || !n2) return false;
  // If normalized tokens have 0 overlap or are completely different
  return n1 !== n2 && !n1.includes(n2) && !n2.includes(n1);
}
