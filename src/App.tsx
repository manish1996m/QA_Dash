import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './utils/cn';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AlertCircle } from 'lucide-react';
import { SettingsModal } from './components/SettingsModal';
import { ManagementView } from './views/ManagementView';
import { LeadsView } from './views/LeadsView';
import { AiInsightsView } from './views/AiInsightsView';
import { fetchBugs, DashboardData } from './services/openProject';
import { getQAInsights } from './services/gemini';
import { Bug } from './types';
import { ChatBot } from './components/ChatBot';

function App() {
  const [view, setView] = useState<'management' | 'leads' | 'ai'>('management');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBugs();
      setDashboardData(data);
      setBugs(data.bugs);
      setLastUpdated(new Date());
      if (data.bugs.length === 0) {
        setError("No bug data found. Your API responded successfully, but returned 0 results. Please check your Project IDs and filter settings.");
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || "Failed to connect to OpenProject. Please check your API key and URL in Settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const generateAiInsights = async () => {
    setAiLoading(true);
    try {
      const insights = await getQAInsights(bugs);
      setAiInsights(insights);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'ai' && !aiInsights && bugs.length > 0) {
      generateAiInsights();
    }
  }, [view, bugs]);

  const stats = {
    android: dashboardData?.global.androidPending || 0,
    ios: dashboardData?.global.iosPending || 0,
    androidHigh: dashboardData?.global.androidHigh || 0,
    iosHigh: dashboardData?.global.iosHigh || 0,
  };

  return (
    <div className="flex h-screen bg-im-bg text-slate-900 font-sans selection:bg-im-blue/10 overflow-hidden relative">
      <Sidebar
        view={view}
        setView={setView}
        lastUpdated={lastUpdated}
        loading={loading}
        loadData={loadData}
        setShowSettings={setIsSettingsOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      <main className={cn(
        "flex-1 overflow-y-auto custom-scrollbar relative z-10 transition-all duration-300",
        isCollapsed ? "ml-[60px]" : "ml-[220px]"
      )}>
        <Header
          view={view}
          bugs={bugs}
          loading={loading}
          onRefresh={loadData}
        />

        <div className="p-10 max-w-[1600px] mx-auto min-h-[calc(100vh-80px)]">
          {!loading && error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {view === 'management' && <ManagementView bugs={bugs} stats={stats} dashboardData={dashboardData} />}
              {view === 'leads' && <LeadsView bugs={bugs} />}
              {view === 'ai' && (
                <AiInsightsView
                  insights={aiInsights}
                  loading={aiLoading}
                  onRefresh={generateAiInsights}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <SettingsModal
        show={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={() => loadData()}
      />
      <ChatBot bugs={bugs} data={dashboardData} />
    </div>
  );
}

export default App;
