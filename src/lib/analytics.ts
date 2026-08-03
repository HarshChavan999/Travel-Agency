import { sendGAEvent } from '@next/third-parties/google';

/**
 * Tracks a custom event in Google Analytics 4.
 * 
 * @param action - The name of the event (e.g., 'click', 'submit_enquiry', 'search_packages')
 * @param params - Additional parameter key-value pairs to pass along with the event
 */
export const trackGAEvent = (action: string, params: Record<string, any> = {}) => {
  if (typeof window !== 'undefined') {
    sendGAEvent('event', action, params);
  }
};
