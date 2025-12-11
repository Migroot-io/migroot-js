// Auto-fill initialization
// Uses AutoFillHelper class from mg_helpers.js
// This file only contains auto-initialization logic

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    /**
     * Initialize auto-fill with retry logic
     * Waits for AutoFillHelper to be loaded from mg_helpers.js
     */
    function initAutoFill() {
      if (typeof AutoFillHelper !== 'undefined') {
        console.log('AutoFillHelper loaded, initializing auto-fill...');

        // Check which page we're on and initialize appropriate auto-fill
        let initialized = false;

        // Email auto-fill ONLY for /sign-up page
        const isSignUpPage = window.location.pathname.includes('/sign-up');
        if (isSignUpPage) {
          console.log('Sign-up page detected, initializing email auto-fill...');
          try {
            AutoFillHelper.initEmailAutoFill();
            initialized = true;
          } catch (e) {
            console.error('Failed to initialize email auto-fill:', e);
          }
        }

        // Promo code auto-fill for pages with plan buttons
        // Only initializes if promo code exists in localStorage
        const hasPromoCode = localStorage.getItem("o-snippet.promo-code");
        const hasPlanButtons = document.querySelector('[data-plan-uid]') ||
                               document.querySelector('.o--DiscountSelector--discountSelector');

        if (hasPromoCode && hasPlanButtons) {
          console.log('Plan selection page detected with promo code, initializing promo code auto-fill...');
          try {
            AutoFillHelper.initPromoCodeAutoFill();
            initialized = true;
          } catch (e) {
            console.error('Failed to initialize promo code auto-fill:', e);
          }
        }

        return initialized;
      }
      return false;
    }

    // Try to initialize immediately
    if (initAutoFill()) return;

    // If not available, retry with timeout
    let retries = 0;
    const maxRetries = 10; // Max 10 retries = 1 second
    const retryInterval = 100; // Check every 100ms

    console.log('AutoFillHelper not loaded yet, waiting...');

    const retryTimer = setInterval(function() {
      retries++;

      if (initAutoFill()) {
        clearInterval(retryTimer);
        console.log(`Auto-fill initialized after ${retries} retries (${retries * retryInterval}ms)`);
      } else if (retries >= maxRetries) {
        clearInterval(retryTimer);
        console.error('AutoFillHelper is not loaded after 1 second. Make sure mg_helpers.js is loaded before autofill_init.js');
      }
    }, retryInterval);
  });
}
