import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { OpenAIApiRequest, OpenAIApiResponse } from './interfaces';
import { TranslationService } from './service';

dotenv.config();

export const app = express();
const port = 3000;

app.use(express.json());

const difyApiKey = process.env.DIFY_API_KEY;
const difyApiEndpoint = process.env.DIFY_API_ENDPOINT;

if (!difyApiKey || !difyApiEndpoint) {
  console.error('DIFY_API_KEY and DIFY_API_ENDPOINT must be set in .env file');
  process.exit(1);
}

const translationService = new TranslationService(difyApiKey, difyApiEndpoint);

app.post('/v1/chat/completions', async (req: Request, res: Response) => {
  try {
    const openAIRequest: OpenAIApiRequest = req.body;
    const openAIResponse: OpenAIApiResponse = await translationService.request(openAIRequest);
    res.json(openAIResponse);
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
