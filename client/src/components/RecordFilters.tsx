import { Search } from "lucide-react";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Label } from "./ui/label";
import type { Batch } from "../types/api";

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

interface RecordFiltersProps {
  batches: Batch[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  includeSemester?: boolean;
  includeSubject?: boolean;
  includeDepartment?: boolean;
  searchPlaceholder?: string;
}

export function RecordFilters({
  batches,
  values,
  onChange,
  includeSemester,
  includeSubject,
  includeDepartment,
  searchPlaceholder = "Roll number or name..."
}: RecordFiltersProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="filter-search">Search</Label>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="filter-search"
            className="pl-9"
            placeholder={searchPlaceholder}
            value={values.search || ""}
            onChange={(e) => onChange("search", e.target.value)}
          />
        </div>
      </div>

      {/* Batch */}
      <div className="space-y-2">
        <Label htmlFor="filter-batch">Batch</Label>
        <Select
          id="filter-batch"
          value={values.batchId || ""}
          onChange={(e) => onChange("batchId", e.target.value)}
        >
          <option value="">All batches</option>
          {batches.map((batch) => (
            <option key={batch._id} value={batch._id}>
              {batch.batchName}
            </option>
          ))}
        </Select>
      </div>

      {/* Academic Year */}
      <div className="space-y-2">
        <Label htmlFor="filter-academicYear">Academic Year</Label>
        <Input
          id="filter-academicYear"
          placeholder="e.g. 2025-26"
          value={values.academicYear || ""}
          onChange={(e) => onChange("academicYear", e.target.value)}
        />
      </div>

      {/* Year */}
      <div className="space-y-2">
        <Label htmlFor="filter-year">Year</Label>
        <Input
          id="filter-year"
          placeholder="e.g. I B.Tech"
          value={values.year || ""}
          onChange={(e) => onChange("year", e.target.value)}
        />
      </div>

      {/* Semester */}
      {includeSemester && (
        <div className="space-y-2">
          <Label htmlFor="filter-semester">Semester</Label>
          <Select
            id="filter-semester"
            value={values.semester || ""}
            onChange={(e) => onChange("semester", e.target.value)}
          >
            <option value="">All semesters</option>
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* Department */}
      {includeDepartment && (
        <div className="space-y-2">
          <Label htmlFor="filter-department">Department</Label>
          <Input
            id="filter-department"
            placeholder="e.g. CSM"
            value={values.department || ""}
            onChange={(e) => onChange("department", e.target.value)}
          />
        </div>
      )}

      {/* Section */}
      <div className="space-y-2">
        <Label htmlFor="filter-section">Section</Label>
        <Input
          id="filter-section"
          placeholder="e.g. A"
          value={values.section || ""}
          onChange={(e) => onChange("section", e.target.value)}
        />
      </div>

      {/* Subject */}
      {includeSubject && (
        <div className="space-y-2">
          <Label htmlFor="filter-subject">Subject</Label>
          <Input
            id="filter-subject"
            placeholder="Name or code..."
            value={values.subject || ""}
            onChange={(e) => onChange("subject", e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
