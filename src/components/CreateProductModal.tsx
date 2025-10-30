import { useState, useEffect } from 'react';
import { X, Package, Layout, Database, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AttributeTemplate {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  attribute_schema: {
    core_attributes: AttributeField[];
    extended_attributes: AttributeField[];
  };
}

interface AttributeField {
  name: string;
  type: string;
  required: boolean;
  label: string;
}

interface DisplayTemplate {
  id: string;
  name: string;
  description: string;
  template_type: string;
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
  const [attributeTemplates, setAttributeTemplates] = useState<AttributeTemplate[]>([]);
  const [displayTemplates, setDisplayTemplates] = useState<DisplayTemplate[]>([]);
  const [integrationProducts, setIntegrationProducts] = useState<IntegrationProduct[]>([]);
  const [searchIntegration, setSearchIntegration] = useState('');
  const [showIntegrationSearch, setShowIntegrationSearch] = useState(false);

  const [selectedAttributeTemplate, setSelectedAttributeTemplate] = useState<string>('');
  const [selectedDisplayTemplate, setSelectedDisplayTemplate] = useState<string>('');
  const [selectedIntegrationProduct, setSelectedIntegrationProduct] = useState<string>('');
  const [productName, setProductName] = useState('');
  const [attributes, setAttributes] = useState<Record<string, any>>({});

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchIntegration && showIntegrationSearch) {
      searchIntegrationProducts();
    } else {
      setIntegrationProducts([]);
    }
  }, [searchIntegration, showIntegrationSearch]);

  async function loadTemplates() {
    const [attrTemplates, dispTemplates] = await Promise.all([
      supabase.from('product_attribute_templates').select('*').order('name'),
      supabase.from('product_templates').select('*').order('name')
    ]);

    if (attrTemplates.data) setAttributeTemplates(attrTemplates.data);
    if (dispTemplates.data) setDisplayTemplates(dispTemplates.data);
  }

  async function searchIntegrationProducts() {
    const { data } = await supabase
      .from('integration_products')
      .select('*')
      .ilike('name', `%${searchIntegration}%`)
      .limit(10);

    if (data) setIntegrationProducts(data);
  }

  function resetForm() {
    setSelectedAttributeTemplate('');
    setSelectedDisplayTemplate('');
    setSelectedIntegrationProduct('');
    setProductName('');
    setAttributes({});
    setShowIntegrationSearch(false);
    setSearchIntegration('');
  }

  function handleSelectIntegrationProduct(product: IntegrationProduct) {
    setSelectedIntegrationProduct(product.id);
    setProductName(product.data?.displayAttribute?.itemTitle || product.name);

    const mappedAttributes: Record<string, any> = {};

    if (product.data?.description) {
      mappedAttributes.description = product.data.description;
    }

    const price = product.data?.prices?.prices?.[0]?.price ||
                  product.data?.priceAttribute?.prices?.[0]?.price;
    if (price) {
      mappedAttributes.price = parseFloat(price);
    }

    if (product.data?.imageUrl) {
      mappedAttributes.image_url = product.data.imageUrl;
    }

    setAttributes(mappedAttributes);
    setShowIntegrationSearch(false);
    setSearchIntegration('');
  }

  function handleAttributeChange(fieldName: string, value: any) {
    setAttributes(prev => ({
      ...prev,
      [fieldName]: value
    }));
  }

  function renderAttributeField(field: AttributeField) {
    const value = attributes[field.name] || '';

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            required={field.required}
            value={value}
            onChange={(e) => handleAttributeChange(field.name, e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder={field.label}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            step="any"
            required={field.required}
            value={value}
            onChange={(e) => handleAttributeChange(field.name, parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder={field.label}
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleAttributeChange(field.name, e.target.checked)}
              className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-2 focus:ring-purple-500"
            />
            <span className="text-sm text-slate-600">Enabled</span>
          </label>
        );

      default:
        return (
          <textarea
            rows={2}
            required={field.required}
            value={typeof value === 'string' ? value : JSON.stringify(value)}
            onChange={(e) => handleAttributeChange(field.name, e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder={field.label}
          />
        );
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('products')
        .insert({
          name: productName,
          attribute_template_id: selectedAttributeTemplate || null,
          display_template_id: selectedDisplayTemplate || null,
          integration_product_id: selectedIntegrationProduct || null,
          attributes: attributes
        });

      if (error) throw error;

      resetForm();
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

  const selectedTemplate = attributeTemplates.find(t => t.id === selectedAttributeTemplate);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
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
              <Database className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">Link Integration Product (Optional)</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Import data from an external integration product to auto-fill attributes
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Product Attribute Template *
              </div>
            </label>
            <select
              required
              value={selectedAttributeTemplate}
              onChange={(e) => {
                setSelectedAttributeTemplate(e.target.value);
                setAttributes({});
              }}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select a template...</option>
              {attributeTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} - {template.description}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Defines the shape and attributes of your product
            </p>
          </div>

          {selectedTemplate && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter product name"
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 border-b pb-2">Core Attributes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedTemplate.attribute_schema.core_attributes
                    .filter(field => field.name !== 'name')
                    .map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {field.label} {field.required && '*'}
                        </label>
                        {renderAttributeField(field)}
                      </div>
                    ))}
                </div>
              </div>

              {selectedTemplate.attribute_schema.extended_attributes.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900 border-b pb-2">Extended Attributes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedTemplate.attribute_schema.extended_attributes.map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {field.label} {field.required && '*'}
                        </label>
                        {renderAttributeField(field)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <div className="flex items-center gap-2">
                <Layout className="w-4 h-4" />
                Display Template (Optional)
              </div>
            </label>
            <select
              value={selectedDisplayTemplate}
              onChange={(e) => setSelectedDisplayTemplate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">No display template</option>
              {displayTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.template_type})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Defines how this product should be visually displayed
            </p>
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
              disabled={loading || !selectedAttributeTemplate}
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
