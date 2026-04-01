import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, ArrowRight, LayoutDashboard, Database, BarChart3, Zap } from 'lucide-react';

export function LoginView() {
  const handleLogin = () => {
    window.location.href = '/auth/google';
  };

  const currentUrl = new URLSearchParams(window.location.search);
  const error = currentUrl.get('error');

  return (
    <div className="min-h-screen bg-im-bg flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-im-blue/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-im-blue/10 rounded-full blur-[100px]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[1100px] grid lg:grid-cols-2 bg-white rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-black/[0.03] overflow-hidden relative z-10"
      >
        {/* Left Side: Branding and Visuals */}
        <div className="bg-im-blue p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden text-white">
          <div className="absolute inset-0 bg-gradient-to-br from-im-blue via-im-blue to-im-blue-light" />
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">QA Insight Dashboard</span>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-extrabold leading-[1.1] mb-6 tracking-tight">
              Real-time QA <br /> 
              Metrics & <br />
              Management.
            </h1>
            <p className="text-white/70 text-lg leading-relaxed max-w-md">
              The internal hub for IndiaMart QA teams to track, analyze, and optimize bug lifecycle.
            </p>
          </div>

          <div className="relative z-10 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Database, label: 'OpenProject Sync' },
                { icon: BarChart3, label: 'Visual Analytics' },
                { icon: Zap, label: 'AI QA Insights' },
                { icon: ShieldCheck, label: 'Secure Access' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 px-4 py-3 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
                  <item.icon className="w-4 h-4 text-white/60" />
                  <span className="text-xs font-semibold">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Login Action */}
        <div className="p-12 lg:p-20 flex flex-col justify-center items-center text-center">
          <div className="w-20 h-20 bg-im-blue/5 rounded-3xl flex items-center justify-center mb-8 border border-im-blue/10">
            <ShieldCheck className="w-10 h-10 text-im-blue" />
          </div>
          
          <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Welcome back</h2>
          <p className="text-slate-500 mb-10 leading-relaxed font-medium">
            Please sign in with your corporate account to <br /> access the IndiaMart QA ecosystem.
          </p>

          {error === 'unauthorized' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-semibold flex items-center gap-3"
            >
              <span className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Access restricted to @indiamart.com emails only.
            </motion.div>
          )}

          <button 
            onClick={handleLogin}
            className="group relative w-full max-w-sm flex items-center justify-center gap-4 bg-white hover:bg-slate-50 text-slate-800 py-4 px-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 active:scale-[0.98] font-bold tracking-tight"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Sign in with Google
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 group-hover:text-im-blue transition-all" />
          </button>

          <p className="mt-10 text-xs text-slate-400 font-medium">
            By signing in, you agree to follow IndiaMart's <br /> 
            internal Data Security and Privacy policies.
          </p>
        </div>
      </motion.div>
      
      {/* Footer Branding */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-slate-400 text-[11px] font-bold uppercase tracking-[0.2em] flex items-center gap-2">
        <div className="w-4 h-[1px] bg-slate-300" />
        IndiaMart InterMesh Ltd.
        <div className="w-4 h-[1px] bg-slate-300" />
      </div>
    </div>
  );
}
