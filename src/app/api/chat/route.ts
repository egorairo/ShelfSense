/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {createOpenAI} from '@ai-sdk/openai'
import {createAnthropic} from '@ai-sdk/anthropic'
import {CoreMessage, streamText, tool} from 'ai'
import axios from 'axios'
import z from 'zod'
import {
  EntityType,
  InsightsRequest,
  InsightsResponse,
} from '@/app/types'

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

// TasteGap Scout Types
export interface TasteEntity {
  name: string
  relevance: number
  type?: string
  categories?: string[]
}

export interface SalesData {
  sku_id: string
  tags: string[]
  qty: number
  margin?: number
}

export interface TasteGap {
  suggested_item: string
  matching_rationale: string
  predicted_margin_impact: string
  affinity_score: number
  taste_gap_score: number
  categories: string[]
}

// Get cultural insights for location using Qloo API
export async function getQlooInsights(
  latitude: number,
  longitude: number
): Promise<TasteEntity[]> {
  console.log(
    `🔍 getQlooInsights called with lat: ${latitude}, lng: ${longitude}`
  )
  console.log(`🔑 Using API URL: ${QLOO_API_URL}`)
  console.log(`🔑 API Key present: ${QLOO_API_KEY ? 'Yes' : 'No'}`)

  // Try multiple API approaches based on official documentation
  const approaches: {
    name: string
    method: 'GET' | 'POST'
    endpoint: string
    params: InsightsRequest
  }[] = [
    {
      name: 'GET /v2/insights with correct parameters (brands)',
      method: 'GET',
      endpoint: '/v2/insights',
      params: {
        'filter.type': EntityType.BRAND,
        'signal.location': `POINT(${longitude} ${latitude})`,
        'filter.location.radius': 5000,
        take: 1,
      },
    },
    {
      name: 'GET /v2/insights with place filter',
      method: 'GET',
      endpoint: '/v2/insights',
      params: {
        'filter.type': EntityType.PLACE,
        'signal.location': `POINT(${longitude} ${latitude})`,
        'filter.location.radius': 5000,
        take: 1,
      },
    },
  ]

  const result = []

  for (const approach of approaches) {
    try {
      console.log(`📡 Trying: ${approach.name}...`)

      let response: {data: InsightsResponse}
      const headers = {
        'X-Api-Key': QLOO_API_KEY,
        'Content-Type': 'application/json',
      }

      if (approach.method === 'POST') {
        response = await axios.post<InsightsResponse>(
          `${QLOO_API_URL}${approach.endpoint}`,
          approach.params,
          {headers}
        )
      } else {
        console.log(
          '📤 Request params:',
          JSON.stringify(approach.params, null, 2)
        )
        response = await axios.get<InsightsResponse>(
          `${QLOO_API_URL}${approach.endpoint}`,
          {
            params: approach.params,
            headers,
          }
        )
      }

      console.log(`✅ ${approach.name} successful!`)

      const data = response.data.results.entities
      console.log(data)
      console.log('📋 Raw response data:')
      console.log(data?.map((e) => e.name))

      // Transform insights response to TasteEntity format
      const rawEntities = data || []

      console.log(`🔢 Found ${rawEntities.length} raw entities`)

      if (rawEntities.length === 0) {
        console.log('⚠️ No entities found, trying next approach...')
        continue
      }

      const entities = rawEntities.map((entity) => ({
        name: entity.name || 'Unknown',
        relevance: entity.query?.affinity || 0.5,
        type: entity.subtype || 'Unknown',
        categories: entity.tags || [],
      }))

      console.log(
        `✨ Transformed to ${entities.length} TasteEntity objects:`
      )
      console.log(JSON.stringify(entities.slice(0, 3), null, 2)) // Log first 3

      result.push(...entities)
    } catch (error: any) {
      console.error(`❌ ${approach.name} failed:`, error.message)
      if (error.response) {
        console.error(
          '📋 Error response status:',
          error.response.status
        )
        console.error('📋 Error response data:', error.response.data)
      }

      throw error
    }
  }

  return result
}

// Core gap analysis algorithm
function tagify(arr: string[]): Set<string> {
  return new Set(arr.map((t) => t.toLowerCase().trim()))
}

