'use client';

import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/AppIcon';

export default function NotFound() {
    const navigate = useNavigate();

    const handleGoHome = () => {
        navigate('/');
    };

    const handleGoBack = () => {
        if (typeof window !== 'undefined') {
            window.history?.back();
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#fbfbfa] p-4 font-mono">
            <div className="text-center max-w-md bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <h1 className="text-9xl font-serif font-black text-black">404</h1>
                        <div className="absolute top-1/2 left-0 w-full h-2 bg-primary -translate-y-1/2 mix-blend-multiply"></div>
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-black mb-2 uppercase tracking-tight">System Fault</h2>
                <p className="text-sm font-bold text-black/70 mb-8 uppercase tracking-widest">
                    The requested coordinates do not exist in the current sector.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center justify-center gap-2 bg-black text-white px-6 py-3 font-bold uppercase tracking-widest border-2 border-black hover:bg-white hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-200"
                    >
                        <Icon name="ArrowLeftIcon" size={16} />
                        Retreat
                    </button>

                    <button
                        onClick={handleGoHome}
                        className="inline-flex items-center justify-center gap-2 bg-white text-black px-6 py-3 font-bold uppercase tracking-widest border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-200"
                    >
                        <Icon name="HomeIcon" size={16} />
                        Base Camp
                    </button>
                </div>
            </div>
        </div>
    );
}