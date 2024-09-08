import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import yaml from 'js-yaml';
import fs from 'fs';
import { OpenAIApiRequest, OpenAIApiResponse } from './interfaces';
import { TranslationService } from './service';

export interface Config {
  application_name: string;
  dify_api_endpoint: string;
  models: { [key: string]: string };
}

export function loadConfig(): Config {
  try {
    return yaml.load(fs.readFileSync('config.yaml', 'utf8')) as Config;
  } catch (error) {
    console.warn('config.yaml not found or invalid. Falling back to environment variables.');
    dotenv.config();
    return {
      application_name: process.env.APPLICATION_NAME || 'default-app',
      dify_api_endpoint: process.env.DIFY_API_ENDPOINT || '',
      models: {
        'default-model': process.env.DIFY_API_KEY || '',
      },
    };
  }
}

export function validateConfig(config: Config): void {
  if (!config.dify_api_endpoint) {
    throw new Error(
      'Dify API endpoint is not set. Please set it in config.yaml or DIFY_API_ENDPOINT environment variable.',
    );
  }

  if (Object.keys(config.models).length === 0) {
    throw new Error(
      'No models configured. Please set them in config.yaml or provide DIFY_API_KEY environment variable.',
    );
  }
}

export function createApp() {
  const config = loadConfig();
  validateConfig(config);

  const app = express();
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

  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = 3000;
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}