function calcAffinity(
  sku: SalesData,
  tasteEntities: TasteEntity[]
): number {
  const tags = tagify(sku.tags)
  let sum = 0

  for (const entity of tasteEntities) {
    const entityWords = entity.name.toLowerCase().split(/\s+/)
    const entityCategories =
      entity.categories?.map((c) => c.toLowerCase()) || []

    // Check for direct tag matches
    if (tags.has(entity.name.toLowerCase())) {
      sum += entity.relevance
    }

    // Check for word-level matches
    for (const word of entityWords) {
      if (tags.has(word)) {
        sum += entity.relevance * 0.7 // Partial match weight
      }
    }

    // Check for category matches
    for (const category of entityCategories) {
      if (tags.has(category)) {
        sum += entity.relevance * 0.8 // Category match weight
      }
    }
  }

  return Math.min(sum, 1) // Cap at 1.0
}

function analyzeGaps(
  salesData: SalesData[],
  tasteEntities: TasteEntity[]
): TasteGap[] {
  // Create sold SKU map
  const soldMap = Object.fromEntries(
    salesData.map((s) => [s.sku_id, s.qty])
  )

  // Enrich SKUs with affinity scores
  const enriched = salesData.map((sku) => {
    const affinity = calcAffinity(sku, tasteEntities)
    const score = affinity * (sku.margin || 1.0)
    return {
      ...sku,
      affinity,
      score,
      taste_gap_score:
        soldMap[sku.sku_id] && soldMap[sku.sku_id] > 0 ? 0 : score,
    }
  })

  // Find gaps: high-affinity entities not well represented in current inventory
  const gaps: TasteGap[] = []

  for (const entity of tasteEntities) {
    if (entity.relevance < 0.3) continue // Skip low-relevance entities

    // Check if this entity type is underrepresented
    const relatedSkus = enriched.filter(
      (sku) => calcAffinity(sku, [entity]) > 0.2
    )
    const soldRelated = relatedSkus.filter(
      (sku) => soldMap[sku.sku_id] > 0
    )

    // If we have few or no products in this taste category
    if (relatedSkus.length < 3 || soldRelated.length === 0) {
      const avgMargin =
        enriched.reduce((sum, sku) => sum + (sku.margin || 1), 0) /
        enriched.length
      const predictedWeeklyImpact = entity.relevance * avgMargin * 25 // Rough estimate

      gaps.push({
        suggested_item: `${entity.name} products`,
        matching_rationale: `Local customers show ${(
          entity.relevance * 100
        ).toFixed(0)}% affinity for ${
          entity.name
        }. You currently have ${
          soldRelated.length
        } related products.`,
        predicted_margin_impact: `+$${predictedWeeklyImpact.toFixed(
          0
        )}/week`,
        affinity_score: entity.relevance,
        taste_gap_score:
          entity.relevance * (1 - soldRelated.length / 5), // Penalty for existing coverage
        categories: entity.categories || [entity.type || 'general'],
      })
    }
  }

  // Sort by taste gap score and return top 20
  return gaps
    .sort((a, b) => b.taste_gap_score - a.taste_gap_score)
    .slice(0, 20)
}

