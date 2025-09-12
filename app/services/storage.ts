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
  private isLocalStorageAvailable(): boolean {
    try {
      return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
    } catch {
      return false;
    }
  }

  get<T>(key: string): T | null {
    if (!this.isLocalStorageAvailable()) {
      return null;
    }
    
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error reading from localStorage for key ${key}:`, error);
      return null;
    }
  }

  set<T>(key: string, data: T): void {
    if (!this.isLocalStorageAvailable()) {
      return;
    }
    
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error writing to localStorage for key ${key}:`, error);
    }
  }

  remove(key: string): void {
    if (!this.isLocalStorageAvailable()) {
      return;
    }
    
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from localStorage for key ${key}:`, error);
    }
  }

  clear(): void {
    if (!this.isLocalStorageAvailable()) {
      return;
    }
    
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
}

// Export singleton instance
export const storageService = new LocalStorageService();