export type SenderRole = 'user' | 'bot' | 'system';

export interface ChatMessage {
  id: string;
  text: string;
  sender: SenderRole;
  timestamp: Date;
}

export interface ChatState {
  isOpen: boolean;
  isConnectingToAgent: boolean;
  messages: ChatMessage[];
}
