import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Dashboard' },
    { to: '/expenses', label: 'Gastos' },
    { to: '/fixed-expenses', label: 'Gastos Fijos' },
    { to: '/stats', label: 'Estadísticas' },
    { to: '/settings', label: 'Configuración' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ to: '/admin', label: 'Admin' });
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold text-primary">💰 FinTracker</h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-4 py-2.5 rounded-[10px] transition-all text-sm ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-text-muted hover:bg-primary/[0.06] hover:text-text'
                }`
              }
            >
              {item.label}
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

      {/* Main content */}
      <main className="flex-1 p-10 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
