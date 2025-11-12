import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ColumnDefinition } from '../types/productList';

interface FilterValue {
  type: 'text' | 'number' | 'boolean' | 'array' | 'date';
  value: any;
  operator?: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'isEmpty' | 'isNotEmpty' | 'in';
}

interface ColumnFilterProps {
  column: ColumnDefinition;
  value?: FilterValue;
  onChange: (value: FilterValue | null) => void;
}

export default function ColumnFilter({ column, value, onChange }: ColumnFilterProps) {
  const [localValue, setLocalValue] = useState<string>('');
  const [operator, setOperator] = useState<FilterValue['operator']>('contains');

  useEffect(() => {
    if (value) {
      setLocalValue(String(value.value || ''));
      setOperator(value.operator || 'contains');
    } else {
      setLocalValue('');
      setOperator('contains');
    }
  }, [value]);

  const handleChange = (newValue: string, newOperator?: FilterValue['operator']) => {
    setLocalValue(newValue);
    const op = newOperator || operator;

    if (!newValue && op !== 'isEmpty' && op !== 'isNotEmpty') {
      onChange(null);
      return;
    }

    let filterValue: FilterValue;

    switch (column.type) {
      case 'text':
        filterValue = {
          type: 'text',
          value: newValue,
          operator: op || 'contains'
        };
        break;

      case 'number':
      case 'currency':
        filterValue = {
          type: 'number',
          value: parseFloat(newValue),
          operator: op || 'equals'
        };
        break;

      case 'boolean':
        filterValue = {
          type: 'boolean',
          value: newValue === 'true',
          operator: 'equals'
        };
        break;

      case 'array':
        filterValue = {
          type: 'array',
          value: newValue.split(',').map(v => v.trim()).filter(Boolean),
          operator: op || 'in'
        };
        break;

      case 'date':
        filterValue = {
          type: 'date',
          value: newValue,
          operator: op || 'equals'
        };
        break;

      default:
        filterValue = {
          type: 'text',
          value: newValue,
          operator: 'contains'
        };
    }

    onChange(filterValue);
  };

  const handleOperatorChange = (newOperator: FilterValue['operator']) => {
    setOperator(newOperator);
    if (newOperator === 'isEmpty' || newOperator === 'isNotEmpty') {
      handleChange('', newOperator);
    } else {
      handleChange(localValue, newOperator);
    }
  };

  const clearFilter = () => {
    setLocalValue('');
    setOperator('contains');
    onChange(null);
  };

  const renderInput = () => {
    if (operator === 'isEmpty' || operator === 'isNotEmpty') {
      return (
        <div className="text-sm text-slate-600 italic py-2">
          {operator === 'isEmpty' ? 'Is empty' : 'Is not empty'}
        </div>
      );
    }

    switch (column.type) {
      case 'text':
        return (
          <input
            type="text"
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`Filter ${column.label.toLowerCase()}...`}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
        );

      case 'number':
      case 'currency':
        return (
          <input
            type="number"
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`Filter ${column.label.toLowerCase()}...`}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
        );

      case 'boolean':
        return (
          <select
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          >
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );

      case 'array':
        return (
          <input
            type="text"
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Enter values (comma-separated)"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
        );

      default:
        return (
          <input
            type="text"
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`Filter ${column.label.toLowerCase()}...`}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
        );
    }
  };

  const getOperatorOptions = () => {
    switch (column.type) {
      case 'text':
        return [
          { value: 'contains', label: 'Contains' },
          { value: 'equals', label: 'Equals' },
          { value: 'isEmpty', label: 'Is empty' },
          { value: 'isNotEmpty', label: 'Is not empty' }
        ];

      case 'number':
      case 'currency':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'gt', label: 'Greater than' },
          { value: 'lt', label: 'Less than' },
          { value: 'gte', label: 'Greater or equal' },
          { value: 'lte', label: 'Less or equal' }
        ];

      case 'array':
        return [
          { value: 'in', label: 'Contains any' },
          { value: 'isEmpty', label: 'Is empty' },
          { value: 'isNotEmpty', label: 'Is not empty' }
        ];

      case 'date':
        return [
          { value: 'equals', label: 'On date' },
          { value: 'gt', label: 'After' },
          { value: 'lt', label: 'Before' }
        ];

      default:
        return [{ value: 'contains', label: 'Contains' }];
    }
  };

  const operatorOptions = getOperatorOptions();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          {column.label}
        </label>
        {value && (
          <button
            onClick={clearFilter}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            title="Clear filter"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {operatorOptions.length > 1 && column.type !== 'boolean' && (
        <select
          value={operator}
          onChange={(e) => handleOperatorChange(e.target.value as FilterValue['operator'])}
          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs"
        >
          {operatorOptions.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {renderInput()}
    </div>
  );
}
