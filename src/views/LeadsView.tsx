import React, { useState } from 'react';
import { Filter, ChevronRight, ExternalLink } from 'lucide-react';
import { Bug, Platform } from '../types';
import { TEAMS } from '../constants';
import { cn } from '../utils/cn';
import { GlowWrapper } from '../components/GlowWrapper';

interface LeadsViewProps {
  bugs: Bug[];
}

const MEMBER_URLS: Record<string, string> = {
  "Shubham Panigrahi": "https://project.intermesh.net/projects/android/work_packages?query_props=%7B%22c%22%3A%5B%22id%22%2C%22subject%22%2C%22priority%22%2C%22author%22%2C%22category%22%2C%22customField6%22%2C%22type%22%2C%22status%22%5D%2C%22hi%22%3Afalse%2C%22g%22%3A%22category%22%2C%22is%22%3Atrue%2C%22tv%22%3Afalse%2C%22hl%22%3A%22none%22%2C%22t%22%3A%22category%3Adesc%2Cpriority%3Aasc%2Cid%3Aasc%22%2C%22f%22%3A%5B%7B%22n%22%3A%22status%22%2C%22o%22%3A%22!%22%2C%22v%22%3A%5B%2241%22%2C%2256%22%2C%2245%22%2C%2267%22%2C%2268%22%2C%2253%22%5D%7D%2C%7B%22n%22%3A%22type%22%2C%22o%22%3A%22%3D%22%2C%22v%22%3A%5B%227%22%5D%7D%2C%7B%22n%22%3A%22author%22%2C%22o%22%3A%22%3D%22%2C%22v%22%3A%5B%223340%22%5D%7D%5D%2C%22pp%22%3A100%2C%22pa%22%3A1%7D",
  "Akhileswarao Chinnari": "https://project.intermesh.net/projects/android/work_packages?query_props=%7B%22c%22%3A%5B%22id%22%2C%22subject%22%2C%22priority%22%2C%22author%22%2C%22category%22%2C%22customField6%22%2C%22type%22%2C%22status%22%5D%2C%22hi%22%3Afalse%2C%22g%22%3A%22category%22%2C%22is%22%3Atrue%2C%22tv%22%3Afalse%2C%22hl%22%3A%22none%22%2C%22t%22%3A%22category%3Adesc%2Cpriority%3Aasc%2Cid%3Aasc%22%2C%22f%22%3A%5B%7B%22n%22%3A%22status%22%2C%22o%22%3A%22!%22%2C%22v%22%3A%5B%2241%22%2C%2256%22%2C%2245%22%2C%2267%22%2C%2268%22%2C%2253%22%5D%7D%2C%7B%22n%22%3A%22type%22%2C%22o%22%3A%22%3D%22%2C%22v%22%3A%5B%227%22%5D%7D%2C%7B%22n%22%3A%22author%22%2C%22o%22%3A%22%3D%22%2C%22v%22%3A%5B%223631%22%5D%7D%5D%2C%22pp%22%3A100%2C%22pa%22%3A1%7D",
  "Abhradeep Kanrar": "https://project.intermesh.net/projects/android/work_packages?query_props=%7B%22c%22%3A%5B%22id%22%2C%22subject%22%2C%22priority%22%2C%22author%22%2C%22category%22%2C%22customField6%22%2C%22type%22%2C%22status%22%5D%2C%22hi%22%3Afalse%2C%22g%22%3A%22category%22%2C%22is%22%3Atrue%2C%22tv%22%3Afalse%2C%22hl%22%3A%22none%22%2C%22t%22%3A%22category%3Adesc%2Cpriority%3Aasc%2Cid%3Aasc%22%2C%22f%22%3A%5B%7B%22n%22%3A%22status%22%2C%22o%22%3A%22!%22%2C%22v%22%3A%5B%2241%22%2C%2256%22%2C%2245%22%2C%2267%22%2C%2268%22%2C%2253%22%5D%7D%2C%7B%22n%22%3A%22type%22%2C%22o%22%3A%22%3D%22%2C%22v%22%3A%5B%227%22%5D%7D%2C%7B%22n%22%3A%22author%22%2C%22o%22%3A%22%3D%22%2C%22v%22%3A%5B%223977%22%5D%7D%5D%2C%22pp%22%3A100%2C%22pa%22%3A1%7D",
  "Priyanka Chittimelli": "https://project.intermesh.net/projects/android/work_packages?query_props=%7B%22c%22%3A%5B%22id%22%2C%22subject%22%2C%22priority%22%2C%22author%22%2C%22category%22%2C%22customField6%22%2C%22type%22%2C%22status%22%5D%2C%22hi%22%3Afalse%2C%22g%22%3A%22category%22%2C%22is%22%3Atrue%2C%22tv%22%3Afalse%2C%22hl%22%3A%22none%22%2C%22t%22%3A%22category%3Adesc%2Cpriority%3Aasc%2Cid%3Aasc%22%2C%22f%22%3A%5B%7B%22n%22%3A%22status%22%2C%22o%22%3A%22!%22%2C%22v%22%3A%5B%2241%22%2C%2256%22%2C%2245%22%2C%2267%22%2C%2268%22%2C%2253%22%5D%7D%2C%7B%22n%22%3A%22type%22%2C%22o%22%3A%22%3D%22%2C%22v%22%3A%5B%227%22%5D%7D%2C%7B%22n%22%3A%22author%22%2C%22o%22%3A%22%3D%22%2C%22v%22%3A%5B%223630%22%5D%7D%5D%2C%22pp%22%3A100%2C%22pa%22%3A1%7D",
  "Aditya Rai": "https://project.intermesh.net/projects/iosnative/work_packages?query_props=%7B%22c%22%3A%5B%22id%22%2C%22project%22%2C%22subject%22%2C%22type%22%2C%22parent%22%2C%22status%22%2C%22priority%22%2C%22author%22%2C%22assignee%22%2C%22responsible%22%2C%22updatedAt%22%2C%22category%22%2C%22version%22%2C%22createdAt%22%2C%22customField1%22%2C%22storyPoints%22%2C%22remainingTime%22%2C%22position%22%5D%2C%22hi%22%3Atrue%2C%22g%22%3A%22%22%2C%22is%22%3Atrue%2C%22tv%22%3Afalse%2C%22hl%22%3A%22none%22%2C%22t%22%3A%22id%3Aasc%22%2C%22f%22%3A%5B%7B%22n%22%3A%22status%22%2C%22o%22%3A%22!%22%2C%22v%22%3A%5B%2256%22%2C%2267%22%2C%2268%22%2C%2253%22%2C%2271%22%2C%2241%22%2C%2245%22%5D%7D%2C%7B%22n%22%3A%22type%22%2C%22o%22%3A%22%3D%22%2C%22v%22%3A%5B%227%22%5D%7D%2C%7B%22n%22%3A%22author%22%2C%22o%22%3A%22%3D%22%2C%22v%22%3A%5B%223045%22%5D%7D%5D%2C%22pp%22%3A100%2C%22pa%22%3A1%7D",
  "Anjali Patel": "https://project.intermesh.net/projects/iosnative/work_packages?query_props=%7B%22c%22%3A%5B%22id%22%2C%22project%22%2C%22subject%22%2C%22type%22%2C%22parent%22%2C%22status%22%2C%22priority%22%2C%22author%22%2C%22assignee%22%2C%22responsible%22%2C%22updatedAt%22%2C%22category%22%2C%22version%22%2C%22createdAt%22%2C%22customField1%22%2C%22storyPoints%22%2C%22remainingTime%22%2C%22position%22%5D%2C%22hi%22%3Atrue%2C%22g%22%3A%22%22%2C%22is%22%3Atrue%2C%22tv%22%3Afalse%2C%22hl%22%3A%22none%22%2C%22t%22%3A%22id%3Aasc%22%2C%22f%22%3A%5B%7B%22n%22%3A%22status%22%2C%22o%22%3A%22!%22%2C%22v%22%3A%5B%2256%22%2C%2267%22%2C%2268%22%2C%2253%22%2C%2271%22%2C%2241%22%2C%2245%22%5D%7D%2C%7B%22n%22%3A%22type%22%2C%22o%22%3A%22%3D%22%2C%22v%22%3A%5B%227%22%5D%7D%2C%7B%22n%22%3A%22author%22%2C%22o%22%3A%22%3D%22%2C%22v%22%3A%5B%223091%22%5D%7D%5D%2C%22pp%22%3A100%2C%22pa%22%3A1%7D",
  "Freeda A Fernandes": "https://project.intermesh.net/projects/iosnative/work_packages?query_props=%7B%22c%22%3A%5B%22id%22%2C%22project%22%2C%22subject%22%2C%22type%22%2C%22parent%22%2C%22status%22%2C%22priority%22%2C%22author%22%2C%22assignee%22%2C%22responsible%22%2C%22updatedAt%22%2C%22category%22%2C%22version%22%2C%22createdAt%22%2C%22customField1%22%2C%22storyPoints%22%2C%22remainingTime%22%2C%22position%22%5D%2C%22hi%22%3Atrue%2C%22g%22%3A%22%22%2C%22is%22%3Atrue%2C%22tv%22%3Afalse%2C%22hl%22%3A%22none%22%2C%22t%22%3A%22id%3Aasc%22%2C%22f%22%3A%5B%7B%22n%22%3A%22status%22%2C%22o%22%3A%22!%22%2C%22v%22%3A%5B%2256%22%2C%2267%22%2C%2268%22%2C%2253%22%2C%2271%22%2C%2241%22%2C%2245%22%5D%7D%2C%7B%22n%22%3A%22type%22%2C%22o%22%3A%22%3D%22%2C%22v%22%3A%5B%227%22%5D%7D%2C%7B%22n%22%3A%22author%22%2C%22o%22%3A%22%3D%22%2C%22v%22%3A%5B%223645%22%5D%7D%5D%2C%22pp%22%3A100%2C%22pa%22%3A1%7D"
};

