# TasteGraph Concierge

A travel chat app that turns "I'll be in Berlin Friday night, I love Radiohead and Korean BBQ" into a personalized itinerary in <30s.

## Features

- **AI-Powered Travel Assistant**: Powered by Qloo Taste AI™ for personalized recommendations
- **Real-time Streaming**: Fast responses with streaming tool calls
- **Personalized Recommendations**: Based on your taste preferences and travel location
- **Modern UI**: Beautiful, responsive interface built with Tailwind CSS
- **Affinity Scores**: See how well each recommendation matches your taste profile

## Tech Stack

- **Next.js 15** with App Router
- **Vercel AI SDK 4.2+** with streaming support
- **Qloo Taste AI™ API** for personalized recommendations
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Lucide React** for icons

## Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd qloo
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:

   ```env
   # Qloo Taste AI™ API Configuration
   QLOO_API_KEY=your_qloo_api_key_here
   QLOO_API_URL=https://api.qloo.com/v1

   # OpenAI Configuration for AI SDK
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Run the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. **Enter your travel preferences**: Tell the AI about your destination, timing, and preferences

   - Example: "I'll be in Berlin Friday night, I love Radiohead and Korean BBQ"

2. **Get personalized recommendations**: The AI will:

   - Search for entities matching your preferences
   - Generate location-specific recommendations
   - Explain why each recommendation fits your taste profile

3. **Explore recommendations**: View detailed cards with:
   - Affinity scores showing match strength
   - Location information
   - Booking links (when available)
   - Category tags

## API Integration

The app integrates with the Qloo Taste AI™ API through two main endpoints:

- **`/search`**: Resolves user preferences to entity IDs
- **`/recs`**: Generates personalized recommendations based on entity IDs and location

## Architecture

```
src/
├── app/
│   ├── api/chat/route.ts     # Chat API with tool integration
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main page
├── components/
│   ├── ChatInterface.tsx     # Main chat UI component
│   └── RecommendationCard.tsx # Recommendation display components
└── lib/
    └── qloo.ts               # Qloo API integration
```

## Performance

- **<30s response time** guaranteed
- **Streaming responses** for real-time updates
- **No PII storage** - privacy-focused design
- **Optimized tool calls** with maxSteps: 3

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details
