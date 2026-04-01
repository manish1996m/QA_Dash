import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smartphone, 
  Apple, 
  AlertCircle, 
  ChevronRight, 
  ExternalLink 
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
  CartesianGrid 
} from 'recharts';
import { Bug, Platform } from '../types';
import { DashboardData, PROJECTS, PRIORITIES, MODULE_CATEGORY_MAPPINGS } from '../services/openProject';
import { MODULES } from '../constants';
import { calculateTATExceeded } from '../utils/tat';
import { cn } from '../utils/cn';
import { StatCard } from '../components/StatCard';
import { GlowWrapper } from '../components/GlowWrapper';

interface ManagementViewProps {
  bugs: Bug[];
  stats: any;
  dashboardData: DashboardData | null;
}

export function ManagementView({ bugs, stats, dashboardData }: ManagementViewProps) {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);

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

  const getModuleLinks = (moduleName: string, platform: Platform) => {
    const project = platform === 'Android' ? PROJECTS.ANDROID : PROJECTS.IOS;
    const categoryIds = MODULE_CATEGORY_MAPPINGS[moduleName]?.[platform] || [];
    
    const baseUrl = `https://project.intermesh.net/projects/${project}/work_packages`;
    
    const hpMpFilters = [
      { field: 'status', operator: 'o', values: [] },
      { field: 'priority', operator: '=', values: [PRIORITIES.HIGH, PRIORITIES.MEDIUM] }
    ];

    const lowFilters = [
      { field: 'status', operator: 'o', values: [] },
      { field: 'priority', operator: '=', values: [PRIORITIES.LOW] }
    ];

    if (categoryIds.length > 0) {
      hpMpFilters.push({ field: 'category', operator: '=', values: categoryIds });
      lowFilters.push({ field: 'category', operator: '=', values: categoryIds });
    } else {
      hpMpFilters.push({ field: 'subject', operator: '~', values: [moduleName] });
      lowFilters.push({ field: 'subject', operator: '~', values: [moduleName] });
    }

    return {
      hp_mp: `${baseUrl}?filters=${encodeURIComponent(JSON.stringify(hpMpFilters))}`,
      low: `${baseUrl}?filters=${encodeURIComponent(JSON.stringify(lowFilters))}`
    };
  };

  const getGlobalLink = (platform: Platform, highOnly: boolean = false) => {
    const project = platform === 'Android' ? PROJECTS.ANDROID : PROJECTS.IOS;
    const baseUrl = `https://project.intermesh.net/projects/${project}/work_packages`;
    
    const filters = [
      { field: 'status', operator: 'o', values: [] }
    ];

    if (highOnly) {
      filters.push({ field: 'priority', operator: '=', values: [PRIORITIES.HIGH] });
    }

    return `${baseUrl}?filters=${encodeURIComponent(JSON.stringify(filters))}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-8"
    >
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

      <div className="grid grid-cols-12 gap-6">
        <GlowWrapper className="col-span-12 lg:col-span-8 bg-white p-6 rounded-xl border border-black/[0.08] shadow-soft">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-slate-800">Priority Distribution</h3>
            <div className="flex gap-2">
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
                  innerRadius={70}
                  outerRadius={110}
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

        <GlowWrapper className="col-span-12 lg:col-span-4 bg-white p-6 rounded-xl border border-black/[0.08] shadow-soft">
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
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex flex-col">
            <h3 className="text-base font-bold text-slate-800">Module Wise Breakdown</h3>
            <p className="text-[11px] text-slate-400 font-medium">Detailed bug distribution across system modules</p>
          </div>
          <div className="px-2.5 py-1 bg-im-blue/5 border border-im-blue/10 rounded-full text-[10px] font-bold text-im-blue uppercase tracking-wider">
            Pending Bugs
          </div>
        </div>
        
        <div className="p-4 flex flex-col gap-2">
          {moduleData.map(m => (
            <div key={m.name} className="group">
              <div 
                onClick={() => {
                  setExpandedModule(expandedModule === m.name ? null : m.name);
                  setExpandedPlatform(null);
                }}
                className={cn(
                  "p-3.5 flex items-center justify-between cursor-pointer rounded-lg transition-all duration-200 border",
                  expandedModule === m.name 
                    ? "bg-im-blue text-white border-im-blue shadow-sm" 
                    : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-6 h-6 flex items-center justify-center rounded-md transition-all duration-300",
                    expandedModule === m.name 
                      ? "bg-white/20 rotate-90" 
                      : "bg-slate-100 text-slate-400 group-hover:text-im-blue"
                  )}>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                  <span className={cn(
                    "font-bold uppercase tracking-wider text-[11px]",
                    expandedModule === m.name ? "text-white" : "text-slate-600"
                  )}>{m.name}</span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className={cn(
                      "text-[9px] uppercase font-bold tracking-wider",
                      expandedModule === m.name ? "text-white/60" : "text-slate-400"
                    )}>Pending</span>
                    <span className={cn(
                      "text-xl font-bold leading-none",
                      expandedModule === m.name ? "text-white" : "text-im-blue"
                    )}>{m.count}</span>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {expandedModule === m.name && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 flex flex-col gap-2 bg-slate-50/50 rounded-b-xl mx-2 border-x border-b border-black/[0.05]">
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
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">{platform} {m.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[11px] font-mono font-bold text-im-blue bg-im-blue/5 px-2.5 py-0.5 rounded-full border border-im-blue/10">
                                  {(platformStats?.hp_mp_count || 0) + (platformStats?.low_count || 0)}
                                </span>
                                <ChevronRight className={cn("w-3.5 h-3.5 text-slate-300 transition-transform duration-300", isExpanded && "rotate-90")} />
                              </div>
                            </div>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="border-t border-black/[0.05] p-5 bg-slate-50/30"
                                >
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                    <div className="grid grid-cols-2 gap-3">
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
                                        <div className="flex flex-col gap-1 p-2.5 bg-im-red/[0.03] rounded-lg border border-im-red/[0.08]">
                                          <div className="text-[8px] uppercase font-bold text-im-red opacity-70">High (&gt;3d)</div>
                                          <div className="text-xl font-mono font-bold text-im-red">
                                            {calculateTATExceeded(platformBugs, 'High')}
                                          </div>
                                        </div>
                                        <div className="flex flex-col gap-1 p-2.5 bg-amber-500/[0.03] rounded-lg border border-amber-500/[0.08]">
                                          <div className="text-[8px] uppercase font-bold text-amber-600 opacity-70">Medium (&gt;7d)</div>
                                          <div className="text-xl font-mono font-bold text-amber-600">
                                            {calculateTATExceeded(platformBugs, 'Medium')}
                                          </div>
                                        </div>
                                        <div className="flex flex-col gap-1 p-2.5 bg-im-teal/[0.03] rounded-lg border border-im-teal/[0.08]">
                                          <div className="text-[8px] uppercase font-bold text-im-teal opacity-70">Low (&gt;15d)</div>
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
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </GlowWrapper>
    </motion.div>
  );
}
