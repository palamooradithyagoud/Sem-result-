import { useEffect, useState } from "react";
import { Search, RotateCcw } from "lucide-react";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { api } from "../services/api";
import type { FilterOptions } from "../types/api";

interface AcademicFiltersProps {
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onReset?: () => void;
  includeSearch?: boolean;
  includeSemester?: boolean;
  includeSection?: boolean;
  includeSubject?: boolean;
  includeDepartment?: boolean;
  includeYear?: boolean;
  searchPlaceholder?: string;
}

export function AcademicFilters({
  values,
  onChange,
  onReset,
  includeSearch = true,
  includeSemester = true,
  includeSection = true,
  includeSubject = false,
  includeDepartment = true,
  includeYear = true,
  searchPlaceholder = "Roll number or name..."
}: AcademicFiltersProps) {
  const [options, setOptions] = useState<FilterOptions>({
    batches: [],
    academicYears: [],
    semesters: [],
    sections: [],
    departments: [],
    subjects: []
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(values.search || "");

  useEffect(() => {
    setSearchTerm(values.search || "");
  }, [values.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== (values.search || "")) {
        onChange("search", searchTerm);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch dependent options when batchId, department, or academicYear changes
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (values.batchId) params.set("batchId", values.batchId);
    if (values.department) params.set("department", values.department);
    if (values.academicYear) params.set("academicYear", values.academicYear);
    if (values.semester) params.set("semester", values.semester);

    setLoading(true);
    api.academicFilterOptions(params)
      .then((res) => {
        if (active && res.data) {
          setOptions(res.data);
        }
      })
      .catch(() => {
        // fallback gracefully
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [values.batchId, values.department, values.academicYear, values.semester]);

  function handleBatchChange(val: string) {
    onChange("batchId", val);
    // When batch changes, reset dependent fields if they don't apply
    if (!val) {
      onChange("academicYear", "");
      onChange("semester", "");
      onChange("section", "");
      onChange("subject", "");
    }
  }

  function handleAcademicYearChange(val: string) {
    onChange("academicYear", val);
    if (!val) {
      onChange("semester", "");
      onChange("subject", "");
    }
  }

  const hasActiveFilters = Object.values(values).some(Boolean);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        {includeSearch && (
          <div className="space-y-2">
            <Label htmlFor="academic-filter-search">Search</Label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="academic-filter-search"
                className="pl-9 font-mono text-sm"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Batch */}
        <div className="space-y-2">
          <Label htmlFor="academic-filter-batch">Batch</Label>
          <Select
            id="academic-filter-batch"
            value={values.batchId || ""}
            onChange={(e) => handleBatchChange(e.target.value)}
          >
            <option value="">All batches</option>
            {options.batches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.batchName} ({b.department})
              </option>
            ))}
          </Select>
        </div>

        {/* Academic Year */}
        <div className="space-y-2">
          <Label htmlFor="academic-filter-ay">Academic Year</Label>
          {options.academicYears.length > 0 ? (
            <Select
              id="academic-filter-ay"
              value={values.academicYear || ""}
              onChange={(e) => handleAcademicYearChange(e.target.value)}
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
              id="academic-filter-ay"
              placeholder="e.g. 2025-26"
              value={values.academicYear || ""}
              onChange={(e) => handleAcademicYearChange(e.target.value)}
            />
          )}
        </div>

        {/* Semester */}
        {includeSemester && (
          <div className="space-y-2">
            <Label htmlFor="academic-filter-sem">Semester</Label>
            <Select
              id="academic-filter-sem"
              value={values.semester || ""}
              onChange={(e) => onChange("semester", e.target.value)}
            >
              <option value="">All semesters</option>
              {options.semesters.length > 0
                ? options.semesters.map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))
                : [1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
            </Select>
          </div>
        )}

        {/* Year */}
        {includeYear && (
          <div className="space-y-2">
            <Label htmlFor="academic-filter-year">Year</Label>
            <Input
              id="academic-filter-year"
              placeholder="e.g. I B.Tech"
              value={values.year || ""}
              onChange={(e) => onChange("year", e.target.value)}
            />
          </div>
        )}

        {/* Section */}
        {includeSection && (
          <div className="space-y-2">
            <Label htmlFor="academic-filter-section">Section</Label>
            {options.sections.length > 0 ? (
              <Select
                id="academic-filter-section"
                value={values.section || ""}
                onChange={(e) => onChange("section", e.target.value)}
              >
                <option value="">All sections</option>
                {options.sections.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                id="academic-filter-section"
                placeholder="e.g. A"
                value={values.section || ""}
                onChange={(e) => onChange("section", e.target.value)}
              />
            )}
          </div>
        )}

        {/* Department */}
        {includeDepartment && (
          <div className="space-y-2">
            <Label htmlFor="academic-filter-dept">Department</Label>
            {options.departments.length > 0 ? (
              <Select
                id="academic-filter-dept"
                value={values.department || ""}
                onChange={(e) => onChange("department", e.target.value)}
              >
                <option value="">All departments</option>
                {options.departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                id="academic-filter-dept"
                placeholder="e.g. CSM"
                value={values.department || ""}
                onChange={(e) => onChange("department", e.target.value)}
              />
            )}
          </div>
        )}

        {/* Subject */}
        {includeSubject && (
          <div className="space-y-2">
            <Label htmlFor="academic-filter-subject">Subject</Label>
            {options.subjects.length > 0 ? (
              <Select
                id="academic-filter-subject"
                value={values.subject || ""}
                onChange={(e) => onChange("subject", e.target.value)}
              >
                <option value="">All subjects</option>
                {options.subjects.map((sub) => (
                  <option key={sub.subjectCode || sub.subjectName} value={sub.subjectCode || sub.subjectName}>
                    {sub.subjectName} {sub.subjectCode ? `(${sub.subjectCode})` : ""}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                id="academic-filter-subject"
                placeholder="Code or name..."
                value={values.subject || ""}
                onChange={(e) => onChange("subject", e.target.value)}
              />
            )}
          </div>
        )}
      </div>

      {onReset && hasActiveFilters && (
        <div className="flex justify-end pt-1">
          <Button variant="secondary" size="sm" onClick={onReset} className="gap-2 text-xs">
            <RotateCcw className="h-3 w-3" />
            Reset filters
          </Button>
        </div>
      )}
    </div>
  );
}
