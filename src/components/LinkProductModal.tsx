import { useState, useEffect } from 'react';
import { X, Search, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LinkProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: (linkData: LinkData) => void;
  currentLink?: LinkData | null;
}

export interface LinkData {
  type: 'product' | 'modifier' | 'discount';
  id: string;
  field: string;
  name?: string;
}

interface IntegrationProduct {
  id: string;
  name: string;
  integration_id: string;
  raw_data: any;
}

export default function LinkProductModal({ isOpen, onClose, onLink, currentLink }: LinkProductModalProps) {
  const [linkType, setLinkType] = useState<'product' | 'modifier' | 'discount'>(currentLink?.type || 'product');
  const [searchTerm, setSearchTerm] = useState('');
  const [integrationProducts, setIntegrationProducts] = useState<IntegrationProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<IntegrationProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<IntegrationProduct | null>(null);
  const [selectedField, setSelectedField] = useState<string>(currentLink?.field || '');
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadIntegrationProducts();
      if (currentLink) {
        setLinkType(currentLink.type);
        setSelectedField(currentLink.field);
      }
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
          p.integration_id.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, integrationProducts]);

  useEffect(() => {
    if (selectedProduct && selectedProduct.raw_data) {
      const fields = Object.keys(selectedProduct.raw_data).filter(key =>
        typeof selectedProduct.raw_data[key] !== 'object' || selectedProduct.raw_data[key] === null
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
        .select('id, name, integration_id, raw_data')
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

  const handleLink = () => {
    if (!selectedProduct || !selectedField) return;

    onLink({
      type: linkType,
      id: selectedProduct.id,
      field: selectedField,
      name: selectedProduct.name,
    });
    handleClose();
  };

  const handleClose = () => {
    setSearchTerm('');
    setSelectedProduct(null);
    setSelectedField('');
    setLinkType('product');
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
                    <div className="text-xs text-slate-500 mt-1">ID: {product.integration_id}</div>
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
              {selectedField && selectedProduct.raw_data[selectedField] && (
                <div className="mt-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                  <span className="font-medium">Current value: </span>
                  {String(selectedProduct.raw_data[selectedField])}
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
          <button
            onClick={handleLink}
            disabled={!selectedProduct || !selectedField}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <LinkIcon className="w-4 h-4" />
            Link Field
          </button>
        </div>
      </div>
    </div>
  );
}
