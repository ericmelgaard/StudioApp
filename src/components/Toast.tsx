import { useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, onClose, duration = 2000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed top-4 right-4 z-[70] animate-slide-in-right">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden min-w-[320px]">
        <div className="flex items-center gap-3 p-4">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Check className="w-5 h-5 text-blue-600" />
          </div>
          <p className="flex-1 text-slate-900 font-medium">{message}</p>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 hover:bg-slate-100 rounded transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="h-1 bg-slate-100">
          <div className="h-full bg-blue-600 animate-progress" style={{ animationDuration: `${duration}ms` }} />
        </div>
      </div>
    </div>
  );
}
