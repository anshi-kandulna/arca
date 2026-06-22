'use client';

import React, { useState, useEffect } from 'react';
import CircularSelector from './CircularSelector';
import CircularMetadataHeader from './CircularMetadataHeader';
import MAPCardList from './MAPCardList';
import BatchApproveBar from './BatchApproveBar';
import { toast } from 'sonner';

export interface MAP {
  id: string;
  mapId: string;
  obligationText: string;
  department: string;
  deadline: string;
  evidenceRequirement: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL';
  confidenceScore: number;
  status: 'pending' | 'approved' | 'rejected' | 'edited';
  extractedClause: string;
  notes: string;
}

import { useAuth } from '@/contexts/AuthContext';

export default function MAPReviewContent() {
  const { token } = useAuth();
  const [selectedCircularId, setSelectedCircularId] = useState('');
  const [circularData, setCircularData] = useState<Record<string, any>>({});
  const [maps, setMaps] = useState<Record<string, MAP[]>>({});
  const [dispatching, setDispatching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const circRes = await fetch('http://localhost:8000/api/circulars', { headers: { 'Authorization': `Bearer ${token}` } });
        const mapRes = await fetch('http://localhost:8000/api/maps', { headers: { 'Authorization': `Bearer ${token}` } });
        
        const circs = await circRes.json();
        const allMaps = await mapRes.json();
        
        const newCircData: Record<string, any> = {};
        const newMaps: Record<string, MAP[]> = {};
        
        circs.forEach((c: any) => {
          newCircData[c.id] = { ...c, maps: [] };
          newMaps[c.id] = [];
        });
        
        allMaps.forEach((m: any) => {
          if (newCircData[m.circularId]) {
            const frontendMap: MAP = {
              id: m.id,
              mapId: m.mapId,
              obligationText: m.action,
              department: m.department,
              deadline: m.deadline,
              evidenceRequirement: '', // Not in DB yet
              priority: m.priority,
              confidenceScore: m.confidenceScore || null, // Will be fetched if available
              status: m.status === 'draft' ? 'pending' : m.status as any,
              extractedClause: m.clauseRef,
              notes: ''
            };
            newMaps[m.circularId].push(frontendMap);
          }
        });
        
        setCircularData(newCircData);
        setMaps(newMaps);
        if (circs.length > 0) {
          setSelectedCircularId(circs[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch map review data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [token]);

  const circular = circularData[selectedCircularId];
  const currentMaps = maps[selectedCircularId] || [];

  const approvedCount = currentMaps.filter((m) => m.status === 'approved').length;
  const rejectedCount = currentMaps.filter((m) => m.status === 'rejected').length;
  const pendingCount = currentMaps.filter((m) => m.status === 'pending' || m.status === 'edited').length;
  const dispatchedCount = currentMaps.filter((m) => !['pending', 'approved', 'rejected', 'edited', 'draft'].includes(m.status)).length;

  async function updateMap(mapId: string, updates: Partial<MAP>) {
    setMaps((prev) => ({
      ...prev,
      [selectedCircularId]: prev[selectedCircularId].map((m) =>
        m.id === mapId ? { ...m, ...updates } : m
      ),
    }));

    const backendUpdates: Record<string, any> = {};
    if (updates.obligationText !== undefined) backendUpdates.obligation_text = updates.obligationText;
    if (updates.department !== undefined) backendUpdates.department_raw = updates.department;
    if (updates.deadline !== undefined) backendUpdates.deadline_raw = updates.deadline;
    if (updates.extractedClause !== undefined) backendUpdates.clause_ref = updates.extractedClause;
    if (updates.priority !== undefined) backendUpdates.priority = updates.priority;
    if (updates.status !== undefined) backendUpdates.status = updates.status;

    try {
      await fetch(`http://localhost:8000/api/maps/${mapId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(backendUpdates)
      });
    } catch (err) {
      console.error("Failed to update map", err);
      toast.error("Failed to update MAP in database");
    }
  }

  async function handleApproveAll() {
    const mapsToApprove = maps[selectedCircularId]?.filter((m) => m.status === 'pending' || m.status === 'edited') || [];
    if (mapsToApprove.length === 0) return;
    
    // Optimistically update UI
    setMaps((prev) => ({
      ...prev,
      [selectedCircularId]: prev[selectedCircularId].map((m) =>
        (m.status === 'pending' || m.status === 'edited') ? { ...m, status: 'approved' } : m
      ),
    }));
    
    // Call backend for each
    await Promise.all(mapsToApprove.map(m => 
      fetch(`http://localhost:8000/api/maps/${m.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'approved' })
      }).catch(err => console.error("Failed to approve map", m.id, err))
    ));
    
    toast.success(`${mapsToApprove.length} MAPs approved`);
  }

  async function handleDispatch() {
    if (approvedCount === 0) {
      toast.error('No MAPs approved — approve at least one MAP before dispatching');
      return;
    }
    setDispatching(true);
    try {
      const res = await fetch(`http://localhost:8000/api/circulars/${selectedCircularId}/dispatch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error('Dispatch failed');
      }
      
      toast.success(`${approvedCount} MAPs dispatched to departments — Gate 1 complete`, {
        description: `Circular ${circular.refNumber} · Reminders scheduled automatically`,
      });
      
      // Remove circular from the view since it's no longer pending_review
      const newCircularData = { ...circularData };
      delete newCircularData[selectedCircularId];
      setCircularData(newCircularData);
      
      const newMaps = { ...maps };
      delete newMaps[selectedCircularId];
      setMaps(newMaps);
      
      const remainingCircs = Object.values(newCircularData);
      if (remainingCircs.length > 0) {
        setSelectedCircularId(remainingCircs[0].id);
      } else {
        setSelectedCircularId('');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to dispatch MAPs');
    } finally {
      setDispatching(false);
    }
  }

  const circularsForSelector = Object.values(circularData).map((c) => ({
    id: c.id,
    refNumber: c.refNumber,
    category: c.category,
    totalObligations: c.totalObligations,
    pendingCount: maps[c.id]?.filter((m) => m.status === 'pending' || m.status === 'edited').length ?? 0,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground text-sm">Loading MAP Review data…</div>
      </div>
    );
  }

  if (!circular) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground text-sm">No circulars available for review.</div>
      </div>
    );
  }

  return (
    <div className="space-y-5 fade-in-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="gate-badge bg-warning/15 text-warning border border-warning/30 text-xs px-2 py-0.5">GATE 1</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">MAP Review</h1>
        </div>
      </div>

      {/* Circular Selector */}
      <CircularSelector
        circulars={circularsForSelector}
        selectedId={selectedCircularId}
        onSelect={setSelectedCircularId}
      />

      {/* Circular Metadata */}
      <CircularMetadataHeader circular={circular} />

      {/* MAP Cards */}
      <MAPCardList
        maps={currentMaps}
        onUpdateMap={updateMap}
        onApproveAll={handleApproveAll}
        approvedCount={approvedCount}
        rejectedCount={rejectedCount}
        pendingCount={pendingCount}
        dispatchedCount={dispatchedCount}
      />

      {/* Batch Approve Bar */}
      <BatchApproveBar
        approvedCount={approvedCount}
        pendingCount={pendingCount}
        rejectedCount={rejectedCount}
        dispatching={dispatching}
        onDispatch={handleDispatch}
        onApproveAll={handleApproveAll}
      />
    </div>
  );
}