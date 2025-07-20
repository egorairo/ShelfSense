# Qloo Insights API Documentation

## Overview

Qloo's Insights API helps uncover the underlying factors that shape human preferences, offering cultural intelligence about how people relate to different entities like brands, artists, destinations, and more. It draws from billions of signals to deliver nuanced, taste-based insights that reflect real-world behavior and affinities.

## Base URL

**Staging:** `https://staging.api.qloo.com/v2/insights`
**Hackathon:** `https://hackathon.api.qloo.com/v2/insights`

> **Note:** Hackathon API keys won't work on staging or production URLs.

## Authentication

All requests require authentication via the `X-Api-Key` header:

```bash
curl --request GET \
     --url 'https://staging.api.qloo.com/v2/insights?filter.type=urn%3Aentity%3Aartist' \
     --header 'X-Api-Key: YOUR_API_KEY' \
     --header 'accept: application/json'
```

## HTTP Methods

- **GET**: Standard requests with query parameters
- **POST**: Advanced requests with JSON body for complex parameter structures

## Parameter Categories

All Insights API parameters fall into three main categories:

1. **Filters**: Parameters used to narrow down results based on criteria
2. **Signal**: Parameters that influence recommendations by weighting factors
3. **Output**: Parameters used to control output format and pagination

---

## Filter Parameters

### Core Filters

#### `filter.type` _(required)_

- **Type**: `string`
- **Description**: Filter by the category of entity to return
- **Valid Values**:
  - `urn:entity:artist`
  - `urn:entity:book`
  - `urn:entity:brand`
  - `urn:entity:place`
  - `urn:entity:movie`
  - `urn:entity:person`
  - `urn:entity:podcast`
  - `urn:entity:tvshow`
  - `urn:entity:videogame`
  - `urn:entity:destination`

#### `filter.address`

- **Type**: `string`
- **Description**: Filter by address using a partial string query

#### `filter.content_rating`

- **Type**: `string`
- **Description**: Filter by comma-separated list of content ratings (MPAA film rating system)
- **Example**: `PG`

### Entity Management

#### `filter.exclude.entities`

- **Type**: `string`
- **Description**: Comma-separated list of entity IDs to remove from results

#### `filter.exclude.entities.query`

- **Type**: `array` (POST only)
- **Description**: JSON array with objects containing `name` and `address` properties for fuzzy exclusion

#### `filter.results.entities`

- **Type**: `string`
- **Description**: Filter by comma-separated list of entity IDs (often used to assess affinity)

#### `filter.results.entities.query`

- **Type**: `string | array`
- **Description**: Search for entities by name to use as filters
- **GET**: Single entity name as string
- **POST**: Single name or array of names

### Tag Filters

#### `filter.tags`

- **Type**: `string`
- **Description**: Filter by comma-separated list of tag IDs
- **Example**: `urn:tag:genre:restaurant:Italian`

#### `filter.exclude.tags`

- **Type**: `string`
- **Description**: Exclude entities associated with comma-separated list of tags

#### `operator.filter.tags`

- **Type**: `string`
- **Description**: How to combine multiple filter.tags values
- **Values**: `union` (OR logic, default) | `intersection` (AND logic)

#### `operator.exclude.tags`

- **Type**: `string`
- **Description**: How to combine multiple filter.exclude.tags values
- **Values**: `union` (OR logic, default) | `intersection` (AND logic)

### Location Filters

#### `filter.location`

- **Type**: `string`
- **Description**: Filter by WKT POINT, POLYGON, MULTIPOLYGON, or Qloo locality ID
- **Format**: WKT uses longitude first: `POINT(-73.99823 40.722668)`

#### `filter.exclude.location`

- **Type**: `string`
- **Description**: Exclude results within specified location (same format as filter.location)

#### `filter.location.query`

- **Type**: `string | array`
- **Description**: Search for named localities (fuzzy-matched, case-insensitive)
- **Examples**: "New York City", "Los Angeles", "The Big Apple"

