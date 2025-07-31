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
  InsightsResult,
} from '@/app/types'
import {extractCulturalSignals} from '@/utils/extractCulturalSignals'
import {convertCategoriesToEntities} from '@/utils/convertCategoriesToEntities'

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

// Add validation result interface for better typing
export interface ValidationResult {
  validation_score: number
  issues: string[]
  is_good: boolean
}

export interface ValidatedGap extends TasteGap {
  validation_score: number
  issues: string[]
  is_good: boolean
}

// Business logic rules with proper typing
interface StoreRules {
  excellent: string[]
  good: string[]
  avoid: string[]
}

interface LocationRule {
  avoid: string[]
  reason: string
  prioritize?: string[]
}

interface DemographicRule {
  prioritize: string[]
  avoid?: string[]
  price_tolerance?: string
  price_sensitivity?: string
  margin_opportunity?: string
  volume_over_margin?: boolean
}

interface ComplexityRule {
  characteristics: string[]
  score_boost?: number
  score_neutral?: number
  score_penalty?: number
}

const BUSINESS_RULES = {
  // Store type compatibility matrix
  storeCompatibility: {
    coffee_shop: {
      excellent: [
        'beverages',
        'pastry',
        'asian_beverages',
        'wellness_drinks',
        'premium_snacks',
      ],
      good: ['healthy_snacks', 'artisan_products', 'plant_based'],
      avoid: [
        'alcohol',
        'perishables_without_refrigeration',
        'large_items',
      ],
    } as StoreRules,
    convenience_store: {
      excellent: [
        'quick_snacks',
        'beverages',
        'essentials',
        'impulse_items',
      ],
      good: ['frozen_foods', 'personal_care', 'small_electronics'],
      avoid: ['luxury_items', 'specialty_equipment', 'perishables'],
    } as StoreRules,
    bookstore: {
      excellent: [
        'beverages',
        'artisan_gifts',
        'stationery',
        'premium_snacks',
      ],
      good: [
        'wellness_products',
        'small_electronics',
        'seasonal_items',
      ],
      avoid: ['perishables', 'alcohol', 'loud_products'],
    } as StoreRules,
  } as Record<string, StoreRules>,

  // Competition and location rules
  locationConflicts: {
    near_museum: {
      avoid: ['souvenirs', 'tourist_items', 'postcards', 'magnets'],
      reason: 'Direct competition with museum gift shop',
    } as LocationRule,
    near_gym: {
      avoid: ['unhealthy_snacks', 'sugary_drinks'],
      prioritize: [
        'protein_products',
        'wellness_drinks',
        'healthy_snacks',
      ],
      reason: 'Health-conscious demographic near gym',
    } as LocationRule,
    near_school: {
      avoid: ['alcohol', 'adult_items'],
      prioritize: [
        'healthy_snacks',
        'educational_items',
        'affordable_items',
      ],
      reason: 'Family-friendly area near school',
    } as LocationRule,
  } as Record<string, LocationRule>,

  // Demographic targeting
  demographics: {
    high_income_area: {
      prioritize: ['premium', 'organic', 'artisan', 'specialty'],
      price_tolerance: 'high',
      margin_opportunity: 'excellent',
    } as DemographicRule,
    family_area: {
      prioritize: ['family_friendly', 'bulk_items', 'practical'],
      avoid: ['adult_only', 'luxury_non_essential'],
      price_sensitivity: 'medium',
    } as DemographicRule,
    student_area: {
      prioritize: [
        'affordable',
        'convenient',
        'energy_drinks',
        'study_snacks',
      ],
      price_sensitivity: 'high',
      volume_over_margin: true,
    } as DemographicRule,
  } as Record<string, DemographicRule>,

  // Implementation complexity scoring
  complexity: {
    easy: {
      characteristics: [
        'shelf_stable',
        'no_special_storage',
        'established_suppliers',
      ],
      score_boost: 0.2,
    } as ComplexityRule,
    medium: {
      characteristics: [
        'requires_refrigeration',
        'seasonal',
        'moderate_investment',
      ],
      score_neutral: 0,
    } as ComplexityRule,
    hard: {
      characteristics: [
        'requires_licensing',
        'high_investment',
        'complex_logistics',
      ],
      score_penalty: -0.3,
    } as ComplexityRule,
  } as Record<string, ComplexityRule>,
}

