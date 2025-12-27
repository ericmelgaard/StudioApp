import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Globe, Plus, GripVertical } from 'lucide-react';
import { supabase } from '../lib/supabase';
import LanguagePickerModal from './LanguagePickerModal';

interface Company {
  id: number;
  concept_id: number;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
}

interface CompanyModalProps {
  company?: Company | null;
  conceptId: number;
  onClose: () => void;
  onSave: () => void;
}

export default function CompanyModal({ company, conceptId, onClose, onSave }: CompanyModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [languages, setLanguages] = useState<Array<{ id?: string; locale: string; locale_name: string; sort_order: number }>>([]);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (company) {
      setName(company.name || '');
      setDescription(company.description || '');
      setAddress(company.address || '');
      setCity(company.city || '');
      setState(company.state || '');
      setZipCode(company.zip_code || '');
      setPhone(company.phone || '');
      setEmail(company.email || '');
      loadLanguages();
    } else {
      setLanguages([{ locale: 'en', locale_name: 'English', sort_order: 0 }]);
    }
  }, [company]);

  const loadLanguages = async () => {
    if (!company) return;

    const { data, error } = await supabase
      .from('company_languages')
      .select('*')
      .eq('company_id', company.id)
      .order('sort_order');

    if (error) {
      console.error('Error loading languages:', error);
      return;
    }

    if (data && data.length > 0) {
      setLanguages(data);
    } else {
      setLanguages([{ locale: 'en', locale_name: 'English', sort_order: 0 }]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const companyData = {
        concept_id: conceptId,
        name,
        description: description || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zip_code: zipCode || null,
        phone: phone || null,
        email: email || null
      };

      let companyId = company?.id;

      if (company) {
        const { error: updateError } = await supabase
          .from('companies')
          .update(companyData)
          .eq('id', company.id);

        if (updateError) throw updateError;
      } else {
        const { data: newCompany, error: insertError } = await supabase
          .from('companies')
          .insert([companyData])
          .select()
          .single();

        if (insertError) throw insertError;
        companyId = newCompany.id;
      }

      if (companyId) {
        await saveLanguages(companyId);
      }

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveLanguages = async (companyId: number) => {
    const { error: deleteError } = await supabase
      .from('company_languages')
      .delete()
      .eq('company_id', companyId);

    if (deleteError) throw deleteError;

    const languageData = languages.map((lang, index) => ({
      company_id: companyId,
      locale: lang.locale,
      locale_name: lang.locale_name,
      sort_order: index
    }));

    const { error: insertError } = await supabase
      .from('company_languages')
      .insert(languageData);

    if (insertError) throw insertError;
  };

  const handleDelete = async () => {
    if (!company) return;
    if (!confirm('Are you sure you want to delete this company? This will affect all related stores.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('companies')
        .delete()
        .eq('id', company.id);

      if (deleteError) throw deleteError;

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLanguages = (newLanguages: { locale: string; locale_name: string }[]) => {
    const updatedLanguages = [...languages];
    newLanguages.forEach(newLang => {
      if (!updatedLanguages.find(l => l.locale === newLang.locale)) {
        updatedLanguages.push({
          locale: newLang.locale,
          locale_name: newLang.locale_name,
          sort_order: updatedLanguages.length
        });
      }
    });
    setLanguages(updatedLanguages);
  };

  const handleRemoveLanguage = (locale: string) => {
    if (locale === 'en') {
      alert('English cannot be removed as it is the default language.');
      return;
    }
    setLanguages(languages.filter(l => l.locale !== locale));
  };

  const moveLanguage = (index: number, direction: 'up' | 'down') => {
    const newLanguages = [...languages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newLanguages.length) return;

    [newLanguages[index], newLanguages[targetIndex]] = [newLanguages[targetIndex], newLanguages[index]];
    setLanguages(newLanguages);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {company ? 'Edit Company' : 'Add New Company'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter company name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter company description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Street address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="State"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ZIP"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="contact@example.com"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Globe size={20} className="text-gray-700" />
                  <h3 className="text-sm font-medium text-gray-700">Languages</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLanguagePicker(true)}
                  className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  <Plus size={14} />
                  Add Language
                </button>
              </div>

              <div className="space-y-2">
                {languages.map((lang, index) => (
                  <div
                    key={lang.locale}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => moveLanguage(index, 'up')}
                          disabled={index === 0}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <GripVertical size={14} />
                        </button>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{lang.locale_name}</div>
                        <div className="text-xs text-gray-500">{lang.locale}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveLanguage(lang.locale)}
                      disabled={lang.locale === 'en'}
                      className={`text-sm px-3 py-1 rounded transition-colors ${
                        lang.locale === 'en'
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      {lang.locale === 'en' ? 'Default' : 'Remove'}
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500 mt-2">
                {languages.length} language{languages.length !== 1 ? 's' : ''} configured. English is the default language and cannot be removed.
              </p>
            </div>
          </div>
        </form>

        {showLanguagePicker && (
          <LanguagePickerModal
            existingLanguages={languages.map(l => l.locale)}
            onClose={() => setShowLanguagePicker(false)}
            onAdd={handleAddLanguages}
          />
        )}

        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div>
            {company && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 size={18} />
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !name}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
