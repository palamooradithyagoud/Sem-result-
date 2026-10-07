import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "../components/ui/card";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { DataTable } from "../components/DataTable";
import { AcademicFilters } from "../components/AcademicFilters";
import { useAsync } from "../hooks/useAsync";
import { api } from "../services/api";
import type { AttendanceRecord } from "../types/api";

function studentName(value: AttendanceRecord["studentId"]) {
  return typeof value === "string" ? "—" : value?.name || "—";
}

function studentId(value: AttendanceRecord["studentId"]) {
  return typeof value === "object" && value?._id ? value._id : null;
}

const PAGE_SIZE = 20;

export function AttendancePage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    return params;
  }, [filters, page]);

  const records = useAsync(() => api.attendance(query), [query.toString(), refreshKey]);

  function handleFilterChange(key: string, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function handleReset() {
    setFilters({});
    setPage(1);
  }

  async function handleDeleteRecord(record: AttendanceRecord) {
    setDeleting(true);
    try {
      await api.deleteAttendanceRecord(record._id);
      toast.success("Attendance record deleted successfully.");
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete attendance record.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Attendance Records</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subject-wise attendance tracking from uploaded college records
        </p>
      </div>

      {records.error && <Alert>{records.error}</Alert>}

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
            includeSubject
            searchPlaceholder="Search roll number or subject..."
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <DataTable<AttendanceRecord>
            data={records.data?.data || []}
            loading={records.loading}
            pagination={records.data?.meta}
            onPageChange={setPage}
            emptyMessage="No attendance records available for the selected filters."
            columns={[
              {
                accessorKey: "rollNumber",
                header: "Roll Number",
                cell: ({ row }) => {
                  const sId = studentId(row.original.studentId);
                  return sId ? (
                    <Link
                      to={`/students/${sId}`}
                      className="font-mono text-xs font-semibold text-foreground underline-offset-4 hover:underline"
                    >
                      {row.original.rollNumber}
                    </Link>
                  ) : (
                    <span className="font-mono text-xs">{row.original.rollNumber}</span>
                  );
                }
              },
              {
                header: "Student",
                cell: ({ row }) => {
                  const sId = studentId(row.original.studentId);
                  const name = studentName(row.original.studentId);
                  return sId ? (
                    <Link to={`/students/${sId}`} className="hover:underline font-medium">
                      {name}
                    </Link>
                  ) : (
                    name
                  );
                }
              },
              {
                header: "Semester",
                cell: ({ row }) => `Sem ${row.original.semester}`
              },
              { accessorKey: "section", header: "Section" },
              {
                accessorKey: "subjectName",
                header: "Subject",
                cell: ({ row }) => (
                  <div>
                    <span>{row.original.subjectName}</span>
                    {row.original.subjectCode && (
                      <span className="ml-1 text-xs text-muted-foreground font-mono">
                        ({row.original.subjectCode})
                      </span>
                    )}
                  </div>
                )
              },
              { accessorKey: "classesConducted", header: "Conducted" },
              { accessorKey: "classesAttended", header: "Attended" },
              {
                header: "Attendance %",
                cell: ({ row }) => {
                  const pct = row.original.attendancePercentage;
                  if (pct === undefined) return <span className="text-muted-foreground">—</span>;
                  return (
                    <span className={pct < 75 ? "text-destructive font-semibold font-mono" : "font-mono"}>
                      {pct}%
                    </span>
                  );
                }
              },
              {
                header: "Action",
                cell: ({ row }) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(row.original)}
                    aria-label={`Delete record for ${row.original.rollNumber}`}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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
              <h2 className="text-lg font-semibold text-white">Delete Attendance Record?</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete the attendance record for <strong className="text-white">{deleteTarget.rollNumber}</strong> in <strong className="text-white">{deleteTarget.subjectName}</strong>?
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
                onClick={() => handleDeleteRecord(deleteTarget)}
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
