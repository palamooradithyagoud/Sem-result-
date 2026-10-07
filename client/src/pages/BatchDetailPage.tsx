import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Users, BookOpen, Layers, CheckCircle2 } from "lucide-react";
import { useAsync } from "../hooks/useAsync";
import { api } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Alert } from "../components/ui/alert";
import { Skeleton } from "../components/ui/skeleton";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Label } from "../components/ui/label";
import { DataTable } from "../components/DataTable";
import type { Student } from "../types/api";

const PAGE_SIZE = 20;

export function BatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [section, setSection] = useState("");
  const [year, setYear] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search) params.set("search", search);
    if (section) params.set("section", section);
    if (year) params.set("year", year);
    return params;
  }, [page, search, section, year]);

  const batchStudentsReq = useAsync(() => api.batchStudents(id!, query), [id, query.toString()]);

  const batchInfo = batchStudentsReq.data?.batchInfo;
  const batch = batchInfo?.batch;
  const students = batchStudentsReq.data?.data || [];
  const meta = batchStudentsReq.data?.meta;

  if (batchStudentsReq.loading && !batch) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (batchStudentsReq.error || !batch) {
    return (
      <div className="space-y-4">
        <Link
          to="/batches"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Batches
        </Link>
        <Alert>{batchStudentsReq.error || "Batch not found."}</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        to="/batches"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Batches
      </Link>

      {/* Batch Identity Header */}
      <div className="rounded-lg border border-border bg-[#090909] p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{batch.batchName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {batch.department} · {batch.program} ({batch.startYear} – {batch.endYear})
            </p>
          </div>
          <Badge variant="outline" className="text-xs uppercase">
            {batch.status}
          </Badge>
        </div>

        <div className="grid gap-x-8 gap-y-2 text-sm md:grid-cols-4 pt-2 border-t border-border">
          <div>
            <span className="text-muted-foreground">Duration: </span>
            <span className="font-medium">{batch.duration} Years</span>
          </div>
          <div>
            <span className="text-muted-foreground">Department: </span>
            <span className="font-medium">{batch.department}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Program: </span>
            <span className="font-medium">{batch.program}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Academic Cycle: </span>
            <span className="font-medium">{batch.startYear} – {batch.endYear}</span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Students</p>
            <p className="mt-2 text-3xl font-bold">{batchInfo.totalStudents}</p>
            <p className="mt-1 text-xs text-muted-foreground">Enrolled in this batch</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Sections</p>
            <p className="mt-2 text-2xl font-semibold">
              {batchInfo.sections.length > 0 ? batchInfo.sections.join(", ") : "None assigned"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Active sections</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Available Semesters</p>
            <p className="mt-2 text-2xl font-semibold">
              {batchInfo.availableSemesters.length > 0
                ? batchInfo.availableSemesters.map((s) => `Sem ${s}`).join(", ")
                : "None recorded"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">With uploaded data</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Data Coverage</p>
            <div className="mt-2 space-y-1 text-sm font-medium">
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Attendance:</span>
                <span className="font-mono">{batchInfo.studentsWithAttendance} students</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Results:</span>
                <span className="font-mono">{batchInfo.studentsWithResults} students</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drill-down filters */}
      <Card>
        <CardHeader>
          <CardTitle>Students in this Batch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="batch-drill-search">Search Students</Label>
              <Input
                id="batch-drill-search"
                placeholder="Roll number or name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch-drill-section">Filter by Section</Label>
              <Select
                id="batch-drill-section"
                value={section}
                onChange={(e) => {
                  setSection(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All sections</option>
                {batchInfo.sections.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch-drill-year">Filter by Year</Label>
              <Input
                id="batch-drill-year"
                placeholder="e.g. I B.Tech"
                value={year}
                onChange={(e) => {
                  setYear(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <DataTable<Student>
            data={students}
            loading={batchStudentsReq.loading}
            pagination={meta}
            onPageChange={setPage}
            emptyMessage="No students found in this batch matching the selected filters."
            columns={[
              {
                accessorKey: "rollNumber",
                header: "Roll Number",
                cell: ({ row }) => (
                  <Link
                    to={`/students/${row.original._id}`}
                    className="font-mono font-semibold text-foreground underline-offset-4 hover:underline"
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
                id: "actions",
                header: "Action",
                cell: ({ row }) => (
                  <Link
                    to={`/students/${row.original._id}`}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
                  >
                    View Academic Profile
                  </Link>
                )
              }
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
