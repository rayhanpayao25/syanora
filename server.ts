import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not configured.');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Message is required.',
      });
    }

    const response = await openai.responses.create({
      model: 'gpt-5-mini',
      instructions: `
You are the official AI assistant for Sovannaphumi School.

Help students, parents, teachers, and visitors with questions about:
- Enrollment and admissions
- School information
- Student portal
- Grades
- Classes
- School procedures

Be friendly, professional, and concise.

Do not invent school information.
If you don't know something, tell the user to contact
the school administration or a live support agent.

Never claim to be a human.
      `,
      input: message,
    });

    res.json({
      reply: response.output_text,
    });
  } catch (error) {
    console.error('OpenAI error:', error);

    res.status(500).json({
      error: 'Failed to get a response from OpenAI.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`OpenAI server running at http://localhost:${PORT}`);
});