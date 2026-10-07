import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, AlertTriangle, Eye } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "../components/DataTable";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select } from "../components/ui/select";
import { Alert } from "../components/ui/alert";
import { useAsync } from "../hooks/useAsync";
import { api } from "../services/api";
import type { Batch } from "../types/api";

export function BatchesPage() {
  const { data, loading, error, reload } = useAsync(() => api.batches(), []);
  const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    batchName: "",
    startYear: "",
    endYear: "",
    department: "",
    program: "",
    duration: "4",
    status: "active"
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await api.createBatch({
        batchName: form.batchName,
        startYear: Number(form.startYear),
        endYear: Number(form.endYear),
        department: form.department,
        program: form.program,
        duration: Number(form.duration),
        status: form.status as "active" | "archived"
      });
      toast.success("Batch created successfully.");
      setForm({ batchName: "", startYear: "", endYear: "", department: "", program: "", duration: "4", status: "active" });
      reload();
    } catch (err: any) {
      toast.error(err.message || "Failed to create batch.");
    }
  }

  async function handleDeleteBatch(batch: Batch) {
    setDeleting(true);
    try {
      const res = await api.deleteBatch(batch._id);
      toast.success(res.message || `Deleted batch ${batch.batchName}.`);
      setDeleteTarget(null);
      reload();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete batch.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Batches</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create, view, and manage academic batches</p>
      </div>
      {error && <Alert>{error}</Alert>}
      <Card>
        <CardHeader>
          <CardTitle>Create Batch</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-4" onSubmit={submit}>
            {[
              ["batchName", "Batch Name", "2025-2029"],
              ["startYear", "Start Year", "2025"],
              ["endYear", "End Year", "2029"],
              ["department", "Department", "CSM"],
              ["program", "Program", "B.Tech"],
              ["duration", "Duration", "4"]
            ].map(([key, label, placeholder]) => (
              <div className="space-y-2" key={key}>
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  required
                />
              </div>
            ))}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select id="status" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit">Create Batch</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading batches...</p>
          ) : (
            <DataTable<Batch>
              data={data?.data || []}
              emptyMessage="No batches available."
              columns={[
                {
                  accessorKey: "batchName",
                  header: "Batch",
                  cell: ({ row }) => (
                    <Link
                      to={`/batches/${row.original._id}`}
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {row.original.batchName}
                    </Link>
                  )
                },
                { accessorKey: "department", header: "Department" },
                { accessorKey: "program", header: "Program" },
                { accessorKey: "duration", header: "Duration" },
                { accessorKey: "status", header: "Status" },
                {
                  id: "actions",
                  header: "Actions",
                  cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                      <Link to={`/batches/${row.original._id}`}>
                        <Button variant="secondary" size="sm" className="h-8 px-2 text-xs gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(row.original)}
                        aria-label={`Delete batch ${row.original.batchName}`}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-950/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )
                }
              ]}
            />
          )}
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h2 className="text-lg font-semibold text-white">Delete Batch & All Data?</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete batch <strong className="text-white">{deleteTarget.batchName}</strong> ({deleteTarget.department})?
            </p>
            <p className="text-xs text-red-400">
              This will permanently delete this batch and all students, attendance records, and examination results associated with it. This action cannot be undone.
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
                onClick={() => handleDeleteBatch(deleteTarget)}
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
    </div>
  );
}
