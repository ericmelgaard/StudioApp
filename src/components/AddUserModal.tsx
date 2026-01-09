import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

interface AddUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddUserModal({ onClose, onSuccess }: AddUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);

  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    role: 'creator',
    scopeLevel: 'concept',
    conceptId: '',
    companyId: '',
    storeId: '',
    selectedStores: [] as number[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadLocationData();
  }, []);

  useEffect(() => {
    if (formData.conceptId) {
      const filtered = companies.filter(c => c.concept_id === parseInt(formData.conceptId));
      setFilteredCompanies(filtered);
      if (formData.scopeLevel === 'company' && !filtered.find(c => c.id === parseInt(formData.companyId))) {
        setFormData(prev => ({ ...prev, companyId: '', storeId: '' }));
      }
    } else {
      setFilteredCompanies([]);
      setFormData(prev => ({ ...prev, companyId: '', storeId: '' }));
    }
  }, [formData.conceptId, companies]);

  useEffect(() => {
    if (formData.companyId) {
      const filtered = stores.filter(s => s.company_id === parseInt(formData.companyId));
      setFilteredStores(filtered);
      if (formData.scopeLevel === 'store' && !filtered.find(s => s.id === parseInt(formData.storeId))) {
        setFormData(prev => ({ ...prev, storeId: '' }));
      }
    } else {
      setFilteredStores([]);
      setFormData(prev => ({ ...prev, storeId: '' }));
    }
  }, [formData.companyId, stores]);

  const loadLocationData = async () => {
    try {
      const [conceptsRes, companiesRes, storesRes] = await Promise.all([
        supabase.from('concepts').select('id, name').order('name'),
        supabase.from('companies').select('id, name, concept_id').order('name'),
        supabase.from('stores').select('id, name, company_id').order('name'),
      ]);

      if (conceptsRes.data) setConcepts(conceptsRes.data);
      if (companiesRes.data) setCompanies(companiesRes.data);
      if (storesRes.data) setStores(storesRes.data);
    } catch (error) {
      console.error('Error loading location data:', error);
    }
  };

  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData(prev => ({ ...prev, password }));
    setShowPassword(true);
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

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.role !== 'admin') {
      if (formData.scopeLevel === 'concept' && !formData.conceptId) {
        newErrors.scopeLevel = 'Please select a concept';
      } else if (formData.scopeLevel === 'company' && !formData.companyId) {
        newErrors.scopeLevel = 'Please select a company';
      } else if (formData.scopeLevel === 'store' && !formData.storeId) {
        newErrors.scopeLevel = 'Please select a store';
      } else if (formData.scopeLevel === 'multi-store' && formData.selectedStores.length === 0) {
        newErrors.scopeLevel = 'Please select at least one store';
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
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const profileData: any = {
          id: authData.user.id,
          email: formData.email,
          role: formData.role,
          display_name: formData.displayName,
          status: 'active',
        };

        if (formData.role !== 'admin') {
          if (formData.scopeLevel === 'concept') {
            profileData.concept_id = parseInt(formData.conceptId);
          } else if (formData.scopeLevel === 'company') {
            const company = companies.find(c => c.id === parseInt(formData.companyId));
            profileData.concept_id = company?.concept_id;
            profileData.company_id = parseInt(formData.companyId);
          } else if (formData.scopeLevel === 'store') {
            const store = stores.find(s => s.id === parseInt(formData.storeId));
            const company = companies.find(c => c.id === store?.company_id);
            profileData.concept_id = company?.concept_id;
            profileData.company_id = store?.company_id;
            profileData.store_id = parseInt(formData.storeId);
          }
        }

        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert(profileData);

        if (profileError) throw profileError;

        if (formData.scopeLevel === 'multi-store' && formData.selectedStores.length > 0) {
          const storeAccessData = formData.selectedStores.map(storeId => ({
            user_id: authData.user.id,
            store_id: storeId
          }));

          const { error: accessError } = await supabase
            .from('user_store_access')
            .insert(storeAccessData);

          if (accessError) throw accessError;
        }

        onSuccess();
        onClose();
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      setErrors({ submit: error.message || 'Failed to create user' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Add New User</h2>
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
              Password *
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.password ? 'border-red-300' : 'border-slate-300'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={generatePassword}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
              >
                Generate
              </button>
            </div>
            {errors.password && (
              <p className="text-red-600 text-sm mt-1">{errors.password}</p>
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

          {formData.role !== 'admin' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Access Scope Level *
                </label>
                <select
                  value={formData.scopeLevel}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    scopeLevel: e.target.value,
                    conceptId: '',
                    companyId: '',
                    storeId: '',
                    selectedStores: [],
                  }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="concept">Concept (all locations in concept)</option>
                  <option value="company">Company (all stores in company)</option>
                  <option value="store">Store (single location)</option>
                  {formData.role === 'operator' && (
                    <option value="multi-store">Multiple Stores (operator only)</option>
                  )}
                </select>
              </div>

              <div className="space-y-3">
                {formData.scopeLevel !== 'multi-store' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Concept *
                    </label>
                    <select
                      value={formData.conceptId}
                      onChange={(e) => setFormData(prev => ({ ...prev, conceptId: e.target.value }))}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.scopeLevel ? 'border-red-300' : 'border-slate-300'
                      }`}
                    >
                      <option value="">Select a concept...</option>
                      {concepts.map(concept => (
                        <option key={concept.id} value={concept.id}>
                          {concept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.scopeLevel === 'multi-store' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Select Stores * (operator can access these stores)
                    </label>
                    <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-300 rounded-lg p-3">
                      {concepts.map(concept => {
                        const conceptStores = stores.filter(s => {
                          const company = companies.find(c => c.id === s.company_id);
                          return company?.concept_id === concept.id;
                        });

                        if (conceptStores.length === 0) return null;

                        return (
                          <div key={concept.id} className="space-y-1">
                            <div className="font-medium text-sm text-slate-700 sticky top-0 bg-white py-1">
                              {concept.name}
                            </div>
                            {conceptStores.map(store => {
                              const company = companies.find(c => c.id === store.company_id);
                              return (
                                <label key={store.id} className="flex items-center gap-2 pl-4 py-1 hover:bg-slate-50 rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.selectedStores.includes(store.id)}
                                    onChange={(e) => {
                                      setFormData(prev => ({
                                        ...prev,
                                        selectedStores: e.target.checked
                                          ? [...prev.selectedStores, store.id]
                                          : prev.selectedStores.filter(id => id !== store.id)
                                      }));
                                    }}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-slate-700">
                                    {store.name}
                                    <span className="text-xs text-slate-500 ml-1">({company?.name})</span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                    {formData.selectedStores.length > 0 && (
                      <p className="text-sm text-slate-600 mt-2">
                        {formData.selectedStores.length} store(s) selected
                      </p>
                    )}
                  </div>
                )}

                {(formData.scopeLevel === 'company' || formData.scopeLevel === 'store') && formData.conceptId && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Company *
                    </label>
                    <select
                      value={formData.companyId}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyId: e.target.value }))}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.scopeLevel ? 'border-red-300' : 'border-slate-300'
                      }`}
                      disabled={!formData.conceptId}
                    >
                      <option value="">Select a company...</option>
                      {filteredCompanies.map(company => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.scopeLevel === 'store' && formData.companyId && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Store *
                    </label>
                    <select
                      value={formData.storeId}
                      onChange={(e) => setFormData(prev => ({ ...prev, storeId: e.target.value }))}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.scopeLevel ? 'border-red-300' : 'border-slate-300'
                      }`}
                      disabled={!formData.companyId}
                    >
                      <option value="">Select a store...</option>
                      {filteredStores.map(store => (
                        <option key={store.id} value={store.id}>
                          {store.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {errors.scopeLevel && (
                  <p className="text-red-600 text-sm">{errors.scopeLevel}</p>
                )}
              </div>
            </>
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
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
