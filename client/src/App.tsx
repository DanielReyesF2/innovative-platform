import { Switch, Route } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './lib/auth';
import { Toaster } from './components/ui/toaster';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

import LoginPage from './features/auth/page';
import DashboardPage from './features/dashboard/page';
import ComercialPage from './features/comercial/page';
import OperacionesPage from './features/operaciones/page';
import SubproductosPage from './features/subproductos/page';
import SettingsPage from './features/settings/page';

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        <ProtectedRoute><DashboardPage /></ProtectedRoute>
      </Route>
      <Route path="/comercial">
        <ProtectedRoute><ComercialPage /></ProtectedRoute>
      </Route>
      <Route path="/operaciones">
        <ProtectedRoute><OperacionesPage /></ProtectedRoute>
      </Route>
      <Route path="/subproductos">
        <ProtectedRoute><SubproductosPage /></ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute adminOnly><SettingsPage /></ProtectedRoute>
      </Route>
      <Route>
        <ProtectedRoute><DashboardPage /></ProtectedRoute>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
