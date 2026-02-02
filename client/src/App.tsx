import { Suspense, lazy } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";

// Lazy-loaded pages
const LoginPage = lazy(() => import("@/features/auth/page"));
const DashboardPage = lazy(() => import("@/features/dashboard/page"));
const ComercialPage = lazy(() => import("@/features/comercial/page"));
const OperacionesPage = lazy(() => import("@/features/operaciones/page"));
const SurveyFormPage = lazy(() => import("@/features/operaciones/components/SurveyForm"));
const SubproductosPage = lazy(() => import("@/features/subproductos/page"));
const NovaPage = lazy(() => import("@/features/nova/page"));
const SettingsPage = lazy(() => import("@/features/settings/page"));
const KpisPage = lazy(() => import("@/features/kpis/page"));
const ProfilePage = lazy(() => import("@/features/auth/profile-page"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/">{() => <ProtectedRoute><DashboardPage /></ProtectedRoute>}</Route>
        <Route path="/comercial">{() => <ProtectedRoute><ComercialPage /></ProtectedRoute>}</Route>
        <Route path="/operaciones/levantamiento/:id">{(params) => <ProtectedRoute><SurveyFormPage surveyId={Number(params.id)} /></ProtectedRoute>}</Route>
        <Route path="/operaciones">{() => <ProtectedRoute><OperacionesPage /></ProtectedRoute>}</Route>
        <Route path="/subproductos">{() => <ProtectedRoute><SubproductosPage /></ProtectedRoute>}</Route>
        <Route path="/nova">{() => <ProtectedRoute><NovaPage /></ProtectedRoute>}</Route>
        <Route path="/settings">{() => <ProtectedRoute adminOnly><SettingsPage /></ProtectedRoute>}</Route>
        <Route path="/kpis">{() => <ProtectedRoute><KpisPage /></ProtectedRoute>}</Route>
        <Route path="/perfil">{() => <ProtectedRoute><ProfilePage /></ProtectedRoute>}</Route>
        <Route>
          <div className="flex items-center justify-center min-h-screen">
            <h1 className="text-2xl font-bold">404 - Page Not Found</h1>
          </div>
        </Route>
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRouter />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
