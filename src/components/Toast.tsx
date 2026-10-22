import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastApi {
  notify: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE: Record<ToastKind, { icon: React.ReactNode; ring: string }> = {
  success: { icon: <CheckCircle2 className="w-4 h-4 text-[#19D89B]" />, ring: 'border-[#19D89B]/50' },
  error: { icon: <AlertTriangle className="w-4 h-4 text-red-400" />, ring: 'border-red-500/50' },
  info: { icon: <Info className="w-4 h-4 text-[#15DDF5]" />, ring: 'border-[#15DDF5]/50' }
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, kind }]);
      setTimeout(() => dismiss(id), 3800);
    },
    [dismiss]
  );

  const api = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-2.5 rounded-xl border bg-[#0F172A]/95 px-3.5 py-3 text-xs text-white shadow-xl backdrop-blur ${TONE[toast.kind].ring}`}
          >
            <span className="mt-0.5 shrink-0">{TONE[toast.kind].icon}</span>
            <p className="flex-1 leading-relaxed text-[#E6ECF7]">{toast.message}</p>
            <button
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 text-[#93A4C0] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastApi => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};
