import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PropertiesManagement from "./pages/PropertiesManagement";
import BookingsManagement from "./pages/BookingsManagement";
import PaymentsManagement from "./pages/PaymentsManagement";
import UsersManagement from "./pages/UsersManagement";
import AdminLayout from "./components/AdminLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <div className="flex h-screen items-center justify-center text-muted-foreground">Access denied. Admin only.</div>;
  return <>{children}</>;
};

const LoginRedirect = () => {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (user && isAdmin) return <Navigate to="/dashboard" replace />;
  return <LoginPage />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginRedirect />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/properties" element={<PropertiesManagement />} />
                <Route path="/bookings" element={<BookingsManagement />} />
                <Route path="/payments" element={<PaymentsManagement />} />
                <Route path="/users" element={<UsersManagement />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);
export default App;
