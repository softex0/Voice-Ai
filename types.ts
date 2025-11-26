export interface Scenario {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
  icon: string;
}

export interface LogMessage {
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
}

export enum AudioStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}
