import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import QuickAddModal from './QuickAddModal';
import {
  LayoutDashboard,
  Wallet,
  Pin,
  Repeat,
  Tag,
  BarChart3,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  Plus,
  TrendingUp,
} from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setDrawerOpen(false);
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/expenses', label: 'Gastos', icon: Wallet },
    { to: '/fixed-expenses', label: 'Gastos Fijos', icon: Pin },
    { to: '/recurring-expenses', label: 'Recurrentes', icon: Repeat },
    { to: '/categories', label: 'Categorías', icon: Tag },
    { to: '/investments', label: 'Inversiones', icon: TrendingUp },
    { to: '/stats', label: 'Estadísticas', icon: BarChart3 },
    { to: '/settings', label: 'Configuración', icon: Settings },
  ];

  if (user?.role === 'admin') {
    navItems.push({ to: '/admin', label: 'Admin', icon: Shield });
  }

  const bottomNavItems = [
    { to: '/', label: 'Inicio', icon: LayoutDashboard },
    { to: '/expenses', label: 'Gastos', icon: Wallet },
    { to: '/stats', label: 'Stats', icon: BarChart3 },
  ];

  const currentNav = navItems.find((n) => n.to === location.pathname);

  return (
    <div className="min-h-screen">
      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 bg-background/70 backdrop-blur-sm z-40"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Sidebar - fixed on mobile (drawer), fixed on desktop too for clean scrolling */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-border flex flex-col transform transition-transform duration-200 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Wallet className="w-5 h-5 text-background" />
            </div>
            <h1 className="text-lg font-bold gradient-text">FinTracker</h1>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="md:hidden text-text-muted hover:text-text w-8 h-8 flex items-center justify-center rounded-md hover:bg-border/50"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setDrawerOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-text-muted hover:bg-primary/[0.06] hover:text-text'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-background font-semibold text-xs flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-text-muted truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/[0.08] rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main area - body scrolls naturally, sidebar offset on desktop */}
      <div className="md:ml-64 min-h-screen flex flex-col">
        {/* Mobile sticky top header */}
        <header className="md:hidden sticky top-0 z-30 bg-sidebar/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-border/50 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-base font-semibold flex-1 truncate">{currentNav?.label || 'FinTracker'}</h2>
        </header>

        {/* Main content - no overflow, body scrolls */}
        <main className="flex-1 p-4 md:p-8 lg:p-10 pb-28 md:pb-10">
          <div className="max-w-6xl mx-auto w-full">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom nav - fixed to viewport */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar/95 backdrop-blur border-t border-border flex items-center justify-around px-2 py-1.5 pb-safe">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center flex-1 py-2 rounded-lg transition-colors ${
                    isActive ? 'text-primary' : 'text-text-muted'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
              </NavLink>
            );
          })}
          <button
            onClick={() => setQuickAddOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-2 rounded-lg text-text-muted"
            aria-label="Agregar gasto"
          >
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-background -mt-1 shadow-lg shadow-primary/30">
              <Plus className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <span className="text-[10px] mt-0.5 font-medium">Agregar</span>
          </button>
        </nav>

        {/* Desktop FAB */}
        <button
          onClick={() => setQuickAddOpen(true)}
          className="hidden md:flex fixed bottom-8 right-8 w-14 h-14 bg-primary hover:bg-primary-dark text-background rounded-full shadow-lg shadow-primary/25 items-center justify-center transition-all hover:scale-105 z-30"
          aria-label="Agregar gasto"
          title="Agregar gasto"
        >
          <Plus className="w-6 h-6" strokeWidth={2.5} />
        </button>
      </div>

      {quickAddOpen && (
        <QuickAddModal
          onClose={() => setQuickAddOpen(false)}
          onSaved={() => setQuickAddOpen(false)}
        />
      )}
    </div>
  );
}
