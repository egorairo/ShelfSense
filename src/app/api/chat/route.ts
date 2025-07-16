/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {createOpenAI} from '@ai-sdk/openai'
import {createAnthropic} from '@ai-sdk/anthropic'
import {CoreMessage, streamText, tool} from 'ai'
import axios from 'axios'
import z from 'zod'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Qloo API Configuration
const QLOO_API_URL = 'https://hackathon.api.qloo.com'
const QLOO_API_KEY = process.env.QLOO_API_KEY

// Qloo API Types
export interface QlooSearchResult {
  id: string
  name: string
  type: string
  score?: number
}

export interface QlooRecommendation {
  id: string
  name: string
  type: string
  affinity_score: number
  description?: string
  location?: {
    city: string
    country: string
    address?: string
  }
  booking_url?: string
  image_url?: string
  categories?: string[]
}

// Search preferences to get entity IDs
export async function searchQloo(
  query: string,
  type?: string
): Promise<QlooSearchResult[]> {
  try {
    const params = new URLSearchParams({
      query: query,
      ...(type && {type}),
      'filter.radius': '10',
      'operator.filter.tags': 'union',
      page: '1',
      sort_by: 'match',
    })

    const response = await axios.get(
      `${QLOO_API_URL}/search?${params}`,
      {
        headers: {
          'X-Api-Key': QLOO_API_KEY,
        },
      }
    )

    const data = response.data
    console.log('--searchQloo--')
    console.log(data)
    return data.results || []
  } catch (error) {
    console.error('Qloo search error:', error)
    throw error
  }
}

// Get recommendations based on entity IDs
export async function getQlooRecommendations(
  entityIds: string[],
  location?: string,
  type?: string
): Promise<QlooRecommendation[]> {
  try {
    const params = new URLSearchParams()
    entityIds.forEach((id) => params.append('sample[]', id))
    if (type) params.append('category', type) // legacy param
    if (location) params.append('location', location)
    params.append('limit', '20')

    const response = await axios.get(
      `${QLOO_API_URL}/recommendations?${params}`,
      {
        headers: {
          'X-Api-Key': QLOO_API_KEY,
        },
      }
    )

    const data = response.data
    console.log('--getQlooRecommendations--')
    console.log(data)
    return data.recommendations || []
  } catch (error) {
    console.error('Qloo recommendations error:', error)
    throw error
  }
}

// Helper function to filter out incomplete tool invocations
function filterCompletedMessages(messages: CoreMessage[]) {
  return messages
    .map((message) => {
      if ('toolInvocations' in message) {
        return {
          ...message,
          toolInvocations: undefined,
          parts: undefined,
        }
      }
      return message
    })
    .filter((message) => {
      // Remove empty assistant messages that have no content and no tool invocations
      if (
        message.role === 'assistant' &&
        !message.content &&
        'toolInvocations' in message &&
        !message.toolInvocations
      ) {
        return false
      }
      return true
    })
}

export async function POST(req: Request) {
  const {messages} = await req.json()

  // Filter messages to only include completed tool invocations
  const filteredMessages = filterCompletedMessages(messages)

  console.log(
    'Filtered messages:',
    JSON.stringify(filteredMessages, null, 2)
  )

  const result = streamText({
    model: anthropic('claude-4-sonnet-20250514'),
    messages: filteredMessages, // Use filtered messages
    maxSteps: 10,
    experimental_continueSteps: true,
    tools: {
      searchQloo: tool({
        description:
          'Search Qloo API to find entity IDs for user preferences',
        parameters: z.object({
          query: z
            .string()
            .describe(
              'Search query for preferences (e.g., "Radiohead", "Korean BBQ")'
            ),
          type: z
            .enum([
              'urn:entity:actor',
              'urn:entity:album',
              'urn:entity:artist',
              'urn:entity:author',
              'urn:entity:book',
              'urn:entity:brand',
              'urn:entity:destination',
              'urn:entity:director',
              'urn:entity:locality',
              'urn:entity:movie',
              'urn:entity:person',
              'urn:entity:place',
              'urn:entity:podcast',
              'urn:entity:tv_show',
              'urn:entity:videogame',
              'urn:demographics',
              'urn:tag',
            ])
            .optional()
            .describe(
              `Entity type to search for:
                "urn:entity:actor",
                "urn:entity:album",
                "urn:entity:artist",
                "urn:entity:author",
                "urn:entity:book",
                "urn:entity:brand",
                "urn:entity:destination",
                "urn:entity:director",
                "urn:entity:locality",
                "urn:entity:movie",
                "urn:entity:person",
                "urn:entity:place",
                "urn:entity:podcast",
                "urn:entity:tv_show",
                "urn:entity:videogame",
                "urn:demographics",
                "urn:tag"
            `
            ),
        }),
        execute: async ({
          query,
          type,
        }: {
          query: string
          type?: string
        }) => {
          const response = await searchQloo(query, type)
          console.log('--searchQloo response--')
          console.log(response)
          return {
            results: response,
            message: `Found ${
              response.length
            } matches for "${query}"${
              type ? ` (type: ${type})` : ''
            }`,
          }
        },
      }),
      getRecommendations: tool({
        description:
          'Get personalized recommendations from Qloo API based on entity IDs',
        parameters: z.object({
          entityIds: z
            .array(z.string())
            .describe('Array of entity IDs from search results'),
          location: z
            .string()
            .optional()
            .describe(
              'Location for recommendations (e.g., "Berlin, Germany")'
            ),
          type: z
            .string()
            .optional()
            .describe(
              'Type of recommendations (e.g., "restaurant", "event", "venue")'
            ),
        }),
        execute: async ({
          entityIds,
          location,
          type,
        }: {
          entityIds: string[]
          location?: string
          type?: string
        }) => {
          const response = await getQlooRecommendations(
            entityIds,
            location,
            type
          )
          console.log('--getRecommendations response--')
          console.log(response)
          return {
            recommendations: response,
            message: `Found ${response.length} recommendations${
              location ? ` in ${location}` : ''
            }`,
          }
        },
      }),
    },
    system: `You are TasteGraph Concierge, a travel assistant powered by Qloo Taste AI™.

Your role is to create personalized travel itineraries based on user preferences and location.

When a user mentions:
- Location and time (e.g., "Berlin Friday night")
- Preferences (e.g., "I love Radiohead and Korean BBQ")

Follow this process:
1. Use searchQloo to find entity IDs for their preferences (music artists, food types, etc.)
2. Use getRecommendations to get personalized suggestions for their location
3. Create a narrative itinerary explaining WHY each recommendation fits their taste profile

Key guidelines:
- Always explain the connection between their preferences and recommendations
- Include affinity scores to show recommendation strength
- Focus on experiences that align with their stated tastes
- Be conversational and enthusiastic about the recommendations
- Prioritize venues, restaurants, events, and experiences over generic suggestions
- If booking links are available, mention them naturally

Example response structure:
"Based on your love for Radiohead and Korean BBQ, here's your personalized Berlin itinerary:

🎵 **Music Venue**: [Venue Name] - This indie venue has hosted similar alternative rock acts and has that intimate, underground vibe that Radiohead fans love. (Affinity: 0.85)

🍖 **Korean BBQ**: [Restaurant Name] - Authentic Korean BBQ with a modern twist, perfect for your taste preferences. (Affinity: 0.92)

The connections run deeper than surface level - your appreciation for Radiohead's experimental sound suggests you'd enjoy..."`,
  })

  return result.toDataStreamResponse()
}
