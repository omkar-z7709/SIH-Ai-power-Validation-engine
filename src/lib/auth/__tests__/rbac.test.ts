import { describe, it, expect, beforeEach } from "vitest";
import { ApplicationRepository } from "../../db/repository";
import {
  requireAuth,
  canFinalizeDecision,
  canSubmitApplication,
  isCollegeUser,
  isOfficerUser,
} from "../rbac";
import { createSessionToken, verifySessionToken } from "../token";
import { AccessScope } from "../../../types/auth";
import { ApplicationRecord } from "../../../types";
import { NextRequest } from "next/server";

describe("RBAC & Multi-Tenant Tenant Isolation", () => {
  const apexScope: AccessScope = {
    userId: "usr_apex_admin",
    email: "college@apex.edu.in",
    name: "Prof. Rajesh Kumar",
    role: "COLLEGE_ADMIN",
    institutionId: "inst_apex_tech_01",
  };

  const staffScope: AccessScope = {
    userId: "usr_apex_staff",
    email: "staff@apex.edu.in",
    name: "Ananya Sharma",
    role: "COLLEGE_STAFF",
    institutionId: "inst_apex_tech_01",
  };

  const reviewOfficerScope: AccessScope = {
    userId: "usr_officer_1",
    email: "officer@aicte.gov.in",
    name: "Dr. R. K. Verma",
    role: "REVIEW_OFFICER",
  };

  const seniorOfficerScope: AccessScope = {
    userId: "usr_officer_2",
    email: "senior.officer@aicte.gov.in",
    name: "Dr. S. K. Sen",
    role: "SENIOR_OFFICER",
  };

  const sampleApexApp: ApplicationRecord = {
    id: "app_del_101",
    referenceId: "AICTE-2026-DEL-101",
    institutionId: "inst_apex_tech_01",
    institutionName: "Apex Institute of Advanced Technology",
    applicationType: "EXTENSION_OF_APPROVAL",
    academicYear: "2026-27",
    state: "Delhi",
    status: "NEEDS_REVIEW",
    documents: [],
    allFindings: [],
    reviews: [],
    auditTrail: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleSahyadriApp: ApplicationRecord = {
    id: "app_mh_204",
    referenceId: "AICTE-2026-MH-204",
    institutionId: "inst_sahyadri_204",
    institutionName: "Sahyadri College of Engineering & Research",
    applicationType: "NEW_INSTITUTE",
    academicYear: "2026-27",
    state: "Maharashtra",
    status: "INCOMPLETE",
    documents: [],
    allFindings: [],
    reviews: [],
    auditTrail: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    await ApplicationRepository.clearAll();
    await ApplicationRepository.save(sampleApexApp);
    await ApplicationRepository.save(sampleSahyadriApp);
  });

  describe("Central Repository Scoping", () => {
    it("COLLEGE_ADMIN listing applications only receives their own institution records", async () => {
      const apps = await ApplicationRepository.getAll(apexScope);
      expect(apps.length).toBe(1);
      expect(apps[0].institutionId).toBe("inst_apex_tech_01");
      expect(apps[0].referenceId).toBe("AICTE-2026-DEL-101");
    });

    it("COLLEGE_ADMIN count only reflects their own institution records", async () => {
      const count = await ApplicationRepository.count(apexScope);
      expect(count).toBe(1);
    });

    it("COLLEGE_ADMIN requesting another institution's application ID gets null (404 mapping)", async () => {
      const crossTenantApp = await ApplicationRepository.getById("app_mh_204", apexScope);
      expect(crossTenantApp).toBeNull();
    });

    it("COLLEGE_ADMIN requesting their own application ID successfully receives it", async () => {
      const ownApp = await ApplicationRepository.getById("app_del_101", apexScope);
      expect(ownApp).not.toBeNull();
      expect(ownApp?.institutionId).toBe("inst_apex_tech_01");
    });

    it("Officers receive all applications across institutions without restriction", async () => {
      const officerApps = await ApplicationRepository.getAll(reviewOfficerScope);
      expect(officerApps.length).toBe(2);

      const seniorOfficerApps = await ApplicationRepository.getAll(seniorOfficerScope);
      expect(seniorOfficerApps.length).toBe(2);
    });

    it("Fails closed (returns empty/null) for college user without institutionId", async () => {
      const orphanScope: AccessScope = {
        userId: "usr_orphan",
        email: "orphan@college.edu",
        name: "Orphan User",
        role: "COLLEGE_ADMIN",
      };

      const apps = await ApplicationRepository.getAll(orphanScope);
      expect(apps).toEqual([]);

      const app = await ApplicationRepository.getById("app_del_101", orphanScope);
      expect(app).toBeNull();

      const count = await ApplicationRepository.count(orphanScope);
      expect(count).toBe(0);
    });

    it("Prevents cross-tenant writes by college users", async () => {
      const maliciousWrite: ApplicationRecord = {
        ...sampleApexApp,
        id: "app_malicious_write",
        referenceId: "AICTE-2026-ATTACK",
        institutionId: "inst_sahyadri_204", // Attempt to write to another institution
      };

      await expect(
        ApplicationRepository.save(maliciousWrite, apexScope)
      ).rejects.toThrow(/Tenant isolation violation/);
    });
  });

  describe("Role Authorities & Scrutiny Restrictions", () => {
    it("REVIEW_OFFICER cannot finalize Approve or Reject decisions", () => {
      expect(canFinalizeDecision("REVIEW_OFFICER")).toBe(false);
    });

    it("SENIOR_OFFICER and SYSTEM_ADMIN have exclusive authority to finalize decisions", () => {
      expect(canFinalizeDecision("SENIOR_OFFICER")).toBe(true);
      expect(canFinalizeDecision("SYSTEM_ADMIN")).toBe(true);
      expect(canFinalizeDecision("COLLEGE_ADMIN")).toBe(false);
      expect(canFinalizeDecision("COLLEGE_STAFF")).toBe(false);
    });

    it("COLLEGE_STAFF cannot execute final application submission", () => {
      expect(canSubmitApplication("COLLEGE_STAFF")).toBe(false);
      expect(canSubmitApplication("COLLEGE_ADMIN")).toBe(true);
      expect(canSubmitApplication("SYSTEM_ADMIN")).toBe(true);
    });

    it("Properly identifies college and officer user groups", () => {
      expect(isCollegeUser("COLLEGE_ADMIN")).toBe(true);
      expect(isCollegeUser("COLLEGE_STAFF")).toBe(true);
      expect(isCollegeUser("REVIEW_OFFICER")).toBe(false);
      expect(isCollegeUser("SENIOR_OFFICER")).toBe(false);

      expect(isOfficerUser("REVIEW_OFFICER")).toBe(true);
      expect(isOfficerUser("SENIOR_OFFICER")).toBe(true);
      expect(isOfficerUser("SYSTEM_ADMIN")).toBe(true);
      expect(isOfficerUser("COLLEGE_ADMIN")).toBe(false);
    });
  });

  describe("Server-Side Token Authentication & Query Spoofing Protection", () => {
    it("signs and verifies JWT session token accurately", async () => {
      const token = await createSessionToken(apexScope);
      const verified = await verifySessionToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe(apexScope.userId);
      expect(verified?.role).toBe("COLLEGE_ADMIN");
      expect(verified?.institutionId).toBe("inst_apex_tech_01");
    });

    it("requireAuth returns 401 when token is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/applications");
      const auth = await requireAuth(req);
      expect(auth.error).toBeDefined();
      expect(auth.error?.status).toBe(401);
    });

    it("requireAuth returns 403 when user role is not allowed", async () => {
      const token = await createSessionToken(apexScope);
      const req = new NextRequest("http://localhost:3000/api/officer/review", {
        headers: { Cookie: `aicte_session=${token}` },
      });
      const auth = await requireAuth(req, ["REVIEW_OFFICER", "SENIOR_OFFICER"]);
      expect(auth.error).toBeDefined();
      expect(auth.error?.status).toBe(403);
    });

    it("ignores query param spoofing (?institutionId=other) and uses verified token scope", async () => {
      const token = await createSessionToken(apexScope);
      const req = new NextRequest(
        "http://localhost:3000/api/applications?institutionId=inst_sahyadri_204",
        {
          headers: { Cookie: `aicte_session=${token}` },
        }
      );
      const auth = await requireAuth(req);
      expect(auth.scope).toBeDefined();
      // Verified scope MUST match token, not the spoofed query parameter
      expect(auth.scope?.institutionId).toBe("inst_apex_tech_01");
      expect(auth.scope?.institutionId).not.toBe("inst_sahyadri_204");
    });
  });
});
