import { useState } from 'react';
import { Search, Calendar, X, Sparkles } from 'lucide-react';
import { HolidayTemplate, HOLIDAY_TEMPLATES, searchTemplates } from '../lib/holidayTemplates';
import { formatRecurrenceText } from '../types/schedules';

interface HolidayTemplatePickerProps {
  onSelect: (templates: HolidayTemplate[]) => void;
  onClose: () => void;
  allowMultiple?: boolean;
}

export default function HolidayTemplatePicker({
  onSelect,
  onClose,
  allowMultiple = true
}: HolidayTemplatePickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'federal' | 'seasonal' | 'custom'>('all');
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());

  const filteredTemplates = searchQuery
    ? searchTemplates(searchQuery)
    : selectedCategory === 'all'
    ? HOLIDAY_TEMPLATES
    : HOLIDAY_TEMPLATES.filter(t => t.category === selectedCategory);

  const toggleTemplate = (templateId: string) => {
    const newSelected = new Set(selectedTemplates);
    if (newSelected.has(templateId)) {
      newSelected.delete(templateId);
    } else {
      if (!allowMultiple) {
        newSelected.clear();
      }
      newSelected.add(templateId);
    }
    setSelectedTemplates(newSelected);
  };

  const handleApply = () => {
    const templates = HOLIDAY_TEMPLATES.filter(t => selectedTemplates.has(t.id));
    onSelect(templates);
    onClose();
  };

  const federalCount = HOLIDAY_TEMPLATES.filter(t => t.category === 'federal').length;
  const seasonalCount = HOLIDAY_TEMPLATES.filter(t => t.category === 'seasonal').length;
  const customCount = HOLIDAY_TEMPLATES.filter(t => t.category === 'custom').length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Holiday Templates</h2>
              <p className="text-sm text-slate-600">Quick add common holidays and events</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="p-6 border-b space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search holidays..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All ({HOLIDAY_TEMPLATES.length})
            </button>
            <button
              onClick={() => setSelectedCategory('federal')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === 'federal'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Federal ({federalCount})
            </button>
            <button
              onClick={() => setSelectedCategory('seasonal')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === 'seasonal'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Seasonal ({seasonalCount})
            </button>
            <button
              onClick={() => setSelectedCategory('custom')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === 'custom'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Custom ({customCount})
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => {
              const isSelected = selectedTemplates.has(template.id);
              return (
                <button
                  key={template.id}
                  onClick={() => toggleTemplate(template.id)}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className={`w-4 h-4 flex-shrink-0 ${
                        isSelected ? 'text-amber-600' : 'text-slate-400'
                      }`} />
                      <h3 className="font-semibold text-slate-900">{template.name}</h3>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 bg-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-slate-600 mb-2">
                    {formatRecurrenceText(template.recurrence_type, template.recurrence_config)}
                  </p>

                  <p className="text-xs text-slate-500 mb-3">{template.description}</p>

                  {template.is_closed ? (
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                      Closed
                    </div>
                  ) : template.suggested_hours ? (
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                      {template.suggested_hours.start_time} - {template.suggested_hours.end_time}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No templates found</p>
              <p className="text-sm text-slate-500">Try a different search or category</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-slate-50 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            {selectedTemplates.size} template{selectedTemplates.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={selectedTemplates.size === 0}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply {selectedTemplates.size > 0 && `(${selectedTemplates.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