#### `filter.exclude.location.query`

- **Type**: `string | array`
- **Description**: Exclude results from named localities

#### `filter.location.radius`

- **Type**: `integer`
- **Description**: Radius in meters when using filter.location or filter.location.query
- **Note**: Set to 0 to strictly limit to locality boundaries

#### `filter.location.geohash`

- **Type**: `string`
- **Description**: Filter by geohash (12-character precision using pygeohash)

#### `filter.exclude.location.geohash`

- **Type**: `string`
- **Description**: Exclude entities whose geohash starts with specified prefix

### Geographic Filters

#### `filter.geocode.name`

- **Type**: `string`
- **Description**: Filter by city or town name (exact match)

#### `filter.geocode.admin1_region`

- **Type**: `string`
- **Description**: Filter by state/province (exact match)

#### `filter.geocode.admin2_region`

- **Type**: `string`
- **Description**: Filter by county/borough (exact match)

#### `filter.geocode.country_code`

- **Type**: `string`
- **Description**: Filter by two-letter country code (exact match)

### Rating & Popularity Filters

#### `filter.popularity.min` / `filter.popularity.max`

- **Type**: `number` (0 to 1)
- **Description**: Filter by popularity percentile (closer to 1 = higher popularity)

#### `filter.rating.min` / `filter.rating.max`

- **Type**: `number` (0 to 5)
- **Description**: Filter by Qloo rating

#### `filter.price_level.min` / `filter.price_level.max`

- **Type**: `integer` (1 to 4)
- **Description**: Filter by price level (similar to dollar signs)

#### `filter.price_range.from` / `filter.price_range.to`

- **Type**: `integer` (0 to 1,000,000)
- **Description**: Filter by price range

### Date Filters

#### `filter.release_date.min` / `filter.release_date.max`

- **Type**: `date` (YYYY-MM-DD)
- **Description**: Filter by release date range

#### `filter.release_year.min` / `filter.release_year.max`

- **Type**: `integer`
- **Description**: Filter by release year range

#### `filter.publication_year.min` / `filter.publication_year.max`

- **Type**: `number`
- **Description**: Filter by publication year range

### External Data Filters

#### `filter.external.exists`

- **Type**: `string`
- **Description**: Filter by comma-separated list of external keys
- **Values**: `resy`, `michelin`, `tablet`

#### `filter.external.resy.rating.min` / `filter.external.resy.rating.max`

- **Type**: `number` (0 to 5)
- **Description**: Filter places by Resy rating (places only)

#### `filter.external.tripadvisor.rating.min` / `filter.external.tripadvisor.rating.max`

- **Type**: `number` (0 to 5)
- **Description**: Filter places by TripAdvisor rating (places only)

---

## Signal Parameters

### Demographics

#### `signal.demographics.age`

- **Type**: `string`
- **Description**: Comma-separated list of age ranges that influence affinity
- **Values**: `35_and_younger`, `36_to_55`, `55_and_older`

#### `signal.demographics.age.weight`

- **Type**: `number | string`
- **Description**: Extent to which results are influenced by age-based signals

#### `signal.demographics.gender`

- **Type**: `string`
- **Description**: Influence affinity score based on gender
- **Values**: `male`, `female`

#### `signal.demographics.gender.weight`

- **Type**: `number | string`
- **Description**: Extent to which results are influenced by gender-based signals

#### `signal.demographics.audiences`

- **Type**: `array of strings`
- **Description**: Comma-separated list of audience IDs that influence affinity

#### `signal.demographics.audiences.weight`

- **Type**: `number | string`
- **Description**: Extent to which results are influenced by audience preferences

### Interests

#### `signal.interests.entities`

- **Type**: `array of strings`
- **Description**: List of entity IDs that influence affinity scores

**GET Request Format:**

```
signal.interests.entities=urn:entity:movie:inception,urn:entity:movie:interstellar
```

