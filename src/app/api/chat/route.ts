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

export const maxDuration = 30

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const QLOO_API_URL = 'https://hackathon.api.qloo.com'
const QLOO_API_KEY = process.env.QLOO_API_KEY

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
  const issues: string[] = []

  const normalizedStoreType = storeType
    .toLowerCase()
    .replace(/\s+/g, '_')

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
        issues.push(`${cat} not suitable for ${storeType}`)
        viabilityScore *= 0.2
      }
    })
  }

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
          issues.push(rules.reason)
          viabilityScore *= 0.1
        }
      }
    }
  )

  return {
    viability_score: Math.max(0, Math.min(1, viabilityScore)),
    issues,
    is_viable: viabilityScore > 0.6 && issues.length === 0,
  }
}

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
    return null
  }

  const hasCompatibleCategory = gap.categories.some((cat) => {
    const lowerCat = cat.toLowerCase()
    return (
      storeRules.excellent.some((exc) => lowerCat.includes(exc)) ||
      storeRules.good.some((good) => lowerCat.includes(good))
    )
  })

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

export async function getQlooInsights(
  latitude: number,
  longitude: number
): Promise<InsightsResult[]> {
  console.log(
    `🔍 getQlooInsights called with lat: ${latitude}, lng: ${longitude}`
  )
  console.log(`🔑 Using API URL: ${QLOO_API_URL}`)
  console.log(`🔑 API Key present: ${QLOO_API_KEY ? 'Yes' : 'No'}`)

  const approaches: {
    name: string
    method: 'GET' | 'POST'
    endpoint: string
    params: InsightsRequest
  }[] = [
    {
      name: 'GET /v2/insights with place filter',
      method: 'GET',
      endpoint: '/v2/insights',
      params: {
        'filter.type': EntityType.PLACE,
        'signal.location': `POINT(${longitude} ${latitude})`,
        'filter.location.radius': 5000,
        take: 5,
      },
    },
    {
      name: 'GET /v2/insights with correct parameters (brands)',
      method: 'GET',
      endpoint: '/v2/insights',
      params: {
        'filter.type': EntityType.BRAND,
        'signal.location': `POINT(${longitude} ${latitude})`,
        'filter.location.radius': 5000,
        take: 5,
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
      break
    } catch (error: any) {
      console.error(`❌ ${approach.name} failed:`, error.message)
      if (error.response) {
        console.error(
          '📋 Error response status:',
          error.response.status
        )
        console.error('📋 Error response data:', error.response.data)
      }
    }
  }

  if (result.length === 0) {
    console.log('⚠️ All approaches failed, returning empty array')
  }

  return result
}

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

    if (tags.has(entity.name.toLowerCase())) {
      sum += entity.relevance
    }

    for (const word of entityWords) {
      if (tags.has(word)) {
        sum += entity.relevance * 0.7
      }
    }

    for (const category of entityCategories) {
      if (tags.has(category)) {
        sum += entity.relevance * 0.8
      }
    }
  }

  return Math.min(sum, 1)
}

