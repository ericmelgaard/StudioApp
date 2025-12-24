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
    <>
      <div className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm z-[200] animate-fade-in" />
      <div className="fixed inset-0 z-[201] flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto animate-scale-in">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden min-w-[380px]">
            <div className="flex items-center gap-3 p-5">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6 text-blue-600" />
              </div>
              <p className="flex-1 text-slate-900 font-medium text-base">{message}</p>
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
      </div>
    </>
  );
}
