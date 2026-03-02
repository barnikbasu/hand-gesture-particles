import React, { useState, useCallback, useEffect } from 'react';
import { Results } from '@mediapipe/hands';
import { motion, AnimatePresence } from 'framer-motion';
import { HandTracker } from './components/HandTracker';
import { ParticleCanvas } from './components/ParticleCanvas';
import { 
  Sparkles, 
  Wind, 
  Zap, 
  Flame, 
  MousePointer2, 
  Magnet, 
  RotateCcw, 
  Bomb,
  Settings2,
  Cpu,
  AlertCircle
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

type Theme = 'neon' | 'ethereal' | 'matrix' | 'fire' | 'custom';
type Mode = 'attract' | 'repel' | 'vortex' | 'shatter';

export default function App() {
  const [isMounted, setIsMounted] = useState(false);
  const [handResults, setHandResults] = useState<Results | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [theme, setTheme] = useState<Theme>('neon');
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [customThemeName, setCustomThemeName] = useState<string>('');
  const [mode, setMode] = useState<Mode>('attract');
  const [showControls, setShowControls] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    console.log("GestureFlow App Initialized");
    const handleError = (e: ErrorEvent) => {
      console.error("Runtime error caught:", e.error);
      setAppError(e.message);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const handleResults = useCallback((results: Results) => {
    setHandResults(results);
  }, []);

  const generateAITheme = async () => {
    setIsGenerating(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "undefined") {
        throw new Error("Gemini API Key is not configured.");
      }
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Suggest a creative particle theme name and 4 hex colors for a hand-gesture interactive art app. Return ONLY JSON like { \"name\": \"string\", \"colors\": [\"#hex\", \"#hex\", \"#hex\", \"#hex\"] }",
      });
      
      const text = response.text;
      const data = JSON.parse(text.replace(/```json|```/g, '').trim());
      if (data.colors && data.name) {
        setCustomColors(data.colors);
        setCustomThemeName(data.name);
        setTheme('custom');
      }
    } catch (error) {
      console.error("AI Generation failed", error);
      setTheme('neon');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="animate-pulse text-xl font-black tracking-tighter italic uppercase">
          Gesture<span className="text-cyan-400">Flow</span>
        </div>
      </div>
    );
  }

  if (appError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-8 text-center">
        <AlertCircle className="text-red-500 mb-4" size={48} />
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-sm opacity-60 mb-6 max-w-md">{appError}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-white/10 border border-white/20 rounded-full hover:bg-white/20 transition-colors"
        >
          Reload Application
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans text-white">
      {/* Background Particle Canvas */}
      <ParticleCanvas handResults={handResults} theme={theme} mode={mode} customColors={customColors} />

      {/* Hand Tracker Feed */}
      <HandTracker onResults={handleResults} isReady={setIsCameraReady} />

      {/* UI Overlay */}
      <div className="relative z-10 pointer-events-none h-full flex flex-col justify-between p-8">
        {/* Header */}
        <header className="flex justify-between items-start">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-1"
          >
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">
              Gesture<span className="text-cyan-400">Flow</span>
            </h1>
            <p className="text-xs font-mono opacity-50 uppercase tracking-widest">
              Interactive Kinetic Art • v2.0
            </p>
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowControls(!showControls)}
            className="pointer-events-auto p-3 bg-white/5 border border-white/10 rounded-full backdrop-blur-md hover:bg-white/10 transition-colors"
          >
            <Settings2 size={20} />
          </motion.button>
        </header>

        {/* Controls */}
        <AnimatePresence>
          {showControls && (
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="pointer-events-auto flex flex-col gap-8 max-w-xs"
            >
              {/* Interaction Modes */}
              <section className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Interaction Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'attract', icon: Magnet, label: 'Attract' },
                    { id: 'repel', icon: Wind, label: 'Repel' },
                    { id: 'vortex', icon: RotateCcw, label: 'Vortex' },
                    { id: 'shatter', icon: Bomb, label: 'Shatter' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id as Mode)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        mode === m.id 
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]' 
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <m.icon size={16} />
                      <span className="text-xs font-medium">{m.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Themes */}
              <section className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Visual Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'neon', icon: Zap, label: 'Neon' },
                    { id: 'ethereal', icon: Sparkles, label: 'Ethereal' },
                    { id: 'matrix', icon: Cpu, label: 'Matrix' },
                    { id: 'fire', icon: Flame, label: 'Fire' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id as Theme)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        theme === t.id 
                          ? 'bg-white/20 border-white text-white' 
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <t.icon size={16} />
                      <span className="text-xs font-medium">{t.label}</span>
                    </button>
                  ))}
                  {theme === 'custom' && (
                    <button
                      onClick={() => setTheme('custom')}
                      className="col-span-2 flex items-center gap-3 p-3 rounded-xl border bg-indigo-500/20 border-indigo-500 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                    >
                      <Sparkles size={16} />
                      <span className="text-xs font-medium truncate">AI: {customThemeName}</span>
                    </button>
                  )}
                </div>
              </section>

              {/* AI Theme Generator */}
              <button
                onClick={generateAITheme}
                disabled={isGenerating}
                className="group relative flex items-center justify-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg overflow-hidden"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.2),transparent)]" />
                <Sparkles size={18} className={isGenerating ? 'animate-spin' : 'group-hover:scale-110 transition-transform'} />
                <span className="text-sm font-bold tracking-tight">
                  {isGenerating ? 'Generating...' : 'AI Theme Shift'}
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Info */}
        <footer className="flex justify-between items-end">
          <div className="space-y-2">
            {!isCameraReady && (
              <motion.div 
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="flex items-center gap-2 text-amber-400"
              >
                <div className="w-2 h-2 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Initializing Camera...</span>
              </motion.div>
            )}
            {isCameraReady && (
              <div className="flex items-center gap-2 text-emerald-400">
                <div className="w-2 h-2 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
                <span className="text-[10px] font-bold uppercase tracking-widest">System Active</span>
              </div>
            )}
          </div>

          <div className="text-right">
            <p className="text-[10px] font-mono opacity-30 uppercase">
              Use your index finger to interact
            </p>
          </div>
        </footer>
      </div>

      {/* Custom Cursor */}
      <div className="fixed inset-0 pointer-events-none z-50">
        {handResults?.multiHandLandmarks?.map((hand, hIdx) => {
          const tip = hand[8];
          return (
            <motion.div
              key={hIdx}
              className="absolute w-8 h-8 border-2 border-white/50 rounded-full -translate-x-1/2 -translate-y-1/2"
              animate={{
                left: `${(1 - tip.x) * 100}%`,
                top: `${tip.y * 100}%`,
                scale: [1, 1.2, 1],
              }}
              transition={{ duration: 0.1 }}
            >
              <div className="absolute inset-0 m-auto w-1 h-1 bg-white rounded-full shadow-[0_0_10px_#fff]" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