**POST Request Format:**

```json
{
  "signal.interests.entities": [
    {
      "entity": "urn:entity:movie:inception",
      "weight": 10
    },
    {
      "entity": "urn:entity:movie:interstellar",
      "weight": 25
    }
  ]
}
```

#### `signal.interests.entities.query`

- **Type**: `array` (POST only)
- **Description**: JSON array with `name` and `address` properties for entity resolution
- **Additional Properties**:
  - `resolve_to`: `self` (default), `urn:reference:brand`, `both`

#### `signal.interests.entities.weight`

- **Type**: `number | string`
- **Description**: Extent to which results are influenced by entity relevance

#### `signal.interests.tags`

- **Type**: `array`
- **Description**: List of tag IDs that influence affinity scores (similar format to entities)

#### `signal.interests.tags.weight`

- **Type**: `number | string`
- **Description**: Extent to which results are influenced by tags

### Location Signals

#### `signal.location`

- **Type**: `string`
- **Description**: Geolocation for geospatial results (WKT POINT, POLYGON, or locality ID)

#### `signal.location.query`

- **Type**: `string`
- **Description**: Search for named locality for geospatial results

#### `signal.location.radius`

- **Type**: `integer`
- **Description**: Optional radius in meters (generally not recommended)

#### `signal.location.weight`

- **Type**: `number | string`
- **Description**: Extent to which results are influenced by location-based signals

### Trends

#### `bias.trends`

- **Type**: `string`
- **Description**: Level of impact trending entities have on results
- **Values**: `low`
- **Note**: Supported by select categories only

---

## Output Parameters

### Pagination

#### `take`

- **Type**: `integer` (≥ 1)
- **Description**: Number of results to return

#### `page`

- **Type**: `integer` (≥ 1)
- **Description**: Page number of results (recommended over offset)

#### `offset`

- **Type**: `integer`
- **Description**: Number of results to skip (less common than page)

### Sorting & Diversification

#### `sort_by`

- **Type**: `string`
- **Description**: Results sorting algorithm
- **Values**: `affinity` (default), `distance` (requires filter.location)

#### `diversify.by`

- **Type**: `string`
- **Description**: Limits results per city
- **Value**: `properties.geocode.city`

#### `diversify.take`

- **Type**: `integer` (≥ 1)
- **Description**: Maximum results per city when using diversify.by

### Features

#### `feature.explainability`

- **Type**: `boolean`
- **Description**: Include explainability metadata in response
- **Default**: `false`

When enabled:

- **Per-recommendation**: Each result includes `query.explainability` showing input entity contributions
- **Aggregate impact**: Top-level `query.explainability` shows average influence across result subsets

#### `output.heatmap.boundary`

- **Type**: `string`
- **Description**: Type of heatmap output desired
- **Values**: `geohashes` (default), `city`, `neighborhood`

---

## Entity Type Support Matrix

### Artist (`urn:entity:artist`)

**Supported Parameters:**

- Core: `filter.type` (required)
- Filters: `filter.exclude.entities`, `filter.parents.types`, `filter.popularity.min/max`, `filter.exclude.tags`, `filter.external.exists`, `filter.results.entities`, `filter.tags`
- Signals: `signal.demographics.*`, `signal.interests.*`
- Output: `offset`, `take`
- Features: `bias.trends`

### Book (`urn:entity:book`)

**Supported Parameters:**

- Core: `filter.type` (required)
- Filters: `filter.exclude.entities`, `filter.exclude.tags`, `filter.external.exists`, `filter.parents.types`, `filter.popularity.min/max`, `filter.publication_year.min/max`, `filter.results.entities`, `filter.tags`
- Signals: `signal.demographics.*`, `signal.interests.*`
- Output: `offset`, `take`
- Features: `bias.trends`

### Brand (`urn:entity:brand`)

**Supported Parameters:**

