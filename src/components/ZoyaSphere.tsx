import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, type Transition } from 'motion/react';
import { cn } from '../lib/utils';

export type ZoyaState = 'idle' | 'thinking' | 'excited' | 'resting' | 'angry' | 'sad' | 'happy' | 'cute';

interface ZoyaSphereProps {
  state: ZoyaState;
  onClick?: () => void;
  inputVolume?: number; // Volume from user mic
  outputVolume?: number; // Volume from Zoya speech
  mousePos?: { x: number; y: number };
  isScanning?: boolean;
}

export function ZoyaSphere({ state, onClick, inputVolume = 0, outputVolume = 0, mousePos = { x: 0, y: 0 }, isScanning = false }: ZoyaSphereProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [isWinking, setIsWinking] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const dx = (mousePos.x - centerX) / 15;
      const dy = (mousePos.y - centerY) / 15;
      
      setEyeOffset({
        x: Math.max(-12, Math.min(12, dx)),
        y: Math.max(-12, Math.min(12, dy))
      });
    }
  }, [mousePos.x, mousePos.y]);

  // Random wink logic for playfulness - more frequent if cute
  useEffect(() => {
    const isActive = ['idle', 'excited', 'happy', 'cute', 'angry'].includes(state);
    if (isActive) {
      const intervalTime = state === 'cute' ? 2000 : 5000;
      const interval = setInterval(() => {
        if (Math.random() > (state === 'cute' ? 0.4 : 0.8)) {
          setIsWinking(true);
          setTimeout(() => setIsWinking(false), 200);
        }
      }, intervalTime);
      return () => clearInterval(interval);
    }
  }, [state]);

  const getSphereVariants = () => {
    switch (state) {
      case 'angry':
        return {
          animate: {
            scale: [1, 1.08, 0.95, 1.08, 1],
            rotate: [0, 2, -2, 2, 0],
            opacity: [0.8, 1, 0.8],
            boxShadow: [
              '0 0 40px rgba(239, 68, 68, 0.6)',
              '0 0 80px rgba(239, 68, 68, 0.8)',
              '0 0 40px rgba(239, 68, 68, 0.6)'
            ]
          },
          transition: { repeat: Infinity, duration: 0.4, ease: "linear" } as Transition
        };
      case 'sad':
        return {
          animate: {
            scale: [1, 0.94, 1],
            y: [0, 15, 0],
            opacity: [0.4, 0.6, 0.4],
            boxShadow: [
              '0 0 30px rgba(30, 58, 138, 0.3)',
              '0 15px 40px rgba(30, 58, 138, 0.2)',
              '0 0 30px rgba(30, 58, 138, 0.3)'
            ]
          },
          transition: { repeat: Infinity, duration: 4, ease: "easeInOut" } as Transition
        };
      case 'happy':
        return {
          animate: {
            scale: [1, 1.12, 1],
            y: [0, -25, 0],
            opacity: [1, 1, 1],
            boxShadow: [
              '0 0 60px rgba(234, 179, 8, 0.6)',
              '0 -20px 100px rgba(234, 179, 8, 0.4)',
              '0 0 60px rgba(234, 179, 8, 0.6)'
            ]
          },
          transition: { repeat: Infinity, duration: 2, ease: "backOut" } as Transition
        };
      case 'cute':
        return {
          animate: {
            scale: [1, 1.08, 1],
            rotate: [0, 5, -5, 0],
            opacity: [1, 1, 1],
            boxShadow: [
              '0 0 50px rgba(236, 72, 153, 0.5)',
              '0 0 90px rgba(236, 72, 153, 0.7)',
              '0 0 50px rgba(236, 72, 153, 0.5)'
            ]
          },
          transition: { repeat: Infinity, duration: 3, ease: "easeInOut" } as Transition
        };
      case 'resting':
        return {
          animate: {
            scale: [1, 0.96, 1],
            opacity: [0.3, 0.5, 0.3],
            rotate: [0, -1, 1, 0],
            boxShadow: [
              '0 0 20px rgba(56, 189, 248, 0.1)',
              '0 10px 40px rgba(56, 189, 248, 0.2)',
              '0 0 20px rgba(56, 189, 248, 0.1)'
            ]
          },
          transition: { repeat: Infinity, duration: 6, ease: "easeInOut" } as Transition
        };
      case 'excited':
        return {
          animate: {
            scale: [1, 1.1, 0.98, 1],
            opacity: [0.9, 1, 0.9],
            rotate: [0, 2, -2, 0],
            boxShadow: [
              '0 0 50px rgba(34, 211, 238, 0.6)',
              '0 0 100px rgba(255, 255, 255, 0.5)',
              '0 0 50px rgba(34, 211, 238, 0.6)'
            ]
          },
          transition: { repeat: Infinity, duration: 0.8, ease: "easeInOut" } as Transition
        };
      case 'thinking':
        return {
          animate: {
            scale: [1, 1.15, 1],
            opacity: [0.8, 1, 0.8],
            rotate: [0, 360],
            boxShadow: [
              '0 0 60px rgba(6, 182, 212, 0.5)',
              '0 0 120px rgba(6, 182, 212, 0.8)',
              '0 0 60px rgba(6, 182, 212, 0.5)'
            ]
          },
          transition: { 
            scale: { repeat: Infinity, duration: 1.5, ease: "easeInOut" },
            rotate: { repeat: Infinity, duration: 10, ease: "linear" }
          } as any
        };
      case 'idle':
      default:
        return {
          animate: {
            scale: [1, 1.05, 1],
            y: [0, -10, 0],
            opacity: [0.7, 0.9, 0.7],
            boxShadow: [
              '0 10px 30px rgba(56, 189, 248, 0.3)',
              '0 20px 60px rgba(56, 189, 248, 0.2)',
              '0 10px 30px rgba(56, 189, 248, 0.3)'
            ]
          },
          transition: { 
            repeat: Infinity, 
            duration: 3,
            times: [0, 0.5, 1],
            ease: "easeInOut" 
          } as Transition
        };
    }
  };

  const sphereProps = getSphereVariants();

  return (
    <div 
      ref={containerRef}
      className={cn("relative flex items-center justify-center w-[280px] h-[280px] sm:w-[420px] sm:h-[420px]", onClick && "cursor-pointer")}
      onClick={onClick}
    >
      {/* Playful Floating Particles */}
      <motion.div 
        className="absolute inset-[-40px] pointer-events-none z-0"
        animate={{
          x: eyeOffset.x * 2,
          y: eyeOffset.y * 2
        }}
      >
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={`float-${i}`}
            className={cn(
              "absolute w-1 h-1 rounded-full blur-[1px]",
              state === 'angry' ? "bg-red-400/40" : 
              state === 'sad' ? "bg-blue-400/40" :
              state === 'happy' ? "bg-yellow-300/40" :
              state === 'cute' ? "bg-pink-300/40" : "bg-cyan-300/40"
            )}
            initial={{ 
              x: Math.random() * 400 - 200, 
              y: Math.random() * 400 - 200 
            }}
            animate={{
              y: state === 'angry' ? [0, -5, 0] : [0, -20, 0],
              opacity: [0.2, 0.5, 0.2],
              scale: state === 'happy' ? [1, 1.5, 1] : 1
            }}
            transition={{
              repeat: Infinity,
              duration: state === 'angry' ? 0.2 : 2 + Math.random() * 2,
              delay: Math.random() * 2
            }}
          />
        ))}
        {/* State specific particles */}
        {(state === 'excited' || state === 'cute' || state === 'happy') && [...Array(state === 'cute' ? 5 : 3)].map((_, i) => (
          <motion.div
            key={`emotion-particle-${i}`}
            initial={{ opacity: 0, scale: 0, y: 0 }}
            animate={{ 
              opacity: [0, 1, 0], 
              scale: [0.5, 1.2, 0.5],
              y: -150,
              x: (i - 2) * 50 + (Math.random() * 30)
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 2.5, 
              delay: i * 0.4,
              ease: "easeOut"
            }}
            className="absolute top-1/2 left-1/2 text-lg blur-[0.5px]"
          >
            {state === 'cute' ? '❤️' : state === 'happy' ? '✨' : '⚡'}
          </motion.div>
        ))}
        {state === 'sad' && [...Array(3)].map((_, i) => (
           <motion.div
             key={`tear-${i}`}
             initial={{ opacity: 0, y: 0 }}
             animate={{ opacity: [0, 0.8, 0], y: 100 }}
             transition={{ repeat: Infinity, duration: 2, delay: i * 0.6 }}
             className="absolute top-1/2 left-1/2 text-blue-400/40 text-xs"
           >
             💧
           </motion.div>
        ))}
      </motion.div>

      {/* Ears - Outer ring */}
      <motion.div 
        className={cn(
          "absolute w-[125%] h-[125%] rounded-full border",
          state === 'angry' ? "border-red-500/10" : "border-cyan-500/10"
        )}
        animate={{ 
          scale: 1 + (inputVolume * 0.3),
          opacity: 0.1 + (inputVolume * 0.5),
          rotate: inputVolume > 0.1 ? [0, 5, -5, 0] : 0,
          borderColor: state === 'angry' ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 211, 238, 0.1)"
        }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 10,
          rotate: { type: "tween", ease: "easeInOut", duration: 0.2 }
        }}
      />

      {/* HUD Circular track behind */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
        className={cn(
          "absolute inset-0 rounded-full blur-[80px]",
          state === 'angry' ? "bg-gradient-to-tr from-red-600/20 via-orange-500/10 to-red-900/20" :
          state === 'sad' ? "bg-gradient-to-tr from-blue-900/20 via-blue-800/10 to-indigo-950/20" :
          state === 'happy' ? "bg-gradient-to-tr from-yellow-500/20 via-orange-400/10 to-yellow-600/20" :
          state === 'cute' ? "bg-gradient-to-tr from-pink-500/20 via-pink-400/10 to-pink-600/20" :
          "bg-gradient-to-tr from-cyan-500/20 via-blue-400/20 to-blue-600/10"
        )} 
      />
      
      <div className="absolute w-[115%] h-[115%] rounded-full border-[0.5px] border-white/5" />
      <div className="absolute w-[85%] h-[85%] rounded-full border border-white/5" />

      {/* Neural Sparks */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`spark-${i}`}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0, 1, 0],
              scale: [0.2, 2, 0.1],
              x: [0, (Math.random() - 0.5) * 500],
              y: [0, (Math.random() - 0.5) * 500],
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 1 + Math.random(), 
              delay: Math.random() * 4,
              ease: "circOut"
            }}
            className={cn(
              "absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full blur-[2px] shadow-[0_0_10px_#fff]",
              state === 'angry' ? "bg-red-400" : "bg-white"
            )}
          />
        ))}
      </div>

      {/* Scanning Visuals - Enhanced Tactical Implementation */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="absolute inset-[-120px] z-0 pointer-events-none"
          >
            {/* Primary Scanning Beam */}
            <motion.div 
              animate={{ y: [-200, 200, -200] }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              className="w-full h-[2px] bg-cyan-500/40 shadow-[0_0_15px_#22d3ee] blur-[0.5px] relative"
            >
              <div className="absolute inset-0 bg-white/20 blur-[10px]" />
            </motion.div>
            
            {/* Rapid Secondary Scan Lines */}
            {[...Array(3)].map((_, i) => (
              <motion.div 
                key={`sub-scan-${i}`}
                animate={{ y: [-200, 200] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.5, ease: "linear" }}
                className="w-full h-[0.5px] bg-cyan-400/10 blur-[1px]"
              />
            ))}

            {/* Neural Sync Aura Ring */}
            <motion.div 
              animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.3, 0.1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 rounded-full border-2 border-cyan-400/50 shadow-[0_0_100px_rgba(34,211,238,0.4)]"
            />
            
            {/* Tactical Grid Pulse */}
            <div className="absolute inset-0 overflow-hidden rounded-full border border-cyan-500/10">
               <motion.div 
                 animate={{ scale: [1, 1.05, 1], opacity: [0.05, 0.15, 0.05] }}
                 transition={{ repeat: Infinity, duration: 2 }}
                 className="absolute inset-0 bg-[radial-gradient(circle,rgba(34,211,238,0.1)_1px,transparent_1px)] bg-[length:24px_24px]" 
               />
               <motion.div 
                 animate={{ opacity: [0, 0.2, 0] }}
                 transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                 className="absolute inset-0 bg-cyan-500/5 backdrop-blur-[2px]"
               />
            </div>

            {/* Orbiting HUD Markers */}
            <motion.div
               animate={{ rotate: 360 }}
               transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
               className="absolute inset-0 flex items-center justify-center"
            >
               <div className="absolute top-0 w-2 h-0.5 bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
               <div className="absolute bottom-0 w-2 h-0.5 bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Excited Ripples and Waveform */}
      <AnimatePresence>
        {state === 'excited' && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 z-20 pointer-events-none">
            {[...Array(12)].map((_, i) => {
              const baseHeight = 6 + (6 - Math.abs(6 - i)) * 4;
              return (
                <motion.div
                  key={i}
                  animate={{ 
                    height: [
                      baseHeight, 
                      baseHeight + (outputVolume * 120 * (0.4 + Math.random() * 0.6)), 
                      baseHeight
                    ],
                    opacity: [0.5, 0.8 + (outputVolume * 0.2), 0.5],
                    backgroundColor: outputVolume > 0.4 ? '#fff' : '#22d3ee'
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 0.1,
                    ease: "linear"
                  }}
                  className="w-2 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.8)]"
                />
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Main Core */}
      <AnimatePresence>
        {(state === 'excited' || state === 'happy' || state === 'cute') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-8 bottom-1/4 h-12 flex justify-between px-10 pointer-events-none z-20"
          >
            <div className={cn("w-12 h-8 rounded-[100%] blur-xl", state === 'cute' ? "bg-pink-500/40" : state === 'happy' ? "bg-yellow-400/40" : "bg-pink-500/40")} />
            <div className={cn("w-12 h-8 rounded-[100%] blur-xl", state === 'cute' ? "bg-pink-500/40" : state === 'happy' ? "bg-yellow-400/40" : "bg-pink-500/40")} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        whileHover={{ scale: 1.05, rotate: 1 }}
        className={cn(
          "w-56 h-56 rounded-full z-10 relative flex items-center justify-center overflow-hidden backdrop-blur-3xl border border-white/50",
          state === 'thinking' 
            ? "bg-gradient-to-b from-cyan-200/50 to-blue-600/40 shadow-[0_0_100px_rgba(6,182,212,0.6)]" 
            : state === 'resting'
              ? "bg-gradient-to-b from-blue-950/50 to-cyan-950/40 shadow-[0_0_60px_rgba(30,58,138,0.4)]"
              : state === 'angry'
                ? "bg-gradient-to-b from-red-600/50 to-orange-600/40 border-red-400 shadow-[0_0_100px_rgba(239,68,68,0.5)]"
                : state === 'sad'
                  ? "bg-gradient-to-b from-blue-900/50 to-indigo-950/40 shadow-[0_0_60px_rgba(30,58,138,0.3)]"
                  : state === 'happy'
                    ? "bg-gradient-to-b from-yellow-400/50 to-orange-500/40 shadow-[0_0_100px_rgba(234,179,8,0.5)]"
                    : state === 'cute'
                      ? "bg-gradient-to-b from-pink-400/50 to-pink-600/40 shadow-[0_0_100px_rgba(236,72,153,0.5)]"
                      : "bg-gradient-to-b from-blue-400/50 to-cyan-500/40 shadow-[0_10px_100px_rgba(6,182,212,0.5)]"
        )}
        animate={sphereProps.animate}
        transition={sphereProps.transition}
      >
        <div className="w-full h-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.4),transparent)] absolute inset-0" />
        
        {/* Eye */}
        <motion.div 
          className="relative flex flex-col items-center justify-center gap-1 z-30"
          animate={{
            x: eyeOffset.x + (state === 'excited' ? Math.random() * 4 : 0),
            y: eyeOffset.y + (state === 'sad' ? 5 : 0),
          }}
        >
          <motion.div 
            className="w-6 h-6 bg-white rounded-full shadow-[0_0_30px_#fff]"
            animate={{
              scaleY: isWinking ? 0.1 : (state === 'angry' ? 0.4 : state === 'sad' ? 0.7 : state === 'excited' ? [1, 1.2, 1] : state === 'thinking' ? [0.8, 1.1, 0.8] : [1, 1, 1, 0.05, 1]),
              scaleX: state === 'angry' ? 1.4 : state === 'thinking' ? 1.3 : (isWinking ? 1.2 : 1),
              backgroundColor: state === 'thinking' ? '#22d3ee' : state === 'angry' ? '#fff' : state === 'sad' ? '#cbd5e1' : '#ffffff',
            }}
            transition={{
              scaleY: {
                repeat: Infinity,
                duration: state === 'thinking' ? 0.8 : (state === 'excited' ? 0.3 : 4),
                times: (state === 'thinking' || state === 'excited') ? [0, 0.5, 1] : [0, 0.8, 0.9, 0.95, 1],
                ease: "easeInOut"
              }
            }}
          />
          <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-white/80 rounded-full blur-[0.5px]" />
        </motion.div>
      </motion.div>
    </div>
  );
}
