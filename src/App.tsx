import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './utils/cn';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AlertCircle } from 'lucide-react';
import { SettingsModal } from './components/SettingsModal';
import { ManagementView } from './views/ManagementView';
import { LeadsView } from './views/LeadsView';
import { AiInsightsView } from './views/AiInsightsView';
import { fetchBugs, syncBugs, fetchSnapshots, DashboardData, BugSnapshot } from './services/openProject';
import { getQAInsights, isAiCircuitBroken } from './services/gemini';
import { Bug } from './types';
import { ChatBot } from './components/ChatBot';
import { GlobalCursorGlow } from './components/GlobalCursorGlow';

function App() {
  const [view, setView] = useState<'management' | 'leads' | 'ai'>('management');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [snapshots, setSnapshots] = useState<BugSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [aiFailed, setAiFailed] = useState(false);

  const loadData = async (forceSync = false) => {
    setLoading(true);
    setError(null);
    try {
      if (forceSync) {
        setIsSyncing(true);
        await syncBugs();
      }
      
      const [data, snapshotData] = await Promise.all([
        fetchBugs(),
        fetchSnapshots(30)
      ]);

      setDashboardData(data);
      setBugs(data.bugs);
      setSnapshots(snapshotData);
      setLastUpdated(new Date());
      
      if (data.bugs.length === 0 && !forceSync) {
        setError("Local database is empty. Please click 'Sync Data' to fetch bugs from OpenProject.");
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || "Failed to connect. Please check your API key and URL in Settings.");
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const generateAiInsights = async () => {
    if (isAiCircuitBroken() || aiFailed) return;
    setAiLoading(true);
    try {
      const insights = await getQAInsights(bugs, snapshots);
      if (insights) {
        setAiInsights(insights);
        setAiFailed(false);
      } else {
        setAiFailed(true);
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      setAiFailed(true);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (bugs.length > 0 && !aiLoading && !aiInsights && !aiFailed && !isAiCircuitBroken()) {
      generateAiInsights();
    }
  }, [bugs, aiInsights, aiLoading, aiFailed]);

  useEffect(() => {
    // Close mobile menu when view changes
    setIsMobileMenuOpen(false);
  }, [view]);

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
        loadData={() => loadData(false)}
        setShowSettings={setIsSettingsOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      <main className={cn(
        "flex-1 overflow-y-auto custom-scrollbar relative z-10 transition-all duration-300",
        isCollapsed ? "md:ml-[60px]" : "md:ml-[220px]",
        "ml-0"
      )}>
        <Header 
          view={view} 
          bugs={bugs}
          loading={loading || isSyncing}
          onRefresh={() => loadData(true)}
          syncing={isSyncing}
          dashboardData={dashboardData}
          toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        <div className="p-4 md:p-10 max-w-[1600px] mx-auto min-h-[calc(100vh-80px)]">
          {!loading && !isSyncing && (error || isAiCircuitBroken()) && (
            <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{isAiCircuitBroken() ? "AI System Suspended due to repeated failures. Refresh page to try again." : error}</span>
            </div>
          )}
          
          <div className="w-full h-full">
            {view === 'management' && <ManagementView bugs={bugs} stats={stats} dashboardData={dashboardData} snapshots={snapshots} aiInsights={aiInsights} />}
            {view === 'leads' && <LeadsView bugs={bugs} />}
            {view === 'ai' && (
              <AiInsightsView
                insights={aiInsights}
                loading={aiLoading}
                onRefresh={generateAiInsights}
              />
            )}
          </div>
        </div>
      </main>

      <SettingsModal
        show={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={() => loadData()}
      />
      <ChatBot bugs={bugs} data={dashboardData} />
      <GlobalCursorGlow />
    </div>
  );
}

export default App;

