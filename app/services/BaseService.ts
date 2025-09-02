import { convertKeysToCamelCase } from "../utils/helpers";
import { CacheManager, dynamicDataCache, staticDataCache } from "./CacheManager";

interface CacheOptions {
  enabled?: boolean;
  ttl?: number;
  cacheManager?: CacheManager;
}

/**
 * BaseService provides common functionality and patterns used across all services
 */
export abstract class BaseService {
  protected client: any;
  protected cacheManager: CacheManager;
  protected cacheEnabled: boolean;

  constructor(client: any, cacheManager?: CacheManager) {
    this.client = client;
    this.cacheManager = cacheManager || dynamicDataCache;
    this.cacheEnabled = true;
  }

  /**
   * Enable or disable caching for this service instance
   */
  protected setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
  }

  /**
   * Invalidate cache entries for a specific table
   */
  protected invalidateTableCache(tableName: string): void {
    if (!this.cacheEnabled) return;
    
    // Pattern to match any cache key containing this table name
    const pattern = `^${tableName}:`;
    const invalidated = this.cacheManager.deletePattern(pattern);
    
    if (invalidated > 0) {
      console.log(`[BaseService] Invalidated ${invalidated} cache entries for table: ${tableName}`);
    }
  }

  /**
   * Invalidate cache entries for a specific record
   */
  protected invalidateRecordCache(tableName: string, id: string): void {
    if (!this.cacheEnabled) return;
    
    // Delete specific record cache entries
    const patterns = [
      `${tableName}:getById:${id}`,
      `${tableName}:getAll:`,  // All list queries might include this record
      `${tableName}:getByTeam:` // Team queries might include this record
    ];
    
    let totalInvalidated = 0;
    patterns.forEach(pattern => {
      totalInvalidated += this.cacheManager.deletePattern(pattern);
    });
    
    if (totalInvalidated > 0) {
      console.log(`[BaseService] Invalidated ${totalInvalidated} cache entries for record: ${tableName}:${id}`);
    }
  }

  /**
   * Standard error handling for database operations
   * Handles PGRST116 (PostgreSQL not found) by returning null
   * Throws all other errors
   */
  protected handleError(error: any, returnNullOnNotFound: boolean = true): never | null {
    if (error) {
      if (error.code === "PGRST116" && returnNullOnNotFound) {
        return null;
      }
      throw error;
    }
    return null;
  }

  /**
   * Transform database response to camelCase with error handling
   */
  protected transformResponse<T>(data: any, error: any, fallback: T[] = [] as T[]): T[] | T | null {
    this.handleError(error, false);
    if (Array.isArray(fallback)) {
      return convertKeysToCamelCase(data) || fallback;
    }
    return convertKeysToCamelCase(data);
  }

  /**
   * Transform single database response to camelCase with error handling
   */
  protected transformSingleResponse<T>(data: any, error: any): T | null {
    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }
    return convertKeysToCamelCase(data);
  }

  /**
   * Standard delete operation that returns boolean success
   */
  protected async performDelete(tableName: string, id: string): Promise<boolean> {
    const { error } = await this.client
      .from(tableName)
      .delete()
      .eq("id", id);
    
    if (error) throw error;
    
    // Invalidate cache after successful deletion
    this.invalidateRecordCache(tableName, id);
    
    return true;
  }

  /**
   * Standard get by ID operation with caching
   */
  protected async getById<T>(
    tableName: string, 
    id: string, 
    selectFields: string = "*",
    cacheOptions?: CacheOptions
  ): Promise<T | null> {
    const cacheKey = this.cacheManager.generateKey([tableName, 'getById', id, selectFields]);
    
    // Try cache first if enabled
    if (this.cacheEnabled && (cacheOptions?.enabled !== false)) {
      const cached = this.cacheManager.get<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    const { data, error } = await this.client
      .from(tableName)
      .select(selectFields)
      .eq("id", id)
      .single();

    const result = this.transformSingleResponse<T>(data, error);

    // Cache the result if caching is enabled and we got valid data
    if (this.cacheEnabled && (cacheOptions?.enabled !== false) && result !== null) {
      this.cacheManager.set(cacheKey, result, cacheOptions?.ttl);
    }

    return result;
  }

  /**
   * Standard get all operation with optional ordering and caching
   */
  protected async getAll<T>(
    tableName: string, 
    selectFields: string = "*", 
    orderBy: string = "name",
    filters?: Record<string, any>,
    cacheOptions?: CacheOptions
  ): Promise<T[]> {
    const cacheKey = this.cacheManager.generateKey([
      tableName, 
      'getAll', 
      selectFields, 
      orderBy, 
      JSON.stringify(filters || {})
    ]);
    
    // Try cache first if enabled
    if (this.cacheEnabled && (cacheOptions?.enabled !== false)) {
      const cached = this.cacheManager.get<T[]>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    let query = this.client
      .from(tableName)
      .select(selectFields);

    // Apply filters if provided
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { data, error } = await query.order(orderBy);
    const result = this.transformResponse<T>(data, error, []);

    // Ensure we return an array and cache valid results
    const arrayResult = Array.isArray(result) ? result : [];
    
    if (this.cacheEnabled && (cacheOptions?.enabled !== false) && arrayResult.length >= 0) {
      this.cacheManager.set(cacheKey, arrayResult, cacheOptions?.ttl);
    }

    return arrayResult;
  }

  /**
   * Standard create operation with snake_case field mapping
   */
  protected async create<T, CreateData = Partial<T>>(
    tableName: string,
    data: CreateData,
    fieldMapping?: Record<string, string>
  ): Promise<T> {
    let insertData = { ...data } as any;

    // Apply field mapping if provided (camelCase to snake_case)
    if (fieldMapping) {
      insertData = {};
      Object.entries(data as any).forEach(([key, value]) => {
        const mappedKey = fieldMapping[key] || key;
        insertData[mappedKey] = value;
      });
    }

    const { data: result, error } = await this.client
      .from(tableName)
      .insert(insertData)
      .select()
      .single();

    this.handleError(error, false);
    const transformedResult = convertKeysToCamelCase(result);
    
    // Invalidate cache after successful creation
    this.invalidateTableCache(tableName);
    
    return transformedResult;
  }

  /**
   * Standard update operation with conditional field mapping
   */
  protected async update<T>(
    tableName: string,
    id: string,
    updates: Partial<T>,
    fieldMapping?: Record<string, string>
  ): Promise<T | null> {
    let updateData: any = {};

    // Apply conditional field mapping
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        const mappedKey = fieldMapping?.[key] || key;
        updateData[mappedKey] = value;
      }
    });

    const { data, error } = await this.client
      .from(tableName)
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    const result = this.transformSingleResponse<T>(data, error);
    
    // Invalidate cache after successful update
    if (result !== null) {
      this.invalidateRecordCache(tableName, id);
    }
    
    return result;
  }

  /**
   * Get records by team ID (common pattern across services)
   */
  protected async getByTeam<T>(
    tableName: string,
    teamId: string,
    selectFields: string = "*",
    orderBy: string = "name"
  ): Promise<T[]> {
    return this.getAll<T>(tableName, selectFields, orderBy, { team_id: teamId });
  }

  /**
   * Helper method to build dynamic update object
   * Useful for services with many optional fields
   */
  protected buildUpdateData(updates: Record<string, any>, fieldMapping?: Record<string, string>): Record<string, any> {
    const updateData: any = {};
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        const mappedKey = fieldMapping?.[key] || key;
        updateData[mappedKey] = value;
      }
    });
    
    return updateData;
  }
}