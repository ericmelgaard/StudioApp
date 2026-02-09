export type TransitionType = 'fade' | 'slide' | 'zoom' | 'none' | 'wipe';
export type ContentType = 'asset' | 'template' | 'custom';
export type ContentStatus = 'active' | 'draft' | 'archived';

export interface BoardContent {
  id: string;
  board_id: string;
  content_type: ContentType;
  asset_id?: string | null;
  template_id?: string | null;
  order_position: number;
  duration_seconds: number;
  transition_effect: TransitionType;
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  days_of_week?: number[];
  config_data?: Record<string, any>;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export interface PlaylistAsset {
  id: string;
  asset_id: string;
  order_position: number;
  duration_seconds: number;
  transition_effect: TransitionType;
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  days_of_week?: number[];
  metadata?: Record<string, any>;
}

export interface BoardConfiguration {
  playlist_assets: PlaylistAsset[];
  board_settings?: {
    background_color?: string;
    default_duration?: number;
    loop_playlist?: boolean;
  };
}

export interface ThemeContent {
  id: string;
  theme_id: string;
  display_type_id: string;
  theme_board_id?: string | null;
  content_data: {
    boards?: {
      [daypart: string]: BoardConfiguration;
    };
  };
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface DisplayType {
  id: string;
  name: string;
  description: string | null;
  category: string;
  specifications: {
    resolution?: string;
    aspect_ratio?: string;
    screen_size?: string;
    format?: string;
  };
  status: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived';
  metadata: Record<string, any>;
  concept_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ThemeBoard {
  id: string;
  theme_id: string;
  display_type_id: string;
  daypart_id: string;
  layout_config: {
    type: string;
    width: string;
    height: string;
  };
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface DaypartDefinition {
  id: string;
  daypart_name: string;
  display_label: string;
  description: string | null;
  color: string;
  icon: string | null;
}
