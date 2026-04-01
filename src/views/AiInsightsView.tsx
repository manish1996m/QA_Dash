import React from 'react';
import { motion } from 'motion/react';
import { BrainCircuit, RefreshCw, Zap, ShieldAlert } from 'lucide-react';
import Markdown from 'react-markdown';
import { cn } from '../utils/cn';
import { GlowWrapper } from '../components/GlowWrapper';

interface AiInsightsViewProps {
  insights: any;
  loading: boolean;
  onRefresh: () => void;
}

export function AiInsightsView({ insights, loading, onRefresh }: AiInsightsViewProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-8"
    >
      <GlowWrapper className="flex items-center justify-between bg-white p-5 rounded-xl border border-black/[0.08] shadow-soft">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-im-teal/10 rounded-xl border border-im-teal/20 text-im-teal">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Gemini QA Intelligence</h3>
            <p className="text-[11px] text-slate-400 font-medium">AI-powered analysis of your QA ecosystem</p>
          </div>
        </div>
        <button 
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-im-blue text-white rounded-lg font-bold uppercase tracking-wider text-[10px] hover:bg-im-blue-light transition-all duration-200 disabled:opacity-50 shadow-sm active:scale-95"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Regenerate
        </button>
      </GlowWrapper>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-xl border border-dashed border-slate-200 gap-6 shadow-sm">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-im-teal/10 rounded-full animate-spin" />
            <div className="w-16 h-16 border-4 border-t-im-teal rounded-full animate-spin absolute top-0 left-0" />
            <div className="absolute inset-0 flex items-center justify-center">
              <BrainCircuit className="w-8 h-8 text-im-teal animate-pulse" />
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-slate-800 mb-1">Analyzing Bug Patterns...</div>
            <div className="text-[11px] text-slate-400 font-medium max-w-xs mx-auto">Gemini is processing your QA data to identify bottlenecks and risks</div>
          </div>
        </div>
      ) : insights ? (
        <div className="grid grid-cols-12 gap-6">
          {/* Summary Cards */}
          <GlowWrapper className="col-span-12 lg:col-span-4 p-6 bg-im-blue text-white rounded-xl shadow-sm relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <Zap className="w-8 h-8 mb-4 opacity-40" />
            <h4 className="text-[10px] uppercase font-bold tracking-wider opacity-70 mb-1">Key Bottleneck</h4>
            <p className="text-xl font-bold leading-tight tracking-tight">{insights.bottleneck || "No major bottlenecks detected"}</p>
          </GlowWrapper>

          <GlowWrapper className="col-span-12 lg:col-span-4 p-6 bg-white border border-black/[0.08] rounded-xl shadow-soft hover:shadow-hover transition-all duration-200">
            <ShieldAlert className="w-8 h-8 mb-4 text-im-red opacity-40" />
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Risk Level</h4>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold text-slate-800 tracking-tight">{insights.riskLevel || "Low"}</div>
              <div className="flex gap-1">
                {[1, 2, 3].map(i => (
                  <div 
                    key={i} 
                    className={cn(
                      "w-2 h-6 rounded-full transition-all duration-500", 
                      i <= (insights.riskScore || 1) ? "bg-im-red shadow-sm" : "bg-slate-100"
                    )} 
                  />
                ))}
              </div>
            </div>
          </GlowWrapper>

          <GlowWrapper className="col-span-12 lg:col-span-4 p-6 bg-white border border-black/[0.08] rounded-xl shadow-soft hover:shadow-hover transition-all duration-200">
            <RefreshCw className="w-8 h-8 mb-4 text-im-blue opacity-40" />
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Trend Analysis</h4>
            <div className="text-2xl font-bold text-slate-800 tracking-tight">{insights.trend || "Stable"}</div>
          </GlowWrapper>

          {/* Detailed Analysis */}
          <GlowWrapper className="col-span-12 bg-white border border-black/[0.08] rounded-xl p-8 shadow-soft">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 bg-im-teal rounded-full" />
              <h4 className="text-xl font-bold tracking-tight text-slate-800">Detailed Analysis</h4>
            </div>
            <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed font-medium">
              <div className="markdown-body text-sm">
                <Markdown>{insights.analysis || "No analysis available"}</Markdown>
              </div>
            </div>
          </GlowWrapper>

          {/* Recommendations */}
          <div className="col-span-12">
            <div className="flex items-center gap-3 mb-4">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Strategic Recommendations</h4>
              <div className="h-px flex-1 bg-slate-100" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {insights.recommendations?.map((rec: string, i: number) => (
                <div key={i} className="p-5 bg-white border border-black/[0.08] rounded-xl hover:border-im-teal/30 transition-all duration-200 shadow-sm hover:shadow-hover group">
                  <div className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100 text-im-teal font-bold mb-4 group-hover:bg-im-teal group-hover:text-white transition-all duration-200">
                    {i + 1}
                  </div>
                  <p className="text-xs font-bold text-slate-700 leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-24 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/30">
          <Zap className="w-16 h-16 text-slate-200 mx-auto mb-6" />
          <div className="text-xl font-extrabold text-slate-400 mb-2">No insights generated yet</div>
          <p className="text-sm text-slate-300 font-medium">Click the button above to start AI-powered analysis of your QA data.</p>
        </div>
      )}
    </motion.div>
  );
}
