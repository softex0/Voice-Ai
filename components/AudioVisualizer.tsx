import React from 'react';

interface AudioVisualizerProps {
  isUserSpeaking: boolean;
  isModelSpeaking: boolean;
  volume: number; // 0-100
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isUserSpeaking, isModelSpeaking, volume }) => {
  // Dynamic scale based on volume
  const scale = 1 + (volume / 100) * 0.5;
  const opacity = 0.3 + (volume / 100) * 0.7;

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      {/* Background Rings */}
      <div className={`absolute inset-0 border-4 rounded-full transition-all duration-200 
        ${isModelSpeaking ? 'border-cyan-500/30' : 'border-slate-800'}
        ${isModelSpeaking && 'pulse-ring'}
      `}></div>
       <div className={`absolute inset-4 border-2 rounded-full transition-all duration-300 delay-75
        ${isModelSpeaking ? 'border-purple-500/30' : 'border-slate-800'}
        ${isModelSpeaking && 'pulse-ring'}
      `}></div>

      {/* Main Orb */}
      <div 
        className={`
          relative z-10 w-24 h-24 rounded-full shadow-2xl transition-all duration-100 ease-out flex items-center justify-center
          ${isUserSpeaking ? 'bg-emerald-500 shadow-emerald-500/50' : 
             isModelSpeaking ? 'bg-gradient-to-br from-cyan-400 to-blue-600 shadow-cyan-500/50' : 'bg-slate-700 shadow-slate-900'}
        `}
        style={{
          transform: `scale(${isModelSpeaking ? scale : isUserSpeaking ? 1.1 : 1})`,
          opacity: isModelSpeaking ? 1 : 0.8
        }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/20 to-transparent"></div>
        
        {/* Inner Icon/Status */}
        {isUserSpeaking ? (
           <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
           </svg>
        ) : isModelSpeaking ? (
           <div className="flex space-x-1 items-center justify-center h-full">
              <div className="w-1 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-1 h-5 bg-white rounded-full animate-bounce" style={{animationDelay: '100ms'}}></div>
              <div className="w-1 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
           </div>
        ) : (
           <div className="w-3 h-3 bg-slate-400 rounded-full"></div>
        )}
      </div>

      {/* User Speaking Indicator */}
      <div className={`absolute bottom-0 text-xs font-bold uppercase tracking-widest transition-colors duration-300
        ${isUserSpeaking ? 'text-emerald-400' : 'text-transparent'}
      `}>
        Listening
      </div>
    </div>
  );
};
