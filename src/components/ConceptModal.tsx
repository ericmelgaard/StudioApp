import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus, Tag } from 'lucide-react';
import * as Icons from 'lucide-react';
import { supabase } from '../lib/supabase';
import IconPicker from './IconPicker';
import ColorPicker from './ColorPicker';

interface Concept {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  brand_primary_color?: string;
  brand_secondary_color?: string;
  brand_options?: string[];
}

interface ConceptModalProps {
  concept?: Concept | null;
  onClose: () => void;
  onSave: () => void;
}

export default function ConceptModal({ concept, onClose, onSave }: ConceptModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);
  const [secondaryColor, setSecondaryColor] = useState<string | null>(null);
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [newBrand, setNewBrand] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (concept) {
      setName(concept.name || '');
      setDescription(concept.description || '');
      setIcon(concept.icon || null);
      setPrimaryColor(concept.brand_primary_color || null);
      setSecondaryColor(concept.brand_secondary_color || null);
      setBrandOptions(concept.brand_options || []);
    }
  }, [concept]);

  const renderIcon = () => {
    if (!icon) return <Icons.Building2 size={24} />;
    const IconComponent = Icons[icon as keyof typeof Icons] as any;
    return IconComponent ? <IconComponent size={24} /> : <Icons.Building2 size={24} />;
  };

  const handleAddBrand = () => {
    const trimmedBrand = newBrand.trim();
    if (trimmedBrand && !brandOptions.includes(trimmedBrand)) {
      setBrandOptions([...brandOptions, trimmedBrand]);
      setNewBrand('');
    }
  };

  const handleRemoveBrand = (brandToRemove: string) => {
    setBrandOptions(brandOptions.filter(b => b !== brandToRemove));
  };

  const handleBrandKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddBrand();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const conceptData = {
        name,
        description: description || null,
        icon: icon || null,
        brand_primary_color: primaryColor || null,
        brand_secondary_color: secondaryColor || null,
        brand_options: brandOptions.length > 0 ? brandOptions : []
      };

      if (concept) {
        const { error: updateError } = await supabase
          .from('concepts')
          .update(conceptData)
          .eq('id', concept.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('concepts')
          .insert([conceptData]);

        if (insertError) throw insertError;
      }

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!concept) return;
    if (!confirm('Are you sure you want to delete this concept? This will affect all related companies and stores.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('concepts')
        .delete()
        .eq('id', concept.id);

      if (deleteError) throw deleteError;

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">
              {concept ? 'Edit Concept' : 'Add New Concept'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter concept name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter concept description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon
                </label>
                <button
                  type="button"
                  onClick={() => setShowIconPicker(true)}
                  className="flex items-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="text-gray-700">
                    {renderIcon()}
                  </div>
                  <span className="text-gray-700">
                    {icon || 'Select an icon'}
                  </span>
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Options
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Add brand names that will be available for API configurations at child sites and companies.
                </p>

                <div className="flex gap-2 mb-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                      onKeyPress={handleBrandKeyPress}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter brand name (e.g., Auntie Anne's)"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddBrand}
                    disabled={!newBrand.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={18} />
                    Add
                  </button>
                </div>

                {brandOptions.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    {brandOptions.map((brand) => (
                      <div
                        key={brand}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm"
                      >
                        <Tag size={14} className="text-blue-600" />
                        <span className="text-gray-700">{brand}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBrand(brand)}
                          className="text-gray-400 hover:text-red-600 transition-colors ml-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {brandOptions.length === 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    No brands configured. Add at least one brand to enable API configurations for child sites.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ColorPicker
                  label="Primary Brand Color"
                  value={primaryColor}
                  onChange={setPrimaryColor}
                />
                <ColorPicker
                  label="Secondary Brand Color"
                  value={secondaryColor}
                  onChange={setSecondaryColor}
                />
              </div>

              {(primaryColor || secondaryColor) && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Brand Color Preview</h4>
                  <div className="flex gap-2">
                    {primaryColor && (
                      <div className="flex-1">
                        <div
                          className="h-12 rounded-lg border border-gray-300"
                          style={{ backgroundColor: primaryColor }}
                        />
                        <p className="text-xs text-gray-600 mt-1 text-center">Primary</p>
                      </div>
                    )}
                    {secondaryColor && (
                      <div className="flex-1">
                        <div
                          className="h-12 rounded-lg border border-gray-300"
                          style={{ backgroundColor: secondaryColor }}
                        />
                        <p className="text-xs text-gray-600 mt-1 text-center">Secondary</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </form>

          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <div>
              {concept && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 size={18} />
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !name}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} />
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showIconPicker && (
        <IconPicker
          value={icon}
          onChange={setIcon}
          onClose={() => setShowIconPicker(false)}
        />
      )}
    </>
  );
}
