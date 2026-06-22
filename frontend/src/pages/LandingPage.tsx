'use client';

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function TerminalLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const res = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (!res.ok) throw new Error('Login failed');
      
      const data = await res.json();
      
      const meRes = await fetch('http://localhost:8000/api/me', {
        headers: { 'Authorization': `Bearer ${data.access_token}` }
      });
      if (!meRes.ok) throw new Error('Failed to fetch user profile');
      const meData = await meRes.json();
      
      login(data.access_token, meData);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert('Login failed. Use a demo account (e.g. officer@suraksha.com) with password "password".');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative bg-background text-foreground overflow-hidden">
      
      {/* Left Content Container - Editorial */}
      <div className="flex-1 flex flex-col border-r-0 lg:border-r border-black relative z-10 bg-grid-pattern">
        
        {/* Header Strip */}
        <div className="h-16 lg:h-20 border-b border-black flex items-center px-6 lg:px-12 bg-background justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary flex items-center justify-center">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <span className="text-2xl font-serif tracking-widest text-black uppercase">
              ARCA
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-foreground hidden sm:block">
            Regulatory Intelligence Platform
          </span>
        </div>

        {/* Main Text Content */}
        <div className="flex-1 flex flex-col justify-center px-6 lg:px-24 py-16">
          <div className="max-w-3xl">
            <div className="mb-8 flex items-center gap-3 fade-in-up stagger-1">
              <div className="w-3 h-3 bg-primary animate-pulse"></div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-black">
                System Status: Active
              </span>
            </div>
            
            <h1 className="text-6xl lg:text-[5.5rem] font-serif text-black leading-[0.95] tracking-tight mb-8 fade-in-up stagger-2">
              Compliance <br />
              <span className="text-primary italic">On Autopilot.</span>
            </h1>
            
            <p className="text-black/70 text-lg lg:text-xl font-sans leading-relaxed max-w-xl fade-in-up stagger-3 border-l-4 border-primary pl-6 py-2">
              ARCA automatically detects RBI circulars, extracts every obligation, routes tasks to the right departments, and verifies compliance evidence seamlessly.
            </p>
          </div>
        </div>

        {/* Footer Strip */}
        <div className="h-16 border-t border-black flex items-center px-6 lg:px-12 bg-background justify-between fade-in-up stagger-4">
          <div className="text-[10px] font-mono font-bold text-black uppercase tracking-[0.1em]">
            © 2026 Suraksha Intelligence.
          </div>
          <div className="text-[10px] font-mono font-bold text-black uppercase tracking-[0.1em]">
            V. 2.4.1
          </div>
        </div>
      </div>

      {/* Right Login Box - Brutalist */}
      <div className="w-full lg:w-[40%] flex items-center justify-center p-6 lg:p-16 bg-background relative z-10 fade-in-up stagger-2">
        <div className="w-full max-w-[420px] bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 lg:p-10 relative">
          
          <div className="mb-10 border-b-2 border-black pb-4">
            <h2 className="text-4xl font-serif text-black mb-2">Sign In</h2>
            <p className="text-sm font-mono text-black/60 uppercase tracking-widest font-bold">Authorized Personnel Only</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-black uppercase tracking-[0.1em] block">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background border-2 border-black text-black font-mono text-sm px-4 py-3 rounded-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-black/30"
                placeholder="officer@suraksha.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-black uppercase tracking-[0.1em] block">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background border-2 border-black text-black font-mono text-sm pl-4 pr-12 py-3 rounded-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-black/30"
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-black hover:text-primary transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-black text-white font-mono font-bold text-sm px-4 py-4 border-2 border-black hover:bg-white hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-between mt-8 disabled:opacity-50 disabled:cursor-wait uppercase tracking-[0.2em]"
            >
              <span>Authenticate</span>
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <ArrowRight size={18} strokeWidth={2.5} />
              )}
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}