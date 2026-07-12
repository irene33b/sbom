import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import AppShell from "./components/AppShell";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AnalyzerHome from "./pages/AnalyzerHome";
import AppDetail from "./pages/AppDetail";
import Evaluation from "./pages/Evaluation";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Dashboard />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analyzer"
            element={
              <AdminRoute>
                <AppShell>
                  <AnalyzerHome />
                </AppShell>
              </AdminRoute>
            }
          />
          <Route
            path="/analyzer/:appId"
            element={
              <AdminRoute>
                <AppShell>
                  <AppDetail />
                </AppShell>
              </AdminRoute>
            }
          />
          <Route
            path="/evaluation"
            element={
              <AdminRoute>
                <AppShell>
                  <Evaluation />
                </AppShell>
              </AdminRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
