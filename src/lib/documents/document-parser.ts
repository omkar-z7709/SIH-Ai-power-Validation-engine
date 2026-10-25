import { DocumentCategory, ExtractedFields } from "@/types";

export interface ClassificationResult {
  category: DocumentCategory;
  confidence: number;
}

export function classifyDocument(filename: string, text: string): ClassificationResult {
  const lowerText = text.toLowerCase();
  const lowerName = filename.toLowerCase();

  // Application Form signals
  if (
    lowerText.includes("application form") ||
    lowerText.includes("aicte application") ||
    lowerText.includes("approval process handbook") ||
    lowerName.includes("application") ||
    lowerName.includes("form")
  ) {
    return { category: "APPLICATION_FORM", confidence: 0.95 };
  }

  // Accreditation Certificate (NAAC / NBA)
  if (
    lowerText.includes("national assessment and accreditation council") ||
    lowerText.includes("naac") ||
    lowerText.includes("national board of accreditation") ||
    lowerText.includes("nba") ||
    lowerText.includes("accreditation certificate") ||
    lowerName.includes("naac") ||
    lowerName.includes("accreditation")
  ) {
    return { category: "ACCREDITATION_CERTIFICATE", confidence: 0.95 };
  }

  // Affiliation Certificate (University)
  if (
    lowerText.includes("affiliation certificate") ||
    lowerText.includes("grant of affiliation") ||
    lowerText.includes("affiliated to") ||
    lowerText.includes("continuation of affiliation") ||
    lowerName.includes("affiliation")
  ) {
    return { category: "AFFILIATION_CERTIFICATE", confidence: 0.9 };
  }

  // Undertaking / Affidavit
  if (
    lowerText.includes("undertaking") ||
    lowerText.includes("affidavit") ||
    lowerText.includes("solemnly affirm") ||
    lowerText.includes("deponent") ||
    lowerName.includes("undertaking") ||
    lowerName.includes("affidavit")
  ) {
    return { category: "UNDERTAKING", confidence: 0.95 };
  }

  // Land / Building Document
  if (
    lowerText.includes("land registration") ||
    lowerText.includes("building completion certificate") ||
    lowerText.includes("occupancy certificate") ||
    lowerText.includes("sale deed") ||
    lowerName.includes("land") ||
    lowerName.includes("building")
  ) {
    return { category: "LAND_BUILDING_DOCUMENT", confidence: 0.9 };
  }

  return { category: "OTHER_SUPPORTING", confidence: 0.5 };
}

export function extractFieldsFromText(text: string, category: DocumentCategory): ExtractedFields {
  const fields: ExtractedFields = {};

  // 1. Institution Name patterns
  const instPatterns = [
    /(?:institution|college|institute|university)\s*name\s*[:\-]\s*([^\n\r,]+)/i,
    /(?:name of the institute|name of institution)\s*[:\-]\s*([^\n\r,]+)/i,
    /this is to certify that\s+([A-Z][A-Za-z0-9\s&.,'-]{5,60})/i,
    /(?:granted to|awarded to|in respect of)\s+([A-Z][A-Za-z0-9\s&.,'-]{5,60})/i,
    /institute\s*[:\-]\s*([^\n\r,]+)/i,
  ];
  for (const pat of instPatterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      fields.institutionName = match[1].trim().replace(/\s+/g, " ");
      break;
    }
  }

  // 2. Application / Reference Number
  const appPatterns = [
    /(?:application\s*(?:id|no|number|ref)|reference\s*(?:no|number))\s*[:\-#]\s*([A-Za-z0-9\-_/]{4,30})/i,
    /(?:aicte\s*id|permanent\s*institute\s*id)\s*[:\-]\s*([A-Za-z0-9\-_/]{4,25})/i,
    /(?:app\s*id)\s*[:\-]\s*([A-Za-z0-9\-_/]{4,25})/i,
  ];
  for (const pat of appPatterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      fields.applicationNumber = match[1].trim();
      break;
    }
  }

  // 3. Certificate Number
  const certPatterns = [
    /(?:certificate\s*(?:no|number)|cert\s*no)\s*[:\-#]\s*([A-Za-z0-9\-_/]{4,35})/i,
    /(?:accreditation\s*no|file\s*no|ref\s*no)\s*[:\-#]\s*([A-Za-z0-9\-_/]{4,35})/i,
    /(?:order\s*no)\s*[:\-#]\s*([A-Za-z0-9\-_/]{4,35})/i,
  ];
  for (const pat of certPatterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      fields.certificateNumber = match[1].trim();
      break;
    }
  }

  // 4. Issue Date
  const issuePatterns = [
    /(?:issue\s*date|date\s*of\s*issue|issued\s*on|dated)\s*[:\-]\s*(\d{1,2}[-/.](?:\d{1,2}|[A-Za-z]{3,9})[-/.]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
  ];
  for (const pat of issuePatterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      fields.issueDate = match[1].trim();
      break;
    }
  }

  // 5. Expiry Date / Valid Until
  const expiryPatterns = [
    /(?:expiry\s*date|valid\s*until|valid\s*thru|valid\s*up\s*to|validity\s*period\s*up\s*to|valid\s*till)\s*[:\-]\s*(\d{1,2}[-/.](?:\d{1,2}|[A-Za-z]{3,9})[-/.]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
  ];
  for (const pat of expiryPatterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      fields.expiryDate = match[1].trim();
      break;
    }
  }

  // 6. Issuing Authority
  const authPatterns = [
    /(?:issuing\s*authority|issued\s*by|affiliated\s*with|affiliated\s*to)\s*[:\-]\s*([^\n\r,]+)/i,
    /(National Assessment and Accreditation Council|NAAC)/i,
    /(National Board of Accreditation|NBA)/i,
    /(All India Council for Technical Education|AICTE)/i,
    /(Anna University|Dr. A.P.J. Abdul Kalam Technical University|VTU|JNTU|Mumbai University)/i,
  ];
  for (const pat of authPatterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      fields.issuingAuthority = match[1].trim();
      break;
    }
  }

  // 7. Address
  const addrMatch = text.match(/(?:address|location|campus)\s*[:\-]\s*([^\n\r]+(?:,\s*[^\n\r]+){1,3})/i);
  if (addrMatch && addrMatch[1]) {
    fields.institutionAddress = addrMatch[1].trim();
  }

  // 8. Accreditation Grade
  const gradeMatch = text.match(/(?:grade|accredited\s*with)\s*[:\-]?\s*([A-Za-z]{1,2}\+{0,2})/i);
  if (gradeMatch && gradeMatch[1]) {
    fields.accreditationGrade = gradeMatch[1].trim().toUpperCase();
  }

  // Category specific fallbacks
  if (category === "ACCREDITATION_CERTIFICATE" && !fields.issuingAuthority) {
    if (text.includes("NAAC")) fields.issuingAuthority = "NAAC (National Assessment and Accreditation Council)";
    else if (text.includes("NBA")) fields.issuingAuthority = "NBA (National Board of Accreditation)";
  }

  return fields;
}
