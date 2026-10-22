import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function generateWithRetry(ai: GoogleGenAI, params: any) {
  const modelsToTry = [params.model || 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || '');
        // If 503 or 429, wait 800ms and retry
        if (errMsg.includes('503') || errMsg.includes('429') || errMsg.includes('UNAVAILABLE')) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }
        // Non-transient error, break to next model
        break;
      }
    }
  }

  throw lastError;
}

function formatErrorMessage(error: any): string {
  try {
    const msg = error?.message || '';
    if (msg.includes('503') || msg.includes('UNAVAILABLE')) {
      return 'The AI service is experiencing high temporary demand. Please retry in a few seconds.';
    }
    if (msg.startsWith('{')) {
      const parsed = JSON.parse(msg);
      if (parsed?.error?.message) return parsed.error.message;
    }
    return msg || 'An error occurred while generating content.';
  } catch {
    return error?.message || 'An error occurred while generating content.';
  }
}

// Explain topic endpoint
app.post('/api/explain', async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: 'Please enter a topic or question to explain.' });
    }

    const ai = getAIClient();
    const prompt = `You are a warm, clear, and encouraging study tutor helping a student learn.
Explain the following topic or question:
"${topic.trim()}"

Format your response clearly using clean markdown with these sections:
## 💡 Overview
A friendly 1-2 sentence definition or answer.

## 🔑 Key Concepts
- 3 to 4 clear, high-yield bullet points explaining how it works or what makes it important.

## 🌍 Real-World Analogy
An intuitive everyday comparison that makes the concept easy to visualize and remember.

## 📝 Practical Example
A short, relatable walkthrough or sample scenario showing the idea in action.

## 🎯 Quick Takeaway
A single memorable sentence summarizing the main point.

Ensure explanations are accurate, accessible, and structured for quick study.`;

    const response = await generateWithRetry(ai, {
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const explanation = response.text || 'No explanation could be generated.';
    return res.json({ explanation });
  } catch (error: any) {
    console.error('Explanation error:', error);
    return res.status(500).json({
      error: formatErrorMessage(error),
    });
  }
});

// Quiz generation endpoint (5 questions)
app.post('/api/quiz', async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: 'Please enter a topic or question to generate a quiz.' });
    }

    const ai = getAIClient();
    const response = await generateWithRetry(ai, {
      model: 'gemini-3.8-flash',
      contents: `Generate exactly 5 beginner-friendly multiple-choice quiz questions to test a student's understanding of: "${topic.trim()}".
Each question must have 4 options, a 0-based integer indicating the correct option index (0 to 3), and a friendly explanation of why that answer is correct.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          description: 'A list of 5 quiz questions',
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER, description: 'Question number (1-5)' },
              question: { type: Type.STRING, description: 'The question text' },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Exactly 4 multiple choice options',
              },
              correctIndex: {
                type: Type.INTEGER,
                description: '0-based index of the correct option (0, 1, 2, or 3)',
              },
              explanation: {
                type: Type.STRING,
                description: 'Clear, encouraging explanation of the correct answer',
              },
            },
            required: ['id', 'question', 'options', 'correctIndex', 'explanation'],
          },
        },
      },
    });

    const rawJson = response.text?.trim() || '[]';
    let questions = [];
    try {
      questions = JSON.parse(rawJson);
    } catch (parseErr) {
      console.error('Failed to parse quiz response as JSON:', rawJson, parseErr);
      return res.status(500).json({ error: 'Failed to parse quiz questions from AI.' });
    }

    return res.json({ questions });
  } catch (error: any) {
    console.error('Quiz error:', error);
    return res.status(500).json({
      error: formatErrorMessage(error),
    });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

async function start() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start();
