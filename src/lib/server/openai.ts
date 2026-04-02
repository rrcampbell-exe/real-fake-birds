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

interface RealBirdFactContext {
  birdName: string;
  regionLabel?: string;
  sciName?: string;
}

interface FakeBirdFactFocus {
  label: string;
  instruction: string;
}

const OPENAI_FACT_MODEL = process.env.OPENAI_FACT_MODEL ?? 'gpt-4o';
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? 'dall-e-3';
const OPENAI_API_BASE_URL = 'https://api.openai.com/v1';
const FACT_TIMEOUT_MS = 12000;
const IMAGE_TIMEOUT_MS = 20000;
const RECENT_FAKE_FACT_FOCUS_LIMIT = 2;

const FAKE_BIRD_FACT_FOCUSES: FakeBirdFactFocus[] = [
  {
    label: 'diet and foraging',
    instruction: 'Describe what it plausibly eats or how it searches for food.',
  },
  {
    label: 'breeding and nesting',
    instruction: 'Describe a plausible nesting habit, courtship behavior, or breeding pattern.',
  },
  {
    label: 'habitat and range',
    instruction: 'Describe the kind of place it would plausibly be found or where it tends to roam.',
  },
  {
    label: 'voice and display',
    instruction: 'Describe a plausible call, song, or display behavior.',
  },
  {
    label: 'seasonal movement',
    instruction: 'Describe a plausible migration, seasonal movement, or weather-related pattern.',
  },
  {
    label: 'social behavior',
    instruction: 'Describe a plausible flocking habit, territorial behavior, or interaction with other birds.',
  },
  {
    label: 'appearance',
    instruction: 'Describe one concrete visible trait, but avoid purple prose and avoid defaulting to generic plumage adjectives.',
  },
];

let recentFakeBirdFactFocusLabels: string[] = [];

function selectFakeBirdFactFocus(): FakeBirdFactFocus {
  const availableFocuses = FAKE_BIRD_FACT_FOCUSES.filter(
    ({ label }) => !recentFakeBirdFactFocusLabels.includes(label)
  );

  const focusPool = availableFocuses.length ? availableFocuses : FAKE_BIRD_FACT_FOCUSES;
  const index = Math.floor(Math.random() * focusPool.length);
  const selectedFocus = focusPool[index] ?? FAKE_BIRD_FACT_FOCUSES[0];

  recentFakeBirdFactFocusLabels = [selectedFocus.label, ...recentFakeBirdFactFocusLabels.filter((label) => label !== selectedFocus.label)]
    .slice(0, RECENT_FAKE_FACT_FOCUS_LIMIT);

  return selectedFocus;
}

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
  const factFocus = selectFakeBirdFactFocus();

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
            'You write concise, plausible-sounding fictional bird field guide facts. Vary the kind of fact you produce across diet, breeding, habitat, voice, seasonal movement, social behavior, and appearance. Do not default to plumage descriptions. Avoid overusing adjectives like striking, iridescent, vivid, colorful, or dazzling unless the requested focus is explicitly about appearance and they are truly needed. Do not mention that the fact is fictional or AI-generated.',
        },
        {
          role: 'user',
          content: `Generate one concise, plausible field-guide fact about a bird called "${birdName}". Focus on ${factFocus.label}. ${factFocus.instruction} Keep it to no more than 2 short sentences, and stop immediately after the second sentence.`,
        },
      ],
    },
    FACT_TIMEOUT_MS
  );

  const content = response?.choices?.[0]?.message?.content?.trim();
  return content ? limitFactLength(content, 2) : null;
}

export async function generateRealBirdFact({
  birdName,
  regionLabel,
  sciName,
}: RealBirdFactContext): Promise<string | null> {
  const response = await postOpenAi<OpenAiChatCompletionResponse>(
    '/chat/completions',
    {
      model: OPENAI_FACT_MODEL,
      max_tokens: 90,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You write concise, non-fictional bird facts using only verified metadata provided by the caller. Do not invent appearance, behavior, habitat, range, diet, or taxonomy beyond the supplied metadata. If the metadata is sparse, restate it naturally as a short field-guide sentence. Do not mention eBird, APIs, databases, observation timing, or uncertainty.',
        },
        {
          role: 'user',
          content: [
            `Write one short fact about the real bird "${birdName}".`,
            regionLabel ? `Region: ${regionLabel}.` : 'Region: unavailable.',
            sciName ? `Scientific name: ${sciName}.` : 'Scientific name: unavailable.',
            'Keep it to no more than 2 short sentences.',
          ].join(' '),
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