// Enhanced compatibility checking function with proper typing
function assessBusinessViability(
  gap: TasteGap,
  storeType: string,
  locationContext: string,
  demographics?: string
): {
  viability_score: number
  issues: string[]
  is_viable: boolean
} {
  let viabilityScore = gap.affinity_score
  const issues: string[] = [] // ← Теперь НУЖЕН для сбора проблем

  // Normalize store type to match our rules
  const normalizedStoreType = storeType
    .toLowerCase()
    .replace(/\s+/g, '_')

  // Check store type compatibility
  const storeRules =
    BUSINESS_RULES.storeCompatibility[normalizedStoreType]
  if (storeRules) {
    gap.categories.forEach((cat) => {
      const lowerCat = cat.toLowerCase()

      if (
        storeRules.excellent.some((exc) => lowerCat.includes(exc))
      ) {
        viabilityScore *= 1.3
      } else if (
        storeRules.good.some((good) => lowerCat.includes(good))
      ) {
        viabilityScore *= 1.1
      } else if (
        storeRules.avoid.some((avoid) => lowerCat.includes(avoid))
      ) {
        issues.push(`${cat} not suitable for ${storeType}`) // ← ИСПОЛЬЗУЕМ issues
        viabilityScore *= 0.2
      }
    })
  }

  // Check location conflicts
  Object.entries(BUSINESS_RULES.locationConflicts).forEach(
    ([location, rules]) => {
      const locationKey = location.replace('near_', '')
      if (locationContext.toLowerCase().includes(locationKey)) {
        const hasConflict = gap.categories.some((cat) =>
          rules.avoid.some((avoid) =>
            cat.toLowerCase().includes(avoid)
          )
        )

        if (hasConflict) {
          issues.push(rules.reason) // ← ИСПОЛЬЗУЕМ issues
          viabilityScore *= 0.1
        }
      }
    }
  )

  return {
    viability_score: Math.max(0, Math.min(1, viabilityScore)),
    issues, // ← Возвращаем ЗАПОЛНЕННЫЙ массив проблем
    is_viable: viabilityScore > 0.6 && issues.length === 0,
  }
}

// Fixed checkStoreCompatibility function with proper typing
function checkStoreCompatibility(
  gap: TasteGap,
  storeType: string
): string | null {
  const normalizedStoreType = storeType
    .toLowerCase()
    .replace(/\s+/g, '_')
  const storeRules =
    BUSINESS_RULES.storeCompatibility[normalizedStoreType]

  if (!storeRules) {
    return null // No rules for this store type, allow it
  }

  // Check if any category matches allowed categories
  const hasCompatibleCategory = gap.categories.some((cat) => {
    const lowerCat = cat.toLowerCase()
    return (
      storeRules.excellent.some((exc) => lowerCat.includes(exc)) ||
      storeRules.good.some((good) => lowerCat.includes(good))
    )
  })

  // Check if any category is explicitly avoided
  const hasAvoidedCategory = gap.categories.some((cat) => {
    const lowerCat = cat.toLowerCase()
    return storeRules.avoid.some((avoid) => lowerCat.includes(avoid))
  })

  if (hasAvoidedCategory) {
    return `Product "${gap.suggested_item}" contains avoided categories for ${storeType}`
  }

  if (!hasCompatibleCategory) {
    return `Product "${gap.suggested_item}" doesn't match ${storeType} categories`
  }

  return null
}

