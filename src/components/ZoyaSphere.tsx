import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, type Transition } from 'motion/react';
import { cn } from '../lib/utils';

export type ZoyaState = 'idle' | 'thinking' | 'excited' | 'resting';

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

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const dx = (mousePos.x - centerX) / 20;
      const dy = (mousePos.y - centerY) / 20;
      
      // Limit range
      setEyeOffset({
        x: Math.max(-8, Math.min(8, dx)),
        y: Math.max(-8, Math.min(8, dy))
      });
    }
  }, [mousePos.x, mousePos.y]);

  const getSphereVariants = () => {
    switch (state) {
      case 'resting':
        return {
          animate: {
            scale: [1, 0.98, 1],
            opacity: [0.3, 0.5, 0.3],
            boxShadow: [
              '0 0 20px rgba(56, 189, 248, 0.1)',
              '0 0 30px rgba(56, 189, 248, 0.2)',
              '0 0 20px rgba(56, 189, 248, 0.1)'
            ]
          },
          transition: { repeat: Infinity, duration: 4, ease: "easeInOut" } as Transition
        };
      case 'excited': // Equivalent to "Speaking" in user request
        return {
          animate: {
            scale: [1, 1.08, 1],
            opacity: [0.9, 1, 0.9],
            boxShadow: [
              '0 0 40px rgba(56, 189, 248, 0.6)',
              '0 0 80px rgba(255, 255, 255, 0.4)',
              '0 0 40px rgba(56, 189, 248, 0.6)'
            ]
          },
          transition: { repeat: Infinity, duration: 0.6, ease: "easeInOut" } as Transition
        };
      case 'thinking':
        return {
          animate: {
            scale: [1, 1.15, 1],
            opacity: [0.8, 1, 0.8],
            boxShadow: [
              '0 0 50px rgba(6, 182, 212, 0.5)',
              '0 0 100px rgba(6, 182, 212, 0.7)',
              '0 0 50px rgba(6, 182, 212, 0.5)'
            ]
          },
          transition: { repeat: Infinity, duration: 1.2, ease: "easeInOut" } as Transition
        };
      case 'idle':
      default:
        // Heartbeat pulse: 0% 1.0, 70% 1.05, 100% 1.0
        return {
          animate: {
            scale: [1, 1.05, 1],
            opacity: [0.6, 0.8, 0.6],
            boxShadow: [
              '0 0 20px rgba(56, 189, 248, 0.3)',
              '0 0 40px rgba(56, 189, 248, 0.1)',
              '0 0 20px rgba(56, 189, 248, 0.3)'
            ]
          },
          transition: { 
            repeat: Infinity, 
            duration: 2,
            times: [0, 0.7, 1],
            ease: "easeInOut" 
          } as Transition
        };
    }
  };

  const sphereProps = getSphereVariants();

  return (
    <div 
      ref={containerRef}
      className={cn("relative flex items-center justify-center w-[280px] h-[280px] sm:w-[384px] sm:h-[384px]", onClick && "cursor-pointer")}
      onClick={onClick}
    >
      {/* Ears - Outer ring that reacts to input volume */}
      <motion.div 
        className="absolute w-[120%] h-[120%] rounded-full border border-cyan-500/20"
        animate={{ 
          scale: 1 + (inputVolume * 0.2),
          opacity: 0.1 + (inputVolume * 0.4),
          borderColor: inputVolume > 0.1 ? "rgba(34, 211, 238, 0.4)" : "rgba(34, 211, 238, 0.1)"
        }}
      />

      {/* HUD Circular track behind */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/20 via-blue-400/20 to-blue-600/10 blur-[60px]" />
      
      <div className="absolute w-[110%] h-[110%] rounded-full border-[0.5px] border-cyan-500/10" />
      <div className="absolute w-[80%] h-[80%] rounded-full border border-blue-500/10" />

      {/* Neural Sparks - Random data flashes */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={`spark-${i}`}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0, 0.8, 0],
              scale: [0.5, 1.5, 0.2],
              x: [0, (Math.random() - 0.5) * 400],
              y: [0, (Math.random() - 0.5) * 400],
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 1.5 + Math.random(), 
              delay: Math.random() * 5,
              ease: "circOut"
            }}
            className="absolute top-1/2 left-1/2 w-1 h-1 bg-cyan-200 rounded-full blur-[1px]"
          />
        ))}
      </div>

      {/* Excited Ripples and Waveform */}
      <AnimatePresence>
        {(state === 'excited' || isScanning) && (
          <>
            <motion.div
              initial={{ scale: 0.5, opacity: 0.8 }}
              animate={{ scale: isScanning ? [1.2, 1.3, 1.2] : 1.6, opacity: isScanning ? 0.2 : 0 }}
              transition={{ repeat: Infinity, duration: isScanning ? 2 : 1.2, ease: "easeOut" }}
              className={cn(
                "absolute inset-0 rounded-full border z-0",
                isScanning ? "border-cyan-500/30 border-dashed" : "border-cyan-400"
              )}
            />
            {state === 'excited' && (
              <div className="absolute inset-0 flex items-center justify-center gap-1.5 z-20 pointer-events-none">
                {[...Array(9)].map((_, i) => {
                  const baseHeight = 4 + (4 - Math.abs(4 - i)) * 3;
                  return (
                    <motion.div
                      key={i}
                      animate={{ 
                        height: [
                          baseHeight, 
                          baseHeight + (outputVolume * 80 * (0.6 + Math.random() * 0.4)), 
                          baseHeight
                        ],
                        opacity: [0.4, 0.6 + (outputVolume * 0.4), 0.4],
                        backgroundColor: outputVolume > 0.3 ? '#22d3ee' : '#0891b2'
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 0.12 + (Math.random() * 0.08),
                        ease: "linear"
                      }}
                      className="w-1.5 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.5)]"
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Thinking HUD Elements */}
      <AnimatePresence>
        {state === 'thinking' && (
          <>
            {/* Rotating Dashed Rings */}
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              className="absolute w-[95%] h-[95%] rounded-full border border-dashed border-cyan-400/30 z-0"
            />
            <motion.div
              initial={{ rotate: 360 }}
              animate={{ rotate: 0 }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
              className="absolute w-[85%] h-[85%] rounded-full border border-dashed border-blue-400/20 z-0"
            />
            
            {/* Outward Pulsing Particles */}
            <div className="absolute inset-0 z-0 pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    x: 0, 
                    y: 0, 
                    opacity: 0, 
                    scale: 0 
                  }}
                  animate={{ 
                    x: Math.cos((i * 30) * (Math.PI / 180)) * 160,
                    y: Math.sin((i * 30) * (Math.PI / 180)) * 160,
                    opacity: [0, 0.8, 0],
                    scale: [0.5, 1.2, 0.5]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 2,
                    delay: i * 0.15,
                    ease: "easeOut"
                  }}
                  className="absolute top-1/2 left-1/2 w-1.5 h-1.5 -ml-0.75 -mt-0.75 bg-cyan-300 rounded-full shadow-[0_0_8px_#22d3ee]"
                />
              ))}
            </div>

            {/* Orbiting Orbitals */}
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="absolute inset-8 rounded-full z-0"
            >
              <div className="absolute top-0 left-1/2 w-3 h-3 -ml-1.5 -mt-1.5 bg-cyan-300 rounded-full shadow-[0_0_12px_rgba(103,232,249,0.9)]" />
              <div className="absolute bottom-0 left-1/2 w-2 h-2 -ml-1 -mb-1 bg-blue-300 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Core */}
      <motion.div
        className={cn(
          "w-48 h-48 rounded-full z-10 relative flex items-center justify-center overflow-hidden backdrop-blur-2xl border border-white/40",
          state === 'thinking' 
            ? "bg-gradient-to-b from-cyan-300/40 to-blue-600/30 shadow-[0_0_80px_rgba(6,182,212,0.5)]" 
            : state === 'resting'
              ? "bg-gradient-to-b from-blue-900/40 to-cyan-900/30 shadow-[0_0_60px_rgba(30,58,138,0.3)]"
              : "bg-gradient-to-b from-blue-400/40 to-cyan-500/30 shadow-[0_0_80px_rgba(6,182,212,0.4)]"
        )}
        animate={sphereProps.animate}
        transition={sphereProps.transition}
      >
        <div className="w-full h-full bg-gradient-to-tr from-cyan-400/20 to-transparent absolute inset-0" />
        
        {/* Eye - The core that looks around or blinks */}
        <motion.div 
          className="relative w-4 h-4 bg-white rounded-full shadow-[0_0_20px_#fff] z-30"
          animate={{
            scaleY: state === 'thinking' ? [0.8, 1.2, 0.8] : [1, 1, 1, 0.1, 1], // Focused pulse vs Blink
            scaleX: state === 'thinking' ? 1.2 : 1,
            x: eyeOffset.x + (state === 'excited' ? Math.random() * 2 : 0),
            y: eyeOffset.y,
            backgroundColor: state === 'thinking' ? '#22d3ee' : '#ffffff',
            boxShadow: state === 'thinking' ? '0 0 30px #22d3ee' : '0 0 20px #fff'
          }}
          transition={{
            scaleY: {
              repeat: Infinity,
              duration: state === 'thinking' ? 0.6 : 4,
              times: state === 'thinking' ? [0, 0.5, 1] : [0, 0.8, 0.9, 0.95, 1],
              ease: "easeInOut"
            },
            x: { type: "spring", stiffness: 150, damping: 15 },
            y: { type: "spring", stiffness: 150, damping: 15 }
          }}
        />
      </motion.div>
    </div>
  );
}
