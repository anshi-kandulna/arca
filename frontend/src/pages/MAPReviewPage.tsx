'use client';

import React, { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import MAPReviewContent from '@/components/map-review/MAPReviewContent';

function MAPReviewPageInner() {
  return (
    <AppLayout activeRoute="/circulars">
      <MAPReviewContent />
    </AppLayout>
  );
}

export default function MAPReviewPage() {
  return (
    <Suspense fallback={
      <AppLayout activeRoute="/circulars">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground text-sm">Loading MAP Review…</div>
        </div>
      </AppLayout>
    }>
      <MAPReviewPageInner />
    </Suspense>
  );
}