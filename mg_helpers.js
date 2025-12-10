class Logger {
    constructor(isDebug = false) {
        this.isDebug = isDebug;
        this.memoryLogs = [];
    }

    _getCurrentTime() {
        const now = new Date();
        return now.toISOString().slice(11, 23);
    }

    _log(type, ctx, ...args) {
        const styles = {
            info: 'color: white; font-weight: 500;',
            debug: 'color: #aaa; font-family: monospace;',
            warning: 'color: orange; font-weight: bold;',
            error: 'color: red; font-weight: bold;'
        };
        const timestamp = this._getCurrentTime();
        const style = styles[type] || '';
        console.log(`%c[${timestamp}] [${type.toUpperCase()}] [${ctx}]`, style, ...args);
        this.memoryLogs.push({
            timestamp,
            type,
            ctx,
            args
        });
        if (this.memoryLogs.length > 500) {
            this.memoryLogs.shift();
        }
    }

    debug(...args) {
        if (!this.isDebug) return;
        const ctx = this.getCallerContext();
        this._log('debug', ctx, ...args);
    }

    info(...args) {
        if (!this.isDebug) return;
        const ctx = this.getCallerContext();
        this._log('info', ctx, ...args);
    }

    warning(...args) {
        if (!this.isDebug) return;
        const ctx = this.getCallerContext();
        this._log('warning', ctx, ...args);
    }

    error(...args) {
        const ctx = this.getCallerContext();
        this._log('error', ctx, ...args);
    }

    getCallerContext() {
        const err = new Error();
        if (!err.stack) return 'unknown';

        const stackLines = err.stack.split('\n');
        const callerLine = stackLines[3] || stackLines[2] || '';
        const match = callerLine.match(/at (\S+)/);
        return match ? match[1] : 'anonymous';
    }

    getErrorLogs() {
        return this.memoryLogs.filter(entry => entry.type === 'error');
    }

    getAllLogsAsText() {
        const header =
            "⚠️ Do not delete this message – it contains diagnostic logs for support.\n" +
            "Page URL: " + window.location.href + "\n\n";
        return header + this.memoryLogs.map(entry => {
            const argsText = entry.args.map(arg => {
                if (arg instanceof Error) {
                    return `${arg.name}: ${arg.message}\n${arg.stack}`;
                }
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg);
                    } catch {
                        return String(arg);
                    }
                }
                return String(arg);
            }).join(' ');
            return `[${entry.timestamp}] [${entry.type.toUpperCase()}] [${entry.ctx}] ${argsText}`;
        }).join('\n');
    }
}


