/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// Qloo Insights API TypeScript Type Definitions
// ============================================================================

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export enum EntityType {
  ARTIST = 'urn:entity:artist',
  BOOK = 'urn:entity:book',
  BRAND = 'urn:entity:brand',
  DESTINATION = 'urn:entity:destination',
  MOVIE = 'urn:entity:movie',
  PERSON = 'urn:entity:person',
  PLACE = 'urn:entity:place',
  PODCAST = 'urn:entity:podcast',
  TV_SHOW = 'urn:entity:tvshow',
  VIDEO_GAME = 'urn:entity:videogame',
}

export enum AgeRange {
  YOUNG = '35_and_younger',
  MIDDLE = '36_to_55',
  OLDER = '55_and_older',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
}

export enum SortBy {
  AFFINITY = 'affinity',
  DISTANCE = 'distance',
}

export enum OperatorType {
  UNION = 'union',
  INTERSECTION = 'intersection',
}

export enum TrendsLevel {
  LOW = 'low',
}

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

export enum ExternalKey {
  RESY = 'resy',
  MICHELIN = 'michelin',
  TABLET = 'tablet',
}

export enum ResolveToType {
  SELF = 'self',
  BRAND = 'urn:reference:brand',
  BOTH = 'both',
}

export enum HeatmapBoundary {
  GEOHASHES = 'geohashes',
  CITY = 'city',
  NEIGHBORHOOD = 'neighborhood',
}

// ============================================================================
// BASE INTERFACES
// ============================================================================

export interface WeightedEntity {
  entity: string
  weight: number
}

export interface WeightedTag {
  tag: string
  weight: number
}

export interface EntityQuery {
  name: string
  address?: string
  resolve_to?: ResolveToType
}

export interface ExcludeEntityQuery {
  name: string
  address?: string
}

// ============================================================================
// FILTER PARAMETERS
// ============================================================================

export interface CoreFilters {
  'filter.type': EntityType
  'filter.address'?: string
  'filter.content_rating'?: string
}

export interface EntityFilters {
  'filter.exclude.entities'?: string
  'filter.exclude.entities.query'?: ExcludeEntityQuery[]
  'filter.results.entities'?: string
  'filter.results.entities.query'?: string | string[]
  'filter.references_brand'?: string[]
}

export interface TagFilters {
  'filter.tags'?: string
  'filter.exclude.tags'?: string
  'filter.results.tags'?: string[]
  'operator.filter.tags'?: OperatorType
  'operator.exclude.tags'?: OperatorType
}

export interface LocationFilters {
  'filter.location'?: string
  'filter.exclude.location'?: string
  'filter.location.query'?: string | string[]
  'filter.exclude.location.query'?: string | string[]
  'filter.location.radius'?: number
  'filter.location.geohash'?: string
  'filter.exclude.location.geohash'?: string
}

export interface GeocodeFilters {
  'filter.geocode.name'?: string
  'filter.geocode.admin1_region'?: string
  'filter.geocode.admin2_region'?: string
  'filter.geocode.country_code'?: string
}

export interface PopularityFilters {
  'filter.popularity.min'?: number
  'filter.popularity.max'?: number
}

export interface RatingFilters {
  'filter.rating.min'?: number
  'filter.rating.max'?: number
}

export interface PriceFilters {
  'filter.price_level.min'?: number
  'filter.price_level.max'?: number
  'filter.price_range.from'?: number
  'filter.price_range.to'?: number
  'filter.price.min'?: number
  'filter.price.max'?: number
}

export interface DateFilters {
  'filter.date_of_birth.min'?: string
  'filter.date_of_birth.max'?: string
  'filter.date_of_death.min'?: string
  'filter.date_of_death.max'?: string
  'filter.release_date.min'?: string
  'filter.release_date.max'?: string
  'filter.release_year.min'?: number
  'filter.release_year.max'?: number
  'filter.publication_year.min'?: number
  'filter.publication_year.max'?: number
  'filter.finale_year.min'?: number
  'filter.finale_year.max'?: number
  'filter.latest_known_year.min'?: number
  'filter.latest_known_year.max'?: number
}

export interface ExternalFilters {
  'filter.external.exists'?: string
  'operator.filter.external.exists'?: OperatorType
  'filter.external.resy.count.min'?: number
  'filter.external.resy.count.max'?: number
  'filter.external.resy.party_size.min'?: number
  'filter.external.resy.party_size.max'?: number
  'filter.external.resy.rating.min'?: number
  'filter.external.resy.rating.max'?: number
  'filter.external.tripadvisor.rating.count.min'?: number
  'filter.external.tripadvisor.rating.count.max'?: number
  'filter.external.tripadvisor.rating.min'?: number
  'filter.external.tripadvisor.rating.max'?: number
}

