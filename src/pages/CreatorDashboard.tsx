import { Users, HelpCircle, FileText, ChevronDown, Store } from 'lucide-react';
import { useState } from 'react';
import NotificationPanel from '../components/NotificationPanel';
import UserMenu from '../components/UserMenu';

interface CreatorDashboardProps {
  onBack: () => void;
}

const STORE_LOCATIONS = [
  'Admiral Food Market - Portland, OR',
  'Admiral Food Market - Seattle, WA',
  'Admiral Food Market - San Francisco, CA',
  'Admiral Food Market - Los Angeles, CA',
  'Admiral Food Market - San Diego, CA',
  'Admiral Food Market - Denver, CO',
];

export default function CreatorDashboard({ onBack }: CreatorDashboardProps) {
  const [selectedStore, setSelectedStore] = useState(STORE_LOCATIONS[0]);

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-slate-900">WAND Digital</span>
                    <span className="text-slate-400">|</span>
                    <span className="text-base font-semibold text-slate-700">Studio</span>
                  </div>
                </div>
              </div>
              <div className="relative group">
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">
                  <Store className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-900 max-w-xs truncate">
                    {selectedStore}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>
                <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-lg border border-slate-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  {STORE_LOCATIONS.map((location) => (
                    <button
                      key={location}
                      onClick={() => setSelectedStore(location)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${
                        selectedStore === location ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                      }`}
                    >
                      {location}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Help"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              <button
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Documentation"
              >
                <FileText className="w-5 h-5" />
              </button>
              <NotificationPanel />
              <UserMenu role="creator" onBackToRoles={onBack} />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Content Creation Hub
          </h2>
          <p className="text-slate-600 mb-6">
            This is your creator workspace. Future features will be added here.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 bg-blue-50 rounded-lg border border-blue-100">
              <h3 className="font-semibold text-blue-900 mb-2">Projects</h3>
              <p className="text-blue-700 text-sm">Manage your content projects</p>
            </div>
            <div className="p-6 bg-blue-50 rounded-lg border border-blue-100">
              <h3 className="font-semibold text-blue-900 mb-2">Media</h3>
              <p className="text-blue-700 text-sm">Upload and organize media</p>
            </div>
            <div className="p-6 bg-blue-50 rounded-lg border border-blue-100">
              <h3 className="font-semibold text-blue-900 mb-2">Analytics</h3>
              <p className="text-blue-700 text-sm">View content performance</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
