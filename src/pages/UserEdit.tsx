import { useState, useEffect, useRef, useCallback } from 'react';
import { User, Shield, Activity, Settings as SettingsIcon, Loader2, AlertTriangle, Check, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Breadcrumb from '../components/Breadcrumb';
import { AccessSelection } from '../hooks/useAccessConfiguration';
import { AccessConfigurationModal } from '../components/AccessConfigurationModal';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  display_name: string;
  concept_id: number | null;
  company_id: number | null;
  store_id: number | null;
  status: string;
  last_login_at?: string | null;
  created_at: string;
}

interface UserEditProps {
  userId: string;
  onBack: () => void;
  onSuccess: () => void;
}

export default function UserEdit({ userId, onBack, onSuccess }: UserEditProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('details');
  const [hasChanges, setHasChanges] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const accessRef = useRef<HTMLDivElement>(null);
  const activityRef = useRef<HTMLDivElement>(null);
  const advancedRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    role: 'creator',
    status: 'active',
  });

  const [accessSelection, setAccessSelection] = useState<AccessSelection>({
    concepts: new Set(),
    companies: new Set(),
    stores: new Set()
  });

  const [initialAccessSelection, setInitialAccessSelection] = useState<AccessSelection>({
    concepts: new Set(),
    companies: new Set(),
    stores: new Set()
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showRoleWarning, setShowRoleWarning] = useState(false);
  const [showAccessWarning, setShowAccessWarning] = useState(false);
  const [showAccessConfigModal, setShowAccessConfigModal] = useState(false);
  const [modalKey, setModalKey] = useState(0);

  useEffect(() => {
    loadUserData();
  }, [userId]);

  useEffect(() => {
    if (user) {
      setShowRoleWarning(formData.role !== user.role);
    }
  }, [formData.role, user]);

  useEffect(() => {
    if (!user) return;

    const formChanged =
      formData.displayName !== user.display_name ||
      formData.email !== user.email ||
      formData.role !== user.role ||
      formData.status !== user.status;

    const accessChanged =
      accessSelection.concepts.size !== initialAccessSelection.concepts.size ||
      accessSelection.companies.size !== initialAccessSelection.companies.size ||
      accessSelection.stores.size !== initialAccessSelection.stores.size ||
      !areSetsEqual(accessSelection.concepts, initialAccessSelection.concepts) ||
      !areSetsEqual(accessSelection.companies, initialAccessSelection.companies) ||
      !areSetsEqual(accessSelection.stores, initialAccessSelection.stores);

    setHasChanges(formChanged || accessChanged);
    setShowAccessWarning(accessChanged);
  }, [formData, accessSelection, user, initialAccessSelection]);

  const areSetsEqual = (set1: Set<number>, set2: Set<number>) => {
    if (set1.size !== set2.size) return false;
    for (const item of set1) {
      if (!set2.has(item)) return false;
    }
    return true;
  };

  const loadUserData = async () => {
    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;
      if (!userData) throw new Error('User not found');

      setUser(userData);
      setFormData({
        displayName: userData.display_name,
        email: userData.email,
        role: userData.role,
        status: userData.status,
      });

      // Load access configuration
      const [conceptAccess, companyAccess, storeAccess] = await Promise.all([
        supabase.from('user_concept_access').select('concept_id').eq('user_id', userId),
        supabase.from('user_company_access').select('company_id').eq('user_id', userId),
        supabase.from('user_store_access').select('store_id').eq('user_id', userId),
      ]);

      const access: AccessSelection = {
        concepts: new Set(conceptAccess.data?.map(a => a.concept_id) || []),
        companies: new Set(companyAccess.data?.map(a => a.company_id) || []),
        stores: new Set(storeAccess.data?.map(a => a.store_id) || []),
      };

      setAccessSelection(access);
      setInitialAccessSelection(access);
    } catch (error: any) {
      console.error('Error loading user:', error);
      setErrors({ load: error.message || 'Failed to load user' });
    } finally {
      setLoading(false);
    }
  };

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

  const handleSave = async () => {
    if (!validateForm() || !user) {
      return;
    }

    setSaving(true);

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

      // Update access configuration if not admin
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
    } catch (error: any) {
      console.error('Error updating user:', error);
      setErrors({ submit: error.message || 'Failed to update user' });
    } finally {
      setSaving(false);
    }
  };

  const getSections = () => {
    return [
      { id: 'details', label: 'User Details', icon: User },
      { id: 'access', label: 'Access Configuration', icon: Shield },
      { id: 'activity', label: 'Activity & Audit', icon: Activity },
      { id: 'advanced', label: 'Advanced Settings', icon: SettingsIcon }
    ];
  };

  const scrollToSection = (sectionId: string) => {
    const refs: Record<string, React.RefObject<HTMLDivElement>> = {
      details: detailsRef,
      access: accessRef,
      activity: activityRef,
      advanced: advancedRef
    };

    const ref = refs[sectionId];
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Intersection observer to track active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-section');
            if (id) setActiveSection(id);
          }
        });
      },
      { threshold: 0.3, rootMargin: '-100px 0px -50% 0px' }
    );

    const refs = [detailsRef, accessRef, activityRef, advancedRef];
    refs.forEach((ref) => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, []);

  const getBreadcrumbItems = () => {
    return [
      { label: 'Users', onClick: onBack },
      { label: user ? `Edit: ${user.display_name}` : 'Edit User' }
    ];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-700">User not found</p>
            <button
              onClick={onBack}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Users
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1800px] mx-auto h-screen flex flex-col">
        <div className="px-4 py-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-[#00adf0] to-[#0099d6] rounded-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Edit User</h1>
                <Breadcrumb items={getBreadcrumbItems()} />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onBack}
                disabled={saving}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-6 flex-1 px-4 pb-4 overflow-hidden">
          <aside className="w-56 flex-shrink-0">
            <div className="sticky top-4 bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-900 mb-2 uppercase tracking-wide px-2">
                Sections
              </h3>
              <nav className="space-y-0.5">
                {getSections().map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium transition-all ${
                        activeSection === section.id
                          ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600 -ml-px pl-1.5'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-left">{section.label}</span>
                    </button>
                  );
                })}
              </nav>
              {hasChanges && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="px-2 py-1.5 bg-amber-50 rounded-md">
                    <p className="text-xs text-amber-700 font-medium">Unsaved changes</p>
                  </div>
                </div>
              )}
            </div>
          </aside>

          <div ref={contentRef} className="flex-1 overflow-y-auto">
            <div className="space-y-6">
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm">{errors.submit}</p>
                </div>
              )}

              {(showRoleWarning || showAccessWarning) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
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

              <div ref={detailsRef} data-section="details" className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">User Details</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Basic information and account settings
                  </p>
                </div>
                <div className="p-6 space-y-5">
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

                  <div className="grid grid-cols-2 gap-5">
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
                  </div>
                </div>
              </div>

              <div ref={accessRef} data-section="access" className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">Access Configuration</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    {formData.role === 'admin'
                      ? 'Admin users have unrestricted access to all locations'
                      : 'Configure which concepts, companies, and stores this user can access'
                    }
                  </p>
                </div>
                <div className="p-6">
                  {formData.role === 'admin' ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                      <Shield className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                      <p className="text-blue-900 font-medium mb-1">Unrestricted Access</p>
                      <p className="text-blue-700 text-sm">
                        This user has admin privileges and can access all locations
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-slate-900">Access Summary</h3>
                          {(accessSelection.concepts.size + accessSelection.companies.size + accessSelection.stores.size > 0) && (
                            <button
                              onClick={() => setAccessSelection({
                                concepts: new Set(),
                                companies: new Set(),
                                stores: new Set()
                              })}
                              className="text-xs text-red-600 hover:text-red-700 font-medium"
                            >
                              Clear All
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-white border border-slate-200 rounded-lg p-3">
                            <p className="text-xs text-slate-500 mb-1">Concepts</p>
                            <p className="text-2xl font-bold text-slate-900">{accessSelection.concepts.size}</p>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-lg p-3">
                            <p className="text-xs text-slate-500 mb-1">Companies</p>
                            <p className="text-2xl font-bold text-slate-900">{accessSelection.companies.size}</p>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-lg p-3">
                            <p className="text-xs text-slate-500 mb-1">Stores</p>
                            <p className="text-2xl font-bold text-slate-900">{accessSelection.stores.size}</p>
                          </div>
                        </div>
                        {(accessSelection.concepts.size + accessSelection.companies.size + accessSelection.stores.size === 0) && (
                          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-amber-900">No access selected</p>
                              <p className="text-xs text-amber-700 mt-0.5">
                                Select at least one location to grant access
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {errors.access && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-red-600 text-sm">{errors.access}</p>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setModalKey(prev => prev + 1);
                          setShowAccessConfigModal(true);
                        }}
                        className="w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Settings className="w-5 h-5" />
                        <span className="font-medium">Configure Access</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div ref={activityRef} data-section="activity" className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">Activity & Audit</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    User activity history and account timeline
                  </p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                        Account Created
                      </label>
                      <p className="text-slate-900">
                        {new Date(user.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                        Last Login
                      </label>
                      <p className="text-slate-900">
                        {user.last_login_at
                          ? new Date(user.last_login_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Never'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Activity Log</h3>
                    <div className="bg-slate-50 rounded-lg p-8 text-center">
                      <Activity className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-600">Activity log will appear here</p>
                    </div>
                  </div>
                </div>
              </div>

              <div ref={advancedRef} data-section="advanced" className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">Advanced Settings</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Additional configuration and preferences
                  </p>
                </div>
                <div className="p-6">
                  <div className="bg-slate-50 rounded-lg p-8 text-center">
                    <SettingsIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600">Advanced settings will appear here</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AccessConfigurationModal
        key={modalKey}
        isOpen={showAccessConfigModal}
        onClose={() => setShowAccessConfigModal(false)}
        userId={userId}
        userName={formData.displayName}
        onSave={async (selection) => {
          setAccessSelection(selection);
          setShowAccessWarning(true);
          setShowAccessConfigModal(false);
        }}
      />
    </div>
  );
}
