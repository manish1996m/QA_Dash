import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, Save, Check } from 'lucide-react';

interface SettingsModalProps {
  show: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export function SettingsModal({ show, onClose, onSave }: SettingsModalProps) {
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-1.5-flash');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const savedUrl = localStorage.getItem('openproject_url') || '';
    const savedKey = localStorage.getItem('openproject_api_key') || '';
    const savedGeminiKey = localStorage.getItem('gemini_api_key') || '';
    const savedGeminiModel = localStorage.getItem('gemini_model') || 'gemini-1.5-flash';
    setUrl(savedUrl);
    setApiKey(savedKey);
    setGeminiKey(savedGeminiKey);
    setGeminiModel(savedGeminiModel);
  }, [show]);

  const handleSave = () => {
    localStorage.setItem('openproject_url', url.trim());
    localStorage.setItem('openproject_api_key', apiKey.trim());
    localStorage.setItem('gemini_api_key', geminiKey.trim());
    localStorage.setItem('gemini_model', geminiModel.trim() || 'gemini-1.5-flash');
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      if (onSave) onSave();
      onClose();
    }, 1000);
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md bg-white rounded-xl p-6 shadow-2xl border border-black/[0.08]"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex flex-col">
                <h3 className="text-lg font-bold text-slate-800">Configurations</h3>
                <p className="text-[11px] text-slate-400 font-medium">Configure your data sources and AI assistant</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-lg transition-colors group">
                <X className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
              </button>
            </div>

            <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
              {/* OpenProject URL */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">OpenProject URL</label>
                <input 
                  type="text" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://project.intermesh.net"
                  className="w-full bg-slate-50 border border-black/[0.05] rounded-lg px-3 py-2.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-im-blue/10 focus:border-im-blue transition-all"
                />
              </div>

              {/* OpenProject API Key */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">OpenProject API Key</label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your OpenProject API Key"
                  className="w-full bg-slate-50 border border-black/[0.05] rounded-lg px-3 py-2.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-im-blue/10 focus:border-im-blue transition-all"
                />
              </div>

              {/* Gemini API Key */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Gemini AI API Key</label>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[9px] text-im-blue hover:underline font-bold uppercase tracking-tighter"
                  >
                    Get free key
                  </a>
                </div>
                <input 
                  type="password" 
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="Enter your Gemini API Key"
                  className="w-full bg-slate-50 border border-black/[0.05] rounded-lg px-3 py-2.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-im-blue/10 focus:border-im-blue transition-all"
                />
              </div>

              {/* Gemini Model Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Gemini Model Name</label>
                <input 
                  type="text" 
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  placeholder="gemini-1.5-flash"
                  className="w-full bg-slate-50 border border-black/[0.05] rounded-lg px-3 py-2.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-im-blue/10 focus:border-im-blue transition-all"
                />
                <p className="text-[9px] text-slate-400 italic font-medium leading-none mt-1">Try "gemini-pro" if flash is unavailable.</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              <div className="p-4 bg-im-blue/[0.03] border border-im-blue/[0.08] rounded-lg text-[11px] text-slate-600 flex flex-col gap-2">
                <div className="font-bold flex items-center gap-2 text-im-blue">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Security Note
                </div>
                <p className="leading-relaxed">
                  These settings are stored locally in your browser. For production, set <code className="bg-im-blue/10 px-1 rounded text-im-blue">OPENPROJECT_API_KEY</code> in your environment variables.
                </p>
              </div>

              <button 
                onClick={handleSave}
                disabled={isSaved}
                className={cn(
                  "w-full py-3 rounded-lg font-bold uppercase tracking-wider text-[11px] transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2",
                  isSaved ? "bg-green-500 text-white" : "bg-im-blue text-white hover:bg-im-blue-light"
                )}
              >
                {isSaved ? (
                  <>
                    <Check className="w-4 h-4" />
                    Saved Successfully
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Configuration
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Helper function for class merging since cn is used in App.tsx but might not be imported here
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
