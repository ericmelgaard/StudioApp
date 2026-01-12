import { supabase } from './supabase';
import type { Asset, AssetFilters, AssetFormData } from '../types/assets';

const BUCKET_NAME = 'assets';

export const assetService = {
  async uploadAsset(
    file: File,
    metadata: AssetFormData,
    userId: string
  ): Promise<Asset> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const assetType = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
      ? 'video'
      : 'document';

    const { data, error } = await supabase
      .from('asset_library')
      .insert({
        filename: file.name,
        storage_path: uploadData.path,
        file_type: file.type,
        file_size: file.size,
        asset_type: assetType,
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        company_id: metadata.company_id,
        concept_id: metadata.concept_id,
        store_id: metadata.store_id,
        uploaded_by: userId
      })
      .select()
      .single();

    if (error) {
      await supabase.storage.from(BUCKET_NAME).remove([fileName]);
      throw error;
    }

    return data;
  },

  async getAssets(filters: AssetFilters = {}): Promise<Asset[]> {
    let query = supabase
      .from('asset_library')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.asset_type) {
      query = query.eq('asset_type', filters.asset_type);
    }

    if (filters.company_id) {
      query = query.eq('company_id', filters.company_id);
    }

    if (filters.concept_id) {
      query = query.eq('concept_id', filters.concept_id);
    }

    if (filters.store_id) {
      query = query.eq('store_id', filters.store_id);
    }

    if (filters.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,filename.ilike.%${filters.search}%`
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getAsset(id: string): Promise<Asset> {
    const { data, error } = await supabase
      .from('asset_library')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async updateAsset(id: string, updates: Partial<AssetFormData>): Promise<Asset> {
    const { data, error } = await supabase
      .from('asset_library')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAsset(id: string): Promise<void> {
    const asset = await this.getAsset(id);

    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([asset.storage_path]);

    if (storageError) throw storageError;

    const { error } = await supabase
      .from('asset_library')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  getPublicUrl(storagePath: string): string {
    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    return data.publicUrl;
  }
};
