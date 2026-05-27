import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import QuickAddModal from './QuickAddModal';

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
    { to: '/', label: 'Dashboard', icon: '🏠' },
    { to: '/expenses', label: 'Gastos', icon: '💸' },
    { to: '/fixed-expenses', label: 'Gastos Fijos', icon: '📌' },
    { to: '/recurring-expenses', label: 'Recurrentes', icon: '🔁' },
    { to: '/categories', label: 'Categorías', icon: '🏷️' },
    { to: '/stats', label: 'Estadísticas', icon: '📊' },
    { to: '/settings', label: 'Configuración', icon: '⚙️' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ to: '/admin', label: 'Admin', icon: '🔧' });
  }

  // Bottom nav: 4 main items
  const bottomNavItems = [
    { to: '/', label: 'Inicio', icon: '🏠' },
    { to: '/expenses', label: 'Gastos', icon: '💸' },
    { to: '/stats', label: 'Stats', icon: '📊' },
  ];

  // Detect current page title for mobile header
  const currentNav = navItems.find((n) => n.to === location.pathname);

  return (
    <div className="min-h-screen flex">
      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 bg-background/70 backdrop-blur-sm z-40"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-border flex flex-col transform transition-transform duration-200 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">💰 FinTracker</h1>
          <button
            onClick={() => setDrawerOpen(false)}
            className="md:hidden text-text-muted hover:text-text text-xl w-8 h-8 flex items-center justify-center rounded-md hover:bg-border/50"
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setDrawerOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 md:py-2.5 rounded-[10px] transition-all text-sm ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-text-muted hover:bg-primary/[0.06] hover:text-text'
                }`
              }
            >
              <span className="text-base md:hidden">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="text-sm text-text-muted mb-2">{user?.name}</div>
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-sm text-danger text-left hover:bg-danger/[0.08] rounded-lg transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top header */}
        <header className="md:hidden sticky top-0 z-30 bg-sidebar border-b border-border px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-border/50 transition-colors"
            aria-label="Abrir menú"
          >
            <span className="text-text text-xl leading-none">☰</span>
          </button>
          <h2 className="text-base font-semibold flex-1 truncate">{currentNav?.label || 'FinTracker'}</h2>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-10 overflow-auto pb-24 md:pb-10">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-sidebar border-t border-border flex items-center justify-around px-2 py-2 pb-safe">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 py-1.5 rounded-lg transition-colors ${
                  isActive ? 'text-primary' : 'text-text-muted hover:text-text'
                }`
              }
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
            </NavLink>
          ))}
          {/* Quick add button */}
          <button
            onClick={() => setQuickAddOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-1.5 rounded-lg text-text-muted hover:text-primary"
            aria-label="Agregar gasto"
          >
            <span className="text-lg leading-none">➕</span>
            <span className="text-[10px] mt-0.5 font-medium">Agregar</span>
          </button>
        </nav>

        {/* Floating action button on desktop */}
        <button
          onClick={() => setQuickAddOpen(true)}
          className="hidden md:flex fixed bottom-8 right-8 w-14 h-14 bg-primary hover:bg-primary-dark text-background rounded-full shadow-lg items-center justify-center text-2xl font-bold transition-all hover:scale-105 z-30"
          aria-label="Agregar gasto rápido"
          title="Agregar gasto (presiona N)"
        >
          +
        </button>
      </div>

      {/* Quick add modal */}
      {quickAddOpen && (
        <QuickAddModal
          onClose={() => setQuickAddOpen(false)}
          onSaved={() => setQuickAddOpen(false)}
        />
      )}
    </div>
  );
}
