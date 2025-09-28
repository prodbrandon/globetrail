// components/chatbot-section.tsx - Enhanced with Fast Travel Classifier

"use client"

import type React from "react"
import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Bot, User, Globe, Loader2, Plane, Hotel, MapPin, Utensils, ChevronDown } from "lucide-react"
// Fast keyword-based classifier for travel queries
import { NaiveBayesChatClassifier } from "@/lib/naive-bayes-classifier"

// INITIALIZE: Fast travel classifier (no training needed)
const nbClassifier = new NaiveBayesChatClassifier();

// Keep all your existing interfaces unchanged
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

// Keep all your existing interfaces exactly as they are
interface FlightData {
  id?: string
  category?: string
  airline?: string
  flight_number?: string
  aircraft?: string
  origin?: string
  origin_name?: string
  origin_time?: string
  departure_time?: string
  destination?: string
  destination_name?: string
  arrival_time?: string
  price?: number
  currency?: string
  duration?: string
  stops?: number
  layovers?: Array<{
    airport?: string
    airport_name?: string
    duration?: string
  }>
  carbon_emissions?: {
    this_flight?: string
    typical_for_route?: string
    difference_percent?: number
  }
  booking_options?: Array<{
    agent?: string
    price?: number
    link?: string
  }>
  flight_segments?: Array<{
    segment_number?: number
    airline?: string
    flight_number?: string
    departure_airport?: {
      id?: string
      name?: string
      time?: string
    }
    arrival_airport?: {
      id?: string
      name?: string
      time?: string
    }
    duration?: string
  }>
}

interface HotelData {
  name?: string
  rating?: number
  price?: {
    amount?: number
    currency?: string
  }
  price_per_night?: number
  location?: string
}

interface ActivityData {
  name?: string
  type?: string
  price?: {
    amount?: number
    currency?: string
  } | number
  duration?: string
}

interface RestaurantData {
  name?: string
  cuisine?: string
  rating?: number
  price_range?: string
}

interface City {
  name: string
  lng: number
  lat: number
  country: string
}

interface ChatbotSectionRef {
  handleFlightSearch: (locations: City[]) => void
}

