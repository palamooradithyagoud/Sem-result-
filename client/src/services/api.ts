import type {
  AttendanceRecord,
  Batch,
  BatchStudentsResponse,
  FilterOptions,
  Paginated,
  PerformanceTrendPoint,
  ResultRecord,
  SectionStudentRow,
  Student,
  StudentAcademicProfile,
  SubjectMapping,
  UploadPreview,
  UploadRecord
} from "../types/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

function getToken() {
  return localStorage.getItem("authToken");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "Request failed.");
  }

  return response.json();
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const response = await request<{ token: string; user: { name: string; email: string } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem("authToken", response.token);
    return response;
  },
  async logout() {
    await request("/auth/logout", { method: "POST" });
    localStorage.removeItem("authToken");
  },

  // Dashboard
  dashboard() {
    return request<{
      data: {
        totalStudents: number;
        totalBatches: number;
        totalSections: number;
        uploadedSemesters: number;
        attendanceRecords: number;
        resultRecords: number;
        recentUploads: UploadRecord[];
      };
    }>("/dashboard/summary");
  },

  // Batches
  batches() {
    return request<{ data: Batch[] }>("/batches");
  },
  createBatch(batch: Omit<Batch, "_id">) {
    return request<{ data: Batch }>("/batches", { method: "POST", body: JSON.stringify(batch) });
  },
  batchStudents(batchId: string, params = new URLSearchParams()) {
    return request<BatchStudentsResponse>(`/batches/${batchId}/students?${params}`);
  },

  // Students
  students(params: URLSearchParams) {
    return request<Paginated<Student>>(`/students?${params}`);
  },
  student(id: string) {
    return request<{ data: Student }>(`/students/${id}`);
  },
  studentProfile(id: string) {
    return request<{ data: StudentAcademicProfile }>(`/students/${id}/profile`);
  },
  studentPerformance(id: string) {
    return request<{ data: PerformanceTrendPoint[] }>(`/students/${id}/performance`);
  },
  studentSemesters(id: string) {
    return request<{ data: StudentAcademicProfile["semesters"] }>(`/students/${id}/semesters`);
  },
  studentAttendance(id: string, params = new URLSearchParams()) {
    return request<{ data: AttendanceRecord[] }>(`/students/${id}/attendance?${params}`);
  },
  studentResults(id: string, params = new URLSearchParams()) {
    return request<{ data: ResultRecord[] }>(`/students/${id}/results?${params}`);
  },
  studentSubjects(id: string, params = new URLSearchParams()) {
    return request<{ data: SubjectMapping[] }>(`/students/${id}/subjects?${params}`);
  },

  // Academic filters & meta
  academicFilterOptions(params = new URLSearchParams()) {
    return request<{ data: FilterOptions }>(`/academic/filter-options?${params}`);
  },
  academicSemesters(params = new URLSearchParams()) {
    return request<{ data: number[] }>(`/academic/semesters?${params}`);
  },
  academicSubjects(params = new URLSearchParams()) {
    return request<{ data: { _id: string; code?: string; name: string; department?: string; credits?: number }[] }>(
      `/academic/subjects?${params}`
    );
  },

  // Attendance
  attendance(params: URLSearchParams) {
    return request<Paginated<AttendanceRecord>>(`/attendance?${params}`);
  },

  // Results
  results(params: URLSearchParams) {
    return request<Paginated<ResultRecord>>(`/results?${params}`);
  },

  // Sections
  sectionView(params: URLSearchParams) {
    return request<Paginated<SectionStudentRow>>(`/sections?${params}`);
  },

  // Uploads
  uploads(params = new URLSearchParams()) {
    return request<Paginated<UploadRecord>>(`/uploads?${params}`);
  },
  uploadDetail(id: string) {
    return request<{ data: UploadRecord }>(`/uploads/${id}`);
  },
  previewUpload(kind: "attendance" | "results", form: FormData) {
    return request<{ data: UploadPreview }>(`/uploads/${kind}/preview`, { method: "POST", body: form });
  },
  processUpload(kind: "attendance" | "results", form: FormData) {
    return request<{ data: UploadRecord }>(`/uploads/${kind}/process`, { method: "POST", body: form });
  },
  deleteUpload(id: string) {
    return request<{ message: string; data: { deletedRecords: number; uploadId: string } }>(`/uploads/${id}`, {
      method: "DELETE"
    });
  },
  deleteAttendanceRecord(id: string) {
    return request<{ message: string }>(`/attendance/${id}`, { method: "DELETE" });
  },
  deleteResultRecord(id: string) {
    return request<{ message: string }>(`/results/${id}`, { method: "DELETE" });
  },
  deleteStudent(id: string) {
    return request<{ message: string }>(`/students/${id}`, { method: "DELETE" });
  },
  deleteBatch(id: string) {
    return request<{ message: string }>(`/batches/${id}`, { method: "DELETE" });
  }
};
