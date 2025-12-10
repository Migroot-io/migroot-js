// Eligibility Checker for Digital Nomad Visas
// UI logic for quiz form - uses EligibilityChecker from mg_helpers.js for evaluation

// Note: Core evaluation functions (calculateRequiredIncome, normalizeToArray,
// parseIncomeRange, evaluateMatch) are now in mg_helpers.js as EligibilityChecker class

// ============================================================================
// Multi-Step Form Navigation
// ============================================================================

/**
 * Multi-step form manager
 */
class MultiStepFormManager {
  constructor(config = {}) {
    this.currentStep = 1;
    this.totalSteps = config.totalSteps || 8;
    this.formData = {};
    this.skipStep2 = false; // Flag to skip step 2 when work_type is "remotely"
    // Use existing class structure from /check-eligibility page
    this.stepClassPrefix = config.stepClassPrefix || 'tst-question_';
    this.nextButtonSelector = config.nextButtonSelector || '[data-move="next"]';
    this.prevButtonSelector = config.prevButtonSelector || '[data-move="back"]';
    this.submitButtonSelector = config.submitButtonSelector || '[data-move="results"]';
    this.resultsContainerSelector = config.resultsContainerSelector || '#quiz-results';
  }

  /**
   * Initialize the multi-step form
   */
  init() {
    // Get all steps using existing class structure (.tst-question_1, .tst-question_2, etc.)
    this.steps = [];
    for (let i = 1; i <= this.totalSteps; i++) {
      const step = document.querySelector(`.${this.stepClassPrefix}${i}`);
      if (step) {
        this.steps.push(step);
      }
    }

    this.nextButtons = document.querySelectorAll(this.nextButtonSelector);
    this.prevButtons = document.querySelectorAll(this.prevButtonSelector);
    this.submitButton = document.querySelector(this.submitButtonSelector);
    this.resultsContainer = document.querySelector(this.resultsContainerSelector);

    if (this.steps.length === 0) {
      console.warn('No quiz steps found. Make sure elements have .tst-question_N classes.');
      return;
    }

    // Attach event listeners
    this.nextButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.nextStep();
      });
    });

    this.prevButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.prevStep();
      });
    });

    if (this.submitButton) {
      this.submitButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.submitForm();
      });
    }

    // Show first step
    this.showStep(1);

    // Setup form logic (conditional skips, exclusive checkboxes)
    this.setupFormLogic();

    console.log(`Multi-step form initialized with ${this.steps.length} steps`);
  }

  /**
   * Setup form logic - conditional skips and exclusive checkboxes
   */
  setupFormLogic() {
    // Step 1: Skip step 2 if "remotely" is selected
    const workTypeStep = this.steps[0]; // Step 1 (index 0)
    if (workTypeStep) {
      const workTypeInputs = workTypeStep.querySelectorAll('input[name="work_type"]');
      workTypeInputs.forEach(input => {
        input.addEventListener('change', () => {
          if (input.checked && input.value === 'remotely') {
            // Auto-set remote_work to "yes" and skip step 2
            this.formData.remote_work = 'yes';
            this.skipStep2 = true;
          } else if (input.checked) {
            this.skipStep2 = false;
          }
        });
      });
    }

    // Step 3: "solo" is exclusive with other move_with options (including pets)
    const moveWithStep = this.steps[2]; // Step 3 (index 2)
    if (moveWithStep) {
      const soloCheckbox = moveWithStep.querySelector('input[name="move_with[]"][value="solo"]');
      const otherCheckboxes = moveWithStep.querySelectorAll('input[name="move_with[]"]:not([value="solo"])');

      if (soloCheckbox) {
        soloCheckbox.addEventListener('change', () => {
          if (soloCheckbox.checked) {
            // Uncheck all other options when "solo" is selected
            otherCheckboxes.forEach(cb => cb.checked = false);
          }
        });
      }

      otherCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
          if (cb.checked && soloCheckbox) {
            // Uncheck "solo" when any other option is selected
            soloCheckbox.checked = false;
          }
        });
      });
    }

    // Step 5: "neither" is exclusive with degree/experience
    const experienceStep = this.steps[4]; // Step 5 (index 4)
    if (experienceStep) {
      const neitherCheckbox = experienceStep.querySelector('input[name="experience[]"][value="neither"]');
      const otherCheckboxes = experienceStep.querySelectorAll('input[name="experience[]"]:not([value="neither"])');

      if (neitherCheckbox) {
        neitherCheckbox.addEventListener('change', () => {
          if (neitherCheckbox.checked) {
            // Uncheck all other options when "neither" is selected
            otherCheckboxes.forEach(cb => cb.checked = false);
          }
        });
      }

      otherCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
          if (cb.checked && neitherCheckbox) {
            // Uncheck "neither" when any other option is selected
            neitherCheckbox.checked = false;
          }
        });
      });
    }
  }

  /**
   * Show specific step and hide others
   * @param {number} stepNumber - Step number to show (1-indexed)
   */
  showStep(stepNumber) {
    this.steps.forEach((step, index) => {
      if (index + 1 === stepNumber) {
        step.style.display = 'block';
        step.classList.add('active');
      } else {
        step.style.display = 'none';
        step.classList.remove('active');
      }
    });

    this.currentStep = stepNumber;
    this.updateProgress();
  }

  /**
   * Move to next step
   */
  nextStep() {
    // Validate current step before moving
    if (!this.validateStep(this.currentStep)) {
      console.warn(`Validation failed for step ${this.currentStep}`);
      return;
    }

    // Collect data from current step
    this.collectStepData(this.currentStep);

    if (this.currentStep < this.totalSteps) {
      // Skip step 2 if "remotely" was selected in step 1
      if (this.currentStep === 1 && this.skipStep2) {
        this.showStep(3); // Skip to step 3
      } else {
        this.showStep(this.currentStep + 1);
      }
    }
  }

  /**
   * Move to previous step
   */
  prevStep() {
    if (this.currentStep > 1) {
      this.showStep(this.currentStep - 1);
    }
  }

  /**
   * Validate current step
   * @param {number} stepNumber - Step to validate
   * @returns {boolean} True if valid
   */
  validateStep(stepNumber) {
    const stepElement = this.steps[stepNumber - 1];
    if (!stepElement) return true;

    // Check if this is the last step (email step)
    const isLastStep = stepNumber === this.totalSteps;

    // On last step, only validate email input
    if (isLastStep) {
      const emailInput = stepElement.querySelector('input[type="email"], input[name="contact-email"]');
      if (emailInput) {
        if (!emailInput.value.trim()) {
          alert('Please enter your email to see results');
          return false;
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailInput.value.trim())) {
          alert('Please enter a valid email address');
          return false;
        }
      }
      return true; // Skip radio/checkbox validation on last step
    }

    // For other steps: validate radio buttons and checkboxes by name groups
    const radioNames = new Set();
    const checkboxNames = new Set();

    stepElement.querySelectorAll('input[type="radio"]').forEach(input => {
      if (input.name) radioNames.add(input.name);
    });

    stepElement.querySelectorAll('input[type="checkbox"]').forEach(input => {
      if (input.name) checkboxNames.add(input.name);
    });

    // Validate each radio group - must have one selected
    for (let name of radioNames) {
      const checked = stepElement.querySelector(`input[name="${name}"]:checked`);
      if (!checked) {
        alert('Please select an option to continue');
        return false;
      }
    }

    // Validate checkboxes - at least one should be checked if group exists
    for (let name of checkboxNames) {
      const checked = stepElement.querySelector(`input[name="${name}"]:checked`);
      if (!checked) {
        alert('Please select at least one option to continue');
        return false;
      }
    }

    // Validate select dropdowns
    const selects = stepElement.querySelectorAll('select');
    for (let select of selects) {
      if (!select.value || select.value === '' || select.value === 'placeholder') {
        alert('Please select an option from the dropdown');
        return false;
      }
    }

    return true;
  }

  /**
   * Collect data from a specific step
   * @param {number} stepNumber - Step to collect data from
   */
  collectStepData(stepNumber) {
    const stepElement = this.steps[stepNumber - 1];
    if (!stepElement) return;

    // Helper to clean field name from [] suffix
    const cleanFieldName = (name) => name ? name.replace(/\[\]$/, '') : name;

    // First, collect all checkbox names in this step to reset them
    const checkboxNames = new Set();
    stepElement.querySelectorAll('input[type="checkbox"]').forEach(input => {
      if (input.name) {
        const cleanName = cleanFieldName(input.name);
        checkboxNames.add(cleanName);
      }
    });

    // Reset checkbox arrays for this step
    checkboxNames.forEach(name => {
      this.formData[name] = [];
    });

    const inputs = stepElement.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const fieldName = cleanFieldName(input.name);

      if (input.type === 'checkbox') {
        // Special handling for opt-in checkbox (single boolean value)
        if (fieldName === 'opt_in' || fieldName === 'marketing_consent') {
          this.formData[fieldName] = input.checked; // boolean, not array
        } else if (input.checked) {
          this.formData[fieldName].push(input.value);
        }
      } else if (input.type === 'radio') {
        if (input.checked) {
          // Special handling for income fields - convert range to object
          if (fieldName === 'income' || fieldName === 'work_income') {
            this.formData[fieldName] = EligibilityChecker.parseIncomeRange(input.value);
          } else {
            this.formData[fieldName] = input.value;
          }
        }
      } else if (input.type === 'select-one' || input.tagName.toLowerCase() === 'select') {
        // Special handling for income fields - convert range to object
        if (fieldName === 'income' || fieldName === 'work_income') {
          this.formData[fieldName] = EligibilityChecker.parseIncomeRange(input.value);
        } else {
          this.formData[fieldName] = input.value;
        }
      } else {
        this.formData[fieldName] = input.value;
      }
    });
  }

  /**
   * Update progress indicator
   */
  updateProgress() {
    const progressElement = document.querySelector('[data-quiz-progress]');
    if (progressElement) {
      progressElement.textContent = `${this.currentStep} / ${this.totalSteps}`;
    }

    const progressBar = document.querySelector('[data-quiz-progress-bar]');
    if (progressBar) {
      const percent = (this.currentStep / this.totalSteps) * 100;
      progressBar.style.width = `${percent}%`;
    }
  }

  /**
   * Submit form and show results
   */
  submitForm() {
    // Validate final step
    if (!this.validateStep(this.currentStep)) {
      return;
    }

    // Collect data from ALL steps (not just current)
    for (let i = 1; i <= this.totalSteps; i++) {
      this.collectStepData(i);
    }

    console.log('All form data:', this.formData); // Debug log

    // Convert formData to userAnswers format
    const userAnswers = {
      work_type: this.formData.work_type || '',
      remote_work: this.formData.remote_work || '',
      move_with: EligibilityChecker.normalizeToArray(this.formData.move_with),
      // Income should already be parsed as {min, max} object from collectStepData
      work_income: (this.formData.work_income && typeof this.formData.work_income === 'object') ?
                   this.formData.work_income :
                   EligibilityChecker.parseIncomeRange(this.formData.work_income || ''),
      experience: EligibilityChecker.normalizeToArray(this.formData.experience)
    };

    console.log('User answers:', userAnswers); // Debug log

    // Evaluate match
    if (typeof HUB_CONFIG === 'undefined') {
      console.error('HUB_CONFIG is not defined');
      alert('Configuration error. Please try again later.');
      return;
    }

    const results = EligibilityChecker.evaluateMatch(userAnswers, HUB_CONFIG);

    // Save raw quiz answers to localStorage
    const quizData = {
      email: this.formData['contact-email'] || '',
      timestamp: new Date().toISOString(),
      work_type: this.formData.work_type || '',
      remote_work: this.formData.remote_work || '',
      move_with: EligibilityChecker.normalizeToArray(this.formData.move_with),
      work_income: userAnswers.work_income,
      experience: EligibilityChecker.normalizeToArray(this.formData.experience),
      help: this.formData.help || '',
      opt_in: this.formData.opt_in || false,
      matched_countries: Object.entries(results)
        .filter(([country, data]) => data.status === 'Match')
        .map(([country]) => country),
      evaluation_results: results
    };

    try {
      localStorage.setItem('quiz_results', JSON.stringify(quizData));
      console.log('Quiz results saved to localStorage:', quizData);
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }

    // Display results
    this.displayResults(results, userAnswers);
  }

  /**
   * Display evaluation results
   * @param {Object} results - Evaluation results
   * @param {Object} userAnswers - User answers
   */
  displayResults(results, userAnswers) {
    // Hide all steps (including the last one with email)
    this.steps.forEach(step => {
      step.style.display = 'none';
      step.classList.remove('active');
    });

    // Show results container
    if (this.resultsContainer) {
      this.resultsContainer.style.display = 'block';
      this.resultsContainer.innerHTML = this.renderResults(results, userAnswers);
    } else {
      // Fallback: create results container if it doesn't exist
      const lastStep = this.steps[this.steps.length - 1];
      let resultsDiv = document.getElementById('quiz-results');

      if (!resultsDiv) {
        resultsDiv = document.createElement('div');
        resultsDiv.id = 'quiz-results';
        resultsDiv.className = 'quiz-results-container';
        // Insert after last step
        lastStep.parentNode.insertBefore(resultsDiv, lastStep.nextSibling);
      }

      resultsDiv.innerHTML = this.renderResults(results, userAnswers);
      resultsDiv.style.display = 'block';
      this.resultsContainer = resultsDiv;
    }

    // Fill and submit Webflow form
    this.submitWebflowForm(results, userAnswers);
  }

  /**
   * Fill and submit Webflow form with quiz data
   * @param {Object} results - Evaluation results
   * @param {Object} userAnswers - User answers
   */
  submitWebflowForm(results, userAnswers) {
    setTimeout(() => {
      const form = document.querySelector('#eligibility_check_form_wf form');
      if (!form) {
        console.error('Webflow form not found');
        return;
      }

      // Convert results to simple object {country: status}
      const quizResults = {};
      Object.entries(results).forEach(([country, data]) => {
        quizResults[country] = data.status;
      });

      // Fill form fields
      form.querySelector('#email').value = this.formData['contact-email'] || '';
      form.querySelector('#work_type').value = this.formData.work_type || '';
      form.querySelector('#move_with').value = (userAnswers.move_with || []).join(', ');

      // Format income as "min, max"
      const income = userAnswers.work_income || {};
      form.querySelector('#income').value = income.min && income.max ?
        `${income.min}, ${income.max}` : '';

      form.querySelector('#experience').value = (userAnswers.experience || []).join(', ');
      form.querySelector('#quiz_results').value = JSON.stringify(quizResults);

      // Add missing fields
      form.querySelector('#remote_work').value = this.formData.remote_work || '';
      form.querySelector('#help').value = this.formData.help || '';

      // Opt-in checkbox (if exists)
      const optInCheckbox = form.querySelector('#opt_in, input[name="opt_in"]');
      if (optInCheckbox) {
        optInCheckbox.checked = this.formData.opt_in || false;
      }

      console.log('Submitting Webflow form with data:', {
        email: form.querySelector('#email').value,
        workType: form.querySelector('#work_type').value,
        moveWith: form.querySelector('#move_with').value,
        income: form.querySelector('#income').value,
        experience: form.querySelector('#experience').value,
        quizResults: quizResults
      });

      // Click submit button (triggers Webflow validation and submission)
      const submitButton = form.querySelector('input[type="submit"]');
      if (submitButton) {
        submitButton.click();
      } else {
        console.error('Submit button not found');
      }
    }, 100); // Small delay to ensure form is in DOM
  }

  /**
   * Render results HTML
   * @param {Object} results - Evaluation results
   * @param {Object} userAnswers - User answers
   * @returns {string} HTML string
   */
  renderResults(results, userAnswers) {
    const sortedCountries = Object.entries(results).sort((a, b) => {
      const order = { 'Match': 1, 'Maybe': 2, 'Not match': 3 };
      return order[a[1].status] - order[b[1].status];
    });

    let html = '<div class="eligibility-results">';
    html += '<h2>Your Eligibility Results</h2>';
    html += '<p>Based on your answers, here are your matches:</p>';
    html += '<div class="results-list">';

    sortedCountries.forEach(([country, data], index) => {
      const { status, reasons, requiredIncome, userIncome, incomeShortfall } = data;
      const statusClass = status.toLowerCase().replace(' ', '-');

      html += `<div class="result-item result-${statusClass}">`;
      html += `<div class="result-header">`;
      html += `<h3>${country}</h3>`;
      html += `<div class="result-status-container">`;
      html += `<span class="status status-${statusClass}">${status}</span>`;

      // Show checkmark icon for Match
      if (status === 'Match') {
        html += `<span class="result-check-icon" title="You meet all requirements!">`;
        html += `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">`;
        html += `<polyline points="20 6 9 17 4 12"></polyline>`;
        html += `</svg>`;
        html += `</span>`;
      }

      // Show info icon for Maybe and Not match
      if (reasons && reasons.length > 0 && status !== 'Match') {
        html += `<button class="result-info-btn" onclick="window.toggleResultDropdown(event, this)" title="Show details">`;
        html += `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">`;
        html += `<circle cx="8" cy="8" r="7" stroke="currentColor" fill="none" stroke-width="1.5"/>`;
        html += `<text x="8" y="12" text-anchor="middle" font-size="10" font-weight="bold">i</text>`;
        html += `</svg>`;
        html += `</button>`;
        html += `<div class="result-reasons-dropdown">`;
        html += '<p><strong>Why:</strong></p>';
        html += '<ul>';
        reasons.forEach(reason => {
          html += `<li>${reason}</li>`;
        });
        html += '</ul>';
        html += '</div>';
      }

      html += `</div>`; // result-status-container
      html += `</div>`; // result-header
      html += '</div>';
    });

    html += '</div>';

    // Note: Webflow form #eligibility_check_form_wf should exist on the page
    // We'll find and fill it in submitWebflowForm()

    // CTA buttons section
    html += '<div class="results-cta-section">';
    html += '<div class="results-cta-buttons">';
    html += '<a href="/sign-up" class="b-button results-cta-primary" data-event-action="click_signup">Create free account</a>';
    html += '<a href="https://calendly.com/migroot/interview" target="_blank" class="b-button b-button_bordered results-cta-secondary">Book a consultation</a>';
    html += '</div>';
    html += '<p class="results-cta-note">We know how to prepare your documents even if you\'re slightly short on requirements</p>';
    html += '</div>';

    // Add inline styles for the info dropdown and checkmark
    html += `<style>
      .result-header { display: flex; justify-content: space-between; align-items: center; }
      .result-status-container { display: flex; align-items: center; gap: 8px; position: relative; }
      .result-check-icon {
        display: flex;
        align-items: center;
        color: #22c55e;
      }
      .result-info-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        opacity: 0.6;
        transition: opacity 0.2s;
      }
      .result-info-btn:hover { opacity: 1; }
      .result-reasons-dropdown {
        display: none;
        position: absolute;
        top: 100%;
        right: 0;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 12px 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10;
        min-width: 250px;
        max-width: 350px;
        margin-top: 8px;
      }
      .result-reasons-dropdown.active { display: block; }
      .result-reasons-dropdown p { margin: 0 0 8px 0; font-weight: 600; }
      .result-reasons-dropdown ul { margin: 0; padding-left: 20px; }
      .result-reasons-dropdown li { margin: 4px 0; font-size: 14px; }

      .results-cta-section {
        margin-top: 32px;
        padding-top: 32px;
        border-top: 1px solid #e5e7eb;
        text-align: center;
      }
      .results-cta-buttons {
        display: flex;
        gap: 16px;
        justify-content: center;
        margin-bottom: 16px;
        flex-wrap: wrap;
      }
      .results-cta-primary,
      .results-cta-secondary {
        min-width: 200px;
        padding: 12px 24px;
        text-decoration: none;
        font-weight: 500;
      }
      .results-cta-note {
        color: #6b7280;
        font-size: 14px;
        margin: 0;
        max-width: 500px;
        margin-left: auto;
        margin-right: auto;
      }
    </style>`;

    html += '</div>';

    return html;
  }
}

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

// Export functions for use in other scripts
if (typeof window !== 'undefined') {
  window.EligibilityChecker = {
    calculateRequiredIncome,
    normalizeToArray,
    parseIncomeRange,
    evaluateMatch,
    handleEligibilityForm,
    MultiStepFormManager
  };
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    // Check if quiz exists on page
    const quizExists = document.querySelector('.tst-question_1');
    if (quizExists) {
      const formManager = new MultiStepFormManager({
        totalSteps: 8
      });
      formManager.init();

      // Expose to window for debugging
      window.quizFormManager = formManager;
    }
  });
}
