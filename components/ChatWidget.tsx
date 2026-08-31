import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';

import {
  MessageSquare,
  X,
  Send,
  Hotel,
  CheckCircle2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

import { ChatMessage } from '../types';
import {
  sendMessageStream,
  resetChatSession,
  getChatSession,
} from '../services/groqService';

import MessageBubble from './MessageBubble';
import { checkLocalKnowledgeBase } from '../data/localKnowledgeBase';

type FlowStep =
  | 'PRIVACY'
  | 'READY'
  | 'ASKING_NAME'
  | 'CHATTING';

const STORAGE_KEY_MESSAGES = 'kampot_chat_messages';
const STORAGE_KEY_STEP = 'kampot_chat_step';
const STORAGE_KEY_NAME = 'kampot_chat_name';
const STORAGE_KEY_PENDING_Q = 'kampot_chat_pending_q';

const FACEBOOK_AGENT_MESSAGE =
  'Yes, of course! 😊 You can talk to our staff by visiting our Facebook Page: https://www.facebook.com/newkampothotel\n\nOur team will be happy to assist you there.';

const generateUniqueId = () =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

const PRIVACY_MESSAGE: ChatMessage = {
  id: 'privacy-1',
  text:
    'Welcome to New Kampot Hotel & Residence Concierge Support.\n\n' +
    'To assist you with reservations and inquiries, please acknowledge our ' +
    'Data Privacy Policy: https://newkampothotel.com/privacy-policy.\n\n' +
    'If you agree, kindly click the I Agree button below.',
  sender: 'bot',
  timestamp: new Date(),
};

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MESSAGES);
      if (!saved) return [PRIVACY_MESSAGE];

      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) return [PRIVACY_MESSAGE];

      return parsed.map((message: ChatMessage) => ({
        ...message,
        timestamp: new Date(message.timestamp),
      }));
    } catch (error) {
      console.error('Failed to load saved chat messages:', error);
      return [PRIVACY_MESSAGE];
    }
  });

  const [flowStep, setFlowStep] = useState<FlowStep>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_STEP);
    if (
      saved === 'PRIVACY' ||
      saved === 'READY' ||
      saved === 'ASKING_NAME' ||
      saved === 'CHATTING'
    ) {
      return saved as FlowStep;
    }
    return 'PRIVACY';
  });

  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_NAME) || '';
  });

  const [pendingQuestion, setPendingQuestion] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_PENDING_Q) || '';
  });

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getChatSession();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_STEP, flowStep);
  }, [flowStep]);

  useEffect(() => {
    if (userName) {
      localStorage.setItem(STORAGE_KEY_NAME, userName);
    } else {
      localStorage.removeItem(STORAGE_KEY_NAME);
    }
  }, [userName]);

  useEffect(() => {
    if (pendingQuestion) {
      localStorage.setItem(STORAGE_KEY_PENDING_Q, pendingQuestion);
    } else {
      localStorage.removeItem(STORAGE_KEY_PENDING_Q);
    }
  }, [pendingQuestion]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      if (flowStep !== 'PRIVACY' && !isLoading) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    }
  }, [messages, isOpen, flowStep, isLoading, scrollToBottom]);

  const addMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const updateLastBotMessage = (text: string) => {
    setMessages((prev) => {
      const next = [...prev];
      const lastIndex = next.length - 1;
      if (lastIndex >= 0 && next[lastIndex].sender === 'bot') {
        next[lastIndex] = { ...next[lastIndex], text };
      }
      return next;
    });
  };

  const handleAgreePrivacy = () => {
    setFlowStep('READY');
    addMessage({
      id: generateUniqueId(),
      text: 'Thank you! How can we help you today?',
      sender: 'bot',
      timestamp: new Date(),
    });
  };

  const handleEndSession = () => {
    resetChatSession();
    localStorage.removeItem(STORAGE_KEY_MESSAGES);
    localStorage.removeItem(STORAGE_KEY_STEP);
    localStorage.removeItem(STORAGE_KEY_NAME);
    localStorage.removeItem(STORAGE_KEY_PENDING_Q);

    setMessages([PRIVACY_MESSAGE]);
    setFlowStep('PRIVACY');
    setUserName('');
    setPendingQuestion('');
    setInputValue('');
    setIsLoading(false);
    setIsOpen(false);
  };

  const executeAiStream = async (questionText: string, currentUserName: string) => {
    const localAnswer = checkLocalKnowledgeBase(questionText);
    if (localAnswer) {
      addMessage({
        id: generateUniqueId(),
        text: localAnswer,
        sender: 'bot',
        timestamp: new Date(),
      });
      setIsLoading(false);
      return;
    }

    const lowerQ = questionText.toLowerCase();
    if (
      lowerQ.includes('staff') ||
      lowerQ.includes('human') ||
      lowerQ.includes('person') ||
      lowerQ.includes('agent')
    ) {
      addMessage({
        id: generateUniqueId(),
        text: FACEBOOK_AGENT_MESSAGE,
        sender: 'bot',
        timestamp: new Date(),
      });
      setIsLoading(false);
      return;
    }

    const botMessageId = generateUniqueId();
    addMessage({
      id: botMessageId,
      text: '',
      sender: 'bot',
      timestamp: new Date(),
    });

    let fullResponse = '';
    try {
      await sendMessageStream(questionText, currentUserName, (chunk: string) => {
        fullResponse += chunk;
        updateLastBotMessage(fullResponse);
      });
    } catch (error) {
      console.error('API Error:', error);
      updateLastBotMessage(
        'I’d be happy to help with anything related to the hotel. You can ask about our rooms, facilities, amenities, dining, services, or other details for your stay. Please try another hotel-related question.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputValue.trim();
    if (!text || isLoading || flowStep === 'PRIVACY') return;

    setInputValue('');

    if (flowStep === 'READY') {
      addMessage({
        id: generateUniqueId(),
        text,
        sender: 'user',
        timestamp: new Date(),
      });

      setPendingQuestion(text);
      setFlowStep('ASKING_NAME');

      addMessage({
        id: generateUniqueId(),
        text: 'Before we answer your question, may we please know your name so we can assist you better?',
        sender: 'bot',
        timestamp: new Date(),
      });
      return;
    }

    if (flowStep === 'ASKING_NAME') {
      const extractedName = text;
      setUserName(extractedName);
      setFlowStep('CHATTING');

      addMessage({
        id: generateUniqueId(),
        text: `Nice to meet you, ${extractedName}! Let me look into your question right away.`,
        sender: 'bot',
        timestamp: new Date(),
      });

      const questionToAnswer = pendingQuestion;
      setPendingQuestion('');
      setIsLoading(true);

      await executeAiStream(questionToAnswer, extractedName);
      return;
    }

    if (flowStep === 'CHATTING') {
      addMessage({
        id: generateUniqueId(),
        text,
        sender: 'user',
        timestamp: new Date(),
      });

      setIsLoading(true);
      await executeAiStream(text, userName);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[9999] p-4 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white rounded-full shadow-[0_10px_25px_-5px_rgba(180,83,9,0.5)] hover:shadow-[0_15px_30px_-5px_rgba(180,83,9,0.7)] transition-all duration-300 transform hover:scale-110 active:scale-95 flex items-center justify-center group"
        aria-label="Toggle Chat"
      >
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-200 border-2 border-white"></span>
        </span>
        {isOpen ? (
          <X className="w-6 h-6 transition-transform duration-300 rotate-0 group-hover:rotate-90" />
        ) : (
          <MessageSquare className="w-6 h-6 transition-transform duration-300 scale-100 group-hover:scale-110" />
        )}
      </button>

      {/* Main Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-[9998] w-[calc(100vw-32px)] sm:w-[400px] h-[480px] sm:h-[580px] max-h-[calc(100vh-100px)] bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-amber-100/80 flex flex-col overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 text-white px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between shadow-lg shrink-0 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
                <Hotel className="w-5 h-5 text-amber-200" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <h3 className="font-bold text-sm sm:text-base tracking-wider text-amber-50">
                    NEW KAMPOT
                  </h3>
                  <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                </div>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[11px] sm:text-xs text-amber-200/90 font-medium tracking-wide">
                     Online ChatBot Assitant
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-2 text-amber-200/80 hover:text-white rounded-xl hover:bg-white/10 transition-all relative z-10"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-gradient-to-b from-stone-50/50 to-amber-50/20 scroll-smooth">
            {messages.map((msg) => (
              <React.Fragment key={msg.id}>
                <MessageBubble message={msg} />
                {msg.id === 'privacy-1' && flowStep === 'PRIVACY' && (
                  <div className="flex justify-start pl-2 mt-1">
                    <button
                      onClick={handleAgreePrivacy}
                      className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white text-xs sm:text-sm font-semibold rounded-xl hover:from-amber-700 hover:to-amber-800 transition-all shadow-[0_4px_12px_rgba(180,83,9,0.3)] active:scale-95 transform hover:-translate-y-0.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-amber-200" />
                      <span>I Agree & Continue</span>
                    </button>
                  </div>
                )}
              </React.Fragment>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="bg-white/80 backdrop-blur-md border-t border-amber-100/60 flex flex-col shrink-0 p-3 sm:p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
            <form
              onSubmit={handleSend}
              className="flex items-center space-x-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  flowStep === 'PRIVACY'
                    ? 'Please accept privacy terms first...'
                    : flowStep === 'ASKING_NAME'
                    ? 'Type your name here...'
                    : 'Ask about suites, dining, or amenities...'
                }
                disabled={flowStep === 'PRIVACY' || isLoading}
                /* Binago ang text-sm papuntang text-base para sa mobile viewports upang maiwasan ang auto-zoom ng mobile Safari */
                className="flex-1 px-4 py-2.5 sm:py-3 text-base sm:text-sm bg-stone-50/80 rounded-2xl border border-amber-200/70 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed text-stone-800 placeholder-stone-400 shadow-sm transition-all"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || flowStep === 'PRIVACY' || isLoading}
                className="p-3 bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-2xl hover:from-amber-700 hover:to-amber-800 disabled:opacity-40 disabled:hover:from-amber-600 disabled:hover:to-amber-700 transition-all shadow-md shadow-amber-900/10 shrink-0 active:scale-95 transform hover:-translate-y-0.5 flex items-center justify-center"
                aria-label="Send message"
              >
                <Send className="w-4 h-4 text-amber-100" />
              </button>
            </form>

            {/* End Session Bar */}
            <div className="px-2 pt-2 flex justify-between items-center text-xs">
              <span className="text-stone-400 font-medium pl-1 scale-90 origin-left">New Kampot Hotel Ai Assistant</span>
              <button
                onClick={handleEndSession}
                className="inline-flex items-center space-x-1 text-stone-500 hover:text-amber-800 transition-colors font-medium py-1 px-2 rounded-lg hover:bg-amber-50"
                aria-label="End Session"
              >
                <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
                <span>End Session</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;