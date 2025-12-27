import { useState, lazy, Suspense } from 'react';
import { UserRole } from './lib/supabase';
import RoleSelection from './components/RoleSelection';
import AuthForm from './components/AuthForm';
import { useUser } from './hooks/useUser';

const CreatorDashboard = lazy(() => import('./pages/CreatorDashboard'));
const OperatorDashboard = lazy(() => import('./pages/OperatorDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-slate-600">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const { user, loading } = useUser(selectedRole);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setShowAuthForm(true);
  };

  const handleBack = () => {
    setSelectedRole(null);
    setShowAuthForm(false);
  };

  if (loading) {
    return <LoadingFallback />;
  }

  if (showAuthForm && !user && selectedRole) {
    return <AuthForm role={selectedRole} onBack={handleBack} />;
  }

  if (selectedRole === 'creator' && user) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <CreatorDashboard onBack={handleBack} user={user} />
      </Suspense>
    );
  }

  if (selectedRole === 'operator' && user) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <OperatorDashboard onBack={handleBack} user={user} />
      </Suspense>
    );
  }

  if (selectedRole === 'admin' && user) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <AdminDashboard onBack={handleBack} user={user} />
      </Suspense>
    );
  }

  return <RoleSelection onSelectRole={handleRoleSelect} />;
}

export default App;
