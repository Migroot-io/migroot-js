// Auto-fill promo code in Outseta discount selector
(function() {
  console.log('🎟️ Promo code auto-fill script started');

  // Get promo code from localStorage
  function getPromoCode() {
    return localStorage.getItem("o-snippet.promo-code");
  }

  // Universal wait for element to be visible with callback
  function waitForVisible(selector, callback, options = {}) {
    const {
      maxAttempts = 10,
      delay = 300,
      timeout = 10000,
      checkFn = null // Custom check function (e.g., check if not disabled)
    } = options;

    let attempts = 0;
    const startTime = Date.now();

    function attempt() {
      attempts++;

      // Check timeout
      if (Date.now() - startTime > timeout) {
        console.log(`❌ Timeout waiting for: ${selector}`);
        return;
      }

      const element = document.querySelector(selector);

      // Check if element exists and passes custom check
      const isReady = element && (!checkFn || checkFn(element));

      if (isReady) {
        console.log(`✅ Found element: ${selector} (attempt ${attempts})`);
        callback(element);
        return;
      }

      if (attempts < maxAttempts) {
        setTimeout(attempt, delay);
      } else {
        console.log(`❌ Max attempts reached for: ${selector}`);
      }
    }

    attempt();
  }

  // Helper: Click element when visible
  function clickWhenVisible(selector, options = {}) {
    waitForVisible(selector, (element) => {
      element.click();
      console.log(`🖱️ Clicked: ${selector}`);
    }, options);
  }

  // Helper: Enter text when visible
  function enterTextWhenVisible(selector, text, options = {}) {
    waitForVisible(selector, (element) => {
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`⌨️ Entered text in: ${selector}`);
    }, options);
  }

  // Apply promo code workflow
  function applyPromoCodeWorkflow() {
    const promoCode = getPromoCode();

    if (!promoCode) {
      console.log('ℹ️ No promo code found in localStorage');
      return;
    }

    console.log('🎟️ Found promo code:', promoCode);

    // Step 1: Click "Add a discount code" link (if needed)
    clickWhenVisible('.o--DiscountSelector--discountSelector > a', {
      maxAttempts: 5,
      delay: 400,
      timeout: 3000,
      checkFn: (el) => !document.querySelector('input[placeholder="Discount code"]') // Only click if input not visible
    });

    // Step 2: Wait for input to appear, then fill it
    setTimeout(() => {
      enterTextWhenVisible('input[placeholder="Discount code"]', promoCode, {
        maxAttempts: 10,
        delay: 300,
        timeout: 5000,
        checkFn: (el) => !el.value // Only fill if empty
      });
    }, 2000);

    // Step 3: Click Apply button
    setTimeout(() => {
      waitForVisible('input[placeholder="Discount code"]', (input) => {
        const applyButton = input.parentElement?.querySelector('a');
        if (applyButton) {
          clickWhenVisible('input[placeholder="Discount code"]', {
            maxAttempts: 5,
            delay: 500,
            timeout: 5000,
            checkFn: (el) => {
              const btn = el.parentElement?.querySelector('a');
              return btn && btn.textContent.trim() === 'Apply' && !btn.classList.contains('o--disabled');
            }
          });

          // Execute click callback manually for Apply button
          waitForVisible('input[placeholder="Discount code"]', (el) => {
            const btn = el.parentElement?.querySelector('a');
            if (btn && btn.textContent.trim() === 'Apply' && !btn.classList.contains('o--disabled')) {
              btn.click();
              console.log('✅ Apply button clicked');
            }
          }, {
            maxAttempts: 5,
            delay: 500,
            timeout: 3000
          });
        }
      }, {
        maxAttempts: 1,
        delay: 0
      });
    }, 4000);
  }

  // Auto-trigger when plan is selected
  function setupAutoDiscount() {
    const promoCode = getPromoCode();
    if (!promoCode) return;

    // Watch for plan selection buttons
    document.addEventListener('click', (e) => {
      const planButton = e.target.closest('[data-plan-uid]');
      if (planButton) {
        console.log('📦 Plan selected, starting promo code workflow...');

        // Wait for discount selector to appear
        setTimeout(() => {
          applyPromoCodeWorkflow();
        }, 500);
      }
    });
  }

  // Initialize
  setupAutoDiscount();

  console.log('✅ Promo code auto-fill script initialized (waiting for plan selection)');
})();
