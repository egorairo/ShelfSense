'use client'

import {useChat} from 'ai/react'
import {Upload, Bot, User, Loader2, TrendingUp} from 'lucide-react'
import {useState, useRef} from 'react'
import Papa from 'papaparse'

interface SalesData {
  sku_id: string
  tags: string[]
  qty: number
  margin?: number
}

interface StoreLocation {
  latitude?: number
  longitude?: number
  address?: string
}

interface TasteGap {
  suggested_item: string
  matching_rationale: string
  predicted_margin_impact: string
  affinity_score: number
  taste_gap_score: number
}

export function ChatInterface() {
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [storeLocation, setStoreLocation] = useState<StoreLocation>(
    {}
  )
  const [csvUploaded, setCsvUploaded] = useState(false)
  const [locationSet, setLocationSet] = useState(false)
  const [isFormSubmitted, setIsFormSubmitted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    append,
  } = useChat({
    maxSteps: 3,
  })

  console.log('🫔 messages', messages)

  const handleCsvUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    console.log('🫔 file', file)

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const parsedData: SalesData[] = (
          results.data as Record<string, string>[]
        )
          .map((row) => ({
            sku_id: row.sku_id || row.SKU || row.sku,
            tags: (row.tags || '')
              .split(',')
              .map((tag: string) => tag.trim().toLowerCase()),
            qty: parseInt(row.qty || row.quantity || '0'),
            margin: parseFloat(row.margin || '1.0'),
          }))
          .filter((item) => item.sku_id && item.tags.length > 0)

        console.log('🫔 parsedData', parsedData)

        setSalesData(parsedData)
        setCsvUploaded(true)

        // Auto-message about successful upload
        // append({
        //   role: 'user',
        //   content: `I've uploaded my sales data with ${
        //     parsedData.length
        //   } products. Here's a sample: ${JSON.stringify(
        //     parsedData.slice(0, 3),
        //     null,
        //     2
        //   )}`,
        // })
      },
      error: (error) => {
        console.error('CSV parsing error:', error)
        alert('Error parsing CSV file. Please check the format.')
      },
    })
  }

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (
      storeLocation.address ||
      (storeLocation.latitude && storeLocation.longitude)
    ) {
      setLocationSet(true)
    }
  }

  const extractTasteGaps = (message: {
    toolInvocations?: Array<{
      toolName: string
      result?: {
        gaps?: TasteGap[]
      }
    }>
  }): TasteGap[] => {
    if (!message.toolInvocations) return []

    const gaps: TasteGap[] = []

    for (const toolInvocation of message.toolInvocations) {
      if (
        toolInvocation.toolName === 'findTasteGaps' &&
        toolInvocation.result?.gaps
      ) {
        gaps.push(...toolInvocation.result.gaps)
      }
    }

    return gaps
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            TasteGap Scout
          </h1>
          <p className="text-gray-600 mt-1">
            AI tool that flags products you don&apos;t sell yet but
            your local customers are primed to buy
          </p>
        </div>
      </div>

      {/* Setup Modal */}
      {(!csvUploaded || !locationSet || !isFormSubmitted) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Setup TasteGap Scout
                </h2>
                <p className="text-gray-600">
                  Upload your sales data and set your store location
                  to discover taste gaps
                </p>
              </div>

              <div className="space-y-8">
                {/* Sales Data Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        csvUploaded
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {csvUploaded ? '✓' : '1'}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      Sales Data
                    </h3>
                  </div>

                  {!csvUploaded ? (
                    <div className="ml-11 space-y-4">
                      <p className="text-gray-600">
                        Upload CSV with columns: sku_id, tags, qty,
                        margin (optional)
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() =>
                            fileInputRef.current?.click()
                          }
                          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium"
                        >
                          <Upload className="w-5 h-5" />
                          Upload CSV File
                        </button>
                        <button
                          onClick={() => {
                            fetch('/brooklyn-coffee-demo.csv')
                              .then((response) => response.text())
                              .then((csvText) => {
                                Papa.parse(csvText, {
                                  header: true,
                                  complete: (results) => {
                                    const parsedData: SalesData[] = (
                                      results.data as Record<
                                        string,
                                        string
                                      >[]
                                    )
                                      .map((row) => ({
                                        sku_id:
                                          row.sku_id ||
                                          row.SKU ||
                                          row.sku,
                                        tags: (row.tags || '')
                                          .split(',')
                                          .map((tag: string) =>
                                            tag.trim().toLowerCase()
                                          ),
                                        qty: parseInt(
                                          row.qty ||
                                            row.quantity ||
                                            '0'
                                        ),
                                        margin: parseFloat(
                                          row.margin || '1.0'
                                        ),
                                      }))
                                      .filter(
                                        (item) =>
                                          item.sku_id &&
                                          item.tags.length > 0
                                      )

                                    setSalesData(parsedData)
                                    setCsvUploaded(true)
                                  },
                                })
                              })
                          }}
                          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                        >
                          Demo Data
                        </button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleCsvUpload}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="ml-11 p-4 bg-green-50 rounded-lg">
                      <p className="text-green-700 font-medium">
                        ✓ {salesData.length} products loaded
                        successfully
                      </p>
                    </div>
                  )}
                </div>

                {/* Location Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        locationSet
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {locationSet ? '✓' : '2'}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      Store Location
                    </h3>
                  </div>

                  {!locationSet ? (
                    <div className="ml-11 space-y-4">
                      <input
                        type="text"
                        placeholder="Store address (e.g., Brooklyn, NY)"
                        value={storeLocation.address || ''}
                        onChange={(e) =>
                          setStoreLocation({
                            ...storeLocation,
                            address: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="text-center text-gray-500">
                        or use coordinates
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          step="any"
                          placeholder="Latitude"
                          value={storeLocation.latitude || ''}
                          onChange={(e) =>
                            setStoreLocation({
                              ...storeLocation,
                              latitude: parseFloat(e.target.value),
                            })
                          }
                          className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          step="any"
                          placeholder="Longitude"
                          value={storeLocation.longitude || ''}
                          onChange={(e) =>
                            setStoreLocation({
                              ...storeLocation,
                              longitude: parseFloat(e.target.value),
                            })
                          }
                          className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={handleLocationSubmit}
                          disabled={
                            !storeLocation.address &&
                            (!storeLocation.latitude ||
                              !storeLocation.longitude)
                          }
                          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                          Set Location
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStoreLocation({
                              latitude: 40.6782,
                              longitude: -73.9442,
                              address: 'Brooklyn, NY',
                            })
                            setLocationSet(true)
                          }}
                          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                        >
                          Brooklyn Demo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="ml-11 p-4 bg-green-50 rounded-lg">
                      <p className="text-green-700 font-medium">
                        ✓{' '}
                        {storeLocation.address ||
                          `${storeLocation.latitude}, ${storeLocation.longitude}`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Complete Demo Button */}
                <div className="pt-6 border-t border-gray-200">
                  <div className="text-center">
                    <button
                      onClick={() => {
                        setIsFormSubmitted(true)

                        const locationStr =
                          `${storeLocation.latitude}, ${storeLocation.longitude}` ||
                          storeLocation.address

                        console.log('locationStr', locationStr)

                        append({
                          role: 'user',
                          // content: `I've loaded the Brooklyn coffee shop demo with ${parsedData.length} products and set location to Brooklyn, NY. Please analyze taste gaps for my local market.`,
                          content: `My store location is: ${locationStr}. I've uploaded my sales data with ${
                            salesData.length
                          } products. Here's a sample: ${JSON.stringify(
                            salesData,
                            null,
                            2
                          )}. Please analyze taste gaps for my local market.`,
                        })
                      }}
                      className="w-full px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 flex items-center justify-center gap-3 font-semibold text-lg shadow-lg"
                    >
                      🚀 Try To Analyze Taste Gaps
                    </button>
                    <p className="text-gray-500 text-sm mt-3">
                      Sets up everything and starts analysis in one
                      click
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {messages.length === 0 && csvUploaded && locationSet && (
            <div className="text-center py-12">
              <Bot className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                Ready to Find Your Taste Gaps!
              </h2>
              <p className="text-gray-500 max-w-md mx-auto">
                Your data is uploaded and location is set. Ask me to
                analyze taste gaps or find missing products your
                customers would love.
              </p>
            </div>
          )}

          {messages.length === 0 &&
            !isFormSubmitted &&
            (!csvUploaded || !locationSet) && (
              <div className="text-center py-12">
                <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                  Welcome to TasteGap Scout
                </h2>
                <p className="text-gray-500 max-w-md mx-auto">
                  Upload your sales data and set your store location
                  to discover products your customers want but
                  you&apos;re not selling yet.
                </p>
              </div>
            )}

          {messages.map((message) => {
            const tasteGaps = extractTasteGaps(message)

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
                  className={`flex-1 max-w-4xl ${
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

                      {tasteGaps.length > 0 && (
                        <div className="mt-4">
                          <h3 className="text-lg font-semibold text-gray-800 mb-3">
                            Top Missing Products
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="w-full border border-gray-200 rounded-lg">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                                    Suggested Item
                                  </th>
                                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                                    Rationale
                                  </th>
                                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                                    Affinity Score
                                  </th>
                                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                                    Predicted Impact
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {tasteGaps.map((gap, index) => (
                                  <tr
                                    key={index}
                                    className="border-t border-gray-200"
                                  >
                                    <td className="px-4 py-2 font-medium text-gray-900">
                                      {gap.suggested_item}
                                    </td>
                                    <td className="px-4 py-2 text-gray-700">
                                      {gap.matching_rationale}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                                          gap.affinity_score > 0.7
                                            ? 'bg-green-100 text-green-800'
                                            : gap.affinity_score > 0.5
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}
                                      >
                                        {(
                                          gap.affinity_score * 100
                                        ).toFixed(0)}
                                        %
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-gray-700">
                                      {gap.predicted_margin_impact}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
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
                    Analyzing local tastes and finding product gaps...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      {csvUploaded && locationSet && isFormSubmitted && (
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="max-w-6xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Ask me to analyze taste gaps, suggest products, or explain the findings..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                Analyze
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
