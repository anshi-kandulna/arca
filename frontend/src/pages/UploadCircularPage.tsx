import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';

export default function UploadCircularPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
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
      
      setStatus('processing');
      
      // Since it's background processing, we wait a few seconds and pretend it's done for the UI
      setTimeout(() => {
         setStatus('success');
      }, 5000);

    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <AppLayout activeRoute="/upload">
      <div className="max-w-4xl mx-auto py-8 fade-in-up">
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
            <div className="text-center py-20 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="relative w-20 h-20 mx-auto mb-8">
                <div className="absolute inset-0 border-4 border-black/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-black rounded-full border-t-transparent animate-spin"></div>
                <FileText className="absolute inset-0 m-auto h-8 w-8 text-black animate-pulse" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-black mb-3">AI PROCESSING IN PROGRESS</h3>
              <p className="text-xs font-mono font-bold uppercase tracking-widest text-black/60">Extracting obligations and generating MAPs...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-20 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-20 h-20 bg-black text-white rounded-none flex items-center justify-center mx-auto mb-8 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <CheckCircle className="h-10 w-10" />
              </div>
              <h3 className="text-3xl font-serif font-bold text-black mb-4">PROCESSING INITIATED</h3>
              <p className="text-sm font-mono font-bold uppercase tracking-widest text-black/70 mb-10 max-w-md mx-auto">
                Circular has been uploaded and queued. AI agents are currently extracting obligations in the background.
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
