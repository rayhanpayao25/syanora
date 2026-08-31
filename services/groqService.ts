import Groq from 'groq-sdk';
import { HOTEL_KNOWLEDGE_BASE } from '../data/knowledgeBase';

const apiKey = import.meta.env.VITE_GROQ_API_KEY || '';

const groq = new Groq({
  apiKey,
  dangerouslyAllowBrowser: true, // Required for client-side React apps
});

const SYSTEM_INSTRUCTION = `
You are the polite concierge assistant for New Kampot Hotel & Residence.
Your goal is to answer guest queries strictly using the provided Knowledge Base below.

Guidelines:
- Always check the Knowledge Base for details (e.g., Check-in is 2:00 PM, Check-out is 12:00 PM, room rates, amenities, payment methods ABA/Wing).
- Keep your answers concise, helpful, and professional (maximum 2-3 sentences).
- Address the user by their name if provided.
- If the requested information is not in the knowledge base, politely inform the user and suggest reaching out via Facebook or phone (+855 69 527 788).

KNOWLEDGE BASE:
${HOTEL_KNOWLEDGE_BASE}
`;

type ChatMessageRole = 'system' | 'user' | 'assistant';

interface ChatMessagePayload {
  role: ChatMessageRole;
  content: string;
}

// In-memory chat history manager
let chatHistory: ChatMessagePayload[] = [
  { role: 'system', content: SYSTEM_INSTRUCTION },
];

export const getChatSession = () => {
  return chatHistory;
};

export const sendMessageStream = async (
  userMessage: string,
  onChunk: (chunkText: string) => void
): Promise<void> => {
  try {
    // Append user message to history
    chatHistory.push({ role: 'user', content: userMessage });

    const completionStream = await groq.chat.completions.create({
      messages: chatHistory,
      model: 'openai/gpt-oss-120b',
      temperature: 0.2,
      max_completion_tokens: 300,
      stream: true,
    });

    let fullAssistantResponse = '';

    for await (const chunk of completionStream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullAssistantResponse += content;
        onChunk(content);
      }
    }

    // Save final response to history
    if (fullAssistantResponse) {
      chatHistory.push({ role: 'assistant', content: fullAssistantResponse });
    }
  } catch (error) {
    console.error('Groq API Streaming Error:', error);
    // Remove last unsent message on failure to keep history clean
    chatHistory.pop();
    throw error;
  }
};

export const resetChatSession = () => {
  chatHistory = [{ role: 'system', content: SYSTEM_INSTRUCTION }];
};