const EVENT_PARAMS = {
    init_main: {
        event_category: 'initialization',
        event_label: 'Main module initialization'
    },
    init_site: {
        event_category: 'initialization',
        event_label: 'Site initialization'
    },
    init_app: {
        event_category: 'initialization',
        event_label: 'App initialization'
    },
    logout: {
        event_category: 'auth',
        event_label: 'User logout'
    },
    click_login: {
        event_category: 'auth',
        event_label: 'Login button',
    },
    // buddy events start
    click_task_approve_file: {
        event_category: 'administration',
        event_label: 'Approve task file'
    },
    click_task_reject_file: {
        event_category: 'administration',
        event_label: 'Reject task file'
    },
    // buddy events end

    // acquisition events start
    click_signup: {
        event_category: 'acquisition',
        event_label: 'Sign up button',
    },
    click_check_me: {
        event_category: 'acquisition',
        event_label: 'Check your eligibility button',
    },
    click_blog: {
        event_category: 'acquisition',
        event_label: 'Click blog button from main',
    },
    click_prices: {
        event_category: 'acquisition',
        event_label: 'Click prices button from main',
    },
    click_supported_countries: {
        event_category: 'acquisition',
        event_label: 'Click supported_countries from main',
    },
    click_whatsapp: {
        event_category: 'acquisition',
        event_label: 'WhatsApp Click',
    },
    click_faq: {
      event_category: 'acquisition',
      event_label: 'FAQ question Click',
    },
    click_social: {
      event_category: 'acquisition',
      event_label: 'Social network link Click',
    },
    // acquisition events end
    // pre_activation
    create_board_finish: {
        event_category: 'pre_activation',
        event_label: 'Finish board creation'
    },
    click_create_board_finish: {
        event_category: 'pre_activation',
        event_label: 'Click board creation'
    },
    click_start_initial_quiz: {
        event_category: 'pre_activation',
        event_label: 'Go to generate journey quiz',
    },
    // pre_activation end
    // activation_start

    click_task_details: {
        event_category: 'activation',
        event_label: 'Open task details'
    },
    click_task_start: {
        event_category: 'activation',
        event_label: 'Start task'
    },
    click_task_next_status: {
        event_category: 'activation',
        event_label: 'Move task to next status'
    },
    click_task_prev_status: {
        event_category: 'activation',
        event_label: 'Move task to previous status'
    },
    click_task_ready_status: {
        event_category: 'activation',
        event_label: 'Set task ready status'
    },
    click_task_choose_file: {
        event_category: 'activation',
        event_label: 'Choose file for task'
    },
    click_task_file_send: {
        event_category: 'activation',
        event_label: 'Send task file'
    },
    click_task_comment_send: {
        event_category: 'activation',
        event_label: 'Send task comment'
    },
    // neutral engagement start  (could be clicked logged or as a guest)
    click_support: {
        event_category: 'engagement',
        event_label: 'Open support popup'
    },
    // neutral engagement end

    // navigation start
    click_app: {
        event_category: 'navigation',
        event_label: 'Go into app tab'
    },
    click_todo: {
        event_category: 'navigation',
        event_label: 'Go todo tab'
    },
    click_docs: {
        event_category: 'navigation',
        event_label: 'Go docs tab'
    },
    // navigation end
    // conversion events start
    click_buy_plans: {
        event_category: 'conversion',
        event_label: 'Buy from plans page',
    },
    click_buy_main: {
        event_category: 'conversion',
        event_label: 'Buy from main page',
    },
    click_modal_prices: {
        event_category: 'conversion',
        event_notes: 'Click check prices from "upgrade" modal window',
    },
    click_modal_ask: {
        event_category: 'conversion',
        event_notes: 'Click ask migroot from "upgrade" modal window',
    },
    click_g_drive: {
        event_category: 'paid feature',
        event_label: 'Google Drive Button',
    },
    click_file_history: {
        event_category: 'paid feature',
    },
    click_upgrade: {
        event_category: 'conversion',
    },
    click_welcome_comment: {
        event_category: 'conversion',
    },

    // onboarding
    onb_step_enter: {
        event_category: 'onboarding',
    },
    onb_finish: {
        event_category: 'onboarding',
    },
    onb_exit: {
        event_category: 'onboarding',
    }
};

class AnalyticsHelper {
    constructor(debug = false) {
        this.debug = debug;
        this.isBuddyUser = false;
        this.senderPlan = 'unknown'
        this.sender = 'unknown'
        this.hasBoard = false;
    }

    setBuddyMode(value) {
        this.isBuddyUser = value;
        this.sender = this.isBuddyUser ? `buddy` : 'user';
    }

    setSenderPlan(value) {
        this.senderPlan = value || 'unknown';
    }

    setHasBoard(value) {
        this.hasBoard = !!value;
    }

    send_event(eventName, extraParams = {}) {
        if (!window.dataLayer || !Array.isArray(window.dataLayer)) {
            console.warn('[Analytics] dataLayer is not defined, event skipped:', defaultEvent, eventName);
            return;
        }
        let params = {
          event_category: '(not_set)',
          event_label: '(not_set)',
          ...(EVENT_PARAMS[eventName] || {})
        };
        console.log('[Analytics] params set:', params, extraParams);

        if (this.debug) {
            params.debug_mode = true;
        }
        const defaultEvent = (window.location.pathname.includes('/app/') || window.location.pathname.includes('/staging/'))
            ? 'app_interaction'
            : 'site_interaction';

        // Set pre_activation category ONLY for activation events when user has no board
        // Do NOT override initialization or conversion categories
        if (defaultEvent === 'app_interaction' && !this.hasBoard) {
            // Only override category if it's 'activation' or '(not_set)'
            if (params.event_category === 'activation' || params.event_category === '(not_set)') {
                params.event_category = 'pre_activation';
            }
            // Preserve other categories: initialization, conversion, navigation, etc.
        }

        try {
            const event_collection = {
                event: defaultEvent,
                event_action: eventName,
                event_sender: this.sender,
                event_sender_plan: this.senderPlan,
                ...params,
                ...extraParams
            }
            console.log('[Analytics] Event collection:', event_collection);
            window.dataLayer.push(event_collection);
            console.log('[Analytics] Event sent:', defaultEvent, eventName, params, extraParams);
        } catch (e) {
            console.error('[Analytics] Failed to send event:', defaultEvent, eventName, e);
        }
    }
}

