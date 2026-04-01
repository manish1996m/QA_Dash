import React from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  Sparkles, 
  Settings, 
  RefreshCw, 
  ChevronRight,
  Clock
} from 'lucide-react';
import { cn } from '../utils/cn';

interface SidebarProps {
  view: 'management' | 'leads' | 'ai';
  setView: (view: 'management' | 'leads' | 'ai') => void;
  lastUpdated: Date;
  loading: boolean;
  loadData: () => void;
  setShowSettings: (show: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ 
  view, 
  setView, 
  lastUpdated, 
  loading, 
  loadData, 
  setShowSettings,
  isCollapsed,
  setIsCollapsed
}: SidebarProps) {
  return (
    <nav className={cn(
      "fixed left-0 top-0 h-full border-r border-slate-200 bg-white z-50 flex flex-col transition-all duration-300 ease-in-out shadow-sm",
      isCollapsed ? "w-[60px]" : "w-[220px]"
    )}>
      {/* Logo Section */}
      <div className="p-4 flex flex-col gap-4">
        <div className={cn(
          "flex items-center transition-all duration-300",
          isCollapsed ? "justify-center" : "px-2"
        )}>
          <img 
            src="https://corporate.indiamart.com/wp-content/uploads/2024/09/logo.webp" 
            alt="IndiaMART" 
            className={cn(
              "object-contain transition-all duration-300",
              isCollapsed ? "w-8 h-8 opacity-0" : "w-full h-auto"
            )}
            referrerPolicy="no-referrer"
          />
          {isCollapsed && (
            <div className="absolute w-8 h-8 bg-im-blue rounded-lg flex items-center justify-center text-white font-bold text-xs">
              IM
            </div>
          )}
        </div>
        {!isCollapsed && <div className="h-px bg-slate-100 w-full" />}
      </div>

      {/* Navigation Section */}
      <div className="flex-1 flex flex-col gap-1 px-3">
        {[
          { id: 'management', label: 'Management', icon: LayoutDashboard },
          { id: 'leads', label: 'Leads', icon: Users },
          { id: 'ai', label: 'AI Insights', icon: Sparkles },
        ].map((item) => (
          <button 
            key={item.id}
            onClick={() => setView(item.id as any)}
            title={isCollapsed ? item.label : undefined}
            className={cn(
              "flex items-center gap-3 p-2.5 rounded-lg transition-all duration-200 group relative",
              view === item.id 
                ? "bg-im-blue text-white shadow-sm" 
                : "hover:bg-im-blue/5 text-slate-500 hover:text-im-blue"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 shrink-0 transition-transform duration-300",
              view === item.id ? "text-white" : "text-slate-400 group-hover:text-im-blue"
            )} />
            {!isCollapsed && <span className="font-medium text-sm truncate">{item.label}</span>}
            {!isCollapsed && view === item.id && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/50" />
            )}
          </button>
        ))}

        <div className="mt-4 pt-4 border-t border-slate-50">
          <button 
            onClick={() => setShowSettings(true)}
            title={isCollapsed ? "Configure API" : undefined}
            className={cn(
              "flex items-center gap-3 p-2.5 rounded-lg transition-all duration-200 hover:bg-im-blue/5 text-slate-400 hover:text-im-blue group w-full",
              isCollapsed ? "justify-center" : ""
            )}
          >
            <Settings className="w-5 h-5 shrink-0 group-hover:rotate-45 transition-transform duration-500" />
            {!isCollapsed && <span className="font-medium text-sm">Settings</span>}
          </button>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="mt-auto p-3 flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50">
        {!isCollapsed && (
          <div className="px-2">
            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Last Updated</div>
            <div className="font-mono text-[10px] text-slate-500 flex items-center gap-2">
              <Clock className="w-3 h-3" />
              {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button 
            onClick={loadData}
            disabled={loading}
            title={isCollapsed ? "Refresh Data" : undefined}
            className={cn(
              "flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-600 transition-all active:scale-95 disabled:opacity-50 group shadow-sm",
              isCollapsed ? "p-2" : ""
            )}
          >
            <RefreshCw className={cn("w-3.5 h-3.5 transition-transform duration-500", loading ? "animate-spin" : "group-hover:rotate-180")} />
            {!isCollapsed && <span>Refresh</span>}
          </button>

          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center justify-center p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
          >
            <ChevronRight className={cn("w-4 h-4 transition-transform duration-300", isCollapsed ? "" : "rotate-180")} />
          </button>
        </div>
      </div>
    </nav>
  );
}
