import { useState, useEffect } from 'react';
import { Link2, Copy, Check, Trash2, Plus, Terminal, ShieldCheck, Sparkles, RefreshCw, Settings as SettingsIcon, X } from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';

interface ApiToken {
  id: string;
  name: string;
  prefix: string;
  last_used_at: string | null;
  created_at: string;
}

interface IolStatus {
  connected: boolean;
  username?: string;
  last_sync_at?: string | null;
}

interface Props {
  status: IolStatus | null;
  onChange: () => void;
}

export default function IolSyncSetup({ status, onChange }: Props) {
  const toast = useToast();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [tokensLoaded, setTokensLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const loadTokens = () => {
    api.get('/api-tokens')
      .then((res) => setTokens(res.data.tokens || []))
      .catch(console.error)
      .finally(() => setTokensLoaded(true));
  };

  useEffect(() => {
    if (showSettings || !status?.connected) loadTokens();
  }, [showSettings, status?.connected]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/api-tokens', { name: newName.trim() });
      setGeneratedToken(res.data.token);
      setNewName('');
      loadTokens();
      toast.success('Token creado. Copialo ahora, no se va a mostrar de nuevo.');
    } catch {
      toast.error('Error al crear token');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('¿Revocar este token? El cliente local que lo use va a dejar de funcionar.')) return;
    try {
      await api.delete(`/api-tokens/${id}`);
      loadTokens();
      toast.success('Token revocado');
    } catch {
      toast.error('Error al revocar');
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // CONNECTED VIEW: minimal header like before, settings hidden
  if (status?.connected && !showSettings) {
    return (
      <div className="bg-surface rounded-2xl p-5 md:p-6 border border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <Link2 className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm">Invertir Online (IOL)</h3>
              <p className="text-xs text-text-muted mt-0.5 truncate">
                Conectado{status.username ? ` como ${status.username}` : ''}
                {status.last_sync_at && ` · Última sync: ${new Date(status.last_sync_at).toLocaleString('es-AR')}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={onChange}
              className="px-3 py-2 bg-primary/15 hover:bg-primary/25 text-primary rounded-[10px] font-semibold text-xs transition-colors flex items-center gap-1.5"
              title="Refrescar datos del portfolio"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Refrescar</span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="px-3 py-2 bg-border/50 hover:bg-border rounded-[10px] font-semibold text-xs transition-colors flex items-center gap-1.5 text-text-muted"
              title="Gestionar tokens"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SETTINGS / NOT-CONNECTED VIEW: full setup
  return (
    <div className="bg-surface rounded-2xl p-5 md:p-6 border border-border">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <Link2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">
              {status?.connected ? 'Tokens del cliente IOL' : 'Conectar con IOL'}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {status?.connected
                ? 'Gestioná los tokens de tu cliente local'
                : 'Conectá tu cuenta de IOL desde tu PC'}
            </p>
          </div>
        </div>
        {status?.connected && (
          <button
            onClick={() => setShowSettings(false)}
            className="text-text-muted hover:text-text w-8 h-8 flex items-center justify-center rounded-md hover:bg-border/50 transition-colors flex-shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Why local sync — only when not connected */}
      {!status?.connected && (
        <div className="bg-warning/[0.05] border border-warning/20 rounded-xl p-3 mb-5 flex gap-2">
          <ShieldCheck className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-xs text-text-muted leading-relaxed">
            IOL bloquea las conexiones desde Railway con CAPTCHA. La solución es un <span className="text-text font-medium">cliente local</span> que corre en tu PC: tu IP residencial pasa el filtro y manda los datos a esta app. Tus credenciales de IOL nunca dejan tu PC.
          </p>
        </div>
      )}

      {/* Generated token (one-time display) */}
      {generatedToken && (
        <div className="bg-primary/[0.06] border border-primary/30 rounded-xl p-4 mb-5 fade-in">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-primary">Token nuevo creado</p>
          </div>
          <p className="text-xs text-text-muted mb-3">
            Copialo ahora — por seguridad no vas a poder verlo de nuevo. Pegalo en el archivo <code className="text-primary font-mono bg-primary/10 px-1 rounded">.env</code> del cliente local.
          </p>
          <div className="flex gap-2">
            <code className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono break-all">
              {generatedToken}
            </code>
            <button
              onClick={() => copy(generatedToken)}
              className="px-3 py-2 bg-primary hover:bg-primary-dark text-background rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors flex-shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <button
            onClick={() => setGeneratedToken(null)}
            className="mt-3 text-xs text-text-muted hover:text-text"
          >
            Ya lo guardé, ocultar
          </button>
        </div>
      )}

      {/* Create new token form */}
      <form onSubmit={handleCreate} className="flex gap-2 mb-4">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nombre del token (ej: Mi laptop)"
          className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-text text-sm"
        />
        <button
          type="submit"
          disabled={!newName.trim() || creating}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-background rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Generar
        </button>
      </form>

      {/* Tokens list */}
      {!tokensLoaded ? (
        <div className="h-16 bg-border/30 rounded-lg animate-pulse"></div>
      ) : tokens.length > 0 ? (
        <div className="space-y-2 mb-5">
          {tokens.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3 bg-background border border-border rounded-lg">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{t.name}</p>
                <p className="text-[11px] text-text-muted mt-0.5 font-mono">
                  {t.prefix}··· · {t.last_used_at ? `usado ${new Date(t.last_used_at).toLocaleString('es-AR')}` : 'nunca usado'}
                </p>
              </div>
              <button
                onClick={() => handleRevoke(t.id)}
                className="text-text-muted/40 hover:text-danger transition-colors w-7 h-7 flex items-center justify-center rounded-md hover:bg-danger/10 flex-shrink-0"
                aria-label="Revocar token"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted text-center py-3 mb-3">
          No hay tokens. Generá uno arriba para configurar el cliente local.
        </p>
      )}

      {/* Instructions — only when not connected */}
      {!status?.connected && (
        <div className="mt-3 bg-background border border-border rounded-lg p-4 text-xs space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Terminal className="w-4 h-4 text-text-muted" />
            <p className="font-semibold">Cómo configurar el cliente local</p>
          </div>

          <div>
            <p className="text-text-muted mb-1">1. Cloná el repo (o descargá la carpeta <code className="font-mono text-primary">sync-client</code>):</p>
            <pre className="bg-surface p-2 rounded font-mono text-[11px] overflow-x-auto">
{`git clone https://github.com/urbanmatias/fintracker
cd fintracker/sync-client
npm install`}
            </pre>
          </div>

          <div>
            <p className="text-text-muted mb-1">2. Copiá el archivo de ejemplo:</p>
            <pre className="bg-surface p-2 rounded font-mono text-[11px] overflow-x-auto">
{`cp .env.example .env`}
            </pre>
          </div>

          <div>
            <p className="text-text-muted mb-1">3. Editá <code className="font-mono text-primary">.env</code> con tus datos:</p>
            <pre className="bg-surface p-2 rounded font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
{`IOL_USERNAME=tu_usuario_iol
IOL_PASSWORD=tu_password_iol
FINTRACKER_API_URL=${typeof window !== 'undefined' ? window.location.origin : 'https://...'}
FINTRACKER_API_TOKEN=ft_xxxxx (el token de arriba)`}
            </pre>
          </div>

          <div>
            <p className="text-text-muted mb-1">4. Ejecutalo:</p>
            <pre className="bg-surface p-2 rounded font-mono text-[11px] overflow-x-auto">
{`npm start         # sincroniza una vez
npm run watch     # cada 1 hora`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
