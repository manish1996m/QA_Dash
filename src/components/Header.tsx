import React from 'react';
import { Settings, RefreshCw } from 'lucide-react';
import { cn } from '../utils/cn';

interface HeaderProps {
  view: string;
  bugs: any[];
  loading?: boolean;
  onRefresh?: () => void;
  syncing?: boolean;
}

export function Header({ view, bugs, loading = false, onRefresh, syncing = false }: HeaderProps) {
  const [isExportOpen, setIsExportOpen] = React.useState(false);

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
      subject = `QA Report: Module Wise Pending Bugs - ${new Date().toLocaleDateString()}`;
      // Group by module
      const modules: Record<string, number> = {};
      bugs.filter(b => b.status === 'Pending').forEach(b => {
        modules[b.module] = (modules[b.module] || 0) + 1;
      });

      let moduleText = "";
      Object.entries(modules).forEach(([name, count]) => {
        moduleText += `${name}: ${count} pending\n`;
      });

      body = `Hi Team,\n\nModule Wise Pending Bugs Report:\n${moduleText}\n\nPlease take necessary actions.\n\nRegards,\nQA Dashboard`;
    }

    window.location.href = `mailto:${spocs}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setIsExportOpen(false);
  };

  return (
    <header className="h-14 px-6 bg-white border-b border-slate-200 flex justify-between items-center sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold text-im-blue capitalize tracking-tight">
          {view === 'management' ? 'Management Dashboard' : view === 'leads' ? 'Team Performance' : 'AI Intelligence'}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={onRefresh}
          disabled={loading || syncing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-im-blue hover:border-im-blue transition-all disabled:opacity-50"
          title="Sync with OpenProject"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", (loading || syncing) && "animate-spin")} />
          <span className="text-[11px] font-bold uppercase tracking-wider">
            {syncing ? "Syncing..." : "Sync Data"}
          </span>
        </button>

        <div className="relative">
          <button
            onClick={() => setIsExportOpen(!isExportOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-im-teal text-im-teal text-xs font-semibold hover:bg-im-teal/5 transition-colors"
          >
            Export Report
          </button>

          {isExportOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsExportOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={() => handleExport('total')}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-im-blue transition-colors uppercase tracking-wider"
                >
                  Total Pending Bugs
                </button>
                <button
                  onClick={() => handleExport('module')}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-im-blue transition-colors uppercase tracking-wider"
                >
                  Module Wise Pending Bugs
                </button>
              </div>
            </>
          )}
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-im-blue transition-colors cursor-pointer">
          <Settings className="w-4 h-4" />
        </div>
      </div>
    </header>
  );
}
