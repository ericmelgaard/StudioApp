import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <div className={`flex items-center gap-1 text-xs text-slate-500 ${className}`}>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="w-3 h-3" />}
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
