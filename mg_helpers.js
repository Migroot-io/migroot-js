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
    click_task_approve_file: {
        event_category: 'administration',
        event_label: 'Approve task file'
    },
    click_task_reject_file: {
        event_category: 'administration',
        event_label: 'Reject task file'
    },
    create_board_finish: {
        event_category: 'acquisition',
        event_label: 'Finish board creation'
    },
    click_create_board_finish: {
        event_category: 'acquisition',
        event_label: 'Click board creation'
    },
    click_start_initial_quiz: {
        event_category: 'acquisition',
        event_label: 'Go to generate journey quiz',
    },
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
    click_login: {
        event_category: 'activation',
        event_label: 'Login button',
    },
    click_g_drive: {
        event_category: 'paid feature',
        event_label: 'Google Drive Button',
    },
    click_buy_main: {
        event_category: 'conversion',
        event_label: 'Buy from main page',
    },
    click_file_history: {
        event_category: 'paid_feature',
    },
    click_buy_plans: {
        event_category: 'conversion',
        event_label: 'Buy from plans page',
    },
    click_modal_prices: {
        event_category: 'conversion',
        event_notes: 'Click check prices from "upgrade" modal window',
    },
    click_modal_ask: {
        event_category: 'conversion',
        event_notes: 'Click ask migroot from "upgrade" modal window',
    },
    click_upgrade: {
        event_category: 'conversion',
    },
    click_welcome_comment: {
        event_category: 'conversion',
    },
    onb_step_enter: {
        event_category: 'onboarding',
    },
    onb_finish: {
        event_category: 'onboarding',
    },
    onb_exit: {
        event_category: 'onboarding',
    },
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
    click_supported_countries: {
        event_category: 'acquisition',
        event_label: 'Click supported_countries from main',
    },
    click_whatsapp: {
        event_category: 'activation',
        event_label: 'WhatsApp Click',
    }
};

class AnalyticsHelper {
    constructor(debug = false) {
        this.debug = debug;
        this.isBuddyUser = false;
        this.senderPlan = 'unknown'
        this.sender = 'unknown'
    }

    setBuddyMode(value) {
        this.isBuddyUser = value;
        this.sender = this.isBuddyUser ? `buddy` : 'user';
    }

    setSenderPlan(value) {
        this.senderPlan = value || 'unknown';
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

        if (hasCardsWithFiles || onboardingPassed) {
            this.migroot.onboarding.finishTour(false, 'general');
          }

        if (
            !this.migroot.onboarding || !hasOnboardingTask
        ) {
            if (trigger) trigger.remove();
            return;
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
