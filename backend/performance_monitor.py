import time
import asyncio
from typing import Dict, Any, List
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import json


@dataclass
class PerformanceMetrics:
    """Performance tracking for optimization"""
    request_count: int = 0
    total_response_time: float = 0.0
    gemini_calls: int = 0
    gemini_time: float = 0.0
    api_calls: int = 0
    api_time: float = 0.0
    cache_hits: int = 0
    cache_misses: int = 0
    errors: int = 0
    
    @property
    def avg_response_time(self) -> float:
        return self.total_response_time / max(self.request_count, 1)
    
    @property
    def cache_hit_rate(self) -> float:
        total_cache_requests = self.cache_hits + self.cache_misses
        return self.cache_hits / max(total_cache_requests, 1)


class PerformanceMonitor:
    """Monitor and optimize system performance"""
    
    def __init__(self):
        self.metrics = PerformanceMetrics()
        self.request_history: List[Dict[str, Any]] = []
        self.slow_requests: List[Dict[str, Any]] = []
        
    def start_request(self) -> float:
        """Start timing a request"""
        return time.time()
    
    def end_request(self, start_time: float, request_type: str, success: bool = True):
        """End timing and record metrics"""
        duration = time.time() - start_time
        
        self.metrics.request_count += 1
        self.metrics.total_response_time += duration
        
        if not success:
            self.metrics.errors += 1
        
        # Record request details
        request_record = {
            "timestamp": datetime.now().isoformat(),
            "type": request_type,
            "duration": duration,
            "success": success
        }
        
        self.request_history.append(request_record)
        
        # Track slow requests (> 3 seconds)
        if duration > 3.0:
            self.slow_requests.append(request_record)
        
        # Keep only recent history (last 100 requests)
        if len(self.request_history) > 100:
            self.request_history = self.request_history[-100:]
    
    def record_gemini_call(self, duration: float):
        """Record Gemini API call metrics"""
        self.metrics.gemini_calls += 1
        self.metrics.gemini_time += duration
    
    def record_api_call(self, duration: float):
        """Record MCP API call metrics"""
        self.metrics.api_calls += 1
        self.metrics.api_time += duration
    
    def record_cache_hit(self):
        """Record cache hit"""
        self.metrics.cache_hits += 1
    
    def record_cache_miss(self):
        """Record cache miss"""
        self.metrics.cache_misses += 1
    
    def get_performance_report(self) -> Dict[str, Any]:
        """Generate performance report"""
        return {
            "summary": {
                "total_requests": self.metrics.request_count,
                "avg_response_time": round(self.metrics.avg_response_time, 3),
                "cache_hit_rate": round(self.metrics.cache_hit_rate * 100, 1),
                "error_rate": round(self.metrics.errors / max(self.metrics.request_count, 1) * 100, 1)
            },
            "gemini_performance": {
                "total_calls": self.metrics.gemini_calls,
                "avg_time": round(self.metrics.gemini_time / max(self.metrics.gemini_calls, 1), 3),
                "total_time": round(self.metrics.gemini_time, 3)
            },
            "api_performance": {
                "total_calls": self.metrics.api_calls,
                "avg_time": round(self.metrics.api_time / max(self.metrics.api_calls, 1), 3),
                "total_time": round(self.metrics.api_time, 3)
            },
            "slow_requests": len(self.slow_requests),
            "recent_requests": self.request_history[-10:] if self.request_history else []
        }
    
    def get_optimization_suggestions(self) -> List[str]:
        """Generate optimization suggestions"""
        suggestions = []
        
        if self.metrics.avg_response_time > 2.0:
            suggestions.append("Average response time is high - consider more aggressive caching")
        
        if self.metrics.cache_hit_rate < 0.3:
            suggestions.append("Low cache hit rate - expand caching strategy")
        
        if self.metrics.gemini_time / max(self.metrics.total_response_time, 1) > 0.6:
            suggestions.append("Gemini calls taking too much time - use more local processing")
        
        if len(self.slow_requests) > 5:
            suggestions.append("Multiple slow requests detected - check API timeouts")
        
        if self.metrics.errors / max(self.metrics.request_count, 1) > 0.1:
            suggestions.append("High error rate - improve error handling and fallbacks")
        
        return suggestions


class SmartCache:
    """Intelligent caching system"""
    
    def __init__(self, max_size: int = 1000, ttl_seconds: int = 3600):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self.access_count: Dict[str, int] = {}
        self.monitor = PerformanceMonitor()
    
    def _generate_key(self, request_type: str, params: Dict[str, Any]) -> str:
        """Generate cache key"""
        # Sort params for consistent keys
        sorted_params = json.dumps(params, sort_keys=True)
        return f"{request_type}:{hash(sorted_params)}"
    
    def get(self, request_type: str, params: Dict[str, Any]) -> Any:
        """Get from cache"""
        key = self._generate_key(request_type, params)
        
        if key in self.cache:
            entry = self.cache[key]
            
            # Check TTL
            if time.time() - entry["timestamp"] < self.ttl_seconds:
                self.access_count[key] = self.access_count.get(key, 0) + 1
                self.monitor.record_cache_hit()
                return entry["data"]
            else:
                # Expired
                del self.cache[key]
                if key in self.access_count:
                    del self.access_count[key]
        
        self.monitor.record_cache_miss()
        return None
    
    def set(self, request_type: str, params: Dict[str, Any], data: Any):
        """Set cache entry"""
        key = self._generate_key(request_type, params)
        
        # Evict if at max size
        if len(self.cache) >= self.max_size:
            self._evict_lru()
        
        self.cache[key] = {
            "data": data,
            "timestamp": time.time()
        }
        self.access_count[key] = 1
    
    def _evict_lru(self):
        """Evict least recently used entry"""
        if not self.cache:
            return
        
        # Find least accessed key
        lru_key = min(self.access_count.keys(), key=lambda k: self.access_count[k])
        
        del self.cache[lru_key]
        del self.access_count[lru_key]
    
    def clear_expired(self):
        """Clear expired entries"""
        current_time = time.time()
        expired_keys = []
        
        for key, entry in self.cache.items():
            if current_time - entry["timestamp"] >= self.ttl_seconds:
                expired_keys.append(key)
        
        for key in expired_keys:
            del self.cache[key]
            if key in self.access_count:
                del self.access_count[key]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            "size": len(self.cache),
            "max_size": self.max_size,
            "hit_rate": self.monitor.metrics.cache_hit_rate,
            "total_hits": self.monitor.metrics.cache_hits,
            "total_misses": self.monitor.metrics.cache_misses
        }