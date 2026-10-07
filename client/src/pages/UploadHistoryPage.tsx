import { useState } from "react";
import { Trash2, Eye, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "../components/DataTable";
import { Alert } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useAsync } from "../hooks/useAsync";
import { formatDate } from "../lib/utils";
import { api } from "../services/api";
import type { UploadRecord } from "../types/api";

function batchName(value: UploadRecord["batchId"]) {
  return typeof value === "string" ? value : value?.batchName || "—";
}

const PAGE_SIZE = 20;

export function UploadHistoryPage() {
  const [selected, setSelected] = useState<UploadRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UploadRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const uploads = useAsync(
    () => api.uploads(new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })),
    [page, refreshKey]
  );

  async function handleDeleteUpload(upload: UploadRecord) {
    setDeleting(true);
    try {
      const res = await api.deleteUpload(upload._id);
      toast.success(res.message || `Deleted upload and associated records.`);
      if (selected?._id === upload._id) {
        setSelected(null);
      }
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete upload.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Upload History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Processed file history, record counts, and dataset management
        </p>
      </div>

      {uploads.error && <Alert>{uploads.error}</Alert>}

      <Card>
        <CardContent className="pt-5">
          <DataTable<UploadRecord>
            data={uploads.data?.data || []}
            loading={uploads.loading}
            pagination={uploads.data?.meta}
            onPageChange={setPage}
            emptyMessage="No upload history available."
            columns={[
              { accessorKey: "fileName", header: "File Name" },
              {
                accessorKey: "dataType",
                header: "Type",
                cell: ({ row }) => (
                  <span className="capitalize font-medium">
                    {row.original.dataType}
                  </span>
                )
              },
              { header: "Batch", cell: ({ row }) => batchName(row.original.batchId) },
              { accessorKey: "academicYear", header: "Academic Year" },
              {
                accessorKey: "semester",
                header: "Sem",
                cell: ({ row }) => `Sem ${row.original.semester}`
              },
              { accessorKey: "section", header: "Section", cell: ({ row }) => row.original.section || "—" },
              {
                accessorKey: "processedRows",
                header: "Records",
                cell: ({ row }) => (
                  <span className="font-mono">{row.original.processedRows.toLocaleString()}</span>
                )
              },
              {
                accessorKey: "status",
                header: "Status",
                cell: ({ row }) => (
                  <Badge
                    className={
                      row.original.status === "processed"
                        ? "bg-neutral-800 text-white"
                        : "bg-red-950 text-red-300 border-red-800"
                    }
                  >
                    {row.original.status}
                  </Badge>
                )
              },
              { header: "Uploaded Date", cell: ({ row }) => formatDate(row.original.uploadedAt) },
              {
                header: "Actions",
                cell: ({ row }) => (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelected(row.original)}
                      aria-label={`View details for ${row.original.fileName}`}
                      className="gap-1.5 h-8 px-2.5 text-xs"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setDeleteTarget(row.original)}
                      aria-label={`Delete upload ${row.original.fileName}`}
                      className="gap-1.5 h-8 px-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 border-red-900/50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                )
              }
            ]}
          />
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Delete */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h2 className="text-lg font-semibold text-white">Delete Upload & Records?</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to remove <strong className="text-white">{deleteTarget.fileName}</strong>?
            </p>
            <div className="rounded-md border border-border bg-secondary/50 p-3 text-xs space-y-1">
              <div><span className="text-muted-foreground">Data Type:</span> <span className="text-white capitalize">{deleteTarget.dataType}</span></div>
              <div><span className="text-muted-foreground">Semester:</span> <span className="text-white">Semester {deleteTarget.semester} ({deleteTarget.academicYear})</span></div>
              <div><span className="text-muted-foreground">Records to delete:</span> <span className="text-white font-mono">{deleteTarget.processedRows.toLocaleString()}</span></div>
            </div>
            <p className="text-xs text-red-400">
              This will permanently delete the upload record and all {deleteTarget.processedRows.toLocaleString()} associated academic records. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteUpload(deleteTarget)}
                disabled={deleting}
                className="gap-1.5 bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleting ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Details Card */}
      {selected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="truncate">{selected.fileName}</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteTarget(selected)}
                  className="gap-1.5 text-xs bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete This Upload
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelected(null)}
                  aria-label="Close details"
                >
                  Close
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Stats row */}
            <div className="flex flex-wrap gap-2">
              <Badge>Status: {selected.status}</Badge>
              <Badge>Total: {selected.totalRows}</Badge>
              <Badge>Processed: {selected.processedRows}</Badge>
              <Badge>Failed: {selected.failedRows}</Badge>
              <Badge>Duplicates: {selected.duplicateRows}</Badge>
            </div>

            {/* Metadata grid */}
            <div className="grid gap-2 text-sm md:grid-cols-3">
              <div>
                <span className="text-muted-foreground">Batch: </span>
                {batchName(selected.batchId)}
              </div>
              <div>
                <span className="text-muted-foreground">Academic Year: </span>
                {selected.academicYear}
              </div>
              <div>
                <span className="text-muted-foreground">Semester: </span>
                {selected.semester}
              </div>
              <div>
                <span className="text-muted-foreground">Department: </span>
                {selected.department}
              </div>
              <div>
                <span className="text-muted-foreground">Section: </span>
                {selected.section || "-"}
              </div>
              <div>
                <span className="text-muted-foreground">Uploaded: </span>
                {formatDate(selected.uploadedAt)}
              </div>
              {selected.completedAt && (
                <div>
                  <span className="text-muted-foreground">Completed: </span>
                  {formatDate(selected.completedAt)}
                </div>
              )}
            </div>

            {/* Errors */}
            {selected.errorMessages.length > 0 ? (
              <Alert>
                <p className="mb-2 font-medium">Processing errors ({selected.errorMessages.length})</p>
                {selected.errorMessages.map((message) => (
                  <p key={message} className="text-sm">
                    {message}
                  </p>
                ))}
              </Alert>
            ) : (
              <p className="text-sm text-muted-foreground">No processing errors recorded.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