class OnboardingManager {
    constructor(migrootInstance) {
        this.migroot = migrootInstance;
        this.steps = this.getOnboardingSteps();
    }

    getOnboardingSteps() {
        return [
            {
                title: "Welcome on board!",
                content: "I'm Migroot — your co-pilot for relocation. Let's take a quick tour together.",
                target: '#migroot-logo',
                order: 0,
                group: 'general',
                placement: "bottom"
            },
            {
                title: "Meet your control panel",
                content:`🔮 Hub is your command center — news, updates, and your big-picture progress.<br><br>
                        ✅ Todo is your mission board — every relocation step broken into clear tasks.<br><br>
                        📂 Docs is your secure vault — keep all your papers safe, organized, and always at hand`,
                target: '#control-panel',
                order: 1,
                group: 'general',
                placement: "bottom"
            },
            {
                title: "Your first mission",
                content: "🎯 Upload your CV. Let's kick things off together — just click on the task to begin.",
                target: '[data-task="preview"][data-onboarding="true"]',
                order: 2,
                group: 'general',
                beforeEnter: () => {
                    const el = document.querySelector('[data-task="drawer"][data-onboarding="true"]')
                    if (el) el.style.display = 'None'
                },
                placement: "bottom"
            },
            {
                title: "Task details",
                content: "This panel is your little guide for the task — requirements, deadline, and your reward. All in one cozy place.",
                target: '[data-task="drawer"][data-onboarding="true"]',
                group: 'general',
                order: 3,
                beforeEnter: () => {
                    const task = document.querySelector('[data-task="preview"][data-onboarding="true"]')
                    if (task) task.click()
                },
                afterEnter: () => {
                    const el = document.querySelector('[data-task="drawer"][data-onboarding="true"]')
                    if (el) el.scrollTop = 0
                },
                placement: "left",
            },
            {
                title: "Task stats and control",
                content: "Every mission has its stats — difficulty, deadline, and your reward. Check them here before you dive in.<br><br>" +
                    "You can also update the task status by using the arrows next to the status line.",
                target: '[data-task="drawer"][data-onboarding="true"] [class="drw-details"]',
                order: 4,
                group: 'general',
                beforeEnter: () => {
                    const el = document.querySelector('[data-task="drawer"][data-onboarding="true"]')
                    if (el) el.style.display = 'flex'
                },
                afterEnter: () => {
                    const el = document.querySelector('[data-task="drawer"][data-onboarding="true"]')
                    if (el) el.scrollTop = 0
                },
                placement: "left"
            },
            {
                title: "Help with every task: No CV? No problem",
                content: "Don`t have a file ready? Just save your LinkedIn profile as a PDF — fast, simple, and it works perfectly here",
                target: '[data-task="drawer"][data-onboarding="true"] .drw-tabs',
                order: 5,
                group: 'general',
                beforeEnter: () => {
                    const el = document.querySelector('[data-task="drawer"][data-onboarding="true"]')
                    if (el) {
                        el.style.display = 'flex';
                        el.querySelector('[data-w-tab="Tab 1"]').click();
                    }
                },
                afterEnter: () => {
                    const el = document.querySelector('[data-task="drawer"][data-onboarding="true"]')
                    if (el) {
                        el.scrollTop = 0;
                    }
                },
                placement: "left"
            },
            {
                title: "Need more help?",
                content: "Got a question or stuck on something? Drop a comment here. We'll reply within 3 business days — or faster if you're upgraded. You're never alone on this journey.",
                target: '[data-task="drawer"][data-onboarding="true"] .drw-tabs',
                order: 6,
                group: 'general',
                beforeEnter: () => {
                    const el = document.querySelector('[data-task="drawer"][data-onboarding="true"]')
                    if (el) {
                        el.style.display = 'flex';
                        el.querySelector('[data-w-tab="Tab 2"]').click();
                    }
                },
                afterEnter: () => {
                    const el = document.querySelector('[data-task="drawer"][data-onboarding="true"]')
                    if (el) {
                        el.scrollTop = 0;
                    }
                },
                placement: "left"
            },
            {
                title: "Upload your file",
                content: "Head to the Docs tab to upload your CV. Just click Upload file — we support PDF, JPG, or PNG. Drop it in and you're good to go!",
                target: '[data-task="drawer"][data-onboarding="true"] .drw-tabs',
                order: 7,
                group: 'general',
                beforeEnter: () => {
                    const el = document.querySelector('[data-task="drawer"][data-onboarding="true"]')
                    if (el) {
                        el.style.display = 'flex';
                        el.querySelector('[data-w-tab="Tab 3"]').click();
                    }
                },
                afterEnter: () => {
                    const el = document.querySelector('[data-task="drawer"][data-onboarding="true"]')
                    if (el) {
                        el.scrollTop = 0;
                    }
                },
                placement: "left"
            },
            {
                title: "First win!",
                content: "🎉 Great job! You've uploaded your first document, earned your first coins, and unlocked progress on your relocation. One step down, many exciting ones ahead!",
                target: '.ac-progress',
                order: 8,
                group: 'general',
                beforeEnter: () => {
                    const el = document.querySelector('[data-task="drawer"][data-onboarding="true"]')
                    if (el) el.style.display = 'none'
                },
                afterEnter: () => {
                    const el = document.querySelector('[data-task="drawer"][data-onboarding="true"]')
                    if (el) el.scrollTop = 0;
                },
                placement: "left"
            }
        ];
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    init() {
        const hasOnboardingTask = this.migroot.cards.some(card => card.onboarding === true);
        const hasCardsWithFiles = this.migroot.cards.some(card => card.filesCount > 0);
        const trigger = document.getElementById('onboarding_trigger');
        const onboardingPassed = this.migroot.currentUser?.onboardingPassed

        if (!this.migroot.onboarding || !hasOnboardingTask) {
            if (trigger) trigger.remove();
            return;
        }

        if (hasCardsWithFiles || onboardingPassed) {
            this.migroot.onboarding.finishTour(false, 'general');
        }

        this.setupSteps();
        this.setupTrigger(trigger);
        this.setupEventHandlers();
        this.autoStartIfNeeded();
    }

    setupSteps() {
        this.migroot.onboarding.addSteps(this.steps);
        const totalSteps = this.migroot.onboarding.tourSteps.length;

        this.migroot.onboarding.tourSteps.forEach((step, index) => {
            const originalBeforeEnter = step.beforeEnter;
            step.beforeEnter = () => {
                if (typeof originalBeforeEnter === 'function') {
                    originalBeforeEnter();
                }
                this.migroot.event('onb_step_enter', {
                    event_label: step.group || '(not_set)',
                    step: index + 1,
                    total_steps: totalSteps
                });
            };
        });
    }

    setupTrigger(trigger) {
        if (trigger) {
            trigger.onclick = () => {
                this.#toggleAutoCloseFancyBox(true);
                this.migroot.onboarding.start();
            }
        }
    }

    setupEventHandlers() {
        this.migroot.onboarding.onBeforeExit(() => {
            this.#toggleAutoCloseFancyBox(false);
            if (this.migroot.onboarding.activeStep > 6) {
                this.migroot.onboarding.finishTour(false, 'general');
            }
            document.cookie = "onboarding_exited=1; max-age=" + (3 * 24 * 60 * 60) + "; path=/";
        });

        this.migroot.onboarding.onFinish(() => {
            this.migroot.onboarding.finishTour(false, 'general');
            this.migroot.markOnboardingPassed();
        });
    }


    autoStartIfNeeded() {
        if (!this.migroot.onboarding.isFinished('general') && !this.getCookie("onboarding_exited")) {
            this.#toggleAutoCloseFancyBox(true);
            this.migroot.onboarding.start();
        }
    }

    #toggleAutoCloseFancyBox(enable = true, options = {}) {
            const LISTENER_ATTR = 'data-auto-close-paid-listener';
            const HANDLER_KEY = '__autoClosePaidHandler';
            const {
              triggerSelector = '[data-src="#paid"]',
              modalId = 'paid',
              delayMs = 2300,
            } = options;

            if (enable) {
              if (document.documentElement.hasAttribute(LISTENER_ATTR)) return;
              const handler = (event) => {
                const trigger = event.target.closest(triggerSelector);
                if (!trigger) return;

                setTimeout(() => {
                  const modal = document.getElementById(modalId);

                  if (modal?.classList.contains('fancybox__content')) {
                    if (window.Fancybox?.close) {
                      window.Fancybox.close();
                    } else {
                      modal.classList.remove('fancybox__content');
                      modal.closest('.fancybox__container')?.remove();
                    }
                  }
                }, delayMs);
              };

              // сохраняем обработчик, чтобы можно было удалить
              window[HANDLER_KEY] = handler;
              document.addEventListener('click', handler);
              document.documentElement.setAttribute(LISTENER_ATTR, 'enabled');
            } else {
              // выключаем автозакрытие
              const handler = window[HANDLER_KEY];
              if (handler) {
                document.removeEventListener('click', handler);
                delete window[HANDLER_KEY];
              }
              document.documentElement.removeAttribute(LISTENER_ATTR);
            }
      };

}

