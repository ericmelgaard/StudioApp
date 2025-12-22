import { useState, useRef, useEffect } from 'react';
import { Clock, Keyboard } from 'lucide-react';

interface TimeSelectorProps {
  value: string;
  onChange: (time: string) => void;
  label: string;
}

type SelectionMode = 'hour' | 'minute';

const formatDisplayTime = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
};

export default function TimeSelector({ value, onChange, label }: TimeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState('');
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
      setManualInput('');
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
    if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(manualInput)) {
      onChange(manualInput);
      setIsOpen(false);
    }
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
        onClick={() => setIsOpen(true)}
        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono text-base text-left bg-white hover:bg-slate-50 transition-colors"
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
                <div className="bg-amber-600 p-6 text-white">
                  <div className="text-6xl font-light tracking-tight flex items-baseline justify-center gap-1">
                    <button
                      onClick={() => setSelectionMode('hour')}
                      className={`transition-opacity ${selectionMode === 'hour' ? 'opacity-100' : 'opacity-60'}`}
                    >
                      {String(displayHour).padStart(2, '0')}
                    </button>
                    <span>:</span>
                    <button
                      onClick={() => setSelectionMode('minute')}
                      className={`transition-opacity ${selectionMode === 'minute' ? 'opacity-100' : 'opacity-60'}`}
                    >
                      {String(selectedMinute).padStart(2, '0')}
                    </button>
                  </div>
                  <div className="flex justify-center gap-2 mt-4">
                    <button
                      onClick={() => togglePeriod(false)}
                      className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${
                        !isPM ? 'bg-white text-amber-600' : 'bg-amber-700 text-white hover:bg-amber-800'
                      }`}
                    >
                      AM
                    </button>
                    <button
                      onClick={() => togglePeriod(true)}
                      className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${
                        isPM ? 'bg-white text-amber-600' : 'bg-amber-700 text-white hover:bg-amber-800'
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
                                ? 'bg-cyan-500 text-white font-semibold'
                                : 'text-slate-300 hover:bg-slate-600'
                            }`}
                            style={{
                              left: `${x}%`,
                              top: `${y}%`,
                              transform: 'translate(-50%, -50%)'
                            }}
                          >
                            {selectionMode === 'minute' ? String(num).padStart(2, '0') : num}
                          </div>
                        );
                      })}

                      <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-cyan-500 rounded-full -translate-x-1/2 -translate-y-1/2 z-10" />

                      <div
                        className="absolute top-1/2 left-1/2 origin-left h-0.5 bg-cyan-500 pointer-events-none"
                        style={{
                          width: '35%',
                          transform: `rotate(${getSelectedAngle()}rad)`,
                          transformOrigin: 'left center'
                        }}
                      >
                        <div className="absolute right-0 top-1/2 w-10 h-10 bg-cyan-500 rounded-full -translate-y-1/2 translate-x-1/2 border-4 border-slate-800" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border-t border-slate-700">
                  <button
                    onClick={() => {
                      setManualMode(true);
                      setManualInput(value);
                    }}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Keyboard className="w-6 h-6 text-slate-300" />
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsOpen(false)}
                      className="px-6 py-2 text-cyan-400 hover:bg-slate-700 rounded-lg transition-colors font-medium"
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={handleOK}
                      className="px-6 py-2 text-cyan-400 hover:bg-slate-700 rounded-lg transition-colors font-medium"
                    >
                      OK
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-amber-600 p-6 text-white">
                  <div className="text-2xl font-medium">Enter Time</div>
                </div>

                <div className="p-6">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="HH:MM (24-hour)"
                    className="w-full px-4 py-3 bg-slate-700 text-white text-2xl font-mono rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    autoFocus
                  />
                  <p className="text-slate-400 text-sm mt-2">Format: 14:30 for 2:30 PM</p>
                </div>

                <div className="flex items-center justify-between p-4 border-t border-slate-700">
                  <button
                    onClick={() => setManualMode(false)}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Clock className="w-6 h-6 text-slate-300" />
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsOpen(false)}
                      className="px-6 py-2 text-cyan-400 hover:bg-slate-700 rounded-lg transition-colors font-medium"
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={handleManualSubmit}
                      className="px-6 py-2 text-cyan-400 hover:bg-slate-700 rounded-lg transition-colors font-medium disabled:opacity-50"
                      disabled={!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(manualInput)}
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
