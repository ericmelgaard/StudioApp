import { Shield, ArrowLeft } from 'lucide-react';

interface AdminDashboardProps {
  onBack: () => void;
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Admin Dashboard</h1>
                <p className="text-xs text-slate-500">Demo Mode</p>
              </div>
            </div>
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Roles
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            System Administration
          </h2>
          <p className="text-slate-600 mb-6">
            This is your admin workspace. Future features will be added here.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 bg-red-50 rounded-lg border border-red-100">
              <h3 className="font-semibold text-red-900 mb-2">Users</h3>
              <p className="text-red-700 text-sm">Manage user accounts</p>
            </div>
            <div className="p-6 bg-red-50 rounded-lg border border-red-100">
              <h3 className="font-semibold text-red-900 mb-2">Permissions</h3>
              <p className="text-red-700 text-sm">Configure access control</p>
            </div>
            <div className="p-6 bg-red-50 rounded-lg border border-red-100">
              <h3 className="font-semibold text-red-900 mb-2">Settings</h3>
              <p className="text-red-700 text-sm">System configuration</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
