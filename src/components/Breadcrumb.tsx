import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <div className={`flex items-center gap-1 text-xs ${className}`}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isClickable = !isLast && item.onClick;

        return (
          <div key={index} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="w-3 h-3 text-slate-400" />}
            {isClickable ? (
              <button
                onClick={item.onClick}
                className="text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            ) : (
              <span className={isLast ? 'text-slate-700 font-medium' : 'text-slate-500'}>
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
