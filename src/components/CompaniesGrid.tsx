import React, { useState } from 'react';
import { Search, Edit, ArrowRight, Building2, MapPin, Phone, Mail } from 'lucide-react';

interface Company {
  id: string;
  concept_id: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  store_count?: number;
}

interface CompaniesGridProps {
  companies: Company[];
  onEdit: (company: Company) => void;
  onSelect: (company: Company) => void;
}

export default function CompaniesGrid({ companies, onEdit, onSelect }: CompaniesGridProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (company.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (company.city?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (company.state?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatAddress = (company: Company) => {
    const parts = [];
    if (company.city) parts.push(company.city);
    if (company.state) parts.push(company.state);
    return parts.join(', ') || 'No address';
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search companies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {filteredCompanies.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Building2 size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No companies found</p>
          <p className="text-sm mt-1">
            {searchTerm ? 'Try adjusting your search' : 'Click "Add Company" to get started'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stores
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCompanies.map((company) => (
                  <tr
                    key={company.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-100">
                          <Building2 size={20} className="text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{company.name}</div>
                          {company.description && (
                            <p className="text-sm text-gray-500 mt-1 max-w-xs truncate">
                              {company.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <MapPin size={16} className="flex-shrink-0 mt-0.5" />
                        <div>
                          {company.address && (
                            <div>{company.address}</div>
                          )}
                          <div>{formatAddress(company)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {company.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone size={14} className="flex-shrink-0" />
                            <span>{company.phone}</span>
                          </div>
                        )}
                        {company.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail size={14} className="flex-shrink-0" />
                            <span className="truncate max-w-[200px]">{company.email}</span>
                          </div>
                        )}
                        {!company.phone && !company.email && (
                          <span className="text-sm text-gray-400 italic">No contact info</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-lg font-semibold text-gray-900">
                        {company.store_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(company);
                          }}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit company"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => onSelect(company)}
                          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          View
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
