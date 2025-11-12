export interface Product {
  id: string;
  name: string;
  attributes: Record<string, any>;
  attribute_template_id: string | null;
  display_template_id: string | null;
  integration_product_id: string | null;
  attribute_overrides?: Record<string, boolean>;
  attribute_mappings?: Record<string, any>;
  created_at: string;
  updated_at: string;
  integration_source_name?: string;
}

export interface ColumnDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'image' | 'array' | 'date' | 'object' | 'currency';
  visible: boolean;
  width: number;
  order: number;
  pinned?: boolean;
  priority?: number;
  sortable?: boolean;
  filterable?: boolean;
  accessor: (product: Product) => any;
  renderer?: (value: any, product: Product) => React.ReactNode;
}

export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
  priority: number;
}

export interface FilterConfig {
  [columnKey: string]: {
    type: 'text' | 'number' | 'boolean' | 'array' | 'date';
    value: any;
    operator?: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'isEmpty' | 'isNotEmpty' | 'in';
  };
}

export type DensityMode = 'compact' | 'comfortable' | 'spacious';

export interface ViewPreferences {
  id?: string;
  user_id?: string;
  view_name: string;
  column_config: {
    columns: ColumnDefinition[];
  };
  sort_config: {
    sorts: SortConfig[];
  };
  filter_config: FilterConfig;
  density: DensityMode;
  is_default: boolean;
}
