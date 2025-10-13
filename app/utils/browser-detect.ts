/**
 * Browser and storage detection utilities
 * Helps diagnose authentication issues related to cookies and localStorage
 */

export interface StorageSupport {
  cookiesEnabled: boolean;
  localStorageEnabled: boolean;
  sessionStorageEnabled: boolean;
  canWriteCookies: boolean;
  thirdPartyCookiesBlocked: boolean;
}

export interface BrowserInfo {
  name: string;
  isSafari: boolean;
  isFirefox: boolean;
  isChrome: boolean;
  isBrave: boolean;
  isEdge: boolean;
}

/**
 * Detect browser type
 */
export function detectBrowser(): BrowserInfo {
  const userAgent = navigator.userAgent.toLowerCase();

  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isFirefox = userAgent.includes('firefox');
  const isChrome = userAgent.includes('chrome') && !userAgent.includes('edg');
  const isEdge = userAgent.includes('edg');
  const isBrave = (navigator as any).brave !== undefined;

  let name = 'Unknown';
  if (isBrave) name = 'Brave';
  else if (isSafari) name = 'Safari';
  else if (isFirefox) name = 'Firefox';
  else if (isEdge) name = 'Edge';
  else if (isChrome) name = 'Chrome';

  return {
    name,
    isSafari,
    isFirefox,
    isChrome,
    isBrave,
    isEdge,
  };
}

/**
 * Test if cookies can be written
 */
function testCookieWrite(): boolean {
  try {
    document.cookie = 'cookietest=1; SameSite=Lax';
    const result = document.cookie.includes('cookietest=1');
    // Clean up
    document.cookie = 'cookietest=1; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    return result;
  } catch {
    return false;
  }
}

/**
 * Test if localStorage is accessible
 */
function testLocalStorage(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Test if sessionStorage is accessible
 */
function testSessionStorage(): boolean {
  try {
    const test = '__storage_test__';
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Comprehensive storage support detection
 */
export function detectStorageSupport(): StorageSupport {
  return {
    cookiesEnabled: navigator.cookieEnabled,
    localStorageEnabled: testLocalStorage(),
    sessionStorageEnabled: testSessionStorage(),
    canWriteCookies: testCookieWrite(),
    thirdPartyCookiesBlocked: navigator.cookieEnabled && !testCookieWrite(),
  };
}

/**
 * Get browser-specific instructions for enabling cookies
 */
export function getCookieEnableInstructions(browserInfo: BrowserInfo): string {
  if (browserInfo.isSafari) {
    return `Safari: Settings → Privacy → Uncheck "Prevent cross-site tracking" or add this site to exceptions`;
  }

  if (browserInfo.isFirefox) {
    return `Firefox: Settings → Privacy & Security → Set "Enhanced Tracking Protection" to Standard`;
  }

  if (browserInfo.isChrome) {
    return `Chrome: Settings → Privacy and security → Cookies → Allow all cookies (or add site exception)`;
  }

  if (browserInfo.isBrave) {
    return `Brave: Settings → Shields → Set "Cookies" to "All cookies allowed" for this site`;
  }

  if (browserInfo.isEdge) {
    return `Edge: Settings → Cookies and site permissions → Cookies → Allow all cookies`;
  }

  return `Please check your browser settings and enable cookies for this site`;
}

/**
 * Get human-readable error message for storage issues
 */
export function getStorageErrorMessage(storage: StorageSupport, browser: BrowserInfo): string | null {
  if (!storage.cookiesEnabled) {
    return `Cookies are disabled in your browser. Please enable cookies in your ${browser.name} settings.`;
  }

  if (!storage.canWriteCookies) {
    return `Cookies are blocked. ${getCookieEnableInstructions(browser)}`;
  }

  if (!storage.localStorageEnabled) {
    return `Local storage is disabled. Please enable local storage in your ${browser.name} settings or disable private/incognito mode.`;
  }

  if (storage.thirdPartyCookiesBlocked) {
    return `Third-party cookies are blocked. ${getCookieEnableInstructions(browser)}`;
  }

  return null;
}

/**
 * Comprehensive check with detailed error reporting
 */
export function checkAuthRequirements(): {
  supported: boolean;
  error: string | null;
  details: {
    storage: StorageSupport;
    browser: BrowserInfo;
  };
} {
  const storage = detectStorageSupport();
  const browser = detectBrowser();
  const error = getStorageErrorMessage(storage, browser);

  return {
    supported: !error,
    error,
    details: {
      storage,
      browser,
    },
  };
}
