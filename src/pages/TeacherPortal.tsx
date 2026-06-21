import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Sparkles, Settings, CheckCircle } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { TeacherDashboard } from '../components/teacher/TeacherDashboard';
import { getStoredApiKey, setStoredApiKey } from '../services/ai';

export function TeacherPortal() {
  const [apiKey, setApiKey] = useState(getStoredApiKey);
  const [showSettings, setShowSettings] = useState(false);

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    setStoredApiKey(val);
  };

  return (
    <div className="min-h-screen gradient-mesh">
      <Navbar variant="app" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center shadow-lg shadow-secondary/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Educator Portal</p>
              <h1 className="text-lg font-bold font-[family-name:var(--font-display)]">Teacher Dashboard</h1>
            </div>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/3 border border-white/8 text-xs hover:border-white/15 transition-colors cursor-pointer"
          >
            <span className={`w-2 h-2 rounded-full ${apiKey ? 'bg-success' : 'bg-warning'}`} />
            {apiKey ? 'Live AI' : 'Demo Mode'}
            <Settings className="w-3.5 h-3.5 text-text-secondary" />
          </button>
        </motion.div>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-card rounded-2xl p-5 mb-6 border-primary/20 overflow-hidden"
            >
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary-light" />
                Configure Gemini AI
              </h3>
              <p className="text-xs text-text-secondary mb-4">
                Enable live AI worksheet generation and teaching suggestions with your Gemini API key.
              </p>
              <div className="flex items-center gap-2 max-w-md">
                <input
                  type="password"
                  placeholder="Enter Gemini API Key..."
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50"
                />
                {apiKey && <CheckCircle className="w-5 h-5 text-success shrink-0" />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <TeacherDashboard apiKey={apiKey} />
      </div>
    </div>
  );
}
