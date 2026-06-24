import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastItemProps {
  key?: React.Key;
  toast: Toast;
  onClose: (id: string) => void;
}

export function ToastItem({ toast, onClose }: ToastItemProps) {
  const { id, type, title, description, duration = 4000 } = toast;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const config = {
    success: {
      bg: 'bg-emerald-50/95 border-emerald-200 border-l-4 border-l-emerald-600 hover:bg-emerald-50',
      icon: <CheckCircle2 className="w-5.3 h-5.3 text-emerald-600 flex-shrink-0 mt-0.5" />,
      titleColor: 'text-emerald-950 font-bold',
      descColor: 'text-emerald-850 font-medium',
      lineBg: 'bg-emerald-600',
    },
    info: {
      bg: 'bg-blue-50/95 border-blue-200 border-l-4 border-l-blue-600 hover:bg-blue-50',
      icon: <Info className="w-5.3 h-5.3 text-blue-600 flex-shrink-0 mt-0.5" />,
      titleColor: 'text-blue-950 font-bold',
      descColor: 'text-blue-850 font-medium',
      lineBg: 'bg-blue-600',
    },
    warning: {
      bg: 'bg-amber-50/95 border-amber-250 border-l-4 border-l-amber-600 hover:bg-amber-50',
      icon: <AlertTriangle className="w-5.3 h-5.3 text-amber-600 flex-shrink-0 mt-0.5" />,
      titleColor: 'text-amber-955 font-bold',
      descColor: 'text-amber-900 font-medium',
      lineBg: 'bg-amber-600',
    },
    error: {
      bg: 'bg-rose-50/95 border-rose-200 border-l-4 border-l-rose-600 hover:bg-rose-50',
      icon: <XCircle className="w-5.3 h-5.3 text-rose-600 flex-shrink-0 mt-0.5" />,
      titleColor: 'text-rose-950 font-bold',
      descColor: 'text-rose-850 font-medium',
      lineBg: 'bg-rose-600',
    },
  };

  const current = config[type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -15, scale: 0.9, transition: { duration: 0.2 } }}
      whileHover={{ y: -2, scale: 1.02 }}
      className={`relative w-full max-w-sm overflow-hidden rounded-xl border backdrop-blur-md shadow-2xl ${current.bg} pointer-events-auto p-4 flex gap-3 transition-shadow duration-250`}
    >
      {current.icon}
      <div className="flex-1 min-w-0 pr-4">
        <h4 className={`text-sm font-semibold leading-tight ${current.titleColor}`}>
          {title}
        </h4>
        {description && (
          <p className={`mt-1 text-xs font-medium leading-relaxed ${current.descColor}`}>
            {description}
          </p>
        )}
      </div>
      <button
        onClick={() => onClose(id)}
        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100/50 flex-shrink-0 self-start cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress Line */}
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        className={`absolute bottom-0 left-0 h-1 ${current.lineBg}`}
      />
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div
      name="toast-container"
      className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 w-full max-w-xs md:max-w-sm pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  );
}