function extractIdFromUrl(url: string): string | null {
  try {
    const decoded = decodeURIComponent(url);
    const match = decoded.match(/"n":"author","o":"=","v":\["(\d+)"\]/);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
}

export function LeadsView({ bugs }: LeadsViewProps) {
  const [platformFilter, setPlatformFilter] = useState<Platform | 'All'>('All');
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const teamData = TEAMS.map(team => {
    // Lead fuzzy name normalization
    const normalize = (name: string) => name.toLowerCase().replace(/[^a-z]/g, '');
    const leadNormalized = normalize(team.lead);
    
    // Member IDs normalization
    const memberIds = team.members.map(m => extractIdFromUrl(MEMBER_URLS[m])).filter(Boolean) as string[];

    const teamBugs = bugs.filter(b => {
      // Direct ID match for members
      if (b.authorId && memberIds.includes(b.authorId)) return true;
      // Fuzzy name match for Lead (fallback)
      if (normalize(b.author || '').startsWith(leadNormalized)) return true;
      return false;
    });
    
    const teamPendingBugs = teamBugs.filter(b => b.status === 'Pending');
    
    const memberStats = team.members.map(name => {
      const targetId = extractIdFromUrl(MEMBER_URLS[name]);
      const mBugs = bugs.filter(b => b.authorId === targetId && b.status === 'Pending');
      return {
        name,
        pending: mBugs.length,
        android: mBugs.filter(b => b.platform === 'Android').length,
        ios: mBugs.filter(b => b.platform === 'iOS').length,
      };
    });

    return {
      name: team.lead,
      members: team.members,
      platform: team.platform,
      pending: teamPendingBugs.length,
      android: teamPendingBugs.filter(b => b.platform === 'Android').length,
      ios: teamPendingBugs.filter(b => b.platform === 'iOS').length,
      memberStats
    };
  });

  const filteredData = platformFilter === 'All' 
    ? teamData
    : teamData.filter(t => t.platform === platformFilter);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <GlowWrapper className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 rounded-xl border border-black/[0.08] shadow-soft gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-400 ml-2">
            <Filter className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Filter</span>
          </div>
          <div className="flex flex-wrap gap-1">
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
        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-50">
          {filteredData.length} Squads
        </div>
      </GlowWrapper>

      <div className="flex flex-col gap-4">
        {filteredData.map((team) => (
          <GlowWrapper key={team.name} className="bg-white rounded-xl border border-black/[0.08] shadow-soft hover:shadow-hover transition-all duration-200 overflow-hidden">
            <div 
              onClick={() => setExpandedTeam(expandedTeam === team.name ? null : team.name)}
              className="flex flex-col sm:flex-row sm:items-center p-4 md:p-5 cursor-pointer hover:bg-slate-50/50 transition-colors group gap-4"
            >
              <div className="flex-1 flex items-center gap-3 md:gap-4">
                <div className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-300 border shrink-0",
                  expandedTeam === team.name 
                    ? "rotate-90 bg-im-blue text-white border-im-blue shadow-sm" 
                    : "bg-slate-50 border-slate-100 text-slate-400 group-hover:text-im-blue"
                )}>
                  <ChevronRight className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base md:text-lg font-bold tracking-tight text-slate-800">{team.name}</span>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Squad Lead</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between sm:justify-end gap-4 md:gap-8 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-50">
                <div className={cn(
                  "px-3 py-1 text-[9px] font-bold uppercase tracking-wider border rounded-full",
                  team.platform === 'Android' 
                    ? "border-green-100 text-green-600 bg-green-50" 
                    : "border-im-blue/10 text-im-blue bg-im-blue/5"
                )}>
                  {team.platform}
                </div>

                <div className="flex flex-col items-end min-w-[80px] md:min-w-[100px]">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Pending</span>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xl font-bold text-amber-600 leading-none">{team.pending}</span>
                    {team.pending > 0 && (
                      <div className="w-16 md:w-20 h-1 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                        <div 
                          style={{ width: `${(team.android / team.pending) * 100}%` }}
                          className="bg-green-500 h-full transition-all duration-500"
                        />
                        <div 
                          style={{ width: `${(team.ios / team.pending) * 100}%` }}
                          className="bg-im-blue h-full transition-all duration-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {expandedTeam === team.name && (
              <div className="bg-slate-50/10 border-t border-slate-50">
                <div className="p-4 md:p-6 bg-slate-50/20">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-px flex-1 bg-slate-200/40" />
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Squad Breakdown</div>
                    <div className="h-px flex-1 bg-slate-200/40" />
                  </div>

                  <div className="hidden md:grid grid-cols-12 gap-4 mb-3 text-[10px] uppercase font-bold tracking-wider text-slate-400 px-6">
                    <div className="col-span-7">Member</div>
                    <div className="col-span-5 text-right flex items-center justify-end gap-3 px-4">
                      <span>Total</span>
                      <span>Platform Split (A/i)</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 px-1 md:px-2">
                    {team.memberStats.length > 0 ? (
                      team.memberStats.map((member) => (
                        <div key={member.name} className="flex flex-col md:grid md:grid-cols-12 md:items-center p-3.5 bg-white rounded-xl border border-slate-100 hover:border-im-blue/20 hover:shadow-soft transition-all duration-300 group relative gap-3 md:gap-0">
                          <div className="md:col-span-7 flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-im-blue transition-all duration-300 transform group-hover:scale-125" />
                            {MEMBER_URLS[member.name] ? (
                              <a 
                                href={MEMBER_URLS[member.name]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold text-sm tracking-tight text-slate-700 hover:text-im-blue transition-colors flex items-center gap-1.5"
                                title={`Open project tasks for ${member.name}`}
                              >
                                {member.name}
                                <ExternalLink className="w-3.5 h-3.5 opacity-60 md:opacity-0 md:group-hover:opacity-60 transition-opacity" />
                              </a>
                            ) : (
                              <span className="font-bold text-sm tracking-tight text-slate-700">
                                {member.name}
                              </span>
                            )}
                          </div>
                          
                          <div className="md:col-span-5 flex items-center justify-between md:justify-end gap-5 md:px-4 border-t md:border-t-0 pt-2 md:pt-0 border-slate-50">
                            <div className="flex flex-col md:items-end">
                              <span className="text-[8px] uppercase font-bold text-slate-400 tracking-wider md:hidden">Pending Bugs</span>
                              <span className="text-base font-black tabular-nums text-slate-800 tracking-tight">{member.pending}</span>
                            </div>
                            
                            {/* Dual-Platform Integrated Pill */}
                            <div className="flex bg-slate-50/80 p-0.5 rounded-lg border border-slate-100 shadow-sm overflow-hidden min-w-[70px]">
                              <div className="flex-1 flex items-center justify-center gap-0.5 px-2 py-1 bg-white rounded-[6px] border border-green-100 shadow-sm">
                                <span className="text-[10px] font-black text-green-600 leading-none">{member.android}</span>
                                <span className="text-[8px] font-bold text-green-400 leading-none">A</span>
                              </div>
                              <div className="w-px h-4 bg-slate-200 self-center mx-1" />
                              <div className="flex-1 flex items-center justify-center gap-0.5 px-2 py-1 bg-white rounded-[6px] border border-blue-100 shadow-sm">
                                <span className="text-[10px] font-black text-im-blue leading-none">{member.ios}</span>
                                <span className="text-[8px] font-bold text-blue-300 leading-none">i</span>
                              </div>
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
              </div>
            )}
          </GlowWrapper>
        ))}
      </div>
    </div>
  );
}
