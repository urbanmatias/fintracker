import { useState, useEffect } from 'react';
import api from '../api/client';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  monthly_income: number;
  created_at: string;
}

interface PlatformStats {
  total_users: number;
  total_expenses_recorded: number;
  total_fixed_expenses: number;
  new_users_this_month: number;
}

export default function Admin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/stats'),
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="animate-pulse text-white/50">Cargando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Panel de Administración</h1>

      {/* Platform stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface rounded-xl p-5 border border-white/10">
            <p className="text-white/50 text-xs">Usuarios totales</p>
            <p className="text-2xl font-bold mt-1">{stats.total_users}</p>
          </div>
          <div className="bg-surface rounded-xl p-5 border border-white/10">
            <p className="text-white/50 text-xs">Nuevos este mes</p>
            <p className="text-2xl font-bold mt-1 text-secondary">{stats.new_users_this_month}</p>
          </div>
          <div className="bg-surface rounded-xl p-5 border border-white/10">
            <p className="text-white/50 text-xs">Gastos registrados</p>
            <p className="text-2xl font-bold mt-1">{stats.total_expenses_recorded}</p>
          </div>
          <div className="bg-surface rounded-xl p-5 border border-white/10">
            <p className="text-white/50 text-xs">Gastos fijos</p>
            <p className="text-2xl font-bold mt-1">{stats.total_fixed_expenses}</p>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="bg-surface rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-medium">Usuarios ({users.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/50">
                <th className="text-left p-4">Nombre</th>
                <th className="text-left p-4">Email</th>
                <th className="text-left p-4">Rol</th>
                <th className="text-left p-4">Ingreso</th>
                <th className="text-left p-4">Registro</th>
                <th className="text-left p-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/5">
                  <td className="p-4">{u.name}</td>
                  <td className="p-4 text-white/70">{u.email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${u.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white/60'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4">${Number(u.monthly_income || 0).toLocaleString('es-AR')}</td>
                  <td className="p-4 text-white/50">{new Date(u.created_at).toLocaleDateString('es-AR')}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleRole(u.id, u.role)}
                        className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
                      >
                        {u.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                      </button>
                      <button
                        onClick={() => deleteUser(u.id)}
                        className="text-xs px-2 py-1 bg-danger/10 hover:bg-danger/20 text-danger rounded transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
