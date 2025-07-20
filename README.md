# TasteGap Scout

AI tool that flags products you don't sell yet but your local customers are statistically primed to buy.

## Concept

Imagine you run a small store. You already know what people bought last week — it's in your sales sheet. But what if there's cool stuff people would love, but you've never stocked it?

That's where TasteGap Scout helps. It's like a magic scout telling you what's missing on your shelf.

## How It Works

1. **Upload your sales data** - CSV with columns: `sku_id`, `tags`, `qty`, `margin` (optional)
2. **Set your store location** - Latitude/longitude or address
3. **Get AI analysis** - We use Qloo's cultural taste data to find gaps

The system:

1. Asks Qloo: "What do people around here like?"
2. Compares those tastes to your product list
3. Finds gaps — things locals probably want but you don't sell yet

## Example Results

**Brooklyn Coffee Shop Demo:**

- Add matcha soda and Japanese cookies — they fit your customers, and you're missing sales
- Consider Korean snacks and bubble tea based on local preferences
- Plant-based options show high local affinity

## Demo

Try the demo with:

- **Brooklyn Coffee Shop** sample data (20 products)
- **Brooklyn, NY** location (40.6782, -73.9442)

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **AI**: Claude Sonnet, Vercel AI SDK
- **Data**: Qloo Taste AI API, CSV parsing with PapaParse
- **Analysis**: Custom cosine-similarity algorithm for taste gap detection

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Environment Variables

```bash
QLOO_API_KEY=your_qloo_api_key
ANTHROPIC_API_KEY=your_anthropic_key
```

## Algorithm

The core gap analysis uses:

1. **Cultural Insights** - Qloo /v2/insights endpoint for location-based taste preferences
2. **Affinity Calculation** - Match product tags against cultural entities with relevance weighting
3. **Gap Detection** - Identify high-affinity categories with low inventory coverage
4. **Revenue Projection** - Estimate weekly impact based on affinity × margin × local demand

Built for the 2024 Qloo Hackathon.
