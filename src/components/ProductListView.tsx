import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowUpDown, ArrowUp, ArrowDown, Filter, Settings, Download,
  Image as ImageIcon, Check, X, Eye, EyeOff, MoreVertical, Maximize2,
  Grid3x3, AlignJustify, ChevronRight, Calendar, Search, Upload, MapPin
} from 'lucide-react';
import { Product, ColumnDefinition, SortConfig, FilterConfig, DensityMode } from '../types/productList';
import { supabase } from '../lib/supabase';
import { useUser } from '../hooks/useUser';
import ColumnManager from './ColumnManager';
import ColumnFilter from './ColumnFilter';
import ProductExportModal from './ProductExportModal';
import ProductImportModal from './ProductImportModal';

interface ProductListViewProps {
  products: Product[];
  onProductClick: (product: Product) => void;
  selectedProductIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  advancedFilterComponent?: React.ReactNode;
  conceptId?: number;
  companyId?: number;
  siteId?: number;
  onProductsRefresh: () => void;
  onShowHierarchy: () => void;
}

export default function ProductListView({
  products,
  onProductClick,
  selectedProductIds,
  onSelectionChange,
  searchQuery = '',
  onSearchChange,
  advancedFilterComponent,
  conceptId,
  companyId,
  siteId,
  onProductsRefresh,
  onShowHierarchy
}: ProductListViewProps) {
  const { user } = useUser();
  const [density, setDensity] = useState<DensityMode>('comfortable');
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig[]>([]);
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({});
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const defaultColumns: ColumnDefinition[] = useMemo(() => [
    {
      key: 'select',
      label: '',
      type: 'boolean',
      visible: true,
      width: 50,
      order: 0,
      pinned: true,
      priority: 1,
      sortable: false,
      filterable: false,
      accessor: () => null
    },
    {
      key: 'name',
      label: 'Product Name',
      type: 'text',
      visible: true,
      width: 250,
      order: 1,
      pinned: true,
      priority: 1,
      sortable: true,
      filterable: true,
      accessor: (p) => p.attributes?.name || p.name
    },
    {
      key: 'id',
      label: 'ID',
      type: 'text',
      visible: true,
      width: 100,
      order: 2,
      priority: 5,
      sortable: true,
      filterable: true,
      accessor: (p) => p.id.slice(0, 8)
    },
    {
      key: 'has_image',
      label: 'Image',
      type: 'boolean',
      visible: true,
      width: 80,
      order: 3,
      priority: 3,
      sortable: true,
      filterable: true,
      accessor: (p) => {
        const img = p.attributes?.image_url || p.attributes?.thumbnail;
        return img && img !== 'data:,' && img.length > 10;
      }
    },
    {
      key: 'description',
      label: 'Description',
      type: 'text',
      visible: true,
      width: 200,
      order: 4,
      priority: 4,
      sortable: true,
      filterable: true,
      accessor: (p) => p.attributes?.description
    },
    {
      key: 'price',
      label: 'Price',
      type: 'currency',
      visible: true,
      width: 100,
      order: 5,
      priority: 2,
      sortable: true,
      filterable: true,
      accessor: (p) => p.attributes?.price
    },
    {
      key: 'calories',
      label: 'Calories',
      type: 'number',
      visible: true,
      width: 100,
      order: 6,
      priority: 3,
      sortable: true,
      filterable: true,
      accessor: (p) => p.attributes?.calories
    },
    {
      key: 'portion',
      label: 'Portion',
      type: 'text',
      visible: false,
      width: 120,
      order: 7,
      priority: 6,
      sortable: true,
      filterable: true,
      accessor: (p) => p.attributes?.portion
    },
    {
      key: 'meal_periods',
      label: 'Meal Periods',
      type: 'array',
      visible: true,
      width: 140,
      order: 8,
      priority: 4,
      sortable: false,
      filterable: true,
      accessor: (p) => p.attributes?.meal_periods
    },
    {
      key: 'meal_stations',
      label: 'Stations',
      type: 'array',
      visible: true,
      width: 140,
      order: 9,
      priority: 5,
      sortable: false,
      filterable: true,
      accessor: (p) => p.attributes?.meal_stations
    },
    {
      key: 'integration_source',
      label: 'API Source',
      type: 'boolean',
      visible: true,
      width: 110,
      order: 10,
      priority: 3,
      sortable: true,
      filterable: true,
      accessor: (p) => !!(p.integration_source_name || p.attribute_mappings?.price?.type === 'calculation')
    },
    {
      key: 'created_at',
      label: 'Created',
      type: 'date',
      visible: false,
      width: 150,
      order: 11,
      priority: 7,
      sortable: true,
      filterable: true,
      accessor: (p) => p.created_at
    },
    {
      key: 'updated_at',
      label: 'Updated',
      type: 'date',
      visible: false,
      width: 150,
      order: 12,
      priority: 8,
      sortable: true,
      filterable: true,
      accessor: (p) => p.updated_at
    }
  ], []);

  useEffect(() => {
    loadUserPreferences();
  }, [user]);

  useEffect(() => {
    if (products.length > 0) {
      detectAndAddTranslationColumns();
    }
  }, [products]);

  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const detectAndAddTranslationColumns = () => {
    const translationLocales = new Set<string>();

    products.forEach(product => {
      if (product.attributes) {
        Object.keys(product.attributes).forEach(key => {
          const match = key.match(/^translations_([a-z]{2}[_-][A-Z]{2})$/i);
          if (match) {
            const locale = match[1].replace('_', '-');
            translationLocales.add(locale);
          }
        });
      }
    });

    if (translationLocales.size > 0) {
      const newColumns = [...defaultColumns];
      let columnOrder = defaultColumns.length;

      const translatableFields = ['name', 'description', 'portion'];

      translationLocales.forEach(locale => {
        const localeKey = locale.toLowerCase().replace('-', '_');
        const localeName = locale === 'fr-FR' ? 'French' :
                          locale === 'es-ES' ? 'Spanish' :
                          locale === 'de-DE' ? 'German' :
                          locale === 'it-IT' ? 'Italian' :
                          locale === 'pt-PT' ? 'Portuguese' : locale;

        translatableFields.forEach(field => {
          const baseColumn = defaultColumns.find(col => col.key === field);
          if (baseColumn) {
            newColumns.push({
              key: `${field}_${localeKey}`,
              label: `${baseColumn.label} (${localeName})`,
              type: baseColumn.type,
              visible: false,
              width: baseColumn.width,
              order: columnOrder++,
              priority: 9,
              sortable: true,
              filterable: true,
              accessor: (p) => {
                const translationKey = `translations_${localeKey}`;
                return p.attributes?.[translationKey]?.[field];
              }
            });
          }
        });
      });

      if (columns.length === 0 || columns.length === defaultColumns.length) {
        setColumns(newColumns);
      }
    }
  };

  const loadUserPreferences = async () => {
    if (!user) {
      setColumns(defaultColumns);
      return;
    }

    const { data, error } = await supabase
      .from('user_view_preferences')
      .select('*')
      .eq('user_id', user.id)
      .eq('view_name', 'product_list')
      .eq('is_default', true)
      .maybeSingle();

    if (data && !error) {
      setColumns(data.column_config.columns || defaultColumns);
      setSortConfig(data.sort_config.sorts || []);
      setFilterConfig(data.filter_config || {});
      setDensity(data.density || 'comfortable');
    } else {
      setColumns(defaultColumns);
    }
  };

  const saveUserPreferences = async () => {
    if (!user) return;

    const preferences = {
      user_id: user.id,
      view_name: 'product_list',
      column_config: { columns },
      sort_config: { sorts: sortConfig },
      filter_config: filterConfig,
      density,
      is_default: true
    };

    const { data: existing } = await supabase
      .from('user_view_preferences')
      .select('id')
      .eq('user_id', user.id)
      .eq('view_name', 'product_list')
      .eq('is_default', true)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('user_view_preferences')
        .update(preferences)
        .eq('id', existing.id);
    } else {
      await supabase
        .from('user_view_preferences')
        .insert(preferences);
    }
  };

  useEffect(() => {
    if (user && columns.length > 0) {
      const timeoutId = setTimeout(() => {
        saveUserPreferences();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [columns, sortConfig, filterConfig, density, user]);

  const handleSort = (columnKey: string, shiftKey: boolean) => {
    const existingIndex = sortConfig.findIndex(s => s.column === columnKey);

    if (shiftKey && existingIndex >= 0) {
      const updated = [...sortConfig];
      updated[existingIndex].direction = updated[existingIndex].direction === 'asc' ? 'desc' : 'asc';
      setSortConfig(updated);
    } else if (shiftKey) {
      setSortConfig([...sortConfig, { column: columnKey, direction: 'asc', priority: sortConfig.length }]);
    } else {
      if (existingIndex >= 0 && sortConfig[existingIndex].direction === 'desc') {
        setSortConfig([]);
      } else {
        setSortConfig([{ column: columnKey, direction: existingIndex >= 0 ? 'desc' : 'asc', priority: 0 }]);
      }
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      return Object.entries(filterConfig).every(([columnKey, filter]) => {
        const column = columns.find(c => c.key === columnKey);
        if (!column) return true;

        const value = column.accessor(product);

        switch (filter.type) {
          case 'text':
            if (filter.operator === 'isEmpty') return !value;
            if (filter.operator === 'isNotEmpty') return !!value;
            return String(value || '').toLowerCase().includes(String(filter.value || '').toLowerCase());

          case 'number':
            const numValue = Number(value);
            const filterNum = Number(filter.value);
            if (isNaN(numValue) || isNaN(filterNum)) return false;

            switch (filter.operator) {
              case 'equals': return numValue === filterNum;
              case 'gt': return numValue > filterNum;
              case 'lt': return numValue < filterNum;
              case 'gte': return numValue >= filterNum;
              case 'lte': return numValue <= filterNum;
              default: return true;
            }

          case 'boolean':
            return value === filter.value;

          case 'array':
            if (!Array.isArray(value)) return false;
            if (filter.operator === 'isEmpty') return value.length === 0;
            if (filter.operator === 'isNotEmpty') return value.length > 0;
            if (Array.isArray(filter.value)) {
              return filter.value.some(fv =>
                value.some(v => String(v.period || v.station || v).toLowerCase().includes(String(fv).toLowerCase()))
              );
            }
            return true;

          default:
            return true;
        }
      });
    });
  }, [products, filterConfig, columns]);

  const sortedProducts = useMemo(() => {
    if (sortConfig.length === 0) return filteredProducts;

    return [...filteredProducts].sort((a, b) => {
      for (const sort of sortConfig.sort((x, y) => x.priority - y.priority)) {
        const column = columns.find(c => c.key === sort.column);
        if (!column) continue;

        const aVal = column.accessor(a);
        const bVal = column.accessor(b);

        if (aVal === bVal) continue;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        const comparison = aVal < bVal ? -1 : 1;
        return sort.direction === 'asc' ? comparison : -comparison;
      }
      return 0;
    });
  }, [filteredProducts, sortConfig, columns]);

  const visibleColumns = useMemo(() => {
    return columns.filter(c => c.visible).sort((a, b) => a.order - b.order);
  }, [columns]);

  const rowHeight = density === 'compact' ? 'py-2' : density === 'comfortable' ? 'py-3' : 'py-4';
  const fontSize = density === 'compact' ? 'text-xs' : density === 'comfortable' ? 'text-sm' : 'text-base';

  const renderCellContent = (column: ColumnDefinition, product: Product) => {
    const value = column.accessor(product);

    if (column.key === 'select') {
      return (
        <input
          type="checkbox"
          checked={selectedProductIds.has(product.id)}
          onChange={(e) => {
            e.stopPropagation();
            const newSelected = new Set(selectedProductIds);
            if (e.target.checked) {
              newSelected.add(product.id);
            } else {
              newSelected.delete(product.id);
            }
            onSelectionChange(newSelected);
          }}
          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
        />
      );
    }

    if (column.renderer) {
      return column.renderer(value, product);
    }

    switch (column.type) {
      case 'boolean':
        if (column.key === 'has_image') {
          return value ? (
            <div className="flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-green-600" />
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <X className="w-4 h-4 text-slate-300" />
            </div>
          );
        }
        if (column.key === 'integration_source') {
          return value ? (
            <div className="flex items-center justify-center">
              <img
                src="/logo_32 copy.png"
                alt="API Source"
                className="w-5 h-5 rounded"
                title={product.integration_source_name || 'QU Beyond'}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <span className="text-slate-400">-</span>
            </div>
          );
        }
        return value ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-slate-300" />;

      case 'array':
        if (!Array.isArray(value) || value.length === 0) {
          return <span className="text-slate-400">-</span>;
        }
        return (
          <div className="flex items-center gap-1">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              {value.length}
            </span>
            <span className="text-xs text-slate-500 truncate max-w-[100px]">
              {column.key === 'meal_periods' ? value[0]?.period : value[0]?.station || value[0]}
            </span>
          </div>
        );

      case 'currency':
        return value ? (
          <span className="font-medium text-slate-900">${value}</span>
        ) : (
          <span className="text-slate-400">-</span>
        );

      case 'date':
        if (!value) return <span className="text-slate-400">-</span>;
        const date = new Date(value);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        let relativeTime;
        if (diffMins < 60) {
          relativeTime = `${diffMins}m ago`;
        } else if (diffHours < 24) {
          relativeTime = `${diffHours}h ago`;
        } else if (diffDays < 7) {
          relativeTime = `${diffDays}d ago`;
        } else {
          relativeTime = date.toLocaleDateString();
        }

        return (
          <span className="text-slate-600 text-xs" title={date.toLocaleString()}>
            {relativeTime}
          </span>
        );

      case 'text':
        if (!value) return <span className="text-slate-400">-</span>;
        const textContent = String(value).replace(/<[^>]*>/g, '');
        return (
          <span className="truncate block" title={textContent}>
            {textContent}
          </span>
        );

      case 'number':
        return value ? <span>{value}</span> : <span className="text-slate-400">-</span>;

      default:
        return <span>{value || '-'}</span>;
    }
  };

  const exportToCSV = () => {
    const headers = visibleColumns.filter(c => c.key !== 'select').map(c => c.label);
    const rows = sortedProducts.map(product =>
      visibleColumns
        .filter(c => c.key !== 'select')
        .map(col => {
          const value = col.accessor(product);
          if (Array.isArray(value)) {
            return value.map(v => v.period || v.station || v).join('; ');
          }
          return value || '';
        })
    );

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const exportToJSON = () => {
    const data = sortedProducts.map(product => {
      const obj: any = {};
      visibleColumns.filter(c => c.key !== 'select').forEach(col => {
        obj[col.key] = col.accessor(product);
      });
      return obj;
    });

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white flex flex-col' : 'relative'}`}>
      {isFullscreen && (onSearchChange || advancedFilterComponent) && (
        <div className={`border-b border-slate-200 ${isFullscreen ? 'px-6 pt-6 pb-4' : ''}`}>
          <div className="flex flex-col md:flex-row gap-4">
            {onSearchChange && (
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            )}
            {advancedFilterComponent && (
              <div className="flex gap-2">
                {advancedFilterComponent}
              </div>
            )}
          </div>
        </div>
      )}
      <div className={`flex items-center justify-between mb-4 ${isFullscreen ? 'px-6 pt-4' : 'px-2'}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all ${
              showFilters ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {Object.keys(filterConfig).length > 0 && (
              <span className="px-1.5 py-0.5 bg-purple-500 text-white rounded text-xs">
                {Object.keys(filterConfig).length}
              </span>
            )}
          </button>

          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {(['compact', 'comfortable', 'spacious'] as DensityMode[]).map((d) => (
              <button
                key={d}
                onClick={() => setDensity(d)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  density === d
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={d.charAt(0).toUpperCase() + d.slice(1)}
              >
                {d === 'compact' && <Grid3x3 className="w-4 h-4" />}
                {d === 'comfortable' && <AlignJustify className="w-4 h-4" />}
                {d === 'spacious' && <AlignJustify className="w-4 h-4" />}
              </button>
            ))}
          </div>

          {sortConfig.length > 0 && (
            <div className="text-sm text-slate-600">
              Sorted by {sortConfig.length} column{sortConfig.length > 1 ? 's' : ''}
            </div>
          )}

          {selectedProductIds.size > 0 && (
            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-slate-300">
              <button
                onClick={() => onSelectionChange(new Set())}
                className="text-slate-500 hover:text-slate-700 transition-colors"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-slate-700">
                {selectedProductIds.size} selected
              </span>
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Download className="w-3 h-3" />
                Export
              </button>
              <button
                onClick={onShowHierarchy}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                <MapPin className="w-3 h-3" />
                Hierarchy
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowColumnManager(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-all"
          >
            <Settings className="w-4 h-4" />
            Columns
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium transition-all"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>

          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium transition-all">
              <Download className="w-4 h-4" />
              Export
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => setShowExportModal(true)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 rounded-t-lg font-medium"
              >
                Advanced Export...
              </button>
              <div className="border-t border-slate-200" />
              <button
                onClick={exportToCSV}
                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
              >
                Quick CSV Export
              </button>
              <button
                onClick={exportToJSON}
                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 rounded-b-lg"
              >
                Quick JSON Export
              </button>
            </div>
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all ${
              isFullscreen
                ? 'bg-purple-100 text-purple-700'
                : 'hover:bg-slate-100 text-slate-700'
            }`}
            title={isFullscreen ? 'Exit fullscreen (ESC)' : 'Enter fullscreen'}
          >
            <Maximize2 className="w-4 h-4" />
            {isFullscreen && <span className="text-xs">ESC</span>}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className={`mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg ${isFullscreen ? 'mx-6' : ''}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {columns.filter(c => c.filterable && c.visible).map(column => (
              <ColumnFilter
                key={column.key}
                column={column}
                value={filterConfig[column.key]}
                onChange={(filter) => {
                  if (!filter) {
                    const newConfig = { ...filterConfig };
                    delete newConfig[column.key];
                    setFilterConfig(newConfig);
                  } else {
                    setFilterConfig({ ...filterConfig, [column.key]: filter });
                  }
                }}
              />
            ))}
          </div>
          {Object.keys(filterConfig).length > 0 && (
            <button
              onClick={() => setFilterConfig({})}
              className="mt-3 text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      <div className={`overflow-x-auto border border-slate-200 rounded-lg ${isFullscreen ? 'flex-1 mx-6 mb-6' : ''}`}>
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider ${
                    column.pinned ? 'sticky left-0 bg-slate-50 z-20' : ''
                  }`}
                  style={{ width: column.width }}
                >
                  {column.key === 'select' ? (
                    <input
                      type="checkbox"
                      checked={selectedProductIds.size === sortedProducts.length && sortedProducts.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onSelectionChange(new Set(sortedProducts.map(p => p.id)));
                        } else {
                          onSelectionChange(new Set());
                        }
                      }}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>{column.label}</span>
                      {column.sortable && (
                        <button
                          onClick={(e) => handleSort(column.key, e.shiftKey)}
                          className="hover:bg-slate-200 rounded p-1 transition-colors"
                          title="Click to sort, Shift+Click for multi-sort"
                        >
                          {sortConfig.find(s => s.column === column.key) ? (
                            sortConfig.find(s => s.column === column.key)?.direction === 'asc' ? (
                              <div className="relative">
                                <ArrowUp className="w-4 h-4 text-purple-600" />
                                {sortConfig.length > 1 && (
                                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-purple-600 text-white text-[8px] rounded-full flex items-center justify-center">
                                    {sortConfig.find(s => s.column === column.key)?.priority! + 1}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="relative">
                                <ArrowDown className="w-4 h-4 text-purple-600" />
                                {sortConfig.length > 1 && (
                                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-purple-600 text-white text-[8px] rounded-full flex items-center justify-center">
                                    {sortConfig.find(s => s.column === column.key)?.priority! + 1}
                                  </span>
                                )}
                              </div>
                            )
                          ) : (
                            <ArrowUpDown className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedProducts.map((product, index) => {
              const isEven = index % 2 === 0;
              const isSelected = selectedProductIds.has(product.id);

              const rowBg = isSelected
                ? 'bg-purple-50'
                : isEven
                ? 'bg-white'
                : 'bg-slate-50/30';

              const rowHoverBg = isSelected
                ? 'hover:bg-purple-100'
                : 'hover:bg-blue-50';

              const pinnedBg = isSelected
                ? 'bg-purple-50'
                : isEven
                ? 'bg-white'
                : 'bg-slate-50/30';

              return (
                <tr
                  key={product.id}
                  className={`transition-colors cursor-pointer ${rowBg} ${rowHoverBg}`}
                  onClick={() => onProductClick(product)}
                >
                  {visibleColumns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 ${rowHeight} ${fontSize} text-slate-900 ${
                        column.pinned ? `sticky left-0 ${pinnedBg} z-10` : ''
                      }`}
                      onClick={(e) => {
                        if (column.key === 'select') {
                          e.stopPropagation();
                        }
                      }}
                    >
                      {renderCellContent(column, product)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sortedProducts.length === 0 && (
        <div className={`text-center py-12 text-slate-500 ${isFullscreen ? 'mx-6' : ''}`}>
          No products match your current filters
        </div>
      )}

      {showColumnManager && (
        <div className="fixed inset-0 z-[60]">
          <ColumnManager
            isOpen={showColumnManager}
            onClose={() => setShowColumnManager(false)}
            columns={columns}
            onColumnsChange={setColumns}
          />
        </div>
      )}

      <ProductExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        conceptId={conceptId}
        companyId={companyId}
        siteId={siteId}
        selectedProductIds={selectedProductIds.size > 0 ? Array.from(selectedProductIds) : undefined}
      />

      <ProductImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          onProductsRefresh();
          setShowImportModal(false);
        }}
        conceptId={conceptId}
        companyId={companyId}
        siteId={siteId}
      />
    </div>
  );
}
