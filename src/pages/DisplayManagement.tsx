import { useState, useEffect } from 'react';
import { ArrowLeft, Monitor, ShoppingCart, Moon, Zap, Leaf, AlertTriangle, CheckCircle2, Layers, History, Grid3x3, List, Search, MoreVertical, RotateCw, RefreshCw, Trash, Eye, Settings, Smartphone, Package, Globe, Sun, Coffee, Clock, Sunrise, Sunset, Star as Stars, Edit3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import DisplayPreviewModal from '../components/DisplayPreviewModal';
import DisplayContentModal from '../components/DisplayContentModal';
import StoreDevicesManagement from './StoreDevicesManagement';
import StoreGroupsManagement from './StoreGroupsManagement';
import QuickActionsEditor from '../components/QuickActionsEditor';

interface DisplayManagementProps {
  storeId: number;
  storeName: string;
  onBack?: () => void;
  isHomePage?: boolean;
}

type PlayerType = 'signage' | 'label';

interface MediaPlayer {
  id: string;
  device_id: string;
  name: string;
  ip_address: string;
  mac_address: string;
  status: 'online' | 'offline' | 'error' | 'identify';
  player_type: PlayerType;
  is_webview_kiosk: boolean;
  last_heartbeat: string;
  firmware_version: string;
  placement_group_id: string | null;
  store_id: number;
}

interface Display {
  id: string;
  name: string;
  media_player_id: string;
  display_type_id: string;
  position: number;
  status: 'active' | 'inactive' | 'error';
  thumbnail_url: string | null;
  configuration?: {
    preview_url?: string;
    screenshot_url?: string;
    is_temporary_content?: boolean;
    content_notes?: string;
  };
  display_types?: {
    id: string;
    name: string;
    category: string;
    specifications?: {
      resolution?: string;
      orientation?: string;
    };
  };
}

interface PlacementGroup {
  id: string;
  name: string;
  playerCount: number;
  onlineCount: number;
}

interface DisplayCard {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'error';
  uptime: string;
  thumbnail: string | null;
  mediaPlayer: MediaPlayer;
  displays: Display[];
  isGroup: boolean;
  groupInfo?: PlacementGroup;
  orientation?: 'horizontal' | 'vertical';
}

interface DaypartBadge {
  name: string;
  label: string;
  color: string;
  icon: string;
  count: number;
  isCustom: boolean;
}

type OperationStatus = 'open' | 'closed';
type ViewMode = 'list' | 'grid';
type PageView = 'home' | 'devices' | 'groups' | 'activity' | 'products';

export default function DisplayManagement({ storeId, storeName, onBack, isHomePage = false }: DisplayManagementProps) {
  const [operationStatus, setOperationStatus] = useState<OperationStatus>('open');
  const [alertStatus, setAlertStatus] = useState<'alert' | 'no_alert'>('no_alert');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return window.innerWidth >= 768 ? 'grid' : 'list';
  });
  const [currentPage, setCurrentPage] = useState<PageView>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayCards, setDisplayCards] = useState<DisplayCard[]>([]);
  const [placementGroups, setPlacementGroups] = useState<PlacementGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [daypartBadges, setDaypartBadges] = useState<DaypartBadge[]>([]);
  const [stats, setStats] = useState({
    totalDevices: 0,
    onlineDevices: 0,
    totalGroups: 0,
    recentActions: 0,
    totalProducts: 0,
    activeProducts: 0,
    totalSignagePlayers: 0,
    onlineSignagePlayers: 0,
    totalSmartLabels: 0,
    onlineSmartLabels: 0,
    totalWebviewKiosks: 0,
    onlineWebviewKiosks: 0
  });
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [previewModal, setPreviewModal] = useState<{ display: Display; name: string; orientation: 'horizontal' | 'vertical' } | null>(null);
  const [contentModal, setContentModal] = useState<Display | null>(null);
  const [showQuickActionsEditor, setShowQuickActionsEditor] = useState(false);
  const [visibleQuickActions, setVisibleQuickActions] = useState<string[]>([
    'devices',
    'groups',
    'activity',
    'products',
    'signage',
    'smart_labels',
    'webview_kiosks'
  ]);

  useEffect(() => {
    loadStoreOperationStatus();
    loadDisplayData();
    loadActiveDayparts();
    loadQuickActionsPreferences();
  }, [storeId]);

  const loadQuickActionsPreferences = async () => {
    try {
      const { data } = await supabase
        .from('quick_actions_preferences')
        .select('visible_actions')
        .eq('store_id', storeId)
        .maybeSingle();

      if (data?.visible_actions) {
        setVisibleQuickActions(data.visible_actions as string[]);
      }
    } catch (error) {
      console.error('Error loading quick actions preferences:', error);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      loadActiveDayparts();
    }, 60000);

    return () => clearInterval(interval);
  }, [storeId]);

  const getDisplayOrientation = (display: Display): 'horizontal' | 'vertical' => {
    const orientation = display.display_types?.specifications?.orientation;
    if (orientation === 'vertical') return 'vertical';

    const resolution = display.display_types?.specifications?.resolution;
    if (resolution) {
      const [width, height] = resolution.split('x').map(Number);
      if (height > width) return 'vertical';
    }

    return 'horizontal';
  };

  const loadStoreOperationStatus = async () => {
    const { data, error } = await supabase
      .from('stores')
      .select('operation_status')
      .eq('id', storeId)
      .maybeSingle();

    if (!error && data) {
      setOperationStatus(data.operation_status || 'open');
    }
  };

  const loadDisplayData = async () => {
    setLoading(true);

    const { data: mediaPlayers, error: mpError } = await supabase
      .from('media_players')
      .select('*, hardware_devices(*)')
      .eq('store_id', storeId);

    if (mpError) {
      console.error('Error loading media players:', mpError);
      setLoading(false);
      return;
    }

    const { data: displays, error: displaysError } = await supabase
      .from('displays')
      .select(`
        *,
        display_types(id, name, category, specifications)
      `)
      .in('media_player_id', mediaPlayers?.map(mp => mp.id) || []);

    if (displaysError) {
      console.error('Error loading displays:', displaysError);
      setLoading(false);
      return;
    }

    const groupedDisplays: Record<string, Display[]> = {};
    const ungroupedDisplays: Display[] = [];

    displays?.forEach(d => {
      if (d.placement_group_id) {
        if (!groupedDisplays[d.placement_group_id]) {
          groupedDisplays[d.placement_group_id] = [];
        }
        groupedDisplays[d.placement_group_id].push(d);
      } else {
        ungroupedDisplays.push(d);
      }
    });

    const cards: DisplayCard[] = [];

    // Create cards for all media players (both ungrouped and grouped)
    // For displays in placement groups, show them as individual media player cards
    const allDisplaysByMediaPlayer: Record<string, Display[]> = {};

    // Add ungrouped displays
    ungroupedDisplays.forEach(d => {
      const mpId = d.media_player_id;
      if (!allDisplaysByMediaPlayer[mpId]) {
        allDisplaysByMediaPlayer[mpId] = [];
      }
      allDisplaysByMediaPlayer[mpId].push(d);
    });

    // Add grouped displays (they should still show as individual media player cards in the displays view)
    Object.values(groupedDisplays).flat().forEach(d => {
      const mpId = d.media_player_id;
      if (!allDisplaysByMediaPlayer[mpId]) {
        allDisplaysByMediaPlayer[mpId] = [];
      }
      allDisplaysByMediaPlayer[mpId].push(d);
    });

    // Create display cards for ALL media players at this location
    mediaPlayers?.forEach(mp => {
      const disps = allDisplaysByMediaPlayer[mp.id] || [];
      const uptime = calculateUptime(mp.last_heartbeat);
      const screenshotUrl = disps[0]?.configuration?.screenshot_url;
      const thumbnail = screenshotUrl || disps[0]?.thumbnail_url || null;
      const orientation = disps[0] ? getDisplayOrientation(disps[0]) : 'horizontal';

      cards.push({
        id: mp.id,
        name: mp.name,
        status: mp.status,
        uptime,
        thumbnail,
        mediaPlayer: mp,
        displays: disps,
        isGroup: false,
        orientation
      });
    });

    // Calculate placement groups stats (for the Groups button)
    const { data: pgData } = await supabase
      .from('placement_groups')
      .select('id, name')
      .in('id', Object.keys(groupedDisplays));

    const groups: PlacementGroup[] = [];

    Object.entries(groupedDisplays).forEach(([pgId, groupDisps]) => {
      const pgInfo = pgData?.find(pg => pg.id === pgId);
      const onlineCount = groupDisps.filter(d => {
        const mp = mediaPlayers?.find(p => p.id === d.media_player_id);
        return mp?.status === 'online';
      }).length;

      groups.push({
        id: pgId,
        name: pgInfo?.name || 'Unnamed Group',
        playerCount: groupDisps.length,
        onlineCount
      });
    });

    setDisplayCards(cards);
    setPlacementGroups(groups);

    const totalOnline = mediaPlayers?.filter(mp => mp.status === 'online').length || 0;

    const signagePlayers = mediaPlayers?.filter(mp => mp.player_type === 'signage') || [];
    const smartLabels = mediaPlayers?.filter(mp => mp.player_type === 'label') || [];
    const webviewKiosks = signagePlayers.filter(mp => mp.is_webview_kiosk) || [];

    setStats({
      totalDevices: mediaPlayers?.length || 0,
      onlineDevices: totalOnline,
      totalGroups: groups.length,
      recentActions: 0,
      totalProducts: 0,
      activeProducts: 0,
      totalSignagePlayers: signagePlayers.length,
      onlineSignagePlayers: signagePlayers.filter(mp => mp.status === 'online').length,
      totalSmartLabels: smartLabels.length,
      onlineSmartLabels: smartLabels.filter(mp => mp.status === 'online').length,
      totalWebviewKiosks: webviewKiosks.length,
      onlineWebviewKiosks: webviewKiosks.filter(mp => mp.status === 'online').length
    });

    setLoading(false);
  };

  const calculateUptime = (lastHeartbeat: string | null): string => {
    if (!lastHeartbeat) return 'Offline';

    const now = new Date();
    const last = new Date(lastHeartbeat);
    const diff = Math.floor((now.getTime() - last.getTime()) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const loadActiveDayparts = async () => {
    const { data: allDisplays } = await supabase
      .from('displays')
      .select('id, placement_group_id, media_player:media_players!inner(store_id)')
      .eq('media_player.store_id', storeId);

    if (!allDisplays || allDisplays.length === 0) {
      setDaypartBadges([]);
      return;
    }

    const placementIds = [...new Set(allDisplays.map(d => d.placement_group_id).filter(Boolean))];

    if (placementIds.length === 0) {
      setDaypartBadges([]);
      return;
    }

    const { data: definitions } = await supabase.rpc('get_effective_daypart_definitions', {
      p_store_id: storeId
    });

    if (!definitions || definitions.length === 0) {
      setDaypartBadges([]);
      return;
    }

    const now = new Date();
    const currentDayOfWeek = now.getDay();
    const currentTime = now.toTimeString().slice(0, 8);

    const defIds = definitions.map((d: any) => d.id);
    const { data: storeSchedules } = await supabase
      .from('daypart_schedules')
      .select('daypart_definition_id, days_of_week, start_time, end_time')
      .in('daypart_definition_id', defIds)
      .contains('days_of_week', [currentDayOfWeek]);

    const activeStoreSchedules = storeSchedules?.filter(schedule => {
      const startTime = schedule.start_time;
      const endTime = schedule.end_time;

      if (endTime < startTime) {
        return currentTime >= startTime || currentTime < endTime;
      } else {
        return currentTime >= startTime && currentTime < endTime;
      }
    }) || [];

    const activeStoreScheduleDefIds = new Set(activeStoreSchedules.map(s => s.daypart_definition_id));

    const { data: placementOverrides } = await supabase
      .from('placement_daypart_overrides')
      .select('placement_group_id, daypart_name, days_of_week, start_time, end_time')
      .in('placement_group_id', placementIds)
      .contains('days_of_week', [currentDayOfWeek]);

    const activePlacementOverrides = placementOverrides?.filter(override => {
      const startTime = override.start_time;
      const endTime = override.end_time;

      if (endTime < startTime) {
        return currentTime >= startTime || currentTime < endTime;
      } else {
        return currentTime >= startTime && currentTime < endTime;
      }
    }) || [];

    const daypartToPlacementsMap = new Map<string, Set<string>>();

    for (const placementId of placementIds) {
      const overrides = activePlacementOverrides.filter(o => o.placement_group_id === placementId);
      const overriddenDayparts = new Set(overrides.map(o => o.daypart_name));

      // Add placement-specific overrides
      overrides.forEach(override => {
        if (!daypartToPlacementsMap.has(override.daypart_name)) {
          daypartToPlacementsMap.set(override.daypart_name, new Set());
        }
        daypartToPlacementsMap.get(override.daypart_name)!.add(placementId);
      });

      // Add inherited store schedules for dayparts WITHOUT overrides
      definitions.forEach((def: any) => {
        if (!overriddenDayparts.has(def.daypart_name) && activeStoreScheduleDefIds.has(def.id)) {
          if (!daypartToPlacementsMap.has(def.daypart_name)) {
            daypartToPlacementsMap.set(def.daypart_name, new Set());
          }
          daypartToPlacementsMap.get(def.daypart_name)!.add(placementId);
        }
      });
    }

    const badges = definitions
      .filter((definition: any) => daypartToPlacementsMap.has(definition.daypart_name))
      .map((definition: any) => {
        const placementCount = daypartToPlacementsMap.get(definition.daypart_name)?.size || 0;

        return {
          name: definition.daypart_name,
          label: definition.display_label || definition.daypart_name,
          color: definition.color || 'bg-slate-100 text-slate-800 border-slate-300',
          icon: definition.icon || 'Clock',
          count: placementCount,
          isCustom: false
        };
      })
      .filter(badge => badge.count > 0);

    setDaypartBadges(badges);
  };

  const handleStatusChange = async (newStatus: OperationStatus) => {
    const { error } = await supabase
      .from('stores')
      .update({ operation_status: newStatus })
      .eq('id', storeId);

    if (!error) {
      setOperationStatus(newStatus);
    }
  };

  const handleDisplayAction = async (displayId: string, mediaPlayerId: string, actionType: string) => {
    setActionLoading(displayId);
    setActiveMenu(null);

    const { error } = await supabase
      .from('display_actions_log')
      .insert({
        display_id: displayId !== mediaPlayerId ? displayId : null,
        media_player_id: mediaPlayerId,
        action_type: actionType,
        initiated_by: 'operator',
        status: 'pending'
      });

    if (!error) {
      setTimeout(() => {
        setActionLoading(null);
        loadDisplayData();
      }, 2000);
    } else {
      setActionLoading(null);
    }
  };

  const handleViewPreview = (card: DisplayCard) => {
    const display = card.displays[0];
    if (display?.configuration?.preview_url) {
      const displayName = card.displays.length > 0
        ? card.displays.map(d => d.name).join(' + ')
        : card.name;
      setPreviewModal({ display, name: displayName, orientation: card.orientation || 'horizontal' });
      setActiveMenu(null);
    }
  };

  const handleManageContent = (card: DisplayCard) => {
    const display = card.displays[0];
    if (display) {
      setContentModal(display);
      setActiveMenu(null);
    }
  };

  const filteredDisplays = displayCards.filter(card =>
    card.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      case 'error': return 'bg-amber-500';
      default: return 'bg-slate-500';
    }
  };

  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, any> = {
      'Sun': Sun,
      'Moon': Moon,
      'Coffee': Coffee,
      'Clock': Clock,
      'Sunrise': Sunrise,
      'Sunset': Sunset,
      'Stars': Stars,
      'MoonStar': Moon,
    };
    return iconMap[iconName] || Clock;
  };

  if (currentPage === 'devices') {
    return (
      <StoreDevicesManagement
        storeId={storeId}
        storeName={storeName}
        onBack={() => setCurrentPage('home')}
        filterPlayerType="label"
        title="Smart Labels"
      />
    );
  }

  if (currentPage === 'groups') {
    return (
      <StoreGroupsManagement
        storeId={storeId}
        storeName={storeName}
        onBack={() => setCurrentPage('home')}
      />
    );
  }

  return (
    <div className={isHomePage ? "bg-slate-50 dark:bg-slate-900 pb-20" : "min-h-screen bg-slate-50 dark:bg-slate-900 pb-20"}>
      {!isHomePage && (
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
              )}
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <Monitor className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Operator Hub</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">{storeName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <ShoppingCart className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
              <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <Moon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={isHomePage ? "" : "sticky top-[57px] z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm"}>
        <div className="px-4 py-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-4 text-center">
            Store Status
          </p>
          <div className="flex items-center justify-center gap-10 overflow-x-auto no-scrollbar px-2">
            <button
              onClick={() => setOperationStatus(operationStatus === 'open' ? 'closed' : 'open')}
              className="flex flex-col items-center gap-2 flex-shrink-0"
            >
              <div
                className="w-20 h-12 rounded-full flex items-center justify-center border-4 transition-all"
                style={operationStatus === 'open'
                  ? { borderColor: '#00adf0', backgroundColor: 'rgba(0, 173, 240, 0.2)', color: '#00adf0' }
                  : { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }
                }
              >
                {operationStatus === 'open' ? <Zap className="w-8 h-8" /> : <Leaf className="w-8 h-8" />}
              </div>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {operationStatus === 'open' ? 'Power On' : 'Power Save'}
              </span>
            </button>

            <button
              onClick={() => setAlertStatus(alertStatus === 'alert' ? 'no_alert' : 'alert')}
              className="flex flex-col items-center gap-2 flex-shrink-0"
            >
              <div
                className="w-20 h-12 rounded-full flex items-center justify-center border-4 transition-all"
                style={alertStatus === 'alert'
                  ? { borderColor: '#f97316', backgroundColor: 'rgba(249, 115, 22, 0.2)', color: '#f97316' }
                  : { borderColor: '#00adf0', backgroundColor: 'rgba(0, 173, 240, 0.2)', color: '#00adf0' }
                }
              >
                {alertStatus === 'alert' ? <AlertTriangle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
              </div>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {alertStatus === 'alert' ? 'Alert' : 'No Issues'}
              </span>
            </button>

            {daypartBadges.slice(0, window.innerWidth >= 768 ? daypartBadges.length : 3).map((badge) => {
              const IconComponent = getIconComponent(badge.icon);
              return (
                <div key={badge.name} className="flex flex-col items-center gap-2 flex-shrink-0">
                  <div className="relative">
                    <div
                      className={`w-20 h-12 rounded-full flex items-center justify-center border-4 ${badge.color}`}
                    >
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div className="absolute top-0 right-0 w-6 h-6 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                      {badge.count}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-4 py-4 flex gap-3 overflow-x-auto no-scrollbar bg-white dark:bg-slate-800 max-h-[180px] md:max-h-none">
          {visibleQuickActions.map(actionId => {
            if (actionId === 'devices') {
              return (
                <button
                  key="devices"
                  onClick={() => setCurrentPage('devices')}
                  className="flex-shrink-0 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-3 min-w-[140px] shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group"
                  aria-label="View smart labels"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-4 h-4 group-hover:scale-110 transition-transform" style={{ color: '#f59e0b' }} />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">Smart Labels</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalSmartLabels}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{stats.onlineSmartLabels} online</p>
                </button>
              );
            }
            if (actionId === 'groups') {
              return (
                <button
                  key="groups"
                  onClick={() => setCurrentPage('groups')}
                  className="flex-shrink-0 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-3 min-w-[140px] shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group"
                  aria-label="View groups"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="w-4 h-4 group-hover:scale-110 transition-transform" style={{ color: '#06b6d4' }} />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">Groups</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalGroups}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">placement groups</p>
                </button>
              );
            }
            if (actionId === 'activity') {
              return (
                <div key="activity" className="flex-shrink-0 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-3 min-w-[140px] shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <History className="w-4 h-4" style={{ color: '#8b5cf6' }} />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Activity</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.recentActions}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">recent actions</p>
                </div>
              );
            }
            if (actionId === 'products') {
              return (
                <div key="products" className="flex-shrink-0 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-3 min-w-[140px] shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-4 h-4" style={{ color: '#10b981' }} />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Products</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalProducts}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{stats.activeProducts} active</p>
                </div>
              );
            }
            if (actionId === 'signage') {
              return (
                <div key="signage" className="flex-shrink-0 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-3 min-w-[140px] shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Monitor className="w-4 h-4" style={{ color: '#3b82f6' }} />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Signage</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalSignagePlayers}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{stats.onlineSignagePlayers} online</p>
                </div>
              );
            }
            if (actionId === 'webview_kiosks') {
              return (
                <div key="webview_kiosks" className="flex-shrink-0 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-3 min-w-[140px] shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-4 h-4" style={{ color: '#8b5cf6' }} />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Webview Kiosks</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalWebviewKiosks}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{stats.onlineWebviewKiosks} online</p>
                </div>
              );
            }
            return null;
          })}

          <button
            onClick={() => setShowQuickActionsEditor(true)}
            className="flex-shrink-0 bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 min-w-[140px] hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200 cursor-pointer group flex items-center justify-center"
            aria-label="Customize quick actions"
          >
            <div className="flex flex-col items-center gap-2">
              <Edit3 className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300">Customize</span>
            </div>
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Displays</h2>
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {viewMode === 'list' ? <Grid3x3 className="w-5 h-5 text-slate-600 dark:text-slate-400" /> : <List className="w-5 h-5 text-slate-600 dark:text-slate-400" />}
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search displays..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading displays...</p>
          </div>
        ) : filteredDisplays.length === 0 ? (
          <div className="text-center py-12">
            <Monitor className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">No displays found</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
            {filteredDisplays.map((card) => (
              <div
                key={card.id}
                className="relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                {actionLoading === card.id && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 z-10 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                  </div>
                )}

                <div className="relative">
                      <div
                        className="relative aspect-video bg-slate-200 dark:bg-slate-700 cursor-pointer group overflow-hidden"
                        onClick={() => card.displays[0]?.configuration?.preview_url && handleViewPreview(card)}
                      >
                        {card.thumbnail ? (
                          <>
                            {card.orientation === 'vertical' ? (
                              <div className="relative w-full h-full flex items-center justify-center">
                                <img
                                  src={card.thumbnail}
                                  alt={card.name}
                                  className="h-[177.78%] w-auto object-contain -rotate-90"
                                  style={{ minWidth: '177.78%' }}
                                />
                              </div>
                            ) : (
                              <img
                                src={card.thumbnail}
                                alt={card.name}
                                className="w-full h-full object-cover"
                              />
                            )}
                            {card.displays[0]?.configuration?.preview_url && (
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="bg-white dark:bg-slate-800 rounded-lg px-4 py-2 flex items-center gap-2">
                                  <Eye className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">View Live</span>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {card.orientation === 'vertical' ? (
                              <Smartphone className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                            ) : (
                              <Monitor className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                            )}
                          </div>
                        )}
                        <div className="absolute top-2 left-2 flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${getStatusColor(card.status)}`}></span>
                          <span className="text-xs bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 px-2 py-1 rounded shadow-sm">{card.uptime}</span>
                        </div>
                        {card.orientation === 'vertical' && (
                          <div className="absolute bottom-2 right-2">
                            <div className="bg-blue-600 dark:bg-blue-500 text-white px-2 py-1 rounded shadow-sm flex items-center gap-1">
                              <Smartphone className="w-3 h-3" />
                              <span className="text-xs font-medium">Vertical</span>
                            </div>
                          </div>
                        )}
                        {card.displays.length > 1 && (
                          <div className="absolute bottom-2 left-2">
                            <span className="text-xs bg-blue-600 dark:bg-blue-500 text-white px-2 py-1 rounded shadow-sm">
                              Dual Display
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="absolute top-2 right-2 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu(activeMenu === card.id ? null : card.id);
                          }}
                          className="p-1.5 bg-white/90 dark:bg-slate-800/90 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors shadow-sm"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                        </button>

                        {activeMenu === card.id && (
                          <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden z-20">
                            <button
                              onClick={() => handleDisplayAction(card.id, card.mediaPlayer.id, 'reboot')}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left text-slate-700 dark:text-slate-300"
                            >
                              <RotateCw className="w-4 h-4" />
                              <span className="text-sm">Reboot</span>
                            </button>
                            <button
                              onClick={() => handleDisplayAction(card.id, card.mediaPlayer.id, 'refresh')}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left text-slate-700 dark:text-slate-300"
                            >
                              <RefreshCw className="w-4 h-4" />
                              <span className="text-sm">Refresh Content</span>
                            </button>
                            <button
                              onClick={() => handleDisplayAction(card.id, card.mediaPlayer.id, 'clear_storage')}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left text-slate-700 dark:text-slate-300"
                            >
                              <Trash className="w-4 h-4" />
                              <span className="text-sm">Clear Storage</span>
                            </button>
                            <div className="border-t border-slate-200 dark:border-slate-700"></div>
                            <button
                              onClick={() => handleViewPreview(card)}
                              disabled={!card.displays[0]?.configuration?.preview_url}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Eye className="w-4 h-4" />
                              <span className="text-sm">View Live Preview</span>
                            </button>
                            <button
                              onClick={() => handleManageContent(card)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left text-slate-700 dark:text-slate-300"
                            >
                              <Settings className="w-4 h-4" />
                              <span className="text-sm">Manage Content</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm mb-1 text-slate-900 dark:text-slate-100">
                        {card.displays.length > 0
                          ? card.displays.map(d => d.name).join(' + ')
                          : card.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        {card.mediaPlayer.name}
                      </p>
                    </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewModal && (
        <DisplayPreviewModal
          displayName={previewModal.name}
          previewUrl={previewModal.display.configuration?.preview_url || ''}
          orientation={previewModal.orientation}
          onClose={() => setPreviewModal(null)}
        />
      )}

      {contentModal && (
        <DisplayContentModal
          display={contentModal}
          onClose={() => setContentModal(null)}
          onSave={() => {
            setContentModal(null);
            loadDisplayData();
          }}
        />
      )}

      {showQuickActionsEditor && (
        <QuickActionsEditor
          onClose={() => setShowQuickActionsEditor(false)}
          onSave={(actions) => {
            setVisibleQuickActions(actions);
            setShowQuickActionsEditor(false);
          }}
          currentActions={visibleQuickActions}
          storeId={storeId}
        />
      )}
    </div>
  );
}
