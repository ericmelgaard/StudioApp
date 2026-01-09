import { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AccessConfigurationModal } from './AccessConfigurationModal';
import { AccessSelection } from '../hooks/useAccessConfiguration';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  display_name: string;
  concept_id: number | null;
  company_id: number | null;
  store_id: number | null;
  status: string;
}

interface Concept {
  id: number;
  name: string;
}

interface Company {
  id: number;
  name: string;
  concept_id: number;
}

interface Store {
  id: number;
  name: string;
  company_id: number;
}

interface EditUserModalProps {
  user: UserProfile;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditUserModal({ user, onClose, onSuccess }: EditUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [showAccessConfig, setShowAccessConfig] = useState(false);
  const [accessSelection, setAccessSelection] = useState<AccessSelection>({
    concepts: new Set(),
    companies: new Set(),
    stores: new Set()
  });
  const [showRoleWarning, setShowRoleWarning] = useState(false);
  const [showAccessWarning, setShowAccessWarning] = useState(false);

  const [formData, setFormData] = useState({
    displayName: user.display_name,
    email: user.email,
    role: user.role,
    status: user.status,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setShowRoleWarning(formData.role !== user.role);
  }, [formData.role, user.role]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.role !== 'admin') {
      const totalAccess = accessSelection.concepts.size + accessSelection.companies.size + accessSelection.stores.size;
      if (totalAccess === 0) {
        newErrors.access = 'Please configure access for this user';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const updateData: any = {
        display_name: formData.displayName,
        email: formData.email,
        role: formData.role,
        status: formData.status,
      };

      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      if (formData.role !== 'admin') {
        await supabase.from('user_concept_access').delete().eq('user_id', user.id);
        await supabase.from('user_company_access').delete().eq('user_id', user.id);
        await supabase.from('user_store_access').delete().eq('user_id', user.id);

        const conceptInserts = Array.from(accessSelection.concepts).map(concept_id => ({
          user_id: user.id,
          concept_id
        }));

        const companyInserts = Array.from(accessSelection.companies).map(company_id => ({
          user_id: user.id,
          company_id
        }));

        const storeInserts = Array.from(accessSelection.stores).map(store_id => ({
          user_id: user.id,
          store_id
        }));

        if (conceptInserts.length > 0) {
          const { error } = await supabase.from('user_concept_access').insert(conceptInserts);
          if (error) throw error;
        }

        if (companyInserts.length > 0) {
          const { error } = await supabase.from('user_company_access').insert(companyInserts);
          if (error) throw error;
        }

        if (storeInserts.length > 0) {
          const { error } = await supabase.from('user_store_access').insert(storeInserts);
          if (error) throw error;
        }
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating user:', error);
      setErrors({ submit: error.message || 'Failed to update user' });
    } finally {
      setLoading(false);
    }
  };

  const getAccessSummary = () => {
    const totalAccess = accessSelection.concepts.size + accessSelection.companies.size + accessSelection.stores.size;
    if (totalAccess === 0) return 'No access configured';

    const parts = [];
    if (accessSelection.concepts.size > 0) {
      parts.push(`${accessSelection.concepts.size} concept${accessSelection.concepts.size === 1 ? '' : 's'}`);
    }
    if (accessSelection.companies.size > 0) {
      parts.push(`${accessSelection.companies.size} compan${accessSelection.companies.size === 1 ? 'y' : 'ies'}`);
    }
    if (accessSelection.stores.size > 0) {
      parts.push(`${accessSelection.stores.size} store${accessSelection.stores.size === 1 ? '' : 's'}`);
    }

    return parts.join(', ');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Edit User</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{errors.submit}</p>
            </div>
          )}

          {(showRoleWarning || showAccessWarning) && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900 mb-1">Warning: Permission Changes</p>
                <ul className="text-sm text-yellow-800 space-y-1">
                  {showRoleWarning && (
                    <li>• Changing the user's role will modify their system permissions</li>
                  )}
                  {showAccessWarning && (
                    <li>• Changing the access configuration will affect which data they can access</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Display Name *
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.displayName ? 'border-red-300' : 'border-slate-300'
              }`}
              placeholder="John Doe"
            />
            {errors.displayName && (
              <p className="text-red-600 text-sm mt-1">{errors.displayName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? 'border-red-300' : 'border-slate-300'
              }`}
              placeholder="john@example.com"
            />
            {errors.email && (
              <p className="text-red-600 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Role *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="creator">Creator</option>
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {formData.role !== 'admin' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Access Configuration *
              </label>
              <button
                type="button"
                onClick={() => setShowAccessConfig(true)}
                className={`w-full px-4 py-3 border rounded-lg text-left flex items-center justify-between transition-colors ${
                  errors.access ? 'border-red-300 bg-red-50' : 'border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {getAccessSummary()}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Click to configure user access
                    </p>
                  </div>
                </div>
                <div className="text-blue-600 text-sm font-medium">Configure</div>
              </button>
              {errors.access && (
                <p className="text-red-600 text-sm mt-1">{errors.access}</p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>

      <AccessConfigurationModal
        isOpen={showAccessConfig}
        onClose={() => setShowAccessConfig(false)}
        userId={user.id}
        userName={formData.displayName}
        onSave={async (selection) => {
          setAccessSelection(selection);
          setShowAccessWarning(true);
        }}
      />
    </div>
  );
}
