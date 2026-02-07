"use client";

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast Container */}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col-reverse gap-2 pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast: t,
  onRemove,
}: {
  toast: ToastMessage;
  onRemove: (id: number) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(t.id), 4000);
    return () => clearTimeout(timer);
  }, [t.id, onRemove]);

  const Icon = t.type === "success" ? CheckCircle2 : t.type === "error" ? AlertTriangle : Info;
  const colorClass =
    t.type === "success"
      ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
      : t.type === "error"
        ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
        : "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400";

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm animate-slide-up ${colorClass}`}
      role="alert"
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm font-medium">{t.message}</span>
      <button
        onClick={() => onRemove(t.id)}
        className="ml-2 rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        aria-label="닫기"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
