import { useEffect, useState } from 'react';
import { ArrowLeft, Monitor, Plus, Search, MoreVertical, Menu } from 'lucide-react';
import { supabase } from '../lib/supabase';
import OperatorMobileNav from '../components/OperatorMobileNav';

interface Signage {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'error';
  last_sync: string;
  content_id: string | null;
}

interface SignageManagementProps {
  onBack: () => void;
}

export default function SignageManagement({ onBack }: SignageManagementProps) {
  const [signageList, setSignageList] = useState<Signage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    loadSignage();
  }, []);

  const loadSignage = async () => {
    const { data, error } = await supabase
      .from('digital_signage')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading signage:', error);
      setLoading(false);
      return;
    }

    setSignageList(data || []);
    setLoading(false);
  };

  const filteredSignage = signageList.filter(
    (signage) =>
      signage.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      signage.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNavigate = (view: string) => {
    if (view === 'home') {
      onBack();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'offline':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'error':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <OperatorMobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        currentView="signage"
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
                <Monitor className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-bold text-slate-900">Digital Signage Management</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search signage..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:shadow-lg transition-all">
            <Plus className="w-5 h-5" />
            Add Signage
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-green-500" />
            <p className="mt-4 text-slate-600">Loading signage...</p>
          </div>
        ) : filteredSignage.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <Monitor className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No signage found</h3>
            <p className="text-slate-600 mb-6">
              {searchQuery ? 'Try adjusting your search' : 'Get started by adding your first digital signage display'}
            </p>
            {!searchQuery && (
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:shadow-lg transition-all">
                <Plus className="w-5 h-5" />
                Add Your First Signage
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSignage.map((signage) => (
              <div
                key={signage.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Monitor className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{signage.name}</h3>
                      <p className="text-sm text-slate-500">{signage.location}</p>
                    </div>
                  </div>
                  <button className="p-1 hover:bg-slate-100 rounded transition-colors">
                    <MoreVertical className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Status</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded border ${getStatusColor(signage.status)}`}>
                      {signage.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Last Sync</span>
                    <span className="text-sm text-slate-900">
                      {new Date(signage.last_sync).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Content ID</span>
                    <span className="text-sm text-slate-900 font-mono">
                      {signage.content_id || 'None'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                  <button className="flex-1 px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                    Configure
                  </button>
                  <button className="flex-1 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
