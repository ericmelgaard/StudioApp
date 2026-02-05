import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Trash2, Monitor, Grid, List, Filter, X, ChevronDown } from 'lucide-react';
import LocationRequired from '../components/LocationRequired';
import { useLocation } from '../hooks/useLocation';

interface Display {
  id: string;
  name: string;
  media_player_id: string;
  display_type_id: string;
  position: number;
  status: string;
  thumbnail_url: string | null;
  created_at: string;
  media_player?: {
    id: string;
    name: string;
    store_id: number | null;
    stores?: {
      id: number;
      name: string;
    } | null;
  };
  display_types?: {
    id: string;
    name: string;
    category: string;
    specifications: any;
  };
}

type PlayerType = 'signage' | 'label';
type DisplayCategory = 'signage' | 'label';

interface MediaPlayer {
  id: string;
  name: string;
  device_id: string;
  player_type: PlayerType;
  is_webview_kiosk: boolean;
  store_id: number | null;
  stores?: {
    name: string;
  } | null;
  display_count?: number;
}

interface DisplayType {
  id: string;
  name: string;
  category: string;
  display_category: DisplayCategory;
  specifications: any;
}

export default function DisplaysManagement() {
  const { location } = useLocation();
  const [displays, setDisplays] = useState<Display[]>([]);
  const [filteredDisplays, setFilteredDisplays] = useState<Display[]>([]);
  const [mediaPlayers, setMediaPlayers] = useState<MediaPlayer[]>([]);
  const [displayTypes, setDisplayTypes] = useState<DisplayType[]>([]);
  const [placementGroups, setPlacementGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDisplayTypes, setSelectedDisplayTypes] = useState<string[]>([]);
  const [selectedPlacementGroups, setSelectedPlacementGroups] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showModal, setShowModal] = useState(false);
  const [editingDisplay, setEditingDisplay] = useState<Display | null>(null);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [showPlacementFilter, setShowPlacementFilter] = useState(false);
  const typeFilterRef = useRef<HTMLDivElement>(null);
  const placementFilterRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    media_player_id: '',
    display_type_id: '',
    position: '1'
  });

  useEffect(() => {
    loadData();
  }, [location]);

  useEffect(() => {
    filterDisplays();
  }, [selectedDisplayTypes, selectedPlacementGroups, displays]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeFilterRef.current && !typeFilterRef.current.contains(event.target as Node)) {
        setShowTypeFilter(false);
      }
      if (placementFilterRef.current && !placementFilterRef.current.contains(event.target as Node)) {
        setShowPlacementFilter(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      let playersQuery = supabase.from('media_players').select('*, stores(id, name, company_id, companies!inner(id, name, concept_id))').order('name');
      let displaysQuery = supabase.from('displays').select('*, media_players!inner(*, stores!inner(id, name, company_id, companies!inner(id, name, concept_id))), display_types(*)').order('name');

      if (location.store) {
        playersQuery = playersQuery.eq('store_id', location.store.id);
        displaysQuery = displaysQuery.eq('media_players.store_id', location.store.id);
      } else if (location.company) {
        playersQuery = playersQuery.eq('stores.companies.id', location.company.id);
        displaysQuery = displaysQuery.eq('media_players.stores.company_id', location.company.id);
      } else if (location.concept) {
        playersQuery = playersQuery.eq('stores.companies.concept_id', location.concept.id);
        displaysQuery = displaysQuery.eq('media_players.stores.companies.concept_id', location.concept.id);
      }

      const [displaysRes, playersRes, typesRes] = await Promise.all([
        displaysQuery,
        playersQuery,
        supabase.from('display_types').select('*').eq('status', 'active').order('name')
      ]);

      if (displaysRes.error) throw displaysRes.error;
      if (playersRes.error) throw playersRes.error;
      if (typesRes.error) throw typesRes.error;

      const playerDisplayCounts = displaysRes.data.reduce((acc, display) => {
        acc[display.media_player_id] = (acc[display.media_player_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const playersWithCounts = playersRes.data.map((player: any) => ({
        ...player,
        display_count: playerDisplayCounts[player.id] || 0
      }));

      setDisplays(displaysRes.data);
      setMediaPlayers(playersWithCounts);
      setDisplayTypes(typesRes.data);

      // Extract unique placement groups
      const groups = new Set<string>();
      displaysRes.data.forEach((display: Display) => {
        if (display.display_types?.category) {
          groups.add(display.display_types.category);
        }
      });
      setPlacementGroups(Array.from(groups).sort());
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterDisplays = () => {
    let filtered = displays;

    // Filter by display type
    if (selectedDisplayTypes.length > 0) {
      filtered = filtered.filter(display =>
        selectedDisplayTypes.includes(display.display_type_id)
      );
    }

    // Filter by placement group (category)
    if (selectedPlacementGroups.length > 0) {
      filtered = filtered.filter(display =>
        display.display_types?.category &&
        selectedPlacementGroups.includes(display.display_types.category)
      );
    }

    setFilteredDisplays(filtered);
  };

  const toggleDisplayType = (typeId: string) => {
    setSelectedDisplayTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  const togglePlacementGroup = (group: string) => {
    setSelectedPlacementGroups(prev =>
      prev.includes(group)
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  };

  const removeDisplayTypeFilter = (typeId: string) => {
    setSelectedDisplayTypes(prev => prev.filter(id => id !== typeId));
  };

  const removePlacementGroupFilter = (group: string) => {
    setSelectedPlacementGroups(prev => prev.filter(g => g !== group));
  };

  const clearAllFilters = () => {
    setSelectedDisplayTypes([]);
    setSelectedPlacementGroups([]);
  };

  const hasActiveFilters = selectedDisplayTypes.length > 0 || selectedPlacementGroups.length > 0;

  const handleOpenModal = (display?: Display) => {
    if (display) {
      setEditingDisplay(display);
      setFormData({
        name: display.name,
        media_player_id: display.media_player_id,
        display_type_id: display.display_type_id,
        position: display.position.toString()
      });
    } else {
      setEditingDisplay(null);
      setFormData({
        name: '',
        media_player_id: '',
        display_type_id: '',
        position: '1'
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDisplay(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedPlayer = mediaPlayers.find(p => p.id === formData.media_player_id);
    if (!selectedPlayer) {
      alert('Please select a media player');
      return;
    }

    if (!editingDisplay && selectedPlayer.display_count && selectedPlayer.display_count >= 2) {
      alert('This media player already has 2 displays attached. Each media player can have a maximum of 2 displays.');
      return;
    }

    const position = parseInt(formData.position);
    if (!editingDisplay) {
      const existingDisplayAtPosition = displays.find(
        d => d.media_player_id === formData.media_player_id && d.position === position
      );
      if (existingDisplayAtPosition) {
        alert(`Position ${position} is already occupied on this media player. Please choose a different position.`);
        return;
      }
    }

    try {
      if (editingDisplay) {
        const { error } = await supabase
          .from('displays')
          .update({
            name: formData.name,
            media_player_id: formData.media_player_id,
            display_type_id: formData.display_type_id,
            position: parseInt(formData.position),
            updated_at: new Date().toISOString()
          })
          .eq('id', editingDisplay.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('displays')
          .insert({
            name: formData.name,
            media_player_id: formData.media_player_id,
            display_type_id: formData.display_type_id,
            position: parseInt(formData.position),
            status: 'active'
          });

        if (error) throw error;
      }

      await loadData();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving display:', error);
      alert('Failed to save display');
    }
  };

  const handleDelete = async (display: Display) => {
    if (!confirm(`Are you sure you want to delete "${display.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('displays')
        .delete()
        .eq('id', display.id);

      if (error) throw error;

      await loadData();
    } catch (error) {
      console.error('Error deleting display:', error);
      alert('Failed to delete display');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDisplayTypesByCategory = () => {
    const grouped = filteredDisplays.reduce((acc, display) => {
      const typeName = display.display_types?.name || 'Unknown';
      if (!acc[typeName]) {
        acc[typeName] = [];
      }
      acc[typeName].push(display);
      return acc;
    }, {} as Record<string, Display[]>);

    return grouped;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center h-96 animate-in fade-in duration-300">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <p className="mt-6 text-gray-600 font-medium">Loading displays...</p>
          <p className="mt-2 text-sm text-gray-400">Fetching data for {location.store?.name || location.company?.name || location.concept?.name || 'all locations'}</p>
        </div>
      </div>
    );
  }

  const groupedDisplays = getDisplayTypesByCategory();

  if (!location.store) {
    return (
      <div className="p-6 animate-in fade-in duration-500">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Displays</h1>
          <p className="text-gray-600 mt-1">Manage display configurations and assignments</p>
        </div>
        <LocationRequired
          requiredLevel="store"
          resourceName="displays"
          message="Displays are associated with media players at specific store locations. Please select a store to view and manage displays."
        />
      </div>
    );
  }

  return (
    <div className="p-6 animate-in fade-in duration-500">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Displays</h1>
            <p className="text-gray-600 mt-1">Manage display configurations and assignments</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Display
          </button>
        </div>

        {/* Inline Filter Bar with Chips */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2"
          style={{ scrollbarWidth: 'thin' }}
        >
          {/* View Mode Toggle */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg flex-shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow' : 'text-gray-600'}`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow' : 'text-gray-600'}`}
              title="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          {/* Display Type Filter Dropdown */}
          <div className="relative flex-shrink-0" ref={typeFilterRef}>
            <button
              onClick={() => {
                setShowTypeFilter(!showTypeFilter);
                setShowPlacementFilter(false);
              }}
              className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
                selectedDisplayTypes.length > 0
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Display Type</span>
              {selectedDisplayTypes.length > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                  {selectedDisplayTypes.length}
                </span>
              )}
              <ChevronDown className="w-4 h-4" />
            </button>

            {showTypeFilter && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 px-2 py-1">Select Display Types</div>
                  {displayTypes.map(type => (
                    <label
                      key={type.id}
                      className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDisplayTypes.includes(type.id)}
                        onChange={() => toggleDisplayType(type.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{type.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Placement Group Filter Dropdown */}
          <div className="relative flex-shrink-0" ref={placementFilterRef}>
            <button
              onClick={() => {
                setShowPlacementFilter(!showPlacementFilter);
                setShowTypeFilter(false);
              }}
              className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
                selectedPlacementGroups.length > 0
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Category</span>
              {selectedPlacementGroups.length > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                  {selectedPlacementGroups.length}
                </span>
              )}
              <ChevronDown className="w-4 h-4" />
            </button>

            {showPlacementFilter && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 px-2 py-1">Select Categories</div>
                  {placementGroups.map(group => (
                    <label
                      key={group}
                      className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlacementGroups.includes(group)}
                        onChange={() => togglePlacementGroup(group)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 capitalize">{group}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Active Filter Chips */}
          {selectedDisplayTypes.map(typeId => {
            const type = displayTypes.find(t => t.id === typeId);
            return type ? (
              <div
                key={typeId}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 text-sm rounded-full flex-shrink-0"
              >
                <span>{type.name}</span>
                <button
                  onClick={() => removeDisplayTypeFilter(typeId)}
                  className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                  title="Remove filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : null;
          })}

          {selectedPlacementGroups.map(group => (
            <div
              key={group}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 text-sm rounded-full flex-shrink-0"
            >
              <span className="capitalize">{group}</span>
              <button
                onClick={() => removePlacementGroupFilter(group)}
                className="hover:bg-green-200 rounded-full p-0.5 transition-colors"
                title="Remove filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Clear All Button */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
              <span>Clear all</span>
            </button>
          )}
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Display Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Media Player
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Display Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Store
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDisplays.map((display) => (
                <tr key={display.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Monitor className="w-5 h-5 text-gray-400" />
                      <div className="font-medium text-gray-900">{display.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {display.media_player?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm text-gray-900">{display.display_types?.name}</div>
                      <div className="text-xs text-gray-500">
                        {display.display_types?.specifications?.resolution}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    Position {display.position}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {display.media_player?.stores?.name || 'Unassigned'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(display.status)}`}>
                      {display.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(display)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(display)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredDisplays.length === 0 && (
            <div className="text-center py-12">
              <Monitor className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No displays found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {hasActiveFilters ? 'Try adjusting your filters' : 'Get started by adding a new display'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedDisplays).map(([typeName, typeDisplays]) => (
            <div key={typeName} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {typeName} ({typeDisplays.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {typeDisplays.map((display) => (
                  <div key={display.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-5 h-5 text-gray-400" />
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(display.status)}`}>
                          {display.status}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenModal(display)}
                          className="p-1 text-gray-600 hover:text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(display)}
                          className="p-1 text-gray-600 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">{display.name}</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Player: {display.media_player?.name}</div>
                      <div>Position: {display.position}</div>
                      <div>Store: {display.media_player?.stores?.name || 'Unassigned'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(groupedDisplays).length === 0 && (
            <div className="bg-white rounded-lg shadow text-center py-12">
              <Monitor className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No displays found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {hasActiveFilters ? 'Try adjusting your filters' : 'Get started by adding a new display'}
              </p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingDisplay ? 'Edit Display' : 'Add Display'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Front Counter Display"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Media Player *
                </label>
                <select
                  value={formData.media_player_id}
                  onChange={(e) => setFormData({ ...formData, media_player_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select media player</option>
                  {mediaPlayers.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name} {player.stores ? `- ${player.stores.name}` : ''} ({player.display_count || 0}/2 displays)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Each media player can have up to 2 displays
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Type *
                </label>
                <select
                  value={formData.display_type_id}
                  onChange={(e) => setFormData({ ...formData, display_type_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select display type</option>
                  {displayTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name} - {type.specifications?.resolution}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position *
                </label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="1">Position 1</option>
                  <option value="2">Position 2</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  For dual-display setups
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingDisplay ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
