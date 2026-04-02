import { limitFactLength } from './utils/limit-fact-length';

interface OpenAiChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

interface OpenAiImageGenerationResponse {
  data?: Array<{
    url?: string;
  }>;
}

const OPENAI_FACT_MODEL = process.env.OPENAI_FACT_MODEL ?? 'gpt-4o';
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? 'dall-e-3';
const OPENAI_API_BASE_URL = 'https://api.openai.com/v1';
const FACT_TIMEOUT_MS = 12000;
const IMAGE_TIMEOUT_MS = 20000;

async function postOpenAi<T>(
  path: string,
  body: unknown,
  timeoutMs: number
): Promise<T | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${OPENAI_API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateFakeFact(birdName: string): Promise<string | null> {
  const response = await postOpenAi<OpenAiChatCompletionResponse>(
    '/chat/completions',
    {
      model: OPENAI_FACT_MODEL,
      max_tokens: 90,
      temperature: 1,
      messages: [
        {
          role: 'system',
          content:
            'You write concise, plausible-sounding fictional bird field guide facts. Do not mention that the fact is fictional or AI-generated.',
        },
        {
          role: 'user',
          content: `Generate one concise, plausible field-guide fact about a bird called "${birdName}". Keep it to no more than 2 short sentences, and stop immediately after the second sentence.`,
        },
      ],
    },
    FACT_TIMEOUT_MS
  );

  const content = response?.choices?.[0]?.message?.content?.trim();
  return content ? limitFactLength(content, 2) : null;
}

export async function generateFakeImage(
  birdName: string,
  factHintContent?: string
): Promise<string | null> {
  const factContext = factHintContent
    ? ` Use this field-note description only for visually observable traits when relevant: "${factHintContent}".`
    : '';

  const response = await postOpenAi<OpenAiImageGenerationResponse>(
    '/images/generations',
    {
      model: OPENAI_IMAGE_MODEL,
      prompt: `Create a realistic wildlife photo of a bird called "${birdName}" in the style of a Wikipedia bird photograph. Show a single bird in a natural outdoor habitat with accurate-looking plumage, believable anatomy, natural light, documentary field-guide composition, and the subtle imperfections of a human-taken telephoto wildlife photo. Keep it plausible rather than hyper-clean: realistic depth of field, natural framing, slight feather softness or motion, and mild photographic grain are acceptable.${factContext} The image must look like a real camera photo of the bird itself, not an artwork, studio setup, or staged scene. Show only natural elements that belong in a bird photograph, such as branches, leaves, water, sky, rock, or grass. Do not include any human-made object anywhere in the frame. Do not include cameras, camera straps, lenses, tripods, people, hands, sketchbooks, notebooks, pens, pencils, paintbrushes, easels, drawings, paintings, illustrations, diagrams, text, labels, watermarks, frames, collages, cages, feeders, or multiple birds.`,
      quality: 'standard',
      response_format: 'url',
      size: '1024x1024',
    },
    IMAGE_TIMEOUT_MS
  );

  const imageUrl = response?.data?.[0]?.url?.trim();
  return imageUrl ? imageUrl : null;
}