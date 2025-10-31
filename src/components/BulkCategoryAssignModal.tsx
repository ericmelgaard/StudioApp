import { useState, useEffect } from 'react';
import { X, FolderTree, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface BulkCategoryAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  productIds: string[];
  onSuccess: () => void;
}

export default function BulkCategoryAssignModal({
  isOpen,
  onClose,
  productIds,
  onSuccess,
}: BulkCategoryAssignModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  async function loadCategories() {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (!error && data) {
      setCategories(data);
    }
  }

  async function handleAssign() {
    if (selectedCategoryIds.size === 0) {
      alert('Please select at least one category');
      return;
    }

    setLoading(true);

    const assignments: any[] = [];
    productIds.forEach(productId => {
      selectedCategoryIds.forEach(categoryId => {
        assignments.push({
          product_id: productId,
          category_id: categoryId,
        });
      });
    });

    const { error } = await supabase
      .from('product_category_assignments')
      .upsert(assignments, { onConflict: 'product_id,category_id' });

    setLoading(false);

    if (!error) {
      onSuccess();
      onClose();
      setSelectedCategoryIds(new Set());
    } else {
      alert('Error assigning categories: ' + error.message);
    }
  }

  function toggleCategory(categoryId: string) {
    const newSelected = new Set(selectedCategoryIds);
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
    } else {
      newSelected.add(categoryId);
    }
    setSelectedCategoryIds(newSelected);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Assign to Categories</h2>
            <p className="text-sm text-slate-600 mt-1">
              Select categories for {productIds.length} product{productIds.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {categories.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FolderTree className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="font-medium mb-2">No categories available</p>
              <p className="text-sm">Create categories first in the Category Manager</p>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => {
                const isSelected = selectedCategoryIds.has(category.id);
                return (
                  <button
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-green-600 border-green-600'
                          : 'bg-white border-slate-300'
                      }`}>
                        {isSelected && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900">{category.name}</h3>
                        {category.description && (
                          <p className="text-sm text-slate-600 mt-1">{category.description}</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-600">
            {selectedCategoryIds.size} categor{selectedCategoryIds.size !== 1 ? 'ies' : 'y'} selected
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={loading || selectedCategoryIds.size === 0 || categories.length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FolderTree className="w-4 h-4" />
              Assign Categories
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
