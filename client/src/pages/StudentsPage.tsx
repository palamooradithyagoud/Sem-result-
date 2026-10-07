import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, AlertTriangle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "../components/ui/card";
import { Alert } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { DataTable } from "../components/DataTable";
import { AcademicFilters } from "../components/AcademicFilters";
import { useAsync } from "../hooks/useAsync";
import { api } from "../services/api";
import type { Student } from "../types/api";

function batchName(value: Student["batchId"]) {
  return typeof value === "string" ? value : value?.batchName || "—";
}

const PAGE_SIZE = 20;

export function StudentsPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    return params;
  }, [filters, page]);

  const students = useAsync(() => api.students(query), [query.toString(), refreshKey]);

  function handleFilterChange(key: string, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function handleReset() {
    setFilters({});
    setPage(1);
  }

  async function handleDeleteStudent(student: Student) {
    setDeleting(true);
    try {
      const res = await api.deleteStudent(student._id);
      toast.success(res.message || `Deleted student ${student.rollNumber}.`);
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete student.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Students</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Student records and academic profiles from uploaded data
        </p>
      </div>

      {students.error && <Alert>{students.error}</Alert>}

      <Card>
        <CardContent className="pt-5">
          <AcademicFilters
            values={filters}
            onChange={handleFilterChange}
            onReset={handleReset}
            includeSearch
            includeSemester
            includeSection
            includeDepartment
            includeYear
            searchPlaceholder="Roll number or student name..."
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <DataTable<Student>
            data={students.data?.data || []}
            loading={students.loading}
            pagination={students.data?.meta}
            onPageChange={setPage}
            emptyMessage="No students found matching the selected filters."
            columns={[
              {
                accessorKey: "rollNumber",
                header: "Roll Number",
                cell: ({ row }) => (
                  <Link
                    to={`/students/${row.original._id}`}
                    className="font-mono text-sm font-semibold text-foreground underline-offset-4 hover:underline"
                  >
                    {row.original.rollNumber}
                  </Link>
                )
              },
              {
                accessorKey: "name",
                header: "Student Name",
                cell: ({ row }) => (
                  <Link
                    to={`/students/${row.original._id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {row.original.name}
                  </Link>
                )
              },
              {
                header: "Batch",
                cell: ({ row }) => (
                  typeof row.original.batchId === "object" && row.original.batchId?._id ? (
                    <Link
                      to={`/batches/${row.original.batchId._id}`}
                      className="text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {batchName(row.original.batchId)}
                    </Link>
                  ) : (
                    batchName(row.original.batchId)
                  )
                )
              },
              { accessorKey: "department", header: "Department" },
              { accessorKey: "currentYear", header: "Year" },
              {
                accessorKey: "currentSection",
                header: "Section",
                cell: ({ row }) => row.original.currentSection || "—"
              },
              {
                accessorKey: "status",
                header: "Status",
                cell: ({ row }) => (
                  <Badge variant="outline" className="text-xs capitalize">
                    {row.original.status || "active"}
                  </Badge>
                )
              },
              {
                header: "Actions",
                cell: ({ row }) => (
                  <div className="flex items-center gap-1.5">
                    <Link to={`/students/${row.original._id}`}>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-white">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Profile
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(row.original)}
                      aria-label={`Delete student ${row.original.rollNumber}`}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              }
            ]}
          />
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h2 className="text-lg font-semibold text-white">Delete Student?</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong className="text-white">{deleteTarget.rollNumber}</strong> ({deleteTarget.name})?
            </p>
            <p className="text-xs text-red-400">
              This will remove the student and permanently delete all their attendance records and examination results across all semesters.
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
                onClick={() => handleDeleteStudent(deleteTarget)}
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