- Core: `filter.type` (required)
- Filters: `filter.exclude.entities`, `filter.exclude.tags`, `filter.external.exists`, `filter.parents.types`, `filter.popularity.min/max`, `filter.results.entities`, `filter.tags`
- Signals: `signal.demographics.*`, `signal.interests.*`
- Output: `offset`, `take`
- Features: `bias.trends`

### Destination (`urn:entity:destination`)

**Supported Parameters:**

- Core: `filter.type` (required)
- Filters: `filter.exclude.entities`, `filter.external.exists`, `filter.exclude.tags`, `filter.geocode.*`, `filter.location.*`, `filter.parents.types`, `filter.popularity.min/max`, `filter.results.entities`, `filter.tags`
- Signals: `signal.demographics.*`, `signal.interests.entities` (required), `signal.interests.tags`
- Output: `offset`, `take`
- Features: `bias.trends`

### Movie (`urn:entity:movie`)

**Supported Parameters:**

- Core: `filter.type` (required)
- Filters: `filter.content_rating`, `filter.exclude.entities`, `filter.external.exists`, `filter.exclude.tags`, `filter.parents.types`, `filter.popularity.min/max`, `filter.release_year.min/max`, `filter.release_country`, `filter.rating.min/max`, `filter.results.entities`, `filter.tags`
- Signals: `signal.demographics.*`, `signal.interests.*`
- Output: `offset`, `take`
- Features: `bias.trends`

### Person (`urn:entity:person`)

**Supported Parameters:**

- Core: `filter.type` (required)
- Filters: `filter.date_of_birth.min/max`, `filter.date_of_death.min/max`, `filter.exclude.entities`, `filter.external.exists`, `filter.exclude.tags`, `filter.gender`, `filter.parents.types`, `filter.popularity.min/max`, `filter.results.entities`, `filter.tags`
- Signals: `signal.demographics.*`, `signal.interests.*`
- Output: `offset`, `take`
- Features: `bias.trends`

### Place (`urn:entity:place`)

**Supported Parameters:**

- Core: `filter.type` (required)
- Filters: `filter.address`, `filter.exclude.entities`, `filter.exclude.tags`, `filter.external.*`, `filter.geocode.*`, `filter.hotel_class.min/max`, `filter.hours`, `filter.location.*`, `filter.parents.types`, `filter.popularity.min/max`, `filter.price_level.min/max`, `filter.price_range.from/to`, `filter.properties.business_rating.min/max`, `filter.references_brand`, `filter.results.entities`, `filter.tags`
- Signals: `signal.demographics.*`, `signal.interests.*`
- Output: `offset`, `take`
- Features: `bias.trends`

### Podcast (`urn:entity:podcast`)

**Supported Parameters:**

- Core: `filter.type` (required)
- Filters: `filter.exclude.entities`, `filter.exclude.tags`, `filter.external.exists`, `filter.parents.types`, `filter.popularity.min/max`, `filter.results.entities`, `filter.tags`
- Signals: `signal.demographics.*`, `signal.interests.*`
- Output: `offset`, `take`
- Features: `bias.trends`

### TV Show (`urn:entity:tvshow`)

**Supported Parameters:**

- Core: `filter.type` (required)
- Filters: `filter.content_rating`, `filter.exclude.entities`, `filter.external.exists`, `filter.exclude.tags`, `filter.finale_year.min/max`, `filter.latest_known_year.min/max`, `filter.parents.types`, `filter.popularity.min/max`, `filter.release_year.min/max`, `filter.release_country`, `filter.rating.min/max`, `filter.results.entities`, `filter.tags`
- Signals: `signal.demographics.*`, `signal.interests.*`
- Output: `offset`, `take`
- Features: `bias.trends`

### Video Game (`urn:entity:videogame`)

**Supported Parameters:**

