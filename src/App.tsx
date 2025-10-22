import { useState } from 'react';
import { UserRole } from './lib/supabase';
import RoleSelection from './components/RoleSelection';
import CreatorDashboard from './pages/CreatorDashboard';
import OperatorDashboard from './pages/OperatorDashboard';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
  };

  const handleBack = () => {
    setSelectedRole(null);
  };

  if (selectedRole === 'creator') {
    return <CreatorDashboard onBack={handleBack} />;
  }

  if (selectedRole === 'operator') {
    return <OperatorDashboard onBack={handleBack} />;
  }

  if (selectedRole === 'admin') {
    return <AdminDashboard onBack={handleBack} />;
  }

  return <RoleSelection onSelectRole={handleRoleSelect} />;
}

export default App;
