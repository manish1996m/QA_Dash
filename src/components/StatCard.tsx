import React from 'react';
import { ExternalLink } from 'lucide-react';
import { GlowWrapper } from './GlowWrapper';
import { cn } from '../utils/cn';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  link?: string;
  variant?: 'default' | 'danger';
}

export function StatCard({ label, value, icon, link, variant = 'default' }: StatCardProps) {
  return (
    <GlowWrapper className={cn(
      "bg-white p-5 rounded-xl border border-black/[0.08] shadow-soft flex flex-col gap-4 relative group hover:shadow-hover transition-all duration-200",
      variant === 'danger' && "border-im-red/20 bg-im-red/[0.02]"
    )}>
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase font-bold tracking-wider text-slate-400">{label}</div>
        {link && (
          <a 
            href={link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-1.5 rounded-md hover:bg-slate-50 text-slate-300 hover:text-im-blue transition-all"
            title="View in OpenProject"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <div className={cn(
          "text-3xl font-bold tracking-tight",
          variant === 'danger' ? "text-im-red" : "text-im-blue"
        )}>{value}</div>
        <div className={cn(
          "p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:bg-im-blue/5 transition-colors duration-200",
          variant === 'danger' ? "group-hover:text-im-red group-hover:bg-im-red/5" : "group-hover:text-im-blue"
        )}>
          {icon}
        </div>
      </div>
    </GlowWrapper>
  );
}