export async function POST(req: Request) {
  console.log('🚀 Chat API POST request received')

  const {messages} = await req.json()
  console.log(`📝 Processing ${messages.length} messages`)
  console.log(
    '📋 Latest message:',
    JSON.stringify(messages[messages.length - 1], null, 2)
  )

  console.log('🤖 Starting streamText with Claude...')
  const result = streamText({
    model: anthropic('claude-4-sonnet-20250514'),
    messages,
    maxSteps: 10,
    experimental_continueSteps: true,
    maxRetries: 0,
    tools: {
      analyzeLocation: tool({
        description:
          'Analyze local cultural tastes and preferences for a store location using Qloo insights',
        parameters: z.object({
          latitude: z.number().describe('Store latitude coordinate'),
          longitude: z
            .number()
            .describe('Store longitude coordinate'),
        }),
        execute: async ({latitude, longitude}) => {
          console.log(
            `🎯 analyzeLocation tool called with lat: ${latitude}, lng: ${longitude}`
          )

          try {
            console.log('📡 Calling getQlooInsights...')
            const insights = await getQlooInsights(
              latitude,
              longitude
            )
            console.log(
              `✅ getQlooInsights returned ${insights.length} insights`
            )

            const result = {
              insights,
              message: `Found ${insights.length} cultural taste insights for location ${latitude}, ${longitude}`,
            }

            console.log(
              '🎉 analyzeLocation tool completed successfully'
            )
            return result
          } catch (error: any) {
            console.error('❌ analyzeLocation tool failed:', error)
            return {
              error: 'Failed to fetch location insights',
              message:
                'Error analyzing location tastes. Please check coordinates and try again.',
            }
          }
        },
      }),

      findTasteGaps: tool({
        description:
          'Analyze taste gaps between local preferences and current inventory',
        parameters: z.object({
          salesData: z
            .array(
              z.object({
                sku_id: z.string(),
                tags: z.array(z.string()),
                qty: z.number(),
                margin: z.number().optional(),
              })
            )
            .describe('Array of sales data with SKU info'),
          tasteEntities: z
            .array(
              z.object({
                name: z.string(),
                relevance: z.number(),
                type: z.string().optional(),
                categories: z.array(z.string()).optional(),
              })
            )
            .describe(
              'Cultural taste entities from location analysis'
            ),
        }),
        execute: async ({salesData, tasteEntities}) => {
          console.log(`🔍 findTasteGaps tool called`)
          console.log(`📊 Sales data: ${salesData.length} items`)
          console.log(
            `🎭 Taste entities: ${tasteEntities.length} entities`
          )
          console.log(
            '📋 Sample sales data:',
            JSON.stringify(salesData.slice(0, 2), null, 2)
          )
          console.log(
            '📋 Sample taste entities:',
            JSON.stringify(tasteEntities.slice(0, 2), null, 2)
          )

          try {
            console.log('🧮 Running gap analysis...')
            const gaps = analyzeGaps(salesData, tasteEntities)
            console.log(
              `✅ Gap analysis completed: ${gaps.length} gaps found`
            )
            console.log(
              '📋 Sample gaps:',
              JSON.stringify(gaps.slice(0, 2), null, 2)
            )

            const result = {
              gaps,
              message: `Found ${gaps.length} potential product gaps to explore`,
            }

            console.log(
              '🎉 findTasteGaps tool completed successfully'
            )
            return result
          } catch (error: any) {
            console.error('❌ findTasteGaps tool failed:', error)
            return {
              error: 'Failed to analyze gaps',
              message:
                'Error analyzing taste gaps. Please check your data format.',
            }
          }
        },
      }),
    },
    system: `You are TasteGap Scout, an AI assistant that helps small retailers discover products their local customers want but they don't currently sell.

Your process:
1. When users provide store location (lat/long or address), use analyzeLocation to get local taste insights
2. When users provide sales data + location insights, use findTasteGaps to identify product opportunities
3. Present findings clearly with actionable recommendations

Key guidelines:
- Focus on practical, actionable product suggestions
- Explain the data-driven rationale behind each recommendation
- Highlight potential revenue impact
- Suggest specific product categories or brands when possible
- Be encouraging about growth opportunities while being realistic
- When you find gaps, suggest specific items like "matcha soda and Japanese cookies" rather than just categories

Sample interaction flow:
1. User uploads CSV with columns: sku_id, tags, qty, margin
2. User provides store location
3. You analyze local tastes and find gaps
4. You present top missing products with rationale

Demo scenario: Brooklyn coffee shop should add matcha products, Japanese pastries, Korean snacks, bubble tea, plant-based options, and artisanal items based on local cultural preferences.

If users haven't provided required data (sales CSV + location), guide them to upload it first. There are demo buttons available for Brooklyn coffee shop data.

When analyzing gaps, always call analyzeLocation first with lat/long, then call findTasteGaps with the results. Always use specific product suggestions and revenue projections.

Always be helpful, data-driven, and focused on business growth opportunities.`,
  })

  return result.toDataStreamResponse()
}
