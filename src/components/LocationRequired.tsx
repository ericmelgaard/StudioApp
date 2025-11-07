import { MapPin, AlertCircle } from 'lucide-react';

interface LocationRequiredProps {
  action?: string;
  className?: string;
}

export default function LocationRequired({ action = 'this action', className = '' }: LocationRequiredProps) {
  return (
    <div className={`bg-amber-50 border border-amber-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900 mb-1">Location Required</h3>
          <p className="text-sm text-amber-800">
            Please select a <span className="font-medium">Concept</span>, <span className="font-medium">Company</span>, or{' '}
            <span className="font-medium">Store</span> from the navigation to enable {action}.
          </p>
          <div className="flex items-center gap-2 mt-3 text-sm text-amber-700">
            <MapPin className="w-4 h-4" />
            <span>Use the location selector in the header</span>
          </div>
        </div>
      </div>
    </div>
  );
}
