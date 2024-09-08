import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import yaml from 'js-yaml';
import fs from 'fs';
import { OpenAIApiRequest, OpenAIApiResponse } from './interfaces';
import { TranslationService } from './service';

dotenv.config();

// Load config.yaml
const config = yaml.load(fs.readFileSync('config.yaml', 'utf8')) as {
  application_name: string;
  dify_api_endpoint: string;
  models: { [key: string]: string };
};

export const app = express();
const port = 3000;

app.use(express.json());

// Create a TranslationService for each model
const translationServices: { [key: string]: TranslationService } = {};
for (const [model, apiKey] of Object.entries(config.models)) {
  translationServices[model] = new TranslationService(apiKey, config.dify_api_endpoint);
}

app.post('/v1/chat/completions', async (req: Request, res: Response) => {
  try {
    const openAIRequest: OpenAIApiRequest = req.body;
    const model = openAIRequest.model;

    if (!translationServices[model]) {
      return res.status(400).json({ error: `Unsupported model: ${model}` });
    }

    const openAIResponse: OpenAIApiResponse = await translationServices[model].request(
      openAIRequest,
      config.application_name,
    );
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
