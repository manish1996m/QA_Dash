import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Smartphone, 
  Apple, 
  AlertCircle, 
  ChevronRight, 
  ExternalLink,
  RefreshCw,
  Zap
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { Bug, Platform } from '../types';
import { DashboardData, PROJECTS, PRIORITIES, MODULE_CATEGORY_MAPPINGS, BugSnapshot } from '../services/openProject';
import { getModuleLinks, getGlobalLink } from '../utils/openProjectLinks';
import { MODULES } from '../constants';
import { calculateTATExceeded } from '../utils/tat';
import { cn } from '../utils/cn';
import { StatCard } from '../components/StatCard';
import { GlowWrapper } from '../components/GlowWrapper';
import { format, subDays, startOfDay, isBefore, parseISO, isSameDay } from 'date-fns';
import { getQAInsights, isAiCircuitBroken } from '../services/gemini';
import { BugTrendChart } from '../components/BugTrendChart';

interface ManagementViewProps {
  bugs: Bug[];
  stats: any;
  dashboardData: DashboardData | null;
  snapshots: BugSnapshot[];
  aiInsights: any;
}

export function ManagementView({ bugs, stats, dashboardData, snapshots, aiInsights: globalAiInsights }: ManagementViewProps) {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [trendDays, setTrendDays] = useState<7 | 15 | 30>(15);
  
  // New state for Release-specific analysis
  const [selectedProject, setSelectedProject] = useState<Platform | 'All'>('All');
  const [selectedRelease, setSelectedRelease] = useState<string>('All');
  const [localAiInsights, setLocalAiInsights] = useState<any>(null);
  const [localAiLoading, setLocalAiLoading] = useState(false);

  // Extract unique release cycles filtered by project
  const availableReleases = useMemo(() => {
    const releases = new Set<string>();
    bugs.forEach(b => {
      // Only include versions for the currently selected project (if not All)
      const projectMatch = selectedProject === 'All' || b.platform === selectedProject;
      if (projectMatch && b.version && b.version !== 'None') {
        const match = b.version.match(/(\d+\.\d+\.\d+)/);
        if (match) {
          releases.add(match[1]);
        } else {
          releases.add(b.version);
        }
      }
    });
    return Array.from(releases).sort().reverse();
  }, [bugs, selectedProject]);

  // Combined filtered bugs for AI analysis
  const filteredBugs = useMemo(() => {
    return bugs.filter(b => {
      const projectMatch = selectedProject === 'All' || b.platform === selectedProject;
      const releaseMatch = selectedRelease === 'All' || (b.version && b.version.includes(selectedRelease));
      return projectMatch && releaseMatch;
    });
  }, [bugs, selectedProject, selectedRelease]);

  // FALLBACK: Calculate a base mathematical score alignment with rubric
  // We make this a memo so it reacts INSTANTLY to filter changes
  const calculatedScore = useMemo(() => {
    const highCount = filteredBugs.filter(b => b.priority === 'High').length;
    const medCount = filteredBugs.filter(b => b.priority === 'Medium').length;
    const lowCount = filteredBugs.filter(b => b.priority === 'Low' || b.priority === 'Normal').length;
    const total = filteredBugs.length;

    if (total === 0) return 100;
    
    // Strict Rubric: Even 1 HIGH bug drops score below 50%
    if (highCount > 0) {
      return Math.max(5, 45 - (highCount * 5) - (medCount * 2));
    }
    
    if (medCount > 15) return 48;
    if (medCount > 5) return Math.max(50, 74 - (medCount - 5) * 2 - (lowCount * 0.1));
    if (medCount > 0) return Math.max(75, 89 - (medCount * 2) - (lowCount * 0.1));
    return Math.max(90, 99 - (lowCount * 0.5));
  }, [filteredBugs]);

  const activeAiInsights = useMemo(() => {
    // If we have local AI results for the current selection, use them
    if (localAiInsights?.readinessScore !== undefined) return localAiInsights;
    
    // If we are looking at "All" and have global insights, use them
    if (selectedProject === 'All' && selectedRelease === 'All' && globalAiInsights?.readinessScore !== undefined) {
      return globalAiInsights;
    }
    
    // Otherwise, use the mathematical fallback
    return {
      readinessScore: Math.round(calculatedScore),
      isFallback: true,
      reasoning: "Calculated based on current bug priorities and volume.",
      riskLevel: calculatedScore >= 80 ? "Low" : calculatedScore >= 50 ? "Medium" : "High"
    };
  }, [localAiInsights, globalAiInsights, calculatedScore, selectedProject, selectedRelease]);

  const handleRefineAnalysis = useCallback(async () => {
    if (selectedProject === 'All' && selectedRelease === 'All') {
      setLocalAiInsights(null);
      return;
    }
    
    if (isAiCircuitBroken()) {
      setLocalAiLoading(false);
      return;
    }

    setLocalAiLoading(true);
    try {
      const releaseContext = selectedRelease !== 'All' 
        ? `${selectedProject === 'All' ? '' : selectedProject} Release ${selectedRelease}`.trim()
        : selectedProject !== 'All' ? `${selectedProject} Project` : undefined;
        
      const insights = await getQAInsights(filteredBugs, snapshots, releaseContext, calculatedScore);
      if (insights && insights.readinessScore !== undefined) {
        setLocalAiInsights(insights);
      }
    } catch (error) {
      console.error('Refine failed:', error);
    } finally {
      setLocalAiLoading(false);
    }
  }, [selectedProject, selectedRelease, filteredBugs, snapshots, calculatedScore]);

  // Auto-trigger analysis when filters change (with small debounce)
  useEffect(() => {
    if (selectedProject === 'All' && selectedRelease === 'All') {
      setLocalAiInsights(null);
      return;
    }

    if (isAiCircuitBroken()) return;

    const timer = setTimeout(() => {
      handleRefineAnalysis();
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedProject, selectedRelease, handleRefineAnalysis]);

  // Generate trend data based on selected range
  const chartData = useMemo(() => {
    if (snapshots && snapshots.length > 1) {
      // Return last N days of snapshots
      return snapshots.slice(-trendDays);
    }
    
    // Fallback: Bug Arrival Trend
    const fallback = [];
    const now = new Date();
    for (let i = trendDays - 1; i >= 0; i--) {
      const date = startOfDay(subDays(now, i));
      const bugsUntilThen = bugs.filter(b => {
        const createdDate = parseISO(b.createdAt);
        return isBefore(createdDate, date) || isSameDay(createdDate, date);
      });
      
      fallback.push({
        timestamp: date.toISOString(),
        total_count: bugsUntilThen.length,
        high_priority_count: bugsUntilThen.filter(b => b.priority === 'High').length,
        medium_priority_count: bugsUntilThen.filter(b => b.priority === 'Medium').length,
        low_priority_count: bugsUntilThen.filter(b => b.priority === 'Low' || b.priority === 'Normal').length,
      });
    }
    return fallback;
  }, [snapshots, bugs, trendDays]);

  const priorityData = [
    { name: 'High', value: bugs.filter(b => b.priority === 'High').length, color: '#d32f2f' },
    { name: 'Medium', value: bugs.filter(b => b.priority === 'Medium').length, color: '#f59e0b' },
    { name: 'Low', value: bugs.filter(b => b.priority === 'Low').length, color: '#00a699' },
    { name: 'Normal', value: bugs.filter(b => b.priority === 'Normal').length, color: '#94a3b8' },
  ];

  const platformData = [
    { name: 'Android', bugs: stats.android },
    { name: 'iOS', bugs: stats.ios },
  ];

  const moduleData = MODULES.map(m => {
    const moduleStats = dashboardData?.moduleStats[m];
    const count = (moduleStats?.Android.hp_mp_count || 0) + 
                  (moduleStats?.Android.low_count || 0) + 
                  (moduleStats?.iOS.hp_mp_count || 0) + 
                  (moduleStats?.iOS.low_count || 0);
    
    return {
      name: m,
      count: count,
      bugs: [
        ...(moduleStats?.Android.bugs || []),
        ...(moduleStats?.iOS.bugs || [])
      ]
    };
  }).sort((a, b) => b.count - a.count);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Android Pending" 
          value={stats.android} 
          icon={<Smartphone className="w-4 h-4" />} 
          link={getGlobalLink('Android')}
        />
        <StatCard 
          label="iOS Pending" 
          value={stats.ios} 
          icon={<Apple className="w-4 h-4" />} 
          link={getGlobalLink('iOS')}
        />
        <StatCard 
          label="Android High Priority" 
          value={stats.androidHigh} 
          icon={<AlertCircle className="w-4 h-4" />} 
          link={getGlobalLink('Android', true)}
          variant="danger"
        />
        <StatCard 
          label="iOS High Priority" 
          value={stats.iosHigh} 
          icon={<AlertCircle className="w-4 h-4" />} 
          link={getGlobalLink('iOS', true)}
          variant="danger"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <BugTrendChart 
            snapshots={snapshots}
            bugs={bugs}
            trendDays={trendDays}
            onTrendDaysChange={setTrendDays}
          />
        </div>

        <div className="lg:col-span-4">
          <GlowWrapper glowColor={activeAiInsights?.readinessScore >= 80 ? "rgba(16, 185, 129, 0.4)" : activeAiInsights?.readinessScore >= 50 ? "rgba(245, 158, 11, 0.4)" : "rgba(239, 68, 68, 0.4)"} className="bg-white p-6 rounded-2xl border border-black/[0.08] shadow-soft h-full flex flex-col">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className={cn(
                    "w-4 h-4",
                    isAiCircuitBroken() ? "text-rose-500" : ((activeAiInsights?.readinessScore || 0) >= 80 ? "text-emerald-500" : (activeAiInsights?.readinessScore || 0) >= 50 ? "text-amber-500" : "text-rose-500")
                  )} />
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">AI Release Readiness</h3>
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Version-Specific Impact</p>
              </div>
              <button 
                onClick={handleRefineAnalysis}
                disabled={localAiLoading || isAiCircuitBroken() || (selectedProject === 'All' && selectedRelease === 'All' && !!globalAiInsights)}
                className={cn(
                  "p-2 rounded-xl transition-all duration-300 border shadow-sm flex items-center gap-2 group",
                  localAiLoading ? "bg-slate-50 text-slate-300 border-slate-100" : 
                  isAiCircuitBroken() ? "bg-slate-50 text-rose-300 border-slate-100 italic" : "bg-im-blue text-white border-im-blue hover:shadow-md active:scale-95"
                )}
              >
                <RefreshCw className={cn("w-3.5 h-3.5", localAiLoading && "animate-spin")} />
                <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
                  {localAiLoading ? 'Analyzing...' : isAiCircuitBroken() ? 'Suspended' : 'Recalculate'}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Project</label>
                <select 
                  value={selectedProject}
                  onChange={(e) => {
                    const newProject = e.target.value as any;
                    setSelectedProject(newProject);
                    setSelectedRelease('All');
                    setLocalAiInsights(null);
                  }}
                  className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-im-blue/20 transition-all appearance-none cursor-pointer hover:bg-slate-100"
                >
                  <option value="All">All Projects</option>
                  <option value="Android">Android</option>
                  <option value="iOS">iOS</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Release Cycle</label>
                <select 
                  value={selectedRelease}
                  onChange={(e) => {
                    setSelectedRelease(e.target.value);
                    setLocalAiInsights(null);
                  }}
                  className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-im-blue/20 transition-all appearance-none cursor-pointer hover:bg-slate-100"
                >
                  <option value="All">All Releases</option>
                  {availableReleases.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="absolute w-full h-full transform -rotate-90">
                  <circle cx="88" cy="88" r="76" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-50" />
                  <circle 
                    cx="88" cy="88" r="76" 
                    stroke="currentColor" strokeWidth="12" 
                    fill="transparent" 
                    strokeDasharray={477}
                    strokeDashoffset={477 - (477 * (localAiLoading ? 0 : (activeAiInsights?.readinessScore ?? 0))) / 100}
                    strokeLinecap="round"
                    className={cn(
                      "transition-all duration-1000",
                      isAiCircuitBroken() ? "text-slate-200" : ((activeAiInsights?.readinessScore || 0) >= 80 ? "text-emerald-500" : (activeAiInsights?.readinessScore || 0) >= 50 ? "text-amber-500" : "text-rose-500"),
                      localAiLoading && "opacity-20 animate-pulse"
                    )}
                  />
                </svg>
                <div className="flex flex-col items-center z-10">
                  {localAiLoading ? (
                    <div className="flex flex-col items-center">
                      <RefreshCw className="w-8 h-8 text-im-blue animate-spin mb-2" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Analyzing</span>
                    </div>
                  ) : (
                    <>
                      <span className={cn(
                        "text-5xl font-black tracking-tighter leading-none",
                        isAiCircuitBroken() ? "text-rose-600" : ((activeAiInsights?.readinessScore || 0) >= 80 ? "text-emerald-600" : (activeAiInsights?.readinessScore || 0) >= 50 ? "text-amber-600" : "text-rose-600")
                      )}>
                        {isAiCircuitBroken() ? '!' : (activeAiInsights?.readinessScore !== undefined ? `${activeAiInsights.readinessScore}%` : '--')}
                      </span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                        {isAiCircuitBroken() ? 'Suspended' : 'Ready'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-8 px-4 text-center w-full">
                <p className="text-xs font-bold text-slate-700 leading-relaxed italic min-h-[48px] flex items-center justify-center">
                  {localAiLoading ? (
                    <span className="text-slate-400 animate-pulse">Consulting AI for impact analysis...</span>
                  ) : (
                    <span>
                      "{isAiCircuitBroken() ? "AI Gateway Suspended (20+ Failures). Refresh page to reset." : 
                        (activeAiInsights?.readinessScore >= 80 ? "Release risk is minimal. Proceed." : 
                        activeAiInsights?.readinessScore >= 50 ? "Stabilization in progress. Monitor closely." : 
                        activeAiInsights?.readinessScore < 50 ? "Significant High/Med risk detected." : 
                        "Select version to begin analysis.")}"
                    </span>
                  )}
                </p>
              </div>
            </div>
          </GlowWrapper>
        </div>
      </div>
      {/* ... Rest of the component remains same ... */}
    </div>
  );
}
