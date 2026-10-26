import { UserModel } from "@/models/User";
import { InstitutionModel } from "@/models/Institution";
import { connectDB } from "@/lib/db/connection";

export async function ensureDefaultAdmin() {
  try {
    await connectDB();
    const existingAdmin = await UserModel.findOne({ role: "SYSTEM_ADMIN" });
    if (existingAdmin) return;
    const { hashPassword } = await import("./session");
    const now = new Date().toISOString();
    const passwordHash = await hashPassword(process.env.DEFAULT_ADMIN_PASSWORD || "ChangeMe@123456");
    await UserModel.create({
      email: process.env.DEFAULT_ADMIN_EMAIL || "admin@aicte.gov.in",
      name: "System Administrator",
      passwordHash,
      role: "SYSTEM_ADMIN",
      isActive: true,
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    });
    console.log("Created default system admin");
  } catch (err) {
    console.warn("Failed to ensure default admin:", err);
  }
}
