import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Copy, Layers } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface WandTemplateManagerProps {
  onBack: () => void;
}

interface Template {
  id: number;
  name: string;
  description: string;
  attribute_schema: {
    core_attributes: Array<{
      name: string;
      type: string;
      label: string;
      required: boolean;
    }>;
  };
  is_system: boolean;
  created_at: string;
}

export default function WandTemplateManager({ onBack }: WandTemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('product_attribute_templates')
      .select('*')
      .order('name');

    if (data) setTemplates(data);
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Manage Templates</h1>
          <p className="text-slate-600">
            Create and manage global product attribute templates for different industry sectors
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Layers className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-slate-900">{template.name}</h3>
                      {template.is_system && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                          System
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">{template.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  {!template.is_system && (
                    <button className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Core Attributes ({template.attribute_schema.core_attributes.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {template.attribute_schema.core_attributes.map((attr, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm"
                    >
                      <span className="font-medium text-slate-900">{attr.label}</span>
                      <span className="text-slate-500 ml-1.5">({attr.type})</span>
                      {attr.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">About Global Templates</h3>
        <p className="text-sm text-blue-800 mb-3">
          Global templates define the core attribute structure for products across different industry sectors.
          These templates are available system-wide and can be used by all organizations.
        </p>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Templates define core attributes only (not extended attributes)</li>
          <li>System templates cannot be deleted but can be duplicated</li>
          <li>Custom templates can be created for new industry sectors</li>
          <li>Templates are used as the foundation for product data structure</li>
        </ul>
      </div>
    </div>
  );
}
