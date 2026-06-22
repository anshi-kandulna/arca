import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import AppLayout from '../components/AppLayout';

export default function UploadCircularPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    setStatus('uploading');
    
    // Mock upload
    setTimeout(() => {
      setStatus('processing');
      
      // Mock processing (reading from arca_output.json in theory)
      setTimeout(() => {
        setStatus('success');
      }, 2000);
    }, 1000);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Upload Circular</h1>
          <p className="text-muted-foreground font-mono-data">Submit an RBI circular for automated analysis and MAP generation.</p>
        </div>

        <div className="card-elevated p-8">
          {status === 'idle' && (
            <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
              <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">Drag and drop your PDF here</p>
              <p className="text-sm text-muted-foreground mb-6">or click to browse your files</p>
              
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf"
                onChange={handleFileChange}
              />
              <label
                htmlFor="file-upload"
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-md font-medium cursor-pointer hover:bg-primary/90 transition-colors inline-block"
              >
                Select File
              </label>

              {file && (
                <div className="mt-8 flex items-center justify-center gap-3 bg-secondary/50 p-4 rounded-md">
                  <FileText className="text-primary" />
                  <span className="font-medium">{file.name}</span>
                  <button 
                    onClick={handleUpload}
                    className="ml-4 bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90"
                  >
                    Process Circular
                  </button>
                </div>
              )}
            </div>
          )}

          {status === 'uploading' && (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-6"></div>
              <h3 className="text-lg font-medium text-foreground mb-2">Uploading Document...</h3>
              <p className="text-muted-foreground font-mono-data">Transferring securely to ARCA servers</p>
            </div>
          )}

          {status === 'processing' && (
            <div className="text-center py-12">
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                <FileText className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">AI Processing in Progress</h3>
              <p className="text-muted-foreground font-mono-data">Extracting obligations and generating MAPs...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Processing Complete</h3>
              <p className="text-muted-foreground font-mono-data mb-8">
                Found 149 High Priority obligations and 28 Medium Priority obligations.
              </p>
              <div className="flex justify-center gap-4">
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="bg-primary text-primary-foreground px-6 py-2.5 rounded-md font-medium hover:bg-primary/90"
                >
                  View Dashboard
                </button>
                <button 
                  onClick={() => setStatus('idle')}
                  className="bg-secondary text-foreground px-6 py-2.5 rounded-md font-medium hover:bg-secondary/80 border border-border"
                >
                  Upload Another
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-danger/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-8 w-8 text-danger" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Processing Failed</h3>
              <p className="text-muted-foreground font-mono-data mb-8">
                Could not extract obligations. The PDF might be corrupted or scanned without OCR.
              </p>
              <button 
                onClick={() => setStatus('idle')}
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-md font-medium hover:bg-primary/90"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
