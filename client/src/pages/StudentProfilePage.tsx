import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  LayoutList,
  TrendingUp,
  User,
  SlidersHorizontal,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { useAsync } from "../hooks/useAsync";
import { api } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Alert } from "../components/ui/alert";
import { Skeleton } from "../components/ui/skeleton";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Select } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import type { SemesterSummary, SubjectMapping, PerformanceTrendPoint } from "../types/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  subtext
}: {
  label: string;
  value: string | number | undefined;
  subtext?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="mt-2 text-2xl font-semibold">
          {value !== undefined && value !== null ? (
            value
          ) : (
            <span className="text-muted-foreground text-sm font-normal">Not available</span>
          )}
        </p>
        {subtext && <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Data Consistency Badge ───────────────────────────────────────────────────
function ConsistencyBadge({ hasAttendance, hasResult }: { hasAttendance: boolean; hasResult: boolean }) {
  if (hasAttendance && hasResult) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        Complete
      </span>
    );
  }
  if (hasAttendance && !hasResult) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-500">
        <AlertCircle className="h-3 w-3" />
        Result unavailable
      </span>
    );
  }
  if (!hasAttendance && hasResult) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-500">
        <AlertCircle className="h-3 w-3" />
        Attendance unavailable
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">No data</span>;
}

