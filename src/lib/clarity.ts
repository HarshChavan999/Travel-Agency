/**
 * Microsoft Clarity helper utilities
 * Docs: https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-api
 */

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

/**
 * Identify a user in Microsoft Clarity session recordings
 */
export const identifyUser = (customId: string, customSessionId?: string, customPageId?: string, friendlyName?: string) => {
  if (typeof window !== 'undefined' && typeof window.clarity === 'function') {
    window.clarity('identify', customId, customSessionId, customPageId, friendlyName);
  }
};

/**
 * Set custom tags/filters for Microsoft Clarity (e.g. user_role, plan_type)
 */
export const setClarityTag = (key: string, value: string | string[]) => {
  if (typeof window !== 'undefined' && typeof window.clarity === 'function') {
    window.clarity('set', key, value);
  }
};

/**
 * Trigger a custom event in Microsoft Clarity
 */
export const trackClarityEvent = (eventName: string) => {
  if (typeof window !== 'undefined' && typeof window.clarity === 'function') {
    window.clarity('event', eventName);
  }
};
