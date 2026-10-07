import React from "react";
import ReactDOM from "react-dom/client";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import "./index.css";
import { AppLayout } from "./layouts/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { BatchesPage } from "./pages/BatchesPage";
import { BatchDetailPage } from "./pages/BatchDetailPage";
import { UploadPage } from "./pages/UploadPage";
import { StudentsPage } from "./pages/StudentsPage";
import { StudentProfilePage } from "./pages/StudentProfilePage";
import { AttendancePage } from "./pages/AttendancePage";
import { ResultsPage } from "./pages/ResultsPage";
import { SectionViewPage } from "./pages/SectionViewPage";
import { UploadHistoryPage } from "./pages/UploadHistoryPage";

function Protected({ children }: { children: React.ReactNode }) {
  return localStorage.getItem("authToken") ? children : <Navigate to="/login" replace />;
}

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <Protected>
        <AppLayout />
      </Protected>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "batches", element: <BatchesPage /> },
      { path: "batches/:id", element: <BatchDetailPage /> },
      { path: "upload", element: <UploadPage /> },
      { path: "students", element: <StudentsPage /> },
      { path: "students/:id", element: <StudentProfilePage /> },
      { path: "sections", element: <SectionViewPage /> },
      { path: "attendance", element: <AttendancePage /> },
      { path: "results", element: <ResultsPage /> },
      { path: "uploads", element: <UploadHistoryPage /> }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <Toaster theme="dark" richColors closeButton />
  </React.StrictMode>
);
