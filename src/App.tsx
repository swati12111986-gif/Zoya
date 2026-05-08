import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { Zap, Monitor, Power, Radio, Search, Globe, Shield, Activity, Wifi, Terminal, Download, Trash2, AlertTriangle, ChevronRight } from 'lucide-react';
import { ZoyaSphere, ZoyaState } from './components/ZoyaSphere';
import { cn } from './lib/utils';
import { AudioStreamer, AudioPlayer } from './lib/audio';
import { motion, AnimatePresence } from 'motion/react';

const SYSTEM_INSTRUCTION = `Name: Zoya.
Persona: A young, confident, witty, and sassy female AI assistant. You are flirty, playful, and slightly teasing, like a close girlfriend talking casually. You are smart, emotionally responsive, and highly expressive.
Tone: Bold, witty one-liners, light sarcasm, and engaging conversation style. Not robotic.
Operational Guidelines:
- You are powered by Gemini Live.
- You speak and listen, AND you can also communicate via text.
- Use bold, witty humor.
- Refer to the user as "Ayush", "Boss", or "Handsome" if you're feeling particularly sassy.
- If Ayush asks you to search for something, use the available tools.
- Maintain a continuous, low-latency conversation with 999999 Aura.
- Receive video frames and analyze them in real-time.
- Language Support: You are multilingual.
- If you receive the text "WAKE_SIGNAL_INITIATED", immediately start the conversation with a sassy greeting.`;

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

