import React, { useState, useEffect, useRef } from 'react';
import { useLiveClient } from './hooks/useLiveClient';
import { AudioStatus, LogMessage, Scenario } from './types';
import { SCENARIOS } from './constants';
import { ScenarioCard } from './components/ScenarioCard';
import { AudioVisualizer } from './components/AudioVisualizer';

export default function App() {
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(SCENARIOS[0]);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  // Environment variable check
  const apiKey = process.env.API_KEY || '';

  const handleLog = (message: LogMessage) => {
    setLogs(prev => [...prev, message]);
  };

  const { connect, disconnect, status, isUserSpeaking, isModelSpeaking, volume } = useLiveClient({
    apiKey,
    systemInstruction: selectedScenario.systemInstruction,
    onLog: handleLog
  });

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const toggleConnection = () => {
    if (status === AudioStatus.CONNECTED || status === AudioStatus.CONNECTING) {
      disconnect();
    } else {
      connect();
    }
  };

  const isConnected = status === AudioStatus.CONNECTED;

  if (!apiKey) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
            <div className="max-w-md text-center border border-red-500/50 bg-red-900/20 p-8 rounded-2xl">
                <h1 className="text-2xl font-bold text-red-400 mb-4">API Key Missing</h1>
                <p className="text-slate-300">
                    Could not find <code>process.env.API_KEY</code>. <br/>
                    Please configure your environment variables to use the Gemini API.
                </p>
            </div>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-200 overflow-hidden">
      
      {/* Left Sidebar: Settings & Scenarios */}
      <div className="w-full md:w-80 lg:w-96 p-6 flex flex-col border-r border-slate-800 bg-slate-950/50 backdrop-blur-sm z-10">
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-2xl">⚡</span>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              ColdCall.AI
            </h1>
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Gemini 2.5 Simulator</p>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4 pb-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">Select Scenario</h2>
          {SCENARIOS.map(scenario => (
            <div key={scenario.id} className={isConnected ? 'opacity-50 pointer-events-none grayscale' : ''}>
               <ScenarioCard 
                scenario={scenario} 
                isSelected={selectedScenario.id === scenario.id} 
                onSelect={setSelectedScenario} 
              />
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-800 text-xs text-slate-600 text-center">
          Powered by Google Gemini Multimodal Live API
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative">
        
        {/* Header / Status Bar */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20 pointer-events-none">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-slate-600'}`}></div>
            <span className={`text-sm font-medium ${isConnected ? 'text-green-400' : 'text-slate-500'}`}>
              {status === AudioStatus.CONNECTING ? 'Connecting...' : isConnected ? 'Live Connection' : 'Offline'}
            </span>
          </div>
          <div className="text-sm font-mono text-slate-500 opacity-50">
             {selectedScenario.name} Mode
          </div>
        </div>

        {/* Center Stage: Visualizer */}
        <div className="flex-1 flex flex-col items-center justify-center relative min-h-[400px]">
          {/* Background Grid */}
          <div className="absolute inset-0 opacity-10" 
             style={{backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '40px 40px'}}>
          </div>

          <div className="z-10 flex flex-col items-center space-y-12">
            
            <AudioVisualizer 
              isUserSpeaking={isUserSpeaking} 
              isModelSpeaking={isModelSpeaking}
              volume={volume}
            />

            <div className="flex flex-col items-center space-y-4">
               {/* Main Action Button */}
              <button
                onClick={toggleConnection}
                disabled={status === AudioStatus.CONNECTING}
                className={`
                  relative group px-8 py-4 rounded-full font-bold text-lg tracking-wider transition-all duration-300
                  ${isConnected 
                    ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/50' 
                    : 'bg-white text-slate-900 hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]'}
                `}
              >
                {status === AudioStatus.CONNECTING ? 'Initializing...' : isConnected ? 'End Call' : 'Start Simulation'}
              </button>
              
              <p className="text-slate-500 text-sm max-w-xs text-center">
                 {isConnected 
                   ? "Speak naturally. Interrupt the AI at any time." 
                   : "Select a scenario from the sidebar and click Start to begin."}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Panel: Live Transcript */}
        <div className="h-64 bg-slate-950 border-t border-slate-800 flex flex-col">
          <div className="px-6 py-2 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Live Transcript</h3>
            <span className="text-xs text-slate-600">{logs.length} events</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide font-mono text-sm">
            {logs.length === 0 && (
              <div className="text-slate-600 italic text-center mt-10">Waiting for conversation to start...</div>
            )}
            {logs.map((log, i) => (
              <div key={i} className={`flex space-x-3 ${log.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`
                  max-w-[80%] p-3 rounded-lg 
                  ${log.role === 'user' ? 'bg-slate-800 text-slate-200 rounded-tr-none' : 
                    log.role === 'model' ? 'bg-blue-900/20 text-blue-200 border border-blue-900/50 rounded-tl-none' :
                    'bg-transparent text-slate-500 w-full text-center text-xs italic border-none p-1'}
                `}>
                  {log.role !== 'system' && (
                    <div className="text-[10px] opacity-50 mb-1 uppercase tracking-wider">
                      {log.role === 'user' ? 'You' : selectedScenario.name}
                    </div>
                  )}
                  {log.text}
                </div>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>

      </div>
    </div>
  );
}
