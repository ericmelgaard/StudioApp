import { useState, useEffect } from 'react';
import { X, Search, Link as LinkIcon, Plus, Trash2, Calculator } from 'lucide-react';
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
  operation: 'add' | 'subtract' | 'multiply' | 'divide';
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
    if (searchTerm.trim() === '') {
      setFilteredProducts(integrationProducts);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredProducts(
        integrationProducts.filter(p =>
          (p.name.toLowerCase().includes(term) ||
          p.external_id.toLowerCase().includes(term)) &&
          (linkType === 'product' ? p.item_type === 'product' :
           linkType === 'modifier' ? p.item_type === 'modifier' :
           p.item_type === 'discount')
        )
      );
    }
  }, [searchTerm, integrationProducts, linkType]);

  useEffect(() => {
    if (selectedProduct && selectedProduct.data) {
      const fields = extractAllFields(selectedProduct.data);
      setAvailableFields(fields);
    } else {
      setAvailableFields([]);
    }
  }, [selectedProduct]);

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
      const { data, error } = await supabase
        .from('integration_products')
        .select('id, name, external_id, data, item_type')
        .order('name');

      if (error) throw error;
      setIntegrationProducts(data || []);
      setFilteredProducts(data || []);
    } catch (error) {
      console.error('Error loading integration products:', error);
    } finally {
      setLoading(false);
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

    const newPart: CalculationPart = {
      id: crypto.randomUUID(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      field: selectedField,
      linkType,
      operation: calculationParts.length === 0 ? 'add' : 'add'
    };

    setCalculationParts([...calculationParts, newPart]);
    setSelectedProduct(null);
    setSelectedField('');
    setSearchTerm('');
  };

  const handleRemoveCalculationPart = (id: string) => {
    setCalculationParts(calculationParts.filter(p => p.id !== id));
  };

  const handleUpdateOperation = (id: string, operation: 'add' | 'subtract' | 'multiply' | 'divide') => {
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
  };

  if (!isOpen) return null;

  const selectedFieldValue = selectedProduct && selectedField
    ? getFieldValue(selectedProduct.data, selectedField)
    : undefined;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
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

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {currentValue && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">Current Value:</p>
              <p className="text-sm text-blue-700 mt-1">{String(currentValue)}</p>
            </div>
          )}

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

          {mode === 'calculation' && calculationParts.length > 0 && (
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
                      <option value="multiply">×</option>
                      <option value="divide">÷</option>
                    </select>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{part.productName}</p>
                    <p className="text-xs text-slate-500">{part.field}</p>
                    <span className="text-xs text-slate-400">({part.linkType})</span>
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
              {searchTerm ? 'No items found matching your search.' : `No integration ${linkType}s available.`}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select {linkType.charAt(0).toUpperCase() + linkType.slice(1)}
              </label>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 ${
                      selectedProduct?.id === product.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="font-medium text-slate-900">{product.name}</div>
                    <div className="text-xs text-slate-500 mt-1">ID: {product.external_id}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedProduct && availableFields.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Field to Link
              </label>
              <select
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a field...</option>
                {availableFields.map((field) => (
                  <option key={field} value={field}>
                    {field}
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

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
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
