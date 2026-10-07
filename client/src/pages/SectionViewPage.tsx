import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Alert } from "../components/ui/alert";
import { Label } from "../components/ui/label";
import { Select } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { DataTable } from "../components/DataTable";
import { useAsync } from "../hooks/useAsync";
import { api } from "../services/api";
import type { SectionStudentRow, FilterOptions } from "../types/api";

const PAGE_SIZE = 20;

export function SectionViewPage() {
  const [batchId, setBatchId] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [semester, setSemester] = useState("1");
  const [section, setSection] = useState("");
  const [page, setPage] = useState(1);

  const [options, setOptions] = useState<FilterOptions>({
    batches: [],
    academicYears: [],
    semesters: [],
    sections: [],
    departments: [],
    subjects: []
  });

  // Fetch filter options when batchId changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (batchId) params.set("batchId", batchId);
    api.academicFilterOptions(params).then((res) => {
      if (res.data) setOptions(res.data);
    }).catch(() => {});
  }, [batchId]);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (batchId) params.set("batchId", batchId);
    if (academicYear) params.set("academicYear", academicYear);
    if (semester) params.set("semester", semester);
    if (section) params.set("section", section);
    return params;
  }, [batchId, academicYear, semester, section, page]);

  const enabled = Boolean(batchId && semester);

  const sectionReq = useAsync(
    () => (enabled ? api.sectionView(query) : Promise.resolve({ data: [], meta: { total: 0, page: 1, pageSize: PAGE_SIZE } })),
    [enabled, query.toString()]
  );

  const students = sectionReq.data?.data || [];
  const meta = sectionReq.data?.meta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Section View</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Section-level academic management, student attendance, and results
        </p>
      </div>

      {sectionReq.error && <Alert>{sectionReq.error}</Alert>}

      {/* Filter Card */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="sec-batch">Batch *</Label>
              <Select
                id="sec-batch"
                value={batchId}
                onChange={(e) => {
                  setBatchId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Select a batch</option>
                {options.batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.batchName} ({b.department})
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sec-ay">Academic Year</Label>
              {options.academicYears.length > 0 ? (
                <Select
                  id="sec-ay"
                  value={academicYear}
                  onChange={(e) => {
                    setAcademicYear(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All academic years</option>
                  {options.academicYears.map((ay) => (
                    <option key={ay} value={ay}>
                      {ay}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  id="sec-ay"
                  placeholder="e.g. 2025-26"
                  value={academicYear}
                  onChange={(e) => {
                    setAcademicYear(e.target.value);
                    setPage(1);
                  }}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sec-sem">Semester *</Label>
              <Select
                id="sec-sem"
                value={semester}
                onChange={(e) => {
                  setSemester(e.target.value);
                  setPage(1);
                }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sec-sec">Section</Label>
              {options.sections.length > 0 ? (
                <Select
                  id="sec-sec"
                  value={section}
                  onChange={(e) => {
                    setSection(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All sections</option>
                  {options.sections.map((s) => (
                    <option key={s} value={s}>
                      Section {s}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  id="sec-sec"
                  placeholder="e.g. A"
                  value={section}
                  onChange={(e) => {
                    setSection(e.target.value);
                    setPage(1);
                  }}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {!enabled ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Please select a Batch and Semester above to view section student records.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Students {section ? `— Section ${section}` : ""} (Semester {semester})
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {meta?.total ?? 0} students recorded
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable<SectionStudentRow>
              data={students}
              loading={sectionReq.loading}
              pagination={meta}
              onPageChange={setPage}
              emptyMessage="No students found for this section in the specified semester."
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
                {
                  id: "section",
                  header: "Section",
                  cell: ({ row }) => row.original.currentSection || section || "—"
                },
                {
                  id: "attendance",
                  header: "Attendance %",
                  cell: ({ row }) => {
                    const att = row.original.attendance;
                    if (!att || att.percentage === undefined) {
                      return <span className="text-muted-foreground text-xs">Not available</span>;
                    }
                    return (
                      <span className={att.percentage < 75 ? "text-destructive font-semibold font-mono" : "font-mono font-medium"}>
                        {att.percentage}% ({att.classesAttended}/{att.classesConducted})
                      </span>
                    );
                  }
                },
                {
                  id: "sgpa",
                  header: "SGPA",
                  cell: ({ row }) => {
                    const perf = row.original.performance;
                    return perf?.sgpa !== undefined ? (
                      <span className="font-mono font-medium">{perf.sgpa}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Not available</span>
                    );
                  }
                },
                {
                  id: "cgpa",
                  header: "CGPA",
                  cell: ({ row }) => {
                    const perf = row.original.performance;
                    return perf?.cgpa !== undefined ? (
                      <span className="font-mono font-medium">{perf.cgpa}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Not available</span>
                    );
                  }
                },
                {
                  id: "actions",
                  header: "Action",
                  cell: ({ row }) => (
                    <Link
                      to={`/students/${row.original._id}`}
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
                    >
                      View Profile
                    </Link>
                  )
                }
              ]}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
