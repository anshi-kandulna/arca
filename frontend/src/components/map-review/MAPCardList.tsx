'use client';

import React from 'react';
import MAPCard from './MAPCard';
import type { MAP } from './MAPReviewContent';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface Props {
  maps: MAP[];
  onUpdateMap: (mapId: string, updates: Partial<MAP>) => void;
  onApproveAll: () => void;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
}

export default function MAPCardList({ maps, onUpdateMap, onApproveAll, approvedCount, rejectedCount, pendingCount }: Props) {
  return (
    <div className="space-y-4">
      {/* Status Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="text-warning" />
            <span className="text-xs text-muted-foreground font-mono-data">{pendingCount} pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle size={13} className="text-success" />
            <span className="text-xs text-muted-foreground font-mono-data">{approvedCount} approved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle size={13} className="text-danger" />
            <span className="text-xs text-muted-foreground font-mono-data">{rejectedCount} rejected</span>
          </div>
        </div>
        {pendingCount > 0 && (
          <button
            onClick={onApproveAll}
            className="text-xs text-primary hover:text-accent transition-colors font-medium flex items-center gap-1"
          >
            <CheckCircle size={12} />
            Approve all remaining
          </button>
        )}
      </div>

      {/* MAP Cards */}
      {maps.map((map, idx) => (
        <MAPCard
          key={map.id}
          map={map}
          index={idx + 1}
          onUpdate={(updates) => onUpdateMap(map.id, updates)}
        />
      ))}
    </div>
  );
}