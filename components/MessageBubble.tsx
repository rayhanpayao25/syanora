import React from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { ChatMessage } from '../types';

interface MessageBubbleProps {
  message: ChatMessage;
}

// Helper function para mag-convert ng raw text na may URLs into clickable <a> tags
const renderFormattedText = (text: string) => {
  // Regex pattern para mahanap ang mga standard web links (http, https, www)
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  return text.split('\n').map((line, lineIndex) => {
    const parts = line.split(urlRegex);

    return (
      <React.Fragment key={lineIndex}>
        {lineIndex > 0 && <br />}
        {parts.map((part, index) => {
          if (part.match(urlRegex)) {
            return (
              <a
                key={index}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-80 font-semibold break-all text-amber-600 hover:text-amber-700 transition-colors"
              >
                {part}
              </a>
            );
          }
          return part;
        })}
      </React.Fragment>
    );
  });
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isBot = message.sender === 'bot';
  const isSystem = message.sender === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[11px] bg-rose-50 text-rose-600 border border-rose-200 px-3 py-1 rounded-full font-medium">
          {message.text}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-2.5 ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
      {/* BOT AVATAR ICON */}
      {isBot && (
        <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
          <Bot size={18} />
        </div>
      )}

      {/* MESSAGE BUBBLE */}
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed ${
          isBot
            ? 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs shadow-xs'
            : 'bg-amber-600 text-white rounded-tr-xs shadow-xs'
        }`}
      >
        {/* KUNG BAKANTE PA ANG TEXT NG BOT HABANG NAG-LOADING, IPALABAS ANG TYPING SPINNER */}
        {isBot && !message.text ? (
          <div className="flex items-center gap-2 text-slate-400 py-0.5">
            <Loader2 size={14} className="animate-spin text-amber-600" />
            <span className="italic">Typing...</span>
          </div>
        ) : (
          <div>{renderFormattedText(message.text)}</div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;