'use client';

import { MapPin } from 'lucide-react';
import type { LocationFilter } from '@/types';

interface LocationToggleProps {
  value: LocationFilter;
  onChange: (location: LocationFilter) => void;
}

const LOCATIONS: Array<{ value: LocationFilter; label: string; emoji: string }> = [
  { value: 'all', label: 'All Australia', emoji: '🇦🇺' },
  { value: 'sydney', label: 'Sydney', emoji: '🌉' },
  { value: 'melbourne', label: 'Melbourne', emoji: '☕' },
];

export function LocationToggle({ value, onChange }: LocationToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="flex rounded-lg border border-border overflow-hidden bg-background">
        {LOCATIONS.map((loc) => (
          <button
            key={loc.value}
            onClick={() => onChange(loc.value)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
              value === loc.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <span>{loc.emoji}</span>
            <span>{loc.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
