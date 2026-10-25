import { describe, it, expect } from "vitest";
import { verificationService } from "../src/lib/verification/verification-service";

describe("Authority Verification Service & Adapters", () => {
  it("verifies valid NAAC accreditation claims against registry adapter", async () => {
    const result = await verificationService.verifyClaim({
      authorityType: "NAAC",
      certificateNumber: "NAAC/2024/DEL/8821",
      institutionName: "Apex Institute of Advanced Technology",
    });

    expect(result.verified).toBe(true);
    expect(result.authorityName).toContain("NAAC");
    expect(result.registryReference).toBe("REG-NAAC-PORTAL-NAAC/2024/DEL/8821");
  });

  it("verifies valid NBA accreditation claims against registry adapter", async () => {
    const result = await verificationService.verifyClaim({
      authorityType: "NBA",
      certificateNumber: "NBA/2025/CS/101",
      institutionName: "Kalinga Institute of Technology",
    });

    expect(result.verified).toBe(true);
    expect(result.authorityName).toContain("NBA");
    expect(result.registryReference).toContain("REG-NBA-PORTAL-NBA/2025/CS/101");
  });

  it("returns unconfirmed status when certificate number does not match registry patterns", async () => {
    const result = await verificationService.verifyClaim({
      authorityType: "NAAC",
      certificateNumber: "INVALID_999",
      institutionName: "Unknown Institute",
    });

    expect(result.verified).toBe(false);
    expect(result.statusMessage).toContain("Unconfirmed");
  });
});
