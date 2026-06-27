import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-8 fade-in-up">
      <button
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="w-10 h-10 flex items-center justify-center border border-black bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black hover:text-white transition-colors"
      >
        <ChevronsLeft size={16} />
      </button>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="w-10 h-10 flex items-center justify-center border border-black bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black hover:text-white transition-colors"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="flex items-center justify-center px-4 h-10 border border-black bg-[#fbfbfa] text-sm font-mono font-bold text-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        PAGE {currentPage} OF {totalPages}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="w-10 h-10 flex items-center justify-center border border-black bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black hover:text-white transition-colors"
      >
        <ChevronRight size={16} />
      </button>
      <button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="w-10 h-10 flex items-center justify-center border border-black bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black hover:text-white transition-colors"
      >
        <ChevronsRight size={16} />
      </button>
    </div>
  );
}
