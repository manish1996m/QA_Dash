import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Smartphone, 
  Apple, 
  AlertCircle, 
  ChevronRight, 
  ExternalLink,
  RefreshCw,
  Zap,
  Timer
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
import { motion, AnimatePresence } from 'framer-motion';
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

  // Combined filtered bugs for AI analysis (STRICTLY PENDING)
  const filteredBugs = useMemo(() => {
    return bugs.filter(b => {
      const projectMatch = selectedProject === 'All' || b.platform === selectedProject;
      const releaseMatch = selectedRelease === 'All' || (b.version && b.version.includes(selectedRelease));
      // Only keep truly pending bugs (excludes "In Testing" and anything else mapped during sync)
      const statusMatch = b.status === 'Pending';
      return projectMatch && releaseMatch && statusMatch;
    });
  }, [bugs, selectedProject, selectedRelease]);



  // FALLBACK: Calculate a base mathematical score alignment with rubric
  // We make this a memo so it reacts INSTANTLY to filter changes
  const releaseStats = useMemo(() => {
    const high = filteredBugs.filter(b => b.priority === 'High').length;
    const med = filteredBugs.filter(b => b.priority === 'Medium').length;
    const low = filteredBugs.filter(b => b.priority === 'Low' || b.priority === 'Normal').length;
    const total = filteredBugs.length;

    let score = 100;
    if (total > 0) {
      if (high > 0) {
        score = Math.max(5, 45 - (high * 5) - (med * 2));
      } else if (med > 15) {
        score = 48;
      } else if (med > 5) {
        score = Math.max(50, 74 - (med - 5) * 2 - (low * 0.1));
      } else if (med > 0) {
        score = Math.max(75, 89 - (med * 2) - (low * 0.1));
      } else {
        score = Math.max(90, 99 - (low * 0.5));
      }
    }

    return {
      score: Math.round(score),
      pendingHM: high + med,
      high,
      med,
      low
    };
  }, [filteredBugs]);

  const calculatedScore = releaseStats.score;

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

  // Split data for 2-column masonry effect
  const leftCol = moduleData.filter((_, i) => i % 2 === 0);
  const rightCol = moduleData.filter((_, i) => i % 2 !== 0);

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
                      {isAiCircuitBroken() ? "AI Gateway Suspended (20+ Failures). Refresh page to reset." : 
                        (activeAiInsights?.readinessScore >= 80 ? "Release risk is minimal. Proceed." : 
                        activeAiInsights?.readinessScore >= 50 ? "Stabilization in progress. Monitor closely." : 
                        activeAiInsights?.readinessScore < 50 ? "Significant High/Med risk detected." : 
                        "Select version to begin analysis.")}
                    </span>
                  )}
                </p>
              </div>

              {/* Version-Specific Bug Counts - Adjusted to User's Stricter H/M Focus */}
              <div className="mt-6 pt-6 border-t border-slate-100 w-full">
                <div className="flex flex-col items-center p-4 rounded-2xl bg-rose-50/50 border border-rose-100/50 transition-all hover:shadow-sm group/stat w-full">
                  <span className="text-[10px] font-black text-rose-400 uppercase tracking-[0.15em] mb-1 group-hover/stat:text-rose-500 transition-colors text-center">Pending High / Med</span>
                  <span className="text-4xl font-black text-rose-600 tabular-nums tracking-tighter leading-none">{releaseStats.pendingHM}</span>
                </div>
              </div>
            </div>
          </GlowWrapper>
        </div>
      </div>

      {/* Module-wise Status Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-im-blue/10 rounded-lg text-im-blue">
              <Zap className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Module-wise Status</h2>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
            {moduleData.length} Active Modules
          </span>
        </div>

        {/* Dynamic 2-column flex layout (Masonry effect) */}
        <div className="flex flex-col md:flex-row gap-4 items-start">
          {[leftCol, rightCol].map((column, colIdx) => (
            <div key={colIdx} className="flex-1 flex flex-col gap-4 w-full">
              {column.map((module) => (
                <GlowWrapper 
                  key={module.name} 
                  className="bg-white rounded-2xl border border-black/[0.08] shadow-soft hover:shadow-hover transition-all duration-300 overflow-hidden shrink-0"
                >
                  <div 
                    onClick={() => setExpandedModule(expandedModule === module.name ? null : module.name)}
                    className="p-5 cursor-pointer hover:bg-slate-50/50 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 border shadow-sm",
                          expandedModule === module.name 
                            ? "bg-im-blue text-white border-im-blue rotate-90" 
                            : "bg-slate-50 border-slate-100 text-slate-400 group-hover:text-im-blue"
                        )}>
                          <ChevronRight className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-base font-black text-slate-800 tracking-tight">{module.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Stability Index</span>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(i => (
                                <div 
                                  key={i} 
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    i <= (module.count > 10 ? 2 : module.count > 5 ? 3 : 5) 
                                      ? (module.count > 10 ? "bg-rose-500" : module.count > 5 ? "bg-amber-500" : "bg-emerald-500") 
                                      : "bg-slate-100"
                                  )} 
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xl font-black text-slate-800 tabular-nums">{module.count}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Bugs</span>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {expandedModule === module.name && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        {(() => {
                          const ms = dashboardData?.moduleStats[module.name];
                          const androidLinks = getModuleLinks(module.name, 'Android');
                          const iosLinks    = getModuleLinks(module.name, 'iOS');
                          const aHpMp  = ms?.Android.hp_mp_count || 0;
                          const aLow   = ms?.Android.low_count   || 0;
                          const iHpMp  = ms?.iOS.hp_mp_count     || 0;
                          const iLow   = ms?.iOS.low_count        || 0;
                          
                          const aBugs  = ms?.Android.bugs || [];
                          const iBugs  = ms?.iOS.bugs     || [];
                          const aTatHigh   = calculateTATExceeded(aBugs, 'High');
                          const aTatMedium = calculateTATExceeded(aBugs, 'Medium');
                          const aTatLow    = calculateTATExceeded(aBugs, 'Low');
                          const iTatHigh   = calculateTATExceeded(iBugs, 'High');
                          const iTatMedium = calculateTATExceeded(iBugs, 'Medium');
                          const iTatLow    = calculateTATExceeded(iBugs, 'Low');

                          const LinkItem = ({ href, label, value, color }: { href: string; label: string; value: number; color: string }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer"
                              className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-100 bg-white hover:border-im-blue/20 hover:shadow-sm transition-all group/link">
                              <span className="text-[11px] font-bold text-slate-500 group-hover/link:text-slate-700 transition-colors uppercase tracking-tight">{label}</span>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-black tabular-nums ${color}`}>{value}</span>
                                <ExternalLink className="w-3 h-3 text-slate-300 group-hover/link:text-im-blue transition-colors" />
                              </div>
                            </a>
                          );

                          return (
                            <div className="border-t border-slate-50 bg-slate-50/20 p-5 space-y-6">
                              {/* Android Segment */}
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <div className="p-1 bg-green-50 rounded-md">
                                    <Smartphone className="w-3.5 h-3.5 text-green-500" />
                                  </div>
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Android Platform</span>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                  <LinkItem href={androidLinks.hp_mp} label="High+Med Priority" value={aHpMp} color="text-rose-600" />
                                  <LinkItem href={androidLinks.low} label="Low Priority" value={aLow} color="text-emerald-600" />
                                </div>
                              </div>

                              {/* iOS Segment */}
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <div className="p-1 bg-im-blue/5 rounded-md">
                                    <Apple className="w-3.5 h-3.5 text-im-blue" />
                                  </div>
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">iOS Native</span>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                  <LinkItem href={iosLinks.hp_mp} label="High+Med Priority" value={iHpMp} color="text-rose-600" />
                                  <LinkItem href={iosLinks.low} label="Low Priority" value={iLow} color="text-emerald-600" />
                                </div>
                              </div>

                              {/* TAT Exceeded Segment */}
                              {(aTatHigh + aTatMedium + aTatLow + iTatHigh + iTatMedium + iTatLow) > 0 && (
                                <div className="pt-2 border-t border-slate-100/50 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1 bg-rose-50 rounded-md">
                                      <Timer className="w-3.5 h-3.5 text-rose-500" />
                                    </div>
                                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">SLA Violations (TAT)</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1.5 ml-1">Android</p>
                                      <LinkItem href={androidLinks.tatHigh} label="High >3d" value={aTatHigh} color="text-rose-600" />
                                      <LinkItem href={androidLinks.tatMedium} label="Med >7d" value={aTatMedium} color="text-amber-600" />
                                      <LinkItem href={androidLinks.tatLow} label="Low >15d" value={aTatLow} color="text-slate-500" />
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1.5 ml-1">iOS</p>
                                      <LinkItem href={iosLinks.tatHigh} label="High >3d" value={iTatHigh} color="text-rose-600" />
                                      <LinkItem href={iosLinks.tatMedium} label="Med >7d" value={iTatMedium} color="text-amber-600" />
                                      <LinkItem href={iosLinks.tatLow} label="Low >15d" value={iTatLow} color="text-slate-500" />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GlowWrapper>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
