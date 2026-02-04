import { useState } from 'react';
import { Monitor, Cpu, Tag } from 'lucide-react';
import HardwareDevicesManagement from './HardwareDevicesManagement';
import SignageManagement from './SignageManagement';
import ShelfLabelManagement from './ShelfLabelManagement';

type Tab = 'signage' | 'labels' | 'hardware';

export default function DevicesDisplaysDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('signage');

  const tabs = [
    { id: 'signage' as Tab, name: 'Signage Players', icon: Monitor },
    { id: 'labels' as Tab, name: 'Shelf Labels', icon: Tag },
    { id: 'hardware' as Tab, name: 'Hardware Devices', icon: Cpu }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="px-6">
          <div className="py-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Devices & Displays</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Create and manage digital signage players, electronic shelf labels, and hardware devices</p>
          </div>
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {activeTab === 'signage' && <SignageManagement />}
        {activeTab === 'labels' && <ShelfLabelManagement />}
        {activeTab === 'hardware' && <HardwareDevicesManagement />}
      </div>
    </div>
  );
}