- Core: `filter.type` (required)
- Filters: `filter.exclude.entities`, `filter.exclude.tags`, `filter.external.exists`, `filter.parents.types`, `filter.popularity.min/max`, `filter.results.entities`, `filter.tags`
- Signals: `signal.demographics.*`, `signal.interests.*`
- Output: `offset`, `take`
- Features: `bias.trends`

---

## Examples

### Basic Artist Recommendations

```bash
curl --request GET \
  --url 'https://staging.api.qloo.com/v2/insights?filter.type=urn:entity:artist&take=10' \
  --header 'X-Api-Key: YOUR_API_KEY' \
  --header 'accept: application/json'
```

### Place Recommendations with Location Filter

```bash
curl --request GET \
  --url 'https://staging.api.qloo.com/v2/insights?filter.type=urn:entity:place&filter.location.query=New York City&filter.price_level.min=2&take=5' \
  --header 'X-Api-Key: YOUR_API_KEY' \
  --header 'accept: application/json'
```

### Movie Recommendations with Interest Signals (POST)

```bash
curl --request POST \
  --url 'https://staging.api.qloo.com/v2/insights' \
  --header 'X-Api-Key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "filter.type": "urn:entity:movie",
    "signal.interests.entities": [
      {
        "entity": "urn:entity:movie:inception",
        "weight": 15
      },
      {
        "entity": "urn:entity:movie:interstellar",
        "weight": 10
      }
    ],
    "signal.demographics.age": "36_to_55",
    "feature.explainability": true,
    "take": 10
  }'
```

### Complex Place Search with Entity Resolution

```bash
curl --request POST \
  --url 'https://staging.api.qloo.com/v2/insights' \
  --header 'X-Api-Key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "filter.type": "urn:entity:place",
    "signal.interests.entities.query": [
      {
        "name": "Starbucks",
        "address": "Seattle, WA",
        "resolve_to": "both"
      }
    ],
    "filter.location.query": "Manhattan",
    "filter.price_level.max": 3,
    "diversify.by": "properties.geocode.city",
    "diversify.take": 3,
    "take": 15
  }'
```

---

## Response Format

### Success Response (200)

```json
{
  "results": [
    {
      "entity_id": "urn:entity:place:example",
      "name": "Example Place",
      "affinity": 0.95,
      "properties": {
        "geocode": {
          "name": "New York",
          "admin1_region": "NY",
          "country_code": "US"
        },
        "image": "https://example.com/image.jpg"
      },
      "query": {
        "explainability": {
          "entities": [
            {
              "entity_id": "urn:entity:movie:inception",
              "score": 0.8
            }
          ]
        }
      }
    }
  ],
  "query": {
    "locality": {
      "signal": {
        "entity_id": "urn:entity:locality:new-york-city",
        "name": "New York City"
      }
    },
    "explainability": {
      "top_3": {...},
      "top_5": {...},
      "all": {...}
    }
  },
  "pagination": {
    "page": 1,
    "take": 10,
    "total": 150
  }
}
```

### Error Response (400)

```json
{
  "error": {
    "code": 400,
    "message": "Invalid parameter value",
    "details": "filter.type must be a valid entity type"
  }
}
```

### Error Response (500)

```json
{
  "error": {
    "code": 500,
    "message": "Internal server error"
  }
}
```

---

## Rate Limiting

Rate limits may apply to API requests. Check response headers for rate limit information:

- `X-RateLimit-Limit`: Maximum requests per time window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when rate limit resets

---

## Legacy API Migration

For users migrating from API v1.0, see the Parameter Reference section for mappings between legacy parameter names and new Insights API parameters.

Key changes:

- `type` → `filter.type`
- `target` → `signal.location`
- `filter.location` → `filter.location`
- `bias.*` → `signal.demographics.*`

---

## Additional Resources

- **Parameter Reference**: Complete mapping of legacy to new parameters
- **Entity Type Guide**: Detailed parameter support by entity type
- **Hackathon Guide**: Special instructions for hackathon participants
- **API Examples**: More comprehensive usage examples
- **System Status**: Real-time API status updates
