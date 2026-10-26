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
        className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition py-1"
      >
        <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
        Back to Applications Directory
      </Link>

      <Card className="shadow-xs border-border">
        <CardHeader className="p-6 pb-4 border-b border-border">
          <CardTitle className="text-xl font-bold tracking-tight text-foreground">
            Register Institutional Application
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1 prose-readable">
            Enter your institution's statutory registration details and attach mandatory regulatory certificates (Application Form, NAAC/NBA Accreditation, University Affiliation, and Notarized Undertaking).
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 pt-5">
          {error && (
            <div className="mb-5 p-3.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-xs flex items-start space-x-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to complete registration</p>
                <p className="mt-0.5 text-muted-foreground text-[11px]">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ref-id" className="block text-xs font-semibold text-foreground mb-1.5">
                  Application Reference ID *
                </label>
                <Input
                  id="ref-id"
                  required
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  className="text-xs h-9 font-mono"
                  placeholder="e.g. AICTE-2026-DEL-101"
                />
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Official AICTE application reference number.
                </span>
              </div>

              <div>
                <label htmlFor="academic-year" className="block text-xs font-semibold text-foreground mb-1.5">
                  Academic Approval Cycle *
                </label>
                <Input
                  id="academic-year"
                  required
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2026-27"
                  className="text-xs h-9 font-mono"
                />
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Designated regulatory scrutiny year.
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="inst-name" className="block text-xs font-semibold text-foreground mb-1.5">
                Full Registered Legal Institution Name *
              </label>
              <Input
                id="inst-name"
                required
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="e.g. Apex Institute of Advanced Technology"
                className="text-xs h-9"
              />
              <span className="text-[10px] text-muted-foreground mt-1 block">
                Must match the legal entity name stated on trust deeds and state affiliation orders verbatim.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="intake-type" className="block text-xs font-semibold text-foreground mb-1.5">
                  Approval Request Category *
                </label>
                <select
                  id="intake-type"
                  value={applicationType}
                  onChange={(e) => setApplicationType(e.target.value)}
                  className="w-full text-xs rounded-md border border-input bg-card py-2 px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono h-9"
                >
                  <option value="EXTENSION_OF_APPROVAL">Extension of Approval (EoA)</option>
                  <option value="NEW_INSTITUTE">Establishment of New Institute</option>
                  <option value="INCREASE_IN_INTAKE">Increase in Intake / New Course</option>
                  <option value="CLOSURE">Closure of Program / Institute</option>
                </select>
              </div>

              <div>
                <label htmlFor="state-field" className="block text-xs font-semibold text-foreground mb-1.5">
                  State / Union Territory *
                </label>
                <Input
                  id="state-field"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Maharashtra or Delhi"
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* File Upload Zone */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Statutory Document Credentials (PDF, Scanned JPG/PNG)
              </label>
              <div className="border-2 border-dashed border-border hover:border-primary/60 rounded-lg p-6 text-center transition bg-muted/20">
                <UploadCloud className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-foreground font-medium">
                  Select or drag statutory document files here
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 prose-readable mx-auto">
                  Accepted formats: Digital PDF, Scanned Image PDF, PNG, JPG (up to 10MB per document).
                </p>
                <label
                  htmlFor="file-upload-input"
                  className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md border border-input bg-card hover:bg-muted text-foreground transition shadow-2xs cursor-pointer focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:outline-hidden"
                >
                  <span>Browse Local Documents</span>
                  <input
                    id="file-upload-input"
                    type="file"
                    multiple
                    accept=".pdf,image/png,image/jpeg"
                    onChange={handleFileChange}
                    className="sr-only"
                    aria-label="Upload statutory document files"
                  />
                </label>
              </div>

              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground">Selected Credentials for Verification ({files.length}):</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-foreground bg-card p-2.5 rounded-md border border-border shadow-2xs">
                        <div className="flex items-center space-x-2 truncate">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="font-medium truncate">{file.name}</span>
                        </div>
                        <span className="text-muted-foreground font-mono text-[11px] shrink-0 ml-2">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-5 border-t border-border">
              <span className="text-[11px] text-muted-foreground">
                Documents are verified against AICTE Approval Process Handbook (APH) rules.
              </span>
              <Button
                type="submit"
                disabled={submitting}
                className="font-semibold text-xs h-9 px-4 gap-1.5"
              >
                {submitting ? "Processing Verification..." : "Register Application & Verify Documents"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
