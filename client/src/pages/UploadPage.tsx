import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Upload, X, Trash2, CheckCircle2, History, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select } from "../components/ui/select";
import { DataTable } from "../components/DataTable";
import { useAsync } from "../hooks/useAsync";
import { api } from "../services/api";
import type { UploadPreview, UploadRecord } from "../types/api";

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

const TEXT_FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: "academicYear", label: "Academic Year", placeholder: "e.g. 2025-26" },
  { key: "year", label: "Year", placeholder: "e.g. I B.Tech" },
  { key: "department", label: "Department", placeholder: "e.g. CSM" },
  { key: "section", label: "Section", placeholder: "e.g. A (required for attendance)" }
];

export function UploadPage() {
  const batches = useAsync(() => api.batches(), []);
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [lastUploaded, setLastUploaded] = useState<UploadRecord | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    batchId: "",
    academicYear: "",
    year: "",
    semester: "",
    department: "",
    section: "",
    dataType: "attendance",
    duplicateAction: "replace"
  });

  const selectedKind = form.dataType as "attendance" | "results";

  const previewColumns = useMemo(() => {
    const first = preview?.records[0];
    return first
      ? Object.keys(first)
          .filter((key) => key !== "rowNumber")
          .slice(0, 9)
          .map((key) => ({
            accessorKey: key,
            header: key
          }))
      : [];
  }, [preview]);

  function setField(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleRemoveFile(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setFile(null);
    setPreview(null);
  }

  function handleClearPreview() {
    setPreview(null);
  }

  function buildFormData() {
    if (!file) throw new Error("Select an Excel file.");
    if (selectedKind === "attendance" && !form.section)
      throw new Error("Section is required for attendance uploads.");
    if (!form.batchId) throw new Error("Batch is required.");
    if (!form.academicYear) throw new Error("Academic Year is required.");
    if (!form.year) throw new Error("Year is required.");
    if (!form.semester) throw new Error("Semester is required.");
    if (!form.department) throw new Error("Department is required.");

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => value && data.append(key, value));
    data.append("file", file);
    return data;
  }

  async function submitPreview(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await api.previewUpload(selectedKind, buildFormData());
      setPreview(response.data);
    } catch (error) {
      setPreview(null);
      setError(error instanceof Error ? error.message : "Unable to parse file.");
    } finally {
      setLoading(false);
    }
  }

  async function processFile() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.processUpload(selectedKind, buildFormData());
      toast.success("File processed successfully.");
      setLastUploaded(res.data);
      setPreview(null);
      setFile(null);
      setForm((current) => ({ ...current, section: "" }));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to process file.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteLastUpload() {
    if (!lastUploaded) return;
    setDeleting(true);
    try {
      const res = await api.deleteUpload(lastUploaded._id);
      toast.success(res.message || "Upload and associated records removed.");
      setLastUploaded(null);
      setShowDeleteConfirm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove upload.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Upload</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preview, process, and manage attendance or result Excel files
        </p>
      </div>

      {(error || batches.error) && <Alert>{error || batches.error}</Alert>}

      {/* Post-upload Action Panel (Keep / Delete / Remove) */}
      {lastUploaded && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-white">
              <CheckCircle2 className="h-5 w-5 text-neutral-200" />
              <CardTitle className="text-base font-semibold">
                Upload Completed — {lastUploaded.fileName}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Successfully processed <strong className="text-white font-mono">{lastUploaded.processedRows.toLocaleString()}</strong> {lastUploaded.dataType} records for Semester {lastUploaded.semester} ({lastUploaded.academicYear}).
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setLastUploaded(null)}
              >
                Upload Another File
              </Button>
              <Link to="/uploads/history">
                <Button variant="secondary" size="sm" className="gap-1.5">
                  <History className="h-4 w-4" />
                  View in Upload History
                </Button>
              </Link>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="gap-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 border-red-900/50"
              >
                <Trash2 className="h-4 w-4" />
                Remove / Delete This Upload
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Modal for immediate rollback */}
      {showDeleteConfirm && lastUploaded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h2 className="text-lg font-semibold text-white">Delete Just-Uploaded Data?</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to remove <strong className="text-white">{lastUploaded.fileName}</strong>?
            </p>
            <p className="text-xs text-red-400">
              This will immediately delete this upload and all {lastUploaded.processedRows.toLocaleString()} {lastUploaded.dataType} records that were just created.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteLastUpload}
                disabled={deleting}
                className="gap-1.5 bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" onSubmit={submitPreview}>
            {/* Batch */}
            <div className="space-y-2">
              <Label htmlFor="upload-batchId">Batch</Label>
              <Select
                id="upload-batchId"
                value={form.batchId}
                onChange={(e) => setField("batchId", e.target.value)}
                required
              >
                <option value="">Select batch</option>
                {batches.data?.data.map((batch) => (
                  <option key={batch._id} value={batch._id}>
                    {batch.batchName} ({batch.department})
                  </option>
                ))}
              </Select>
            </div>

            {/* Text fields */}
            {TEXT_FIELDS.map(({ key, label, placeholder }) => (
              <div className="space-y-2" key={key}>
                <Label htmlFor={`upload-${key}`}>{label}</Label>
                <Input
                  id={`upload-${key}`}
                  placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setField(key, e.target.value)}
                  required={key !== "section" || selectedKind === "attendance"}
                />
              </div>
            ))}

            {/* Semester dropdown */}
            <div className="space-y-2">
              <Label htmlFor="upload-semester">Semester</Label>
              <Select
                id="upload-semester"
                value={form.semester}
                onChange={(e) => setField("semester", e.target.value)}
                required
              >
                <option value="">Select semester</option>
                {SEMESTERS.map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </Select>
            </div>

            {/* Data Type */}
            <div className="space-y-2">
              <Label htmlFor="upload-dataType">Data Type</Label>
              <Select
                id="upload-dataType"
                value={form.dataType}
                onChange={(e) => setField("dataType", e.target.value)}
              >
                <option value="attendance">Attendance</option>
                <option value="results">Results</option>
              </Select>
            </div>

            {/* Duplicate Action */}
            <div className="space-y-2">
              <Label htmlFor="upload-duplicateAction">Duplicate Action</Label>
              <Select
                id="upload-duplicateAction"
                value={form.duplicateAction}
                onChange={(e) => setField("duplicateAction", e.target.value)}
              >
                <option value="replace">Replace existing records</option>
                <option value="skip">Skip duplicates</option>
                <option value="cancel">Cancel if duplicates found</option>
              </Select>
            </div>

            {/* File picker */}
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="upload-file">Excel File</Label>
                {file && (
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    Remove file
                  </button>
                )}
              </div>
              <label
                className="flex h-24 cursor-pointer items-center justify-center gap-3 rounded-md border border-dashed border-border bg-card text-sm text-muted-foreground hover:bg-secondary transition-colors"
                aria-label="Select Excel file"
              >
                <Upload className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{file ? file.name : "Select .xlsx, .xls, or .xlsm file"}</span>
                <input
                  id="upload-file"
                  className="sr-only"
                  type="file"
                  accept=".xlsx,.xls,.xlsm"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] || null);
                    setPreview(null);
                  }}
                  required={!file}
                />
              </label>
            </div>

            {/* Submit */}
            <div className="flex items-end">
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Parsing..." : "Preview File"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Preview panel */}
      {preview && (
        <Card>
          <CardHeader>
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <CardTitle>Preview — {preview.fileName}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Verify detected records below before processing
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleClearPreview}
                  disabled={loading}
                  className="gap-1.5 text-xs"
                >
                  <X className="h-3.5 w-3.5" />
                  Remove Preview
                </Button>
                <Button
                  onClick={processFile}
                  disabled={loading || preview.validRecords === 0}
                  size="sm"
                  className="gap-1.5 text-xs font-semibold"
                >
                  {loading ? "Processing..." : "Process & Save Records"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-6">
              {(
                [
                  ["Students", preview.studentsDetected],
                  ["Subjects", preview.subjectsDetected],
                  ["Total Records", preview.recordsDetected],
                  ["Valid", preview.validRecords],
                  ["Invalid", preview.invalidRecords],
                  ["Duplicates", preview.duplicateRecords]
                ] as [string, number][]
              ).map(([label, value]) => (
                <Badge key={label} className="justify-between gap-2 px-3 py-2">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold">{value}</span>
                </Badge>
              ))}
            </div>

            {preview.errors.length > 0 && (
              <Alert>
                <p className="mb-2 font-medium">Processing errors ({preview.errors.length})</p>
                {preview.errors.slice(0, 8).map((issue) => (
                  <p key={`${issue.rowNumber}-${issue.message}`}>
                    Row {issue.rowNumber}: {issue.message}
                  </p>
                ))}
                {preview.errors.length > 8 && (
                  <p className="mt-1 text-muted-foreground">
                    ...and {preview.errors.length - 8} more issues
                  </p>
                )}
              </Alert>
            )}

            <DataTable<Record<string, unknown>>
              data={preview.records}
              columns={previewColumns}
              emptyMessage="No valid records detected in this file."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
