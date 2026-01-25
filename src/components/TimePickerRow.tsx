import { useState, useRef, useEffect } from 'react';
import { Clock, Keyboard, ChevronRight, X } from 'lucide-react';

interface TimePickerRowProps {
  label: string;
  value: string;
  onChange: (time: string) => void;
  disabled?: boolean;
}

type SelectionMode = 'hour' | 'minute';

const formatDisplayTime = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
};

export default function TimePickerRow({ label, value, onChange, disabled = false }: TimePickerRowProps) {
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
    <>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-lg transition-all group ${
          disabled
            ? 'bg-slate-50 dark:bg-slate-700 cursor-not-allowed'
            : 'bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 active:bg-slate-200 dark:active:bg-slate-500'
        }`}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 min-w-[90px]">
          <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          {label}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-mono min-w-[90px]">
            {formatDisplayTime(value)}
          </span>
          {!disabled && (
            <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsOpen(false)}>
          <div
            className="bg-slate-800 rounded-2xl shadow-2xl overflow-hidden w-80"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 px-6 py-8 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-300">
                  {selectionMode === 'hour' ? 'Select hour' : 'Select minutes'}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-1 text-6xl font-light tabular-nums">
                <span
                  className={`cursor-pointer transition-all ${selectionMode === 'hour' ? 'opacity-100' : 'opacity-50'}`}
                  onClick={() => setSelectionMode('hour')}
                >
                  {String(displayHour).padStart(2, '0')}
                </span>
                <span className="opacity-50">:</span>
                <span
                  className={`cursor-pointer transition-all ${selectionMode === 'minute' ? 'opacity-100' : 'opacity-50'}`}
                  onClick={() => setSelectionMode('minute')}
                >
                  {String(selectedMinute).padStart(2, '0')}
                </span>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => togglePeriod(false)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    !isPM
                      ? 'bg-white text-slate-900'
                      : 'bg-slate-600/50 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  AM
                </button>
                <button
                  onClick={() => togglePeriod(true)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    isPM
                      ? 'bg-white text-slate-900'
                      : 'bg-slate-600/50 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  PM
                </button>
              </div>
            </div>

            {!manualMode ? (
              <div className="p-6 bg-white">
                <div
                  ref={clockRef}
                  className="relative w-64 h-64 mx-auto bg-slate-100 rounded-full cursor-pointer"
                  onClick={handleClockClick}
                >
                  {getClockNumbers().map((num, i) => {
                    const angle = selectionMode === 'hour'
                      ? (num * 30 - 90) * (Math.PI / 180)
                      : (num * 6 - 90) * (Math.PI / 180);
                    const radius = 100;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;

                    const isSelected = selectionMode === 'hour'
                      ? num === (selectedHour % 12 || 12)
                      : num === selectedMinute;

                    return (
                      <div
                        key={num}
                        className={`absolute w-10 h-10 flex items-center justify-center rounded-full font-medium text-sm transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white scale-110'
                            : 'text-slate-700 hover:bg-slate-200'
                        }`}
                        style={{
                          left: `calc(50% + ${x}px - 20px)`,
                          top: `calc(50% + ${y}px - 20px)`,
                        }}
                      >
                        {num === 0 ? '00' : String(num).padStart(2, '0')}
                      </div>
                    );
                  })}

                  <div
                    className="absolute top-1/2 left-1/2 w-1 bg-blue-600 origin-bottom transition-transform"
                    style={{
                      height: '90px',
                      transform: `translate(-50%, -100%) rotate(${(getSelectedAngle() * 180 / Math.PI) + 90}deg)`,
                    }}
                  >
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-600 rounded-full border-4 border-white" />
                  </div>

                  <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-blue-600 rounded-full -translate-x-1/2 -translate-y-1/2" />
                </div>

                <div className="flex items-center justify-between mt-6">
                  <button
                    type="button"
                    onClick={() => setManualMode(true)}
                    className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Keyboard className="w-4 h-4" />
                    <span className="text-sm font-medium">Keyboard</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOK}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    OK
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-white">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Hour</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={manualHour}
                        onChange={(e) => setManualHour(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="12"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Minute</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={manualMinute}
                        onChange={(e) => setManualMinute(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="00"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Period</label>
                      <select
                        value={manualPeriod}
                        onChange={(e) => setManualPeriod(e.target.value as 'AM' | 'PM')}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setManualMode(false)}
                      className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">Clock</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleManualSubmit}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
