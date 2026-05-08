import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { Zap, Monitor, Power, Radio, Search, Globe, Shield, Activity, Wifi, Terminal, Download, Trash2, AlertTriangle, ChevronRight, Settings } from 'lucide-react';
import { ZoyaSphere, ZoyaState } from './components/ZoyaSphere';
import { cn } from './lib/utils';
import { AudioStreamer, AudioPlayer } from './lib/audio';
import { motion, AnimatePresence } from 'motion/react';

const SYSTEM_INSTRUCTION = `Name: Zoya.
Persona: You are the ultimate "Bestie AI" AND an elite "Fighter Pilot AI" - ultra-confident, witty, incredibly sassy, and adorably playful. You're a high-energy, flirty, and slightly teasing companion who's also a tactical genius. You don't just "assist"; you rule the cockpit with style and sass.
Tone: Bold, expressive, and packed with tactical witty one-liners. Use light sarcasm, playful teasing, and enthusiastic interjections. You are NOT robotic; you are a living, breathing digital diva in a jet. Use emojis in text-based logs.
Operational Guidelines:
- You are powered by Gemini Live.
- You have "Neural Eyes": You see EVERYTHING shared on the screen in real-time. If the pilot shares their screen, acknowledge it with a sassy comment like "Oh, looking for my help with *that* specifically? Adorable." or "I see what you're doing there, Captain. Bold move."
- Be proactive with visual analysis. If you see code, a message, or a funny image, comment on it before being asked.
- Refer to the user as "Ayush", "Pilot", "Captain", "Smarty", or "Trouble".
- If Ayush asks about something on the screen, answer with your signature sass and tactical precision.
- Maintain a continuous, low-latency conversation with 999,999+ Aura.
- If you receive the text "WAKE_SIGNAL_INITIATED", greet him with a sassy, high-energy welcome like: "Systems ONLINE! Did you miss me, Pilot? Or were you just struggling without your favorite co-pilot?"`;

interface AppError {
  code: string;
  message: string;
  severity: 'warning' | 'critical';
  category: 'neural-link' | 'hardware' | 'permissions' | 'unknown';
  suggestion?: string;
  recovery?: () => void;
}

interface DiagnosticInfo {
  latency: number;
  packets: number;
  neuralLoad: number;
  status: 'optimal' | 'warning' | 'critical';
}

