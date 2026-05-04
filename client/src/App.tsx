import { Switch, Route } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './lib/auth';
import { Toaster } from './components/ui/toaster';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

import LoginPage from './features/auth/page';
import ComercialPage from './features/comercial/page';

const DashboardPage = lazy(() => import('./features/dashboard/page'));
const OperacionesPage = lazy(() => import('./features/operaciones/page'));
const SubproductosPage = lazy(() => import('./features/subproductos/page'));
const SettingsPage = lazy(() => import('./features/settings/page'));
const ProfilePage = lazy(() => import('./features/auth/profile-page'));

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        <ProtectedRoute><ComercialPage /></ProtectedRoute>
      </Route>
      <Route path="/comercial">
        <ProtectedRoute><ComercialPage /></ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute><DashboardPage /></ProtectedRoute>
      </Route>
      <Route path="/operaciones">
        <ProtectedRoute><OperacionesPage /></ProtectedRoute>
      </Route>
      <Route path="/subproductos">
        <ProtectedRoute><SubproductosPage /></ProtectedRoute>
      </Route>
      <Route path="/perfil">
        <ProtectedRoute><ProfilePage /></ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute adminOnly><SettingsPage /></ProtectedRoute>
      </Route>
      <Route>
        <ProtectedRoute><ComercialPage /></ProtectedRoute>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Suspense fallback={<div className="flex items-center justify-center h-screen">Cargando...</div>}>
            <Router />
          </Suspense>
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
