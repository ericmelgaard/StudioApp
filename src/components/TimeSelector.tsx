import { useState, useRef, useEffect } from 'react';
import { Clock, Keyboard, ChevronDown } from 'lucide-react';

interface TimeSelectorProps {
  value: string;
  onChange: (time: string) => void;
  label: string;
  disabled?: boolean;
}

type SelectionMode = 'hour' | 'minute';

const formatDisplayTime = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
};

export default function TimeSelector({ value, onChange, label, disabled = false }: TimeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualHour, setManualHour] = useState('');
  const [manualMinute, setManualMinute] = useState('');
  const [manualPeriod, setManualPeriod] = useState<'AM' | 'PM'>('AM');
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('hour');

  const [hours, minutes] = value.split(':').map(Number);
  const [selectedHour, setSelectedHour] = useState(hours);
  const [selectedMinute, setSelectedMinute] = useState(minutes);
  const [isPM, setIsPM] = useState(hours >= 12);

  const clockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const [h, m] = value.split(':').map(Number);
      setSelectedHour(h);
      setSelectedMinute(m);
      setIsPM(h >= 12);
      setSelectionMode('hour');
      setManualMode(false);

      const display12Hour = h % 12 || 12;
      setManualHour(String(display12Hour));
      setManualMinute(String(m).padStart(2, '0'));
      setManualPeriod(h >= 12 ? 'PM' : 'AM');
    }
  }, [isOpen, value]);

  const handleClockClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!clockRef.current) return;

    const rect = clockRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = e.clientX - rect.left - centerX;
    const y = e.clientY - rect.top - centerY;

    let angle = Math.atan2(y, x) * (180 / Math.PI);
    angle = (angle + 90 + 360) % 360;

    if (selectionMode === 'hour') {
      const hour12 = Math.round(angle / 30) % 12;
      const hour24 = isPM ? (hour12 === 0 ? 12 : hour12) + 12 : hour12 === 0 ? 0 : hour12;
      setSelectedHour(hour24);
      setSelectionMode('minute');
    } else {
      const minute = Math.round(angle / 6) % 60;
      const roundedMinute = Math.round(minute / 15) * 15;
      setSelectedMinute(roundedMinute === 60 ? 0 : roundedMinute);
    }
  };

  const handleOK = () => {
    const timeStr = `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
    onChange(timeStr);
    setIsOpen(false);
  };

  const handleManualSubmit = () => {
    const hourNum = parseInt(manualHour, 10);
    const minuteNum = parseInt(manualMinute, 10);

    if (isNaN(hourNum) || isNaN(minuteNum) || hourNum < 1 || hourNum > 12 || minuteNum < 0 || minuteNum > 59) {
      return;
    }

    let hour24 = hourNum;
    if (manualPeriod === 'PM' && hourNum !== 12) {
      hour24 = hourNum + 12;
    } else if (manualPeriod === 'AM' && hourNum === 12) {
      hour24 = 0;
    }

    const timeStr = `${String(hour24).padStart(2, '0')}:${String(minuteNum).padStart(2, '0')}`;
    onChange(timeStr);
    setIsOpen(false);
  };

  const togglePeriod = (pm: boolean) => {
    setIsPM(pm);
    if (pm && selectedHour < 12) {
      setSelectedHour(selectedHour + 12);
    } else if (!pm && selectedHour >= 12) {
      setSelectedHour(selectedHour - 12);
    }
  };

  const getClockNumbers = () => {
    if (selectionMode === 'hour') {
      return Array.from({ length: 12 }, (_, i) => i === 0 ? 12 : i);
    } else {
      return [0, 15, 30, 45];
    }
  };

  const getSelectedAngle = () => {
    if (selectionMode === 'hour') {
      const hour12 = selectedHour % 12;
      return (hour12 * 30 - 90) * (Math.PI / 180);
    } else {
      return (selectedMinute * 6 - 90) * (Math.PI / 180);
    }
  };

  const displayHour = selectedHour % 12 || 12;
  const displayTime = `${displayHour}:${String(selectedMinute).padStart(2, '0')}`;

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-2">
        <Clock className="w-4 h-4 inline mr-1" />
        {label}
      </label>

      <button
        type="button"
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        className={`w-full px-3 py-2.5 border border-slate-300 rounded-lg font-mono text-base text-left transition-colors ${
          disabled
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : 'bg-white hover:bg-slate-50 focus:ring-2 focus:ring-slate-400 focus:border-transparent'
        }`}
      >
        {formatDisplayTime(value)}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-800 rounded-2xl shadow-2xl w-80 overflow-hidden">
            {!manualMode ? (
              <>
                <div className="bg-slate-600 p-6 text-white">
                  <div className="text-6xl font-light tracking-tight flex items-baseline justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectionMode('hour')}
                      className={`transition-opacity ${selectionMode === 'hour' ? 'opacity-100' : 'opacity-60'}`}
                    >
                      {String(displayHour).padStart(2, '0')}
                    </button>
                    <span>:</span>
                    <button
                      type="button"
                      onClick={() => setSelectionMode('minute')}
                      className={`transition-opacity ${selectionMode === 'minute' ? 'opacity-100' : 'opacity-60'}`}
                    >
                      {String(selectedMinute).padStart(2, '0')}
                    </button>
                  </div>
                  <div className="flex justify-center gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => togglePeriod(false)}
                      className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${
                        !isPM ? 'bg-white text-slate-800' : 'bg-slate-700 text-white hover:bg-slate-500'
                      }`}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePeriod(true)}
                      className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${
                        isPM ? 'bg-white text-slate-800' : 'bg-slate-700 text-white hover:bg-slate-500'
                      }`}
                    >
                      PM
                    </button>
                  </div>
                </div>

                <div className="p-8">
                  <div
                    ref={clockRef}
                    onClick={handleClockClick}
                    className="relative w-full aspect-square cursor-pointer"
                  >
                    <div className="absolute inset-0 rounded-full bg-slate-700">
                      {getClockNumbers().map((num, i) => {
                        const totalNumbers = selectionMode === 'hour' ? 12 : 4;
                        const angle = (i * 360 / totalNumbers - 90) * (Math.PI / 180);
                        const radius = 42;
                        const x = 50 + radius * Math.cos(angle);
                        const y = 50 + radius * Math.sin(angle);

                        const isSelected = selectionMode === 'hour'
                          ? num === displayHour
                          : num === selectedMinute;

                        return (
                          <div
                            key={num}
                            className={`absolute w-10 h-10 flex items-center justify-center rounded-full text-lg transition-colors ${
                              isSelected
                                ? 'text-white font-semibold'
                                : 'text-slate-300 hover:bg-slate-600'
                            }`}
                            style={{
                              left: `${x}%`,
                              top: `${y}%`,
                              transform: 'translate(-50%, -50%)',
                              backgroundColor: isSelected ? 'rgb(0, 173, 240)' : ''
                            }}
                          >
                            {selectionMode === 'minute' ? String(num).padStart(2, '0') : num}
                          </div>
                        );
                      })}

                      <div
                        className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 z-10"
                        style={{ backgroundColor: 'rgb(0, 173, 240)' }}
                      />

                      <div
                        className="absolute top-1/2 left-1/2 origin-left h-0.5 pointer-events-none"
                        style={{
                          width: '35%',
                          transform: `rotate(${getSelectedAngle()}rad)`,
                          transformOrigin: 'left center',
                          backgroundColor: 'rgb(0, 173, 240)'
                        }}
                      >
                        <div
                          className="absolute right-0 top-1/2 w-10 h-10 rounded-full -translate-y-1/2 translate-x-1/2 border-4 border-slate-800"
                          style={{ backgroundColor: 'rgb(0, 173, 240)' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border-t border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      setManualMode(true);
                    }}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Keyboard className="w-6 h-6 text-slate-300" />
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-6 py-2 hover:bg-slate-700 rounded-lg transition-colors font-medium"
                      style={{ color: 'rgb(0, 173, 240)' }}
                    >
                      CANCEL
                    </button>
                    <button
                      type="button"
                      onClick={handleOK}
                      className="px-6 py-2 hover:bg-slate-700 rounded-lg transition-colors font-medium"
                      style={{ color: 'rgb(0, 173, 240)' }}
                    >
                      OK
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-slate-700 p-6">
                  <div className="text-xl font-medium text-white">Set time</div>
                </div>

                <div className="p-6 bg-slate-700">
                  <div className="text-sm text-slate-400 mb-3">Type in time</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={manualHour}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 12)) {
                            setManualHour(val);
                          }
                        }}
                        placeholder="1"
                        className="w-full px-4 py-3 bg-slate-600 text-white text-4xl font-light text-center rounded-lg focus:ring-2 focus:outline-none border-b-2 border-transparent"
                        style={{
                          boxShadow: 'none'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderBottomColor = 'rgb(0, 173, 240)';
                          e.target.style.boxShadow = '0 0 0 2px rgb(0, 173, 240)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderBottomColor = 'transparent';
                          e.target.style.boxShadow = 'none';
                        }}
                        maxLength={2}
                        autoFocus
                      />
                      <div className="text-xs text-slate-400 text-center mt-1">hour</div>
                    </div>

                    <div className="text-4xl text-white font-light pb-5">:</div>

                    <div className="flex-1">
                      <input
                        type="text"
                        value={manualMinute}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (val === '') {
                            setManualMinute('');
                          } else if (val.length === 1) {
                            const num = parseInt(val);
                            if (num >= 0 && num <= 9) {
                              setManualMinute(val);
                            }
                          } else if (val.length === 2) {
                            const num = parseInt(val);
                            if (num >= 0 && num <= 59) {
                              setManualMinute(val);
                            }
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value && e.target.value.length === 1) {
                            setManualMinute(e.target.value.padStart(2, '0'));
                          }
                          e.target.style.boxShadow = 'none';
                        }}
                        onFocus={(e) => {
                          e.target.style.boxShadow = '0 0 0 2px rgb(0, 173, 240)';
                        }}
                        placeholder="00"
                        className="w-full px-4 py-3 bg-slate-600 text-white text-4xl font-light text-center rounded-lg focus:ring-2 focus:outline-none"
                        style={{
                          boxShadow: 'none'
                        }}
                        maxLength={2}
                      />
                      <div className="text-xs text-slate-400 text-center mt-1">minute</div>
                    </div>

                    <div className="flex-1 relative">
                      <select
                        value={manualPeriod}
                        onChange={(e) => setManualPeriod(e.target.value as 'AM' | 'PM')}
                        className="w-full px-2 py-3 pr-8 bg-slate-600 text-white text-2xl font-light text-center rounded-lg focus:ring-2 focus:outline-none appearance-none cursor-pointer"
                        style={{
                          boxShadow: 'none'
                        }}
                        onFocus={(e) => {
                          e.target.style.boxShadow = '0 0 0 2px rgb(0, 173, 240)';
                        }}
                        onBlur={(e) => {
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none pb-5" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border-t border-slate-700">
                  <button
                    type="button"
                    onClick={() => setManualMode(false)}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Clock className="w-6 h-6 text-slate-300" />
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-6 py-2 hover:bg-slate-700 rounded-lg transition-colors font-medium"
                      style={{ color: 'rgb(0, 173, 240)' }}
                    >
                      CANCEL
                    </button>
                    <button
                      type="button"
                      onClick={handleManualSubmit}
                      className="px-6 py-2 hover:bg-slate-700 rounded-lg transition-colors font-medium disabled:opacity-50"
                      style={{ color: !manualHour || !manualMinute ? '' : 'rgb(0, 173, 240)' }}
                      disabled={!manualHour || !manualMinute}
                    >
                      OK
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
