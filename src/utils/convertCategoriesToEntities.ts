import {TasteEntity} from '@/app/api/chat/route'

export function convertCategoriesToEntities(
  categories: string[]
): TasteEntity[] {
  return categories.map((category, index) => ({
    name: category,
    relevance: 0.9 - index * 0.05,
    type: 'product_category',
    categories: category
      .toLowerCase()
      .split(/[,\s&]+/)
      .filter((word) => word.length > 2),
  }))
}