// ============================================================================
// Eligibility Checker
// ============================================================================

class EligibilityChecker {
  /**
   * Calculate required income based on family composition
   * @param {number} baseIncome - Base minimum income for the country
   * @param {Object} multipliers - Income multipliers for spouse/children/pets
   * @param {Array} moveWith - Array of who's moving with user
   * @returns {number} Required income in EUR
   */
  static calculateRequiredIncome(baseIncome, multipliers = {}, moveWith = []) {
    if (!baseIncome || baseIncome <= 0) {
      return 0;
    }

    let factor = 1;
    moveWith.forEach(role => {
      if (role === "alone" || role === "solo") return;
      if (multipliers[role] != null) {
        factor += multipliers[role];
      }
    });

    return Math.round(baseIncome * factor);
  }

  /**
   * Normalize value to array
   * @param {*} value - Any value
   * @returns {Array} Array representation
   */
  static normalizeToArray(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    return [value];
  }

  /**
   * Convert income range string to object with min/max
   * @param {string|Object} incomeRange - Income range from form (JSON string, object, or text range)
   * @returns {Object} {min, max} income range in EUR
   */
  static parseIncomeRange(incomeRange) {
    if (!incomeRange) return { min: 0, max: 0 };

    // If already an object, return as is
    if (typeof incomeRange === 'object' && incomeRange.min !== undefined) {
      return incomeRange;
    }

    // Try to parse as JSON first (for new format: '{"min":0,"max":1500}')
    if (typeof incomeRange === 'string') {
      try {
        const parsed = JSON.parse(incomeRange);
        if (parsed.min !== undefined && parsed.max !== undefined) {
          return { min: parsed.min, max: parsed.max };
        }
      } catch (e) {
        // Not JSON, continue with other parsing methods
      }
    }

    // Legacy parsing for old text formats
    const cleaned = String(incomeRange).replace(/[€$,\s]/g, '');

    // Format: "1500-3000"
    if (cleaned.includes('-')) {
      const parts = cleaned.split('-').map(v => parseInt(v.trim(), 10));
      if (parts.length === 2) {
        return { min: parts[0], max: parts[1] };
      }
    }

    // Format: "Below €1,500"
    if (String(incomeRange).toLowerCase().includes('below')) {
      return { min: 0, max: 1500 };
    }

    // Format: "Above €10,000"
    if (String(incomeRange).toLowerCase().includes('above')) {
      return { min: 10000, max: Infinity };
    }

    // Single number
    const num = parseInt(cleaned, 10);
    if (!isNaN(num)) {
      return { min: num, max: num };
    }

    return { min: 0, max: 0 };
  }

