"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Bot, User, Globe, Loader2, Plane, Hotel, MapPin, Utensils } from "lucide-react"

interface Message {
  id: string
  content: string
  sender: "user" | "bot"
  timestamp: Date
  data?: TravelData
}

interface TravelData {
  request?: {
    destination?: string
    departure_city?: string
    start_date?: string
    end_date?: string
    budget?: number
    travelers?: number
    interests?: string[]
    trip_type?: string
  }
  clusters?: any
  recommendations?: string
  raw_data?: {
    flights?: FlightData[]
    hotels?: HotelData[]
    activities?: ActivityData[]
    restaurants?: RestaurantData[]
  }
}

interface FlightData {
  airline?: string
  flight_number?: string
  origin?: any
  destination?: any
  departure?: any
  arrival?: any
  duration?: string
  price?: {
    amount?: number
    currency?: string
  }
}

interface HotelData {
  name?: string
  rating?: number
  price?: {
    amount?: number
    currency?: string
  }
  location?: string
}

interface ActivityData {
  name?: string
  type?: string
  price?: {
    amount?: number
    currency?: string
  }
  duration?: string
}

interface RestaurantData {
  name?: string
  cuisine?: string
  rating?: number
  price_range?: string
}

export default function ChatbotSection() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "GlobeTrail AI Assistant is here to help you explore the world. Try asking me something like:\n\n• 'Plan a trip to Paris from New York in December'\n• 'Find flights to Tokyo under $800'\n• 'Recommend hotels in Barcelona'\n• 'What activities can I do in Rome?'",
      sender: "bot",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const currentInput = inputValue
    setInputValue("")
    setIsTyping(true)

    try {
      // Call FastAPI backend
      const response = await fetch('http://localhost:8000/api/plan-trip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          user_id: "hackathon_user"
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        const formattedContent = formatTravelResponse(result.data);
        
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: formattedContent,
          sender: "bot",
          timestamp: new Date(),
          data: result.data
        }
        setMessages((prev) => [...prev, botMessage])
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error calling API:', error);
      
      let errorMessage = "I'm having trouble connecting to my travel services right now. ";
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage += "Please make sure the backend server is running on localhost:8000.\n\nTo start the backend:\n1. cd backend/\n2. python main.py";
        } else if (error.message.includes('API Error: 500')) {
          errorMessage += "The backend server is running but the MCP servers might not be initialized. Check the backend logs.";
        } else {
          errorMessage += `Error: ${error.message}`;
        }
      } else {
        errorMessage += "Please try again in a moment.";
      }
      
      const errorBotMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: errorMessage,
        sender: "bot",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorBotMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Format travel response data into readable text
  const formatTravelResponse = (data: TravelData): string => {
    if (!data) return "I couldn't find any travel information for your request.";
    
    let response = "";
    
    // Add recommendations if available
    if (data.recommendations) {
      response += `🎯 **Travel Recommendations:**\n${data.recommendations}\n\n`;
    }
    
    // Add travel request summary
    if (data.request) {
      response += `📋 **Trip Summary:**\n`;
      if (data.request.destination) response += `• Destination: ${data.request.destination}\n`;
      if (data.request.departure_city) response += `• From: ${data.request.departure_city}\n`;
      if (data.request.start_date) response += `• Dates: ${data.request.start_date}`;
      if (data.request.end_date) response += ` to ${data.request.end_date}`;
      if (data.request.start_date || data.request.end_date) response += `\n`;
      if (data.request.travelers) response += `• Travelers: ${data.request.travelers}\n`;
      if (data.request.budget) response += `• Budget: ${data.request.budget}\n`;
      response += `\n`;
    }
    
    // Add data summary with proper null checks
    if (data.raw_data) {
      if (data.raw_data.flights && data.raw_data.flights.length > 0) {
        response += `✈️ **Found ${data.raw_data.flights.length} flights**\n`;
      }
      if (data.raw_data.hotels && data.raw_data.hotels.length > 0) {
        response += `🏨 **Found ${data.raw_data.hotels.length} hotels**\n`;
      }
      if (data.raw_data.activities && data.raw_data.activities.length > 0) {
        response += `🎯 **Found ${data.raw_data.activities.length} activities**\n`;
      }
      if (data.raw_data.restaurants && data.raw_data.restaurants.length > 0) {
        response += `🍽️ **Found ${data.raw_data.restaurants.length} restaurants**\n`;
      }
    }
    
    if (!response.trim()) {
      response = "I found some travel options for you! The detailed results are displayed below.";
    }
    
    return response.trim();
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-black via-gray-900 to-black relative">
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
          linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
        `,
          backgroundSize: "20px 20px",
        }}
      ></div>

      <div className="relative z-10 p-6 border-b border-gray-700/50 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-transparent border-2 border-white/30 flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white font-mono">GlobeTrail</h2>
            <p className="text-sm text-gray-400 font-mono">// AI Travel Assistant</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6 relative z-10">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.sender === "bot" && (
                <div className="w-8 h-8 rounded-full bg-transparent border border-white/30 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[85%] p-3 rounded-lg border font-mono text-sm ${
                  message.sender === "user"
                    ? "bg-white/10 border-white/20 text-white backdrop-blur-sm"
                    : "bg-black/40 border-gray-700/50 text-gray-100 backdrop-blur-sm"
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                
                {/* Show structured travel data if available */}
                {message.data && message.sender === "bot" && (
                  <div className="mt-4 pt-4 border-t border-gray-600/30">
                    <TravelDataDisplay data={message.data} />
                  </div>
                )}
                
                <p className="text-xs opacity-70 mt-2 font-mono">
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {message.sender === "user" && (
                <div className="w-8 h-8 rounded-full bg-transparent border border-white/30 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-transparent border border-white/30 flex items-center justify-center flex-shrink-0">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
              <div className="bg-black/40 border border-gray-700/50 text-gray-100 p-3 rounded-lg backdrop-blur-sm">
                <div className="flex gap-2 items-center">
                  <span className="text-xs opacity-70">Searching travel options</span>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce"></div>
                    <div
                      className="w-1 h-1 bg-white/60 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-1 h-1 bg-white/60 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="relative z-10 p-6 border-t border-gray-700/50 bg-black/20 backdrop-blur-sm">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="// query the planet..."
            className="flex-1 bg-black/40 border-gray-700/50 text-white placeholder-gray-500 focus:border-white/30 font-mono backdrop-blur-sm"
            disabled={isTyping}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className="bg-transparent border border-white/30 hover:bg-white/10 text-white font-mono disabled:opacity-50"
          >
            {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Component to display structured travel data
function TravelDataDisplay({ data }: { data: TravelData }) {
  const { raw_data } = data;
  
  if (!raw_data) return null;

  return (
    <div className="space-y-3">
      {/* Flights */}
      {raw_data.flights && raw_data.flights.length > 0 && (
        <div className="bg-black/30 rounded p-3 border border-gray-600/30">
          <div className="flex items-center gap-2 mb-2">
            <Plane className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-blue-400">FLIGHTS</span>
          </div>
          <div className="space-y-2">
            {raw_data.flights.slice(0, 3).map((flight, idx) => (
              <div key={idx} className="text-xs text-gray-300">
                <div className="flex justify-between items-center">
                  <span>{flight.airline || 'Unknown'} {flight.flight_number || ''}</span>
                  <span className="text-green-400">${flight.price?.amount || 'N/A'}</span>
                </div>
                <div className="text-gray-400">
                  {flight.origin?.city || 'Unknown'} → {flight.destination?.city || 'Unknown'} • {flight.duration || 'N/A'}
                </div>
              </div>
            ))}
            {raw_data.flights.length > 3 && (
              <div className="text-xs text-gray-400">
                +{raw_data.flights.length - 3} more flights
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hotels */}
      {raw_data.hotels && raw_data.hotels.length > 0 && (
        <div className="bg-black/30 rounded p-3 border border-gray-600/30">
          <div className="flex items-center gap-2 mb-2">
            <Hotel className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-semibold text-purple-400">HOTELS</span>
          </div>
          <div className="space-y-2">
            {raw_data.hotels.slice(0, 3).map((hotel, idx) => (
              <div key={idx} className="text-xs text-gray-300">
                <div className="flex justify-between items-center">
                  <span>{hotel.name || 'Unknown Hotel'}</span>
                  <span className="text-green-400">${hotel.price?.amount || 'N/A'}/night</span>
                </div>
                <div className="text-gray-400">
                  {'⭐'.repeat(hotel.rating || 0)} • {hotel.location || 'Unknown location'}
                </div>
              </div>
            ))}
            {raw_data.hotels.length > 3 && (
              <div className="text-xs text-gray-400">
                +{raw_data.hotels.length - 3} more hotels
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activities */}
      {raw_data.activities && raw_data.activities.length > 0 && (
        <div className="bg-black/30 rounded p-3 border border-gray-600/30">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-semibold text-orange-400">ACTIVITIES</span>
          </div>
          <div className="space-y-2">
            {raw_data.activities.slice(0, 3).map((activity, idx) => (
              <div key={idx} className="text-xs text-gray-300">
                <div className="flex justify-between items-center">
                  <span>{activity.name || 'Unknown Activity'}</span>
                  <span className="text-green-400">${activity.price?.amount || 'N/A'}</span>
                </div>
                <div className="text-gray-400">
                  {activity.type || 'Activity'} • {activity.duration || 'N/A'}
                </div>
              </div>
            ))}
            {raw_data.activities.length > 3 && (
              <div className="text-xs text-gray-400">
                +{raw_data.activities.length - 3} more activities
              </div>
            )}
          </div>
        </div>
      )}

      {/* Restaurants */}
      {raw_data.restaurants && raw_data.restaurants.length > 0 && (
        <div className="bg-black/30 rounded p-3 border border-gray-600/30">
          <div className="flex items-center gap-2 mb-2">
            <Utensils className="w-4 h-4 text-red-400" />
            <span className="text-xs font-semibold text-red-400">RESTAURANTS</span>
          </div>
          <div className="space-y-2">
            {raw_data.restaurants.slice(0, 3).map((restaurant, idx) => (
              <div key={idx} className="text-xs text-gray-300">
                <div className="flex justify-between items-center">
                  <span>{restaurant.name || 'Unknown Restaurant'}</span>
                  <span className="text-yellow-400">{restaurant.price_range || 'N/A'}</span>
                </div>
                <div className="text-gray-400">
                  {restaurant.cuisine || 'Cuisine'} • {'⭐'.repeat(restaurant.rating || 0)}
                </div>
              </div>
            ))}
            {raw_data.restaurants.length > 3 && (
              <div className="text-xs text-gray-400">
                +{raw_data.restaurants.length - 3} more restaurants
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}