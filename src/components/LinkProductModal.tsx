import { useState, useEffect } from 'react';
import { X, Search, Link as LinkIcon, Plus, Trash2, Calculator } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LinkProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: (linkData: LinkData) => void;
  currentLink?: LinkData | null;
}

export interface LinkData {
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
}

export default function LinkProductModal({ isOpen, onClose, onLink, currentLink }: LinkProductModalProps) {
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
          p.name.toLowerCase().includes(term) ||
          p.external_id.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, integrationProducts]);

  useEffect(() => {
    if (selectedProduct && selectedProduct.data) {
      const fields = Object.keys(selectedProduct.data).filter(key =>
        typeof selectedProduct.data[key] !== 'object' || selectedProduct.data[key] === null
      );
      setAvailableFields(fields);
    } else {
      setAvailableFields([]);
    }
  }, [selectedProduct]);

  const loadIntegrationProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('integration_products')
        .select('id, name, external_id, data')
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

  const addCalculationPart = () => {
    if (!selectedProduct || !selectedField) return;

    const newPart: CalculationPart = {
      id: crypto.randomUUID(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      field: selectedField,
      linkType: linkType,
      operation: calculationParts.length === 0 ? 'add' : 'add',
      value: selectedProduct.data[selectedField]
    };

    setCalculationParts([...calculationParts, newPart]);
    setSelectedProduct(null);
    setSelectedField('');
    setSearchTerm('');
  };

  const updateCalculationPart = (id: string, operation: 'add' | 'subtract') => {
    setCalculationParts(calculationParts.map(part =>
      part.id === id ? { ...part, operation } : part
    ));
  };

  const removeCalculationPart = (id: string) => {
    setCalculationParts(calculationParts.filter(part => part.id !== id));
  };

  const handleLink = () => {
    if (mode === 'direct') {
      if (!selectedProduct || !selectedField) return;
      onLink({
        type: 'direct',
        directLink: {
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          field: selectedField,
          linkType: linkType
        }
      });
    } else {
      if (calculationParts.length === 0) return;
      onLink({
        type: 'calculation',
        calculation: calculationParts
      });
    }
    handleClose();
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

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Link to Integration Product</h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Link Mode
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('direct')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
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

          {/* Link Type Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Link Type
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

          {/* Search Integration Products */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Search Integration Products
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

          {/* Products List */}
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {searchTerm ? 'No products found matching your search.' : 'No integration products available.'}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Product
              </label>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
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

          {/* Field Selection */}
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
              {selectedField && selectedProduct.data[selectedField] && (
                <div className="mt-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                  <span className="font-medium">Current value: </span>
                  {String(selectedProduct.data[selectedField])}
                </div>
              )}
              {mode === 'calculation' && (
                <button
                  onClick={addCalculationPart}
                  disabled={!selectedField}
                  className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add to Calculation
                </button>
              )}
            </div>
          )}

          {/* Calculation Parts */}
          {mode === 'calculation' && calculationParts.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Calculation
              </label>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="space-y-2">
                  {calculationParts.map((part, index) => {
                    const isSubtract = index > 0 && part.operation === 'subtract';
                    return (
                      <div key={part.id} className="flex items-center gap-2 text-sm">
                        {index > 0 && (
                          <select
                            value={part.operation}
                            onChange={(e) => updateCalculationPart(part.id, e.target.value as 'add' | 'subtract')}
                            className={`w-16 px-2 py-1 border rounded text-xs font-bold ${
                              part.operation === 'subtract' ? 'text-red-600 border-red-300' : 'text-slate-600 border-slate-300'
                            }`}
                          >
                            <option value="add">+</option>
                            <option value="subtract">−</option>
                          </select>
                        )}
                        {index === 0 && <span className="w-16"></span>}
                        <div className="flex-1 flex items-center justify-between bg-white px-3 py-2 rounded border border-slate-200">
                          <div>
                            <span className={`font-medium ${
                              isSubtract ? 'text-red-700' : 'text-slate-700'
                            }`}>{part.productName}</span>
                            <span className="text-xs text-slate-500 ml-2">({part.field})</span>
                          </div>
                          {part.value !== undefined && part.value !== null && (
                            <span className={`font-bold ${
                              isSubtract ? 'text-red-600' : 'text-blue-600'
                            }`}>${part.value}</span>
                          )}
                        </div>
                        <button
                          onClick={() => removeCalculationPart(part.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
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
          <button
            onClick={handleLink}
            disabled={(mode === 'direct' && (!selectedProduct || !selectedField)) || (mode === 'calculation' && calculationParts.length === 0)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <LinkIcon className="w-4 h-4" />
            {mode === 'calculation' ? 'Link Calculation' : 'Link Field'}
          </button>
        </div>
      </div>
    </div>
  );
}
