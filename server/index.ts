import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3001;

// --------------------------------------------------
// Middleware
// --------------------------------------------------

app.use(
  cors({
    origin: 'http://localhost:5173',
  })
);

app.use(express.json());

// --------------------------------------------------
// Environment
// --------------------------------------------------

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('');
  console.error('==========================================');
  console.error('ERROR: OPENAI_API_KEY is missing');
  console.error('Check your .env file.');
  console.error('==========================================');
  console.error('');

  process.exit(1);
}

// --------------------------------------------------
// OpenAI
// --------------------------------------------------

const client = new OpenAI({
  apiKey,
});

// --------------------------------------------------
// Health check
// --------------------------------------------------

app.get('/health', (_req: Request, res: Response) => {
  console.log('Health check received');

  res.status(200).json({
    status: 'ok',
    server: 'New Kampot Hotel & Residence AI server',
    port: PORT,
  });
});

// --------------------------------------------------
// Root
// --------------------------------------------------

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    message: 'New Kampot Hotel & Residence AI server is running',
    health: '/health',
    chat: '/api/chat',
  });
});

// --------------------------------------------------
// AI Chat
// --------------------------------------------------

app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    console.log('');
    console.log('==========================================');
    console.log('CHAT REQUEST');
    console.log('Message:', message);
    console.log('==========================================');

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Message is required.',
      });
    }

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `
You are the official AI assistant for New Kampot Hotel & Residence.

Your job is to help students, parents, teachers, and visitors.

You can help with:
- Enrollment and admissions
- School information
- Student portal
- Grades
- Classes
- School policies
- General school procedures

Be friendly, professional, concise, and helpful.

IMPORTANT RULES:

1. Do not invent school policies.
2. Do not invent fees.
3. Do not invent schedules.
4. Do not invent requirements.
5. Do not invent contact information.
6. If information is not available in the school knowledge base,
   clearly tell the user that you do not have that information.
7. Never claim to be a human.
8. Never pretend that you have access to private student records.
9. Keep answers appropriate for students, parents, teachers, and visitors.

The official  New Kampot Hotel & Residencel knowledge base will be connected later.
`,
        },
        {
          role: 'user',
          content: message,
        },
      ],
    });

    const reply =
      response.choices[0]?.message?.content ||
      'Sorry, I could not generate a response.';

    console.log('AI:', reply);

    return res.status(200).json({
      reply,
    });
  } catch (error: unknown) {
    console.error('');
    console.error('==========================================');
    console.error('OPENAI ERROR');
    console.error(error);
    console.error('==========================================');
    console.error('');

    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown OpenAI error';

    return res.status(500).json({
      error: 'Unable to connect to the AI service.',
      details: errorMessage,
    });
  }
});

// --------------------------------------------------
// Error handler
// --------------------------------------------------

app.use(
  (
    error: unknown,
    _req: Request,
    res: Response,
    _next: Function
  ) => {
    console.error('Express error:', error);

    res.status(500).json({
      error: 'Internal server error.',
    });
  }
);

// --------------------------------------------------
// Start server
// --------------------------------------------------

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('==========================================');
  console.log('New Kampot Hotel & Residence AI SERVER');
  console.log('==========================================');
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Chat:   http://localhost:${PORT}/api/chat`);
  console.log('==========================================');
  console.log('');
});

// --------------------------------------------------
// Keep server alive / error handling
// --------------------------------------------------

server.on('error', (error: NodeJS.ErrnoException) => {
  console.error('');
  console.error('==========================================');
  console.error('SERVER ERROR');
  console.error('==========================================');

  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
  } else {
    console.error(error);
  }

  console.error('==========================================');
});

process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('UNHANDLED REJECTION:', error);
});