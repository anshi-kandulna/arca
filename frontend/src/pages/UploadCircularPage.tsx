import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';

export default function UploadCircularPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [circularId, setCircularId] = useState<string | null>(null);
  const [extractedMaps, setExtractedMaps] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<{ title: string; refNumber: string } | null>(null);
  const [pollingLog, setPollingLog] = useState<string[]>([]);
  
  const navigate = useNavigate();
  const { token } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('http://localhost:8000/api/circulars/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      
      setCircularId(data.circular_id);
      setStatus('processing');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (status === 'processing' && circularId) {
      setExtractedMaps([]);
      setMetadata(null);
      setPollingLog(['Initializing parallel extraction and routing agents...']);

      interval = setInterval(async () => {
        try {
          // 1. Fetch circular metadata and status
          const circRes = await fetch(`http://localhost:8000/api/circulars/${circularId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (circRes.ok) {
            const circData = await circRes.json();
            
            // Set metadata if it starts loading
            if (circData.ref_number && !circData.ref_number.startsWith('UPL-')) {
              setMetadata({
                title: circData.title,
                refNumber: circData.ref_number
              });
            }

            // Update log message depending on status
            if (circData.status === 'processing') {
              setPollingLog(prev => {
                const logs = [...prev];
                const msg = `Docling parsing PDF & routing obligations...`;
                if (!logs.includes(msg)) {
                  logs.push(msg);
                }
                return logs;
              });
            } else if (circData.status === 'pending_review') {
              // Do one final maps fetch before declaring success
              const finalMapsRes = await fetch(`http://localhost:8000/api/maps?circular_id=${circularId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (finalMapsRes.ok) {
                const finalMapsData = await finalMapsRes.json();
                setExtractedMaps(finalMapsData);
              }
              setStatus('success');
              clearInterval(interval);
              return;
            } else if (circData.status === 'failed') {
              setStatus('error');
              clearInterval(interval);
              return;
            }
          }

          // 2. Fetch currently extracted maps (only if processing is underway)
          const mapsRes = await fetch(`http://localhost:8000/api/maps?circular_id=${circularId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (mapsRes.ok) {
            const mapsData = await mapsRes.json();
            setExtractedMaps(mapsData);
            
            if (mapsData.length > 0) {
              setPollingLog(prev => {
                const logs = [...prev];
                const msg = `Routed ${mapsData.length} compliance obligations.`;
                const index = logs.findIndex(l => l.startsWith('Routed '));
                if (index !== -1) {
                  logs[index] = msg;
                } else {
                  logs.push(msg);
                }
                return logs;
              });
            }
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 10000);
    }

    return () => clearInterval(interval);
  }, [status, circularId, token]);

  return (
    <AppLayout activeRoute="/upload">
      <div className="max-w-6xl mx-auto py-8 fade-in-up">
        {/* Header - Editorial Layout */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b-[3px] border-black pb-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <UploadCloud size={16} className="text-black" strokeWidth={3} />
              <span className="text-[10px] font-mono font-bold text-foreground uppercase tracking-[0.2em]">Data Ingestion</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-serif text-black leading-none tracking-tight">Upload</h1>
          </div>
          <div className="mt-6 md:mt-0">
            <p className="text-[10px] font-mono font-bold text-black/60 uppercase tracking-widest text-right max-w-[200px]">
              Submit an RBI circular for automated analysis and MAP generation.
            </p>
          </div>
        </div>

        <div className="card-elevated p-8 bg-white border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          {status === 'idle' && (
            <div className="border-2 border-dashed border-black/40 bg-[#fbfbfa] rounded-none p-16 text-center hover:border-black transition-colors group cursor-pointer relative">
              <input
                type="file"
                id="file-upload"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                accept=".pdf"
                onChange={handleFileChange}
              />
              <UploadCloud className="mx-auto h-16 w-16 text-black/40 group-hover:text-black transition-colors mb-6" strokeWidth={1.5} />
              <p className="text-2xl font-serif font-bold text-black mb-2">DRAG AND DROP DOCUMENT</p>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-black/50 mb-8">or click to browse your files (PDF only)</p>
              
              <div className="inline-block bg-black text-white px-8 py-3 font-mono text-sm font-bold uppercase tracking-widest border-2 border-black hover:bg-white hover:text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                SELECT FILE
              </div>

              {file && (
                <div className="mt-12 flex items-center justify-between gap-4 bg-white border-2 border-black p-4 z-20 relative shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="text-black flex-shrink-0" />
                    <span className="font-mono text-sm font-bold truncate">{file.name}</span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      handleUpload();
                    }}
                    className="bg-black text-white px-6 py-2 text-xs font-mono font-bold uppercase tracking-widest border-2 border-black hover:bg-white hover:text-black transition-colors"
                  >
                    PROCESS NOW
                  </button>
                </div>
              )}
            </div>
          )}

          {status === 'uploading' && (
            <div className="text-center py-20 border-2 border-dashed border-black/20 bg-[#fbfbfa]">
              <div className="w-16 h-16 border-4 border-black/10 border-t-black rounded-full animate-spin mx-auto mb-8"></div>
              <h3 className="text-2xl font-serif font-bold text-black mb-3">UPLOADING DOCUMENT</h3>
              <p className="text-xs font-mono font-bold uppercase tracking-widest text-black/50">Transferring securely to ARCA servers</p>
            </div>
          )}

          {status === 'processing' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Side: Terminal Log & Status */}
              <div className="border-4 border-black bg-[#fbfbfa] p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col h-[500px]">
                <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#e056fd] animate-pulse"></div>
                    <h3 className="font-mono font-bold text-xs uppercase tracking-widest">Agent Pipelines</h3>
                  </div>
                  <div className="font-mono text-[10px] text-black/40">STATUS: ACTIVE</div>
                </div>

                {metadata && (
                  <div className="bg-white border-2 border-black p-4 mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-[9px] font-mono font-bold text-black/50 uppercase tracking-widest block mb-1">Parsed Circular Details</span>
                    <h4 className="font-serif font-bold text-lg text-black leading-tight truncate mb-1">{metadata.title}</h4>
                    <span className="font-mono font-bold text-xs bg-black text-white px-2 py-0.5 inline-block">{metadata.refNumber}</span>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto font-mono text-xs text-left bg-black text-[#00ff00] p-4 border-2 border-black space-y-2 select-none shadow-[inset_0px_0px_10px_0px_rgba(0,0,0,0.5)]">
                  {pollingLog.map((log, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-[#00ff00]/40">[{new Date().toLocaleTimeString()}]</span>
                      <span>{log}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5 animate-pulse text-[#00ff00]/60">
                    <span>&gt;</span>
                    <span className="w-1.5 h-3.5 bg-[#00ff00]"></span>
                  </div>
                </div>
              </div>

              {/* Right Side: Live Obligations Stream */}
              <div className="border-4 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col h-[500px]">
                <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-4">
                  <h3 className="font-mono font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                    <FileText size={14} />
                    Extracted Obligations ({extractedMaps.length})
                  </h3>
                  <span className="text-[10px] font-mono font-bold uppercase text-black/40">Live Feed</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  {extractedMaps.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                      <div className="relative w-12 h-12 mb-4 animate-spin">
                        <div className="absolute inset-0 border-4 border-black/10 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-black rounded-full border-t-transparent"></div>
                      </div>
                      <p className="font-mono text-xs uppercase tracking-wider text-black/40">Waiting for first page obligation extraction...</p>
                    </div>
                  ) : (
                    extractedMaps.map((mapItem, idx) => (
                      <div 
                        key={mapItem.id || idx} 
                        className="bg-white border-2 border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[-2px] hover:translate-x-[-2px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] fade-in-up"
                        style={{ animationDelay: `${idx * 0.1}s` }}
                      >
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <span className="font-mono text-[9px] font-bold bg-black text-white px-2 py-0.5">
                            {mapItem.mapId || mapItem.map_ref}
                          </span>
                          <span className={`font-mono text-[9px] font-bold px-2 py-0.5 border border-black uppercase tracking-wider ${
                            mapItem.priority === 'HIGH' ? 'bg-[#ff7979] text-black' :
                            mapItem.priority === 'MEDIUM' ? 'bg-[#f9ca24] text-black' : 'bg-[#badc58] text-black'
                          }`}>
                            {mapItem.priority}
                          </span>
                        </div>
                        <p className="font-serif text-sm font-bold text-black text-left mb-2 line-clamp-3">
                          {mapItem.obligation_text || mapItem.action}
                        </p>
                        <div className="flex justify-between items-center text-[10px] font-mono font-bold text-black/50 border-t border-black/10 pt-2 font-mono">
                          <span className="uppercase text-[#2980b9]">
                            {mapItem.business_vertical || mapItem.department || 'Unassigned'}
                          </span>
                          <span>PAGE {mapItem.page_no}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-20 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-20 h-20 bg-black text-white rounded-none flex items-center justify-center mx-auto mb-8 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <CheckCircle className="h-10 w-10" />
              </div>
              <h3 className="text-3xl font-serif font-bold text-black mb-4">PROCESSING COMPLETED</h3>
              <p className="text-sm font-mono font-bold uppercase tracking-widest text-black/70 mb-10 max-w-md mx-auto">
                Circular has been fully parsed. All obligations are now extracted and routed for review.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-6">
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="bg-black text-white px-8 py-3 text-sm font-mono font-bold uppercase tracking-widest border-2 border-black hover:bg-white hover:text-black transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  VIEW DASHBOARD
                </button>
                <button 
                  onClick={() => navigate('/map-review-screen')}
                  className="bg-white text-black px-8 py-3 text-sm font-mono font-bold uppercase tracking-widest border-2 border-black hover:bg-[#fbfbfa] transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  MAP REVIEW
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-20 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-20 h-20 bg-danger text-white rounded-none flex items-center justify-center mx-auto mb-8 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <AlertCircle className="h-10 w-10" />
              </div>
              <h3 className="text-3xl font-serif font-bold text-black mb-4">PROCESSING FAILED</h3>
              <p className="text-sm font-mono font-bold uppercase tracking-widest text-danger mb-10 max-w-md mx-auto">
                Could not initiate extraction. Ensure backend is running.
              </p>
              <button 
                onClick={() => setStatus('idle')}
                className="bg-black text-white px-8 py-3 text-sm font-mono font-bold uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(220,38,38,1)] transition-all border-2 border-black"
              >
                TRY AGAIN
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
