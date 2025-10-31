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
    <div className="space-y-3">
      {translatableFields.length === 0 ? (
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center text-sm text-slate-500">
          No translatable fields available
        </div>
      ) : (
        translatableFields.map((field: any) => {
          const translatedValue = translations[field.name];

          return (
            <div key={field.name} className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                {field.label}
                {field.required && <span className="text-red-600 ml-1">*</span>}
              </label>
              {field.type === 'number' ? (
                <input
                  type="number"
                  value={translatedValue ?? ''}
                  onChange={(e) => handleFieldChange(field.name, parseFloat(e.target.value) || 0)}
                  placeholder={`Enter ${locale} translation`}
                  disabled={disabled}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
              ) : (
                <input
                  type="text"
                  value={translatedValue ?? ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  placeholder={`Enter ${locale} translation`}
                  disabled={disabled}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
