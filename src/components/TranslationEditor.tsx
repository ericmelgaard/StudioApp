import { useState, useEffect } from 'react';
import { Globe, Plus, X } from 'lucide-react';

interface TranslationEditorProps {
  value: Record<string, string | number>;
  onChange: (value: Record<string, string | number>) => void;
  locale: string;
  sourceAttributes: Record<string, any>;
  templateSchema: any;
  disabled?: boolean;
}

export default function TranslationEditor({
  value,
  onChange,
  locale,
  sourceAttributes,
  templateSchema,
  disabled = false
}: TranslationEditorProps) {
  const [translations, setTranslations] = useState<Record<string, string | number>>(value || {});

  useEffect(() => {
    setTranslations(value || {});
  }, [value]);

  // Get all translatable fields (text and number types)
  const getTranslatableFields = () => {
    if (!templateSchema) return [];

    const coreAttrs = templateSchema.core_attributes || [];
    const extendedAttrs = templateSchema.extended_attributes || [];
    const allAttrs = [...coreAttrs, ...extendedAttrs];

    return allAttrs.filter((attr: any) =>
      (attr.type === 'text' || attr.type === 'number' || attr.type === 'richtext') &&
      attr.type !== 'translation' &&
      sourceAttributes[attr.name] !== undefined
    );
  };

  const translatableFields = getTranslatableFields();

  const handleFieldChange = (fieldName: string, translatedValue: string | number) => {
    const updated = {
      ...translations,
      [fieldName]: translatedValue
    };
    setTranslations(updated);
    onChange(updated);
  };

  const handleFieldRemove = (fieldName: string) => {
    const updated = { ...translations };
    delete updated[fieldName];
    setTranslations(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
        <Globe className="w-4 h-4" />
        <span className="font-medium">{locale} Translations</span>
        <span className="text-xs text-slate-500">({translatableFields.length} translatable fields)</span>
      </div>

      {translatableFields.length === 0 ? (
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center text-sm text-slate-500">
          No translatable fields available in this template
        </div>
      ) : (
        <div className="space-y-3">
          {translatableFields.map((field: any) => {
            const sourceValue = sourceAttributes[field.name];
            const translatedValue = translations[field.name];
            const isTranslated = translatedValue !== undefined && translatedValue !== '';

            return (
              <div key={field.name} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-900">{field.label}</span>
                      {field.required && (
                        <span className="text-xs font-medium text-red-600">Required</span>
                      )}
                      {isTranslated && (
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
                          Translated
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mb-2">
                      Original: <span className="font-mono text-slate-700">{sourceValue || '(empty)'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {field.type === 'number' ? (
                    <input
                      type="number"
                      value={translatedValue ?? ''}
                      onChange={(e) => handleFieldChange(field.name, parseFloat(e.target.value) || 0)}
                      placeholder={`${locale} translation...`}
                      disabled={disabled}
                      className="flex-1 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  ) : (
                    <input
                      type="text"
                      value={translatedValue ?? ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      placeholder={`${locale} translation...`}
                      disabled={disabled}
                      className="flex-1 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  )}

                  {isTranslated && !disabled && (
                    <button
                      onClick={() => handleFieldRemove(field.name)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Clear translation"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
        <strong>Note:</strong> Translations are for text and number fields only. Provide {locale} translations for all required fields.
      </div>
    </div>
  );
}
