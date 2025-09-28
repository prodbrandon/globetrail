import re
import json
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import spacy
from dataclasses import dataclass
import asyncio


@dataclass
class InputAnalysis:
    """Structured input analysis result"""
    intent: str  # travel_planning, general_chat, specific_search
    confidence: float
    entities: Dict[str, Any]
    urgency: str  # immediate, planning, research
    complexity: str  # simple, moderate, complex
    requires_gemini: bool


class SmartInputAnalyzer:
    """Fast, multi-layered input analysis for travel requests"""
    
    def __init__(self):
        # Load spaCy model for NER (install: python -m spacy download en_core_web_sm)
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            print("⚠️  spaCy model not found. Install with: python -m spacy download en_core_web_sm")
            self.nlp = None
        
        # Enhanced patterns
        self.destination_patterns = self._build_destination_patterns()
        self.intent_patterns = self._build_intent_patterns()
        self.entity_patterns = self._build_entity_patterns()
        self.trip_type_patterns = self._build_trip_type_patterns()
        
        # Cache for common requests
        self.analysis_cache = {}
    
    def _build_destination_patterns(self) -> Dict[str, str]:
        """Comprehensive destination mapping"""
        return {
            # Major cities
            "paris": "Paris, France", "tokyo": "Tokyo, Japan", "london": "London, UK",
            "new york": "New York, NY", "nyc": "New York, NY", "rome": "Rome, Italy",
            "barcelona": "Barcelona, Spain", "amsterdam": "Amsterdam, Netherlands",
            "berlin": "Berlin, Germany", "sydney": "Sydney, Australia",
            "dubai": "Dubai, UAE", "bangkok": "Bangkok, Thailand",
            "istanbul": "Istanbul, Turkey", "moscow": "Moscow, Russia",
            "mumbai": "Mumbai, India", "delhi": "Delhi, India", "beijing": "Beijing, China",
            "shanghai": "Shanghai, China", "los angeles": "Los Angeles, CA", "la": "Los Angeles, CA",
            "san francisco": "San Francisco, CA", "chicago": "Chicago, IL",
            "miami": "Miami, FL", "las vegas": "Las Vegas, NV", "vegas": "Las Vegas, NV",
            
            # Countries (map to capital/major city)
            "france": "Paris, France", "japan": "Tokyo, Japan", "uk": "London, UK",
            "england": "London, UK", "italy": "Rome, Italy", "spain": "Barcelona, Spain",
            "germany": "Berlin, Germany", "australia": "Sydney, Australia",
            "thailand": "Bangkok, Thailand", "turkey": "Istanbul, Turkey",
            "russia": "Moscow, Russia", "india": "Mumbai, India", "china": "Beijing, China",
            
            # Regions
            "europe": "Paris, France", "asia": "Tokyo, Japan", "southeast asia": "Bangkok, Thailand"
        }
    
    def _build_intent_patterns(self) -> Dict[str, List[str]]:
        """Intent classification patterns"""
        return {
            "travel_planning": [
                r"plan.*trip", r"travel.*to", r"visit.*\w+", r"vacation.*in",
                r"holiday.*to", r"going.*to", r"trip.*to", r"itinerary",
                r"book.*flight", r"find.*hotel", r"recommend.*restaurant"
            ],
            "specific_search": [
                r"find.*flights?", r"search.*hotels?", r"look.*for.*restaurant",
                r"activities.*in", r"things.*to.*do", r"where.*to.*eat",
                r"best.*hotels?", r"cheap.*flights?"
            ],
            "general_chat": [
                r"hello", r"hi", r"help", r"what.*can.*you", r"how.*are.*you",
                r"thanks?", r"thank.*you", r"goodbye", r"bye"
            ]
        }
    
    def _build_entity_patterns(self) -> Dict[str, str]:
        """Entity extraction patterns"""
        return {
            "budget": r"\$(\d{1,6}(?:,\d{3})*|\d+k?)",
            "travelers": r"(\d+)\s*(?:people|person|traveler|passenger|adult|pax)",
            "duration": r"(\d+)\s*(?:days?|weeks?|months?|nights?)",
            "dates": r"(?:january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            "departure": r"from\s+([a-zA-Z\s]+?)(?:\s+to|\s+in|$)",
            "arrival": r"to\s+([a-zA-Z\s]+?)(?:\s|$|[,.])",
            "trip_type": r"(business|leisure|romantic|family|adventure|backpack|luxury|budget)"
        }
    
    def _build_trip_type_patterns(self) -> Dict[str, List[str]]:
        """Trip type detection patterns"""
        return {
            "round_trip": [
                r"round.?trip", r"return.*trip", r"back.*and.*forth", 
                r"there.*and.*back", r"return.*flight", r"round.?trip.*flight",
                r"coming.*back", r"return.*journey", r"both.*ways"
            ],
            "one_way": [
                r"one.?way", r"single.*trip", r"not.*returning", 
                r"staying.*there", r"moving.*to", r"relocating"
            ],
            "multi_city": [
                r"multi.?city", r"multiple.*cities", r"several.*places",
                r"tour.*of", r"visiting.*multiple", r"city.*hopping"
            ]
        }
    
    async def analyze_input(self, user_input: str) -> InputAnalysis:
        """Fast, comprehensive input analysis"""
        
        # Check cache first
        cache_key = user_input.lower().strip()
        if cache_key in self.analysis_cache:
            return self.analysis_cache[cache_key]
        
        # Layer 1: Fast pattern matching
        intent, confidence = self._classify_intent_fast(user_input)
        entities = self._extract_entities_fast(user_input)
        
        # Layer 2: NLP enhancement (if available)
        if self.nlp:
            entities.update(self._extract_entities_nlp(user_input))
        
        # Layer 3: Context analysis
        urgency = self._determine_urgency(user_input, entities)
        complexity = self._determine_complexity(user_input, entities)
        requires_gemini = self._should_use_gemini(intent, confidence, complexity)
        
        analysis = InputAnalysis(
            intent=intent,
            confidence=confidence,
            entities=entities,
            urgency=urgency,
            complexity=complexity,
            requires_gemini=requires_gemini
        )
        
        # Cache result
        self.analysis_cache[cache_key] = analysis
        
        return analysis
    
    def _classify_intent_fast(self, user_input: str) -> Tuple[str, float]:
        """Fast intent classification using patterns"""
        input_lower = user_input.lower()
        
        scores = {}
        for intent, patterns in self.intent_patterns.items():
            score = 0
            for pattern in patterns:
                if re.search(pattern, input_lower):
                    score += 1
            scores[intent] = score / len(patterns)
        
        # Get best match
        best_intent = max(scores, key=scores.get)
        confidence = scores[best_intent]
        
        # Boost travel planning if destination found
        if any(dest in input_lower for dest in self.destination_patterns.keys()):
            if best_intent != "travel_planning":
                confidence = max(confidence, 0.7)
                best_intent = "travel_planning"
            else:
                confidence = min(confidence + 0.3, 1.0)
        
        return best_intent, confidence
    
    def _extract_entities_fast(self, user_input: str) -> Dict[str, Any]:
        """Fast entity extraction using regex"""
        entities = {}
        input_lower = user_input.lower()
        
        # Extract destination
        for dest_key, dest_value in self.destination_patterns.items():
            if dest_key in input_lower:
                entities["destination"] = dest_value
                break
        
        # Extract other entities
        for entity_type, pattern in self.entity_patterns.items():
            match = re.search(pattern, input_lower)
            if match:
                if entity_type == "budget":
                    # Clean budget extraction
                    budget_str = match.group(1).replace(",", "").replace("k", "000")
                    entities["budget"] = int(budget_str)
                elif entity_type == "travelers":
                    entities["travelers"] = int(match.group(1))
                elif entity_type == "duration":
                    entities["duration"] = int(match.group(1))
                else:
                    entities[entity_type] = match.group(1).strip()
        
        # Detect trip type (round-trip vs one-way)
        entities["trip_flow"] = self._detect_trip_flow(input_lower)
        
        return entities
    
    def _extract_entities_nlp(self, user_input: str) -> Dict[str, Any]:
        """Enhanced entity extraction using spaCy NLP"""
        entities = {}
        
        try:
            doc = self.nlp(user_input)
            
            # Extract named entities
            for ent in doc.ents:
                if ent.label_ == "GPE":  # Geopolitical entity (cities, countries)
                    if "destination" not in entities:
                        entities["destination"] = ent.text
                elif ent.label_ == "MONEY":
                    if "budget" not in entities:
                        # Extract numeric value from money entity
                        money_match = re.search(r"(\d+)", ent.text)
                        if money_match:
                            entities["budget"] = int(money_match.group(1))
                elif ent.label_ == "DATE":
                    if "dates" not in entities:
                        entities["dates"] = ent.text
        
        except Exception as e:
            print(f"⚠️  NLP extraction failed: {e}")
        
        return entities
    
    def _determine_urgency(self, user_input: str, entities: Dict[str, Any]) -> str:
        """Determine request urgency"""
        input_lower = user_input.lower()
        
        # Immediate urgency indicators
        immediate_keywords = ["now", "today", "asap", "urgent", "quick", "fast", "immediately"]
        if any(keyword in input_lower for keyword in immediate_keywords):
            return "immediate"
        
        # Planning indicators
        planning_keywords = ["plan", "thinking", "considering", "maybe", "future", "next year"]
        if any(keyword in input_lower for keyword in planning_keywords):
            return "planning"
        
        # Check if dates are soon
        if "dates" in entities:
            # Simple heuristic - if dates mentioned, assume moderate urgency
            return "moderate"
        
        return "research"
    
    def _determine_complexity(self, user_input: str, entities: Dict[str, Any]) -> str:
        """Determine request complexity"""
        
        # Count extracted entities
        entity_count = len(entities)
        word_count = len(user_input.split())
        
        # Complex indicators
        complex_keywords = ["detailed", "comprehensive", "complete", "full itinerary", "everything"]
        has_complex_keywords = any(keyword in user_input.lower() for keyword in complex_keywords)
        
        if entity_count >= 4 or word_count > 20 or has_complex_keywords:
            return "complex"
        elif entity_count >= 2 or word_count > 10:
            return "moderate"
        else:
            return "simple"
    
    def _should_use_gemini(self, intent: str, confidence: float, complexity: str) -> bool:
        """Decide if Gemini AI is needed"""
        
        # Always use Gemini for complex requests
        if complexity == "complex":
            return True
        
        # Use Gemini for low confidence classifications
        if confidence < 0.6:
            return True
        
        # Use Gemini for travel planning (but not simple searches)
        if intent == "travel_planning" and complexity != "simple":
            return True
        
        # Skip Gemini for simple, high-confidence requests
        return False
    
    def get_smart_defaults(self, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Generate smart defaults based on extracted entities"""
        
        defaults = {
            "destination": entities.get("destination", "Paris, France"),
            "budget": entities.get("budget", 2000),
            "travelers": entities.get("travelers", 1),
            "trip_type": entities.get("trip_type", "leisure"),
            "interests": ["sightseeing", "culture", "food"]
        }
        
        # Smart interest inference
        input_text = str(entities)
        if "food" in input_text or "restaurant" in input_text:
            defaults["interests"] = ["dining", "food", "culture"]
        elif "museum" in input_text or "art" in input_text:
            defaults["interests"] = ["culture", "museums", "history"]
        elif "adventure" in input_text or "hiking" in input_text:
            defaults["interests"] = ["adventure", "outdoor", "nature"]
        
        return defaults
    
    def _detect_trip_flow(self, input_text: str) -> str:
        """Detect if user wants round-trip, one-way, or multi-city"""
        
        for trip_type, patterns in self.trip_type_patterns.items():
            for pattern in patterns:
                if re.search(pattern, input_text):
                    return trip_type
        
        # Default heuristics
        if "return" in input_text or "back" in input_text:
            return "round_trip"
        elif "one way" in input_text or "moving" in input_text:
            return "one_way"
        
        # Default to round-trip for vacation planning
        vacation_keywords = ["vacation", "holiday", "trip", "visit"]
        if any(keyword in input_text for keyword in vacation_keywords):
            return "round_trip"
        
        return "one_way"  # Conservative default