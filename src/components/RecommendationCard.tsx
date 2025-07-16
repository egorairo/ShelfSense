import {QlooRecommendation} from '@/lib/qloo'
import {ExternalLink, MapPin, Star} from 'lucide-react'

interface RecommendationCardProps {
  recommendation: QlooRecommendation
}

export function RecommendationCard({
  recommendation,
}: RecommendationCardProps) {
  const affinityPercentage = Math.round(
    recommendation.affinity_score * 100
  )

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg">
            {recommendation.name}
          </h3>
          <p className="text-sm text-gray-600 capitalize">
            {recommendation.type}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-full">
          <Star className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-600">
            {affinityPercentage}%
          </span>
        </div>
      </div>

      {recommendation.description && (
        <p className="text-gray-700 text-sm mb-3 line-clamp-2">
          {recommendation.description}
        </p>
      )}

      {recommendation.location && (
        <div className="flex items-center gap-1 text-gray-600 mb-3">
          <MapPin className="w-4 h-4" />
          <span className="text-sm">
            {recommendation.location.address
              ? `${recommendation.location.address}, ${recommendation.location.city}`
              : `${recommendation.location.city}, ${recommendation.location.country}`}
          </span>
        </div>
      )}

      {recommendation.categories &&
        recommendation.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {recommendation.categories
              .slice(0, 3)
              .map((category, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                >
                  {category}
                </span>
              ))}
            {recommendation.categories.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                +{recommendation.categories.length - 3} more
              </span>
            )}
          </div>
        )}

      {recommendation.booking_url && (
        <a
          href={recommendation.booking_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          <ExternalLink className="w-4 h-4" />
          Book Now
        </a>
      )}
    </div>
  )
}

interface RecommendationGridProps {
  recommendations: QlooRecommendation[]
}

export function RecommendationGrid({
  recommendations,
}: RecommendationGridProps) {
  if (recommendations.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      {recommendations.map((recommendation) => (
        <RecommendationCard
          key={recommendation.id}
          recommendation={recommendation}
        />
      ))}
    </div>
  )
}
