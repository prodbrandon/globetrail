// lib/fast-travel-classifier.ts - Simple keyword-based classifier

export interface ClassificationResult {
  category: 'flights' | 'hotels' | 'places' | 'other';
  confidence: number;
  matchedKeywords: string[];
}

interface BudgetInfo {
  hasBudget: boolean;
  amount?: number;
  currency?: string;
  type?: 'under' | 'around' | 'max';
}

export class NaiveBayesChatClassifier {
  // Fast keyword-based classification
  private keywordMap = {
    flights: [
      'flight', 'flights', 'fly', 'flying', 'plane', 'airplane', 'aircraft', 'jet',
      'airport', 'departure', 'arrival', 'airline', 'ticket', 'tickets', 'boarding',
      'round trip', 'one way', 'layover', 'connecting', 'direct', 'nonstop',
      'business class', 'economy', 'first class', 'baggage', 'check-in'
    ],
    hotels: [
      'hotel', 'hotels', 'accommodation', 'stay', 'staying', 'lodge', 'lodging',
      'resort', 'motel', 'hostel', 'room', 'rooms', 'suite', 'booking', 'reservation',
      'check in', 'check out', 'bed and breakfast', 'bnb', 'vacation rental',
      'guest house', 'inn', 'spa', 'amenities', 'concierge'
    ],
    places: [
      'places', 'attractions', 'activities', 'things to do', 'sightseeing', 'visit',
      'explore', 'see', 'tourist', 'tourism', 'landmarks', 'monuments', 'museums',
      'galleries', 'parks', 'beaches', 'mountains', 'hiking', 'tours', 'excursions',
      'cultural', 'historical', 'entertainment', 'nightlife', 'restaurants', 'dining',
      'shopping', 'markets', 'festivals', 'events', 'what to do', 'where to go'
    ]
  };

  // Keywords that indicate NON-travel queries
  private nonTravelKeywords = [
    'weather', 'temperature', 'climate', 'forecast', 'rain', 'sunny', 'cloudy',
    'news', 'current events', 'politics', 'sports', 'scores', 'game',
    'recipe', 'cooking', 'food', 'ingredients', 'how to cook',
    'health', 'medical', 'doctor', 'symptoms', 'medicine',
    'technology', 'computer', 'software', 'programming', 'code',
    'time', 'date', 'calendar', 'schedule',
    'joke', 'funny', 'entertainment', 'movie', 'tv show',
    'math', 'calculate', 'equation', 'homework', 'study',
    'definition', 'meaning', 'explain', 'what is', 'how does'
  ];

  classify(text: string): ClassificationResult {
    if (!text || text.trim().length === 0) {
      return { category: 'other', confidence: 0, matchedKeywords: [] };
    }

    const lowerText = text.toLowerCase();

    // FIRST: Check for non-travel keywords - if found, immediately return 'other'
    const nonTravelMatches = this.nonTravelKeywords.filter(keyword => lowerText.includes(keyword));
    if (nonTravelMatches.length > 0) {
      return { 
        category: 'other', 
        confidence: 0.9, // High confidence it's not travel-related
        matchedKeywords: nonTravelMatches 
      };
    }

    const scores = { flights: 0, hotels: 0, places: 0 };
    const matchedKeywords: Record<string, string[]> = { flights: [], hotels: [], places: [] };

    // Score each category based on keyword matches
    for (const [category, keywords] of Object.entries(this.keywordMap)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          scores[category as keyof typeof scores]++;
          matchedKeywords[category as keyof typeof matchedKeywords].push(keyword);
        }
      }
    }

    // Find the category with the highest score
    const maxScore = Math.max(scores.flights, scores.hotels, scores.places);

    if (maxScore === 0) {
      return { category: 'other', confidence: 0, matchedKeywords: [] };
    }

    let bestCategory: 'flights' | 'hotels' | 'places' = 'places';
    if (scores.flights === maxScore) bestCategory = 'flights';
    else if (scores.hotels === maxScore) bestCategory = 'hotels';
    else if (scores.places === maxScore) bestCategory = 'places';

    // Calculate confidence based on score and text length
    const confidence = Math.min(maxScore / Math.max(1, text.split(' ').length / 3), 1);

    return {
      category: bestCategory,
      confidence: Math.round(confidence * 100) / 100,
      matchedKeywords: matchedKeywords[bestCategory]
    };
  }

  // Multi-intent detection - check if multiple categories have significant matches
  detectMultiIntent(text: string): string[] {
    const lowerText = text.toLowerCase();
    const intents: string[] = [];

    for (const [category, keywords] of Object.entries(this.keywordMap)) {
      const matches = keywords.filter(keyword => lowerText.includes(keyword));
      if (matches.length >= 1) { // At least 1 keyword match
        intents.push(category);
      }
    }

    return intents.length > 0 ? intents : ['other'];
  }

  // Simple comprehensive analysis
  analyzeComprehensive(text: string): {
    classification: ClassificationResult;
    multiIntent: string[];
    urgency: { isUrgent: boolean; urgencyLevel: 'low' | 'medium' | 'high'; keywords: string[] };
    budget: BudgetInfo;
    confidence: number;
    shouldRouteToLLM: boolean;
  } {
    const classification = this.classify(text);
    const multiIntent = this.detectMultiIntent(text);

    // Quick urgency check
    const urgencyKeywords = ['urgent', 'asap', 'immediately', 'now', 'today', 'emergency'];
    const foundUrgency = urgencyKeywords.filter(keyword => text.toLowerCase().includes(keyword));
    const urgency = {
      isUrgent: foundUrgency.length > 0,
      urgencyLevel: foundUrgency.length > 0 ? 'high' as const : 'low' as const,
      keywords: foundUrgency
    };

    // Quick budget extraction
    const budgetMatch = text.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    const budget: BudgetInfo = budgetMatch ? {
      hasBudget: true,
      amount: parseFloat(budgetMatch[1].replace(',', '')),
      currency: 'USD',
      type: 'around'
    } : { hasBudget: false };

    // Route to LLM if low confidence, no clear category, or detected as non-travel
    const shouldRouteToLLM = classification.confidence < 0.3 || classification.category === 'other';

    return {
      classification,
      multiIntent,
      urgency,
      budget,
      confidence: classification.confidence,
      shouldRouteToLLM
    };
  }
}