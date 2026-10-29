import { ApplicationRecord } from "../../types";
import { connectDB, getStorageMode } from "./connection";
import { ApplicationModel } from "../../models/Application";
import { AccessScope } from "../../types/auth";
import { isCollegeUser } from "../auth/rbac";

// In-memory fallback repository when MongoDB server is not running locally
const memoryStore = new Map<string, ApplicationRecord>();

export class ApplicationRepository {
  static getStorageMode(): "mongodb" | "memory" {
    return getStorageMode();
  }

  static async getAll(scope?: AccessScope): Promise<ApplicationRecord[]> {
    if (scope && isCollegeUser(scope.role) && !scope.institutionId) {
      return [];
    }

    const db = await connectDB();
    if (db) {
      try {
        const query: any = {};
        if (scope && isCollegeUser(scope.role) && scope.institutionId) {
          query.institutionId = scope.institutionId;
        } else if (
          scope &&
          scope.role === "REVIEW_OFFICER" &&
          scope.assignedJurisdiction?.region &&
          scope.assignedJurisdiction.region !== "ALL"
        ) {
          query.region = scope.assignedJurisdiction.region;
        }

        // Lean projection: omit heavy extractedText from high-volume list queries
        const records = await ApplicationModel.find(query)
          .select({
            "documents.extractedText": 0,
            "documents.storageKey": 0,
          })
          .sort({ updatedAt: -1 })
          .lean();

        return records.map((doc: any) => ({
          ...doc,
          id: doc._id ? doc._id.toString() : doc.id || doc.referenceId,
        })) as ApplicationRecord[];
      } catch (err) {
        console.warn("MongoDB query failed, falling back to in-memory store:", err);
      }
    }

    let records = Array.from(memoryStore.values());
    if (scope && isCollegeUser(scope.role) && scope.institutionId) {
      records = records.filter((app) => app.institutionId === scope.institutionId);
    } else if (
      scope &&
      scope.role === "REVIEW_OFFICER" &&
      scope.assignedJurisdiction?.region &&
      scope.assignedJurisdiction.region !== "ALL"
    ) {
      records = records.filter((app) => app.region === scope.assignedJurisdiction?.region);
    }

    return records.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  // Alias for specification compatibility
  static async listApplications(scope?: AccessScope): Promise<ApplicationRecord[]> {
    return this.getAll(scope);
  }

  static async getById(id: string, scope?: AccessScope): Promise<ApplicationRecord | null> {
    if (scope && isCollegeUser(scope.role) && !scope.institutionId) {
      return null;
    }

    const db = await connectDB();
    if (db) {
      try {
        const query: any = {
          $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { referenceId: id }, { id }],
        };

        if (scope && isCollegeUser(scope.role) && scope.institutionId) {
          query.institutionId = scope.institutionId;
        }

        const record = await ApplicationModel.findOne(query).lean();
        if (record) {
          // Additional safety check against cross-tenant leakage
          if (
            scope &&
            isCollegeUser(scope.role) &&
            record.institutionId &&
            record.institutionId !== scope.institutionId
          ) {
            return null;
          }

          return {
            ...record,
            id: record._id ? (record._id as any).toString() : (record as any).id,
          } as ApplicationRecord;
        }
      } catch (err) {
        console.warn("MongoDB find failed, falling back to in-memory store:", err);
      }
    }

    const app =
      memoryStore.get(id) ||
      Array.from(memoryStore.values()).find((a) => a.referenceId === id) ||
      null;

    if (!app) {
      return null;
    }

    if (scope && isCollegeUser(scope.role)) {
      if (!scope.institutionId || app.institutionId !== scope.institutionId) {
        return null;
      }
    }

    return app;
  }

  // Alias for specification compatibility
  static async getApplicationById(id: string, scope?: AccessScope): Promise<ApplicationRecord | null> {
    return this.getById(id, scope);
  }

  static async save(app: ApplicationRecord, scope?: AccessScope): Promise<ApplicationRecord> {
    if (scope && isCollegeUser(scope.role)) {
      if (!scope.institutionId) {
        throw new Error("No institution bound to user scope");
      }
      if (app.institutionId && app.institutionId !== scope.institutionId) {
        throw new Error("Tenant isolation violation: cannot save record for another institution");
      }
      app.institutionId = scope.institutionId;
    }

    app.updatedAt = new Date().toISOString();
    memoryStore.set(app.id, app);

    const db = await connectDB();
    if (db) {
      try {
        const filter: any = { referenceId: app.referenceId };
        if (scope && isCollegeUser(scope.role) && scope.institutionId) {
          filter.institutionId = scope.institutionId;
        }

        await ApplicationModel.findOneAndUpdate(
          filter,
          { ...app },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.warn("MongoDB save failed, stored in memory fallback:", err);
      }
    }
    return app;
  }

  static async clearAll(): Promise<void> {
    memoryStore.clear();
    const db = await connectDB();
    if (db) {
      try {
        await ApplicationModel.deleteMany({});
      } catch (err) {
        console.warn("MongoDB clear failed:", err);
      }
    }
  }

  static async count(scope?: AccessScope): Promise<number> {
    if (scope && isCollegeUser(scope.role) && !scope.institutionId) {
      return 0;
    }

    const db = await connectDB();
    if (db) {
      try {
        const query: any = {};
        if (scope && isCollegeUser(scope.role) && scope.institutionId) {
          query.institutionId = scope.institutionId;
        }
        return await ApplicationModel.countDocuments(query);
      } catch {
        // fallback
      }
    }

    if (scope && isCollegeUser(scope.role) && scope.institutionId) {
      return Array.from(memoryStore.values()).filter(
        (app) => app.institutionId === scope.institutionId
      ).length;
    }

    return memoryStore.size;
  }
}
