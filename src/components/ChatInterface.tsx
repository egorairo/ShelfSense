'use client'

import {useChat} from 'ai/react'
import {Send, Bot, User, Loader2} from 'lucide-react'
import {RecommendationGrid} from './RecommendationCard'
import {QlooRecommendation} from '@/lib/qloo'

export function ChatInterface() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
  } = useChat({
    maxSteps: 3,
  })

  // Extract recommendations from tool results
  const extractRecommendations = (message: {
    toolInvocations?: Array<{
      toolName: string
      result?: {
        recommendations?: QlooRecommendation[]
      }
    }>
  }): QlooRecommendation[] => {
    if (!message.toolInvocations) return []

    const recommendations: QlooRecommendation[] = []

    for (const toolInvocation of message.toolInvocations) {
      if (
        toolInvocation.toolName === 'getRecommendations' &&
        toolInvocation.result
      ) {
        const result = toolInvocation.result
        if (result.recommendations) {
          recommendations.push(...result.recommendations)
        }
      }
    }

    return recommendations
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">
            TasteGraph Concierge
          </h1>
          <p className="text-gray-600 mt-1">
            Your AI travel assistant powered by Qloo Taste AI™
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                Welcome to TasteGraph Concierge
              </h2>
              <p className="text-gray-500 max-w-md mx-auto">
                Tell me about your travel plans and preferences. For
                example: &quot;I&apos;ll be in Berlin Friday night, I
                love Radiohead and Korean BBQ&quot;
              </p>
            </div>
          )}

          {messages.map((message) => {
            const recommendations = extractRecommendations(message)

            return (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user'
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  </div>
                )}

                <div
                  className={`flex-1 max-w-3xl ${
                    message.role === 'user' ? 'text-right' : ''
                  }`}
                >
                  {message.role === 'user' ? (
                    <div className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg">
                      {message.content}
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                      <div className="prose prose-sm max-w-none">
                        {message.content
                          .split('\n')
                          .map((line, index) => (
                            <p key={index} className="mb-2 last:mb-0">
                              {line}
                            </p>
                          ))}
                      </div>

                      {recommendations.length > 0 && (
                        <RecommendationGrid
                          recommendations={recommendations}
                        />
                      )}
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    Analyzing your preferences and finding
                    recommendations...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Tell me about your travel plans and preferences..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
