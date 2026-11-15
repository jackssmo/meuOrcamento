import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext";
import { FinancialProvider } from "./contexts/FinancialContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";

// Páginas
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { Transactions } from "./pages/Transactions";
import { Planning } from "./pages/Planning";
import { Settings } from "./pages/Settings";

export function App() {
  return (
    <AuthProvider>
      <FinancialProvider>
        <BrowserRouter>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#152e22",
                color: "#fbf9f4",
                border: "1px solid #1f3d30",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: 600,
              },
              success: {
                iconTheme: {
                  primary: "#5bc48a",
                  secondary: "#152e22",
                },
              },
              error: {
                iconTheme: {
                  primary: "#b33a3a",
                  secondary: "#fdf4f4",
                },
              },
            }}
          />

          <Routes>
            {/* Rotas Públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Rotas Autenticadas com Shell de Layout Global */}
            <Route element={<ProtectedRoute />}>
              <Route
                element={
                  <AppLayout>
                    <Outlet />
                  </AppLayout>
                }
              >
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/planning" element={<Planning />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/profile" element={<Navigate to="/settings" replace />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </FinancialProvider>
    </AuthProvider>
  );
}

export default App;
