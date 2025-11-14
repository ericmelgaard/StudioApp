import { useState, useEffect } from 'react';
import { X, Search, Link as LinkIcon, Plus, Trash2, Calculator, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FieldLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: (linkData: FieldLinkData) => void;
  fieldName: string;
  fieldLabel: string;
  currentValue?: any;
  currentLink?: FieldLinkData | null;
}

export interface FieldLinkData {
  type: 'direct' | 'calculation';
  directLink?: {
    productId: string;
    productName: string;
    field: string;
    linkType: 'product' | 'modifier' | 'discount';
  };
  calculation?: CalculationPart[];
}

export interface CalculationPart {
  id: string;
  productId: string;
  productName: string;
  field: string;
  linkType: 'product' | 'modifier' | 'discount';
  operation: 'add' | 'subtract';
  value?: any;
}

interface IntegrationProduct {
  id: string;
  name: string;
  external_id: string;
  data: any;
  item_type: string;
}

export default function FieldLinkModal({
  isOpen,
  onClose,
  onLink,
  fieldName,
  fieldLabel,
  currentValue,
  currentLink
}: FieldLinkModalProps) {
  const [mode, setMode] = useState<'direct' | 'calculation'>('direct');
  const [linkType, setLinkType] = useState<'product' | 'modifier' | 'discount'>('product');
  const [searchTerm, setSearchTerm] = useState('');
  const [integrationProducts, setIntegrationProducts] = useState<IntegrationProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<IntegrationProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<IntegrationProduct | null>(null);
  const [selectedField, setSelectedField] = useState<string>('');
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [mappedField, setMappedField] = useState<string>('');
  const [hasMapping, setHasMapping] = useState(false);
  const [showInactiveAPIs, setShowInactiveAPIs] = useState(false);

  const [calculationParts, setCalculationParts] = useState<CalculationPart[]>([]);
  const [editingPart, setEditingPart] = useState<CalculationPart | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadIntegrationProducts();
      if (currentLink) {
        setMode(currentLink.type);
        if (currentLink.type === 'calculation' && currentLink.calculation) {
          setCalculationParts(currentLink.calculation);
        } else if (currentLink.type === 'direct' && currentLink.directLink) {
          setLinkType(currentLink.directLink.linkType);
        }
      }
    } else {
      resetModal();
    }
  }, [isOpen, currentLink]);

  useEffect(() => {
    if (isOpen) {
      setMappedField('');
      setHasMapping(false);
      setSelectedField('');
      setSelectedProduct(null);
      loadIntegrationProducts();
      loadAttributeMappings();
    }
  }, [linkType, isOpen]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts(integrationProducts);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredProducts(
        integrationProducts.filter(p =>
          p.name.toLowerCase().includes(term) ||
          p.external_id.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, integrationProducts]);

  useEffect(() => {
    if (selectedProduct && selectedProduct.data) {
      const fields = extractAllFields(selectedProduct.data);
      setAvailableFields(fields);

      if (mappedField && fields.includes(mappedField)) {
        setSelectedField(mappedField);
      }
    } else {
      setAvailableFields([]);
    }
  }, [selectedProduct, mappedField]);

  function extractAllFields(obj: any, prefix = ''): string[] {
    let fields: string[] = [];

    for (const key in obj) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (value === null || value === undefined) {
        fields.push(fullPath);
      } else if (Array.isArray(value)) {
        fields.push(fullPath);
        if (value.length > 0 && typeof value[0] === 'object') {
          fields = fields.concat(extractAllFields(value[0], `${fullPath}[0]`));
        }
      } else if (typeof value === 'object') {
        fields = fields.concat(extractAllFields(value, fullPath));
      } else {
        fields.push(fullPath);
      }
    }

    return fields;
  }

  function getFieldValue(obj: any, path: string): any {
    try {
      const parts = path.split(/[.\[\]]+/).filter(Boolean);
      let value = obj;

      for (const part of parts) {
        if (value === null || value === undefined) return undefined;
        value = value[part];
      }

      return value;
    } catch {
      return undefined;
    }
  }

  const loadIntegrationProducts = async () => {
    setLoading(true);
    try {
      let tableName = 'integration_products';
      if (linkType === 'modifier') {
        tableName = 'integration_modifiers';
      } else if (linkType === 'discount') {
        tableName = 'integration_discounts';
      }

      const { data, error } = await supabase
        .from(tableName)
        .select('id, name, external_id, data')
        .order('name');

      if (error) throw error;
      const items = (data || []).map((item: any) => ({
        ...item,
        item_type: linkType
      }));
      setIntegrationProducts(items);
      setFilteredProducts(items);
    } catch (error) {
      console.error('Error loading integration items:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAttributeMappings = async () => {
    try {
      const { data: mappings, error } = await supabase
        .from('integration_attribute_mappings')
        .select('attribute_mappings, integration_type')
        .eq('is_template', true)
        .eq('integration_type', linkType);

      if (error) throw error;

      if (mappings && mappings.length > 0) {
        const mapping = mappings[0];

        if (mapping.attribute_mappings?.mappings) {
          const fieldMapping = mapping.attribute_mappings.mappings.find(
            (m: any) => m.wand_field === fieldName
          );

          if (fieldMapping?.integration_field) {
            setMappedField(fieldMapping.integration_field);
            setSelectedField(fieldMapping.integration_field);
            setHasMapping(true);
          }
        }
      }
    } catch (error) {
      console.error('Error loading attribute mappings:', error);
    }
  };

  const handleDirectLink = () => {
    if (!selectedProduct || !selectedField) return;

    onLink({
      type: 'direct',
      directLink: {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        field: selectedField,
        linkType
      }
    });
    handleClose();
  };

  const handleAddCalculationPart = () => {
    if (!selectedProduct || !selectedField) return;

    const fieldValue = getFieldValue(selectedProduct.data, selectedField);

    const newPart: CalculationPart = {
      id: crypto.randomUUID(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      field: selectedField,
      linkType,
      operation: calculationParts.length === 0 ? 'add' : 'add',
      value: fieldValue
    };

    setCalculationParts([...calculationParts, newPart]);
    setSelectedProduct(null);
    setSelectedField('');
    setSearchTerm('');
  };

  const handleRemoveCalculationPart = (id: string) => {
    setCalculationParts(calculationParts.filter(p => p.id !== id));
  };

  const handleUpdateOperation = (id: string, operation: 'add' | 'subtract') => {
    setCalculationParts(calculationParts.map(p =>
      p.id === id ? { ...p, operation } : p
    ));
  };

  const handleSaveCalculation = () => {
    if (calculationParts.length === 0) return;

    onLink({
      type: 'calculation',
      calculation: calculationParts
    });
    handleClose();
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const resetModal = () => {
    setMode('direct');
    setLinkType('product');
    setSearchTerm('');
    setSelectedProduct(null);
    setSelectedField('');
    setCalculationParts([]);
    setEditingPart(null);
    setMappedField('');
    setHasMapping(false);
  };

  if (!isOpen) return null;

  const selectedFieldValue = selectedProduct && selectedField
    ? getFieldValue(selectedProduct.data, selectedField)
    : undefined;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4"
      onClick={handleClose}
    >
      <div
        className="relative z-[71] bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Link Field to Integration Data</h2>
            <p className="text-sm text-slate-600 mt-1">
              Linking: <span className="font-medium">{fieldLabel}</span>
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
          {currentValue && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">Current Value:</p>
              <p className="text-sm text-blue-700 mt-1">{String(currentValue)}</p>
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Show inactive API sources</span>
            </div>
            <button
              type="button"
              onClick={() => setShowInactiveAPIs(!showInactiveAPIs)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showInactiveAPIs ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showInactiveAPIs ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Link Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('direct')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  mode === 'direct'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <LinkIcon className="w-4 h-4" />
                Direct Link
              </button>
              <button
                onClick={() => setMode('calculation')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  mode === 'calculation'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Calculator className="w-4 h-4" />
                Calculation
              </button>
            </div>
          </div>

          {mode === 'calculation' && (
            <>
              {calculationParts.length === 0 ? (
                !hasMapping && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-900 mb-2">Create a Calculation</p>
                    <p className="text-sm text-blue-700">
                      Select items and fields below, then click "Add Part" to build your calculation.
                      You can combine multiple values using mathematical operations (+, -, ×, ÷).
                    </p>
                  </div>
                )
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-slate-700">Calculation Parts:</p>
                  {calculationParts.map((part, index) => (
                    <div key={part.id} className="flex items-center gap-2 bg-white p-3 rounded-lg">
                      {index > 0 && (
                        <select
                          value={part.operation}
                          onChange={(e) => handleUpdateOperation(part.id, e.target.value as any)}
                          className="px-2 py-1 border border-slate-300 rounded text-sm"
                        >
                          <option value="add">+</option>
                          <option value="subtract">-</option>
                        </select>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{part.productName}</p>
                        <p className="text-xs text-slate-500">{part.field}</p>
                        <span className="text-xs text-slate-400">({part.linkType})</span>
                        {part.value !== undefined && part.value !== null && (
                          <p className="text-xs font-semibold text-blue-600 mt-1">Value: {part.value}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveCalculationPart(part.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {mode === 'calculation' ? 'Add to Calculation' : 'Link Type'}
            </label>
            <div className="flex gap-2">
              {(['product', 'modifier', 'discount'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setLinkType(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    linkType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Search Integration {linkType.charAt(0).toUpperCase() + linkType.slice(1)}s
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or ID..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {searchTerm
                ? 'No items found matching your search.'
                : `No integration ${linkType}s available. ${linkType !== 'product' ? 'Import modifiers and discounts from your integration first.' : ''}`}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select {linkType.charAt(0).toUpperCase() + linkType.slice(1)}
              </label>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                {filteredProducts.map((product) => {
                  const priceValue = mappedField ? getFieldValue(product.data, mappedField) : null;
                  return (
                    <button
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 ${
                        selectedProduct?.id === product.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">{product.name}</div>
                          <div className="text-xs text-slate-500 mt-1">ID: {product.external_id}</div>
                        </div>
                        {priceValue !== null && priceValue !== undefined && (
                          <div className="ml-4 text-right">
                            <div className="text-sm font-semibold text-slate-900">{priceValue}</div>
                            <div className="text-xs text-slate-500">Price</div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {hasMapping && mappedField && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-900 mb-1">Auto-Mapped Field:</p>
              <p className="text-sm text-green-700">
                Based on your integration mapping, this will link to the <span className="font-medium">{mappedField}</span> field
              </p>
            </div>
          )}

          {selectedProduct && availableFields.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {hasMapping ? 'Field (Auto-Selected)' : 'Select Field to Link'}
              </label>
              <select
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  hasMapping && selectedField === mappedField
                    ? 'border-green-300 bg-green-50'
                    : 'border-slate-300'
                }`}
              >
                <option value="">Choose a field...</option>
                {availableFields.map((field) => (
                  <option key={field} value={field}>
                    {field} {field === mappedField ? '(Mapped)' : ''}
                  </option>
                ))}
              </select>
              {selectedFieldValue !== undefined && (
                <div className="mt-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                  <span className="font-medium">Integration value: </span>
                  {String(selectedFieldValue)}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 flex-shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          {mode === 'calculation' ? (
            <>
              <button
                onClick={handleAddCalculationPart}
                disabled={!selectedProduct || !selectedField}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Part
              </button>
              <button
                onClick={handleSaveCalculation}
                disabled={calculationParts.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Calculator className="w-4 h-4" />
                Save Calculation
              </button>
            </>
          ) : (
            <button
              onClick={handleDirectLink}
              disabled={!selectedProduct || !selectedField}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <LinkIcon className="w-4 h-4" />
              Link Field
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
