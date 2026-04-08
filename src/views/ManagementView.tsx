import React, { useState, useMemo } from 'react';
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
import { getQAInsights } from '../services/gemini';

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

  // Use local insights if available (from specific selection), otherwise global
  const activeAiInsights = localAiInsights || globalAiInsights;

  const handleRefineAnalysis = React.useCallback(async () => {
    if (selectedProject === 'All' && selectedRelease === 'All') {
      setLocalAiInsights(null); // Reset to global
      return;
    }
    
    setLocalAiLoading(true);
    try {
      // Calculate a base mathematical score to guide the AI towards accuracy
      const highCount = filteredBugs.filter(b => b.priority === 'High').length;
      const medCount = filteredBugs.filter(b => b.priority === 'Medium').length;
      const lowCount = filteredBugs.filter(b => b.priority === 'Low' || b.priority === 'Normal').length;
      const total = filteredBugs.length;
      
      // Base Score logic: Start at 100. Subtract 30 per High, 10 per Medium.
      // Low bugs are minor, so only subtract 0.5 per bug.
      let baseScore = 100;
      if (total > 0) {
        baseScore = 100 - (highCount * 30) - (medCount * 10) - (lowCount * 0.5);
        
        // If no High/Medium bugs, the score should ideally be in the 90s
        if (highCount === 0 && medCount === 0) {
          baseScore = Math.max(90, baseScore);
        } else if (highCount === 0 && medCount <= 5) {
          // If 1-5 Medium bugs, keep it in the 75-89 range
          baseScore = Math.max(75, baseScore);
        }
        
        baseScore = Math.max(5, Math.min(100, Math.round(baseScore)));
      }

      const { getQAInsights } = await import('../services/gemini');
      const releaseContext = selectedRelease !== 'All' 
        ? `${selectedProject === 'All' ? '' : selectedProject} Release ${selectedRelease}`.trim()
        : selectedProject !== 'All' ? `${selectedProject} Project` : undefined;
        
      const insights = await getQAInsights(filteredBugs, snapshots, releaseContext, baseScore);
      setLocalAiInsights(insights);
    } catch (error) {
      console.error('Refine failed:', error);
    } finally {
      setLocalAiLoading(false);
    }
  }, [selectedProject, selectedRelease, filteredBugs, snapshots]);

  // Auto-trigger analysis when filters change (with small debounce)
  React.useEffect(() => {
    if (selectedProject === 'All' && selectedRelease === 'All') {
      setLocalAiInsights(null);
      return;
    }

    const timer = setTimeout(() => {
      handleRefineAnalysis();
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedProject, selectedRelease, handleRefineAnalysis]);

  // Generate fallback trend if snapshots are missing
  const chartData = useMemo(() => {
    if (snapshots && snapshots.length > 1) return snapshots;
    
    // Fallback: Bug Arrival Trend (how many currently pending bugs existed at each point in time)
    const fallback = [];
    const now = new Date();
    for (let i = 14; i >= 0; i--) {
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
  }, [snapshots, bugs]);

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
        {/* Historical Bug Trend Section (8/12) */}
        <div className="lg:col-span-8">
          {chartData && (
            <GlowWrapper className="bg-white p-4 md:p-8 rounded-2xl border border-black/[0.08] shadow-soft overflow-hidden group h-full">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-im-blue/5 rounded-2xl border border-im-blue/10 shrink-0">
                    <div className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm border border-black/[0.03]">
                      <RefreshCw className="w-4 h-4 text-im-blue animate-spin-slow" />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">
                      {snapshots.length > 1 ? 'Historical Bug Trend' : 'Pending Bug Arrival'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {snapshots.length > 1 ? 'Project Velocity & Burn-down' : '15-Day Arrival Growth'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 md:gap-8">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Daily Change</span>
                    <div className={cn(
                      "text-base font-black tabular-nums flex items-center gap-1.5",
                      chartData[chartData.length-1].total_count <= chartData[chartData.length-2].total_count 
                        ? "text-im-teal" 
                        : "text-im-red"
                    )}>
                      {chartData[chartData.length-1].total_count - chartData[chartData.length-2].total_count > 0 ? '+' : ''}
                      {chartData[chartData.length-1].total_count - chartData[chartData.length-2].total_count}
                    </div>
                  </div>
                  <div className="h-10 w-px bg-slate-100 hidden sm:block" />
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Current Trend</span>
                    <span className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-[9px] font-black text-slate-700 uppercase tracking-widest shadow-sm">
                      {chartData[chartData.length-1].total_count <= chartData[chartData.length-2].total_count ? 'Improving' : 'Degrading'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-[280px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(ts) => format(new Date(ts), 'MMM d')}
                      stroke="#94a3b8" 
                      fontSize={10} 
                      fontWeight="bold"
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      fontWeight="bold"
                      tickLine={false}
                      axisLine={false}
                      dx={-10}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        backdropFilter: 'blur(8px)', 
                        borderRadius: '16px', 
                        border: '1px solid rgba(0, 0, 0, 0.05)', 
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                        padding: '12px'
                      }}
                      labelFormatter={(label) => format(new Date(label), 'EEEE, MMMM d, yyyy')}
                      itemStyle={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 0' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="low_priority_count" 
                      stackId="1"
                      stroke="#10b981" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorLow)" 
                      name="Low Priority"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="medium_priority_count" 
                      stackId="1"
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorMedium)" 
                      name="Medium Priority"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="high_priority_count" 
                      stackId="1"
                      stroke="#ef4444" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorHigh)" 
                      name="High Priority"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              {snapshots.length <= 1 && (
                <div className="mt-4 p-3 bg-im-blue/5 rounded-xl border border-im-blue/10 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-im-blue" />
                  <span className="text-[10px] font-bold text-im-blue uppercase tracking-wider">
                    Note: Showing arrival trend as historical snapshots are currently being collected.
                  </span>
                </div>
              )}
            </GlowWrapper>
          )}
        </div>

        {/* AI Release Readiness Gauge (4/12) */}
        <div className="lg:col-span-4">
          <GlowWrapper glowColor={activeAiInsights?.readinessScore >= 80 ? "rgba(16, 185, 129, 0.4)" : activeAiInsights?.readinessScore >= 50 ? "rgba(245, 158, 11, 0.4)" : "rgba(239, 68, 68, 0.4)"} className="bg-white p-6 rounded-2xl border border-black/[0.08] shadow-soft h-full flex flex-col">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className={cn(
                    "w-4 h-4",
                    (activeAiInsights?.readinessScore || 0) >= 80 ? "text-emerald-500" : (activeAiInsights?.readinessScore || 0) >= 50 ? "text-amber-500" : "text-rose-500"
                  )} />
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">AI Release Readiness</h3>
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Version-Specific Impact</p>
              </div>
              <button 
                onClick={handleRefineAnalysis}
                disabled={localAiLoading || (selectedProject === 'All' && selectedRelease === 'All' && !!globalAiInsights)}
                className={cn(
                  "p-2 rounded-xl transition-all duration-300 border shadow-sm flex items-center gap-2 group",
                  localAiLoading ? "bg-slate-50 text-slate-300 border-slate-100" : "bg-im-blue text-white border-im-blue hover:shadow-md active:scale-95"
                )}
              >
                <RefreshCw className={cn("w-3.5 h-3.5", localAiLoading && "animate-spin")} />
                <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
                  {localAiLoading ? 'Analyzing...' : 'Recalculate'}
                </span>
              </button>
            </div>

            {/* Version Selection Filters */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Project</label>
                <select 
                  value={selectedProject}
                  onChange={(e) => {
                    const newProject = e.target.value as any;
                    setSelectedProject(newProject);
                    setSelectedRelease('All'); // Reset version when project changes
                    setLocalAiInsights(null); // Reset analysis
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
                    setLocalAiInsights(null); // Reset when filter changes
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
                      (activeAiInsights?.readinessScore || 0) >= 80 ? "text-emerald-500" : (activeAiInsights?.readinessScore || 0) >= 50 ? "text-amber-500" : "text-rose-500",
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
                        (activeAiInsights?.readinessScore || 0) >= 80 ? "text-emerald-600" : (activeAiInsights?.readinessScore || 0) >= 50 ? "text-amber-600" : "text-rose-600"
                      )}>
                        {activeAiInsights?.readinessScore !== undefined ? `${activeAiInsights.readinessScore}%` : '--'}
                      </span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Ready</span>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-8 px-4 text-center w-full">
                <p className="text-xs font-bold text-slate-700 leading-relaxed italic min-h-[32px] flex items-center justify-center">
                  {localAiLoading ? (
                    <span className="text-slate-400 animate-pulse">Consulting AI for impact analysis...</span>
                  ) : (
                    <span>
                      "{activeAiInsights?.readinessScore >= 80 ? "Release risk is minimal. Proceed." : 
                        activeAiInsights?.readinessScore >= 50 ? "Stabilization in progress. Monitor closely." : 
                        activeAiInsights?.readinessScore < 50 ? "Significant High/Med risk detected." : 
                        "Select version to begin analysis."}"
                    </span>
                  )}
                </p>
                <div className="mt-4 pt-4 border-t border-slate-50 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-slate-400 uppercase">Selected Bugs:</span>
                    <span className="font-black text-slate-600 uppercase tracking-tighter">{filteredBugs.length} Pending</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-slate-400 uppercase">H/M Priority:</span>
                    <span className="font-black text-slate-600 uppercase tracking-tighter">
                      {filteredBugs.filter(b => b.priority === 'High' || b.priority === 'Medium').length} Detected
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </GlowWrapper>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <GlowWrapper className="lg:col-span-8 bg-white p-4 md:p-6 rounded-xl border border-black/[0.08] shadow-soft">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <h3 className="text-base font-bold text-slate-800">Priority Distribution</h3>
            <div className="flex flex-wrap gap-2">
              {priorityData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-md border border-slate-100">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {priorityData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      className="hover:opacity-80 transition-opacity duration-300 cursor-pointer"
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)', borderRadius: '16px', border: '1px solid rgba(0, 0, 0, 0.05)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlowWrapper>

        <GlowWrapper className="lg:col-span-4 bg-white p-4 md:p-6 rounded-xl border border-black/[0.08] shadow-soft">
          <h3 className="text-base font-bold text-slate-800 mb-6">Platform Split</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc', radius: 8 }}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)', borderRadius: '16px', border: '1px solid rgba(0, 0, 0, 0.05)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                  dataKey="bugs" 
                  fill="#2e3192" 
                  radius={[8, 8, 0, 0]} 
                  barSize={40}
                  className="hover:fill-im-blue-light transition-colors duration-300"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlowWrapper>
      </div>

      <GlowWrapper className="bg-white rounded-xl border border-black/[0.08] shadow-soft overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/50 gap-4">
          <div className="flex flex-col">
            <h3 className="text-base font-bold text-slate-800">Module Wise Breakdown</h3>
            <p className="text-[11px] text-slate-400 font-medium">Detailed bug distribution across system modules</p>
          </div>
          <div className="w-fit px-2.5 py-1 bg-im-blue/5 border border-im-blue/10 rounded-full text-[10px] font-bold text-im-blue uppercase tracking-wider">
            Pending Bugs
          </div>
        </div>
        
        <div className="p-2 md:p-4 flex flex-col gap-2">
          {moduleData.map(m => (
            <div key={m.name} className="group">
              <div 
                onClick={() => {
                  setExpandedModule(expandedModule === m.name ? null : m.name);
                  setExpandedPlatform(null);
                }}
                className={cn(
                  "p-3 md:p-3.5 flex items-center justify-between cursor-pointer rounded-lg transition-all duration-200 border",
                  expandedModule === m.name 
                    ? "bg-im-blue text-white border-im-blue shadow-sm" 
                    : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-2 md:gap-3">
                  <div className={cn(
                    "w-6 h-6 flex items-center justify-center rounded-md transition-all duration-300",
                    expandedModule === m.name 
                      ? "bg-white/20 rotate-90" 
                      : "bg-slate-100 text-slate-400 group-hover:text-im-blue"
                  )}>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                  <span className={cn(
                    "font-bold uppercase tracking-wider text-[10px] md:text-[11px]",
                    expandedModule === m.name ? "text-white" : "text-slate-600"
                  )}>{m.name}</span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className={cn(
                      "text-[8px] md:text-[9px] uppercase font-bold tracking-wider",
                      expandedModule === m.name ? "text-white/60" : "text-slate-400"
                    )}>Pending</span>
                    <span className={cn(
                      "text-lg md:text-xl font-bold leading-none",
                      expandedModule === m.name ? "text-white" : "text-im-blue"
                    )}>{m.count}</span>
                  </div>
                </div>
              </div>

                {expandedModule === m.name && (
                  <div className="overflow-hidden">
                    <div className="p-2 md:p-3 flex flex-col gap-2 bg-slate-50/50 rounded-b-xl mx-1 md:mx-2 border-x border-b border-black/[0.05]">
                      {['Android', 'iOS'].map(platform => {
                        const platformStats = dashboardData?.moduleStats[m.name]?.[platform as Platform];
                        const platformBugs = platformStats?.bugs || [];
                        const isExpanded = expandedPlatform === platform;
                        
                        return (
                          <div key={platform} className="bg-white rounded-xl border border-black/[0.08] shadow-sm overflow-hidden">
                            <div 
                              onClick={() => setExpandedPlatform(isExpanded ? null : platform)}
                              className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-slate-50 rounded-lg text-im-blue border border-black/[0.05]">
                                  {platform === 'Android' ? <Smartphone className="w-3.5 h-3.5" /> : <Apple className="w-3.5 h-3.5" />}
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">{platform}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[11px] font-mono font-bold text-im-blue bg-im-blue/5 px-2.5 py-0.5 rounded-full border border-im-blue/10">
                                  {(platformStats?.hp_mp_count || 0) + (platformStats?.low_count || 0)}
                                </span>
                                <ChevronRight className={cn("w-3.5 h-3.5 text-slate-300 transition-transform duration-300", isExpanded && "rotate-90")} />
                              </div>
                            </div>

                              {isExpanded && (
                                <div className="border-t border-black/[0.05] p-3 md:p-5 bg-slate-50/30">
                                  <div className="flex flex-col lg:flex-row gap-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                                      <div className="p-4 bg-white rounded-xl border border-black/[0.08] shadow-sm flex flex-col gap-2">
                                        <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                                          High + Medium Priority
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-xl font-mono font-bold text-slate-800">
                                            {platformStats?.hp_mp_count || 0}
                                          </span>
                                          {getModuleLinks(m.name, platform as Platform) && (
                                            <a 
                                              href={getModuleLinks(m.name, platform as Platform)?.hp_mp} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="p-1.5 rounded-lg hover:bg-im-blue hover:text-white transition-all text-slate-300 border border-transparent hover:border-im-blue"
                                            >
                                              <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                      <div className="p-4 bg-white rounded-xl border border-black/[0.08] shadow-sm flex flex-col gap-2">
                                        <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                                          Low Priority
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-xl font-mono font-bold text-slate-800">
                                            {platformStats?.low_count || 0}
                                          </span>
                                          {getModuleLinks(m.name, platform as Platform) && (
                                            <a 
                                              href={getModuleLinks(m.name, platform as Platform)?.low} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="p-1.5 rounded-lg hover:bg-im-blue hover:text-white transition-all text-slate-300 border border-transparent hover:border-im-blue"
                                            >
                                              <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="bg-white p-4 rounded-xl border border-black/[0.08] shadow-sm">
                                      <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-3">TAT Exceeded Summary (Pending)</div>
                                      <div className="grid grid-cols-3 gap-3">
                                        <div className="flex flex-col gap-1 p-2.5 bg-im-red/[0.03] rounded-lg border border-im-red/[0.08] relative group">
                                          <div className="text-[8px] uppercase font-bold text-im-red opacity-70 flex items-center justify-between">
                                            <span>High (&gt;3d)</span>
                                            {getModuleLinks(m.name, platform as Platform) && (
                                              <a href={getModuleLinks(m.name, platform as Platform)?.tatHigh} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110">
                                                <ExternalLink className="w-2.5 h-2.5" />
                                              </a>
                                            )}
                                          </div>
                                          <div className="text-xl font-mono font-bold text-im-red">
                                            {calculateTATExceeded(platformBugs, 'High')}
                                          </div>
                                        </div>
                                        <div className="flex flex-col gap-1 p-2.5 bg-amber-500/[0.03] rounded-lg border border-amber-500/[0.08] relative group">
                                          <div className="text-[8px] uppercase font-bold text-amber-600 opacity-70 flex items-center justify-between">
                                            <span>Medium (&gt;7d)</span>
                                            {getModuleLinks(m.name, platform as Platform) && (
                                              <a href={getModuleLinks(m.name, platform as Platform)?.tatMedium} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110">
                                                <ExternalLink className="w-2.5 h-2.5" />
                                              </a>
                                            )}
                                          </div>
                                          <div className="text-xl font-mono font-bold text-amber-600">
                                            {calculateTATExceeded(platformBugs, 'Medium')}
                                          </div>
                                        </div>
                                        <div className="flex flex-col gap-1 p-2.5 bg-im-teal/[0.03] rounded-lg border border-im-teal/[0.08] relative group">
                                          <div className="text-[8px] uppercase font-bold text-im-teal opacity-70 flex items-center justify-between">
                                            <span>Low (&gt;15d)</span>
                                            {getModuleLinks(m.name, platform as Platform) && (
                                              <a href={getModuleLinks(m.name, platform as Platform)?.tatLow} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110">
                                                <ExternalLink className="w-2.5 h-2.5" />
                                              </a>
                                            )}
                                          </div>
                                          <div className="text-xl font-mono font-bold text-im-teal">
                                            {calculateTATExceeded(platformBugs, 'Low')}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="mt-3 pt-2 border-t border-black/[0.03] text-[8px] text-slate-400 italic flex items-center gap-1.5">
                                        <AlertCircle className="w-2.5 h-2.5" />
                                        TAT calculated for Pending bugs from creation date.
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                          </div>
                        );
                      })}
                    </div>
                    </div>
                )}
            </div>
          ))}
        </div>
      </GlowWrapper>
    </div>
  );
}
