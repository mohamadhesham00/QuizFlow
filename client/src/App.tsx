import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { getCurrentUser } from "./lib/auth";
import { LoginPage } from "./pages/auth/LoginPage";
import { StudentPortalPage } from "./pages/student/StudentPortalPage";
import { LiveExamPage } from "./pages/student/LiveExamPage";
import { StudentResultPage } from "./pages/student/StudentResultPage";
import { ExamBuilderPage } from "./pages/teacher/ExamBuilderPage";
import { QuestionCrudPage } from "./pages/teacher/QuestionCrudPage";
import { ResultsExportPage } from "./pages/teacher/ResultsExportPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";

function HomeRedirect() {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "teacher") {
    return <Navigate to="/teacher/questions/manage" replace />;
  }

  return <Navigate to="/student" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/teacher/questions/manage"
        element={
          <ProtectedRoute
            allowRoles={["teacher"]}
            element={
              <AppShell>
                <QuestionCrudPage />
              </AppShell>
            }
          />
        }
      />
      <Route
        path="/teacher/questions"
        element={<Navigate to="/teacher/questions/manage" replace />}
      />
      <Route
        path="/teacher/exams"
        element={
          <ProtectedRoute
            allowRoles={["teacher"]}
            element={
              <AppShell>
                <ExamBuilderPage />
              </AppShell>
            }
          />
        }
      />
      <Route
        path="/teacher/results"
        element={
          <ProtectedRoute
            allowRoles={["teacher"]}
            element={
              <AppShell>
                <ResultsExportPage />
              </AppShell>
            }
          />
        }
      />

      <Route
        path="/student"
        element={
          <ProtectedRoute
            allowRoles={["student"]}
            element={
              <AppShell>
                <StudentPortalPage />
              </AppShell>
            }
          />
        }
      />
      <Route
        path="/student/live"
        element={
          <ProtectedRoute
            allowRoles={["student"]}
            element={
              <AppShell>
                <LiveExamPage />
              </AppShell>
            }
          />
        }
      />
      <Route
        path="/student/result"
        element={
          <ProtectedRoute
            allowRoles={["student"]}
            element={
              <AppShell>
                <StudentResultPage />
              </AppShell>
            }
          />
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
