import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  undoLabel?: string;
  onUndo?: () => void;
}

interface ToastContextType {
  show: (toast: Omit<Toast, 'id'>) => string;
  success: (message: string, options?: { undoLabel?: string; onUndo?: () => void }) => string;
  error: (message: string) => string;
  info: (message: string) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const COLORS = {
  success: 'text-primary border-primary/30 bg-primary/[0.08]',
  error: 'text-danger border-danger/30 bg-danger/[0.08]',
  info: 'text-secondary border-secondary/30 bg-secondary/[0.08]',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((current) => [...current, { ...toast, id }]);
    setTimeout(() => dismiss(id), 5000);
    return id;
  }, [dismiss]);

  const success = useCallback(
    (message: string, options?: { undoLabel?: string; onUndo?: () => void }) =>
      show({ type: 'success', message, ...options }),
    [show]
  );
  const error = useCallback((message: string) => show({ type: 'error', message }), [show]);
  const info = useCallback((message: string) => show({ type: 'info', message }), [show]);

  return (
    <ToastContext.Provider value={{ show, success, error, info, dismiss }}>
      {children}
      <div className="fixed top-4 right-4 z-[70] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] md:w-auto md:max-w-md pointer-events-none">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto toast-in flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur bg-surface ${COLORS[toast.type]} shadow-lg`}
            >
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
              <div className="flex items-center gap-1">
                {toast.onUndo && (
                  <button
                    onClick={() => {
                      toast.onUndo?.();
                      dismiss(toast.id);
                    }}
                    className="text-xs font-bold uppercase tracking-wider hover:underline px-2"
                  >
                    {toast.undoLabel || 'Deshacer'}
                  </button>
                )}
                <button
                  onClick={() => dismiss(toast.id)}
                  className="opacity-50 hover:opacity-100 transition-opacity p-0.5"
                  aria-label="Cerrar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