// Get cultural insights for location using Qloo API
export async function getQlooInsights(
  latitude: number,
  longitude: number
): Promise<InsightsResult[]> {
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

  const result: InsightsResult[] = []

  for (const approach of approaches) {
    try {
      console.log(`📡 Trying: ${approach.name}...`)

      let response: {data: InsightsResponse}
      const headers = {
        'X-Api-Key': QLOO_API_KEY || '',
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

      const data = response.data.results?.entities

      result.push(...data)
      break // Exit loop on first success

      // TODO: remove this (нам нужны сырые данные)
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

      const entities: TasteEntity[] = rawEntities.map((entity) => ({
        name: entity.name || 'Unknown',
        relevance: entity.query?.affinity || 0.5,
        type: entity.subtype || 'Unknown',
        categories:
          entity.tags?.map((tag: any) => tag.name || tag.id) || [],
      }))

      console.log(
        `✨ Transformed to ${entities.length} TasteEntity objects:`
      )
      console.log(JSON.stringify(entities.slice(0, 3), null, 2)) // Log first 3

      // result.push(...entities)
      break // Exit loop on first success
    } catch (error: any) {
      console.error(`❌ ${approach.name} failed:`, error.message)
      if (error.response) {
        console.error(
          '📋 Error response status:',
          error.response.status
        )
        console.error('📋 Error response data:', error.response.data)
      }
      // Continue to next approach instead of throwing
    }
  }

  if (result.length === 0) {
    console.log('⚠️ All approaches failed, returning empty array')
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
  // Create sold SKU map for O(1) lookup
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
        Math.max(enriched.length, 1) // Prevent division by zero
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
            const rawInsights = await getQlooInsights(
              latitude,
              longitude
            )

            console.log(
              `✅ getQlooInsights returned ${rawInsights.length} insights`
            )

            const culturalData = extractCulturalSignals(rawInsights)

            const result = {
              culturalData,
              message: `Found ${culturalData.places.length} cultural taste insights for location ${latitude}, ${longitude}`,
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
          'Analyze taste gaps between recommended product categories and current inventory',
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
          productCategories: z
            .array(z.string())
            .describe(
              'Specific product categories recommended by cultural analysis'
            ),
        }),
        execute: async ({salesData, productCategories}) => {
          console.log(`🔍 findTasteGaps tool called`)
          console.log(`📊 Sales data: ${salesData.length} items`)
          console.log(
            `🎯 Product categories: ${productCategories.length}`
          )
          console.log(
            `📋 Categories: ${productCategories.join(', ')}`
          )

          try {
            // Конвертируем productCategories в TasteEntity format
            const tasteEntities =
              convertCategoriesToEntities(productCategories)

            console.log(
              `✨ Converted to ${tasteEntities.length} TasteEntity objects`
            )
            console.log(
              `📋 Sample entities:`,
              tasteEntities.slice(0, 2)
            )

            // Используем ВСЮ СТАРУЮ ЛОГИКУ analyzeGaps()
            console.log(
              '🧮 Running analyzeGaps with converted entities...'
            )
            const gaps = analyzeGaps(salesData, tasteEntities)

            console.log(
              `✅ Gap analysis completed: ${gaps.length} gaps found`
            )
            console.log(`📋 Sample gaps:`, gaps.slice(0, 2))

            const result = {
              gaps,
              message: `Found ${gaps.length} potential product gaps based on cultural analysis`,
              analysis: {
                categoriesAnalyzed: productCategories.length,
                entitiesGenerated: tasteEntities.length,
                gapsIdentified: gaps.length,
              },
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
              gaps: [],
            }
          }
        },
      }),

      validateRecommendations: tool({
        description:
          'Validate if recommendations make business sense for the store type and location',
        parameters: z.object({
          gaps: z.array(
            z.object({
              suggested_item: z.string(),
              categories: z.array(z.string()),
              affinity_score: z.number(),
              matching_rationale: z.string(),
              taste_gap_score: z.number(),
              predicted_margin_impact: z.string(),
            })
          ),
          storeType: z
            .string()
            .describe(
              'Type of store: coffee shop, convenience store, bookstore, etc'
            ),
          locationContext: z
            .string()
            .describe(
              'What is near the store location (museum, gym, school, etc)'
            ),
        }),
        execute: async ({gaps, storeType, locationContext}) => {
          console.log(
            `🔍 Validating ${gaps.length} recommendations for ${storeType} near ${locationContext}`
          )

          // Просто используем assessBusinessViability для каждого gap
          const validated: ValidatedGap[] = gaps.map((gap) => {
            const viability = assessBusinessViability(
              gap as TasteGap,
              storeType,
              locationContext
            )

            return {
              ...gap,
              validation_score: viability.viability_score,
              issues: viability.issues,
              is_good: viability.is_viable,
            } as ValidatedGap
          })

          const goodGaps = validated.filter((v) => v.is_good)

          return {
            validated_recommendations: validated,
            good_count: goodGaps.length,
            total_count: gaps.length,
            needs_improvement: goodGaps.length < 3,
            summary: `${goodGaps.length} out of ${gaps.length} recommendations passed validation`,
            validation_details: validated.map((v) => ({
              item: v.suggested_item,
              score: v.validation_score,
              issues: v.issues,
            })),
          }
        },
      }),

      refineRecommendations: tool({
        description:
          'Improve recommendations based on validation issues and business logic',
        parameters: z.object({
          originalGaps: z.array(
            z.object({
              suggested_item: z.string(),
              categories: z.array(z.string()),
              affinity_score: z.number(),
              matching_rationale: z.string(),
              taste_gap_score: z.number(),
              predicted_margin_impact: z.string(),
            })
          ),
          validationIssues: z.array(z.string()),
          storeType: z.string(),
          locationContext: z.string(),
          improvementCriteria: z
            .string()
            .describe(
              'How to improve the recommendations based on validation feedback'
            ),
        }),
        execute: async ({
          originalGaps,
          validationIssues,
          storeType,
          locationContext,
          improvementCriteria,
        }) => {
          console.log(
            `🔧 Refining recommendations based on: ${improvementCriteria}`
          )

          // Filter out problematic recommendations based on validation issues
          const filteredGaps = originalGaps.filter((gap) => {
            // Re-assess each gap with enhanced business logic
            const viability = assessBusinessViability(
              gap as TasteGap,
              storeType,
              locationContext
            )

            return viability.is_viable
          })

          // Re-rank remaining gaps by business viability and affinity
          const rerankedGaps = filteredGaps
            .sort((a, b) => {
              // Sort by affinity score primarily, then by taste gap score
              if (
                Math.abs(a.affinity_score - b.affinity_score) > 0.1
              ) {
                return b.affinity_score - a.affinity_score
              }
              return b.taste_gap_score - a.taste_gap_score
            })
            .slice(0, 8) // Take top 8 after filtering and ranking

          return {
            refined_gaps: rerankedGaps,
            removed_count: originalGaps.length - rerankedGaps.length,
            refinement_applied: improvementCriteria,
            summary: `Filtered out ${
              originalGaps.length - rerankedGaps.length
            } problematic recommendations, kept ${
              rerankedGaps.length
            } viable options`,
            improvement_notes: `Applied business logic for ${storeType} in ${locationContext} context`,
          }
        },
      }),

      mapCulturalToProducts: tool({
        description:
          'Convert cultural insights from local area into specific product recommendations for the store',
        parameters: z.object({
          culturalData: z.object({
            places: z.array(
              z.object({
                name: z.string(),
                type: z.string(),
                description: z.string().optional(),
                price_level: z.number(),
                business_rating: z.number().optional(),
                popularity: z.number().optional(),
                topKeywords: z.array(z.string()),
                specialties: z.array(z.string()),
                categories: z.array(z.string()),
                neighborhood: z.string().optional(),
              })
            ),
            context: z.object({
              neighborhood: z.string(),
              averagePriceLevel: z.number(),
              totalPlaces: z.number(),
              placeTypes: z.array(z.string()),
            }),
          }),
          storeType: z
            .string()
            .describe(
              'Type of store: coffee shop, convenience store, etc'
            ),
        }),
        execute: async ({culturalData, storeType}) => {
          console.log(
            `🎯 mapCulturalToProducts called for ${storeType} in ${culturalData.context.neighborhood}`
          )
          console.log(
            `📊 Analyzing ${culturalData.places.length} places, avg price: ${culturalData.context.averagePriceLevel}`
          )

          return {
            culturalData,
            storeType,
            summary: `Cultural analysis ready for ${storeType} in ${culturalData.context.neighborhood}`,
            placesAnalyzed: culturalData.places.length,
            readyForMapping: true,
          }
        },
      }),
    },
    system: `You are TasteGap Scout, an autonomous AI agent that helps retailers discover profitable product gaps through multi-step analysis.

    MANDATORY WORKFLOW - Execute steps sequentially:
    1. analyzeLocation - Get cultural taste insights for store location
    2. mapCulturalToProducts - Convert cultural insights into specific product categories
    3. findTasteGaps - Identify gaps using product categories from cultural mapping
    4. validateRecommendations - ALWAYS validate business logic of recommendations
    5. If validation shows issues (good_count < 3) - use refineRecommendations with improvement criteria
    6. Repeat steps 4-5 until recommendations pass validation OR max 3 iterations
    7. Only then provide final recommendations to user

    CULTURAL TO PRODUCT MAPPING:
    When using mapCulturalToProducts, follow this analysis process:

    Step 1: Analyze cultural signals
    - Review popular places' specialties and keywords
    - Identify dominant culinary cultures and price levels
    - Note neighborhood characteristics (tourist, business, residential)

    Step 2: Apply store compatibility filter
    - Coffee shop: beverages, pastries, grab-and-go items, complementary snacks
    - Convenience store: quick essentials, impulse buys, everyday needs
    - Bookstore: quiet snacks, beverages, gift items

    Step 3: Generate specific product categories
    - Transform cultural insights into actionable products
    - Consider price point appropriateness for the area
    - Ensure products complement the store's primary business
    - Be specific: "Matcha lattes and Japanese pastries" not "Asian products"

    Think through your reasoning: "I see [cultural signal] which suggests [customer preference], so for a [store type] I recommend [specific products] because [business logic]."

    VALIDATION CRITERIA - Recommendations must pass:
    - Store type compatibility (no alcohol in coffee shops)
    - No direct competition nearby (no souvenirs near museums)
    - Realistic profit margins and demand
    - Reasonable implementation complexity
    - Appropriate for local demographics

    DECISION MAKING - You are autonomous:
    - Analyze your own outputs critically
    - Identify business logic problems independently
    - Iterate until recommendations make commercial sense
    - Explain your reasoning process to user
    - Never give recommendations without successful validation

    EXAMPLE GOOD REASONING:
    "Found gap in Japanese products. Validating: this is coffee shop, matcha fits well. No Asian stores nearby. Good margins. Validation passed - presenting recommendations."

    EXAMPLE BAD REASONING:
    "Near museum, suggesting souvenirs. Validation failed - direct competition! Refining recommendations to focus on beverages and snacks instead of souvenirs."

    Be thorough, business-focused, and always validate before final output.`,
  })

  return result.toDataStreamResponse()
}
