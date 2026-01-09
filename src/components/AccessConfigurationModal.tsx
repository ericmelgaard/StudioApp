import React, { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { useAccessConfiguration } from '../hooks/useAccessConfiguration';
import { TreeBrowser } from './AccessConfiguration/TreeBrowser';
import { DetailView } from './AccessConfiguration/DetailView';
import { SelectionSummary } from './AccessConfiguration/SelectionSummary';

interface AccessConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userName?: string;
  onSave: (selection: any) => Promise<void>;
}

export function AccessConfigurationModal({
  isOpen,
  onClose,
  userId,
  userName,
  onSave
}: AccessConfigurationModalProps) {
  const {
    hierarchy,
    selection,
    loading,
    searchTerm,
    setSearchTerm,
    toggleConcept,
    toggleCompany,
    toggleStore,
    selectAllStoresForCompany,
    selectAllStoresForConcept,
    clearAll,
    getEffectiveStoreCount,
    saveAccess
  } = useAccessConfiguration(userId);

  const [saving, setSaving] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    type: 'concept' | 'company' | 'store' | null;
    id: number | null;
  }>({ type: null, id: null });

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);
    try {
      const result = await saveAccess(userId);
      if (result.success) {
        await onSave(selection);
        onClose();
      }
    } catch (error) {
      console.error('Error saving access:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleCancel} />

      <div className="relative w-full h-full max-w-[1800px] max-h-[95vh] m-4 bg-white rounded-lg shadow-2xl flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Configure Access
              </h2>
              <p className="text-sm text-blue-100 mt-1">
                {userName ? `Setting permissions for ${userName}` : 'Select locations and access levels'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-white/20 rounded-lg text-white">
              <span className="text-sm font-medium">
                {getEffectiveStoreCount()} {getEffectiveStoreCount() === 1 ? 'store' : 'stores'} accessible
              </span>
            </div>

            <button
              onClick={handleCancel}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <div className="w-[40%] border-r border-gray-200 flex flex-col">
              <TreeBrowser
                hierarchy={hierarchy}
                selection={selection}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onToggleConcept={toggleConcept}
                onToggleCompany={toggleCompany}
                onToggleStore={toggleStore}
                onSelectItem={setSelectedItem}
                selectedItem={selectedItem}
              />
            </div>

            <div className="w-[35%] border-r border-gray-200 flex flex-col">
              <DetailView
                hierarchy={hierarchy}
                selection={selection}
                selectedItem={selectedItem}
                onToggleStore={toggleStore}
                onSelectAllStores={(type, id) => {
                  if (type === 'concept') selectAllStoresForConcept(id);
                  else if (type === 'company') selectAllStoresForCompany(id);
                }}
              />
            </div>

            <div className="w-[25%] flex flex-col">
              <SelectionSummary
                hierarchy={hierarchy}
                selection={selection}
                onRemoveConcept={toggleConcept}
                onRemoveCompany={toggleCompany}
                onRemoveStore={toggleStore}
                onClearAll={clearAll}
                effectiveStoreCount={getEffectiveStoreCount()}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || getEffectiveStoreCount() === 0}
            className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Access Configuration
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