export interface MiscFilters {
  'filter.gender'?: Gender
  'filter.hotel_class.min'?: number
  'filter.hotel_class.max'?: number
  'filter.hours'?: DayOfWeek
  'filter.parents.types'?: string[]
  'filter.properties.business_rating.min'?: number
  'filter.properties.business_rating.max'?: number
  'filter.release_country'?: string[]
  'operator.filter.release_country'?: OperatorType
  'filter.exists'?: string
}

// ============================================================================
// SIGNAL PARAMETERS
// ============================================================================

export interface DemographicSignals {
  'signal.demographics.age'?: string
  'signal.demographics.age.weight'?: number | string
  'signal.demographics.gender'?: Gender
  'signal.demographics.gender.weight'?: number | string
  'signal.demographics.audiences'?: string[]
  'signal.demographics.audiences.weight'?: number | string
}

export interface InterestSignals {
  'signal.interests.entities'?: string | WeightedEntity[]
  'signal.interests.entities.query'?: EntityQuery[]
  'signal.interests.entities.weight'?: number | string
  'signal.interests.tags'?: string | WeightedTag[]
  'signal.interests.tags.weight'?: number | string
}

export interface LocationSignals {
  'signal.location'?: string
  'signal.location.query'?: string
  'signal.location.radius'?: number
  'signal.location.weight'?: number | string
}

export interface BiasSignals {
  'bias.trends'?: TrendsLevel
}

// ============================================================================
// OUTPUT PARAMETERS
// ============================================================================

export interface PaginationParams {
  take?: number
  page?: number
  offset?: number
}

export interface OutputParams {
  sort_by?: SortBy
  'diversify.by'?: string
  'diversify.take'?: number
  'feature.explainability'?: boolean
  'output.heatmap.boundary'?: HeatmapBoundary
}

// ============================================================================
// COMPLETE INPUT INTERFACES
// ============================================================================

export interface BaseInsightsRequest
  extends CoreFilters,
    EntityFilters,
    TagFilters,
    LocationFilters,
    GeocodeFilters,
    PopularityFilters,
    RatingFilters,
    PriceFilters,
    DateFilters,
    ExternalFilters,
    MiscFilters,
    DemographicSignals,
    InterestSignals,
    LocationSignals,
    BiasSignals,
    PaginationParams,
    OutputParams {}

// Entity-specific request types
export interface ArtistRequest extends Partial<BaseInsightsRequest> {
  'filter.type': EntityType.ARTIST
}

export interface BookRequest extends Partial<BaseInsightsRequest> {
  'filter.type': EntityType.BOOK
}

export interface BrandRequest extends Partial<BaseInsightsRequest> {
  'filter.type': EntityType.BRAND
}

export interface DestinationRequest
  extends Partial<BaseInsightsRequest> {
  'filter.type': EntityType.DESTINATION
  'signal.interests.entities': string | WeightedEntity[] // Required for destinations
}

export interface MovieRequest extends Partial<BaseInsightsRequest> {
  'filter.type': EntityType.MOVIE
}

export interface PersonRequest extends Partial<BaseInsightsRequest> {
  'filter.type': EntityType.PERSON
}

export interface PlaceRequest extends Partial<BaseInsightsRequest> {
  'filter.type': EntityType.PLACE
}

export interface PodcastRequest extends Partial<BaseInsightsRequest> {
  'filter.type': EntityType.PODCAST
}

export interface TVShowRequest extends Partial<BaseInsightsRequest> {
  'filter.type': EntityType.TV_SHOW
}

export interface VideoGameRequest
  extends Partial<BaseInsightsRequest> {
  'filter.type': EntityType.VIDEO_GAME
}

export type InsightsRequest =
  | ArtistRequest
  | BookRequest
  | BrandRequest
  | DestinationRequest
  | MovieRequest
  | PersonRequest
  | PlaceRequest
  | PodcastRequest
  | TVShowRequest
  | VideoGameRequest

// ============================================================================
// OUTPUT INTERFACES
// ============================================================================

export interface Geocode {
  name?: string
  admin1_region?: string
  admin2_region?: string
  country_code?: string
  latitude?: number
  longitude?: number
}

export interface EntityProperties {
  geocode?: Geocode
  image?: string
  business_rating?: number
  price_level?: number
  popularity?: number
  rating?: number
  address?: string
  phone?: string
  website?: string
  keywords?: {name: string; count: number}[]
  specialty_dishes?: {
    id: string
    name: string
    type: string
    weight: number
  }[]
  [key: string]: any
}

