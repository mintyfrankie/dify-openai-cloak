import express, { Request, Response } from 'express';
import { OpenAIApiResponse } from './interfaces';

export const app = express();
const port = 3000;

app.use(express.json());

app.post('/v1/chat/completions', (req: Request, res: Response) => {
  try {
    const mockResponse: OpenAIApiResponse = {
      id: 'chatcmpl-123',
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'gpt-3.5-turbo-0301',
      usage: {
        prompt_tokens: 9,
        completion_tokens: 12,
        total_tokens: 21,
      },
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'This is a mock response from the AI.',
          },
          finish_reason: 'stop',
          index: 0,
        },
      ],
    };

    res.json(mockResponse);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}