  /**
   * Evaluate user eligibility for all countries
   * @param {Object} userAnswers - User answers from quiz
   * @param {Object} visaRequirements - Visa requirements config (HUB_CONFIG)
   * @returns {Object} Results object with country details
   */
  static evaluateMatch(userAnswers, visaRequirements) {
    const results = {};

    Object.keys(visaRequirements).forEach(country => {
      const { test } = visaRequirements[country];

      if (!test) {
        return;
      }

      let issues = 0;
      let fail = false;
      const reasons = [];

      const userWorkType = userAnswers.work_type;
      const userCanRemote = userAnswers.remote_work;
      const userMoveWith = this.normalizeToArray(userAnswers.move_with);
      const userIncomeRange = userAnswers.work_income || { min: 0, max: 0 };
      const userExperience = this.normalizeToArray(userAnswers.experience);

      // Work type check
      if (!test.work_type.includes(userWorkType)) {
        fail = true;
        reasons.push('Work type not supported');
      }

      // Remote work check
      if (test.remote_work) {
        if (userCanRemote === "no") {
          fail = true;
          reasons.push('Remote work required');
        } else if (userCanRemote === "not_sure") {
          issues++;
          reasons.push('Remote work capability unclear');
        }
      }

      // Family check
      if (userMoveWith.length > 0) {
        const allowed = userMoveWith.every(r => test.move_with.includes(r));
        if (!allowed) {
          issues++;
          reasons.push('Some family members not supported');
        }
      }

      // Income check
      const requiredIncome = this.calculateRequiredIncome(
        test.min_work_income,
        test.income_multipliers,
        userMoveWith
      );

      let incomeShortfall = 0;
      if (requiredIncome > 0) {
        if (userIncomeRange.max >= requiredIncome) {
          if (userIncomeRange.min < requiredIncome) {
            issues++;
            incomeShortfall = requiredIncome - userIncomeRange.min;
            reasons.push(`Income range unclear (need €${requiredIncome.toLocaleString()}/month, your range: €${userIncomeRange.min.toLocaleString()}-€${userIncomeRange.max === Infinity ? '10,000+' : userIncomeRange.max.toLocaleString()})`);
          }
        } else {
          fail = true;
          incomeShortfall = requiredIncome - userIncomeRange.max;
          reasons.push(`Income too low (need €${requiredIncome.toLocaleString()}/month, you earn up to €${userIncomeRange.max.toLocaleString()}/month)`);
        }
      }

      // Experience check
      if (test.experience && test.experience.length > 0) {
        const expOK = userExperience.some(exp => test.experience.includes(exp));
        if (!expOK) {
          issues++;
          reasons.push('Experience/degree requirement not met');
        }
      }

      // Final decision
      let status;
      if (fail) status = "Not match";
      else if (issues >= 2) status = "Maybe";
      else status = "Match";

      results[country] = {
        status,
        reasons,
        requiredIncome,
        userIncomeRange,
        incomeShortfall
      };
    });

    return results;
  }