// ─── Subject detail panel ──────────────────────────────────────────────────────
function SubjectDetailModal({
  subject,
  semester,
  onClose
}: {
  subject: SubjectMapping;
  semester: SemesterSummary;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <Card className="w-full max-w-xl border-border bg-[#090909]">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">
                {subject.subjectName}
              </CardTitle>
              {subject.subjectCode && (
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  Code: {subject.subjectCode}
                </p>
              )}
            </div>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border pb-2">
            <span>Semester {semester.semester} ({semester.academicYear})</span>
            <ConsistencyBadge hasAttendance={subject.hasAttendance} hasResult={subject.hasResult} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Attendance block */}
            <div className="rounded-md border border-border p-4 bg-[#141414] space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Attendance Details
              </p>
              {subject.hasAttendance ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-border/60 py-1">
                    <span className="text-muted-foreground">Classes Conducted</span>
                    <span className="font-mono">{subject.classesConducted}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/60 py-1">
                    <span className="text-muted-foreground">Classes Attended</span>
                    <span className="font-mono">{subject.classesAttended}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Attendance %</span>
                    <span
                      className={`font-semibold ${
                        subject.attendancePercentage !== undefined && subject.attendancePercentage < 75
                          ? "text-destructive"
                          : ""
                      }`}
                    >
                      {subject.attendancePercentage !== undefined ? `${subject.attendancePercentage}%` : "—"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-2">Attendance not available.</p>
              )}
            </div>

            {/* Result block */}
            <div className="rounded-md border border-border p-4 bg-[#141414] space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Result Details
              </p>
              {subject.hasResult ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-border/60 py-1">
                    <span className="text-muted-foreground">Grade</span>
                    <span className="font-mono font-semibold">{subject.grade || "—"}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/60 py-1">
                    <span className="text-muted-foreground">Grade Point</span>
                    <span className="font-mono">{subject.gradePoint ?? "—"}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/60 py-1">
                    <span className="text-muted-foreground">Credits</span>
                    <span className="font-mono">{subject.credits ?? "—"}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Result Status</span>
                    <span className="capitalize">{subject.resultStatus || "—"}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-2">Result not available.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Semester comparison component ─────────────────────────────────────────────
function SemesterComparison({ semesters }: { semesters: SemesterSummary[] }) {
  const [semAIdx, setSemAIdx] = useState("0");
  const [semBIdx, setSemBIdx] = useState(semesters.length > 1 ? "1" : "0");

  if (semesters.length < 2) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        At least two semesters of academic records are required to perform a comparison.
      </p>
    );
  }

  const a = semesters[Number(semAIdx)];
  const b = semesters[Number(semBIdx)];

  function fmtVal(v?: number, unit = "") {
    return v !== undefined && v !== null ? `${v}${unit}` : "Not available";
  }

  const comparisonRows: [string, string, string][] = [
    ["SGPA", fmtVal(a?.sgpa), fmtVal(b?.sgpa)],
    ["CGPA", fmtVal(a?.cgpa), fmtVal(b?.cgpa)],
    ["Overall Attendance %", fmtVal(a?.attendancePercentage, "%"), fmtVal(b?.attendancePercentage, "%")],
    ["Classes Conducted", fmtVal(a?.classesConducted), fmtVal(b?.classesConducted)],
    ["Classes Attended", fmtVal(a?.classesAttended), fmtVal(b?.classesAttended)],
    ["Total Subjects", String(a?.subjects.length ?? 0), String(b?.subjects.length ?? 0)],
    ["Active Backlogs", String(a?.backlogs ?? 0), String(b?.backlogs ?? 0)],
    ["Result Status", a?.resultStatus || "Not available", b?.resultStatus || "Not available"]
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-6 border-b border-border pb-4">
        <div className="space-y-2">
          <Label htmlFor="cmp-sem-a">Select Semester 1</Label>
          <Select id="cmp-sem-a" value={semAIdx} onChange={(e) => setSemAIdx(e.target.value)}>
            {semesters.map((s, idx) => (
              <option key={idx} value={idx}>
                Semester {s.semester} ({s.academicYear})
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cmp-sem-b">Select Semester 2</Label>
          <Select id="cmp-sem-b" value={semBIdx} onChange={(e) => setSemBIdx(e.target.value)}>
            {semesters.map((s, idx) => (
              <option key={idx} value={idx}>
                Semester {s.semester} ({s.academicYear})
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-[#141414] text-muted-foreground">
            <tr>
              <th className="border-b border-border px-4 py-3 text-left font-medium">Metric</th>
              <th className="border-b border-border px-4 py-3 text-left font-medium">
                Semester {a?.semester} ({a?.academicYear})
              </th>
              <th className="border-b border-border px-4 py-3 text-left font-medium">
                Semester {b?.semester} ({b?.academicYear})
              </th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map(([metric, valA, valB]) => (
              <tr key={metric} className="border-b border-border last:border-b-0 hover:bg-[#121212]">
                <td className="px-4 py-3 text-muted-foreground">{metric}</td>
                <td className="px-4 py-3 font-medium">{valA}</td>
                <td className="px-4 py-3 font-medium">{valB}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Performance Trend Visualizer ──────────────────────────────────────────────
function PerformanceTrendVisualizer({ trend }: { trend: PerformanceTrendPoint[] }) {
  if (trend.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No performance records available to display a trend.
      </p>
    );
  }

  if (trend.length === 1) {
    return (
      <div className="py-6 text-center space-y-2">
        <p className="text-sm font-medium">Only Semester {trend[0].semester} data is available.</p>
        <p className="text-xs text-muted-foreground">
          Not enough semester data to display a trend. At least two semesters are required.
        </p>
      </div>
    );
  }

  const chartData = trend.map((p) => ({
    label: `Sem ${p.semester}`,
    sgpa: p.sgpa,
    cgpa: p.cgpa,
    attendance: p.attendancePercentage
  }));

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold mb-3">Academic Performance Trend (SGPA & CGPA)</p>
        <div className="rounded-lg border border-border p-4 bg-[#090909]">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#242424" />
              <XAxis dataKey="label" tick={{ fill: "#A3A3A3", fontSize: 12 }} stroke="#242424" />
              <YAxis domain={[0, 10]} tick={{ fill: "#A3A3A3", fontSize: 12 }} stroke="#242424" />
              <Tooltip
                contentStyle={{ background: "#090909", border: "1px solid #242424", borderRadius: 6, color: "#fff" }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "#A3A3A3" }} />
              <Line
                type="monotone"
                dataKey="sgpa"
                name="SGPA"
                stroke="#FFFFFF"
                strokeWidth={2}
                dot={{ r: 4, fill: "#FFFFFF" }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="cgpa"
                name="CGPA"
                stroke="#A3A3A3"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 4, fill: "#A3A3A3" }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold mb-3">Attendance Progression (%)</p>
        <div className="rounded-lg border border-border p-4 bg-[#090909]">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#242424" />
              <XAxis dataKey="label" tick={{ fill: "#A3A3A3", fontSize: 12 }} stroke="#242424" />
              <YAxis domain={[0, 100]} tick={{ fill: "#A3A3A3", fontSize: 12 }} stroke="#242424" unit="%" />
              <Tooltip
                contentStyle={{ background: "#090909", border: "1px solid #242424", borderRadius: 6, color: "#fff" }}
                formatter={(v: any) => [v !== undefined && v !== null ? `${v}%` : "—", "Attendance"]}
              />
              <Line
                type="monotone"
                dataKey="attendance"
                name="Attendance %"
                stroke="#FFFFFF"
                strokeWidth={2}
                dot={{ r: 4, fill: "#FFFFFF" }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Tab definitions ───────────────────────────────────────────────────────────
type TabId = "overview" | "semesters" | "subjects" | "attendance" | "results" | "comparison" | "trend";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: User },
  { id: "semesters", label: "Semester Performance", icon: LayoutList },
  { id: "subjects", label: "Subjects", icon: BookOpen },
  { id: "attendance", label: "Attendance", icon: ClipboardCheck },
  { id: "results", label: "Results", icon: GraduationCap },
  { id: "comparison", label: "Comparison", icon: SlidersHorizontal },
  { id: "trend", label: "Trend", icon: TrendingUp }
];

// ─── Main Student Profile Page ────────────────────────────────────────────────
export function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Selected semester index for Subjects, Attendance, and Results tabs
  const [selectedSemesterIdx, setSelectedSemesterIdx] = useState("0");
  const [selectedSubjectModal, setSelectedSubjectModal] = useState<SubjectMapping | null>(null);

  // Attendance sub-filter
  const [attendanceSubjectFilter, setAttendanceSubjectFilter] = useState("");

  const profileReq = useAsync(() => api.studentProfile(id!), [id]);
  const trendReq = useAsync(() => api.studentPerformance(id!), [id]);

  async function handleDeleteStudent() {
    if (!student) return;
    setDeleting(true);
    try {
      const res = await api.deleteStudent(student._id);
      toast.success(res.message || `Deleted student ${student.rollNumber}.`);
      navigate("/students");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete student.");
      setDeleting(false);
    }
  }

  const profile = profileReq.data?.data;
  const student = profile?.student;
  const semesters = profile?.semesters ?? [];
  const trendData = trendReq.data?.data ?? [];

  const currentSemester = semesters[Number(selectedSemesterIdx)] || semesters[0];

  // Filtered attendance subjects in Attendance tab
  const filteredAttendanceSubjects = useMemo(() => {
    if (!currentSemester) return [];
    const subjects = currentSemester.subjects.filter((s) => s.hasAttendance);
    if (!attendanceSubjectFilter.trim()) return subjects;
    const term = attendanceSubjectFilter.trim().toLowerCase();
    return subjects.filter(
      (s) =>
        s.subjectName.toLowerCase().includes(term) ||
        (s.subjectCode && s.subjectCode.toLowerCase().includes(term))
    );
  }, [currentSemester, attendanceSubjectFilter]);

  if (profileReq.loading) {
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

  if (profileReq.error || !student) {
    return (
      <div className="space-y-4">
        <Link
          to="/students"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Students
        </Link>
        <Alert>{profileReq.error || "Student not found."}</Alert>
      </div>
    );
  }

  const batchObj = typeof student.batchId === "object" ? student.batchId : null;

  return (
    <div className="space-y-6">
      {/* Top back navigation */}
      <Link
        to="/students"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Students
      </Link>

      {/* Student identity header */}
      <div className="rounded-lg border border-border bg-[#090909] p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{student.name}</h1>
            <p className="mt-1 font-mono text-sm text-muted-foreground">{student.rollNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs uppercase">
              {student.status || "active"}
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              className="gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 border-red-900/50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Student
            </Button>
          </div>
        </div>

        <div className="grid gap-x-8 gap-y-2 text-sm md:grid-cols-3 pt-2 border-t border-border">
          <div>
            <span className="text-muted-foreground">Batch: </span>
            {batchObj ? (
              <Link to={`/batches/${batchObj._id}`} className="hover:underline font-medium">
                {batchObj.batchName}
              </Link>
            ) : (
              "—"
            )}
          </div>
          <div>
            <span className="text-muted-foreground">Department: </span>
            <span className="font-medium">{student.department}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Program: </span>
            <span className="font-medium">{student.program}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Current Year: </span>
            <span className="font-medium">{student.currentYear}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Current Section: </span>
            <span className="font-medium">{student.currentSection || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Admission Year: </span>
            <span className="font-medium">{student.admissionYear || "—"}</span>
          </div>
          {student.graduationYear && (
            <div>
              <span className="text-muted-foreground">Graduation Year: </span>
              <span className="font-medium">{student.graduationYear}</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto pb-px">
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button
            key={tid}
            onClick={() => setActiveTab(tid)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap border-b-2 font-medium transition-colors ${
              activeTab === tid
                ? "border-white text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: OVERVIEW ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Top actual database stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Current CGPA"
              value={profile.overallCgpa}
              subtext={profile.overallCgpa !== undefined ? "Derived from result records" : undefined}
            />
            <StatCard
              label="Overall Attendance"
              value={
                profile.overallAttendancePercentage !== undefined
                  ? `${profile.overallAttendancePercentage}%`
                  : undefined
              }
              subtext={
                profile.totalClassesConducted > 0
                  ? `${profile.totalClassesAttended} / ${profile.totalClassesConducted} classes`
                  : undefined
              }
            />
            <StatCard
              label="Semesters Recorded"
              value={semesters.length > 0 ? semesters.length : undefined}
              subtext="Dynamic academic semesters"
            />
            <StatCard
              label="Active Backlogs"
              value={semesters.reduce((sum, s) => sum + s.backlogs, 0)}
              subtext="Across all recorded semesters"
            />
          </div>

          {/* Dynamic Semester SGPA cards */}
          {semesters.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Semester-wise Performance Summary
              </p>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                {semesters.map((s) => (
                  <Card key={`${s.semester}-${s.academicYear}`}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">
                          Semester {s.semester}
                        </span>
                        <ConsistencyBadge
                          hasAttendance={s.attendancePercentage !== undefined}
                          hasResult={s.sgpa !== undefined}
                        />
                      </div>
                      <div className="mt-2 flex items-baseline justify-between">
                        <div>
                          <p className="text-xl font-bold">
                            {s.sgpa !== undefined ? (
                              s.sgpa
                            ) : (
                              <span className="text-sm font-normal text-muted-foreground">
                                Not available
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">SGPA</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">
                            {s.attendancePercentage !== undefined ? (
                              `${s.attendancePercentage}%`
                            ) : (
                              <span className="text-xs font-normal text-muted-foreground">
                                Not available
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">Attendance</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Full semester summary table */}
          {semesters.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  No academic attendance or result records have been uploaded for this student yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Academic Progression</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-[#141414] text-muted-foreground">
                      <tr>
                        {["Semester", "Academic Year", "Year", "SGPA", "CGPA", "Attendance", "Backlogs", "Status", "Data Status"].map(
                          (h) => (
                            <th key={h} className="border-b border-border px-4 py-3 text-left font-medium">
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {semesters.map((s) => (
                        <tr
                          key={`${s.semester}-${s.academicYear}`}
                          className="border-b border-border last:border-b-0 hover:bg-[#121212]"
                        >
                          <td className="px-4 py-3 font-semibold">Semester {s.semester}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.academicYear}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.year}</td>
                          <td className="px-4 py-3 font-mono font-medium">
                            {s.sgpa !== undefined ? s.sgpa : <span className="text-muted-foreground">Not available</span>}
                          </td>
                          <td className="px-4 py-3 font-mono font-medium">
                            {s.cgpa !== undefined ? s.cgpa : <span className="text-muted-foreground">Not available</span>}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {s.attendancePercentage !== undefined ? (
                              `${s.attendancePercentage}%`
                            ) : (
                              <span className="text-muted-foreground">Not available</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono">{s.backlogs}</td>
                          <td className="px-4 py-3 capitalize">{s.resultStatus || "—"}</td>
                          <td className="px-4 py-3">
                            <ConsistencyBadge
                              hasAttendance={s.attendancePercentage !== undefined}
                              hasResult={s.sgpa !== undefined}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── TAB 2: SEMESTER PERFORMANCE ── */}
      {activeTab === "semesters" && (
        <Card>
          <CardHeader>
            <CardTitle>Semester-wise Academic History</CardTitle>
          </CardHeader>
          <CardContent>
            {semesters.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No semester records found.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-[#141414] text-muted-foreground">
                    <tr>
                      {["Semester", "Academic Year", "Year", "SGPA", "CGPA", "Attendance %", "Conducted", "Attended", "Backlogs", "Result Status", "Consistency"].map(
                        (h) => (
                          <th key={h} className="border-b border-border px-4 py-3 text-left font-medium">
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {semesters.map((s) => (
                      <tr
                        key={`${s.semester}-${s.academicYear}`}
                        className="border-b border-border last:border-b-0 hover:bg-[#121212]"
                      >
                        <td className="px-4 py-3 font-semibold">Semester {s.semester}</td>
                        <td className="px-4 py-3">{s.academicYear}</td>
                        <td className="px-4 py-3">{s.year}</td>
                        <td className="px-4 py-3 font-mono font-medium">
                          {s.sgpa !== undefined ? s.sgpa : <span className="text-muted-foreground">Not available</span>}
                        </td>
                        <td className="px-4 py-3 font-mono font-medium">
                          {s.cgpa !== undefined ? s.cgpa : <span className="text-muted-foreground">Not available</span>}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {s.attendancePercentage !== undefined ? (
                            `${s.attendancePercentage}%`
                          ) : (
                            <span className="text-muted-foreground">Not available</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {s.classesConducted ?? <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {s.classesAttended ?? <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 font-mono">{s.backlogs}</td>
                        <td className="px-4 py-3 capitalize">{s.resultStatus || "—"}</td>
                        <td className="px-4 py-3">
                          <ConsistencyBadge
                            hasAttendance={s.attendancePercentage !== undefined}
                            hasResult={s.sgpa !== undefined}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── TAB 3: SUBJECTS (Mapped Attendance + Result) ── */}
      {activeTab === "subjects" && (
        <div className="space-y-5">
          {semesters.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-sm text-muted-foreground">No semester data available.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sub-sem-select">Select Semester</Label>
                  <Select
                    id="sub-sem-select"
                    value={selectedSemesterIdx}
                    onChange={(e) => {
                      setSelectedSemesterIdx(e.target.value);
                      setSelectedSubjectModal(null);
                    }}
                  >
                    {semesters.map((s, idx) => (
                      <option key={idx} value={idx}>
                        Semester {s.semester} — {s.academicYear}
                      </option>
                    ))}
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Click any subject row to inspect detailed metrics
                </p>
              </div>

              {currentSemester && (
                <Card>
                  <CardHeader className="border-b border-border pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle>
                        Semester {currentSemester.semester} Subjects ({currentSemester.academicYear})
                      </CardTitle>
                      <span className="text-xs text-muted-foreground">
                        {currentSemester.subjects.length} subjects recorded
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5">
                    {currentSemester.subjects.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">
                        No subject records found for this semester.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="min-w-full border-collapse text-sm">
                          <thead className="bg-[#141414] text-muted-foreground">
                            <tr>
                              {[
                                "Subject Name",
                                "Subject Code",
                                "Conducted",
                                "Attended",
                                "Attendance %",
                                "Grade",
                                "Grade Point",
                                "Credits",
                                "Status",
                                "Record Status"
                              ].map((h) => (
                                <th key={h} className="border-b border-border px-4 py-3 text-left font-medium">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {currentSemester.subjects.map((sub) => (
                              <tr
                                key={sub.subjectCode || sub.subjectName}
                                className="border-b border-border last:border-b-0 hover:bg-[#161616] cursor-pointer transition-colors"
                                onClick={() => setSelectedSubjectModal(sub)}
                              >
                                <td className="px-4 py-3 font-medium text-foreground">
                                  {sub.subjectName}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                  {sub.subjectCode || "—"}
                                </td>
                                <td className="px-4 py-3 font-mono">
                                  {sub.hasAttendance ? (
                                    sub.classesConducted
                                  ) : (
                                    <span className="text-muted-foreground text-xs">Not available</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 font-mono">
                                  {sub.hasAttendance ? (
                                    sub.classesAttended
                                  ) : (
                                    <span className="text-muted-foreground text-xs">Not available</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 font-mono font-medium">
                                  {sub.hasAttendance && sub.attendancePercentage !== undefined ? (
                                    <span
                                      className={
                                        sub.attendancePercentage < 75
                                          ? "text-destructive font-semibold"
                                          : ""
                                      }
                                    >
                                      {sub.attendancePercentage}%
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">Not available</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 font-mono font-semibold">
                                  {sub.hasResult ? (
                                    sub.grade || "—"
                                  ) : (
                                    <span className="text-muted-foreground text-xs font-normal">Not available</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 font-mono">
                                  {sub.hasResult ? (
                                    sub.gradePoint ?? "—"
                                  ) : (
                                    <span className="text-muted-foreground text-xs">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 font-mono">
                                  {sub.credits ?? <span className="text-muted-foreground text-xs">—</span>}
                                </td>
                                <td className="px-4 py-3 capitalize">
                                  {sub.hasResult ? sub.resultStatus || "—" : <span className="text-muted-foreground text-xs">—</span>}
                                </td>
                                <td className="px-4 py-3">
                                  <ConsistencyBadge
                                    hasAttendance={sub.hasAttendance}
                                    hasResult={sub.hasResult}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Modal when subject is clicked */}
          {selectedSubjectModal && currentSemester && (
            <SubjectDetailModal
              subject={selectedSubjectModal}
              semester={currentSemester}
              onClose={() => setSelectedSubjectModal(null)}
            />
          )}
        </div>
      )}

      {/* ── TAB 4: ATTENDANCE VIEW ── */}
      {activeTab === "attendance" && (
        <div className="space-y-5">
          {semesters.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-sm text-muted-foreground">No attendance records found.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Semester picker & subject search */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="att-sem-picker">Semester</Label>
                  <Select
                    id="att-sem-picker"
                    value={selectedSemesterIdx}
                    onChange={(e) => setSelectedSemesterIdx(e.target.value)}
                  >
                    {semesters.map((s, idx) => (
                      <option key={idx} value={idx}>
                        Semester {s.semester} ({s.academicYear})
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="att-subj-filter">Filter by Subject</Label>
                  <Input
                    id="att-subj-filter"
                    placeholder="Search subject code or name..."
                    value={attendanceSubjectFilter}
                    onChange={(e) => setAttendanceSubjectFilter(e.target.value)}
                  />
                </div>
              </div>

              {/* Attendance metrics */}
              <div className="grid gap-4 md:grid-cols-4">
                <StatCard
                  label="Overall Attendance"
                  value={
                    profile.overallAttendancePercentage !== undefined
                      ? `${profile.overallAttendancePercentage}%`
                      : undefined
                  }
                  subtext="All uploaded semesters"
                />
                <StatCard
                  label="Semester Attendance"
                  value={
                    currentSemester?.attendancePercentage !== undefined
                      ? `${currentSemester.attendancePercentage}%`
                      : undefined
                  }
                  subtext={`Semester ${currentSemester?.semester}`}
                />
                <StatCard
                  label="Classes Conducted"
                  value={currentSemester?.classesConducted}
                  subtext={`Semester ${currentSemester?.semester}`}
                />
                <StatCard
                  label="Classes Attended"
                  value={currentSemester?.classesAttended}
                  subtext={`Semester ${currentSemester?.semester}`}
                />
              </div>

              {/* Table */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    Subject Attendance — Semester {currentSemester?.semester} ({currentSemester?.academicYear})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredAttendanceSubjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                      {attendanceSubjectFilter
                        ? "No subjects match your filter."
                        : "Attendance records are not available for this semester."}
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="min-w-full border-collapse text-sm">
                        <thead className="bg-[#141414] text-muted-foreground">
                          <tr>
                            {["Subject Name", "Subject Code", "Classes Conducted", "Classes Attended", "Attendance %"].map(
                              (h) => (
                                <th key={h} className="border-b border-border px-4 py-3 text-left font-medium">
                                  {h}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAttendanceSubjects.map((sub) => (
                            <tr
                              key={sub.subjectCode || sub.subjectName}
                              className="border-b border-border last:border-b-0 hover:bg-[#121212]"
                            >
                              <td className="px-4 py-3 font-medium">{sub.subjectName}</td>
                              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                {sub.subjectCode || "—"}
                              </td>
                              <td className="px-4 py-3 font-mono">{sub.classesConducted}</td>
                              <td className="px-4 py-3 font-mono">{sub.classesAttended}</td>
                              <td className="px-4 py-3 font-mono font-medium">
                                <span
                                  className={
                                    sub.attendancePercentage !== undefined && sub.attendancePercentage < 75
                                      ? "text-destructive font-semibold"
                                      : ""
                                  }
                                >
                                  {sub.attendancePercentage !== undefined ? `${sub.attendancePercentage}%` : "—"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── TAB 5: RESULTS VIEW ── */}
      {activeTab === "results" && (
        <div className="space-y-5">
          {semesters.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-sm text-muted-foreground">No result records found.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Semester picker */}
              <div className="space-y-2 max-w-sm">
                <Label htmlFor="res-sem-picker">Semester</Label>
                <Select
                  id="res-sem-picker"
                  value={selectedSemesterIdx}
                  onChange={(e) => setSelectedSemesterIdx(e.target.value)}
                >
                  {semesters.map((s, idx) => (
                    <option key={idx} value={idx}>
                      Semester {s.semester} ({s.academicYear})
                    </option>
                  ))}
                </Select>
              </div>

              {/* Result cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <StatCard
                  label="Semester SGPA"
                  value={currentSemester?.sgpa}
                  subtext={`Semester ${currentSemester?.semester}`}
                />
                <StatCard
                  label="Cumulative CGPA"
                  value={currentSemester?.cgpa}
                  subtext={`Up to Semester ${currentSemester?.semester}`}
                />
                <StatCard
                  label="Backlogs in Semester"
                  value={currentSemester?.backlogs}
                />
                <StatCard
                  label="Result Status"
                  value={currentSemester?.resultStatus || "—"}
                />
              </div>

              {/* Subject result table */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    Subject Grades — Semester {currentSemester?.semester} ({currentSemester?.academicYear})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentSemester?.subjects.filter((s) => s.hasResult).length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                      Result data is not available for Semester {currentSemester?.semester}.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="min-w-full border-collapse text-sm">
                        <thead className="bg-[#141414] text-muted-foreground">
                          <tr>
                            {["Subject Name", "Subject Code", "Grade", "Grade Point", "Credits", "Status"].map(
                              (h) => (
                                <th key={h} className="border-b border-border px-4 py-3 text-left font-medium">
                                  {h}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {currentSemester.subjects
                            .filter((s) => s.hasResult)
                            .map((sub) => (
                              <tr
                                key={sub.subjectCode || sub.subjectName}
                                className="border-b border-border last:border-b-0 hover:bg-[#121212]"
                              >
                                <td className="px-4 py-3 font-medium">{sub.subjectName}</td>
                                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                  {sub.subjectCode || "—"}
                                </td>
                                <td className="px-4 py-3 font-mono font-semibold">{sub.grade || "—"}</td>
                                <td className="px-4 py-3 font-mono">{sub.gradePoint ?? "—"}</td>
                                <td className="px-4 py-3 font-mono">{sub.credits ?? "—"}</td>
                                <td className="px-4 py-3 capitalize">{sub.resultStatus || "—"}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── TAB 6: COMPARISON ── */}
      {activeTab === "comparison" && (
        <Card>
          <CardHeader>
            <CardTitle>Semester Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <SemesterComparison semesters={semesters} />
          </CardContent>
        </Card>
      )}

      {/* ── TAB 7: TREND ── */}
      {activeTab === "trend" && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {trendReq.loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <PerformanceTrendVisualizer trend={trendData} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Modal for Delete Student */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h2 className="text-lg font-semibold text-white">Delete Student & All Records?</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong className="text-white">{student.rollNumber}</strong> ({student.name})?
            </p>
            <p className="text-xs text-red-400">
              This will permanently delete this student along with all their attendance records and examination results across all semesters. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteStudent}
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
