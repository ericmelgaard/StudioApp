import React, { useState, useMemo } from 'react';
import { X, Search, Check } from 'lucide-react';

interface Language {
  locale: string;
  name: string;
  region: string;
}

const AVAILABLE_LANGUAGES: Language[] = [
  { locale: 'en', name: 'English', region: 'North America' },
  { locale: 'en-us', name: 'English (United States)', region: 'North America' },
  { locale: 'en-ca', name: 'English (Canada)', region: 'North America' },
  { locale: 'en-gb', name: 'English (United Kingdom)', region: 'Europe' },
  { locale: 'fr', name: 'French', region: 'Europe' },
  { locale: 'fr-ca', name: 'French (Canada)', region: 'North America' },
  { locale: 'fr-fr', name: 'French (France)', region: 'Europe' },
  { locale: 'es', name: 'Spanish', region: 'Europe' },
  { locale: 'es-mx', name: 'Spanish (Mexico)', region: 'North America' },
  { locale: 'es-es', name: 'Spanish (Spain)', region: 'Europe' },
  { locale: 'pt', name: 'Portuguese', region: 'South America' },
  { locale: 'pt-br', name: 'Portuguese (Brazil)', region: 'South America' },
  { locale: 'pt-pt', name: 'Portuguese (Portugal)', region: 'Europe' },
  { locale: 'de', name: 'German', region: 'Europe' },
  { locale: 'it', name: 'Italian', region: 'Europe' },
  { locale: 'nl', name: 'Dutch', region: 'Europe' },
  { locale: 'pl', name: 'Polish', region: 'Europe' },
  { locale: 'ru', name: 'Russian', region: 'Europe' },
  { locale: 'uk', name: 'Ukrainian', region: 'Europe' },
  { locale: 'cs', name: 'Czech', region: 'Europe' },
  { locale: 'da', name: 'Danish', region: 'Europe' },
  { locale: 'fi', name: 'Finnish', region: 'Europe' },
  { locale: 'no', name: 'Norwegian', region: 'Europe' },
  { locale: 'sv', name: 'Swedish', region: 'Europe' },
  { locale: 'el', name: 'Greek', region: 'Europe' },
  { locale: 'tr', name: 'Turkish', region: 'Europe' },
  { locale: 'hu', name: 'Hungarian', region: 'Europe' },
  { locale: 'ro', name: 'Romanian', region: 'Europe' },
  { locale: 'zh', name: 'Chinese', region: 'Asia' },
  { locale: 'zh-cn', name: 'Chinese (Simplified)', region: 'Asia' },
  { locale: 'zh-tw', name: 'Chinese (Traditional)', region: 'Asia' },
  { locale: 'ja', name: 'Japanese', region: 'Asia' },
  { locale: 'ko', name: 'Korean', region: 'Asia' },
  { locale: 'vi', name: 'Vietnamese', region: 'Asia' },
  { locale: 'th', name: 'Thai', region: 'Asia' },
  { locale: 'id', name: 'Indonesian', region: 'Asia' },
  { locale: 'ms', name: 'Malay', region: 'Asia' },
  { locale: 'tl', name: 'Tagalog', region: 'Asia' },
  { locale: 'hi', name: 'Hindi', region: 'Asia' },
  { locale: 'bn', name: 'Bengali', region: 'Asia' },
  { locale: 'ar', name: 'Arabic', region: 'Middle East' },
  { locale: 'he', name: 'Hebrew', region: 'Middle East' },
  { locale: 'fa', name: 'Persian', region: 'Middle East' },
  { locale: 'ur', name: 'Urdu', region: 'Middle East' },
  { locale: 'sw', name: 'Swahili', region: 'Africa' },
  { locale: 'af', name: 'Afrikaans', region: 'Africa' },
  { locale: 'zu', name: 'Zulu', region: 'Africa' },
  { locale: 'am', name: 'Amharic', region: 'Africa' },
];

interface LanguagePickerModalProps {
  existingLanguages: string[];
  onClose: () => void;
  onAdd: (languages: { locale: string; locale_name: string }[]) => void;
}

export default function LanguagePickerModal({ existingLanguages, onClose, onAdd }: LanguagePickerModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocales, setSelectedLocales] = useState<Set<string>>(new Set());

  const filteredLanguages = useMemo(() => {
    const filtered = AVAILABLE_LANGUAGES.filter(lang =>
      lang.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lang.locale.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const grouped: Record<string, Language[]> = {};
    filtered.forEach(lang => {
      if (!grouped[lang.region]) {
        grouped[lang.region] = [];
      }
      grouped[lang.region].push(lang);
    });

    return grouped;
  }, [searchTerm]);

  const toggleLanguage = (locale: string) => {
    const newSelected = new Set(selectedLocales);
    if (newSelected.has(locale)) {
      newSelected.delete(locale);
    } else {
      newSelected.add(locale);
    }
    setSelectedLocales(newSelected);
  };

  const handleAdd = () => {
    const languagesToAdd = Array.from(selectedLocales).map(locale => {
      const lang = AVAILABLE_LANGUAGES.find(l => l.locale === locale);
      return {
        locale,
        locale_name: lang?.name || locale
      };
    });
    onAdd(languagesToAdd);
    onClose();
  };

  const regionOrder = ['North America', 'South America', 'Europe', 'Asia', 'Middle East', 'Africa', 'Oceania'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Add Languages</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search languages..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {regionOrder.map(region => {
            const languages = filteredLanguages[region];
            if (!languages || languages.length === 0) return null;

            return (
              <div key={region} className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">{region}</h3>
                <div className="space-y-2">
                  {languages.map(lang => {
                    const isExisting = existingLanguages.includes(lang.locale);
                    const isSelected = selectedLocales.has(lang.locale);

                    return (
                      <button
                        key={lang.locale}
                        onClick={() => !isExisting && toggleLanguage(lang.locale)}
                        disabled={isExisting}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                          isExisting
                            ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-50'
                            : isSelected
                            ? 'bg-blue-50 border-blue-300 hover:bg-blue-100'
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isSelected && !isExisting && (
                            <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                              <Check size={14} className="text-white" />
                            </div>
                          )}
                          {!isSelected && !isExisting && (
                            <div className="w-5 h-5 border-2 border-gray-300 rounded" />
                          )}
                          <div className="text-left">
                            <div className="font-medium text-gray-900">{lang.name}</div>
                            <div className="text-sm text-gray-500">{lang.locale}</div>
                          </div>
                        </div>
                        {isExisting && (
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <Check size={14} />
                            Added
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedLocales.size} language{selectedLocales.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={selectedLocales.size === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