  /**
   * Get stored quiz results from localStorage
   * @returns {Object|null} Quiz data or null if not found
   */
  static getStoredQuizResults() {
    try {
      const data = localStorage.getItem('quiz_results');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Failed to load quiz results from localStorage:', e);
      return null;
    }
  }

  /**
   * Re-evaluate stored quiz answers with current visa requirements
   * Useful for HUB page to show updated match status
   * @param {Object} visaRequirements - Visa requirements config (HUB_CONFIG)
   * @returns {Object|null} Evaluation results or null if no stored data
   */
  static reEvaluateStoredAnswers(visaRequirements) {
    const quizData = this.getStoredQuizResults();
    if (!quizData) return null;

    const userAnswers = {
      work_type: quizData.work_type,
      remote_work: quizData.remote_work,
      move_with: quizData.move_with,
      work_income: quizData.work_income,
      experience: quizData.experience
    };

    return this.evaluateMatch(userAnswers, visaRequirements);
  }
}

// ============================================================================
// Multi-Step Form Navigation
// ============================================================================

/**
 * Multi-step form manager for eligibility quiz
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

    // Reset checkbox arrays for this step (except boolean checkboxes)
    const booleanCheckboxes = ['opt_in', 'marketing_consent'];
    checkboxNames.forEach(name => {
      if (!booleanCheckboxes.includes(name)) {
        this.formData[name] = [];
      }
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

      // Format income as "min-max"
      const income = userAnswers.work_income || {};
      form.querySelector('#income').value = income.min !== undefined && income.max !== undefined ?
        `${income.min}-${income.max}` : '';

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
        opt_in: this.formData.opt_in,
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

// Export both classes to window
if (typeof window !== 'undefined') {
  window.EligibilityChecker = EligibilityChecker;
  window.MultiStepFormManager = MultiStepFormManager;
}
