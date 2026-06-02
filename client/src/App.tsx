import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DailyExpenses from './pages/DailyExpenses';
import FixedExpenses from './pages/FixedExpenses';
import RecurringExpenses from './pages/RecurringExpenses';
import Categories from './pages/Categories';
import Stats from './pages/Stats';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import Investments from './pages/Investments';
import News from './pages/News';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="expenses" element={<DailyExpenses />} />
        <Route path="fixed-expenses" element={<FixedExpenses />} />
        <Route path="recurring-expenses" element={<RecurringExpenses />} />
        <Route path="categories" element={<Categories />} />
        <Route path="investments" element={<Investments />} />
        <Route path="news" element={<News />} />
        <Route path="stats" element={<Stats />} />
        <Route path="settings" element={<Settings />} />
        <Route
          path="admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <AppRoutes />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
