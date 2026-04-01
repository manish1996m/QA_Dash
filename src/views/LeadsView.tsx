import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, ChevronRight } from 'lucide-react';
import { Bug, Platform } from '../types';
import { TEAMS } from '../constants';
import { cn } from '../utils/cn';
import { GlowWrapper } from '../components/GlowWrapper';

interface LeadsViewProps {
  bugs: Bug[];
}

export function LeadsView({ bugs }: LeadsViewProps) {
  const [platformFilter, setPlatformFilter] = useState<Platform | 'All'>('All');
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const teamData = TEAMS.map(team => {
    const allTeamMembers = [team.lead, ...team.members];
    const teamBugs = bugs.filter(b => allTeamMembers.includes(b.assignedTo));
    
    const memberStats = team.members.map(name => {
      const mBugs = bugs.filter(b => b.assignedTo === name);
      return {
        name,
        total: mBugs.length,
        inTesting: mBugs.filter(b => b.status === 'In Testing').length,
        pending: mBugs.filter(b => b.status === 'Pending').length,
      };
    });

    return {
      name: team.lead,
      members: team.members,
      platform: team.platform,
      total: teamBugs.length,
      inTesting: teamBugs.filter(b => b.status === 'In Testing').length,
      pending: teamBugs.filter(b => b.status === 'Pending').length,
      memberStats
    };
  });

  const filteredData = platformFilter === 'All' 
    ? teamData
    : teamData.filter(t => t.platform === platformFilter);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-8"
    >
      <GlowWrapper className="flex items-center justify-between bg-white p-3 rounded-xl border border-black/[0.08] shadow-soft">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Filter</span>
          </div>
          <div className="flex gap-1">
            {['All', 'Android', 'iOS'].map((p) => (
              <button 
                key={p}
                onClick={() => setPlatformFilter(p as any)}
                className={cn(
                  "px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all duration-200 border",
                  platformFilter === p 
                    ? "bg-im-blue text-white border-im-blue shadow-sm" 
                    : "bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-white"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-4">
          {filteredData.length} Squads
        </div>
      </GlowWrapper>

      <div className="flex flex-col gap-4">
        {filteredData.map((team) => (
          <GlowWrapper key={team.name} className="bg-white rounded-xl border border-black/[0.08] shadow-soft hover:shadow-hover transition-all duration-200 overflow-hidden">
            <div 
              onClick={() => setExpandedTeam(expandedTeam === team.name ? null : team.name)}
              className="flex items-center p-5 cursor-pointer hover:bg-slate-50/50 transition-colors group"
            >
              <div className="flex-1 flex items-center gap-4">
                <div className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-300 border",
                  expandedTeam === team.name 
                    ? "rotate-90 bg-im-blue text-white border-im-blue shadow-sm" 
                    : "bg-slate-50 border-slate-100 text-slate-400 group-hover:text-im-blue"
                )}>
                  <ChevronRight className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold tracking-tight text-slate-800">{team.name}</span>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Squad Lead</span>
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                <div className={cn(
                  "px-3 py-1 text-[9px] font-bold uppercase tracking-wider border rounded-full",
                  team.platform === 'Android' 
                    ? "border-green-100 text-green-600 bg-green-50" 
                    : "border-im-blue/10 text-im-blue bg-im-blue/5"
                )}>
                  {team.platform}
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total</span>
                  <span className="text-xl font-bold leading-none text-slate-800">{team.total}</span>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Pending</span>
                  <span className="text-xl font-bold leading-none text-amber-600">{team.pending}</span>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {expandedTeam === team.name && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-slate-50/30 border-t border-slate-50"
                >
                  <div className="p-6 bg-slate-50/50">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-px flex-1 bg-slate-200/50" />
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Squad Breakdown</div>
                      <div className="h-px flex-1 bg-slate-200/50" />
                    </div>

                    <div className="grid grid-cols-12 gap-4 mb-2 text-[10px] uppercase font-bold tracking-wider text-slate-400 px-6">
                      <div className="col-span-6">Member</div>
                      <div className="col-span-2 text-right">Total</div>
                      <div className="col-span-2 text-right">Pending</div>
                      <div className="col-span-2 text-center">Workload</div>
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      {team.memberStats.length > 0 ? (
                        team.memberStats.map((member) => (
                          <div key={member.name} className="grid grid-cols-12 items-center p-3.5 bg-white rounded-lg border border-slate-100 hover:border-slate-200 transition-all duration-200 shadow-sm group">
                            <div className="col-span-6 flex items-center gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-100 group-hover:bg-im-blue/20 transition-colors" />
                              <span className="font-bold text-sm tracking-tight text-slate-700 group-hover:text-slate-900 transition-colors">
                                {member.name}
                              </span>
                            </div>
                            <div className="col-span-2 text-right font-bold text-sm text-slate-800">{member.total}</div>
                            <div className="col-span-2 text-right font-bold text-sm text-amber-600">{member.pending}</div>
                            <div className="col-span-2 px-4">
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min((member.total / 12) * 100, 100)}%` }}
                                  className={cn(
                                    "h-full rounded-full transition-colors",
                                    member.total > 10 ? "bg-im-red" : member.total > 5 ? "bg-im-blue" : "bg-im-teal"
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
                          <div className="text-lg font-bold text-slate-300 mb-1">Hiring in process...</div>
                          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">No active members in this squad</div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlowWrapper>
        ))}
      </div>
    </motion.div>
  );
}
