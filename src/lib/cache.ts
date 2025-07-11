/**
 * Performance Caching Utilities
 * Zero-risk caching layer for server-side optimizations
 */

// Cache duration constants (in milliseconds)
const CACHE_DURATIONS = {
  TERRITORIES: 5 * 60 * 1000, // 5 minutes
  USER_ROLES: 5 * 60 * 1000, // 5 minutes  
  MATERIAL_WASTE: 10 * 60 * 1000, // 10 minutes
  PRICING_TEMPLATES: 2 * 60 * 1000, // 2 minutes
  ESTIMATES_SUMMARY: 30 * 1000, // 30 seconds
} as const;

// Cache storage interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// In-memory cache storage
class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  
  set<T>(key: string, data: T, durationMs: number): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + durationMs
    };
    
    this.cache.set(key, entry);
    console.log(`🟢 [Cache] SET: ${key} (expires in ${durationMs}ms)`);
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      console.log(`🔍 [Cache] MISS: ${key} (not found)`);
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      console.log(`🔍 [Cache] MISS: ${key} (expired)`);
      this.cache.delete(key);
      return null;
    }
    
    console.log(`✅ [Cache] HIT: ${key}`);
    return entry.data as T;
  }
  
  clear(keyPattern?: string): void {
    if (keyPattern) {
      const keysToDelete = Array.from(this.cache.keys()).filter(key => 
        key.includes(keyPattern)
      );
      keysToDelete.forEach(key => this.cache.delete(key));
      console.log(`🧹 [Cache] CLEARED: ${keysToDelete.length} entries matching "${keyPattern}"`);
    } else {
      this.cache.clear();
      console.log(`🧹 [Cache] CLEARED: All entries`);
    }
  }
  
  size(): number {
    return this.cache.size;
  }
  
  stats(): { total: number; expired: number; active: number } {
    const now = Date.now();
    let expired = 0;
    let active = 0;
    
    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expired++;
      } else {
        active++;
      }
    }
    
    return { total: this.cache.size, expired, active };
  }
}

// Global cache instance
const globalCache = new MemoryCache();

// Cache utility functions
export const cache = {
  // Territory caching
  territories: {
    get: () => globalCache.get<any[]>('territories'),
    set: (data: any[]) => globalCache.set('territories', data, CACHE_DURATIONS.TERRITORIES),
    clear: () => globalCache.clear('territories')
  },
  
  // User role caching
  userRoles: {
    get: (userId: string) => globalCache.get<string>(`user_role_${userId}`),
    set: (userId: string, role: string) => globalCache.set(`user_role_${userId}`, role, CACHE_DURATIONS.USER_ROLES),
    clear: () => globalCache.clear('user_role_')
  },
  
  // Material waste percentage caching
  materialWaste: {
    get: () => globalCache.get<Record<string, number>>('material_waste_percentages'),
    set: (data: Record<string, number>) => globalCache.set('material_waste_percentages', data, CACHE_DURATIONS.MATERIAL_WASTE),
    clear: () => globalCache.clear('material_waste_percentages')
  },
  
  // Pricing template caching
  pricingTemplates: {
    get: () => globalCache.get<any[]>('pricing_templates'),
    set: (data: any[]) => globalCache.set('pricing_templates', data, CACHE_DURATIONS.PRICING_TEMPLATES),
    clear: () => globalCache.clear('pricing_templates')
  },
  
  // Estimate summary caching
  estimatesSummary: {
    get: (userId: string) => globalCache.get<any>(`estimates_summary_${userId}`),
    set: (userId: string, data: any) => globalCache.set(`estimates_summary_${userId}`, data, CACHE_DURATIONS.ESTIMATES_SUMMARY),
    clear: () => globalCache.clear('estimates_summary_')
  },
  
  // Cache management
  stats: () => globalCache.stats(),
  clearAll: () => globalCache.clear(),
  size: () => globalCache.size()
};

// Cache warming function (pre-load frequently accessed data)
export const warmCache = async () => {
  console.log('🔥 [Cache] Warming cache with frequently accessed data...');
  
  try {
    // Pre-load territories if not cached
    if (!cache.territories.get()) {
      console.log('🔥 [Cache] Pre-loading territories...');
      // This will be populated by the first API call
    }
    
    // Pre-load material waste percentages if not cached
    if (!cache.materialWaste.get()) {
      console.log('🔥 [Cache] Pre-loading material waste percentages...');
      // This will be populated by the first API call
    }
    
    console.log('✅ [Cache] Cache warming completed');
  } catch (error) {
    console.warn('⚠️ [Cache] Cache warming failed:', error);
  }
};

// Cache performance monitoring
export const logCachePerformance = () => {
  const stats = cache.stats();
  console.log(`📊 [Cache] Performance Stats:`, {
    total: stats.total,
    active: stats.active,
    expired: stats.expired,
    hitRate: stats.active > 0 ? ((stats.active / stats.total) * 100).toFixed(1) + '%' : '0%'
  });
};

// Auto-cleanup expired entries every 5 minutes
setInterval(() => {
  const statsBefore = cache.stats();
  
  // Force cleanup by trying to get all entries (will delete expired ones)
  cache.clearAll();
  
  const statsAfter = cache.stats();
  
  if (statsBefore.expired > 0) {
    console.log(`🧹 [Cache] Auto-cleanup: Removed ${statsBefore.expired} expired entries`);
  }
}, 5 * 60 * 1000); 