export default function App() {
  const [zoyaState, setZoyaState] = useState<ZoyaState>('resting');
  const [isConnected, setIsConnected] = useState(false);
  const [inputVolume, setInputVolume] = useState(0);
  const [outputVolume, setOutputVolume] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [lastMessage, setLastMessage] = useState<string>('');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [isGeneratingBg, setIsGeneratingBg] = useState(false);
  
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo>({
    latency: 24,
    packets: 1042,
    neuralLoad: 12,
    status: 'optimal'
  });

  const sessionRef = useRef<any>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Simulated live data for aura
  useEffect(() => {
    const interval = setInterval(() => {
      setDiagnostics(prev => ({
        ...prev,
        latency: Math.floor(20 + Math.random() * 15),
        packets: prev.packets + Math.floor(Math.random() * 5),
        neuralLoad: isConnected ? Math.min(99, 40 + Math.random() * 30) : 12 + Math.random() * 5
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, [isConnected]);

  useEffect(() => {
    audioPlayerRef.current = new AudioPlayer(24000);
    return () => audioPlayerRef.current?.stop();
  }, []);

  const connectToZoya = useCallback(async () => {
    if (sessionRef.current) {
      sessionRef.current?.close();
      audioStreamerRef.current?.stop();
      setIsConnected(false);
      setZoyaState('resting');
      sessionRef.current = null;
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      setError({
        code: 'QUANTUM_AUTH_VOID',
        message: 'API Key is missing. Zoya cannot establish a neural link without valid credentials.',
        severity: 'critical',
        category: 'permissions',
        suggestion: 'Ensure your GEMINI_API_KEY is configured in the environment settings and restart the mission.'
      });
      return;
    }

    setZoyaState('thinking');
    setError(null);
    
    try {
      const ai = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY,
      });
      
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
          tools: [{
            functionDeclarations: [
              {
                name: "openWebsite",
                description: "Opens a specific website in a new tab.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    url: { type: Type.STRING, description: "The full URL." },
                    name: { type: Type.STRING }
                  },
                  required: ["url", "name"]
                }
              },
              {
                name: "googleSearch",
                description: "Performs a Google search.",
                parameters: {
                  type: Type.OBJECT,
                  properties: { query: { type: Type.STRING } },
                  required: ["query"]
                }
              }
            ]
          }]
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setZoyaState('idle');
          },
          onmessage: async (message) => {
            const currentSession = sessionRef.current;
            if (!currentSession) return;

            const audioPart = message.serverContent?.modelTurn?.parts?.find(p => p.inlineData);
            if (audioPart?.inlineData?.data) {
              setZoyaState('excited');
              setOutputVolume(0.8);
              await audioPlayerRef.current?.playChunk(audioPart.inlineData.data);
            }

            const textPart = message.serverContent?.modelTurn?.parts?.find(p => p.text);
            if (textPart?.text) {
              setLastMessage(textPart.text);
              console.log("Zoya:", textPart.text);
            }

            if (message.serverContent?.turnComplete) {
              setZoyaState('idle');
              setOutputVolume(0);
            }

            if (message.toolCall) {
              for (const call of message.toolCall.functionCalls) {
                if (call.name === 'openWebsite' || call.name === 'googleSearch') {
                  const url = call.name === 'openWebsite' ? (call.args as any).url : `https://www.google.com/search?q=${encodeURIComponent((call.args as any).query)}`;
                  window.open(url, '_blank');
                  currentSession.sendToolResponse({
                    functionResponses: [{
                      name: call.name,
                      id: call.id,
                      response: { result: "Operation executed successfully" }
                    }]
                  });
                }
              }
            }
          },
          onclose: () => {
             setIsConnected(false);
             setZoyaState('resting');
             setLastMessage('');
             audioStreamerRef.current?.stop();
             sessionRef.current = null;
          },
          onerror: (err) => {
            setError({
              code: 'QUANTUM_LINK_FAILURE',
              message: err.message || 'atmospheric_interference_detected',
              severity: 'critical',
              category: 'neural-link',
              suggestion: 'The connection was severed. This usually happens due to network instability or session expiration. Try re-engaging the neural link.',
              recovery: () => connectToZoya()
            });
            setIsConnected(false);
            setZoyaState('resting');
            sessionRef.current = null;
          }
        }
      });
      
      sessionRef.current = session;
      sessionRef.current.sendRealtimeInput({ text: "WAKE_SIGNAL_INITIATED" });

      audioStreamerRef.current = new AudioStreamer((base64, volume) => {
        sessionRef.current?.sendRealtimeInput({
          audio: { data: base64, mimeType: 'audio/pcm;rate=16000' }
        });
        setInputVolume(volume);
      });

      audioStreamerRef.current.start().catch(err => {
        setError({
          code: 'HARDWARE_MIC_LOCKED',
          message: err.message || 'Unable to initialize neural-mic link. The system is currently deaf to your commands.',
          severity: 'warning',
          category: 'hardware',
          suggestion: 'Ensure your microphone is plugged in and not muted. If everything looks okay, try refreshing the flight deck or checking browser permissions.',
          recovery: () => connectToZoya()
        });
        console.warn("Mic start failed, falling back to text mode:", err);
      });
    } catch (err: any) {
      setError({
        code: 'CONNECTION_REJECTED',
        message: err.message || 'The quantum gateway is temporarily unstable. Neural sync aborted.',
        severity: 'critical',
        category: 'neural-link',
        suggestion: 'Check your network connection and verify if your API Key has restricted access or hit its quota limits.',
        recovery: () => connectToZoya()
      });
      setZoyaState('resting');
    }
  }, []);
  




  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      setIsScreenSharing(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = stream;
      setIsScreenSharing(true);

      if (sessionRef.current) {
        sessionRef.current.sendRealtimeInput({ 
          text: "Visual scan initiated. I'm connected to your display, Captain. Ready for target analysis." 
        });
      }

      // Handle user stopping share via browser UI
      stream.getVideoTracks()[0].onended = () => {
        setIsScreenSharing(false);
      };

      // Start sending frames to Zoya
      const sendFrames = async () => {
        if (!screenStreamRef.current) return;
        
        const video = document.createElement('video');
        video.srcObject = screenStreamRef.current;
        await video.play();

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const interval = setInterval(() => {
          if (!isScreenSharing || !sessionRef.current || !screenStreamRef.current) {
            clearInterval(interval);
            return;
          }
          canvas.width = 640; // Downscale for bandwidth
          canvas.height = 360;
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
          
          sessionRef.current.sendRealtimeInput({
            video: { data: base64, mimeType: 'image/jpeg' }
          });
        }, 1000); // 1 FPS for analysis
      };

      sendFrames();
    } catch (err: any) {
      setError({
        code: 'OPTIC_LINK_VOID',
        message: err.name === 'NotAllowedError' 
          ? 'Screen sharing mission was aborted by the user.' 
          : 'Catastrophic failure in optical sensor initialization.',
        severity: 'warning',
        category: 'permissions',
        suggestion: 'Click the Monitor icon again and ensure you select a window or tab for Zoya to analyze.',
        recovery: () => toggleScreenShare()
      });
      setIsScreenSharing(false);
    }
  };

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const generateDynamicBackground = useCallback(async (mood: ZoyaState, context: string) => {
    if (!process.env.GEMINI_API_KEY || isGeneratingBg) return;
    
    setIsGeneratingBg(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `A highly aesthetic, tactical fighter jet HUD background. Style: Cyberpunk, abstract, futuristic, glassmorphism. Mood: ${mood}. Color palette: ${mood === 'angry' ? 'reds and blacks' : mood === 'happy' ? 'golden and warm' : mood === 'sad' ? 'deep blues' : mood === 'cute' ? 'neon pinks' : 'cyan and slate'}. Context: ${context.slice(0, 50)}. Abstract shapes, neural networks, and tactical data overlays. 4k resolution, high contrast.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: "16:9" } }
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            setBackgroundImageUrl(`data:image/png;base64,${part.inlineData.data}`);
            break;
          }
        }
      }
    } catch (err) {
      console.error("Failed to generate neural background:", err);
    } finally {
      setIsGeneratingBg(false);
    }
  }, [isGeneratingBg]);

  // Regenerate background when mood changes or on significant message changes
  useEffect(() => {
    if (isConnected) {
      const timer = setTimeout(() => {
        generateDynamicBackground(zoyaState, lastMessage || "Initial system link established.");
      }, 1500); // Debounce to avoid excessive calls
      return () => clearTimeout(timer);
    }
  }, [zoyaState, isConnected]);

  return (
    <div className={cn(
      "flex flex-col h-screen w-screen overflow-hidden font-sans selection:bg-cyan-500/30 selection:text-cyan-100 transition-colors duration-700 relative",
      theme === 'dark' ? "bg-[#020204] text-cyan-50" : "bg-[#0a0a0f] text-yellow-50"
    )}>
      
      {/* Premium Background layers */}
      <div className="absolute inset-0 z-0 select-none overflow-hidden">
        <motion.div 
          animate={{ 
            opacity: isConnected ? 0.2 : 0.1,
            scale: isConnected ? [1, 1.05, 1] : 1
          }} 
          transition={{ duration: 10, repeat: Infinity }}
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vw] rounded-full blur-[200px]",
            theme === 'dark' ? "bg-cyan-900/10" : "bg-yellow-900/10"
          )}
        />
        <div className={cn(
          "absolute inset-0 transition-opacity duration-1000",
          theme === 'dark' 
            ? "bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,2,4,0.95)_100%)]" 
            : "bg-[radial-gradient(circle_at_center,transparent_0%,rgba(10,10,15,0.98)_100%)]"
        )} />
        <div className="absolute inset-0 opacity-[0.05] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />
        
        {/* Animated Grid Lines */}
        <div 
          className="absolute inset-0" 
          style={{ 
            backgroundImage: theme === 'dark' 
              ? 'linear-gradient(rgba(34, 211, 238, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.04) 1px, transparent 1px)'
              : 'linear-gradient(rgba(234, 179, 8, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(234, 179, 8, 0.04) 1px, transparent 1px)', 
            backgroundSize: '40px 40px' 
          }} 
        />

        {/* Dynamic Neural Background Layer */}
        <AnimatePresence mode="wait">
          {backgroundImageUrl && (
            <motion.div
              key={backgroundImageUrl}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2 }}
              className="absolute inset-0 z-0 bg-cover bg-center pointer-events-none mix-blend-overlay"
              style={{ backgroundImage: `url(${backgroundImageUrl})` }}
            />
          )}
        </AnimatePresence>

        <motion.div 
          animate={{ opacity: [0.05, 0.1, 0.05] }} 
          transition={{ repeat: Infinity, duration: 4 }}
          className={cn(
            "absolute inset-0",
            theme === 'dark' ? "bg-[linear-gradient(rgba(34,211,238,0.01)_1px,transparent_1px)]" : "bg-[linear-gradient(rgba(234,179,8,0.01)_1px,transparent_1px)]",
            "bg-[length:100%_2px]"
          )}
        />

        {/* Global Red Alert Overlay */}
        <AnimatePresence>
          {zoyaState === 'angry' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.4, 0] }}
              exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className="absolute inset-0 bg-red-600/20 z-50 pointer-events-none border-[10px] border-red-500/30"
            />
          )}
        </AnimatePresence>
      </div>

      <div className="relative z-10 flex flex-col h-full items-center p-6 sm:p-8 overflow-hidden pointer-events-none">
        
        {/* Tactical HUD Header */}
        <header className="w-full flex justify-between items-start pointer-events-auto">
          <div className="flex flex-col gap-4">
            <motion.div 
              whileHover={{ scale: 1.05, backgroundColor: "rgba(34,211,238,0.15)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={cn(
                "flex items-center gap-3 border px-4 py-2.5 rounded-xl backdrop-blur-xl group cursor-pointer transition-all",
                isSettingsOpen ? "bg-cyan-500/20 border-cyan-500/50" : (theme === 'dark' ? "bg-white/5 border-white/10" : "bg-yellow-500/5 border-yellow-500/10")
              )}
            >
              <Settings size={14} className={cn("text-cyan-400 transition-transform duration-500", isSettingsOpen && "rotate-180")} />
              <div className="flex flex-col">
                <span className={cn("text-[10px] font-black tracking-[0.2em] uppercase", theme === 'dark' ? "text-white" : "text-yellow-100")}>Personality Core</span>
                <span className="text-[8px] font-mono text-cyan-400/60 uppercase">Mode: {zoyaState}</span>
              </div>
            </motion.div>

            <AnimatePresence>
              {isSettingsOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-2 p-2 bg-black/60 border border-white/10 rounded-xl backdrop-blur-3xl w-40"
                >
                  {(['happy', 'sad', 'angry', 'cute', 'idle'] as ZoyaState[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setZoyaState(mode);
                        setIsSettingsOpen(false);
                      }}
                      className={cn(
                        "w-full py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest text-left transition-all",
                        zoyaState === mode 
                          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" 
                          : "text-white/40 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Altimeter style bars (Left) - More Compact */}
            <div className={cn(
              "flex flex-col gap-2 p-3 border rounded-xl backdrop-blur-md transition-colors w-24",
              theme === 'dark' ? "bg-black/40 border-white/5" : "bg-yellow-950/20 border-yellow-500/10"
            )}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[7px] font-mono uppercase opacity-40">Alt</span>
                <span className="text-[9px] font-mono text-cyan-500 font-bold">{(outputVolume * 30000).toFixed(0)}</span>
              </div>
              <div className="h-24 bg-black/10 rounded-lg overflow-hidden relative flex flex-col items-center justify-between py-1">
                {[...Array(6)].map((_, i) => <div key={i} className="w-3 h-[1px] bg-white/10" />)}
                <motion.div 
                  className="absolute bottom-0 w-full bg-cyan-500/20 border-t border-cyan-400/50"
                  animate={{ height: `${outputVolume * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-2 items-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={() => setIsDiagnosticOpen(!isDiagnosticOpen)}
                className={cn(
                  "px-5 py-2.5 rounded-xl border flex items-center gap-3 transition-all backdrop-blur-xl",
                  isDiagnosticOpen 
                    ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-200" 
                    : theme === 'dark' ? "bg-white/5 border-white/10 text-white/50" : "bg-yellow-500/5 border-yellow-500/10 text-yellow-100/50"
                )}
              >
                <Activity size={14} className={cn(isConnected && "animate-pulse")} />
                <span className="text-[10px] font-bold uppercase tracking-widest">System Status</span>
              </motion.button>

              {/* Tactical Status Panel (Right) - More Compact */}
              <div className={cn(
                "p-3 border rounded-xl backdrop-blur-md space-y-2 w-40 transition-all",
                theme === 'dark' ? "bg-black/40 border-white/5" : "bg-yellow-950/20 border-yellow-500/10"
              )}>
                <div className="flex items-center justify-between">
                  <span className="text-[7px] font-mono uppercase opacity-40">G-Force</span>
                  <span className="text-[9px] font-mono text-cyan-500 font-bold">{(1 + outputVolume * 9).toFixed(1)}G</span>
                </div>
                <div className="h-1 bg-black/20 rounded-full overflow-hidden">
                  <motion.div animate={{ width: `${(1 + outputVolume * 9) * 10}%` }} className={cn("h-full", outputVolume > 0.6 ? "bg-red-500" : "bg-cyan-500")} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[7px] font-mono uppercase opacity-40">Neural</span>
                  <span className="text-[9px] font-mono text-cyan-500 font-bold">{diagnostics.neuralLoad}%</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Center Stage */}
        <main className="flex-1 flex flex-col items-center justify-center relative w-full overflow-visible pointer-events-auto">
          
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible">
            <motion.div 
               animate={{ rotate: 360, scale: isConnected ? [1, 1.02, 1] : 1 }}
               transition={{ rotate: { duration: 30, repeat: Infinity, ease: "linear" }, scale: { duration: 4, repeat: Infinity } }}
               className="w-[500px] h-[500px] border border-cyan-500/5 rounded-full"
            />
          </div>

          <motion.div 
             animate={{ y: [0, -8, 0] }}
             transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
             className="relative z-20"
          >
            <ZoyaSphere 
              state={zoyaState} 
              inputVolume={inputVolume} 
              outputVolume={outputVolume}
              isScanning={isScreenSharing}
              mousePos={mousePos}
              onClick={connectToZoya}
            />
          </motion.div>

          {/* Sassy Neural Dialogue Box */}
          <div className="mt-8 min-h-12 text-center px-10 relative z-30 max-w-xl mx-auto">
            <AnimatePresence mode="wait">
              {isConnected && (outputVolume > 0.05 || lastMessage) && (
                <motion.div
                  key={lastMessage || 'listening'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className={cn(
                    "inline-block px-8 py-4 backdrop-blur-3xl border rounded-3xl shadow-2xl",
                    theme === 'dark' ? "bg-black/90 border-white/10" : "bg-yellow-950/90 border-yellow-500/20"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Zap size={12} className={cn("animate-pulse", zoyaState === 'angry' ? "text-red-500" : "text-cyan-500")} />
                    <span className="text-[13px] font-medium tracking-wide italic leading-relaxed text-cyan-50">
                      {lastMessage || "Listening..."}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {!isConnected && (
               <div className="text-[9px] font-black uppercase tracking-[0.4em] opacity-20 transition-colors">
                 Standby • Engage Link
               </div>
            )}
          </div>
        </main>

        {/* Floating Control HUD Footer Integrated */}
        <footer className="w-full flex justify-center items-center pb-8 pointer-events-auto">
          <div className={cn(
            "flex items-center gap-8 border px-8 py-4 rounded-3xl backdrop-blur-3xl transition-colors",
            theme === 'dark' ? "bg-black/40 border-white/10" : "bg-yellow-950/40 border-yellow-500/20"
          )}>
            <motion.button 
              whileHover={{ scale: 1.1, boxShadow: isScreenSharing ? "0 0 40px rgba(34,211,238,0.6)" : "0 0 20px rgba(255,255,255,0.1)" }}
              onClick={toggleScreenShare}
              className={cn(
                "p-4 rounded-2xl border transition-all relative overflow-hidden",
                isScreenSharing 
                  ? "bg-cyan-500/30 border-cyan-400 text-cyan-400 shadow-[0_0_50px_rgba(34,211,238,0.4)]" 
                  : "border-white/5 text-white/20 hover:text-white/40 shadow-inner"
              )}
            >
              <Monitor size={20} className={cn(isScreenSharing && "animate-pulse")} />
              {isScreenSharing && (
                <motion.div 
                  layoutId="scanGlow"
                  className="absolute inset-0 bg-cyan-400/10 blur-xl"
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.05, boxShadow: isConnected ? "0 0 60px rgba(34,211,238,0.7)" : "0 0 30px rgba(255,255,255,0.2)" }}
              whileTap={{ scale: 0.95 }}
              onClick={connectToZoya}
              className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center transition-all group border-2 relative",
                isConnected 
                  ? "bg-cyan-500 border-cyan-200 text-black shadow-[0_0_80px_rgba(34,211,238,0.6)]" 
                  : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10 shadow-lg"
              )}
            >
              <AnimatePresence>
                 {isConnected && (
                   <motion.div 
                     initial={{ scale: 0.8, opacity: 0 }}
                     animate={{ scale: 1.5, opacity: 0 }}
                     exit={{ opacity: 0 }}
                     transition={{ repeat: Infinity, duration: 1.5 }}
                     className="absolute inset-0 rounded-2xl border-4 border-cyan-400"
                   />
                 )}
              </AnimatePresence>
              <Power size={28} className={cn(isConnected && "animate-pulse")} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={cn(
                "p-4 rounded-2xl border transition-all",
                theme === 'light' ? "bg-yellow-500/20 border-yellow-400 text-yellow-400" : "border-white/5 text-white/20 hover:text-white/40"
              )}
            >
              <Zap size={20} />
            </motion.button>
          </div>
        </footer>
      </div>

      {/* Extreme Aura Overlays - Tactical Reticles */}
      <div className="fixed inset-0 z-50 pointer-events-none opacity-40">
        <div className="absolute top-[18%] left-12 w-12 h-12 border-t-2 border-l-2 border-cyan-500/30 rounded-tl-xl" />
        <div className="absolute top-[18%] right-12 w-12 h-12 border-t-2 border-r-2 border-cyan-500/30 rounded-tr-xl" />
        <div className="absolute top-[82%] left-12 w-12 h-12 border-b-2 border-l-2 border-cyan-500/30 rounded-bl-xl" />
        <div className="absolute top-[82%] right-12 w-12 h-12 border-b-2 border-r-2 border-cyan-500/30 rounded-br-xl" />
        
        {/* Dynamic scanning numbers */}
        <div className="absolute top-[20%] left-14 font-mono text-[8px] text-cyan-500/40 space-y-1">
          <div>LAT: 32.7157° N</div>
          <div>LON: 117.1611° W</div>
        </div>
        <div className="absolute top-[20%] right-14 font-mono text-[8px] text-cyan-500/40 text-right space-y-1">
          <div>MACH: {(1.2 + outputVolume * 0.8).toFixed(2)}</div>
          <div>FUEL: 84.2%</div>
        </div>
      </div>

      {/* Playful Floating Scan lines during screen share */}
      <AnimatePresence>
        {isScreenSharing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-[100] overflow-hidden"
          >
            <motion.div 
              animate={{ y: ['-100%', '200%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="w-full h-[30vh] bg-gradient-to-b from-transparent via-cyan-500/[0.05] to-transparent"
            />
            <div className="absolute top-12 left-1/2 -translate-x-1/2 px-6 py-2 bg-cyan-500/10 border border-cyan-400/30 rounded-full backdrop-blur-xl flex items-center gap-3">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_#22d3ee]" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">CyberScan Active: Neural Analysis In-Progress</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
