'use client';

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
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
    <div className="min-h-screen bg-background flex flex-col lg:flex-row relative font-sans text-foreground overflow-hidden selection:bg-primary/20">
      
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-primary opacity-[0.03] rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-slate-400 opacity-[0.05] rounded-full blur-[100px] translate-x-1/3 translate-y-1/3 pointer-events-none z-0"></div>
      <div className="absolute inset-0 bg-noise opacity-30 z-0 pointer-events-none"></div>

      {/* Left Content Container */}
      <div className="flex-1 flex flex-col px-8 lg:px-20 py-10 lg:py-12 relative z-10">
        
        {/* Logo Top Left */}
        <div className="flex items-center gap-3">
          <div className="primary-glow">
            <AppLogo size={40} />
          </div>
          <span className="text-[32px] font-bold tracking-tight text-gradient-primary">
            ARCA
          </span>
        </div>

        {/* Main Text Content */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="max-w-2xl floating-element">
            <p className="text-primary text-[11px] font-mono-data tracking-[0.25em] uppercase mb-5 font-semibold">
              Regulatory Intelligence Platform
            </p>
            <h1 className="text-4xl lg:text-[3.5rem] font-bold text-foreground leading-[1.05] tracking-tight mb-8">
              Turn regulatory obligations into <br className="hidden lg:block"/>
              <span className="text-gradient-primary">actionable compliance</span>
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed max-w-xl font-mono-data">
              ARCA automatically detects RBI circulars, extracts every obligation, routes tasks to the right departments, and verifies compliance evidence.
            </p>
          </div>
        </div>
      </div>

      {/* Right Login Box */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 lg:p-16 lg:pr-24 relative z-10">
        <div className="w-full max-w-[440px] card-elevated p-8 lg:p-12 shadow-2xl backdrop-blur-sm relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none rounded-[6px]"></div>

          <div className="relative z-10">
            <h2 className="text-[1.75rem] font-bold text-foreground mb-1 tracking-tight">Sign in</h2>
            <p className="text-muted-foreground text-sm mb-8 font-mono-data">Access your compliance dashboard</p>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2.5">
                <label className="text-muted-foreground text-xs font-mono-data tracking-wider uppercase block">Email address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-input/50 border border-border text-foreground text-[15px] px-4 py-3.5 rounded-md focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50 font-mono-data"
                  placeholder="officer@suraksha.com"
                  required
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-muted-foreground text-xs font-mono-data tracking-wider uppercase block">Passcode</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-input/50 border border-border text-foreground text-[15px] pl-4 pr-12 py-3.5 rounded-md focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50 font-mono-data tracking-widest"
                    placeholder="••••••••"
                    required
                  />
                  <button 
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
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
                className="w-full bg-primary text-primary-foreground font-semibold text-[15px] px-4 py-3.5 rounded-md hover:bg-primary/90 transition-all duration-200 flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-wait font-mono-data tracking-wider uppercase shadow-lg shadow-primary/20"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin"></div>
                ) : (
                  <>
                    Establish Connection <ArrowRight size={16} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

    </div>
  );
}