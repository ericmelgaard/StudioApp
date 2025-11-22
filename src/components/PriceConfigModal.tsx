import { useState, useEffect } from 'react';
import { X, DollarSign, RefreshCw } from 'lucide-react';
import FieldLinkModal, { FieldLinkData } from './FieldLinkModal';
import { supabase } from '../lib/supabase';

interface PriceConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: PriceConfig) => void;
  currentConfig?: PriceConfig | null;
  entityType: 'product' | 'category';
  currentValue?: number;
  categoryId?: string;
  integrationSourceId?: string;
}

export interface PriceConfig {
  mode: 'manual' | 'direct' | 'calculation' | 'range';
  manualValue?: number;
  rangeHigh?: number;
  rangeLow?: number;
  fieldLink?: FieldLinkData;
}

export default function PriceConfigModal({
  isOpen,
  onClose,
  onSave,
  currentConfig,
  entityType,
  currentValue,
  categoryId,
  integrationSourceId
}: PriceConfigModalProps) {
  const [selectedMode, setSelectedMode] = useState<'direct' | 'calculation' | 'range' | null>(null);
  const [showFieldLinkModal, setShowFieldLinkModal] = useState(false);
  const [rangeLow, setRangeLow] = useState<number>(0);
  const [rangeHigh, setRangeHigh] = useState<number>(0);
  const [pendingFieldLink, setPendingFieldLink] = useState<FieldLinkData | null>(null);
  const [calculatingRange, setCalculatingRange] = useState(false);
  const [rangeCalculated, setRangeCalculated] = useState(false);

  useEffect(() => {
    if (isOpen && currentConfig) {
      if (currentConfig.mode === 'range' && entityType === 'category') {
        setSelectedMode('range');
        setRangeLow(currentConfig.rangeLow || 0);
        setRangeHigh(currentConfig.rangeHigh || 0);
        setRangeCalculated(true);
      } else if (currentConfig.mode === 'direct' || currentConfig.mode === 'calculation') {
        setSelectedMode(currentConfig.mode);
        setPendingFieldLink(currentConfig.fieldLink || null);
      }
    } else {
      setSelectedMode(null);
      setRangeLow(0);
      setRangeHigh(0);
      setPendingFieldLink(null);
      setRangeCalculated(false);
    }
  }, [isOpen, currentConfig, entityType]);

  async function handleSelectMode(mode: 'direct' | 'calculation' | 'range') {
    setSelectedMode(mode);
    if (mode === 'direct' || mode === 'calculation') {
      setShowFieldLinkModal(true);
    } else if (mode === 'range') {
      await calculatePriceRange();
    }
  }

  async function calculatePriceRange() {
    setCalculatingRange(true);

    if (!categoryId || !integrationSourceId) {
      setRangeLow(0);
      setRangeHigh(0);
      setRangeCalculated(true);
      setCalculatingRange(false);
      return;
    }

    const { data: linkData } = await supabase
      .from('product_categories_links')
      .select('mapping_id')
      .eq('category_id', categoryId)
      .eq('integration_source_id', integrationSourceId)
      .single();

    if (!linkData?.mapping_id) {
      setRangeLow(0);
      setRangeHigh(0);
      setCalculatingRange(false);
      return;
    }

    const { data: products } = await supabase
      .from('integration_products')
      .select('data')
      .eq('integration_source_id', integrationSourceId)
      .eq('item_type', 'product');

    if (!products || products.length === 0) {
      setRangeLow(0);
      setRangeHigh(0);
      setCalculatingRange(false);
      return;
    }

    const categoryName = linkData.mapping_id;
    const prices: number[] = [];

    products.forEach(product => {
      const data = product.data as any;
      if (data?.category === categoryName && typeof data?.price === 'number' && data.price > 0) {
        prices.push(data.price);
      }
    });

    if (prices.length === 0) {
      setRangeLow(0);
      setRangeHigh(0);
    } else {
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      setRangeLow(minPrice);
      setRangeHigh(maxPrice);
    }

    setRangeCalculated(true);
    setCalculatingRange(false);
  }

  function handleFieldLinkSave(linkData: FieldLinkData) {
    setPendingFieldLink(linkData);
    setShowFieldLinkModal(false);
  }

  function handleSave() {
    if (selectedMode === 'range') {
      onSave({
        mode: 'range',
        rangeLow,
        rangeHigh
      });
    } else if (selectedMode && pendingFieldLink) {
      onSave({
        mode: selectedMode,
        fieldLink: pendingFieldLink
      });
    }
    handleClose();
  }

  function handleClose() {
    setSelectedMode(null);
    setRangeLow(0);
    setRangeHigh(0);
    setPendingFieldLink(null);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Configure Price</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {!selectedMode ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Choose how you want to configure the price:
                </p>

                <button
                  onClick={() => handleSelectMode('direct')}
                  className="w-full p-4 border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                >
                  <h3 className="font-semibold text-slate-900 mb-1">Direct Link</h3>
                  <p className="text-sm text-slate-600">
                    Link price directly to another product, modifier, or discount
                  </p>
                </button>

                <button
                  onClick={() => handleSelectMode('calculation')}
                  className="w-full p-4 border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                >
                  <h3 className="font-semibold text-slate-900 mb-1">Calculation</h3>
                  <p className="text-sm text-slate-600">
                    Calculate price using a formula (e.g., sum of multiple items)
                  </p>
                </button>

                {entityType === 'category' && (
                  <button
                    onClick={() => handleSelectMode('range')}
                    disabled={!categoryId || !integrationSourceId}
                    className="w-full p-4 border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:bg-white"
                  >
                    <h3 className="font-semibold text-slate-900 mb-1">Price Range</h3>
                    <p className="text-sm text-slate-600">
                      Calculate price range from products in this category
                      {(!categoryId || !integrationSourceId) && (
                        <span className="block mt-1 text-amber-600 font-medium">
                          Requires integration source link
                        </span>
                      )}
                    </p>
                  </button>
                )}
              </div>
            ) : selectedMode === 'range' ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    Price range is calculated from products linked to this category in the integration source.
                  </p>
                </div>

                {calculatingRange ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                    <span className="ml-3 text-slate-600">Calculating price range...</span>
                  </div>
                ) : rangeCalculated ? (
                  <div className="space-y-4">
                    {rangeLow === 0 && rangeHigh === 0 ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-900">
                          No products found in this category with valid prices.
                        </p>
                      </div>
                    ) : rangeLow === rangeHigh ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-green-900 mb-1">Calculated Price:</p>
                        <p className="text-2xl font-bold text-green-900">${rangeLow.toFixed(2)}</p>
                        <p className="text-xs text-green-700 mt-1">All products have the same price</p>
                      </div>
                    ) : (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-green-900 mb-1">Calculated Price Range:</p>
                        <p className="text-2xl font-bold text-green-900">
                          ${rangeLow.toFixed(2)} - ${rangeHigh.toFixed(2)}
                        </p>
                      </div>
                    )}

                    <button
                      onClick={calculatePriceRange}
                      className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Recalculate Range
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    {selectedMode === 'direct'
                      ? 'Price will be linked directly to another item. Click the button below to configure.'
                      : 'Price will be calculated using a formula. Click the button below to configure.'}
                  </p>
                </div>

                {pendingFieldLink && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-900 mb-2">
                      {selectedMode === 'direct' ? 'Direct Link Configured' : 'Calculation Configured'}
                    </p>
                    {pendingFieldLink.type === 'direct' && pendingFieldLink.directLink && (
                      <p className="text-sm text-green-800">
                        Linked to: {pendingFieldLink.directLink.productName}
                      </p>
                    )}
                    {pendingFieldLink.type === 'calculation' && pendingFieldLink.calculation && (
                      <p className="text-sm text-green-800">
                        {pendingFieldLink.calculation.length} items in calculation
                      </p>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setShowFieldLinkModal(true)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {pendingFieldLink ? 'Edit Configuration' : 'Configure Link'}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 p-6 border-t border-slate-200 bg-slate-50">
            <button
              onClick={() => setSelectedMode(null)}
              className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              disabled={!selectedMode}
            >
              Back
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={
                  !selectedMode ||
                  (selectedMode === 'range' && (!rangeCalculated || (rangeLow === 0 && rangeHigh === 0))) ||
                  ((selectedMode === 'direct' || selectedMode === 'calculation') && !pendingFieldLink)
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      </div>

      {showFieldLinkModal && selectedMode && (
        <FieldLinkModal
          isOpen={showFieldLinkModal}
          onClose={() => setShowFieldLinkModal(false)}
          onLink={handleFieldLinkSave}
          fieldName="price"
          fieldLabel="Price"
          currentValue={currentValue}
          currentLink={pendingFieldLink}
        />
      )}
    </>
  );
}
