import React from 'react';
import { formatCurrency } from '../utils/currency';

interface DurationSelectorProps {
  selectedDuration: number;
  onDurationChange: (duration: number) => void;
  disabled?: boolean;
}

export const DurationSelector: React.FC<DurationSelectorProps> = ({
  selectedDuration,
  onDurationChange,
  disabled = false,
}) => {
  const durations = [1, 5, 10, 15, 20, 25, 30];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Selecione a Duração</h3>
      
      {/* Quick select buttons */}
      <div className="grid grid-cols-3 gap-2">
        {durations.map((duration) => (
          <button
            key={duration}
            onClick={() => onDurationChange(duration)}
            disabled={disabled}
            className={`
              p-3 rounded-lg border-2 transition-all
              ${selectedDuration === duration
                ? 'border-primary-600 bg-primary-50 text-primary-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="text-sm font-medium">{duration} min</div>
            <div className="text-xs text-gray-500">
              {formatCurrency(duration)}
            </div>
          </button>
        ))}
      </div>

      {/* Custom duration input */}
      <div className="space-y-2">
        <label htmlFor="custom-duration" className="block text-sm font-medium text-gray-700">
          Duração Personalizada (1-30 minutos)
        </label>
        <div className="flex items-center space-x-2">
          <input
            id="custom-duration"
            type="number"
            min="1"
            max="30"
            value={selectedDuration}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (value >= 1 && value <= 30) {
                onDurationChange(value);
              }
            }}
            disabled={disabled}
            className="block w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
          />
          <span className="text-sm text-gray-500">minutos</span>
          <span className="text-sm font-medium text-gray-900">
            = {formatCurrency(selectedDuration)}
          </span>
        </div>
      </div>
    </div>
  );
};