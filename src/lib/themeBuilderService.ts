import { supabase } from './supabase';
import type { BoardConfiguration, ThemeContent, PlaylistAsset } from '../types/themeBuilder';

export const themeBuilderService = {
  async getThemeContent(themeId: string, displayTypeId: string): Promise<ThemeContent | null> {
    const { data, error } = await supabase
      .from('theme_content')
      .select('*')
      .eq('theme_id', themeId)
      .eq('display_type_id', displayTypeId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching theme content:', error);
      throw error;
    }

    return data;
  },

  async createThemeContent(
    themeId: string,
    displayTypeId: string,
    initialData?: Partial<ThemeContent['content_data']>
  ): Promise<ThemeContent> {
    const { data, error } = await supabase
      .from('theme_content')
      .insert({
        theme_id: themeId,
        display_type_id: displayTypeId,
        content_data: initialData || { boards: {} },
        status: 'draft'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating theme content:', error);
      throw error;
    }

    return data;
  },

  async updateBoardConfiguration(
    themeContentId: string,
    daypart: string,
    boardConfig: BoardConfiguration
  ): Promise<void> {
    const { data: currentContent, error: fetchError } = await supabase
      .from('theme_content')
      .select('content_data')
      .eq('id', themeContentId)
      .single();

    if (fetchError) {
      console.error('Error fetching current content:', fetchError);
      throw fetchError;
    }

    const updatedContentData = {
      ...currentContent.content_data,
      boards: {
        ...(currentContent.content_data?.boards || {}),
        [daypart]: boardConfig
      }
    };

    const { error: updateError } = await supabase
      .from('theme_content')
      .update({
        content_data: updatedContentData,
        updated_at: new Date().toISOString()
      })
      .eq('id', themeContentId);

    if (updateError) {
      console.error('Error updating board configuration:', updateError);
      throw updateError;
    }
  },

  async getBoardConfiguration(
    themeContentId: string,
    daypart: string
  ): Promise<BoardConfiguration | null> {
    const { data, error } = await supabase
      .from('theme_content')
      .select('content_data')
      .eq('id', themeContentId)
      .single();

    if (error) {
      console.error('Error fetching board configuration:', error);
      throw error;
    }

    return data?.content_data?.boards?.[daypart] || null;
  },

  async addAssetToPlaylist(
    themeContentId: string,
    daypart: string,
    assetId: string,
    duration: number = 10
  ): Promise<void> {
    const currentBoard = await this.getBoardConfiguration(themeContentId, daypart);

    const existingAssets = currentBoard?.playlist_assets || [];
    const maxOrder = existingAssets.length > 0
      ? Math.max(...existingAssets.map(a => a.order_position))
      : 0;

    const newAsset: PlaylistAsset = {
      id: crypto.randomUUID(),
      asset_id: assetId,
      order_position: maxOrder + 1,
      duration_seconds: duration,
      transition_effect: 'fade'
    };

    const updatedBoard: BoardConfiguration = {
      ...currentBoard,
      playlist_assets: [...existingAssets, newAsset],
      board_settings: currentBoard?.board_settings || {}
    };

    await this.updateBoardConfiguration(themeContentId, daypart, updatedBoard);
  },

  async removeAssetFromPlaylist(
    themeContentId: string,
    daypart: string,
    playlistAssetId: string
  ): Promise<void> {
    const currentBoard = await this.getBoardConfiguration(themeContentId, daypart);

    if (!currentBoard) return;

    const updatedAssets = currentBoard.playlist_assets
      .filter(a => a.id !== playlistAssetId)
      .map((asset, index) => ({
        ...asset,
        order_position: index + 1
      }));

    const updatedBoard: BoardConfiguration = {
      ...currentBoard,
      playlist_assets: updatedAssets
    };

    await this.updateBoardConfiguration(themeContentId, daypart, updatedBoard);
  },

  async updatePlaylistAsset(
    themeContentId: string,
    daypart: string,
    playlistAssetId: string,
    updates: Partial<PlaylistAsset>
  ): Promise<void> {
    const currentBoard = await this.getBoardConfiguration(themeContentId, daypart);

    if (!currentBoard) return;

    const updatedAssets = currentBoard.playlist_assets.map(asset =>
      asset.id === playlistAssetId ? { ...asset, ...updates } : asset
    );

    const updatedBoard: BoardConfiguration = {
      ...currentBoard,
      playlist_assets: updatedAssets
    };

    await this.updateBoardConfiguration(themeContentId, daypart, updatedBoard);
  },

  async reorderPlaylistAssets(
    themeContentId: string,
    daypart: string,
    reorderedAssets: PlaylistAsset[]
  ): Promise<void> {
    const updatedAssets = reorderedAssets.map((asset, index) => ({
      ...asset,
      order_position: index + 1
    }));

    const currentBoard = await this.getBoardConfiguration(themeContentId, daypart);

    const updatedBoard: BoardConfiguration = {
      ...currentBoard,
      playlist_assets: updatedAssets,
      board_settings: currentBoard?.board_settings || {}
    };

    await this.updateBoardConfiguration(themeContentId, daypart, updatedBoard);
  }
};