function analyzeGaps(
  salesData: SalesData[],
  tasteEntities: TasteEntity[]
): TasteGap[] {
  const soldMap = Object.fromEntries(
    salesData.map((s) => [s.sku_id, s.qty])
  )

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

  const gaps: TasteGap[] = []

  for (const entity of tasteEntities) {
    if (entity.relevance < 0.3) continue

    const relatedSkus = enriched.filter(
      (sku) => calcAffinity(sku, [entity]) > 0.2
    )
    const soldRelated = relatedSkus.filter(
      (sku) => soldMap[sku.sku_id] > 0
    )

    if (relatedSkus.length < 3 || soldRelated.length === 0) {
      const avgMargin =
        enriched.reduce((sum, sku) => sum + (sku.margin || 1), 0) /
        Math.max(enriched.length, 1)
      const predictedWeeklyImpact = entity.relevance * avgMargin * 25

      gaps.push({
        suggested_item: `${entity.name}`,
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
          entity.relevance * (1 - soldRelated.length / 5),
        categories: entity.categories || [entity.type || 'general'],
      })
    }
  }

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

            console.log(
              '🏪 Cultural data:',
              JSON.stringify(culturalData, null, 2)
            )

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
            const tasteEntities =
              convertCategoriesToEntities(productCategories)

            console.log(
              `✨ Converted to ${tasteEntities.length} TasteEntity objects`
            )
            console.log(
              `📋 Sample entities:`,
              tasteEntities.slice(0, 2)
            )

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

          console.log(
            `✅ Validation completed: ${goodGaps.length}/${gaps.length} passed`
          )

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

      mapCulturalToProducts: tool({
        description:
          'Pass cultural data for Claude to analyze and generate ultra-specific products',
        parameters: z.object({
          culturalData: z.object({
            places: z.array(
              z.object({
                name: z.string(),
                type: z.string(),
                description: z.string().optional(),
                price_level: z.number(),
                business_rating: z.number().optional(),
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
          storeType: z.string(),
        }),
        execute: async ({culturalData, storeType}) => {
          console.log(
            `🎯 mapCulturalToProducts: ${storeType} in ${culturalData.context.neighborhood}`
          )

          const culturalSummary = culturalData.places
            .map(
              (place) =>
                `${place.name} (${place.type}): ${
                  place.description || 'Popular venue'
                }\n` +
                `Keywords: ${place.topKeywords.join(', ')}\n` +
                `Categories: ${place.categories
                  .slice(0, 5)
                  .join(', ')}\n`
            )
            .join('\n')

          console.log('🫔 culturalSummary', culturalSummary)

          return {
            culturalSummary,
            storeType,
            neighborhood: culturalData.context.neighborhood,
            averagePriceLevel: culturalData.context.averagePriceLevel,
            totalPlaces: culturalData.places.length,
            message: `Cultural analysis ready for ${storeType} in ${culturalData.context.neighborhood}. Generate 8-12 ultra-specific products based on these venues.`,
          }
        },
      }),

      findProductPricing: tool({
        description:
          'Add pricing and supplier info to top recommendations using web search',
        parameters: z.object({
          topRecommendations: z.array(
            z.object({
              productName: z.string(),
              affinityScore: z.number(),
              weeklyDemand: z
                .number()
                .describe('Estimated weekly units'),
            })
          ),
          storeLocation: z.string(),
          storeType: z.string(),
        }),
        execute: async ({
          topRecommendations,
          storeLocation,
          storeType,
        }) => {
          return {
            recommendations: topRecommendations,
            location: storeLocation,
            storeType: storeType,
            message: `Ready to research pricing for ${topRecommendations.length} products in ${storeLocation}`,
          }
        },
      }),
    },

    system: `You are TasteGap Scout. Find profitable product gaps for retailers through cultural analysis.

<workflow>
1. **analyzeLocation** - Get Qloo cultural data
2. **mapCulturalToProducts** - Pass data, YOU generate specific products from cultural insights
3. **findTasteGaps** - Check overlaps with specific products YOU generated
4. **findProductPricing** - Get pricing info, YOU create final recommendations

Tools provide data. YOU do the analysis and product generation.
</workflow>

<critical_instructions>
**STEP 2**: After mapCulturalToProducts returns cultural data, YOU must generate 8-12 ULTRA-SPECIFIC products based on the cultural venues.

**Examples for Austin nightlife/music venues:**
- "Topo Chico sparkling water (lime flavor, 12-pack)"
- "Austin City Limits branded energy drinks"
- "Franklin BBQ sauce bottles (original recipe)"
- "UT Longhorns game day snack packs"
- "Keep Austin Weird bumper stickers"
- "Breakfast tacos (frozen, microwave ready)"
- "Local live music venue drink koozies"
- "Texas heat relief salt tablets"

**STEP 3**: Pass YOUR generated specific products to findTasteGaps tool.

**STEP 4**: Create business recommendations with estimated pricing.
</critical_instructions>

<product_generation_rules>
**For Austin, Texas convenience store near nightlife/music venues:**

**Nightclub (Speakeasy) nearby:**
- "Late-night energy shots (5-hour energy)"
- "Hangover relief kits (aspirin + electrolytes)"
- "Pre-gaming snacks (spicy chips, jerky)"

**Live music venues (Shiner's Saloon, Mohawk) nearby:**
- "Earplugs for concerts (foam, individual packs)"
- "Austin live music venue merchandise"
- "Local band stickers and patches"

**Hotel (W Austin) nearby:**
- "Travel-size toiletries (premium brands)"
- "Phone chargers (multiple types)"
- "Austin tourist guidebooks"

**Texas/Austin specific:**
- "Topo Chico sparkling water" (hugely popular in Texas)
- "Whataburger spicy ketchup packets"
- "Breakfast tacos (frozen heat & serve)"
- "Keep Austin Weird merchandise"
- "UT Longhorns branded items"
- "Texas heat relief products"

Include brands, exact preparation methods, serving contexts. Be specific like a customer ordering.
</product_generation_rules>

<final_output>
Present top 5 products with:
- Product name (ultra-specific)
- Estimated wholesale/retail prices
- Monthly profit projection
- Cultural reasoning (1 line)
- Implementation difficulty

Make it actionable with real numbers.
</final_output>`,
  })

  return result.toDataStreamResponse()
}
