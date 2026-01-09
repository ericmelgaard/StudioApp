import { useState, useEffect } from 'react';
import {
  ArrowLeft, Monitor, ShoppingCart, Moon, Unlock, Lock, Sparkles,
  Layers, History, Grid3x3, List, Search, ChevronRight, MoreVertical,
  RotateCw, RefreshCw, Trash, Eye, Settings
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DisplayManagementProps {
  storeId: number;
  storeName: string;
  onBack?: () => void;
  isHomePage?: boolean;
}

interface MediaPlayer {
  id: string;
  device_id: string;
  name: string;
  ip_address: string;
  mac_address: string;
  status: 'online' | 'offline' | 'error' | 'identify';
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
  display_type?: {
    name: string;
    category: string;
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
}

type OperationStatus = 'open' | 'closed' | 'identify';
type ViewMode = 'list' | 'grid';

export default function DisplayManagement({ storeId, storeName, onBack, isHomePage = false }: DisplayManagementProps) {
  const [operationStatus, setOperationStatus] = useState<OperationStatus>('open');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayCards, setDisplayCards] = useState<DisplayCard[]>([]);
  const [placementGroups, setPlacementGroups] = useState<PlacementGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDevices: 0,
    onlineDevices: 0,
    totalGroups: 0,
    recentActions: 0
  });
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadStoreOperationStatus();
    loadDisplayData();
  }, [storeId]);

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

    const groupedByPlacement: Record<string, MediaPlayer[]> = {};
    const singlePlayers: MediaPlayer[] = [];

    mediaPlayers?.forEach(mp => {
      if (mp.placement_group_id) {
        if (!groupedByPlacement[mp.placement_group_id]) {
          groupedByPlacement[mp.placement_group_id] = [];
        }
        groupedByPlacement[mp.placement_group_id].push(mp);
      } else {
        singlePlayers.push(mp);
      }
    });

    const cards: DisplayCard[] = [];

    singlePlayers.forEach(mp => {
      const mpDisplays = displays?.filter(d => d.media_player_id === mp.id) || [];
      const uptime = calculateUptime(mp.last_heartbeat);

      cards.push({
        id: mp.id,
        name: mp.name,
        status: mp.status,
        uptime,
        thumbnail: mpDisplays[0]?.thumbnail_url || null,
        mediaPlayer: mp,
        displays: mpDisplays,
        isGroup: false
      });
    });

    const { data: pgData } = await supabase
      .from('placement_groups')
      .select('id, name')
      .in('id', Object.keys(groupedByPlacement));

    const groups: PlacementGroup[] = [];

    Object.entries(groupedByPlacement).forEach(([pgId, players]) => {
      const pgInfo = pgData?.find(pg => pg.id === pgId);
      const onlineCount = players.filter(p => p.status === 'online').length;

      groups.push({
        id: pgId,
        name: pgInfo?.name || 'Unnamed Group',
        playerCount: players.length,
        onlineCount
      });

      cards.push({
        id: pgId,
        name: pgInfo?.name || 'Unnamed Group',
        status: onlineCount === players.length ? 'online' : onlineCount > 0 ? 'error' : 'offline',
        uptime: `${onlineCount}/${players.length} online`,
        thumbnail: null,
        mediaPlayer: players[0],
        displays: [],
        isGroup: true,
        groupInfo: {
          id: pgId,
          name: pgInfo?.name || 'Unnamed Group',
          playerCount: players.length,
          onlineCount
        }
      });
    });

    setDisplayCards(cards);
    setPlacementGroups(groups);

    const totalOnline = mediaPlayers?.filter(mp => mp.status === 'online').length || 0;

    setStats({
      totalDevices: mediaPlayers?.length || 0,
      onlineDevices: totalOnline,
      totalGroups: groups.length,
      recentActions: 0
    });

    setLoading(false);
  };

  const calculateUptime = (lastHeartbeat: string | null): string => {
    if (!lastHeartbeat) return 'Unknown';

    const now = new Date();
    const last = new Date(lastHeartbeat);
    const diff = Math.floor((now.getTime() - last.getTime()) / 1000);

    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
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

  const StatusButton = ({ status, icon: Icon, label, active }: {
    status: OperationStatus;
    icon: any;
    label: string;
    active: boolean;
  }) => {
    const colors = {
      open: 'border-green-500 bg-green-100 text-green-700',
      closed: 'border-red-500 bg-red-100 text-red-700',
      identify: 'border-amber-500 bg-amber-100 text-amber-700'
    };

    return (
      <button
        onClick={() => handleStatusChange(status)}
        className="flex flex-col items-center gap-2 flex-1"
      >
        <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 transition-all ${
          active
            ? colors[status]
            : 'border-slate-300 bg-white text-slate-400 hover:border-slate-400'
        }`}>
          <Icon className="w-8 h-8" />
        </div>
        <span className={`text-sm font-medium ${active ? 'text-slate-900' : 'text-slate-500'}`}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <div className={isHomePage ? "bg-slate-50 pb-20" : "min-h-screen bg-slate-50 pb-20"}>
      {!isHomePage && (
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
              )}
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <Monitor className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Operator Hub</h1>
                <p className="text-xs text-slate-500">{storeName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ShoppingCart className="w-5 h-5 text-slate-600" />
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Moon className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={isHomePage ? "" : "sticky top-[57px] z-10 bg-white border-b border-slate-200 shadow-sm"}>
        <div className="px-4 py-6 border-b border-slate-200 bg-slate-50">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-4 text-center">
            Store Status
          </p>
          <div className="flex items-center justify-around gap-4">
            <StatusButton status="open" icon={Unlock} label="Open" active={operationStatus === 'open'} />
            <StatusButton status="closed" icon={Lock} label="Closed" active={operationStatus === 'closed'} />
            <StatusButton status="identify" icon={Sparkles} label="Identify" active={operationStatus === 'identify'} />
          </div>
        </div>

        <div className="px-4 py-4 flex gap-3 overflow-x-auto no-scrollbar bg-white max-h-[180px] md:max-h-none">
          <div className="flex-shrink-0 bg-white border border-slate-200 rounded-lg px-4 py-3 min-w-[140px] shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Monitor className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-slate-600">Devices</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.totalDevices}</p>
            <p className="text-xs text-slate-500">{stats.onlineDevices} online</p>
          </div>

          <div className="flex-shrink-0 bg-white border border-slate-200 rounded-lg px-4 py-3 min-w-[140px] shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-slate-600">Groups</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.totalGroups}</p>
            <p className="text-xs text-slate-500">placement groups</p>
          </div>

          <div className="flex-shrink-0 bg-white border border-slate-200 rounded-lg px-4 py-3 min-w-[140px] shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <History className="w-4 h-4 text-green-600" />
              <span className="text-xs font-semibold text-slate-600">Activity</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.recentActions}</p>
            <p className="text-xs text-slate-500">recent actions</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Displays</h2>
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {viewMode === 'list' ? <Grid3x3 className="w-5 h-5 text-slate-600" /> : <List className="w-5 h-5 text-slate-600" />}
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search displays..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-slate-600">Loading displays...</p>
          </div>
        ) : filteredDisplays.length === 0 ? (
          <div className="text-center py-12">
            <Monitor className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No displays found</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
            {filteredDisplays.map((card) => (
              <div
                key={card.id}
                className="relative bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {actionLoading === card.id && (
                  <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                )}

                {card.isGroup ? (
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-purple-600" />
                        <h3 className="font-semibold text-slate-900">{card.name}</h3>
                      </div>
                      <span className={`w-3 h-3 rounded-full ${getStatusColor(card.status)}`}></span>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{card.uptime}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        {card.groupInfo?.playerCount} devices
                      </span>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative aspect-video bg-slate-200">
                      {card.thumbnail ? (
                        <img src={card.thumbnail} alt={card.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Monitor className="w-12 h-12 text-slate-400" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${getStatusColor(card.status)}`}></span>
                        <span className="text-xs bg-white/90 text-slate-700 px-2 py-1 rounded shadow-sm">{card.uptime}</span>
                      </div>
                      <div className="absolute top-2 right-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu(activeMenu === card.id ? null : card.id);
                          }}
                          className="p-1.5 bg-white/90 rounded-lg hover:bg-white transition-colors shadow-sm"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-600" />
                        </button>

                        {activeMenu === card.id && (
                          <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-20">
                            <button
                              onClick={() => handleDisplayAction(card.id, card.mediaPlayer.id, 'reboot')}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left text-slate-700"
                            >
                              <RotateCw className="w-4 h-4" />
                              <span className="text-sm">Reboot</span>
                            </button>
                            <button
                              onClick={() => handleDisplayAction(card.id, card.mediaPlayer.id, 'refresh')}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left text-slate-700"
                            >
                              <RefreshCw className="w-4 h-4" />
                              <span className="text-sm">Refresh Content</span>
                            </button>
                            <button
                              onClick={() => handleDisplayAction(card.id, card.mediaPlayer.id, 'clear_storage')}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left text-slate-700"
                            >
                              <Trash className="w-4 h-4" />
                              <span className="text-sm">Clear Storage</span>
                            </button>
                            <div className="border-t border-slate-200"></div>
                            <button
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left text-slate-700"
                            >
                              <Eye className="w-4 h-4" />
                              <span className="text-sm">View Details</span>
                            </button>
                            <button
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left text-slate-700"
                            >
                              <Settings className="w-4 h-4" />
                              <span className="text-sm">Settings</span>
                            </button>
                          </div>
                        )}
                      </div>
                      {card.displays.length > 1 && (
                        <div className="absolute bottom-2 left-2">
                          <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded shadow-sm">
                            Dual Display
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm mb-1 text-slate-900">{card.name}</h3>
                      <p className="text-xs text-slate-600">
                        {card.displays.map(d => d.display_type?.name).filter(Boolean).join(' + ') || 'No display type'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
