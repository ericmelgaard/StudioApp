import React from 'react';
import { LucideIcon } from 'lucide-react';

interface Metric {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
}

interface MetricsBarProps {
  metrics: Metric[];
}

export default function MetricsBar({ metrics }: MetricsBarProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {metrics.map((metric, index) => {
        const IconComponent = metric.icon;
        const colorClass = metric.color || 'bg-blue-500';

        return (
          <div
            key={index}
            className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {metric.label}
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {typeof metric.value === 'number'
                    ? metric.value.toLocaleString()
                    : metric.value}
                </p>
              </div>
              <div className={`${colorClass} p-3 rounded-lg`}>
                <IconComponent className="text-white" size={24} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