const ChatbotSection = forwardRef<ChatbotSectionRef>((props, ref) => {
  // Keep all your existing state exactly as is
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
  const [showScrollButton, setShowScrollButton] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Expose flight search functionality to parent component
  useImperativeHandle(ref, () => ({
    handleFlightSearch: (locations: City[]) => {
      handleFlightSearchFromGlobe(locations)
    }
  }))

  const handleFlightSearchFromGlobe = async (locations: City[]) => {
    if (locations.length < 2) return

    // Calculate the date 30 days from now
    const today = new Date()
    const outboundDate = new Date(today)
    outboundDate.setDate(today.getDate() + 30)
    const formattedDate = outboundDate.toISOString().split('T')[0] // YYYY-MM-DD format

    // Create a natural language query from the selected locations
    const origin = locations[0]
    const destination = locations[locations.length - 1] // Use last selected as destination

    let flightQuery = `Find flights from ${origin.name} to ${destination.name} departing ${formattedDate}`

    // If more than 2 locations, create a multi-city trip query
    if (locations.length > 2) {
      const intermediateStops = locations.slice(1, -1).map(city => city.name).join(', ')
      flightQuery = `Multi-city trip: ${origin.name} → ${intermediateStops} → ${destination.name} departing ${formattedDate}`
    }

    // Add the query as a user message and trigger search
    const userMessage: Message = {
      id: Date.now().toString(),
      content: flightQuery,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsTyping(true)

    try {
      // Use the existing flight search logic
      const searchIntent = analyzeSearchIntent(flightQuery)

      let flightsResult = null
      if (searchIntent.needsFlights) {
        const flightsResponse = await fetch('http://localhost:8000/api/flights/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: flightQuery,
            user_id: "hackathon_user",
            locations: locations // Pass the selected locations as metadata
          })
        })

        if (flightsResponse.ok) {
          flightsResult = await flightsResponse.json()
        }
      }

      if (flightsResult?.success) {
        const combinedData: TravelData = {
          raw_data: {
            flights: flightsResult.data.flights?.map((flight: any, index: number) => ({
              id: flight.id || `flight_${index}`,
              airline: flight.airline || 'Unknown Airline',
              flight_number: flight.flight_number || '',
              origin: flight.departure_code || '',
              origin_name: flight.departure_name || '',
              destination: flight.arrival_code || '',
              destination_name: flight.arrival_name || '',
              departure_time: flight.departure_time || '',
              arrival_time: flight.arrival_time || '',
              price: flight.price || 0,
              currency: flight.currency || 'USD',
              duration: flight.duration || '',
              stops: flight.stops || 0,
              category: index < 3 ? 'best' : 'other',
              booking_options: flight.booking_options || []
            })) || [],
            hotels: [],
            activities: [],
            restaurants: []
          }
        }

        const formattedContent = formatTravelResponse(combinedData)
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: formattedContent,
          sender: "bot",
          timestamp: new Date(),
          data: combinedData
        }
        setMessages((prev) => [...prev, botMessage])
      } else {
        throw new Error('Flight search failed')
      }
    } catch (error) {
      console.error('Globe flight search error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `I couldn't find flights for your selected route. Please try using the chat to search for flights manually.`,
        sender: "bot",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  // ENHANCED: Fast keyword-based search intent analysis
  const analyzeSearchIntent = (message: string): {
    needsFlights: boolean;
    needsHotels: boolean;
    needsPlaces: boolean;
    destination?: string;
  } => {
    // ENHANCED: Use fast keyword classification
    const comprehensive = nbClassifier.analyzeComprehensive(message);
    const { classification, multiIntent, urgency, budget } = comprehensive;

    console.log('🧠 Fast Classification:', {
      category: classification.category,
      confidence: classification.confidence,
      matchedKeywords: classification.matchedKeywords.slice(0, 5)
    });

    if (multiIntent.length > 1) {
      console.log('🔄 Multi-intent detected:', multiIntent);
    }

    if (urgency.isUrgent) {
      console.log('🚨 Urgent request detected:', urgency.urgencyLevel, urgency.keywords);
    }

    if (budget.hasBudget) {
      console.log('💰 Budget detected:', budget.amount, budget.type);
    }

    // Keep your existing destination extraction logic (it works well)
    const lowerMessage = message.toLowerCase();
    let destination = null;

    const patterns = [
      /(?:places|activities|things to do|attractions|visit|explore|see)\s+(?:in|at|around)\s+([a-zA-Z\s]+?)(?:\?|$|,)/,
      /(?:hotel|hotels|stay|accommodation|lodge|resort)\s+(?:in|at|around)\s+([a-zA-Z\s]+?)(?:\?|$|,)/,
      /(?:flight|flights|fly|plane|airport)\s+(?:to|into)\s+([a-zA-Z\s]+?)(?:\?|$|,)/,
      /(?:go|travel|trip)\s+(?:to|into)\s+([a-zA-Z\s]+?)(?:\?|$|,)/,
      /^([a-zA-Z\s]+?)\s+(?:places|attractions|activities|things to do|hotels|flights)(?:\?|$)/,
      /(?:what|where|show|find|get)\s+(?:me\s+)?(?:some\s+)?(?:good\s+)?(?:places|attractions|activities|things|hotels|flights)?\s*(?:in|at|around|for|to)?\s+([a-zA-Z\s]{2,30})(?:\?|$)/
    ];

    for (const pattern of patterns) {
      const match = lowerMessage.match(pattern);
      if (match && match[1]) {
        destination = match[1]
          .trim()
          .replace(/\b(the|a|an)\b/g, '')
          .replace(/\s+/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        const genericWords = ['there', 'here', 'somewhere', 'anywhere', 'places', 'city', 'town'];
        if (!genericWords.includes(destination.toLowerCase()) && destination.length > 1) {
          break;
        } else {
          destination = null;
        }
      }
    }

    if (!destination) {
      const words = message.split(/\s+/);
      const capitalizedWords = words.filter(word =>
        /^[A-Z][a-z]+/.test(word) &&
        !['I', 'What', 'Where', 'When', 'How', 'Can', 'Show', 'Find', 'Get'].includes(word)
      );

      if (capitalizedWords.length > 0) {
        destination = capitalizedWords.join(' ');
      }
    }

    // ENHANCED: Intent determination using fast classification results
    let needsFlights = false;
    let needsHotels = false;
    let needsPlaces = false;

    // Multi-intent: check if multiple categories have significant probability
    if (multiIntent.length > 1) {
      needsFlights = multiIntent.includes('flights');
      needsHotels = multiIntent.includes('hotels');
      needsPlaces = multiIntent.includes('places');
    } else {
      // Single intent based on highest probability category
      switch (classification.category) {
        case 'flights':
          needsFlights = true;
          // If high confidence and mentions destination, also get places
          if (classification.confidence > 0.7 && destination) {
            needsPlaces = true;
          }
          break;
        case 'hotels':
          needsHotels = true;
          // If mentions destination, also get places
          if (destination) {
            needsPlaces = true;
          }
          break;
        case 'places':
          needsPlaces = true;
          break;
        case 'other':
          // Low confidence, fall back to your original keyword logic
          const flightKeywords = ['flight', 'flights', 'fly', 'plane', 'airport', 'departure', 'arrival', 'round trip', 'one way'];
          const hotelKeywords = ['hotel', 'hotels', 'accommodation', 'stay', 'lodge', 'resort', 'booking', 'room'];
          const placeKeywords = ['places', 'attractions', 'activities', 'things to do', 'sightseeing', 'visit', 'see', 'explore', 'tourist'];

          const hasFlightKeywords = flightKeywords.some(keyword => lowerMessage.includes(keyword));
          const hasHotelKeywords = hotelKeywords.some(keyword => lowerMessage.includes(keyword));
          const hasPlaceKeywords = placeKeywords.some(keyword => lowerMessage.includes(keyword));

          if (hasFlightKeywords || hasHotelKeywords || hasPlaceKeywords) {
            needsFlights = hasFlightKeywords;
            needsHotels = hasHotelKeywords;
            needsPlaces = hasPlaceKeywords;
          } else {
            // Default to all for unclear requests
            needsFlights = true;
            needsHotels = true;
            needsPlaces = true;
          }
          break;
      }
    }

    // ENHANCED: Log classification insights
    console.log('🎯 Fast Intent Analysis:', {
      needs: { flights: needsFlights, hotels: needsHotels, places: needsPlaces },
      confidence: classification.confidence,
      shouldRouteToLLM: comprehensive.shouldRouteToLLM
    });

    return {
      needsFlights,
      needsHotels,
      needsPlaces,
      destination: destination || undefined
    };
  }

  // Keep your existing handleSendMessage function with enhanced logging
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return

    // ENHANCED: Get comprehensive analysis
    const comprehensive = nbClassifier.analyzeComprehensive(inputValue);
    console.log('📊 Comprehensive Analysis:', {
      category: comprehensive.classification.category,
      confidence: comprehensive.classification.confidence,
      multiIntent: comprehensive.multiIntent,
      urgency: comprehensive.urgency.isUrgent ? comprehensive.urgency.urgencyLevel : 'none',
      budget: comprehensive.budget.hasBudget ? `$${comprehensive.budget.amount} ${comprehensive.budget.type}` : 'none',
      shouldRouteToLLM: comprehensive.shouldRouteToLLM
    });

    // Keep all your existing message handling exactly as is
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
      // Use enhanced search intent analysis
      const searchIntent = analyzeSearchIntent(currentInput);
      console.log('🔍 Final Search Intent:', searchIntent);

      // If classifier detected non-travel query, skip APIs and go straight to natural language
      if (comprehensive.classification.category === 'other' && comprehensive.classification.confidence > 0.8) {
        console.log('🤖 Non-travel query detected, using natural language response...');

        try {
          const naturalResponse = await fetch('http://localhost:8000/api/chat/natural', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: currentInput,
              user_id: "hackathon_user",
              error_context: "Non-travel query"
            })
          });

          if (naturalResponse.ok) {
            const naturalResult = await naturalResponse.json();
            if (naturalResult.success) {
              console.log('✅ Natural language response successful');
              const naturalMessage: Message = {
                id: (Date.now() + 1).toString(),
                content: naturalResult.response,
                sender: "bot",
                timestamp: new Date(),
              }
              setMessages((prev) => [...prev, naturalMessage])
              return; // Exit early since we got a response
            }
          }
        } catch (naturalError) {
          console.warn('⚠️ Natural language response failed:', naturalError);
        }
      }

      // Keep all your existing API calls exactly as they are
      let flightsResult = null;
      let hotelsResult = null;
      let placesResult = null;

      if (searchIntent.needsFlights) {
        console.log('🛫 Searching flights...')
        const flightsResponse = await fetch('http://localhost:8000/api/flights/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: currentInput,
            user_id: "hackathon_user"
          })
        });

        if (!flightsResponse.ok) {
          throw new Error(`Flights API Error: ${flightsResponse.status} ${flightsResponse.statusText}`);
        }

        flightsResult = await flightsResponse.json();
        console.log('✅ Flights result:', flightsResult.success ? 'Success' : 'Failed');
      }

      if (searchIntent.needsHotels) {
        console.log('🏨 Searching hotels...')
        try {
          const hotelsResponse = await fetch('http://localhost:8000/api/hotels/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: currentInput,
              user_id: "hackathon_user"
            })
          });

          if (hotelsResponse.ok) {
            hotelsResult = await hotelsResponse.json();
            console.log('✅ Hotels result:', hotelsResult.success ? 'Success' : 'Failed');
          }
        } catch (error) {
          console.warn('⚠️ Hotels search failed:', error);
        }
      }

      if (searchIntent.needsPlaces) {
        console.log('📍 Searching places...')
        try {
          let destination = searchIntent.destination;
          if (!destination && flightsResult?.extracted_params?.destination_city) {
            destination = flightsResult.extracted_params.destination_city;
          }

          if (destination) {
            const placesResponse = await fetch('http://localhost:8000/api/places/search', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                destination_city: destination,
                user_id: "hackathon_user"
              })
            });

            if (placesResponse.ok) {
              placesResult = await placesResponse.json();
              console.log('✅ Places result:', placesResult.success ? 'Success' : 'Failed');

              // Handle natural language fallback from places API
              if (placesResult.success && placesResult.is_fallback && placesResult.natural_language_response) {
                console.log('🤖 Places API returned natural language fallback');
              }
            }
          } else {
            console.warn('⚠️ No destination found for places search');
          }
        } catch (error) {
          console.warn('⚠️ Places search failed:', error);
        }
      }

      // Check if we got any successful API results
      const hasSuccessfulResults = flightsResult?.success || hotelsResult?.success || placesResult?.success;

      if (hasSuccessfulResults) {
        const combinedData: TravelData = {
          raw_data: {
            flights: [],
            hotels: [],
            activities: [],
            restaurants: []
          }
        };

        if (flightsResult?.success && flightsResult.data?.flights) {
          combinedData.raw_data!.flights = flightsResult.data.flights.map((flight: any, index: number) => ({
            id: flight.id || `flight_${index}`,
            airline: flight.airline || 'Unknown Airline',
            flight_number: flight.flight_number || '',
            origin: flight.departure_code || '',
            origin_name: flight.departure_name || '',
            destination: flight.arrival_code || '',
            destination_name: flight.arrival_name || '',
            departure_time: flight.departure_time || '',
            arrival_time: flight.arrival_time || '',
            price: flight.price || 0,
            currency: flight.currency || 'USD',
            duration: flight.duration || '',
            stops: flight.stops || 0,
            category: index < 3 ? 'best' : 'other',
            booking_options: flight.booking_options || []
          }));
        }

        if (hotelsResult?.success && hotelsResult.data) {
          combinedData.raw_data!.hotels = hotelsResult.data.map((hotel: any) => ({
            name: hotel.name || 'Unknown Hotel',
            rating: hotel.rating || 0,
            price_per_night: hotel.rate_per_night?.lowest || hotel.price_per_night || 0,
            location: typeof hotel.location === 'string' ? hotel.location : hotel.location?.address || 'Unknown location'
          }));
        }

        if (placesResult?.success && placesResult.data && placesResult.data.length > 0) {
          combinedData.raw_data!.activities = placesResult.data.map((place: any) => ({
            name: place.name || 'Unknown Activity',
            type: place.types?.[0] || 'attraction',
            price: 0,
            duration: 'Variable'
          }));
        }

        // Handle natural language response from places API
        if (placesResult?.success && placesResult.is_fallback && placesResult.natural_language_response) {
          combinedData.recommendations = (combinedData.recommendations || '') +
            `\n\n🏛️ **About ${placesResult.destination_city}:**\n${placesResult.natural_language_response}`;
        } else if (searchIntent.needsPlaces && searchIntent.destination && (!placesResult?.success || !placesResult?.data?.length)) {
          // If places search failed but we have a destination, try natural language fallback for places info
          try {
            console.log('🏛️ Places search failed, trying natural language fallback for destination info...');
            const placesNaturalResponse = await fetch('http://localhost:8000/api/chat/natural', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: `What are the top attractions and things to do in ${searchIntent.destination}?`,
                user_id: "hackathon_user",
                error_context: "Places API unavailable"
              })
            });

            if (placesNaturalResponse.ok) {
              const placesNaturalResult = await placesNaturalResponse.json();
              if (placesNaturalResult.success) {
                // Add the natural language response as a recommendation
                combinedData.recommendations = (combinedData.recommendations || '') +
                  `\n\n🏛️ **About ${searchIntent.destination}:**\n${placesNaturalResult.response}`;
              }
            }
          } catch (placesNaturalError) {
            console.warn('⚠️ Places natural language fallback failed:', placesNaturalError);
          }
        }

        const formattedContent = formatTravelResponse(combinedData);

        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: formattedContent,
          sender: "bot",
          timestamp: new Date(),
          data: combinedData
        }
        setMessages((prev) => [...prev, botMessage])
      } else {
        // No successful API results - try natural language response
        console.log('🤖 No API results available, using natural language response...');

        try {
          const naturalResponse = await fetch('http://localhost:8000/api/chat/natural', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: currentInput,
              user_id: "hackathon_user",
              error_context: "Travel APIs unavailable"
            })
          });

          if (naturalResponse.ok) {
            const naturalResult = await naturalResponse.json();
            if (naturalResult.success) {
              console.log('✅ Natural language response successful');
              const naturalMessage: Message = {
                id: (Date.now() + 1).toString(),
                content: naturalResult.response,
                sender: "bot",
                timestamp: new Date(),
              }
              setMessages((prev) => [...prev, naturalMessage])
              return; // Exit early since we got a response
            }
          }
        } catch (naturalError) {
          console.warn('⚠️ Natural language response failed:', naturalError);
        }

        // If natural language also fails, show error
        let errorMessages = [];
        if (searchIntent.needsFlights && !flightsResult?.success) errorMessages.push('flights');
        if (searchIntent.needsHotels && !hotelsResult?.success) errorMessages.push('hotels');
        if (searchIntent.needsPlaces && !placesResult?.success) errorMessages.push('places');

        const primaryError = flightsResult?.error || hotelsResult?.error || placesResult?.error || 'Please try refining your search.';
        throw new Error(`Unable to find ${errorMessages.join(', ')}. ${primaryError}`);
      }
    } catch (error) {
      console.error('Error calling APIs:', error);

      // Try to get a natural language response as fallback
      try {
        console.log('🤖 Attempting natural language fallback...');
        const naturalResponse = await fetch('http://localhost:8000/api/chat/natural', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: currentInput,
            user_id: "hackathon_user",
            error_context: error instanceof Error ? error.message : "API connection failed"
          })
        });

        if (naturalResponse.ok) {
          const naturalResult = await naturalResponse.json();
          if (naturalResult.success) {
            console.log('✅ Natural language fallback successful');
            const fallbackMessage: Message = {
              id: (Date.now() + 1).toString(),
              content: naturalResult.response,
              sender: "bot",
              timestamp: new Date(),
            }
            setMessages((prev) => [...prev, fallbackMessage])
            return; // Exit early since we got a response
          }
        }
      } catch (fallbackError) {
        console.warn('⚠️ Natural language fallback also failed:', fallbackError);
      }

      // If natural language fallback fails, show technical error
      let errorMessage = "I'm having trouble connecting to my travel services right now. ";

      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage += "Please make sure the backend server is running on localhost:8000.\n\nTo start the backend:\n1. cd backend/\n2. python main.py";
        } else if (error.message.includes('API Error: 500')) {
          errorMessage += "The backend server is running but there might be an issue with the travel APIs. Check the backend logs.";
        } else if (error.message.includes('API Error: 404')) {
          errorMessage += "The API endpoint was not found. Please check that all endpoints are properly configured.";
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

  // Keep all your existing helper functions exactly as they are
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    setShowScrollButton(!isNearBottom)
  }

  useEffect(() => {
    if (!showScrollButton) {
      scrollToBottom()
    }
  }, [messages, isTyping, showScrollButton])

  const formatTravelResponse = (data: TravelData): string => {
    if (!data) return "I couldn't find any travel information for your request.";

    let response = "";

    if (data.recommendations) {
      response += `🎯 **Travel Recommendations:**\n${data.recommendations}\n\n`;
    }

    if (data.request) {
      response += `📋 **Trip Summary:**\n`;
      if (data.request.destination) response += `• Destination: ${data.request.destination}\n`;
      if (data.request.departure_city) response += `• From: ${data.request.departure_city}\n`;
      if (data.request.start_date) response += `• Dates: ${data.request.start_date}`;
      if (data.request.end_date) response += ` to ${data.request.end_date}`;
      if (data.request.start_date || data.request.end_date) response += `\n`;
      if (data.request.travelers) response += `• Travelers: ${data.request.travelers}\n`;
      if (data.request.budget) response += `• Budget: ${data.request.budget}\n`;
      if (data.request.trip_type) response += `• Trip Type: ${data.request.trip_type}\n`;
      response += `\n`;
    }

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

  // Keep all your existing JSX exactly as is - no changes needed to the UI
  return (
    <div className="h-full bg-gradient-to-b from-black via-gray-900 to-black relative">
      {/* Keep all your existing JSX structure unchanged */}
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

      <div className="absolute top-[120px] bottom-[100px] left-0 right-0 z-10">
        <ScrollArea className="h-full p-6" onScrollCapture={handleScroll} ref={scrollAreaRef}>
          <div className="space-y-4 pb-4">
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
                  className={`max-w-[85%] p-3 rounded-lg border font-mono text-sm ${message.sender === "user"
                    ? "bg-white/10 border-white/20 text-white backdrop-blur-sm"
                    : "bg-black/40 border-gray-700/50 text-gray-100 backdrop-blur-sm"
                    }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>

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
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {showScrollButton && (
          <div className="absolute bottom-4 right-4 z-20">
            <Button
              onClick={scrollToBottom}
              size="sm"
              className="w-10 h-10 rounded-full bg-black/60 border border-white/30 hover:bg-black/80 text-white backdrop-blur-sm shadow-lg transition-all duration-200 hover:scale-105"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 p-6 border-t border-gray-700/50 bg-black/20 backdrop-blur-sm">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
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
})

// Enhanced display components with expandable functionality
function FlightDisplay({ flights, expanded, onToggle }: {
  flights: FlightData[];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-black/30 rounded p-3 border border-gray-600/30">
      <div className="flex items-center gap-2 mb-2">
        <Plane className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-semibold text-blue-400">FLIGHTS</span>
      </div>
      <div className="space-y-3">
        {(expanded ? flights : flights.slice(0, 3)).map((flight, idx) => {
          const departureDateTime = flight.departure_time || flight.origin_time || '';
          const departureDate = departureDateTime ? new Date(departureDateTime).toLocaleDateString() : '';
          const departureTime = departureDateTime ? new Date(departureDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

          const arrivalDateTime = flight.arrival_time || '';
          const arrivalTime = arrivalDateTime ? new Date(arrivalDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

          const originCode = flight.origin || 'Unknown';
          const originName = flight.origin_name || 'Unknown Airport';
          const destCode = flight.destination || 'Unknown';
          const destName = flight.destination_name || 'Unknown Airport';

          const price = flight.price || 0;
          const currency = flight.currency || 'USD';

          const categoryColor = flight.category === 'best' ? 'text-green-400' :
            flight.category === 'cheapest' ? 'text-yellow-400' :
              'text-blue-400';

          return (
            <div key={flight.id || idx} className="text-xs border-l-2 border-gray-600 pl-3">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-gray-200 font-medium">
                    {flight.airline || 'Unknown Airline'}
                  </span>
                  {flight.flight_number && (
                    <span className="text-gray-400">
                      {flight.flight_number}
                    </span>
                  )}
                  {flight.category && (
                    <span className={`${categoryColor} text-xs uppercase`}>
                      {flight.category}
                    </span>
                  )}
                </div>
                <span className="text-green-400 font-medium">
                  ${price} {currency}
                </span>
              </div>

              <div className="text-gray-300 mb-1">
                <div className="flex items-center justify-between">
                  <span>
                    <strong>{originCode}</strong> ({originName.split(' ').slice(0, 2).join(' ')})
                  </span>
                  <span className="text-gray-500 mx-2">→</span>
                  <span>
                    <strong>{destCode}</strong> ({destName.split(' ').slice(0, 2).join(' ')})
                  </span>
                </div>
              </div>

              {departureDate && (
                <div className="text-gray-400 mb-1">
                  <span className="text-xs">
                    📅 {departureDate}
                    {departureTime && ` • Depart: ${departureTime}`}
                    {arrivalTime && ` • Arrive: ${arrivalTime}`}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 text-gray-400 text-xs">
                {flight.duration && (
                  <span>⏱️ {flight.duration}</span>
                )}
                {flight.stops !== undefined && (
                  <span>
                    {flight.stops === 0 ? '✈️ Direct' : `🔄 ${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                  </span>
                )}
                {flight.aircraft && (
                  <span>🛩️ {flight.aircraft}</span>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {flight.carbon_emissions?.this_flight && (
                    <span className="text-green-300">
                      🌱 {flight.carbon_emissions.this_flight}
                    </span>
                  )}
                  {flight.booking_options && flight.booking_options.length > 0 && (
                    <span className="text-blue-300">
                      📝 {flight.booking_options.length} booking option{flight.booking_options.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <Button
                  onClick={() => {
                    const googleFlightsUrl = `https://www.google.com/travel/flights?q=${encodeURIComponent(
                      `${originCode} to ${destCode} ${departureDate ? new Date(departureDateTime).toISOString().split('T')[0] : ''}`
                    )}`;
                    window.open(googleFlightsUrl, '_blank');
                  }}
                  size="sm"
                  className="h-5 px-2 text-xs bg-gray-700/50 hover:bg-blue-600/80 text-gray-300 hover:text-white border border-gray-600/30 hover:border-blue-500/50 rounded transition-all duration-200"
                >
                  Book
                </Button>
              </div>

              {flight.layovers && flight.layovers.length > 0 && (
                <div className="mt-2 text-xs text-yellow-300">
                  🔄 Layovers: {flight.layovers.map(layover =>
                    `${layover.airport} (${layover.duration || 'N/A'})`
                  ).join(', ')}
                </div>
              )}
            </div>
          );
        })}

        {flights.length > 3 && (
          <div className="pt-2 border-t border-gray-600/30 text-center">
            <Button
              onClick={onToggle}
              variant="ghost"
              size="sm"
              className="text-xs text-gray-400 hover:text-white hover:bg-white/10 h-6 px-2"
            >
              {expanded ? 'Show less' : `Show ${flights.length - 3} more`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Enhanced TravelDataDisplay component with expandable sections
function TravelDataDisplay({ data }: { data: TravelData }) {
  const [expandedSections, setExpandedSections] = useState<{
    flights: boolean;
    hotels: boolean;
    activities: boolean;
    restaurants: boolean;
  }>({
    flights: false,
    hotels: false,
    activities: false,
    restaurants: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const { raw_data } = data;

  if (!raw_data) return null;

  return (
    <div className="space-y-3">
      {raw_data.flights && raw_data.flights.length > 0 && (
        <FlightDisplay
          flights={raw_data.flights}
          expanded={expandedSections.flights}
          onToggle={() => toggleSection('flights')}
        />
      )}

      {raw_data.hotels && raw_data.hotels.length > 0 && (
        <div className="bg-black/30 rounded p-3 border border-gray-600/30">
          <div className="flex items-center gap-2 mb-2">
            <Hotel className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-semibold text-purple-400">HOTELS</span>
          </div>
          <div className="space-y-2">
            {(expandedSections.hotels ? raw_data.hotels : raw_data.hotels.slice(0, 3)).map((hotel, idx) => (
              <div key={idx} className="text-xs text-gray-300">
                <div className="flex justify-between items-center">
                  <span>{hotel.name || 'Unknown Hotel'}</span>
                  <span className="text-green-400">
                    ${typeof hotel.price === 'object' && hotel.price?.amount
                      ? hotel.price.amount
                      : hotel.price_per_night || 'N/A'}/night
                  </span>
                </div>
                <div className="text-gray-400">
                  {'⭐'.repeat(hotel.rating || 0)} • {hotel.location || 'Unknown location'}
                </div>
              </div>
            ))}
            {raw_data.hotels.length > 3 && (
              <div className="pt-2 border-t border-gray-600/30 text-center">
                <Button
                  onClick={() => toggleSection('hotels')}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-gray-400 hover:text-white hover:bg-white/10 h-6 px-2"
                >
                  {expandedSections.hotels ? 'Show less' : `Show ${raw_data.hotels.length - 3} more`}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {raw_data.activities && raw_data.activities.length > 0 && (
        <div className="bg-black/30 rounded p-3 border border-gray-600/30">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-semibold text-orange-400">ACTIVITIES</span>
          </div>
          <div className="space-y-2">
            {(expandedSections.activities ? raw_data.activities : raw_data.activities.slice(0, 3)).map((activity, idx) => (
              <div key={idx} className="text-xs text-gray-300">
                <div className="flex justify-between items-center">
                  <span>{activity.name || 'Unknown Activity'}</span>
                  <span className="text-green-400">
                    ${typeof activity.price === 'object' && activity.price?.amount
                      ? activity.price.amount
                      : typeof activity.price === 'number'
                        ? activity.price
                        : 'N/A'}
                  </span>
                </div>
                <div className="text-gray-400">
                  {activity.type || 'Activity'} • {activity.duration || 'N/A'}
                </div>
              </div>
            ))}
            {raw_data.activities.length > 3 && (
              <div className="pt-2 border-t border-gray-600/30 text-center">
                <Button
                  onClick={() => toggleSection('activities')}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-gray-400 hover:text-white hover:bg-white/10 h-6 px-2"
                >
                  {expandedSections.activities ? 'Show less' : `Show ${raw_data.activities.length - 3} more`}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {raw_data.restaurants && raw_data.restaurants.length > 0 && (
        <div className="bg-black/30 rounded p-3 border border-gray-600/30">
          <div className="flex items-center gap-2 mb-2">
            <Utensils className="w-4 h-4 text-red-400" />
            <span className="text-xs font-semibold text-red-400">RESTAURANTS</span>
          </div>
          <div className="space-y-2">
            {(expandedSections.restaurants ? raw_data.restaurants : raw_data.restaurants.slice(0, 3)).map((restaurant, idx) => (
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
              <div className="pt-2 border-t border-gray-600/30 text-center">
                <Button
                  onClick={() => toggleSection('restaurants')}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-gray-400 hover:text-white hover:bg-white/10 h-6 px-2"
                >
                  {expandedSections.restaurants ? 'Show less' : `Show ${raw_data.restaurants.length - 3} more`}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatbotSection