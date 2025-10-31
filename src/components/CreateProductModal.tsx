import { useState, useEffect } from 'react';
import { X, Package, Layout, Database, Sparkles, Plus, Link, Unlink, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ImageUploadField from './ImageUploadField';
import RichTextEditor from './RichTextEditor';
import LinkProductModal, { LinkData } from './LinkProductModal';
import FieldLinkModal from './FieldLinkModal';

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
  minHeight?: string;
  resolution?: { width: number; height: number };
  description?: string;
}

interface Size {
  id: string;
  label: string;
  price: number;
  is_active: boolean;
  is_out_of_stock: boolean;
  link?: LinkData;
}

interface SizesEditorProps {
  sizes: Size[];
  onChange: (sizes: Size[]) => void;
}

function SizesEditor({ sizes, onChange }: SizesEditorProps) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkingSizeId, setLinkingSizeId] = useState<string | null>(null);
  const [currentLink, setCurrentLink] = useState<LinkData | null>(null);

  const addSize = () => {
    const newSize: Size = {
      id: crypto.randomUUID(),
      label: '',
      price: 0,
      is_active: true,
      is_out_of_stock: false,
    };
    onChange([...sizes, newSize]);
  };

  const updateSize = (id: string, updates: Partial<Size>) => {
    onChange(sizes.map(size => size.id === id ? { ...size, ...updates } : size));
  };

  const removeSize = (id: string) => {
    onChange(sizes.filter(size => size.id !== id));
  };

  const openLinkModal = (sizeId: string) => {
    const size = sizes.find(s => s.id === sizeId);
    setLinkingSizeId(sizeId);
    setCurrentLink(size?.link || null);
    setShowLinkModal(true);
  };

  const handleLink = (linkData: LinkData) => {
    if (linkingSizeId) {
      updateSize(linkingSizeId, { link: linkData });
    }
  };

  const handleUnlink = (sizeId: string) => {
    updateSize(sizeId, { link: undefined });
  };

  return (
    <div className="space-y-3">
      {sizes.map((size) => (
        <div key={size.id} className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex-1 grid grid-cols-2 gap-3">
            <input
              type="text"
              value={size.label}
              onChange={(e) => updateSize(size.id, { label: e.target.value })}
              placeholder="Size label (e.g., Small)"
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              disabled={!!size.link}
            />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                step="0.01"
                value={size.price}
                onChange={(e) => updateSize(size.id, { price: parseFloat(e.target.value) || 0 })}
                disabled={!!size.link}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-slate-100 disabled:text-slate-500"
              />
              {size.link && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">Linked</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-slate-500">Active</span>
              <button
                type="button"
                onClick={() => updateSize(size.id, { is_active: !size.is_active })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  size.is_active ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                    size.is_active ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-slate-500">Out of Stock</span>
              <button
                type="button"
                onClick={() => updateSize(size.id, { is_out_of_stock: !size.is_out_of_stock })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  size.is_out_of_stock ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                    size.is_out_of_stock ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {size.link ? (
              <button
                type="button"
                onClick={() => handleUnlink(size.id)}
                className="p-2 rounded-lg transition-colors bg-green-100 text-green-700 hover:bg-green-200"
                title={`Linked to ${size.link.name || size.link.id}`}
              >
                <Unlink className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openLinkModal(size.id)}
                className="p-2 rounded-lg transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200"
                title="Link to integration product"
              >
                <Link className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => removeSize(size.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addSize}
        className="w-full py-2.5 px-4 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Size
      </button>

      <LinkProductModal
        isOpen={showLinkModal}
        onClose={() => {
          setShowLinkModal(false);
          setLinkingSizeId(null);
          setCurrentLink(null);
        }}
        onLink={handleLink}
        currentLink={currentLink}
      />
    </div>
  );
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
  const [linkedAttributes, setLinkedAttributes] = useState<Set<string>>(new Set());
  const [mappedFields, setMappedFields] = useState<Set<string>>(new Set());
  const [showFieldLinkModal, setShowFieldLinkModal] = useState(false);
  const [linkingField, setLinkingField] = useState<{ name: string; label: string } | null>(null);
  const [fieldLinks, setFieldLinks] = useState<Record<string, { productId: string; field: string }>>({});

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
    const [attrTemplates, dispTemplates, orgSettings] = await Promise.all([
      supabase.from('product_attribute_templates').select('*').order('name'),
      supabase.from('product_templates').select('*').order('name'),
      supabase.from('organization_settings').select('*').limit(1).maybeSingle()
    ]);

    if (attrTemplates.data) setAttributeTemplates(attrTemplates.data);
    if (dispTemplates.data) setDisplayTemplates(dispTemplates.data);

    if (orgSettings.data?.default_product_attribute_template_id) {
      setSelectedAttributeTemplate(orgSettings.data.default_product_attribute_template_id);
    }

    await loadAttributeMappings();
  }

  async function loadAttributeMappings() {
    const { data } = await supabase
      .from('integration_attribute_mappings')
      .select('attribute_mappings')
      .eq('is_template', true)
      .maybeSingle();

    if (data?.attribute_mappings?.mappings) {
      const mapped = new Set<string>();
      data.attribute_mappings.mappings.forEach((mapping: any) => {
        if (mapping.wand_field) {
          mapped.add(mapping.wand_field);
        }
      });
      setMappedFields(mapped);
    }
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
    setLinkedAttributes(new Set());
    setFieldLinks({});
    setShowIntegrationSearch(false);
    setSearchIntegration('');
  }

  function handleSelectIntegrationProduct(product: IntegrationProduct) {
    setSelectedIntegrationProduct(product.id);
    setProductName(product.data?.displayAttribute?.itemTitle || product.name);

    const mappedAttributes: Record<string, any> = {};
    const linkedAttrs = new Set<string>();

    if (product.data?.description) {
      mappedAttributes.description = product.data.description;
      linkedAttrs.add('description');
    }

    const price = product.data?.prices?.prices?.[0]?.price ||
                  product.data?.priceAttribute?.prices?.[0]?.price;
    if (price) {
      mappedAttributes.price = parseFloat(price);
      linkedAttrs.add('price');
    }

    if (product.data?.imageUrl) {
      mappedAttributes.image_url = product.data.imageUrl;
      linkedAttrs.add('image_url');
    }

    setAttributes(mappedAttributes);
    setLinkedAttributes(linkedAttrs);
    setShowIntegrationSearch(false);
    setSearchIntegration('');
  }

  function handleAttributeChange(fieldName: string, value: any) {
    setAttributes(prev => ({
      ...prev,
      [fieldName]: value
    }));
  }

  function openFieldLinkModal(fieldName: string, fieldLabel: string) {
    setLinkingField({ name: fieldName, label: fieldLabel });
    setShowFieldLinkModal(true);
  }

  function handleFieldLink(integrationProductId: string, integrationField: string) {
    if (!linkingField) return;

    setFieldLinks(prev => ({
      ...prev,
      [linkingField.name]: { productId: integrationProductId, field: integrationField }
    }));

    setLinkedAttributes(prev => new Set([...prev, linkingField.name]));
    setShowFieldLinkModal(false);
    setLinkingField(null);
  }

  function renderAttributeField(field: AttributeField) {
    const value = attributes[field.name] || '';
    const isLinked = linkedAttributes.has(field.name);
    const isMapped = mappedFields.has(field.name) && !selectedIntegrationProduct;
    const showSyncIcon = isMapped && !isLinked;

    switch (field.type) {
      case 'text':
        return (
          <div className="relative">
            <input
              type="text"
              required={field.required}
              value={value}
              onChange={(e) => handleAttributeChange(field.name, e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isLinked ? 'border-green-400 bg-green-50 pr-20' : showSyncIcon ? 'pr-10 border-slate-300' : 'border-slate-300'
              }`}
              placeholder={field.label}
            />
            {isLinked ? (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-medium text-green-700">
                <Link className="w-3 h-3" />
                Synced
              </div>
            ) : showSyncIcon ? (
              <button
                type="button"
                onClick={() => openFieldLinkModal(field.name, field.label)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Link to integration field"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        );

      case 'richtext':
        return (
          <RichTextEditor
            value={value}
            onChange={(val) => handleAttributeChange(field.name, val)}
            placeholder={field.label}
            minHeight={field.minHeight}
          />
        );

      case 'image':
        return (
          <div className="relative">
            <ImageUploadField
              value={value}
              onChange={(url) => handleAttributeChange(field.name, url)}
              label={field.label}
              resolution={field.resolution}
            />
            {isLinked && (
              <div className="absolute top-2 right-2 bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                <Link className="w-3 h-3" />
                Synced from Integration
              </div>
            )}
          </div>
        );

      case 'sizes':
        return (
          <SizesEditor
            sizes={Array.isArray(value) ? value : []}
            onChange={(sizes) => handleAttributeChange(field.name, sizes)}
          />
        );

      case 'number':
        return (
          <div className="relative">
            <input
              type="number"
              step="any"
              required={field.required}
              value={value}
              onChange={(e) => handleAttributeChange(field.name, parseFloat(e.target.value) || 0)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isLinked ? 'border-green-400 bg-green-50 pr-20' : showSyncIcon ? 'pr-10 border-slate-300' : 'border-slate-300'
              }`}
              placeholder={field.label}
            />
            {isLinked ? (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-medium text-green-700">
                <Link className="w-3 h-3" />
                Synced
              </div>
            ) : showSyncIcon ? (
              <button
                type="button"
                onClick={() => openFieldLinkModal(field.name, field.label)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Link to integration field"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleAttributeChange(field.name, e.target.checked)}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                const template = attributeTemplates.find(t => t.id === e.target.value);
                const defaultAttrs: Record<string, any> = {};

                if (template) {
                  [...template.attribute_schema.core_attributes, ...template.attribute_schema.extended_attributes].forEach(field => {
                    if (field.type === 'sizes') {
                      defaultAttrs[field.name] = [];
                    }
                  });
                }

                setAttributes(defaultAttrs);
              }}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <div className="space-y-4">
                  {selectedTemplate.attribute_schema.core_attributes
                    .filter(field => field.name !== 'name')
                    .map((field) => (
                      <div key={field.name} className={field.type === 'sizes' || field.type === 'richtext' || field.type === 'image' ? '' : 'md:grid md:grid-cols-2 md:gap-4'}>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {field.label} {field.required && '*'}
                          {field.description && (
                            <span className="block text-xs font-normal text-slate-500 mt-1">{field.description}</span>
                          )}
                        </label>
                        {renderAttributeField(field)}
                      </div>
                    ))}
                </div>
              </div>

              {selectedTemplate.attribute_schema.extended_attributes.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900 border-b pb-2">Extended Attributes</h3>
                  <div className="space-y-4">
                    {selectedTemplate.attribute_schema.extended_attributes.map((field) => (
                      <div key={field.name} className={field.type === 'sizes' || field.type === 'richtext' || field.type === 'image' ? '' : 'md:grid md:grid-cols-2 md:gap-4'}>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {field.label} {field.required && '*'}
                          {field.description && (
                            <span className="block text-xs font-normal text-slate-500 mt-1">{field.description}</span>
                          )}
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
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>

      <FieldLinkModal
        isOpen={showFieldLinkModal}
        onClose={() => {
          setShowFieldLinkModal(false);
          setLinkingField(null);
        }}
        onLink={handleFieldLink}
        fieldName={linkingField?.name || ''}
        fieldLabel={linkingField?.label || ''}
        currentValue={linkingField ? attributes[linkingField.name] : undefined}
      />
    </div>
  );
}
