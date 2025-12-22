import { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown } from 'lucide-react';

interface TimeSelectorProps {
  value: string;
  onChange: (time: string) => void;
  label: string;
}

const generateTimeOptions = () => {
  const times: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      times.push(timeStr);
    }
  }
  return times;
};

const formatDisplayTime = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
};

export default function TimeSelector({ value, onChange, label }: TimeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeOptions = generateTimeOptions();

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleSelectTime = (time: string) => {
    setInputValue(time);
    onChange(time);
    setIsOpen(false);
  };

  const scrollToCurrentTime = (container: HTMLDivElement) => {
    const selectedItem = container.querySelector('[data-selected="true"]');
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        <Clock className="w-4 h-4 inline mr-1" />
        {label}
      </label>

      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder="HH:MM"
          className="w-full pl-3 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono text-base"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded transition-colors"
        >
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden"
          ref={(el) => el && scrollToCurrentTime(el)}
        >
          <div className="max-h-64 overflow-y-auto">
            <div className="p-2 bg-slate-50 border-b border-slate-200 sticky top-0">
              <p className="text-xs text-slate-600 text-center">Select or type exact time</p>
            </div>
            <div className="py-1">
              {timeOptions.map((time) => {
                const isSelected = time === value;
                const [hours] = time.split(':').map(Number);
                const isHourMark = time.endsWith(':00');

                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleSelectTime(time)}
                    data-selected={isSelected}
                    className={`w-full px-4 py-2 text-left flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-amber-100 text-amber-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    } ${isHourMark ? 'border-t border-slate-100' : ''}`}
                  >
                    <span className="font-mono text-sm">{time}</span>
                    <span className={`text-sm ${isSelected ? 'text-amber-700' : 'text-slate-500'}`}>
                      {formatDisplayTime(time)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
