import { useState, useEffect } from 'react';
import { X, Package, DollarSign, Utensils, Flame, Layout } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProductTemplate {
  id: string;
  name: string;
  description: string;
  template_type: string;
  dimensions: any;
}

interface IntegrationProduct {
  id: string;
  name: string;
  external_id: string;
  data: any;
}

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateProductModal({ isOpen, onClose, onSuccess }: CreateProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [integrationProducts, setIntegrationProducts] = useState<IntegrationProduct[]>([]);
  const [searchIntegration, setSearchIntegration] = useState('');
  const [showIntegrationSearch, setShowIntegrationSearch] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    calories: '',
    portion: '',
    template_id: '',
    integration_product_id: '',
    image_url: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchIntegration && showIntegrationSearch) {
      searchIntegrationProducts();
    }
  }, [searchIntegration]);

  async function loadTemplates() {
    const { data } = await supabase
      .from('product_templates')
      .select('*')
      .order('name');

    if (data) setTemplates(data);
  }

  async function searchIntegrationProducts() {
    const { data } = await supabase
      .from('integration_products')
      .select('*')
      .ilike('name', `%${searchIntegration}%`)
      .limit(10);

    if (data) setIntegrationProducts(data);
  }

  function handleSelectIntegrationProduct(product: IntegrationProduct) {
    const price = product.data?.prices?.prices?.[0]?.price ||
                  product.data?.priceAttribute?.prices?.[0]?.price;

    setFormData({
      ...formData,
      name: product.data?.displayAttribute?.itemTitle || product.name,
      description: product.data?.description || '',
      price: price ? price.toString() : '',
      integration_product_id: product.id,
      image_url: product.data?.imageUrl || ''
    });
    setShowIntegrationSearch(false);
    setSearchIntegration('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('products')
        .insert({
          name: formData.name,
          description: formData.description,
          price: formData.price,
          calories: formData.calories,
          portion: formData.portion,
          template_id: formData.template_id || null,
          integration_product_id: formData.integration_product_id || null,
          image_url: formData.image_url || null,
        });

      if (error) throw error;

      setFormData({
        name: '',
        description: '',
        price: '',
        calories: '',
        portion: '',
        template_id: '',
        integration_product_id: '',
        image_url: ''
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
              <Package className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Create Product</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Package className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Link Integration Product</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Optionally map this product to an external integration product to auto-fill details
                </p>
                <button
                  type="button"
                  onClick={() => setShowIntegrationSearch(!showIntegrationSearch)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 underline"
                >
                  {showIntegrationSearch ? 'Hide Search' : 'Search Integration Products'}
                </button>

                {showIntegrationSearch && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="text"
                      placeholder="Search integration products..."
                      value={searchIntegration}
                      onChange={(e) => setSearchIntegration(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {integrationProducts.length > 0 && (
                      <div className="max-h-48 overflow-y-auto space-y-1 bg-white border border-slate-200 rounded-lg p-2">
                        {integrationProducts.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => handleSelectIntegrationProduct(product)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded transition-colors"
                          >
                            <div className="font-medium text-slate-900">{product.name}</div>
                            <div className="text-xs text-slate-500">ID: {product.external_id}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., Classic Cheeseburger"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Describe this product..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Price
                  </div>
                </label>
                <input
                  type="text"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4" />
                    Calories
                  </div>
                </label>
                <input
                  type="text"
                  value={formData.calories}
                  onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Utensils className="w-4 h-4" />
                    Portion
                  </div>
                </label>
                <input
                  type="text"
                  value={formData.portion}
                  onChange={(e) => setFormData({ ...formData, portion: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="1 serving"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Image URL
              </label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <div className="flex items-center gap-2">
                  <Layout className="w-4 h-4" />
                  Product Template
                </div>
              </label>
              <select
                value={formData.template_id}
                onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">No template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.template_type})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Select a template to define how this product should be displayed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
