import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, User, Loader2, Minimize2, Maximize2 } from 'lucide-react';
import { Bug } from '../types';
import { DashboardData } from '../services/openProject'; 
import { askQAAssist } from '../services/gemini';
import { cn } from '../utils/cn';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatBotProps {
  bugs: Bug[];
  data?: DashboardData | null;
}

export function ChatBot({ bugs, data }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm QA Assist. I can answer questions about your bug data. Try asking 'Are there any unassigned iOS bugs?'",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, isMinimized]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await askQAAssist(bugs, input, data);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Chat Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-black/[0.05] overflow-hidden flex flex-col transition-all duration-300",
              isMinimized ? "w-72 h-14" : "w-[400px] h-[550px]"
            )}
          >
            {/* Header */}
            <div className="bg-im-blue p-4 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center border border-white/20">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">QA Assist</h3>
                  {!isMinimized && <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider">Online</p>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "flex gap-3 max-w-[85%]",
                        m.sender === 'user' ? "ml-auto flex-row-reverse" : ""
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                        m.sender === 'user' ? "bg-white border-slate-200" : "bg-im-blue/10 border-im-blue/10"
                      )}>
                        {m.sender === 'user' ? <User className="w-4 h-4 text-slate-500" /> : <Bot className="w-4 h-4 text-im-blue" />}
                      </div>
                      <div className={cn(
                        "p-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                        m.sender === 'user' 
                          ? "bg-im-blue text-white rounded-tr-none" 
                          : "bg-white border border-black/[0.03] text-slate-800 rounded-tl-none"
                      )}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 max-w-[85%]">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-im-blue/10 border border-im-blue/10">
                        <Bot className="w-4 h-4 text-im-blue" />
                      </div>
                      <div className="bg-white border border-black/[0.03] p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-im-blue" />
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t border-black/[0.05]">
                  <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-black/[0.03] focus-within:border-im-blue focus-within:ring-2 focus-within:ring-im-blue/5 transition-all">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask a question..."
                      className="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 placeholder:text-slate-400 py-1"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="p-1.5 bg-im-blue text-white rounded-lg hover:bg-im-blue-light disabled:opacity-50 disabled:grayscale transition-all active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 bg-im-blue text-white rounded-2xl shadow-[0_10px_30px_rgba(0,102,255,0.3)] flex items-center justify-center hover:bg-im-blue-light transition-all duration-300",
          isOpen ? "hidden" : "flex"
        )}
      >
        <MessageSquare className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-im-bg rounded-full animate-pulse" />
      </motion.button>
    </div>
  );
}
