import React from 'react';
import { Calendar, Brain, FileText } from 'lucide-react';

interface CircularMetadata {
  refNumber: string;
  title: string;
  publishedDate: string;
  detectedDate: string;
  category: string;
  totalObligations: number;
  arcaConfidence: number;
  summary: string;
}

interface Props {
  circular: CircularMetadata;
}

export default function CircularMetadataHeader({ circular }: Props) {
  const confidenceColor =
    circular.arcaConfidence >= 90
      ? 'text-success'
      : circular.arcaConfidence >= 80
      ? 'text-primary' :'text-warning';

  return (
    <div className="card-elevated border-l-2 border-l-primary p-5">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-mono-data text-sm font-bold text-primary">{circular.refNumber}</span>
            <span className="gate-badge bg-primary/15 text-primary border-primary/25">{circular.category}</span>
            <span className="gate-badge bg-muted text-muted-foreground border-border">
              {circular.totalObligations} obligations
            </span>
          </div>
          <h2 className="text-sm font-semibold text-foreground leading-relaxed mb-3">{circular.title}</h2>
        </div>

        <div className="flex flex-col gap-2 lg:w-52 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-muted-foreground" />
            <span className="text-2xs text-muted-foreground font-mono-data">Published {circular.publishedDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText size={12} className="text-muted-foreground" />
            <span className="text-2xs text-muted-foreground font-mono-data">Detected {circular.detectedDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <Brain size={12} className="text-muted-foreground" />
            <span className="text-2xs text-muted-foreground font-mono-data">ARCA confidence:</span>
            <span className={`text-2xs font-bold font-mono-data ${confidenceColor}`}>{circular.arcaConfidence}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}