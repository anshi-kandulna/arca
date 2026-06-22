'use client';

import React from 'react';
import { FileText, ChevronRight } from 'lucide-react';

interface CircularOption {
  id: string;
  refNumber: string;
  category: string;
  totalObligations: number;
  pendingCount: number;
}

interface CircularSelectorProps {
  circulars: CircularOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const categoryColors: Record<string, string> = {
  FEMA: 'bg-primary/15 text-primary border-primary/25',
  'KYC/AML': 'bg-info/15 text-info border-info/25',
  'Prudential': 'bg-warning/15 text-warning border-warning/25',
  'Credit': 'bg-success/15 text-success border-success/25',
};

export default function CircularSelector({ circulars, selectedId, onSelect }: CircularSelectorProps) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-1">
      <span className="text-xs text-muted-foreground font-medium flex-shrink-0">Pending review:</span>
      {circulars.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={`
            flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all duration-150 flex-shrink-0
            ${selectedId === c.id
              ? 'bg-primary/10 border-primary/30 text-foreground'
              : 'bg-card border-border text-secondary-foreground hover:border-primary/20 hover:bg-muted/50'
            }
          `}
        >
          <FileText size={13} className={selectedId === c.id ? 'text-primary' : 'text-muted-foreground'} />
          <div>
            <p className="text-xs font-semibold font-mono-data">{c.refNumber}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`gate-badge text-2xs ${categoryColors[c.category] || 'bg-muted text-muted-foreground border-border'}`}>
                {c.category}
              </span>
              {c.pendingCount > 0 && (
                <span className="gate-badge bg-warning/15 text-warning border-warning/25 text-2xs">
                  {c.pendingCount} pending
                </span>
              )}
            </div>
          </div>
          {selectedId === c.id && <ChevronRight size={12} className="text-primary ml-1" />}
        </button>
      ))}
    </div>
  );
}