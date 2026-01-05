import { useEffect, useState } from 'react';
import { ArrowLeft, Tag, Plus, Search, Cpu, Layers, RefreshCw, Menu } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LabelPositionWithDevice } from '../types/labels';
import AddPositionModal from '../components/AddPositionModal';
import BulkAddPositionsModal from '../components/BulkAddPositionsModal';
import HardwareDevicesModal from '../components/HardwareDevicesModal';
import OperatorMobileNav from '../components/OperatorMobileNav';

interface ShelfLabelManagementProps {
  onBack: () => void;
}

export default function ShelfLabelManagement({ onBack }: ShelfLabelManagementProps) {
  const [positions, setPositions] = useState<LabelPositionWithDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [showHardwareModal, setShowHardwareModal] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    loadPositions();
  }, []);

  const loadPositions = async () => {
    const { data, error } = await supabase
      .from('label_positions')
      .select(`
        *,
        hardware_device:hardware_devices(*)
      `)
      .order('position_id');

    if (error) {
      console.error('Error loading positions:', error);
      setLoading(false);
      return;
    }

    setPositions(data || []);
    setLoading(false);
  };

  const handleAutoAssign = async () => {
    setAssigning(true);

    const { error } = await supabase.rpc('auto_assign_hardware_to_positions');

    if (error) {
      console.error('Auto-assignment error:', error);
    }

    await loadPositions();
    setAssigning(false);
  };

  const handleNavigate = (view: string) => {
    if (view === 'home') {
      onBack();
    }
  };

  const filteredPositions = positions.filter(
    (position) =>
      position.position_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      position.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      position.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pending':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'error':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'unassigned':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const stats = {
    total: positions.length,
    active: positions.filter(p => p.status === 'active').length,
    unassigned: positions.filter(p => p.status === 'unassigned').length,
    error: positions.filter(p => p.status === 'error').length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <OperatorMobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        currentView="labels"
        onNavigate={handleNavigate}
        userRole="Store Operator"
      />

      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors touch-manipulation"
              aria-label="Open navigation menu"
            >
              <Menu className="w-6 h-6 text-slate-700" />
            </button>
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                <Tag className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-bold text-slate-900">Electronic Shelf Labels</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-white rounded-lg shadow-sm border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Total Positions</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-700 mb-1">Active</p>
            <p className="text-2xl font-bold text-green-900">{stats.active}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-700 mb-1">Unassigned</p>
            <p className="text-2xl font-bold text-slate-900">{stats.unassigned}</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-700 mb-1">Errors</p>
            <p className="text-2xl font-bold text-red-900">{stats.error}</p>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search positions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowHardwareModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Cpu className="w-5 h-5" />
              Hardware Devices
            </button>
            <button
              onClick={handleAutoAssign}
              disabled={assigning || stats.unassigned === 0}
              className="flex items-center gap-2 px-4 py-2 border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-5 h-5 ${assigning ? 'animate-spin' : ''}`} />
              Auto-Assign
            </button>
            <button
              onClick={() => setShowBulkAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Layers className="w-5 h-5" />
              Bulk Add
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Position
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-green-500" />
            <p className="mt-4 text-slate-600">Loading positions...</p>
          </div>
        ) : filteredPositions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <Tag className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No positions found</h3>
            <p className="text-slate-600 mb-6">
              {searchQuery ? 'Try adjusting your search' : 'Get started by adding your first label position'}
            </p>
            {!searchQuery && (
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Add Single Position
                </button>
                <button
                  onClick={() => setShowBulkAddModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Layers className="w-5 h-5" />
                  Bulk Add Positions
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Position ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Placement Group
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Hardware Device
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPositions.map((position) => (
                    <tr key={position.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono font-medium text-slate-900">
                          {position.position_id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{position.product_name}</p>
                          {position.product_sku && (
                            <p className="text-xs text-slate-500">{position.product_sku}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-slate-900">
                          ${position.price.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-600">{position.location}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {position.hardware_device ? (
                          <div className="flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-900 font-mono">
                              {position.hardware_device.device_id}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 italic">Not assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-xs font-medium px-2 py-1 rounded border ${getStatusColor(position.status)}`}>
                          {position.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {showAddModal && (
        <AddPositionModal
          onClose={() => setShowAddModal(false)}
          onSuccess={loadPositions}
        />
      )}

      {showBulkAddModal && (
        <BulkAddPositionsModal
          onClose={() => setShowBulkAddModal(false)}
          onSuccess={loadPositions}
        />
      )}

      {showHardwareModal && (
        <HardwareDevicesModal onClose={() => setShowHardwareModal(false)} />
      )}
    </div>
  );
}
