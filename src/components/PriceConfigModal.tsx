import { useState, useEffect } from 'react';
import { X, DollarSign } from 'lucide-react';
import FieldLinkModal, { FieldLinkData } from './FieldLinkModal';

interface PriceConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: PriceConfig) => void;
  currentConfig?: PriceConfig | null;
  entityType: 'product' | 'category';
  currentValue?: number;
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
  currentValue
}: PriceConfigModalProps) {
  const [selectedMode, setSelectedMode] = useState<'direct' | 'calculation' | 'range' | null>(null);
  const [showFieldLinkModal, setShowFieldLinkModal] = useState(false);
  const [rangeLow, setRangeLow] = useState<number>(0);
  const [rangeHigh, setRangeHigh] = useState<number>(0);
  const [pendingFieldLink, setPendingFieldLink] = useState<FieldLinkData | null>(null);

  useEffect(() => {
    if (isOpen && currentConfig) {
      if (currentConfig.mode === 'range' && entityType === 'category') {
        setSelectedMode('range');
        setRangeLow(currentConfig.rangeLow || 0);
        setRangeHigh(currentConfig.rangeHigh || 0);
      } else if (currentConfig.mode === 'direct' || currentConfig.mode === 'calculation') {
        setSelectedMode(currentConfig.mode);
        setPendingFieldLink(currentConfig.fieldLink || null);
      }
    } else {
      setSelectedMode(null);
      setRangeLow(0);
      setRangeHigh(0);
      setPendingFieldLink(null);
    }
  }, [isOpen, currentConfig, entityType]);

  function handleSelectMode(mode: 'direct' | 'calculation' | 'range') {
    setSelectedMode(mode);
    if (mode === 'direct' || mode === 'calculation') {
      setShowFieldLinkModal(true);
    }
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
                    className="w-full p-4 border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                  >
                    <h3 className="font-semibold text-slate-900 mb-1">Price Range</h3>
                    <p className="text-sm text-slate-600">
                      Set a price range for products in this category
                    </p>
                  </button>
                )}
              </div>
            ) : selectedMode === 'range' ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    Set the price range for products in this category. This represents the minimum and maximum prices.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Low Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={rangeLow}
                        onChange={(e) => setRangeLow(parseFloat(e.target.value) || 0)}
                        className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      High Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={rangeHigh}
                        onChange={(e) => setRangeHigh(parseFloat(e.target.value) || 0)}
                        className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {rangeLow > 0 && rangeHigh > 0 && rangeLow < rangeHigh && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-900">
                      Price range: ${rangeLow.toFixed(2)} - ${rangeHigh.toFixed(2)}
                    </p>
                  </div>
                )}

                {rangeLow > 0 && rangeHigh > 0 && rangeLow >= rangeHigh && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-900">
                      Low price must be less than high price
                    </p>
                  </div>
                )}
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
                  (selectedMode === 'range' && (rangeLow <= 0 || rangeHigh <= 0 || rangeLow >= rangeHigh)) ||
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
