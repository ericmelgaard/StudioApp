import { useState, useEffect } from 'react';
import { X, MapPin, Globe, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProductHierarchyModalProps {
  isOpen: boolean;
  onClose: () => void;
  productIds: string[];
  conceptId?: number;
  companyId?: number;
  siteId?: number;
}

interface LocationNode {
  id: number;
  name: string;
  type: 'concept' | 'company' | 'site';
  children?: LocationNode[];
}

interface ProductVariation {
  productId: string;
  productName: string;
  locationId: number;
  locationName: string;
  locationType: string;
  locationPath: string;
  attributes: Record<string, any>;
  translations: Record<string, Record<string, any>>;
}

export default function ProductHierarchyModal({
  isOpen,
  onClose,
  productIds,
  conceptId,
  companyId,
  siteId
}: ProductHierarchyModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [availableLanguages, setAvailableLanguages] = useState<Array<{ code: string; name: string }>>([]);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>(['name', 'price', 'description']);
  const [locationTree, setLocationTree] = useState<LocationNode[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, productIds]);

  async function loadData() {
    setLoading(true);
    try {
      await Promise.all([
        loadLocationTree(),
        loadProductVariations(),
        loadAvailableLanguages()
      ]);
    } catch (error) {
      console.error('Error loading hierarchy data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadLocationTree() {
    // Currently not displaying tree view, but keeping for future enhancement
    setLocationTree([]);
  }

  async function loadProductVariations() {
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds);

    if (products) {
      // Fetch location details if we have IDs
      let locationInfo: { name: string; type: string; path: string } = {
        name: 'Unknown Location',
        type: 'unknown',
        path: ''
      };

      if (conceptId || companyId || siteId) {
        const locationPath: string[] = [];
        let locationType = 'concept';
        let locationName = '';

        // Fetch concept name
        if (conceptId) {
          const { data: concept } = await supabase
            .from('concepts')
            .select('name')
            .eq('id', conceptId)
            .maybeSingle();

          if (concept) {
            locationPath.push(concept.name);
            locationName = concept.name;
            locationType = 'concept';
          }
        }

        // Fetch company name
        if (companyId) {
          const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('id', companyId)
            .maybeSingle();

          if (company) {
            locationPath.push(company.name);
            locationName = company.name;
            locationType = 'company';
          }
        }

        // Fetch site name
        if (siteId) {
          const { data: site } = await supabase
            .from('sites')
            .select('name')
            .eq('id', siteId)
            .maybeSingle();

          if (site) {
            locationPath.push(site.name);
            locationName = site.name;
            locationType = 'site';
          }
        }

        locationInfo = {
          name: locationName,
          type: locationType,
          path: locationPath.join(' > ')
        };
      }

      const variationData: ProductVariation[] = products.map(product => ({
        productId: product.id,
        productName: product.name,
        locationId: siteId || companyId || conceptId || 0,
        locationName: locationInfo.name,
        locationType: locationInfo.type,
        locationPath: locationInfo.path,
        attributes: product.attributes || {},
        translations: extractTranslations(product.attributes)
      }));

      setVariations(variationData);
    }
  }

  function extractTranslations(attributes: Record<string, any>): Record<string, Record<string, any>> {
    const translations: Record<string, Record<string, any>> = {};

    Object.keys(attributes).forEach(key => {
      if (key.startsWith('translations_')) {
        translations[key] = attributes[key] || {};
      }
    });

    return translations;
  }

  async function loadAvailableLanguages() {
    const { data: settings } = await supabase
      .from('organization_settings')
      .select('default_product_attribute_template_id')
      .limit(1)
      .maybeSingle();

    if (settings?.default_product_attribute_template_id) {
      const { data: template } = await supabase
        .from('product_attribute_templates')
        .select('translations')
        .eq('id', settings.default_product_attribute_template_id)
        .maybeSingle();

      if (template?.translations && Array.isArray(template.translations)) {
        const langs = [
          { code: 'en', name: 'English' },
          ...template.translations.map((t: any) => ({
            code: t.locale,
            name: t.locale_name
          }))
        ];
        setAvailableLanguages(langs);
      } else {
        setAvailableLanguages([{ code: 'en', name: 'English' }]);
      }
    }
  }

  function getAttributeValue(variation: ProductVariation, attribute: string): any {
    if (selectedLanguage === 'en') {
      return variation.attributes[attribute] ?? '-';
    } else {
      const translationKey = `translations_${selectedLanguage.replace('-', '_').toLowerCase()}`;
      return variation.translations[translationKey]?.[attribute] ?? variation.attributes[attribute] ?? '-';
    }
  }

  function getTranslationStatus(variation: ProductVariation, attribute: string): 'complete' | 'missing' | null {
    if (selectedLanguage === 'en') return null;

    const translationKey = `translations_${selectedLanguage.replace('-', '_').toLowerCase()}`;
    const value = variation.translations[translationKey]?.[attribute];

    if (value !== undefined && value !== null && value !== '') {
      return 'complete';
    }

    return 'missing';
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col relative z-[201]">
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4 flex items-center justify-between rounded-t-xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Location Hierarchy View</h2>
              <p className="text-sm text-purple-100">Compare products across locations and languages</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="border-b border-slate-200 px-6 py-3 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Language:</span>
            </div>
            <div className="flex gap-2">
              {availableLanguages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedLanguage === lang.code
                      ? 'bg-purple-100 text-purple-700 border border-purple-300'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-purple-300'
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>

          <div className="text-sm text-slate-600">
            {productIds.length} product{productIds.length !== 1 ? 's' : ''} selected
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-purple-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {variations.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No variations found</h3>
                  <p className="text-slate-600">Selected products have no location variations.</p>
                </div>
              ) : (
                variations.map(variation => (
                  <div key={`${variation.productId}-${variation.locationId}`} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <h3 className="font-semibold text-slate-900">{variation.productName}</h3>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{variation.locationPath || variation.locationName}</span>
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                              {variation.locationType}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {selectedAttributes.map(attribute => {
                          const value = getAttributeValue(variation, attribute);
                          const translationStatus = getTranslationStatus(variation, attribute);

                          return (
                            <div key={attribute} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                                  {attribute}
                                </label>
                                {translationStatus === 'complete' && (
                                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                    <Check className="w-3 h-3" />
                                  </span>
                                )}
                                {translationStatus === 'missing' && (
                                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                                    <AlertCircle className="w-3 h-3" />
                                  </span>
                                )}
                              </div>
                              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-slate-600">
            {selectedLanguage !== 'en' && (
              <span>
                Translation completeness indicator shown for each field
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
