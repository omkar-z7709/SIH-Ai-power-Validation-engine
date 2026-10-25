import { ApplicationRecord } from "@/types";
import { connectDB } from "./connection";
import { ApplicationModel } from "@/models/Application";

// In-memory fallback repository when MongoDB server is not running locally
const memoryStore = new Map<string, ApplicationRecord>();

export class ApplicationRepository {
  static async getAll(): Promise<ApplicationRecord[]> {
    const db = await connectDB();
    if (db) {
      try {
        // Lean projection: omit heavy extractedText from high-volume list queries
        const records = await ApplicationModel.find()
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
    return Array.from(memoryStore.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  static async getById(id: string): Promise<ApplicationRecord | null> {
    const db = await connectDB();
    if (db) {
      try {
        const record = await ApplicationModel.findOne({
          $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { referenceId: id }, { id }],
        }).lean();
        if (record) {
          return {
            ...record,
            id: record._id ? (record._id as any).toString() : (record as any).id,
          } as ApplicationRecord;
        }
      } catch (err) {
        console.warn("MongoDB find failed, falling back to in-memory store:", err);
      }
    }
    return memoryStore.get(id) || Array.from(memoryStore.values()).find((a) => a.referenceId === id) || null;
  }

  static async save(app: ApplicationRecord): Promise<ApplicationRecord> {
    app.updatedAt = new Date().toISOString();
    memoryStore.set(app.id, app);

    const db = await connectDB();
    if (db) {
      try {
        await ApplicationModel.findOneAndUpdate(
          { referenceId: app.referenceId },
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

  static async count(): Promise<number> {
    const db = await connectDB();
    if (db) {
      try {
        return await ApplicationModel.countDocuments();
      } catch {
        // fallback
      }
    }
    return memoryStore.size;
  }
}
