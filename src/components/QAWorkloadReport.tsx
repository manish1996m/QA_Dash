import React, { useMemo, useState } from 'react';
import { BarChart3, Clock, AlertCircle, TrendingUp, Calendar, Monitor, Smartphone, ExternalLink, FileText } from 'lucide-react';
import { Bug } from '../types';
import { cn } from '../utils/cn';
import { GlowWrapper } from '../components/GlowWrapper';
import { subDays, isAfter, parseISO, differenceInDays } from 'date-fns';
import { getPeriodicLink, PRIORITIES } from '../utils/openProjectLinks';
import { ExportWorkloadModal } from './ExportWorkloadModal';

interface QAWorkloadReportProps {
  bugs: Bug[];
}

export function QAWorkloadReport({ bugs }: QAWorkloadReportProps) {
  const [exportType, setExportType] = useState<'weekly' | 'monthly' | null>(null);
  const now = new Date();
  const sevenDaysAgo = subDays(now, 7);
  const thirtyDaysAgo = subDays(now, 30);

  const stats = useMemo(() => {
    const weeklyBugs = bugs.filter(b => isAfter(parseISO(b.createdAt), sevenDaysAgo));
    const monthlyBugs = bugs.filter(b => isAfter(parseISO(b.createdAt), thirtyDaysAgo));

    const calculatePlatformStats = (bugsList: Bug[]) => ({
      total: bugsList.length,
      android: bugsList.filter(b => b.platform === 'Android').length,
      ios: bugsList.filter(b => b.platform === 'iOS').length,
      hp: bugsList.filter(b => b.priority === 'High').length,
      mp: bugsList.filter(b => b.priority === 'Medium').length,
      lp: bugsList.filter(b => b.priority === 'Low' || b.priority === 'Normal').length,
      hpAndroid: bugsList.filter(b => b.priority === 'High' && b.platform === 'Android').length,
      hpIos: bugsList.filter(b => b.priority === 'High' && b.platform === 'iOS').length,
      mpAndroid: bugsList.filter(b => b.priority === 'Medium' && b.platform === 'Android').length,
      mpIos: bugsList.filter(b => b.priority === 'Medium' && b.platform === 'iOS').length,
      lpAndroid: bugsList.filter(b => (b.priority === 'Low' || b.priority === 'Normal') && b.platform === 'Android').length,
      lpIos: bugsList.filter(b => (b.priority === 'Low' || b.priority === 'Normal') && b.platform === 'iOS').length,
    });

    const tatViolations = monthlyBugs.filter(b => {
      const daysOld = differenceInDays(now, parseISO(b.createdAt));
      if (b.priority === 'High' && daysOld > 3) return true;
      if (b.priority === 'Medium' && daysOld > 7) return true;
      if ((b.priority === 'Low' || b.priority === 'Normal') && daysOld > 15) return true;
      return false;
    }).map(b => ({
      ...b,
      daysOld: differenceInDays(now, parseISO(b.createdAt))
    }));

    // New TAT summary breakdown for leadership reporting
    const calculateTatSummary = (vios: any[]) => ({
      android: {
        hp: vios.filter(b => b.platform === 'Android' && b.priority === 'High').length,
        mp: vios.filter(b => b.platform === 'Android' && b.priority === 'Medium').length,
        lp: vios.filter(b => b.platform === 'Android' && (b.priority === 'Low' || b.priority === 'Normal')).length,
      },
      ios: {
        hp: vios.filter(b => b.platform === 'iOS' && b.priority === 'High').length,
        mp: vios.filter(b => b.platform === 'iOS' && b.priority === 'Medium').length,
        lp: vios.filter(b => b.platform === 'iOS' && (b.priority === 'Low' || b.priority === 'Normal')).length,
      }
    });

    return {
      weekly: calculatePlatformStats(weeklyBugs),
      monthly: calculatePlatformStats(monthlyBugs),
      tatViolations: tatViolations.sort((a, b) => b.daysOld - a.daysOld),
      tatSummary: calculateTatSummary(tatViolations)
    };
  }, [bugs]);

  const StatCard = ({ title, value, subValue, icon: Icon, colorClass, period, link }: any) => (
    <GlowWrapper className="bg-white p-5 rounded-2xl border border-black/[0.05] shadow-sm flex flex-col gap-4 relative group">
      {link && (
        <a 
          href={link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-50 text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:text-im-blue hover:bg-im-blue/5"
          title="Open in OpenProject"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
      <div className="flex items-center justify-between">
        <div className={cn("p-2.5 rounded-xl bg-slate-50", colorClass)}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded-md">{period}</span>
      </div>
      <div>
        <h3 className="text-3xl font-black text-slate-800 tracking-tighter">{value}</h3>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-1">{title}</p>
      </div>
      <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-emerald-500" />
          <span className="text-[10px] font-black text-slate-700">{subValue}</span>
        </div>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Live Output</span>
      </div>
    </GlowWrapper>
  );

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Top Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-im-blue/10 rounded-lg text-im-blue">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Productivity Overview</h2>
          </div>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Real-time tracking of bug raising velocity and team output across platforms.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setExportType('weekly')}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-200 transition-all group"
          >
            <Calendar className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Copy Weekly Report
          </button>
          <button 
            onClick={() => setExportType('monthly')}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 group"
          >
            <BarChart3 className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Copy Monthly Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Weekly', val: stats.weekly.total, icon: Calendar },
          { label: 'Monthly', val: stats.monthly.total, icon: BarChart3 },
          { label: 'Android', val: stats.monthly.android, icon: Smartphone },
          { label: 'iOS', val: stats.monthly.ios, icon: Monitor },
        ].map((s) => (
          <div key={s.label} className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex flex-col items-center justify-center gap-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{s.label}</span>
            <span className="text-lg font-black text-slate-800">{s.val}</span>
          </div>
        ))}
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="HP Bugs Raised" 
          value={stats.weekly.hp} 
          subValue={`${stats.weekly.hpAndroid} A / ${stats.weekly.hpIos} i`}
          icon={TrendingUp} 
          colorClass="text-rose-500 bg-rose-50"
          period="Weekly"
          link={getPeriodicLink('Android', '7', PRIORITIES.HIGH)}
        />
        <StatCard 
          title="MP Bugs Raised" 
          value={stats.weekly.mp} 
          subValue={`${stats.weekly.mpAndroid} A / ${stats.weekly.mpIos} i`}
          icon={TrendingUp} 
          colorClass="text-amber-500 bg-amber-50"
          period="Weekly"
          link={getPeriodicLink('Android', '7', PRIORITIES.MEDIUM)}
        />
        <StatCard 
          title="LP Bugs Raised" 
          value={stats.weekly.lp} 
          subValue={`${stats.weekly.lpAndroid} A / ${stats.weekly.lpIos} i`}
          icon={TrendingUp} 
          colorClass="text-emerald-500 bg-emerald-50"
          period="Weekly"
          link={getPeriodicLink('Android', '7', PRIORITIES.LOW)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Total Raising" 
          value={stats.monthly.total} 
          subValue={`${stats.monthly.android} Android / ${stats.monthly.ios} iOS`}
          icon={BarChart3} 
          colorClass="text-im-blue bg-im-blue/5"
          period="Monthly"
          link={getPeriodicLink('Android', '30')}
        />
        <StatCard 
          title="HP Velocity" 
          value={stats.monthly.hp} 
          subValue={`${stats.monthly.hpAndroid} A / ${stats.monthly.hpIos} i`}
          icon={TrendingUp} 
          colorClass="text-rose-600 bg-rose-50/50"
          period="Monthly"
          link={getPeriodicLink('Android', '30', PRIORITIES.HIGH)}
        />
        <StatCard 
          title="TAT Governance" 
          value={stats.tatViolations.length} 
          subValue="Violations Found"
          icon={Clock} 
          colorClass="text-rose-700 bg-rose-100/50"
          period={stats.tatViolations.length > 0 ? "Critical" : "Healthy"}
        />
      </div>

      {/* TAT Violation Table (Scoped to Monthly) */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-black text-slate-800 uppercase tracking-tight">TAT Red Zone (Bugs Raised in Last 30 Days)</span>
          </div>
          <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 animate-pulse">
            Needs Attention
          </span>
        </div>

        <GlowWrapper className="bg-white rounded-2xl border border-black/[0.05] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Bug Title</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Platform</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Priority</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Age (Days)</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stats.tatViolations.length > 0 ? (
                  stats.tatViolations.map((bug) => {
                    const limit = bug.priority === 'High' ? 3 : bug.priority === 'Medium' ? 7 : 15;
                    return (
                      <tr key={bug.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 font-bold text-slate-700 text-sm max-w-xs truncate">{bug.title}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[9px] font-black uppercase",
                            bug.platform === 'Android' ? "bg-green-50 text-green-600" : "bg-blue-50 text-im-blue"
                          )}>
                            {bug.platform}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[9px] font-black uppercase",
                            bug.priority === 'High' ? "bg-rose-50 text-rose-600" : 
                            bug.priority === 'Medium' ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                          )}>
                            {bug.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-rose-600">{bug.daysOld}d</span>
                            {bug.daysOld > limit * 2 && <TrendingUp className="w-3 h-3 text-rose-600 animate-bounce" />}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{limit} Days Max</span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">
                      Excellent! No TAT violations in last 30 days.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlowWrapper>
      </div>

      {exportType && (
        <ExportWorkloadModal 
          stats={stats} 
          type={exportType}
          onClose={() => setExportType(null)} 
        />
      )}
    </div>
  );
}
