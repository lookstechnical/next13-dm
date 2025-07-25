/**
 * Storage service for managing localStorage operations
 * This can be easily swapped out for a database service later
 */

export interface StorageService {
  get<T>(key: string): T | null;
  set<T>(key: string, data: T): void;
  remove(key: string): void;
  clear(): void;
}

class LocalStorageService implements StorageService {
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error reading from localStorage for key ${key}:`, error);
      return null;
    }
  }

  set<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error writing to localStorage for key ${key}:`, error);
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from localStorage for key ${key}:`, error);
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
}

// Export singleton instance
export const storageService = new LocalStorageService();