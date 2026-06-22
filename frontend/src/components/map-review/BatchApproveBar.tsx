'use client';

import React from 'react';
import { Send, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

interface Props {
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  dispatching: boolean;
  onDispatch: () => void;
  onApproveAll: () => void;
}

export default function BatchApproveBar({ approvedCount, pendingCount, rejectedCount, dispatching, onDispatch, onApproveAll }: Props) {
  const canDispatch = approvedCount > 0;

  return (
    <div className="sticky bottom-6 z-20">
      <div className="card-elevated border border-border amber-glow px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Status */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-success" />
            <span className="text-sm font-semibold text-foreground font-mono-data">{approvedCount}</span>
            <span className="text-xs text-muted-foreground">approved</span>
          </div>
          {rejectedCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-danger font-mono-data">{rejectedCount}</span>
              <span className="text-xs text-muted-foreground">rejected</span>
            </div>
          )}
          {pendingCount > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle size={13} className="text-warning" />
              <span className="text-sm font-semibold text-warning font-mono-data">{pendingCount}</span>
              <span className="text-xs text-muted-foreground">still pending</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <button
              onClick={onApproveAll}
              className="px-3 py-2 rounded-lg bg-muted border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border transition-colors"
            >
              Approve remaining {pendingCount}
            </button>
          )}

          <button
            onClick={onDispatch}
            disabled={!canDispatch || dispatching}
            className={`
              flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150
              ${canDispatch && !dispatching
                ? 'bg-primary text-primary-foreground hover:bg-accent active:scale-95 amber-glow'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
              }
            `}
            style={{ minWidth: '180px', justifyContent: 'center' }}
          >
            {dispatching ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Dispatching…
              </>
            ) : (
              <>
                <Send size={14} />
                Dispatch {approvedCount > 0 ? `${approvedCount} MAPs` : 'MAPs'} — Gate 1
              </>
            )}
          </button>
        </div>
      </div>

      {!canDispatch && (
        <p className="text-center text-2xs text-muted-foreground mt-2 font-mono-data">
          Approve at least one MAP before dispatching to departments
        </p>
      )}
    </div>
  );
}