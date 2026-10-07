import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Users, Layers, Upload, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { Alert } from "../components/ui/alert";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { useAsync } from "../hooks/useAsync";
import { formatDate } from "../lib/utils";
import { api } from "../services/api";
import type { Student } from "../types/api";

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useAsync(() => api.dashboard(), []);
  const summary = data?.data;

  // Global Student Search
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setSearchLoading(true);
      const params = new URLSearchParams({ search: searchTerm.trim(), pageSize: "5" });
      api.students(params)
        .then((res) => setSearchResults(res.data || []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchResults.length === 1) {
      navigate(`/students/${searchResults[0]._id}`);
    } else if (searchTerm.trim()) {
      navigate(`/students?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  }

  const stats = summary
    ? [
        ["Total Students", summary.totalStudents, "Active student enrollment records"],
        ["Total Batches", summary.totalBatches, "Configured academic cohorts"],
        ["Total Sections", summary.totalSections, "Assigned class sections"],
        ["Uploaded Semesters", summary.uploadedSemesters, "Semesters with academic data"],
        ["Attendance Records", summary.attendanceRecords, "Total subject attendance rows"],
        ["Result Records", summary.resultRecords, "Total exam and grade entries"]
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Academic Management and Department Analytics
        </p>
      </div>

      {error && <Alert>{error}</Alert>}

      {/* Global Student Search Card */}
      <Card className="border-border bg-[#090909]">
        <CardContent className="pt-5 space-y-3">
          <div>
            <p className="text-sm font-semibold">Student Academic Lookup</p>
            <p className="text-xs text-muted-foreground">
              Search by roll number or student name to immediately open an academic profile
            </p>
          </div>
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 font-mono text-sm"
                  placeholder="Enter roll number (e.g. 25881A6601) or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </div>

            {/* Dropdown Results */}
            {searchTerm.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-md border border-border bg-[#141414] shadow-xl">
                {searchLoading ? (
                  <p className="p-3 text-xs text-muted-foreground">Searching database...</p>
                ) : searchResults.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground">No students found matching "{searchTerm}".</p>
                ) : (
                  <div className="divide-y divide-border/60">
                    {searchResults.map((s) => (
                      <Link
                        key={s._id}
                        to={`/students/${s._id}`}
                        onClick={() => setSearchTerm("")}
                        className="flex items-center justify-between p-3 text-sm hover:bg-secondary/60 transition-colors"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{s.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {s.rollNumber} · {s.department} · {s.currentYear}
                            {s.currentSection ? ` · Sec ${s.currentSection}` : ""}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Database Summary Stats */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      ) : summary ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {stats.map(([label, value, desc]) => (
              <Card key={label as string}>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className="mt-2 text-3xl font-bold">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Uploads */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Recent Academic Uploads</CardTitle>
              <Link to="/uploads" className="text-xs text-muted-foreground hover:text-foreground">
                View all uploads
              </Link>
            </CardHeader>
            <CardContent>
              {summary.recentUploads.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No uploaded files recorded in the database.</p>
              ) : (
                <div className="space-y-3">
                  {summary.recentUploads.map((upload) => (
                    <div
                      key={upload._id}
                      className="flex items-center justify-between border-b border-border pb-3 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{upload.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="capitalize">{upload.dataType}</span> · Semester {upload.semester} · {upload.department}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono text-muted-foreground">
                          {upload.processedRows} rows processed
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(upload.uploadedAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No database summary available.</p>
      )}
    </div>
  );
}
