import React from 'react';
import { RefreshCw } from 'lucide-react';

interface SidebarProps {
  lastUpdated: Date;
  loading: boolean;
  onRefresh: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  lastUpdated, 
  loading, 
  onRefresh 
}) => {
  return (
    <nav className="fixed left-0 top-0 h-full w-64 border-r border-gray-200 bg-white z-50 p-6 flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-4">
          <img 
            src="https://corporate.indiamart.com/wp-content/uploads/2024/09/logo.webp" 
            alt="IndiaMART" 
            className="h-10 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <h1 className="text-xs font-bold uppercase tracking-widest text-gray-400">QA Insight Dashboard</h1>
      </div>

      <div className="mt-auto pt-6 border-t border-gray-100">
        <div className="text-[10px] uppercase tracking-widest opacity-50 mb-2">Last Updated</div>
        <div className="font-mono text-xs text-gray-500">{lastUpdated.toLocaleTimeString()}</div>
        <button 
          onClick={onRefresh}
          disabled={loading}
          className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-600 hover:underline disabled:opacity-50"
        >
          <RefreshCw className={loading ? "animate-spin w-3 h-3" : "w-3 h-3"} />
          Refresh Data
        </button>
      </div>
    </nav>
  );
};
