import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const ToastContext = createContext(null);

const TOAST_TYPES = {
  success: {
    icon: "✓",
    bg: "rgba(52, 211, 153, 0.1)",
    border: "rgba(52, 211, 153, 0.3)",
    text: "#34d399",
    accentBorder: "border-l-2 border-success",
  },
  error: {
    icon: "✗",
    bg: "rgba(248, 113, 113, 0.1)",
    border: "rgba(248, 113, 113, 0.3)",
    text: "#f87171",
    accentBorder: "border-l-2 border-danger",
  },
  warning: {
    icon: "⚠",
    bg: "rgba(251, 191, 36, 0.1)",
    border: "rgba(251, 191, 36, 0.3)",
    text: "#fbbf24",
    accentBorder: "border-l-2 border-warning",
  },
  info: {
    icon: "ℹ",
    bg: "rgba(129, 140, 248, 0.1)",
    border: "rgba(129, 140, 248, 0.3)",
    text: "#818cf8",
    accentBorder: "border-l-2 border-primary-500",
  },
};

let toastIdCounter = 0;

function ToastItem({ toast, onRemove }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef(null);

  const style = TOAST_TYPES[toast.type] || TOAST_TYPES.info;

  useEffect(() => {
    const enterTimer = requestAnimationFrame(() => {
      setIsVisible(true);
    });

    const duration = toast.duration || 5000;
    timerRef.current = setTimeout(() => {
      handleClose();
    }, duration);

    return () => {
      cancelAnimationFrame(enterTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClose = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    setIsVisible(false);
    setTimeout(() => {
      onRemove(toast.id);
    }, 300);
  }, [isExiting, onRemove, toast.id]);

  return (
    <div
      className={`
        flex items-start gap-3 w-80 max-w-sm p-4 rounded-xl shadow-glass
        backdrop-blur-xl transition-all duration-300 ease-in-out
        ${style.accentBorder}
        ${
          isVisible && !isExiting
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0"
        }
      `}
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
      }}
      role="alert"
    >
      <div
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ background: style.text, color: '#0b0d14' }}
      >
        {style.icon}
      </div>

      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold" style={{ color: style.text }}>{toast.title}</p>
        )}
        {toast.message && (
          <p
            className="text-sm text-text-secondary mt-0.5"
          >
            {toast.message}
          </p>
        )}
      </div>

      <button
        onClick={handleClose}
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-text-tertiary hover:text-text-primary transition-colors"
        aria-label="Tutup notifikasi"
      >
        ×
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div
      className="fixed bottom-4 right-4 z-[999] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={removeToast} />
        </div>
      ))}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(
    ({ type = "info", title, message, duration = 5000 } = {}) => {
      const id = ++toastIdCounter;
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);
      return id;
    },
    [],
  );

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = { toasts, toast, removeToast };

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export default ToastProvider;
