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

/* =========================================================
   STAFF / HUMAN RESPONSE CONSTANT
   ========================================================= */
const FACEBOOK_AGENT_MESSAGE =
  'Yes, of course! 😊 You can talk to our staff by visiting our Facebook Page: https://www.facebook.com/newkampothotel\n\nOur team will be happy to assist you there.';

/* =========================================================
   HELPERS & PRIVACY MESSAGE
   ========================================================= */
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

/* =========================================================
   CHAT WIDGET COMPONENT
   ========================================================= */
const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  /* =======================================================
     MESSAGES STATE
     ======================================================= */
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

  /* =======================================================
     FLOW STATE
     ======================================================= */
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

  /* =======================================================
     USER & PENDING STATE
     ======================================================= */
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_NAME) || '';
  });

  const [pendingQuestion, setPendingQuestion] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_PENDING_Q) || '';
  });

  /* =======================================================
     UI STATE & REFS
     ======================================================= */
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* =======================================================
     PRE-WARM SESSION ON MOUNT
     ======================================================= */
  useEffect(() => {
    getChatSession();
  }, []);

  /* =======================================================
     LOCAL STORAGE PERSISTENCE
     ======================================================= */
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

  /* =======================================================
     SCROLL HELPER & AUTO FOCUS
     ======================================================= */
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

  /* =======================================================
     MESSAGE MUTATION HELPERS
     ======================================================= */
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

  /* =======================================================
     ACTIONS & HANDLERS
     ======================================================= */
  const handleAgreePrivacy = () => {
    setFlowStep('READY');
    addMessage({
      id: generateUniqueId(),
      text: 'Thank you! How can we help you today?',
      sender: 'bot',
      timestamp: new Date(),
    });
  };

  const handleResetChat = () => {
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
  };

  const executeAiStream = async (questionText: string, currentUserName: string) => {
    // 1. Check local knowledge base
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

    // 2. Human/Staff redirection check
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

    // 3. AI Stream response
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
        'Sorry, I am having trouble reaching our concierge service right now. Please try asking again in a moment.'
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

    // Step 1: User asks initial question -> ask for name
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

    // Step 2: User inputs name -> execute pending question
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

    // Step 3: Regular chat flow
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

  /* =======================================================
     RENDER
     ======================================================= */
  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 p-4 bg-amber-600 text-white rounded-full shadow-2xl hover:bg-amber-700 transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center ${
          isOpen ? 'max-sm:hidden' : 'block'
        }`}
        aria-label="Toggle Chat"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>

      {/* Main Chat Window - Compact Widget for both Mobile and Desktop */}
      {isOpen && (
        <div className="fixed bottom-3 right-3 left-3 sm:left-auto sm:bottom-20 sm:right-6 z-50 w-auto sm:w-[380px] h-[500px] sm:h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden transition-all duration-200">
          {/* Header */}
          <div className="bg-slate-900 text-white p-3 sm:p-4 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Hotel className="w-5 h-5 text-amber-500" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base leading-tight text-white truncate">
                  New Kampot ChatBot
                </h3>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] sm:text-xs text-slate-300 truncate">
                    Online • AI Assistant
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1 shrink-0">
              <button
                onClick={handleResetChat}
                title="Reset conversation"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Reset chat"
              >
                <RotateCcw className="w-4 h-4 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-slate-50/50">
            {messages.map((msg) => (
              <React.Fragment key={msg.id}>
                <MessageBubble message={msg} />
                {msg.id === 'privacy-1' && flowStep === 'PRIVACY' && (
                  <div className="flex justify-start mt-2">
                    <button
                      onClick={handleAgreePrivacy}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white text-xs sm:text-sm font-medium rounded-xl hover:bg-amber-700 transition-all shadow-sm active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>I Agree</span>
                    </button>
                  </div>
                )}
              </React.Fragment>
            ))}

            {isLoading && (
              <div className="flex items-center space-x-2 text-slate-400 text-xs sm:text-sm pl-2 py-1">
                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer with safe-area support for modern mobile devices */}
          <form
            onSubmit={handleSend}
            className="p-3 sm:p-4 bg-white border-t border-slate-100 flex items-center space-x-2 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
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
                  ? 'Enter your name...'
                  : 'Ask about rooms, rates, wifi...'
              }
              disabled={flowStep === 'PRIVACY' || isLoading}
              className="flex-1 px-3.5 py-2.5 sm:py-2 text-base sm:text-sm bg-slate-100 rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-800 placeholder-slate-400"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || flowStep === 'PRIVACY' || isLoading}
              className="p-2.5 sm:p-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 disabled:opacity-40 disabled:hover:bg-amber-600 transition-colors shadow-sm shrink-0 active:scale-95"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatWidget;