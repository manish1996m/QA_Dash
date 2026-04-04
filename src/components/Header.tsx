import React, { useState } from 'react';
import { Settings, RefreshCw, ChevronRight, ChevronLeft, Menu } from 'lucide-react';
import { cn } from '../utils/cn';
import { ExportMailModal } from './ExportMailModal';
import { DashboardData } from '../services/openProject';
import { MODULES } from '../constants';

interface HeaderProps {
  view: string;
  bugs: any[];
  loading?: boolean;
  onRefresh?: () => void;
  syncing?: boolean;
  dashboardData?: DashboardData | null;
  toggleMobileMenu?: () => void;
}

export function Header({ view, bugs, loading = false, onRefresh, syncing = false, dashboardData, toggleMobileMenu }: HeaderProps) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [showModuleDropdown, setShowModuleDropdown] = useState(false);
  const [exportModalModule, setExportModalModule] = useState<string | null>(null);

  const stats = {
    androidPending: bugs.filter(b => b.platform === 'Android' && b.status === 'Pending').length,
    iosPending: bugs.filter(b => b.platform === 'iOS' && b.status === 'Pending').length,
    androidHigh: bugs.filter(b => b.platform === 'Android' && b.priority === 'High').length,
    iosHigh: bugs.filter(b => b.platform === 'iOS' && b.priority === 'High').length,
  };

  const handleExport = (type: 'total' | 'module') => {
    const spocs = "spoc@example.com"; // Placeholder
    let subject = "";
    let body = "";

    if (type === 'total') {
      subject = `QA Report: Total Pending Bugs - ${new Date().toLocaleDateString()}`;
      body = `Hi Team,\n\nTotal Pending Bugs Report:\nAndroid Pending: ${stats.androidPending}\niOS Pending: ${stats.iosPending}\nAndroid High Priority: ${stats.androidHigh}\niOS High Priority: ${stats.iosHigh}\n\nPlease take necessary actions.\n\nRegards,\nQA Dashboard`;
    } else {
      // Just in case it's reached, though Module Wise should open the UI now
      console.warn("Use manual modal selection for module wise dispatch.");
    }

    window.location.href = `mailto:${spocs}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setIsExportOpen(false);
  };

  return (
    <header className="h-16 px-4 md:px-6 bg-white border-b border-slate-200 flex justify-between items-center sticky top-0 z-40">
      <div className="flex items-center gap-3 md:gap-4">
        {/* Mobile Menu Toggle */}
        <button 
          onClick={toggleMobileMenu}
          className="p-2 -ml-2 text-slate-500 hover:text-im-blue md:hidden"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Mobile Branding */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="w-8 h-8 bg-im-blue rounded-lg flex items-center justify-center text-white font-bold text-xs">
            IM
          </div>
        </div>

        <h2 className="text-sm md:text-lg font-bold text-im-blue capitalize tracking-tight truncate max-w-[120px] sm:max-w-none">
          {view === 'management' ? 'Management Dashboard' : view === 'leads' ? 'Team Performance' : 'AI Intelligence'}
        </h2>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <button 
          onClick={onRefresh}
          disabled={loading || syncing}
          className="flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-im-blue hover:border-im-blue transition-all disabled:opacity-50"
          title="Sync with OpenProject"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", (loading || syncing) && "animate-spin")} />
          <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider hidden sm:inline">
            {syncing ? "Syncing..." : "Sync"}
          </span>
        </button>

        <div className="relative">
          <button
            onClick={() => setIsExportOpen(!isExportOpen)}
            className="flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-lg border border-im-teal text-im-teal text-[10px] md:text-xs font-semibold hover:bg-im-teal/5 transition-colors whitespace-nowrap"
          >
            <span className="hidden xs:inline">Export Report</span>
            <span className="xs:hidden">Export</span>
          </button>

          {isExportOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => {
                  setIsExportOpen(false);
                  setShowModuleDropdown(false);
                }}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {!showModuleDropdown ? (
                  <div className="py-2">
                    <button
                      onClick={() => handleExport('total')}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-im-blue transition-colors uppercase tracking-wider"
                    >
                      Total Pending Bugs
                    </button>
                    <button
                      onClick={() => setShowModuleDropdown(true)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-im-blue transition-colors uppercase tracking-wider"
                    >
                      <span>Module Wise Pending Bugs</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col max-h-[300px]">
                    <button
                      onClick={() => setShowModuleDropdown(false)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider border-b border-slate-100 sticky top-0"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Back
                    </button>
                    <div className="overflow-y-auto py-1 custom-scrollbar">
                      {MODULES.map(m => (
                        <button
                          key={m}
                          onClick={() => {
                            setExportModalModule(m);
                            setIsExportOpen(false);
                            setShowModuleDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-im-blue transition-colors uppercase tracking-wider"
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        
        <button className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-im-blue transition-colors cursor-pointer hidden md:flex">
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {exportModalModule && dashboardData && (
        <ExportMailModal
          moduleName={exportModalModule}
          dashboardData={dashboardData}
          onClose={() => setExportModalModule(null)}
        />
      )}
    </header>
  );
}
