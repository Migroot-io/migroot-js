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
    if (quizExists) {
      const formManager = new MultiStepFormManager({
        totalSteps: 7
      });
      formManager.init();

      // Expose to window for debugging
      window.quizFormManager = formManager;
    }
  });
}
