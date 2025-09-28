// lib/naive-bayes-classifier.ts - Fixed TypeScript errors

export interface ClassificationResult {
  category: 'flights' | 'hotels' | 'places' | 'other';
  confidence: number;
  probabilities: Record<string, number>;
  keywords: string[];
}

interface TrainingData {
  text: string;
  category: 'flights' | 'hotels' | 'places' | 'other';
}

// Add proper interface for budget info
interface BudgetInfo {
  hasBudget: boolean;
  amount?: number;
  currency?: string;
  type?: 'under' | 'around' | 'max';
}

// Add proper interface for urgency info  
interface UrgencyInfo {
  isUrgent: boolean;
  urgencyLevel: 'low' | 'medium' | 'high';
  keywords: string[];
}

export class NaiveBayesChatClassifier {
  private vocabulary: Set<string> = new Set();
  private categoryWordCounts: Record<string, Record<string, number>> = {};
  private categoryCounts: Record<string, number> = {};
  private totalDocuments = 0;
  private trained = false;

  // Pre-defined training data for travel chatbot
  private trainingData: TrainingData[] = [
    // Flight examples
    { text: "book a flight to paris", category: "flights" },
    { text: "find cheap flights to tokyo", category: "flights" },
    { text: "round trip flight from nyc to london", category: "flights" },
    { text: "one way ticket to madrid", category: "flights" },
    { text: "airplane tickets under 500 dollars", category: "flights" },
    { text: "airline reservations for business trip", category: "flights" },
    { text: "departure time from los angeles airport", category: "flights" },
    { text: "connecting flight through denver", category: "flights" },
    { text: "direct flights to miami", category: "flights" },
    { text: "last minute flight deals", category: "flights" },
    { text: "international flights to europe", category: "flights" },
    { text: "domestic airline tickets", category: "flights" },
    { text: "red eye flight to san francisco", category: "flights" },
    { text: "upgrade to business class", category: "flights" },
    { text: "check in online for my flight", category: "flights" },
    { text: "flight status and delays", category: "flights" },
    { text: "baggage allowance for international travel", category: "flights" },
    { text: "airport shuttle service", category: "flights" },
    { text: "jet off to vacation destination", category: "flights" },
    { text: "aviation travel options", category: "flights" },

    // Hotel examples
    { text: "book hotel room in barcelona", category: "hotels" },
    { text: "luxury resort near beach", category: "hotels" },
    { text: "cheap accommodation in rome", category: "hotels" },
    { text: "hostel with breakfast included", category: "hotels" },
    { text: "five star hotel with spa", category: "hotels" },
    { text: "bed and breakfast in tuscany", category: "hotels" },
    { text: "vacation rental apartment", category: "hotels" },
    { text: "suite with ocean view", category: "hotels" },
    { text: "check in and check out times", category: "hotels" },
    { text: "hotel amenities and facilities", category: "hotels" },
    { text: "room service and concierge", category: "hotels" },
    { text: "lodging near city center", category: "hotels" },
    { text: "pet friendly hotels", category: "hotels" },
    { text: "boutique hotel recommendations", category: "hotels" },
    { text: "all inclusive resort package", category: "hotels" },
    { text: "motel with parking included", category: "hotels" },
    { text: "staying overnight in berlin", category: "hotels" },
    { text: "accommodation with kitchen", category: "hotels" },
    { text: "hotel reservation confirmation", category: "hotels" },
    { text: "guest house near airport", category: "hotels" },

    // Places examples
    { text: "things to do in paris", category: "places" },
    { text: "tourist attractions in rome", category: "places" },
    { text: "visit museums and galleries", category: "places" },
    { text: "explore ancient landmarks", category: "places" },
    { text: "sightseeing tour of city", category: "places" },
    { text: "cultural activities and events", category: "places" },
    { text: "historical sites to explore", category: "places" },
    { text: "entertainment and nightlife", category: "places" },
    { text: "local markets and shopping", category: "places" },
    { text: "outdoor activities and hiking", category: "places" },
    { text: "beaches and coastal areas", category: "places" },
    { text: "mountain regions to visit", category: "places" },
    { text: "national parks and nature", category: "places" },
    { text: "architecture and monuments", category: "places" },
    { text: "festivals and celebrations", category: "places" },
    { text: "religious sites and temples", category: "places" },
    { text: "scenic viewpoints and photography", category: "places" },
    { text: "local cuisine and restaurants", category: "places" },
    { text: "guided tours and excursions", category: "places" },
    { text: "hidden gems off beaten path", category: "places" },

    // Other examples
    { text: "what is the weather like", category: "other" },
    { text: "how are you doing today", category: "other" },
    { text: "tell me a joke", category: "other" },
    { text: "help with homework", category: "other" },
    { text: "what time is it", category: "other" },
    { text: "news and current events", category: "other" },
    { text: "sports scores and updates", category: "other" },
    { text: "cooking recipes and tips", category: "other" },
    { text: "health and fitness advice", category: "other" },
    { text: "technology troubleshooting", category: "other" }
  ];

