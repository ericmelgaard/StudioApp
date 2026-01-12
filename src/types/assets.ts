export type AssetType = 'image' | 'video' | 'document';

export interface Asset {
  id: string;
  filename: string;
  storage_path: string;
  preview_path: string | null;
  file_type: string;
  file_size: number;
  asset_type: AssetType;
  title: string;
  description: string;
  tags: string[];
  company_id: number | null;
  concept_id: number | null;
  store_id: number | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetFormData {
  title: string;
  description: string;
  tags: string[];
  company_id: number | null;
  concept_id: number | null;
  store_id: number | null;
}

export interface AssetFilters {
  asset_type?: AssetType;
  company_id?: number;
  concept_id?: number;
  store_id?: number;
  search?: string;
  tags?: string[];
}
