"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function NewApplicationPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [referenceId, setReferenceId] = useState(`AICTE-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [institutionName, setInstitutionName] = useState("");
  const [applicationType, setApplicationType] = useState<string>("EXTENSION_OF_APPROVAL");
  const [academicYear, setAcademicYear] = useState("2026-27");
  const [state, setState] = useState("Delhi");
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Step 1: Create Application record
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceId,
          institutionName,
          applicationType,
          academicYear,
          state,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to create application record");
      }

      const createdApp = data.data;

      // Step 2: If files were selected, upload them
      if (files.length > 0) {
        const formData = new FormData();
        for (const file of files) {
          formData.append("files", file);
        }

        const uploadRes = await fetch(`/api/applications/${createdApp.id}/upload`, {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadData.success) {
          throw new Error(uploadData.error || "File upload failed");
        }
      }

      router.push(`/applications/${createdApp.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Link
        href="/applications"
        className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-3.5 w-3.5 mr-1" />
        Back to Directory
      </Link>

      <Card className="shadow-xs">
        <CardHeader className="p-6 pb-2">
          <CardTitle className="text-xl font-bold text-foreground">
            Register New Institutional Application
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Provide institution identification details and upload statutory credentials.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 pt-4">
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Application Reference ID *
                </label>
                <Input
                  required
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Academic Cycle *
                </label>
                <Input
                  required
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2026-27"
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Full Registered Legal Institution Name *
              </label>
              <Input
                required
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="e.g. Apex Institute of Advanced Technology"
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Application Intake Type *
                </label>
                <select
                  value={applicationType}
                  onChange={(e) => setApplicationType(e.target.value)}
                  className="w-full text-xs rounded-md border border-input bg-card py-2 px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                >
                  <option value="EXTENSION_OF_APPROVAL">Extension of Approval (EoA)</option>
                  <option value="NEW_INSTITUTE">Establishment of New Institute</option>
                  <option value="INCREASE_IN_INTAKE">Increase in Intake / New Course</option>
                  <option value="CLOSURE">Closure of Program / Institute</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  State / Union Territory *
                </label>
                <Input
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Karnataka"
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* File Upload Zone */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Attach Supporting Credentials (PDF, PNG, JPG)
              </label>
              <div className="border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-6 text-center cursor-pointer transition bg-muted/20">
                <UploadCloud className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-foreground font-medium">
                  Click or drag files to upload documents
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                  Application Form, NAAC/NBA Accreditation, Affiliation Order, Affidavit (Max 10MB each)
                </p>
                <input
                  type="file"
                  multiple
                  accept=".pdf,image/png,image/jpeg"
                  onChange={handleFileChange}
                  className="mt-3 text-xs text-muted-foreground"
                />
              </div>

              {files.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-xs font-semibold text-foreground">Selected Files ({files.length}):</p>
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center space-x-2 text-xs text-foreground bg-muted/40 p-2 rounded border border-border font-mono text-[11px]">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="font-medium">{file.name}</span>
                      <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button
                type="submit"
                disabled={submitting}
                size="sm"
                className="font-semibold text-xs shadow-2xs"
              >
                {submitting ? "Processing Submission..." : "Create & Run Deterministic Scrutiny"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
