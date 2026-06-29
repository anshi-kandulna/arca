import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the worker for react-pdf using unpkg to guarantee version match
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface PDFViewerProps {
  url: string;
  token: string;
  pageNumber: number;
  bbox?: BoundingBox;
}

export function PDFViewer({ url, token, pageNumber, bbox }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  function onPageLoadSuccess(page: any) {
    // page.originalWidth and page.originalHeight are available in the page object
    setPageDimensions({
      width: page.originalWidth || page.getViewport({ scale: 1 }).width,
      height: page.originalHeight || page.getViewport({ scale: 1 }).height
    });
  }

  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [errorPdf, setErrorPdf] = useState(false);

  useEffect(() => {
    if (loadingPdf) return;
    
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    
    // Initial width
    // Small timeout to ensure DOM is updated
    setTimeout(updateWidth, 50);
    
    const observer = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    window.addEventListener('resize', updateWidth);
    return () => {
      window.removeEventListener('resize', updateWidth);
      observer.disconnect();
    };
  }, [loadingPdf]);

  // Scroll to page when pageNumber changes
  useEffect(() => {
    if (pageNumber && numPages) {
      const pageEl = document.getElementById(`pdf_page_${pageNumber}`);
      if (pageEl) {
        pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [pageNumber, numPages, bbox]);

  useEffect(() => {
    async function loadPdf() {
      try {
        setLoadingPdf(true);
        setErrorPdf(false);
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to load PDF");
        const blob = await res.blob();
        setPdfBlob(blob);
      } catch (err) {
        console.error(err);
        setErrorPdf(true);
      } finally {
        setLoadingPdf(false);
      }
    }
    loadPdf();
  }, [url, token]);

  // Calculate overlay position based on bbox
  const getOverlayStyle = () => {
    if (!bbox || !pageDimensions || !containerWidth) {
      return { display: 'none', reason: `Missing props: bbox=${!!bbox} pageDim=${!!pageDimensions} cWidth=${!!containerWidth}` };
    }
    
    const renderedWidth = containerWidth - 40; // We subtract 40px padding when rendering
    const scale = renderedWidth / pageDimensions.width;
    
    // Parse stringified JSON if needed
    let parsedBbox = bbox;
    if (typeof bbox === 'string') {
      try {
        parsedBbox = JSON.parse(bbox);
      } catch (e) {
        console.error("Failed to parse bbox string:", bbox);
      }
    }
    // Handle doubly stringified JSON
    if (typeof parsedBbox === 'string') {
      try {
        parsedBbox = JSON.parse(parsedBbox);
      } catch (e) {}
    }

    // Determine bounds flexibly
    let x0, y0, x1, y1;
    if (Array.isArray(parsedBbox) && parsedBbox.length >= 4) {
      [x0, y0, x1, y1] = parsedBbox;
    } else if (typeof parsedBbox === 'object' && parsedBbox !== null) {
      const bAny = parsedBbox as any;
      x0 = bAny.x0 !== undefined ? bAny.x0 : bAny.l;
      y0 = bAny.y0 !== undefined ? bAny.y0 : bAny.t;
      x1 = bAny.x1 !== undefined ? bAny.x1 : bAny.r;
      y1 = bAny.y1 !== undefined ? bAny.y1 : bAny.b;
    }

    if (x0 === undefined || y0 === undefined) {
      return { display: 'none', reason: `x0 or y0 undefined. parsedBbox type: ${typeof parsedBbox}` };
    }
    
    let minX = Math.min(x0, x1);
    let maxX = Math.max(x0, x1);
    let minY = Math.min(y0, y1);
    let maxY = Math.max(y0, y1);
    
    // Docling coordinates are either bottom-left (v1) or top-left (v2).
    // If we assume top-left, domTop is minY. If bottom-left, domTop is height - maxY.
    // Usually, PDF y coordinates in pure docling are bottom-left. Let's try bottom-left first, 
    // but if minY > pageDimensions.height/2 and it seems off, it might be top-left.
    // Standard Docling v2 uses top-left origin. Let's use top-left origin as primary fallback.
    // Actually, docling `y0` > `y1` in the JSON (506 > 478), so docling is likely bottom-left origin.
    // Let's use domTop = pageDimensions.height - maxY.
    let domTop = pageDimensions.height - maxY;
    
    // Safety check: if docling is top-left, domTop might be negative or very small when it shouldn't be.
    // Let's stick to bottom-left but provide a fallback if it goes out of bounds.
    if (domTop < 0 || domTop > pageDimensions.height) {
      domTop = minY; // fallback to top-left
    }
    
    const width = maxX - minX;
    const height = maxY - minY;

    return {
      position: 'absolute' as const,
      left: `${minX * scale}px`,
      top: `${domTop * scale}px`,
      width: `${width * scale}px`,
      height: `${height * scale}px`,
      backgroundColor: 'rgba(250, 204, 21, 0.4)', // Stronger yellow highlight
      borderBottom: '2px solid rgba(234, 179, 8, 1)',
      border: '2px solid rgba(234, 179, 8, 0.8)',
      zIndex: 20,
      pointerEvents: 'none' as const,
      transition: 'all 0.3s ease',
      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.1)' // Optional: dims the rest of the page slightly
    };
  };

  if (loadingPdf) {
    return <div className="w-full h-full flex flex-col items-center justify-center bg-muted/10">
      <div className="p-10 text-muted-foreground animate-pulse text-sm">Loading PDF document...</div>
    </div>;
  }

  if (errorPdf || !pdfBlob) {
    return <div className="w-full h-full flex flex-col items-center justify-center bg-muted/10">
      <div className="p-10 text-destructive text-sm">Failed to load PDF document.</div>
    </div>;
  }

  return (
    <div className="w-full h-full flex flex-col items-center overflow-auto bg-muted/10 relative" ref={containerRef}>
      <Document
        file={pdfBlob}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={<div className="p-10 text-muted-foreground animate-pulse text-sm">Loading PDF document...</div>}
        error={<div className="p-10 text-destructive text-sm">Failed to load PDF document.</div>}
        className="flex flex-col items-center w-full"
      >
        {Array.from(new Array(numPages || 0), (el, index) => {
          const pNo = index + 1;
          return (
            <div key={`page_${pNo}`} id={`pdf_page_${pNo}`} className="relative shadow-md border border-border mt-4 mb-4 bg-white">
              <Page
                pageNumber={pNo}
                width={containerWidth ? containerWidth - 40 : undefined}
                onLoadSuccess={onPageLoadSuccess}
                loading={<div className="p-10 text-muted-foreground text-sm">Loading page {pNo}...</div>}
                className="pdf-page"
              />
              {bbox && pageNumber === pNo && (
                <>
                  <div style={getOverlayStyle()} className="animate-in fade-in zoom-in duration-300" />
                  <div className="absolute top-0 left-0 p-1 bg-black/80 text-white text-[10px] z-[100] max-w-full overflow-hidden whitespace-nowrap">
                    DEBUG bbox={typeof bbox === 'string' ? bbox : JSON.stringify(bbox)} | style={JSON.stringify(getOverlayStyle())}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </Document>
    </div>
  );
}