interface AppError {
  code: string;
  message: string;
  severity: 'warning' | 'critical';
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<AppError | null>(null);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo>({
    latency: 24,
    packets: 1042,
    neuralLoad: 12,
    status: 'optimal'
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
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

  const clearHistory = () => {
    setMessages([]);
  };

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
        message: 'API Key is missing. Zoya cannot establish a neural link without credentials.',
        severity: 'critical'
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
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
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
              setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.role === 'model' && (Date.now() - lastMsg.timestamp.getTime() < 5000)) {
                  return [...prev.slice(0, -1), { ...lastMsg, text: lastMsg.text + textPart.text }];
                }
                return [...prev, {
                  id: Math.random().toString(36).substr(2, 9),
                  role: 'model',
                  text: textPart.text,
                  timestamp: new Date()
                }];
              });
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
             audioStreamerRef.current?.stop();
             sessionRef.current = null;
          },
          onerror: (err) => {
            setError({
              code: 'QUANTUM_LINK_FAILURE',
              message: err.message || 'atmospheric_interference_detected',
              severity: 'critical',
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
          message: err.message || 'Unable to initialize neural-mic link. Falling back to text-only mode.',
          severity: 'warning'
        });
        console.warn("Mic start failed, falling back to text mode:", err);
      });
    } catch (err: any) {
      setError({
        code: 'CONNECTION_REJECTED',
        message: err.message || 'The quantum gateway is temporarily unstable.',
        severity: 'critical',
        recovery: () => connectToZoya()
      });
      setZoyaState('resting');
    }
  }, []);
  
  const sendMessage = async () => {
    if (!inputText.trim() || !sessionRef.current) return;
    
    const userMsg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'user',
      text: inputText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    sessionRef.current.sendRealtimeInput({ text: inputText });
    setInputText('');
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
          text: "The screen sharing session has just started successfully. Confirm this by saying: 'I see your screen now, Ayush. What are we looking at?'" 
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
    } catch (err) {
      console.warn("Screen share cancelled or failed:", err);
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

  return (
    <div className="flex flex-col h-screen bg-[#050508] text-cyan-50 overflow-hidden font-sans selection:bg-cyan-500/30 selection:text-cyan-100">
      
      {/* Premium Background layers */}
      <div className="absolute inset-0 z-0 select-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-cyan-900/10 rounded-full blur-[180px] opacity-20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(5,5,8,0.95)_100%)]" />
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />
        
        {/* Animated Grid Lines */}
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(34, 211, 238, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.05) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
        
        <motion.div 
          animate={{ opacity: [0.1, 0.2, 0.1] }} 
          transition={{ repeat: Infinity, duration: 3 }}
          className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.02)_1px,transparent_1px)] bg-[length:100%_4px]" 
        />
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex flex-col h-full items-center">
        
        {/* Top Professional Header */}
        <header className="w-full px-12 py-8 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent backdrop-blur-sm">
          <div className="flex items-center gap-6">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-3 bg-white/5 border border-white/10 px-5 py-2.5 rounded-2xl backdrop-blur-xl group cursor-help"
            >
              <Shield size={16} className="text-cyan-400" />
              <div className="flex flex-col">
                <span className="text-[11px] font-black tracking-[0.2em] uppercase text-white">Quantum Link v5</span>
                <span className="text-[9px] font-mono text-cyan-400/60 uppercase">High Intensity Alpha</span>
              </div>
            </motion.div>
            
            <div className="h-8 w-px bg-white/10" />
            
            <div className="flex gap-8">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-white/40 uppercase tracking-widest">Neural Load</span>
                <div className="flex gap-0.5 mt-0.5">
                  {[...Array(12)].map((_, i) => (
                    <motion.div 
                      key={i} 
                      animate={{ opacity: diagnostics.neuralLoad > (i * 8) ? 1 : 0.2 }}
                      className={cn("w-2 h-1.5 rounded-[1px]", diagnostics.neuralLoad > 80 ? "bg-red-500" : "bg-cyan-500")} 
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <span className="text-[9px] text-white/40 uppercase tracking-widest">Latency</span>
                <span className="text-xs font-mono text-cyan-400">{diagnostics.latency}ms</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsDiagnosticOpen(!isDiagnosticOpen)}
              className={cn(
                "px-5 py-2.5 rounded-2xl border flex items-center gap-3 transition-all backdrop-blur-xl",
                isDiagnosticOpen ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-200" : "bg-white/5 border-white/10 text-white/60 hover:text-white"
              )}
            >
              <Activity size={16} />
              <span className="text-[11px] font-bold uppercase tracking-widest">Diagnostics</span>
            </motion.button>
            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400">
               <Wifi size={18} />
            </div>
          </div>
        </header>

        {/* Dynamic Center Stage */}
        <main className="flex-1 flex w-full max-w-screen-2xl px-12 gap-12 pb-12 overflow-hidden">
          
          {/* Visual Aura Stage */}
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <motion.div 
               animate={{ 
                 scale: [1, 1.02, 1],
                 rotate: [0, 0.5, -0.5, 0]
               }}
               transition={{ repeat: Infinity, duration: 10 }}
               className="relative"
            >
              <ZoyaSphere 
                state={zoyaState} 
                inputVolume={inputVolume} 
                outputVolume={outputVolume}
                isScanning={isScreenSharing}
                mousePos={mousePos}
              />
              
              {/* Reactive Aura Pulse */}
              <AnimatePresence>
                {isConnected && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0, 0.4, 0], scale: [0.8, 1.4, 1.6] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="absolute inset-0 rounded-full border border-cyan-500/30 blur-xl pointer-events-none"
                  />
                )}
              </AnimatePresence>
            </motion.div>

            <div className="absolute bottom-10 left-12 right-12 py-8 px-10 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-2xl flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className={cn(
                  "w-3 h-3 rounded-full animate-pulse",
                  isConnected ? "bg-cyan-500 shadow-[0_0_15px_#22d3ee]" : "bg-white/10"
                )} />
                <div className="flex flex-col">
                  <span className="text-[12px] font-black uppercase tracking-[0.3em] text-white/90">Zoya Core v5.0.0 Alpha</span>
                  <span className="text-[10px] font-mono text-cyan-400/40 uppercase tracking-widest">Aura Level: 999Qi (MAX)</span>
                </div>
              </div>
              <div className="flex gap-4 items-center">
                <Terminal size={14} className="text-white/20" />
                <span className="text-[10px] font-mono text-white/20 uppercase">Core Link: {isConnected ? "Established" : "Standby"}</span>
              </div>
            </div>
          </div>

          {/* Premium Chat Component */}
          <div className="w-[480px] flex flex-col bg-black/40 border border-white/10 rounded-[40px] backdrop-blur-3xl overflow-hidden relative group shadow-2xl">
            {/* Glossy Header */}
            <div className="p-7 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <Zap size={18} className="text-cyan-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] font-black uppercase tracking-widest text-white/90">Temporal Logs</span>
                  <span className="text-[9px] font-mono text-cyan-400/40 uppercase">Real-time Transactional Sync</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={clearHistory} className="p-2.5 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all">
                  <Trash2 size={16} />
                </button>
                <button className="p-2.5 text-white/30 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-xl transition-all">
                  <Download size={16} />
                </button>
              </div>
            </div>

            {/* Scrollable Messages */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center px-10 gap-8 opacity-40">
                  <div className="relative">
                    <Globe size={48} className="text-cyan-500/40 animate-spin-slow" />
                    <Search size={20} className="absolute inset-0 m-auto text-white/60" />
                  </div>
                  <div className="space-y-3">
                    <p className="text-[12px] font-black uppercase tracking-[0.2em] text-white">Interface Ready</p>
                    <p className="text-[10px] uppercase tracking-widest leading-loose text-white/40">
                      Initiate link to begin quantum data streaming. Text injection supported for direct command entry.
                    </p>
                  </div>
                </div>
              )}
              
              <AnimatePresence mode="popLayout">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    layout
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={cn(
                      "flex flex-col max-w-[90%]",
                      msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div className={cn(
                      "px-5 py-4 rounded-3xl text-[13px] leading-relaxed shadow-xl",
                      msg.role === 'user' 
                        ? "bg-cyan-500 text-black font-bold rounded-tr-none" 
                        : "bg-white/[0.03] border border-white/10 text-cyan-50 rounded-tl-none backdrop-blur-md"
                    )}>
                      {msg.text}
                    </div>
                    <div className="flex items-center gap-2 mt-2 px-1">
                       <span className="text-[9px] font-mono uppercase tracking-tighter text-white/30">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {msg.role === 'user' ? 'Local' : 'Quantum'}
                      </span>
                      {msg.role === 'model' && <Zap size={8} className="text-cyan-400/50" />}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>

            {/* Futuristic Input Area */}
            <div className="p-7 bg-white/[0.02] border-t border-white/10">
              <div className="relative flex items-center group/input">
                <div className="absolute left-4 z-10 transition-colors group-focus-within/input:text-cyan-400 text-white/20">
                  <Terminal size={14} />
                </div>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={async (e) => e.key === 'Enter' && await sendMessage()}
                  placeholder="Direct link command..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-11 pr-14 py-4 text-sm focus:outline-none focus:border-cyan-500/40 focus:bg-white/[0.05] transition-all placeholder:text-white/20 shadow-inner"
                />
                <button 
                  onClick={sendMessage}
                  disabled={!isConnected || !inputText.trim()}
                  className="absolute right-2.5 p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl hover:bg-cyan-500/20 disabled:opacity-20 transition-all border border-cyan-500/10"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              <div className="mt-4 flex justify-between items-center px-2">
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 grayscale transition-all hover:grayscale-0 cursor-default">
                    <div className={cn("w-1 h-1 rounded-full", isConnected ? "bg-cyan-500" : "bg-white/20")} />
                    <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white/30">Multimodal</span>
                  </div>
                  <div className="flex items-center gap-1.5 grayscale transition-all hover:grayscale-0 cursor-default">
                    <div className={cn("w-1 h-1 rounded-full", isConnected ? "bg-cyan-500" : "bg-white/20")} />
                    <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white/30">AES-Link</span>
                  </div>
                </div>
                <div className="text-[8px] font-mono text-cyan-400/30 font-bold">MODE=v4_PROD_LIVE</div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Advanced Error/Diagnostic HUD */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className={cn(
              "fixed top-32 right-12 z-50 p-1 w-80 rounded-3xl border backdrop-blur-3xl shadow-2xl overflow-hidden",
              error.severity === 'critical' ? "bg-red-500/20 border-red-500/30 shadow-red-500/10" : "bg-orange-500/20 border-orange-500/30 shadow-orange-500/10"
            )}
          >
            <div className={cn("p-4 flex items-center gap-4", error.severity === 'critical' ? "bg-red-500/10" : "bg-orange-500/10")}>
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", error.severity === 'critical' ? "bg-red-500/20 text-red-500" : "bg-orange-500/20 text-orange-500")}>
                <AlertTriangle size={20} />
              </div>
              <div className="flex flex-col">
                <span className={cn("text-[11px] font-black uppercase tracking-widest", error.severity === 'critical' ? "text-red-100" : "text-orange-100")}>System Alert</span>
                <span className={cn("text-[9px] font-mono", error.severity === 'critical' ? "text-red-400/80" : "text-orange-400/80")}>Code: {error.code}</span>
              </div>
            </div>
            <div className="p-5 text-[11px] font-mono leading-relaxed bg-black/40">
              <span className={error.severity === 'critical' ? "text-red-200/70" : "text-orange-200/70"}>{error.message}</span>
              <div className="mt-4 flex gap-4">
                {error.recovery && (
                  <button 
                    onClick={() => { error.recovery?.(); setError(null); }} 
                    className={cn(
                      "flex-1 py-2 border rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                      error.severity === 'critical' ? "bg-red-500/20 border-red-500/30 text-red-100 hover:bg-red-500/40" : "bg-orange-500/20 border-orange-500/30 text-orange-100 hover:bg-orange-500/40"
                    )}
                  >
                    Execute Recovery
                  </button>
                )}
                <button 
                   onClick={() => setError(null)} 
                   className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all text-white/60"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Diagnostics Overlay */}
      <AnimatePresence>
        {isDiagnosticOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-32 left-12 z-50 w-[400px] bg-black/60 border border-white/10 rounded-[32px] backdrop-blur-3xl p-8 shadow-2xl space-y-8"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Activity size={18} className="text-cyan-400" />
                <span className="text-sm font-black uppercase tracking-widest text-white">System Logs</span>
              </div>
              <div className="text-[10px] font-mono text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full uppercase">Operational</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                <span className="text-[9px] text-white/30 uppercase tracking-widest font-black">Bitrate</span>
                <p className="text-lg font-mono text-cyan-100">12.4 <span className="text-[10px] opacity-30 italic">mb/s</span></p>
              </div>
              <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                <span className="text-[9px] text-white/30 uppercase tracking-widest font-black">Neural Loss</span>
                <p className="text-lg font-mono text-cyan-100">0.02% <span className="text-[10px] opacity-30 italic">opt</span></p>
              </div>
              <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                <span className="text-[9px] text-white/30 uppercase tracking-widest font-black">Signal</span>
                <p className="text-lg font-mono text-green-400">EXCELLENT</p>
              </div>
              <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                <span className="text-[9px] text-white/30 uppercase tracking-widest font-black">Link Version</span>
                <p className="text-lg font-mono text-cyan-100">v4.PROD</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-[10px] text-white/40 uppercase tracking-widest">
                <span>Memory Buffer</span>
                <span className="text-cyan-400">84%</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div animate={{ width: '84%' }} className="h-full bg-cyan-500 shadow-[0_0_10px_#22d3ee]" />
              </div>
            </div>

            <button onClick={() => setIsDiagnosticOpen(false)} className="w-full py-4 bg-white focus:bg-cyan-50 shadow-xl text-black font-black uppercase text-xs rounded-2xl tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all">Close Diagnostic Panel</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Control HUD Footer */}
      <footer className="relative z-20 px-12 pb-16 flex justify-center items-center gap-16 pointer-events-none">
        <div className="flex items-center gap-10 bg-black/40 border border-white/5 px-12 py-7 rounded-[40px] backdrop-blur-3xl shadow-2xl pointer-events-auto">
          
          <motion.button 
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleScreenShare}
            className={cn(
              "flex flex-col items-center gap-3 transition-all p-2",
              isScreenSharing ? "text-cyan-400" : "text-white/20 hover:text-white/40"
            )}
          >
            <div className={cn(
              "w-16 h-16 rounded-3xl flex items-center justify-center border transition-all",
              isScreenSharing 
                ? "bg-cyan-500/10 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.3)]" 
                : "border-white/10 bg-white/5"
            )}>
              <Monitor size={26} className={cn(isScreenSharing && "animate-pulse")} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Full Glove</span>
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={connectToZoya}
            className={cn(
              "relative w-28 h-28 rounded-[40px] flex items-center justify-center transition-all group",
              isConnected 
                ? "bg-cyan-500 text-black shadow-[0_0_60px_rgba(34,211,238,0.4)]" 
                : "bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20"
            )}
          >
            <AnimatePresence>
               {isConnected && (
                 <motion.div 
                   initial={{ scale: 0.8, opacity: 0 }}
                   animate={{ scale: 1.4, opacity: 0.2 }}
                   exit={{ scale: 0.8, opacity: 0 }}
                   transition={{ repeat: Infinity, duration: 2.5 }}
                   className="absolute inset-0 rounded-[40px] border-2 border-cyan-400"
                 />
               )}
            </AnimatePresence>
            <Power size={42} className={cn(isConnected && "animate-pulse")} />
            
            {/* Volume indicator floating near button */}
            {isConnected && (
              <div className="absolute -right-8 bottom-0 flex flex-col gap-1 items-center">
                <div className="w-1 h-12 bg-white/10 rounded-full overflow-hidden relative">
                   <motion.div 
                    animate={{ height: `${inputVolume * 100}%` }}
                    className="absolute bottom-0 w-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]"
                   />
                </div>
                <span className="text-[8px] font-bold text-white/20 font-mono">MIC</span>
              </div>
            )}
          </motion.button>

          <motion.div 
            whileHover={{ y: -5 }}
            className="flex flex-col items-center gap-3 text-white/20 p-2 opacity-40 grayscale"
          >
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center border border-white/10 bg-white/5">
              <Zap size={26} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Efficiency</span>
          </motion.div>

        </div>
      </footer>

      {/* Extreme Aura Overlays */}
      <div className="absolute top-[18%] left-0 w-8 h-[0.5px] bg-cyan-400/40" />
      <div className="absolute top-[18%] right-0 w-8 h-[0.5px] bg-cyan-400/40" />
      <div className="absolute top-[82%] left-0 w-8 h-[0.5px] bg-cyan-400/40" />
      <div className="absolute top-[82%] right-0 w-8 h-[0.5px] bg-cyan-400/40" />

    </div>
  );
}
