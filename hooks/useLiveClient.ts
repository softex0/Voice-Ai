import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audioUtils';
import { AudioStatus, LogMessage } from '../types';

interface UseLiveClientProps {
  apiKey: string;
  systemInstruction: string;
  onLog: (message: LogMessage) => void;
}

export const useLiveClient = ({ apiKey, systemInstruction, onLog }: UseLiveClientProps) => {
  const [status, setStatus] = useState<AudioStatus>(AudioStatus.DISCONNECTED);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);

  // Audio Contexts and Nodes
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  // Audio State
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // API Session
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  // Animation Frame for volume visualizer
  const animationFrameRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    // Stop all active sources
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { /* ignore */ }
    });
    activeSourcesRef.current.clear();

    // Close audio contexts
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (outputContextRef.current) {
      outputContextRef.current.close();
      outputContextRef.current = null;
    }

    // Stop streams
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setStatus(AudioStatus.DISCONNECTED);
    setIsUserSpeaking(false);
    setIsModelSpeaking(false);
    setVolume(0);
  }, []);

  const connect = useCallback(async () => {
    try {
      setStatus(AudioStatus.CONNECTING);
      
      // Initialize GoogleGenAI
      const ai = new GoogleGenAI({ apiKey });

      // Initialize Audio Contexts
      // Input: 16kHz required by Gemini Live
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      // Output: 24kHz required by Gemini Live response
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      // Setup Output Node
      outputNodeRef.current = outputContextRef.current.createGain();
      outputNodeRef.current.connect(outputContextRef.current.destination);

      // Setup Analyser for visualization (Model output)
      analyserRef.current = outputContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      outputNodeRef.current.connect(analyserRef.current);

      // Start Volume Visualization Loop
      const updateVolume = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          // Normalize somewhat
          setVolume(Math.min(100, avg * 2)); 
          setIsModelSpeaking(avg > 10);
        }
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Connect to Gemini Live
      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }, // Professional sounding voice
          },
          systemInstruction: systemInstruction,
          inputAudioTranscription: {}, 
          outputAudioTranscription: {},
        },
      };

      sessionPromiseRef.current = ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            setStatus(AudioStatus.CONNECTED);
            onLog({ role: 'system', text: 'Connected to Gemini Live', timestamp: new Date() });

            // Setup Input Processing (Mic -> Gemini)
            if (!inputContextRef.current) return;
            
            const source = inputContextRef.current.createMediaStreamSource(stream);
            inputSourceRef.current = source;
            
            // Using ScriptProcessor as per documentation example for raw PCM access
            const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Simple VAD for visual feedback
              const rms = Math.sqrt(inputData.reduce((acc, val) => acc + val * val, 0) / inputData.length);
              setIsUserSpeaking(rms > 0.02); // Threshold

              const pcmBlob = createPcmBlob(inputData);
              sessionPromiseRef.current?.then(session => {
                 session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputContextRef.current.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Handle Transcriptions
            if (msg.serverContent?.outputTranscription?.text) {
               onLog({ role: 'model', text: msg.serverContent.outputTranscription.text, timestamp: new Date() });
            }
            if (msg.serverContent?.inputTranscription?.text) {
               onLog({ role: 'user', text: msg.serverContent.inputTranscription.text, timestamp: new Date() });
            }

            // Handle Audio Output
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputContextRef.current && outputNodeRef.current) {
               const ctx = outputContextRef.current;
               const uint8Array = base64ToUint8Array(audioData);
               const audioBuffer = await decodeAudioData(uint8Array, ctx);
               
               // Scheduling
               nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
               
               const source = ctx.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(outputNodeRef.current);
               
               source.start(nextStartTimeRef.current);
               nextStartTimeRef.current += audioBuffer.duration;
               
               activeSourcesRef.current.add(source);
               source.onended = () => {
                 activeSourcesRef.current.delete(source);
               };
            }

            // Handle Interruption
            if (msg.serverContent?.interrupted) {
               onLog({ role: 'system', text: 'Interruption detected', timestamp: new Date() });
               activeSourcesRef.current.forEach(s => s.stop());
               activeSourcesRef.current.clear();
               nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            onLog({ role: 'system', text: 'Connection closed', timestamp: new Date() });
            setStatus(AudioStatus.DISCONNECTED);
          },
          onerror: (err) => {
            console.error(err);
            onLog({ role: 'system', text: `Error: ${err.message}`, timestamp: new Date() });
            setStatus(AudioStatus.ERROR);
          }
        }
      });

    } catch (error) {
      console.error("Connection failed", error);
      setStatus(AudioStatus.ERROR);
      onLog({ role: 'system', text: 'Failed to connect to audio devices', timestamp: new Date() });
    }
  }, [apiKey, systemInstruction, onLog]);

  return {
    connect,
    disconnect: cleanup,
    status,
    isUserSpeaking,
    isModelSpeaking,
    volume
  };
};
