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
      <aside className="w-64 backdrop-blur-xl bg-white/[0.04] border-r border-white/[0.08] flex flex-col">
        <div className="p-6 border-b border-white/[0.08]">
          <h1 className="text-xl font-bold text-primary">💰 FinTracker</h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-4 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-primary/15 text-primary font-medium backdrop-blur-sm'
                    : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/[0.08]">
          <div className="text-sm text-white/40 mb-2">{user?.name}</div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-sm text-danger/80 hover:bg-danger/10 rounded-xl transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