  constructor() {
    this.initializeCategories();
    this.train();
  }

  private initializeCategories() {
    const categories = ['flights', 'hotels', 'places', 'other'];
    categories.forEach(category => {
      this.categoryWordCounts[category] = {};
      this.categoryCounts[category] = 0;
    });
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.isStopWord(word));
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 
      'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 
      'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'its',
      'said', 'each', 'make', 'most', 'over', 'such', 'very', 'what', 'with'
    ]);
    return stopWords.has(word);
  }

  private train() {
    // Reset counts
    this.vocabulary.clear();
    this.totalDocuments = 0;
    this.initializeCategories();

    // Process training data
    this.trainingData.forEach(sample => {
      const tokens = this.tokenize(sample.text);
      const category = sample.category;

      this.categoryCounts[category]++;
      this.totalDocuments++;

      tokens.forEach(token => {
        this.vocabulary.add(token);
        
        if (!this.categoryWordCounts[category][token]) {
          this.categoryWordCounts[category][token] = 0;
        }
        this.categoryWordCounts[category][token]++;
      });
    });

    this.trained = true;
  }

  private calculateLogProbability(text: string, category: string): number {
    const tokens = this.tokenize(text);
    const vocabularySize = this.vocabulary.size;
    
    // Prior probability: P(category)
    let logProb = Math.log(this.categoryCounts[category] / this.totalDocuments);
    
    // Calculate total words in this category
    const totalWordsInCategory = Object.values(this.categoryWordCounts[category])
      .reduce((sum, count) => sum + count, 0);

    // Likelihood: P(word|category) for each word
    tokens.forEach(token => {
      const wordCountInCategory = this.categoryWordCounts[category][token] || 0;
      
      // Laplace smoothing: add 1 to avoid zero probabilities
      const probability = (wordCountInCategory + 1) / (totalWordsInCategory + vocabularySize);
      logProb += Math.log(probability);
    });

    return logProb;
  }

  classify(text: string): ClassificationResult {
    if (!this.trained) {
      throw new Error("Classifier must be trained before classification");
    }

    if (!text || text.trim().length === 0) {
      return {
        category: 'other',
        confidence: 0,
        probabilities: {},
        keywords: []
      };
    }

    const categories = ['flights', 'hotels', 'places', 'other'];
    const logProbabilities: Record<string, number> = {};
    
    // Calculate log probabilities for each category
    categories.forEach(category => {
      logProbabilities[category] = this.calculateLogProbability(text, category);
    });

    // Find the category with highest probability
    const bestCategory = Object.keys(logProbabilities).reduce((a, b) => 
      logProbabilities[a] > logProbabilities[b] ? a : b
    ) as 'flights' | 'hotels' | 'places' | 'other';

    // Convert log probabilities to regular probabilities for display
    const maxLogProb = Math.max(...Object.values(logProbabilities));
    const probabilities: Record<string, number> = {};
    let totalProb = 0;

    Object.entries(logProbabilities).forEach(([category, logProb]) => {
      const prob = Math.exp(logProb - maxLogProb);
      probabilities[category] = prob;
      totalProb += prob;
    });

    // Normalize probabilities
    Object.keys(probabilities).forEach(category => {
      probabilities[category] = probabilities[category] / totalProb;
    });

    const confidence = probabilities[bestCategory];
    
    // Extract meaningful keywords from the text
    const tokens = this.tokenize(text);
    const keywords = tokens.filter(token => this.vocabulary.has(token));

    return {
      category: bestCategory,
      confidence: Math.round(confidence * 100) / 100,
      probabilities,
      keywords
    };
  }

  // Add new training data and retrain
  addTrainingData(samples: TrainingData[]) {
    this.trainingData.push(...samples);
    this.train();
  }

  // Get model statistics
  getModelInfo() {
    return {
      vocabularySize: this.vocabulary.size,
      totalDocuments: this.totalDocuments,
      categoryDistribution: this.categoryCounts,
      trained: this.trained
    };
  }

  // Multi-intent detection using probability thresholds
  detectMultiIntent(text: string, threshold: number = 0.3): string[] {
    const result = this.classify(text);
    const intents: string[] = [];

    Object.entries(result.probabilities).forEach(([category, probability]) => {
      if (probability >= threshold && category !== 'other') {
        intents.push(category);
      }
    });

    return intents.length > 0 ? intents : [result.category];
  }

  // Enhanced analysis combining Naive Bayes with additional features
  analyzeComprehensive(text: string): {
    classification: ClassificationResult;
    multiIntent: string[];
    urgency: UrgencyInfo;
    budget: BudgetInfo;
    confidence: number;
    shouldRouteToLLM: boolean;
  } {
    const classification = this.classify(text);
    const multiIntent = this.detectMultiIntent(text);
    
    // Simple urgency detection (can be enhanced)
    const urgencyKeywords = {
      high: ['emergency', 'urgent', 'asap', 'immediately', 'now', 'today'],
      medium: ['soon', 'quickly', 'fast', 'tomorrow'],
      low: ['eventually', 'sometime', 'planning', 'future']
    };

    let urgency: UrgencyInfo = { isUrgent: false, urgencyLevel: 'low', keywords: [] };
    const lowerText = text.toLowerCase();

    for (const [level, keywords] of Object.entries(urgencyKeywords)) {
      const found = keywords.filter(keyword => lowerText.includes(keyword));
      if (found.length > 0) {
        urgency = {
          isUrgent: level !== 'low',
          urgencyLevel: level as 'low' | 'medium' | 'high',
          keywords: found
        };
        break;
      }
    }

    // FIXED: Simple budget extraction with proper typing
    const pricePatterns = [
      /(?:under|below|less than|maximum|max)\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(?:around|about|approximately)\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/,
    ];

    // FIXED: Declare with proper BudgetInfo type from the start
    let budget: BudgetInfo = { hasBudget: false };
    
    for (const pattern of pricePatterns) {
      const match = text.match(pattern);
      if (match) {
        const amount = parseFloat(match[1].replace(',', ''));
        let type: 'under' | 'around' | 'max' = 'around';
        
        if (/under|below|less than|maximum|max/i.test(match[0])) {
          type = 'under';
        }

        budget = {
          hasBudget: true,
          amount,
          currency: 'USD',
          type
        };
        break;
      }
    }

    const shouldRouteToLLM = 
      classification.confidence < 0.4 || // Lower confidence threshold
      multiIntent.length > 1 ||
      urgency.isUrgent ||
      budget.hasBudget ||
      text.length > 100;

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