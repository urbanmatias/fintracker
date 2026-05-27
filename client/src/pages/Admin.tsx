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

  if (loading) return <div className="animate-pulse text-text-muted">Cargando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Panel de Administración</h1>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface rounded-[14px] p-5 border border-border">
            <p className="text-text-muted text-xs">Usuarios totales</p>
            <p className="text-2xl font-bold mt-1">{stats.total_users}</p>
          </div>
          <div className="bg-surface rounded-[14px] p-5 border border-border">
            <p className="text-text-muted text-xs">Nuevos este mes</p>
            <p className="text-2xl font-bold mt-1 text-primary">{stats.new_users_this_month}</p>
          </div>
          <div className="bg-surface rounded-[14px] p-5 border border-border">
            <p className="text-text-muted text-xs">Gastos registrados</p>
            <p className="text-2xl font-bold mt-1">{stats.total_expenses_recorded}</p>
          </div>
          <div className="bg-surface rounded-[14px] p-5 border border-border">
            <p className="text-text-muted text-xs">Gastos fijos</p>
            <p className="text-2xl font-bold mt-1">{stats.total_fixed_expenses}</p>
          </div>
        </div>
      )}

      <div className="bg-surface rounded-[14px] border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-sm">Usuarios ({users.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="text-left p-4 font-medium">Nombre</th>
                <th className="text-left p-4 font-medium">Email</th>
                <th className="text-left p-4 font-medium">Rol</th>
                <th className="text-left p-4 font-medium">Ingreso</th>
                <th className="text-left p-4 font-medium">Registro</th>
                <th className="text-left p-4 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-surface-light/30 transition-colors">
                  <td className="p-4">{u.name}</td>
                  <td className="p-4 text-text-muted">{u.email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-border/50 text-text-muted'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4">${Number(u.monthly_income || 0).toLocaleString('es-AR')}</td>
                  <td className="p-4 text-text-muted">{new Date(u.created_at).toLocaleDateString('es-AR')}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleRole(u.id, u.role)}
                        className="text-xs px-2 py-1 bg-border/50 hover:bg-border rounded-md transition-colors"
                      >
                        {u.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                      </button>
                      <button
                        onClick={() => deleteUser(u.id)}
                        className="text-xs px-2 py-1 bg-danger/10 hover:bg-danger/20 text-danger rounded-md transition-colors"
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
