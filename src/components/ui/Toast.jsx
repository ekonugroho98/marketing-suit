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
    bg: "bg-accent-50",
    border: "border-accent-400",
    text: "text-accent-800",
    iconBg: "bg-accent-500",
    iconText: "text-white",
    progressBar: "bg-accent-500",
  },
  error: {
    icon: "✗",
    bg: "bg-danger-50",
    border: "border-danger-400",
    text: "text-danger-800",
    iconBg: "bg-danger-500",
    iconText: "text-white",
    progressBar: "bg-danger-500",
  },
  warning: {
    icon: "⚠",
    bg: "bg-warning-50",
    border: "border-warning-400",
    text: "text-warning-800",
    iconBg: "bg-warning-500",
    iconText: "text-white",
    progressBar: "bg-warning-500",
  },
  info: {
    icon: "ℹ",
    bg: "bg-primary-50",
    border: "border-primary-400",
    text: "text-primary-800",
    iconBg: "bg-primary-500",
    iconText: "text-white",
    progressBar: "bg-primary-500",
  },
};

let toastIdCounter = 0;

function ToastItem({ toast, onRemove }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef(null);

  const style = TOAST_TYPES[toast.type] || TOAST_TYPES.info;

  useEffect(() => {
    // Trigger slide-in on mount
    const enterTimer = requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Auto-dismiss
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
    // Wait for exit animation to complete before removing
    setTimeout(() => {
      onRemove(toast.id);
    }, 300);
  }, [isExiting, onRemove, toast.id]);

  return (
    <div
      className={`
        flex items-start gap-3 w-80 max-w-sm p-4 rounded-lg border shadow-lg backdrop-blur-sm
        transition-all duration-300 ease-in-out
        ${style.bg} ${style.border}
        ${
          isVisible && !isExiting
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0"
        }
      `}
      role="alert"
    >
      {/* Icon */}
      <div
        className={`
          flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
          ${style.iconBg} ${style.iconText}
        `}
      >
        {style.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className={`text-sm font-semibold ${style.text}`}>{toast.title}</p>
        )}
        {toast.message && (
          <p
            className={`text-sm ${style.text} ${toast.title ? "mt-0.5 opacity-80" : ""}`}
          >
            {toast.message}
          </p>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        className={`
          flex-shrink-0 w-5 h-5 flex items-center justify-center rounded
          text-current opacity-50 hover:opacity-100 transition-opacity
          ${style.text}
        `}
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
