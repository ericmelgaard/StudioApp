import { useState } from 'react';
import { Plus, X, Calculator } from 'lucide-react';
import { CalculationPart } from '../lib/productValueResolver';
import ApiLinkModal from './ApiLinkModal';

interface CalculationBuilderProps {
  value: CalculationPart[];
  onChange: (value: CalculationPart[]) => void;
  integrationSourceId: string | null;
}

export default function CalculationBuilder({
  value,
  onChange,
  integrationSourceId
}: CalculationBuilderProps) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addPart = (
    mapping_id: string,
    integration_type: 'product' | 'modifier' | 'discount'
  ) => {
    const newPart: CalculationPart = {
      mapping_id,
      integration_type,
      field_path: 'data.price',
      operation: value.length === 0 ? 'add' : 'add'
    };

    if (editingIndex !== null) {
      const updated = [...value];
      updated[editingIndex] = newPart;
      onChange(updated);
      setEditingIndex(null);
    } else {
      onChange([...value, newPart]);
    }
    setShowLinkModal(false);
  };

  const removePart = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateOperation = (index: number, operation: CalculationPart['operation']) => {
    const updated = [...value];
    updated[index] = { ...updated[index], operation };
    onChange(updated);
  };

  const openAddModal = (index?: number) => {
    setEditingIndex(index ?? null);
    setShowLinkModal(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          Price Calculation
        </h3>
        {integrationSourceId && (
          <button
            onClick={() => openAddModal()}
            className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Part
          </button>
        )}
      </div>

      {!integrationSourceId && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Product must be linked to an integration source before creating calculations.
        </div>
      )}

      {value.length === 0 && integrationSourceId && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 text-center">
          No calculation parts added. Click "Add Part" to start building your formula.
        </div>
      )}

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((part, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg"
            >
              <div className="flex-1 grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-600 block mb-1">Mapping ID</label>
                  <input
                    type="text"
                    value={part.mapping_id}
                    disabled
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-sm disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 block mb-1">Type</label>
                  <input
                    type="text"
                    value={part.integration_type}
                    disabled
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-sm disabled:bg-slate-100 disabled:text-slate-500 capitalize"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 block mb-1">Operation</label>
                  <select
                    value={part.operation}
                    onChange={(e) => updateOperation(index, e.target.value as CalculationPart['operation'])}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="add">Add (+)</option>
                    <option value="subtract">Subtract (-)</option>
                    <option value="multiply">Multiply (×)</option>
                    <option value="divide">Divide (÷)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => removePart(index)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove part"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {value.length > 0 && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="text-sm font-medium text-purple-900 mb-1">Formula Preview</div>
          <div className="text-sm text-purple-700 font-mono">
            {value.map((part, index) => (
              <span key={index}>
                {index > 0 && ` ${part.operation === 'add' ? '+' : part.operation === 'subtract' ? '-' : part.operation === 'multiply' ? '×' : '÷'} `}
                {part.mapping_id}
              </span>
            ))}
          </div>
        </div>
      )}

      <ApiLinkModal
        isOpen={showLinkModal}
        onClose={() => {
          setShowLinkModal(false);
          setEditingIndex(null);
        }}
        onLink={addPart}
        integrationSourceId={integrationSourceId}
        title="Select Item for Calculation"
        searchType="all"
      />
    </div>
  );
}