export interface ExplainabilityEntity {
  entity_id: string
  score: number
  name?: string
}

export interface ExplainabilityData {
  entities?: ExplainabilityEntity[]
  tags?: {
    tag_id: string
    score: number
    name?: string
  }[]
}

export interface QueryExplainability {
  warning?: string
  top_3?: ExplainabilityData
  top_5?: ExplainabilityData
  top_10?: ExplainabilityData
  all?: ExplainabilityData
}

export interface RecommendationExplainability {
  entities?: ExplainabilityEntity[]
  tags?: {
    tag_id: string
    score: number
  }[]
}

export interface InsightsResult {
  entity_id: string
  name: string
  subtype?: string
  properties?: EntityProperties
  query?: {
    affinity: number
    explainability?: RecommendationExplainability
  }
  tags?: {
    id: string
    name: string
    type: string
    weight: number
  }[]
  external?: {
    resy?: {
      rating?: number
      count?: number
      party_size?: {
        min?: number
        max?: number
      }
    }
    tripadvisor?: {
      rating?: number
      count?: number
    }
    michelin?: any
    tablet?: any
  }
}

export interface LocalitySignal {
  entity_id: string
  name: string
  subtype?: string
  properties?: EntityProperties
}

export interface ResolvedEntity {
  entity_id: string
  name: string
  subtype?: string
  address?: string
  index?: number
  properties?: EntityProperties
}

export interface QueryData {
  locality?: {
    signal?: LocalitySignal
    exclude?: LocalitySignal
  }
  entities?: {
    signal?: ResolvedEntity[]
    exclude?: ResolvedEntity[]
    warnings?: {
      not_found?: string[]
      could_not_resolve_brand?: string[]
    }
  }
  explainability?: QueryExplainability
}

export interface Pagination {
  page?: number
  take?: number
  offset?: number
  total?: number
  has_more?: boolean
}

export interface InsightsResponse {
  results: {
    entities: InsightsResult[]
  }
  query?: QueryData
  pagination?: Pagination
  heatmap?: {
    boundary_type?: HeatmapBoundary
    data?: Array<{
      boundary: string
      affinity: number
      count: number
    }>
  }
}

export interface InsightsError {
  code: number
  message: string
  details?: string
  field?: string
}

export interface InsightsErrorResponse {
  error: InsightsError
}

// ============================================================================
// API CLIENT INTERFACES
// ============================================================================

export interface QlooApiConfig {
  apiKey: string
  baseUrl?: string // defaults to staging
  timeout?: number
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type EntityId = string
export type TagId = string
export type LocalityId = string
export type WKTGeometry = string
export type Geohash = string
export type DateString = string // YYYY-MM-DD format

// Helper type for GET request parameters (string values only)
export type GetRequestParams = {
  [K in keyof BaseInsightsRequest]: string | undefined
}

// Helper type for POST request parameters (supports complex objects)
export type PostRequestParams = BaseInsightsRequest

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isEntityType(value: string): value is EntityType {
  return Object.values(EntityType).includes(value as EntityType)
}

// ============================================================================
// EXAMPLE USAGE TYPES
// ============================================================================

export interface ExampleRequests {
  artistRecommendations: ArtistRequest
  placeRecommendationsWithLocation: PlaceRequest
  movieRecommendationsWithInterests: MovieRequest
  complexPlaceSearch: PlaceRequest
}

// Example implementations
export const exampleRequests: ExampleRequests = {
  artistRecommendations: {
    'filter.type': EntityType.ARTIST,
    take: 10,
  },

  placeRecommendationsWithLocation: {
    'filter.type': EntityType.PLACE,
    'filter.location.query': 'New York City',
    'filter.price_level.min': 2,
    take: 5,
  },

  movieRecommendationsWithInterests: {
    'filter.type': EntityType.MOVIE,
    'signal.interests.entities': [
      {
        entity: 'urn:entity:movie:inception',
        weight: 15,
      },
      {
        entity: 'urn:entity:movie:interstellar',
        weight: 10,
      },
    ],
    'signal.demographics.age': AgeRange.MIDDLE,
    'feature.explainability': true,
    take: 10,
  },

  complexPlaceSearch: {
    'filter.type': EntityType.PLACE,
    'signal.interests.entities.query': [
      {
        name: 'Starbucks',
        address: 'Seattle, WA',
        resolve_to: ResolveToType.BOTH,
      },
    ],
    'filter.location.query': 'Manhattan',
    'filter.price_level.max': 3,
    'diversify.by': 'properties.geocode.city',
    'diversify.take': 3,
    take: 15,
  },
}
