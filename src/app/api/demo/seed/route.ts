import { NextResponse } from "next/server";
import { ApplicationRepository } from "@/lib/db/repository";
import { ApplicationRecord, DocumentRecord } from "@/types";
import { runDeterministicValidation } from "@/lib/rules/rules-engine";
import { jevAdapter } from "@/lib/jev/jev-adapter";
import { connectDB } from "@/lib/db/connection";
import { UserModel } from "@/models/User";
import { InstitutionModel } from "@/models/Institution";
import { hashPassword } from "@/lib/auth/session";

export async function POST() {
  // Allow demo seeding in local dev or explicit demo environment
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
    return NextResponse.json(
      { success: false, error: "Demo seed is disabled in production without ALLOW_DEMO_SEED=true" },
      { status: 403 }
    );
  }

  try {
    await ApplicationRepository.clearAll();
    await connectDB();

    const now = new Date();
    const isoNow = now.toISOString();

    // 1. Seed Demo Institution
    const demoInstitutionId = "inst_apex_tech_01";
    await InstitutionModel.findOneAndUpdate(
      { officialCode: "AICTE-INST-DEL-101" },
      {
        officialCode: "AICTE-INST-DEL-101",
        name: "Apex Institute of Advanced Technology",
        legalEntityName: "Apex Educational Foundation Trust",
        state: "Delhi",
        district: "New Delhi",
        taluka: "Connaught Place",
        pinCode: "110001",
        address: "Plot 14, Institutional Area, Sector 62, New Delhi",
        isVerified: true,
        verificationStatus: "VERIFIED",
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      { upsert: true, new: true }
    );

    // 2. Seed Demo Users with passwords from env or safe defaults
    const collegePass = process.env.DEFAULT_COLLEGE_PASSWORD || "College@123456";
    const officerPass = process.env.DEFAULT_OFFICER_PASSWORD || "Officer@123456";
    const adminPass = process.env.DEFAULT_ADMIN_PASSWORD || "Admin@123456";

    const collegeHash = await hashPassword(collegePass);
    const officerHash = await hashPassword(officerPass);
    const adminHash = await hashPassword(adminPass);

    const seniorOfficerHash = await hashPassword(process.env.DEFAULT_SENIOR_OFFICER_PASSWORD || "Senior@123456");
    const collegeStaffHash = await hashPassword(process.env.DEFAULT_STAFF_PASSWORD || "Staff@123456");

    const demoUsers = [
      {
        email: (process.env.DEFAULT_COLLEGE_EMAIL || "college@apex.edu.in").toLowerCase(),
        name: "Prof. Rajesh Kumar (College Admin)",
        passwordHash: collegeHash,
        role: "COLLEGE_ADMIN",
        institutionId: demoInstitutionId,
        isActive: true,
        isVerified: true,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        email: "staff@apex.edu.in",
        name: "Ananya Sharma (Institutional Staff)",
        passwordHash: collegeStaffHash,
        role: "COLLEGE_STAFF",
        institutionId: demoInstitutionId,
        isActive: true,
        isVerified: true,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        email: (process.env.DEFAULT_OFFICER_EMAIL || "officer@aicte.gov.in").toLowerCase(),
        name: "Dr. R. K. Verma (First Scrutiny Officer)",
        passwordHash: officerHash,
        role: "REVIEW_OFFICER",
        isActive: true,
        isVerified: true,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        email: "senior.officer@aicte.gov.in",
        name: "Dr. S. K. Sen (Senior Appellate Officer)",
        passwordHash: seniorOfficerHash,
        role: "SENIOR_OFFICER",
        isActive: true,
        isVerified: true,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        email: (process.env.DEFAULT_ADMIN_EMAIL || "admin@aicte.gov.in").toLowerCase(),
        name: "System Administrator",
        passwordHash: adminHash,
        role: "SYSTEM_ADMIN",
        isActive: true,
        isVerified: true,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
    ];

    for (const u of demoUsers) {
      await UserModel.findOneAndUpdate(
        { email: u.email },
        { ...u },
        { upsert: true, new: true }
      );
    }

    const demoCases: Array<{
      ref: string;
      name: string;
      type: "NEW_INSTITUTE" | "EXTENSION_OF_APPROVAL" | "INCREASE_IN_INTAKE";
      year: string;
      state: string;
      docs: Array<{
        name: string;
        cat: any;
        text: string;
        fields: any;
        status?: any;
      }>;
    }> = [
      // 1. Fully Valid application with all required docs
      {
        ref: "AICTE-2026-DEL-101",
        name: "Apex Institute of Advanced Technology",
        type: "EXTENSION_OF_APPROVAL",
        year: "2026-27",
        state: "Delhi",
        docs: [
          {
            name: "Application_Form_Signed.pdf",
            cat: "APPLICATION_FORM",
            text: "AICTE Approval Process Handbook 2026-27. Application Form. Application ID: AICTE-2026-DEL-101. Institution Name: Apex Institute of Advanced Technology. Address: Plot 14, Institutional Area, Sector 62, New Delhi. Course Approved: B.Tech Computer Science, Annual Intake: 180.",
            fields: {
              applicationNumber: "AICTE-2026-DEL-101",
              institutionName: "Apex Institute of Advanced Technology",
              institutionAddress: "Plot 14, Institutional Area, Sector 62, New Delhi",
            },
          },
          {
            name: "NAAC_Accreditation_A_Plus.pdf",
            cat: "ACCREDITATION_CERTIFICATE",
            text: "National Assessment and Accreditation Council (NAAC). Certificate of Accreditation. This is to certify that Apex Institute of Advanced Technology has been accredited with Grade A+. Certificate No: NAAC/2024/DEL/8821. Issue Date: 15-06-2024. Expiry Date: 14-06-2029.",
            fields: {
              institutionName: "Apex Institute of Advanced Technology",
              certificateNumber: "NAAC/2024/DEL/8821",
              accreditationGrade: "A+",
              issueDate: "2024-06-15",
              expiryDate: "2029-06-14",
              issuingAuthority: "National Assessment and Accreditation Council",
            },
          },
          {
            name: "University_Affiliation_2026.pdf",
            cat: "AFFILIATION_CERTIFICATE",
            text: "Delhi Technological University. Office of the Registrar. Grant of Continuation of Affiliation. Ref No: DTU/AFFIL/2026/0491. Institution Name: Apex Institute of Advanced Technology. Issue Date: 10-01-2026. Valid until: 31-07-2027.",
            fields: {
              institutionName: "Apex Institute of Advanced Technology",
              certificateNumber: "DTU/AFFIL/2026/0491",
              issueDate: "2026-01-10",
              expiryDate: "2027-07-31",
              issuingAuthority: "Delhi Technological University",
            },
          },
          {
            name: "Board_Undertaking_Affidavit.pdf",
            cat: "UNDERTAKING",
            text: "Non-Judicial Stamp Paper Affidavit. I, Dr. S. K. Sharma, Director of Apex Institute of Advanced Technology, solemnly affirm and declare that the institute complies with all AICTE statutory land and faculty norms.",
            fields: {
              institutionName: "Apex Institute of Advanced Technology",
            },
          },
        ],
      },
      // 2. Missing Required Document (Missing Affiliation)
      {
        ref: "AICTE-2026-MH-204",
        name: "Sahyadri College of Engineering & Research",
        type: "NEW_INSTITUTE",
        year: "2026-27",
        state: "Maharashtra",
        docs: [
          {
            name: "Application_Form_Sahyadri.pdf",
            cat: "APPLICATION_FORM",
            text: "AICTE Application Form 2026-27. Application ID: AICTE-2026-MH-204. Institution Name: Sahyadri College of Engineering & Research. Address: Pune Highway, Kothrud, Pune, Maharashtra.",
            fields: {
              applicationNumber: "AICTE-2026-MH-204",
              institutionName: "Sahyadri College of Engineering & Research",
            },
          },
          {
            name: "Land_Ownership_Deed.pdf",
            cat: "LAND_BUILDING_DOCUMENT",
            text: "Registered Sale Deed of Land. 10.5 Acres designated for Educational Institutional Campus at Sahyadri College of Engineering & Research.",
            fields: {
              institutionName: "Sahyadri College of Engineering & Research",
            },
          },
        ],
      },
      // 3. Institution Name Mismatch
      {
        ref: "AICTE-2026-KA-309",
        name: "Cauvery Institute of Engineering and Management",
        type: "INCREASE_IN_INTAKE",
        year: "2026-27",
        state: "Karnataka",
        docs: [
          {
            name: "Application_Summary.pdf",
            cat: "APPLICATION_FORM",
            text: "AICTE Portal Application Form. Application ID: AICTE-2026-KA-309. Institution Name: Cauvery Institute of Engineering and Management. Bangalore, Karnataka.",
            fields: {
              applicationNumber: "AICTE-2026-KA-309",
              institutionName: "Cauvery Institute of Engineering and Management",
            },
          },
          {
            name: "NAAC_Accreditation_Certificate.pdf",
            cat: "ACCREDITATION_CERTIFICATE",
            text: "National Assessment and Accreditation Council. This is to certify that Vidya Vikas Memorial Polytechnic has been accredited. Certificate No: NAAC/2023/KA/1012. Issue Date: 12-05-2023. Expiry Date: 11-05-2028.",
            fields: {
              institutionName: "Vidya Vikas Memorial Polytechnic",
              certificateNumber: "NAAC/2023/KA/1012",
              issueDate: "2023-05-12",
              expiryDate: "2028-05-11",
              issuingAuthority: "NAAC",
            },
          },
          {
            name: "Affiliation_Letter_VTU.pdf",
            cat: "AFFILIATION_CERTIFICATE",
            text: "Visvesvaraya Technological University (VTU) Belagavi. Continuation of Affiliation to Cauvery Institute of Engineering and Management for 2026-27.",
            fields: {
              institutionName: "Cauvery Institute of Engineering and Management",
              issuingAuthority: "Visvesvaraya Technological University",
            },
          },
          {
            name: "Undertaking_Affidavit.pdf",
            cat: "UNDERTAKING",
            text: "Affidavit of compliance submitted by Cauvery Institute of Engineering and Management.",
            fields: {
              institutionName: "Cauvery Institute of Engineering and Management",
            },
          },
        ],
      },
      // 4. Expired Certificate & Date Conflict (Issue date > Expiry)
      {
        ref: "AICTE-2026-TN-415",
        name: "Coromandel Academy of Technology",
        type: "EXTENSION_OF_APPROVAL",
        year: "2026-27",
        state: "Tamil Nadu",
        docs: [
          {
            name: "Application_Form.pdf",
            cat: "APPLICATION_FORM",
            text: "AICTE Application Form. App ID: AICTE-2026-TN-415. Institution Name: Coromandel Academy of Technology.",
            fields: {
              applicationNumber: "AICTE-2026-TN-415",
              institutionName: "Coromandel Academy of Technology",
            },
          },
          {
            name: "NBA_Accreditation_Expired.pdf",
            cat: "ACCREDITATION_CERTIFICATE",
            text: "National Board of Accreditation (NBA). Certificate No: NBA/2019/TN/3391. Institution: Coromandel Academy of Technology. Issue Date: 01-07-2019. Expiry Date: 30-06-2022.",
            fields: {
              institutionName: "Coromandel Academy of Technology",
              certificateNumber: "NBA/2019/TN/3391",
              issueDate: "2019-07-01",
              expiryDate: "2022-06-30",
              issuingAuthority: "National Board of Accreditation",
            },
          },
          {
            name: "Affiliation_Anna_University.pdf",
            cat: "AFFILIATION_CERTIFICATE",
            text: "Anna University Chennai. Provisional Affiliation Order. Cert No: AU/AFF/2026/881. Issue Date: 15-08-2026. Expiry Date: 01-05-2026.",
            fields: {
              institutionName: "Coromandel Academy of Technology",
              certificateNumber: "AU/AFF/2026/881",
              issueDate: "2026-08-15",
              expiryDate: "2026-05-01",
              issuingAuthority: "Anna University",
            },
          },
          {
            name: "Undertaking.pdf",
            cat: "UNDERTAKING",
            text: "Solemn affirmation submitted by Coromandel Academy of Technology.",
            fields: {
              institutionName: "Coromandel Academy of Technology",
            },
          },
        ],
      },
      // 5. Verification Required Case
      {
        ref: "AICTE-2026-UP-522",
        name: "Ganga Institute of Technical Studies",
        type: "EXTENSION_OF_APPROVAL",
        year: "2026-27",
        state: "Uttar Pradesh",
        docs: [
          {
            name: "Application_Form.pdf",
            cat: "APPLICATION_FORM",
            text: "AICTE Application Form. App ID: AICTE-2026-UP-522. Institution: Ganga Institute of Technical Studies. Lucknow, UP.",
            fields: {
              applicationNumber: "AICTE-2026-UP-522",
              institutionName: "Ganga Institute of Technical Studies",
            },
          },
          {
            name: "NAAC_Accreditation_Certificate.pdf",
            cat: "ACCREDITATION_CERTIFICATE",
            text: "NAAC Accreditation. Certificate No: NAAC/2025/UP/7721. Institution: Ganga Institute of Technical Studies. Issue Date: 10-02-2025. Expiry Date: 09-02-2030.",
            fields: {
              institutionName: "Ganga Institute of Technical Studies",
              certificateNumber: "NAAC/2025/UP/7721",
              issueDate: "2025-02-10",
              expiryDate: "2030-02-09",
              issuingAuthority: "NAAC",
            },
          },
          {
            name: "AKTU_Affiliation_Letter.pdf",
            cat: "AFFILIATION_CERTIFICATE",
            text: "Dr. A.P.J. Abdul Kalam Technical University. Order No: AKTU/AFF/2026/194. Institution: Ganga Institute of Technical Studies. Valid until: 30-06-2027.",
            fields: {
              institutionName: "Ganga Institute of Technical Studies",
              certificateNumber: "AKTU/AFF/2026/194",
              expiryDate: "2027-06-30",
              issuingAuthority: "Dr. A.P.J. Abdul Kalam Technical University",
            },
          },
          {
            name: "Director_Undertaking.pdf",
            cat: "UNDERTAKING",
            text: "Affidavit of statutory compliance for Ganga Institute of Technical Studies.",
            fields: {
              institutionName: "Ganga Institute of Technical Studies",
            },
          },
        ],
      },
      // 6. Unreadable / Corrupted Document
      {
        ref: "AICTE-2026-GJ-611",
        name: "Sabarmati Polytechnic & Engineering Center",
        type: "NEW_INSTITUTE",
        year: "2026-27",
        state: "Gujarat",
        docs: [
          {
            name: "Scanned_Corrupted_Application.pdf",
            cat: "APPLICATION_FORM",
            text: "",
            fields: {},
            status: "FAILED",
          },
        ],
      },
    ];

    const seededApps: ApplicationRecord[] = [];

    for (const item of demoCases) {
      const docRecords: DocumentRecord[] = item.docs.map((d, index) => ({
        id: `doc_${item.ref}_${index + 1}`,
        applicationId: item.ref,
        originalFilename: d.name,
        storageKey: `demo_${d.name}`,
        mimeType: "application/pdf",
        sizeBytes: 1024 * (50 + index * 20),
        sha256Hash: `hash_demo_${item.ref}_${index}_${d.name.length}abc123456789`,
        category: d.cat,
        categoryConfidence: 0.95,
        extractionStatus: d.status || "SUCCESS",
        extractedText: d.text,
        extractedFields: d.fields,
        findings: [],
        provenance: {
          provider: "SyntheticFixtureGenerator",
          mode: "mock",
        },
        verificationStatus:
          d.cat === "ACCREDITATION_CERTIFICATE" || d.cat === "AFFILIATION_CERTIFICATE"
            ? "PENDING_VERIFICATION"
            : "NOT_REQUIRED",
        createdAt: isoNow,
        updatedAt: isoNow,
      }));

      const newApp: ApplicationRecord = {
        id: `app_${item.ref.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
        referenceId: item.ref,
        institutionId: demoInstitutionId,
        institutionName: item.name,
        applicationType: item.type,
        academicYear: item.year,
        state: item.state,
        status: "NEEDS_REVIEW",
        documents: docRecords,
        allFindings: [],
        reviews: [],
        auditTrail: [
          {
            id: `audit_seed_${item.ref}`,
            applicationId: item.ref,
            actor: "System Demo Seeder",
            action: "DEMO_APPLICATION_INITIALIZED",
            details: { referenceId: item.ref },
            timestamp: isoNow,
          },
        ],
        createdAt: isoNow,
        updatedAt: isoNow,
      };

      const { findings, computedStatus } = runDeterministicValidation(newApp);
      newApp.allFindings = findings;
      newApp.status = computedStatus;

      const jevResult = await jevAdapter.getDecisionSupport({
        institutionName: newApp.institutionName,
        referenceId: newApp.referenceId,
        documentCount: newApp.documents.length,
        deterministicFindings: findings,
        extractedSummary: {},
      });
      newApp.jevDecision = jevResult;

      await ApplicationRepository.save(newApp);
      seededApps.push(newApp);
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${seededApps.length} demo institutional applications with realistic scenarios.`,
      data: seededApps,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
