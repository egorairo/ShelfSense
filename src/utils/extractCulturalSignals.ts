import {InsightsResult} from '@/app/types'

interface CulturalSignals {
  places: {
    name: string
    type: string
    description?: string
    price_level: number
    business_rating?: number
    popularity?: number
    topKeywords: string[]
    specialties: string[]
    categories: string[]
    neighborhood?: string
  }[]
  context: {
    neighborhood: string
    averagePriceLevel: number
    totalPlaces: number
    placeTypes: string[]
  }
}

export function extractCulturalSignals(
  data: InsightsResult[]
): CulturalSignals {
  // Фильтр релевантных мест
  const relevantPlaces = data.filter((entity) => {
    const isRelevant = entity.tags?.some((tag) => {
      const types = [
        'restaurant',
        'cafe',
        'deli',
        'bakery',
        'bar',
        'coffee',
        'ice_cream_shop',
        'sandwich_shop',
        'museum',
        'tourist_attraction',
      ]
      return types.some(
        (type) =>
          tag.type?.toLowerCase().includes(type) ||
          tag.name?.toLowerCase().includes(type)
      )
    })

    const hasGoodRating =
      !entity.properties?.business_rating ||
      entity.properties.business_rating > 3.8
    return isRelevant && hasGoodRating
  })

  // Функция для получения соседства
  function getMostCommonNeighborhood(
    places: InsightsResult[]
  ): string {
    const neighborhoods = places
      .map((p) => p.properties?.neighborhood)
      .filter(Boolean) as string[]

    if (neighborhoods.length === 0) return 'Unknown'

    return neighborhoods.reduce((a, b, _, arr) =>
      arr.filter((n) => n === a).length >=
      arr.filter((n) => n === b).length
        ? a
        : b
    )
  }

  // Функция для расчета средней цены
  function calculateAveragePrice(places: InsightsResult[]): number {
    const prices = places
      .map((p) => p.properties?.price_level || 2)
      .filter(Boolean)

    if (prices.length === 0) return 2

    const avg =
      prices.reduce((sum, price) => sum + price, 0) / prices.length
    return Math.round(avg * 10) / 10
  }

  return {
    places: relevantPlaces.map((entity) => ({
      name: entity.name,
      type: entity.subtype || 'place',
      description: entity.properties?.description,
      price_level: entity.properties?.price_level || 2,
      business_rating: entity.properties?.business_rating,
      popularity: entity.properties?.popularity,
      neighborhood: entity.properties?.neighborhood,
      topKeywords:
        entity.properties?.keywords?.slice(0, 5).map((k) => k.name) ||
        [],
      specialties:
        entity.properties?.specialty_dishes
          ?.slice(
            0,
            Math.min(entity.properties?.specialty_dishes?.length, 5)
          )
          .map((d) => d.name) || [],
      categories:
        entity.tags
          ?.slice(0, Math.min(entity.tags?.length, 10))
          .map((t) => t.name) || [],
    })),
    context: {
      neighborhood: getMostCommonNeighborhood(relevantPlaces),
      averagePriceLevel: calculateAveragePrice(relevantPlaces),
      totalPlaces: relevantPlaces.length,
      placeTypes: [
        ...new Set(
          relevantPlaces.flatMap(
            (p) => p.tags?.slice(0, 3).map((t) => t.name) || []
          )
        ),
      ].slice(0, 6),
    },
  }
}
