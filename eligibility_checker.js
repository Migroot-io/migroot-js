// Eligibility Checker for Digital Nomad Visas
// UI logic for quiz form - uses EligibilityChecker and MultiStepFormManager from mg_helpers.js

// Note: Core classes (EligibilityChecker, MultiStepFormManager) are now in mg_helpers.js
// This file only contains helper functions and auto-initialization

// ============================================================================
// Helper Functions for Results Display
// ============================================================================

// Global function to toggle dropdown and close others
if (typeof window !== 'undefined') {
  window.toggleResultDropdown = function(event, button) {
    event.stopPropagation();

    // Close all other dropdowns
    document.querySelectorAll('.result-reasons-dropdown.active').forEach(dropdown => {
      dropdown.classList.remove('active');
    });

    // Toggle current dropdown
    const dropdown = button.nextElementSibling;
    if (dropdown) {
      dropdown.classList.toggle('active');
    }
  };

  // Close all dropdowns when clicking outside
  document.addEventListener('click', function(event) {
    if (!event.target.closest('.result-info-btn') && !event.target.closest('.result-reasons-dropdown')) {
      document.querySelectorAll('.result-reasons-dropdown.active').forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    }
  });
}

// ============================================================================
// Auto-initialization
// ============================================================================

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    // Check if quiz exists on page
    const quizExists = document.querySelector('.tst-question_1');
    if (!quizExists) return;

    /**
     * Initialize quiz with retry logic
     * Waits for MultiStepFormManager to be loaded from mg_helpers.js
     */
    function initQuiz() {
      if (typeof MultiStepFormManager !== 'undefined') {
        console.log('MultiStepFormManager loaded, initializing quiz...');

        const formManager = new MultiStepFormManager({
          totalSteps: 7
        });
        formManager.init();

        // Expose to window for debugging
        window.quizFormManager = formManager;

        return true;
      }
      return false;
    }

    // Try to initialize immediately
    if (initQuiz()) return;

    // If not available, retry with timeout
    let retries = 0;
    const maxRetries = 10; // Max 10 retries = 1 second
    const retryInterval = 100; // Check every 100ms

    console.log('MultiStepFormManager not loaded yet, waiting...');

    const retryTimer = setInterval(function() {
      retries++;

      if (initQuiz()) {
        clearInterval(retryTimer);
        console.log(`Quiz initialized after ${retries} retries (${retries * retryInterval}ms)`);
      } else if (retries >= maxRetries) {
        clearInterval(retryTimer);
        console.error('MultiStepFormManager is not loaded after 1 second. Make sure mg_helpers.js is loaded before eligibility_checker.js');
      }
    }, retryInterval);
  });
}
