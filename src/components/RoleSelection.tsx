import { UserRole } from '../lib/supabase';
import { Users, Settings, Shield } from 'lucide-react';

interface RoleSelectionProps {
  onSelectRole: (role: UserRole) => void;
}

const roles = [
  {
    id: 'creator' as UserRole,
    title: 'Creator',
    description: 'Create and manage content',
    scope: 'Auntie Anne\'s (341 stores)',
    icon: Users,
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: 'operator' as UserRole,
    title: 'Operator',
    description: 'Operate and monitor systems',
    scope: 'American Airlines Lounges (29 stores)',
    icon: Settings,
    color: 'from-green-500 to-green-600',
  },
  {
    id: 'admin' as UserRole,
    title: 'Admin',
    description: 'Full system administration',
    scope: 'All locations (unrestricted)',
    icon: Shield,
    color: 'from-red-500 to-red-600',
  },
];

export default function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Welcome Back
          </h1>
          <p className="text-slate-600 text-lg">
            Select your role to continue
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.id}
                onClick={() => onSelectRole(role.id)}
                className="group relative bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-slate-200"
              >
                <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${role.color} mb-6 shadow-md group-hover:shadow-lg transition-shadow`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  {role.title}
                </h2>
                <p className="text-slate-600 leading-relaxed mb-3">
                  {role.description}
                </p>
                <p className="text-sm text-slate-500 font-medium">
                  {role.scope}
                </p>

                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent to-slate-50 opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              </button>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">
            Having trouble? Contact your administrator
          </p>
        </div>
      </div>
    </div>
  );
}
