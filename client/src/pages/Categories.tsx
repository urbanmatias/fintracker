import { useState } from 'react';
import api from '../api/client';
import { useCategories } from '../hooks/useCategories';

const PRESET_COLORS = [
  '#19C37D', '#4ADEDE', '#FBBF24', '#FF5D73', '#A78BFA',
  '#F472B6', '#34D399', '#818CF8', '#22D3EE', '#FB923C',
  '#9BA9B4',
];

export default function Categories() {
  const [tab, setTab] = useState<'daily' | 'fixed'>('daily');
  const { categories, loading, reload } = useCategories(tab);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState('');

  const reset = () => {
    setShowForm(false);
    setEditingId(null);
    setName('');
    setColor(PRESET_COLORS[0]);
    setError('');
  };

  const startEdit = (id: string, currentName: string, currentColor: string) => {
    setEditingId(id);
    setName(currentName);
    setColor(currentColor);
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, { name, color });
      } else {
        await api.post('/categories', { name, color, type: tab });
      }
      reset();
      reload();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    try {
      await api.delete(`/categories/${id}`);
      reload();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      alert(axiosErr.response?.data?.error || 'Error al eliminar');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Categorías</h1>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); }}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-background rounded-[10px] font-semibold text-sm transition-colors"
        >
          {showForm ? 'Cancelar' : '+ Nueva categoría'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => { setTab('daily'); reset(); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'daily' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
        >
          Gastos diarios
        </button>
        <button
          onClick={() => { setTab('fixed'); reset(); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'fixed' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
        >
          Gastos fijos
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface rounded-[14px] p-6 border border-border space-y-4">
          <div>
            <label htmlFor="cat-name" className="block text-sm text-text-muted mb-1">Nombre</label>
            <input
              id="cat-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-[10px] focus:outline-none focus:border-primary text-text"
              placeholder="Ej: Mascotas"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-text scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <button
            type="submit"
            className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-background rounded-[10px] font-semibold text-sm transition-colors"
          >
            {editingId ? 'Guardar cambios' : 'Crear categoría'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-text-muted">Cargando...</p>
      ) : (
        <div className="bg-surface rounded-[14px] border border-border overflow-hidden">
          {categories.length === 0 ? (
            <p className="p-6 text-text-muted text-center">No hay categorías</p>
          ) : (
            <div className="divide-y divide-border">
              {categories.map((cat) => (
                <div key={cat.id} className="flex justify-between items-center p-4 hover:bg-surface-light/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }}></div>
                    <p className="text-sm font-medium">{cat.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => startEdit(cat.id, cat.name, cat.color)}
                      className="text-text-muted hover:text-secondary transition-colors text-sm"
                      aria-label="Editar"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="text-text-muted hover:text-danger transition-colors"
                      aria-label="Eliminar"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
