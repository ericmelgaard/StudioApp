import { useState, useEffect } from 'react';
import { X, Download, Check, Globe, MapPin, FileText, Table } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateProductExport, downloadExport } from '../lib/productExportService';

interface ProductExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  conceptId?: number;
  companyId?: number;
  siteId?: number;
  selectedProductIds?: string[];
}

interface TranslationConfig {
  locale: string;
  locale_name: string;
}

interface ColumnOption {
  key: string;
  label: string;
  type: string;
  category: 'basic' | 'extended' | 'metadata';
}

export default function ProductExportModal({
  isOpen,
  onClose,
  conceptId,
  companyId,
  siteId,
  selectedProductIds = []
}: ProductExportModalProps) {
  const [exportName, setExportName] = useState('');
  const [fileFormat, setFileFormat] = useState<'csv' | 'excel' | 'json'>('csv');
  const [includeChildLocations, setIncludeChildLocations] = useState(true);
  const [selectedTranslations, setSelectedTranslations] = useState<Set<string>>(new Set());
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(['name', 'price', 'calories', 'description']));
  const [availableTranslations, setAvailableTranslations] = useState<TranslationConfig[]>([]);
  const [availableColumns, setAvailableColumns] = useState<ColumnOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [estimatedCount, setEstimatedCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadTemplateConfig();
      estimateProductCount();
      setExportName(`Product Export ${new Date().toLocaleDateString()}`);
    }
  }, [isOpen, conceptId, companyId, siteId]);

  async function loadTemplateConfig() {
    setLoading(true);
    try {
      const { data: settings } = await supabase
        .from('organization_settings')
        .select('default_product_attribute_template_id')
        .limit(1)
        .maybeSingle();

      if (settings?.default_product_attribute_template_id) {
        const { data: template } = await supabase
          .from('product_attribute_templates')
          .select('attribute_schema, translations')
          .eq('id', settings.default_product_attribute_template_id)
          .maybeSingle();

        if (template) {
          if (template.translations && Array.isArray(template.translations)) {
            setAvailableTranslations(template.translations);
            const defaultTranslations = new Set(
              template.translations.slice(0, 1).map((t: TranslationConfig) => t.locale)
            );
            setSelectedTranslations(defaultTranslations);
          }

          if (template.attribute_schema) {
            const schema = template.attribute_schema as any;
            const columns: ColumnOption[] = [];

            columns.push(
              { key: 'id', label: 'Product ID', type: 'text', category: 'basic' },
              { key: 'location', label: 'Location', type: 'text', category: 'basic' }
            );

            if (schema.core_attributes) {
              schema.core_attributes.forEach((attr: any) => {
                columns.push({
                  key: attr.name,
                  label: attr.label || attr.name,
                  type: attr.type,
                  category: 'basic'
                });
              });
            }

            if (schema.extended_attributes) {
              schema.extended_attributes.forEach((attr: any) => {
                columns.push({
                  key: attr.name,
                  label: attr.label || attr.name,
                  type: attr.type,
                  category: 'extended'
                });
              });
            }

            columns.push(
              { key: 'current_status', label: 'Publication Status', type: 'text', category: 'metadata' },
              { key: 'scheduled_publish_date', label: 'Scheduled Publish Date', type: 'date', category: 'metadata' },
              { key: 'integration_source', label: 'Integration Source', type: 'text', category: 'metadata' },
              { key: 'created_at', label: 'Created At', type: 'date', category: 'metadata' },
              { key: 'updated_at', label: 'Updated At', type: 'date', category: 'metadata' }
            );

            setAvailableColumns(columns);
          }
        }
      }
    } catch (error) {
      console.error('Error loading template config:', error);
    } finally {
      setLoading(false);
    }
  }

  async function estimateProductCount() {
    try {
      let query = supabase.from('products').select('id', { count: 'exact', head: true });

      if (selectedProductIds.length > 0) {
        query = query.in('id', selectedProductIds);
      }

      const { count } = await query;
      setEstimatedCount(count || 0);
    } catch (error) {
      console.error('Error estimating product count:', error);
    }
  }

  function toggleTranslation(locale: string) {
    setSelectedTranslations(prev => {
      const next = new Set(prev);
      if (next.has(locale)) {
        next.delete(locale);
      } else {
        next.add(locale);
      }
      return next;
    });
  }

  function toggleColumn(key: string) {
    setSelectedColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function selectAllColumns(category?: string) {
    if (category) {
      const categoryColumns = availableColumns
        .filter(col => col.category === category)
        .map(col => col.key);
      setSelectedColumns(prev => new Set([...prev, ...categoryColumns]));
    } else {
      setSelectedColumns(new Set(availableColumns.map(col => col.key)));
    }
  }

  function deselectAllColumns(category?: string) {
    if (category) {
      const categoryColumns = new Set(
        availableColumns.filter(col => col.category === category).map(col => col.key)
      );
      setSelectedColumns(prev => new Set([...prev].filter(key => !categoryColumns.has(key))));
    } else {
      setSelectedColumns(new Set());
    }
  }

  async function handleExport() {
    if (!exportName.trim()) {
      alert('Please enter an export name');
      return;
    }

    if (selectedColumns.size === 0) {
      alert('Please select at least one column to export');
      return;
    }

    setExporting(true);
    try {
      const exportConfig = {
        export_name: exportName,
        file_format: fileFormat,
        concept_id: conceptId,
        company_id: companyId,
        site_id: siteId,
        include_child_locations: includeChildLocations,
        translation_locales: Array.from(selectedTranslations),
        column_config: {
          selected_columns: Array.from(selectedColumns),
          available_columns: availableColumns
        },
        product_count: estimatedCount,
        metadata: {
          selected_product_ids: selectedProductIds.length > 0 ? selectedProductIds : null,
          export_type: selectedProductIds.length > 0 ? 'selected' : 'all'
        }
      };

      const { data: exportRecord, error: exportError } = await supabase
        .from('product_exports')
        .insert(exportConfig)
        .select()
        .single();

      if (exportError) throw exportError;

      const exportContent = await generateProductExport({
        exportId: exportRecord.id,
        selectedColumns: Array.from(selectedColumns),
        translationLocales: Array.from(selectedTranslations),
        includeChildLocations,
        conceptId,
        companyId,
        siteId,
        selectedProductIds: selectedProductIds.length > 0 ? selectedProductIds : undefined
      });

      await downloadExport(exportRecord.id, fileFormat, exportContent);

      alert('Export completed successfully!');
      onClose();
    } catch (error) {
      console.error('Error starting export:', error);
      alert('Failed to start export. Please try again.');
    } finally {
      setExporting(false);
    }
  }


  if (!isOpen) return null;

  const columnsByCategory = {
    basic: availableColumns.filter(col => col.category === 'basic'),
    extended: availableColumns.filter(col => col.category === 'extended'),
    metadata: availableColumns.filter(col => col.category === 'metadata')
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative z-[61]">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between rounded-t-xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Export Products</h2>
              <p className="text-sm text-blue-100">Configure your product export</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Export Name
            </label>
            <input
              type="text"
              value={exportName}
              onChange={(e) => setExportName(e.target.value)}
              placeholder="Enter export name..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              File Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['csv', 'excel', 'json'] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => setFileFormat(format)}
                  className={`px-4 py-3 border-2 rounded-lg font-medium transition-all ${
                    fileFormat === format
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                  }`}
                >
                  <FileText className="w-5 h-5 mx-auto mb-1" />
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {(conceptId || companyId) && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeChildLocations}
                  onChange={(e) => setIncludeChildLocations(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-600" />
                    <span className="font-medium text-slate-900">Include Child Locations</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    Export products from all child locations in the hierarchy
                  </p>
                </div>
              </label>
            </div>
          )}

          {availableTranslations.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Globe className="w-4 h-4" />
                  Translation Languages
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedTranslations(new Set(availableTranslations.map(t => t.locale)))}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedTranslations(new Set())}
                    className="text-xs text-slate-600 hover:text-slate-700 font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {availableTranslations.map((translation) => (
                  <label
                    key={translation.locale}
                    className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTranslations.has(translation.locale)}
                      onChange={() => toggleTranslation(translation.locale)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{translation.locale_name}</div>
                      <div className="text-xs text-slate-500">{translation.locale}</div>
                    </div>
                    {selectedTranslations.has(translation.locale) && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Selected languages will be exported as separate columns (e.g., name_fr_FR, description_fr_FR)
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Table className="w-4 h-4" />
                Columns to Export
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => selectAllColumns()}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Select All
                </button>
                <button
                  onClick={() => deselectAllColumns()}
                  className="text-xs text-slate-600 hover:text-slate-700 font-medium"
                >
                  Clear
                </button>
              </div>
            </div>

            {Object.entries(columnsByCategory).map(([category, columns]) => {
              if (columns.length === 0) return null;

              return (
                <div key={category} className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      {category === 'basic' ? 'Basic Fields' : category === 'extended' ? 'Extended Attributes' : 'Metadata'}
                    </h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => selectAllColumns(category)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        All
                      </button>
                      <button
                        onClick={() => deselectAllColumns(category)}
                        className="text-xs text-slate-600 hover:text-slate-700"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {columns.map((column) => (
                      <label
                        key={column.key}
                        className="flex items-center gap-2 p-2 border border-slate-200 rounded cursor-pointer hover:border-blue-400 transition-colors text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedColumns.has(column.key)}
                          onChange={() => toggleColumn(column.key)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="flex-1 truncate text-slate-700">{column.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Export Summary</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Approximately {estimatedCount} products will be exported</li>
                <li>• {selectedColumns.size} columns selected</li>
                <li>• {selectedTranslations.size} translation language(s) included</li>
                {selectedProductIds.length > 0 && (
                  <li>• Exporting {selectedProductIds.length} selected products</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || loading || selectedColumns.size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Start Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
