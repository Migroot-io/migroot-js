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
        // Store log in memory
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
      console.warn('[Analytics] dataLayer is not defined, event skipped:',defaultEvent, eventName);
      return;
    }
    const params = { ...(EVENT_PARAMS[eventName] || {}) };
    if (this.debug) {
      params.debug_mode = true;
    }
    const defaultEvent = (window.location.pathname.includes('/app/') || window.location.pathname.includes('/staging/'))
    ? 'app_interaction'
    : 'site_interaction';


    try {
      window.dataLayer.push({
        event: defaultEvent,
        event_action: eventName,
        event_sender: this.sender,
        event_sender_plan: this.senderPlan,
        ...params,
        ...extraParams
      });
      // console.log('[Analytics] Event sent:', defaultEvent, eventName, params, extraParams);
    } catch (e) {
      console.error('[Analytics] Failed to send event:',defaultEvent,  eventName, e);
    }
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
  click_buy_plans: {
    event_category: 'conversion',
    event_label: 'Buy from plans page',
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

const STATUS_FLOW = Object.freeze({
    NOT_STARTED: {next: 'ASAP', prev: null},
    ASAP: {next: 'IN_PROGRESS', prev: 'NOT_STARTED'},
    IN_PROGRESS: {next: 'REQUIRES_CHANGES', prev: 'ASAP'},
    REQUIRES_CHANGES: {next: 'READY', prev: 'IN_PROGRESS'},
    READY: {next: null, prev: 'REQUIRES_CHANGES'},
});

const FREE_USER_BLOCKED_STATUSES = ['ASAP', 'REQUIRES_CHANGES'];

const STATUS_FLOW_NO_SUBSCRIPTION = Object.freeze({
    NOT_STARTED: {next: 'IN_PROGRESS', prev: null},
    ASAP: {next: 'IN_PROGRESS', prev: 'NOT_STARTED'},
    IN_PROGRESS: {next: 'READY', prev: 'NOT_STARTED'},
    REQUIRES_CHANGES: {next: 'READY', prev: 'IN_PROGRESS'},
    READY: {next: null, prev: 'IN_PROGRESS'},
});

const LOCALSTORAGE_KEYS = Object.freeze({
    COUNTRY: 'defaultCountry',
    BOARD_ID: 'defaultBoardId',
    GOAL: 'defaultBoardGoalTasks',
    DONE: 'defaultBoardDoneTasks',
    DATE: 'defaultBoardDate',
    EMAIL: 'defaultBoardEmail'
});

const USER_CONTROL_IDS = ['hubLink', 'todoLink', 'docsLink']
const ADMIN_LINK_ID = 'adminLink'
const G_DRIVE_FOLDER_ID = 'g-drive-folder'
const BLOCKED_CLASS = 'blocked'
const FEATURE_TYPES = ['COUNTRY_OF_CITIZENSHIP',
    'COUNTRY_OF_VISA_APPLICATION',
    'COUNTRY_OF_DESTINATION',
    'COUNTRY_OF_RECENT_STAY',
    'COUNTRY_OF_LABOR_CONTRACT',
    'COUNTRY_OF_ENTREPRENEURSHIP',
    'MOVE_WITH_SPOUSE',
    'MOVE_WITH_CHILDREN',
    'MOVE_WITH_PARENTS',
    'MOVE_WITH_PETS']

const PAGE_TYPES = Object.freeze({
    TODO: 'todo',
    DOCS: 'docs',
    HUB: 'hub',
    ADMIN: 'admin',
    CREATE_BOARD: 'create-board'
});

const ENDPOINTS = {
    createBoard: {
        path: 'board', method: 'POST'
    }, searchBoard: {
        path: 'board/search', method: 'POST'
    }, getBoard: {
        path: 'board/{boardId}', method: 'GET'
    }, currentUser: {
        path: 'currentUser', method: 'GET'
    }, getUser: {
        path: 'user/{userId}', method: 'GET'
    }, getCountryList: {
        path: 'countries', method: 'GET'
    }, searchUsers: {
        path: 'user/search', method: 'POST'
    }, addClientTask: {
        path: 'board/{boardId}', method: 'POST'
    }, getClientTask: {
        path: 'board/task/{taskId}', method: 'GET'
    }, updateClientTask: {
        path: 'board/task/{taskId}', method: 'PUT'
    }, uploadFile: {
        path: 'board/task/{taskId}/uploadFile', method: 'POST'
    }, filesView: {
        path: 'board/{boardId}/files/view', method: 'GET'
    }, approveFile: {
        path: 'board/file/{fileId}/approve', method: 'POST'
    }, rejectFile: {
        path: 'board/file/{fileId}/reject', method: 'POST'
    }, getUserFilesFolder: {
        path: 'board/{userId}/getFilesFolder', method: 'GET'
    }, commentClientTask: {
        path: 'board/task/{taskId}/comment', method: 'POST'
    }
};


class Migroot {
    constructor(config) {
        const host = window.location.hostname;
        const path = window.location.pathname;
        this.config = config;
        this.config.debug = path.includes('/staging/') || host === 'migroot.webflow.io' || this.config.debug;
        // this.backend_url = config.backend_url || 'https://migroot-447015.oa.r.appspot.com/v1'; // taking from config
        this.backend_url = host === 'migroot.webflow.io' ?  'https://migroot-447015.oa.r.appspot.com/v1' :  'https://migroot-prod.oa.r.appspot.com/v1';
        this.endpoints = ENDPOINTS;
        this.log = new Logger(this.config.debug);
        this.ga = new AnalyticsHelper(this.config.debug);
        this.boardUser = null;
        this.currentUser = null;
        this.boardId = null;
        this.board = {};
        this.cards = []
        this.board.docs = null;
        this.countries = null;
        this.token = null;
        this.userFilesFolder = null;
        this.onboarding = null;
        this.init()
        this.#attachEventButtons();
    }

    init() {
        // expose instance and proxy helpers to window (for inline‑onclick in templates)
        window.mg = this;
        if (tourguide && window.location.pathname.includes(PAGE_TYPES.TODO)) {
            this.onboarding = new tourguide.TourGuideClient({
                exitOnClickOutside: false,
                autoScroll: false
            })
        }
        this.generateMethodsFromEndpoints();
        this.initHandlers();
        this.log.info('Migroot initialized');
    }

    initHandlers() {
        window.handleUpdateStatus = el => this.#handleStartFromButton(el); // not using perhabs


        window.handleFileUploadSubmit = el => this.#handleFileUploadSubmit(el);
        window.handleCommentSubmit = el => this.#handleCommentSubmit(el);
        window.handleChooseFile = el => this.#handleChooseFile(el);
        window.handleApproveFile = el => this.#handleApproveFile(el);
        window.handleRejectFile = el => this.#handleRejectFile(el);

        window.handleNextButton = el => this.#handleNextButton(el);
        window.handlePrevButton = el => this.#handlePrevButton(el);
        window.handleReadyButton = el => this.#handleReadyButton(el);
        window.handleCreateBoard = el => this.#handleCreateBoard(el);
        window.getErrorLog = () => this.log.getAllLogsAsText();
    }

    /*───────────────────────────  API helpers START ────────────────────────*/

    // main fetchers start
    async getAccessToken() {
        // First, try to get token from config -- for dev only
        if (this.config?.token) {
            return this.config.token;
        }

        // If not found, try to get token from Outseta
        if (window.Outseta?.getAccessToken) {
            const accessToken = await window.Outseta.getAccessToken();
            if (accessToken) {
                return accessToken;
            }
        }

        // If no token found at all, throw an error
        throw new Error("Access token is missing in config and window.Outseta.");
    }

    async fetchUserData() {
        try {
            this.token = await this.getAccessToken();
            if (!this.token) {
                this.log.debug('User has not auth');
                return;
            }
            this.currentUser = await this.api.currentUser();
            this.log.debug('Current user set from API:', this.currentUser);
        } catch (error) {
            this.log.error('User initialization failed:', error);
            throw error;
        }
    }

    async fetchCountryList() {
        try {
            this.countries = await this.api.getCountryList();
            this.log.debug('fetch country list done:', this.countries);
        } catch (error) {
            this.log.error('fetch countries failed:', error);
            throw error;
        }
    }

    async fetchBoard(boardId = null) {
        try {
            if (boardId) {
                await this.loadBoardById(boardId);
            } else if (this.isBuddyUser()) {
                // redirect to admin f
                window.location.href = `${this.appPrefix()}/admin`;
            } else {
                await this.loadUserBoards()
                // await this.loadDummyUserBoard();
            }
            if (this.board) {
                this.#updateLocalStorage(this.board);
            }
        } catch (error) {
            this.log.error('Board initialization failed:', error);
            throw error;
        }
    }

    async fetchDocs(boardId = null) {
        try {

            if (boardId) {
                await this.loadBoardDocsById(boardId);
            } else if (this.isBuddyUser()) {
                // redirect to admin
                window.location.href = `${this.appPrefix()}/admin`;
            } else {
                await this.loadUserBoardDocs()
            }
            // this.#updateLocalStorage(this.board);
        } catch (error) {
            this.log.error('Board initialization failed:', error);
            throw error;
        }
    }

    // main fetchers end


    async loadBoardById(boardId) {
        this.board = await this.api.getBoard({}, {
            boardId: boardId
        });
        this.boardId = this.board.boardId;
        this.boardUser = this.board.owner;
        this.cards = this.board.tasks;
        this.log.debug('Board loaded by ID:', this.board);
        this.log.debug('User initialized from board owner:', this.boardUser);

        if (!this.boardUser?.id || !this.boardUser?.type) {
            throw new Error('Owner of the board is missing id or type.');
        }
    }

    async loadBoardDocsById(boardId) {
        try {
            const res = await this.api.filesView({}, {boardId});
            this.board.docs = res.files;
            this.log.debug(`Docs loaded for board ID ${boardId}:`, res);
        } catch (error) {
            this.log.error(`Failed to load docs for board ID ${boardId}:`, error);
            throw new Error('Fetch docs error');
        }
    }

    async loadUserBoards(boardUser = null) {
        this.boardUser = boardUser || this.currentUser

        if (!this.boardUser?.id || !this.boardUser?.type) {
            this.log.error('User init error for user:', this.boardUser)
            throw new Error('User init error');
        }

        this.log.debug(' user initialized:', this.boardUser);

        const boards = await this.api.searchBoard({
            userType: this.boardUser.type, userId: this.boardUser.id
        });
        this.boards = boards;
        this.log.debug('Boards found for user:', boards);

        if (!Array.isArray(boards) || boards.length === 0) {
            this.log.warning('No boards found for user:', this.boardUser)
            if (this.isBuddyUser()) {
                // redirect to admin
                window.location.href = `${this.appPrefix()}/admin`;

            } else {
                this.#showCreateButton();
            }
            throw new Error('No boards found for user.');
        }

        this.board = boards[0];
        this.boardId = this.board.boardId;

        this.log.debug('First board initialized for user:', this.board);
    }

    async loadUserBoardDocs(boardUser = null) {
        await this.loadUserBoards(boardUser);
        if (!this.boardId) {
            this.log.error('No docs and boards found for user:', this.boardUser)
            throw new Error('Fetch docs error: cant get board for user');
        }
        await this.loadBoardDocsById(this.boardId)
    }

    /**
     * Creates a new board.
     *
     * @param {Array<Feature>} features - Array of feature objects. Must include at least:
     *   COUNTRY_OF_CITIZENSHIP and COUNTRY_OF_VISA_APPLICATION.
     * @param questionnaire
     */
    async createBoard(features, questionnaire) {
        if (!Array.isArray(features)) {
            throw new Error('features must be an array of Feature objects');
        }
        if (typeof questionnaire !== 'object' || questionnaire === null || Array.isArray(questionnaire)) {
            throw new Error('questionnaire must be an object');
        }
        try {
            this.token = await this.getAccessToken();
            this.currentUser = await this.api.currentUser();
            this.log.debug('Current user set from API:', this.currentUser);

            if (!this.currentUser?.id || !this.currentUser?.type) {
                throw new Error('User init error');
            }

            const createdBoard = await this.api.createBoard({
                owner: {
                    id: this.currentUser?.id, type: this.currentUser?.type
                }, features: features,
                   questionnaire: questionnaire
            });

            this.log.debug('board created:', createdBoard);
            return createdBoard;
        } catch (error) {
            this.log.error('Board creation failed:', error);
            throw error;
        }
    }

    /*───────────────────────────  API helpers END ──────────────────────────*/

    /*───────────────────────────  Dynamic API request generator  START ──────────────────────────*/

    async request(endpointName, body = {}, method, pathParams = {}) {
        if (!this.backend_url) {
            throw new Error("Backend URL is not set.");
        }

        const accessToken = this.token;

        const endpointConfig = this.endpoints[endpointName];
        if (!endpointConfig) {
            throw new Error(`Unknown endpoint: ${endpointName}`);
        }

        let path = endpointConfig.path;

        for (const [key, value] of Object.entries(pathParams)) {
            path = path.replace(`{${key}}`, value);
        }

        const url = `${this.backend_url}/${path}`;

        try {
            const isFormData = body instanceof FormData;
            const headers = {
                'Authorization': `Bearer ${accessToken}`, ...(isFormData ? {} : {'Content-Type': 'application/json'})
            };

            const payload = method !== 'GET' ? (isFormData ? body : JSON.stringify(body)) : undefined;
            const response = await fetch(url, {
                method: method, headers: headers, body: payload
            });

            if (!response.ok) {
                throw new Error(`Request failed: ${response.status} ${response.statusText}`);
            }

            return await response.json();

        } catch (error) {
            this.log.error(`Error in request to ${endpointName}:`, error);
            throw error;
        }
    }

    generateMethodsFromEndpoints() {
        this.api = {};
        for (const [name, config] of Object.entries(this.endpoints)) {
            this.api[name] = async (body = {}, pathParams = {}) => {
                return await this.request(name, body, config.method, pathParams);
            };
        }
    }

    /*───────────────────────────  Dynamic API request generator END ──────────────────────────*/
    /// oboarding start

    init_onboarding() {

        const ONBOARDING_STEPS = [
            {
              title: "Task intro",
              content: "Here’s your first step: Upload your CV. Let’s do it together. Click on that task",
              target: '[data-task="preview"][data-onboarding="true"]',
              order: 2,
              beforeEnter: () => {
                  const el = document.querySelector('[data-task="drawer"][data-onboarding="true"]')
                  if (el) el.style.display = 'None'
                  },
              placement: "bottom"
            },
            {
              title: "Task drawer full",
              content: "This panel shows what’s required, due date, and the coins you’ll earn when you finish.\n\n",
              target: '[data-task="drawer"][data-onboarding="true"]',
              order: 3,
              beforeEnter: () => {
                  const task = document.querySelector('[data-task="preview"][data-onboarding="true"]')
                  if (task) task.click()
                  // const el = document.querySelector('[data-task="drawer"][data-onboarding="true"]')
                  // if (el) el.style.display = 'block'
                  },
                afterEnter: () => {
                  const el = document.querySelector('[data-task="drawer"][data-onboarding="true"]')
                  if (el) el.scrollTop = 0
                },
              placement: "left",
            },
            {
              title: "Task Details",
              content: "This panel shows what’s required, due date, and the coins you’ll earn when you finish." ,
              target: '[data-task="drawer"][data-onboarding="true"] [class="drw-details"]',
              order: 4,
              beforeEnter: () => {
                  const el = document.querySelector('[data-task="drawer"][data-onboarding="true"]')
                  if (el) el.style.display = 'block'
                  },
            afterEnter: () => {
                  const el = document.querySelector('[data-task="drawer"][data-onboarding="true"]')
                  if (el) el.scrollTop = 0
                },
              placement: "left"
            },
            {
              title: "Long description",
              content: "💡 No CV ready? Just save your LinkedIn profile as a PDF — it works perfectly." ,
              target: '[data-task="drawer"][data-onboarding="true"] .drw-tabs',
              order: 5,
              beforeEnter: () => {
                  const el = document.querySelector('[data-task="drawer"][data-onboarding="true"]')
                  if (el) {
                      el.style.display = 'block';
                      el.querySelector('[data-w-tab="Tab 1"]').click();
                  }},
            afterEnter: () => {
              const el = document.querySelector('[data-task="drawer"][data-onboarding="true"]')
              if (el) {
                  el.scrollTop = 0;
              }
            },
              placement: "left"
            },
            {
              title: " comments",
              content: "Any issues?  Save notes here or contact  Migroot and will help you in 3 business days (after upgrade - 1 business day)" ,
              target: '[data-task="drawer"][data-onboarding="true"] .drw-tabs',
              order: 6,
              beforeEnter: () => {
                  const el = document.querySelector('[data-task="drawer"][data-onboarding="true"]')
                  if (el) {
                      el.style.display = 'block';
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
              title: "Docs & Upload area",
              content: "Click Docs here to upload your file. That’s where all task-related documents go. Click Upload file. Supported: PDF, JPG, PNG.",
              target: '[data-task="drawer"][data-onboarding="true"] .drw-tabs',
              order: 7,
              beforeEnter: () => {
                  const el = document.querySelector('[data-task="drawer"][data-onboarding="true"]')
                  if (el) {
                      el.style.display = 'block';
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
              title: "Success / Progress",
              content: "🎉 Great job! You’ve uploaded your first document, earned coins, and unlocked progress on your relocation.",
              target: '.ac-progress',
              order: 8,
              beforeEnter: () => {
                  const el = document.querySelector('[data-task="drawer"][data-onboarding="true"]')
                  if (el) el.style.display = 'none'
                  },
                afterEnter: () => {
                  const el = document.querySelector('[data-task="drawer"][data-onboarding="true"]')
                  if (el) el.scrollTop = 0
                },
              placement: "left"
            }
        ];

        const hasOnboardingTask = this.cards.some(card => card.onboarding === true);
        const trigger = document.getElementById('onboarding_trigger')

        if (!this.onboarding || !hasOnboardingTask) {
            trigger.remove();
            return;
        }

        this.onboarding.addSteps(ONBOARDING_STEPS)

        if (trigger) trigger.onclick = () => this.onboarding.start();
        if (!this.onboarding.isFinished('general')) {
          // this.onboarding.start()
        }
    }
    /// onboarding end
    /*───────────────────────────  Dashboard/Docs/HUB START ──────────────────────────*/


    async init_dashboard({boardId = null, callback = null, type = PAGE_TYPES.TODO} = {}) {
        try {
            this.log.debug('Step 1: Fetching user and board');
            this.ga.send_event('init_main')
            await this.fetchUserData();
            if (!this.currentUser || this.config.skip_dashboard) {
                this.ga.send_event('init_site')
                return;
            }
            this.ga.send_event('init_app')
            const finalBoardId = this.#resolveBoardId(boardId);

            this.ga.setBuddyMode(this.isBuddyUser())
            this.ga.setSenderPlan(this.currentUser?.subscriptionPlan)
            switch (type) {
                case PAGE_TYPES.TODO:
                    this.clearBoardLocalCache()
                    this.#clearContainers();
                    await this.fetchBoard(finalBoardId);
                    this.#appendBoardIdToLinks(this.boardId);
                    await this.#prepareTodo(this.boardId);
                    this.hideBlockedContainers();
                    break;
                case PAGE_TYPES.DOCS:
                    this.clearBoardLocalCache()
                    this.#clearContainers();
                    await this.fetchBoard(finalBoardId);
                    this.#appendBoardIdToLinks(this.boardId);
                    await this.#prepareDocs(this.boardId);
                    break;
                case PAGE_TYPES.CREATE_BOARD:
                    await this.fetchCountryList();
                    this.renderCountryInputs();
                    break;
                case PAGE_TYPES.HUB:
                    await this.fetchBoard(finalBoardId);
                    this.#appendBoardIdToLinks(this.boardId);
                    this.renderHubFields();
                    break;
                case PAGE_TYPES.ADMIN:
                    this.clearBoardLocalCache()
                    await this.#prepareAdminCards();
                    this.#hideUserControls();
                    break;
                default:
                    this.log.debug('page is not a dashboard: ', type);
                    return;
            }
            if (this.board) {
                this.#updateLocalStorage(this.board)
            }
            if (type !== PAGE_TYPES.CREATE_BOARD) {
                this.renderUserFields();
            };
            this.renderStagingUrls();
            this.log.debug('Dashboard initialized successfully');

            if (typeof callback === 'function') {
                this.log.debug('callback called');
                try {
                    callback({ cards: this.cards.length });
                } catch (cbErr) {
                    this.log.error('Callback failed:', cbErr);
                }
            }
        } catch (error) {
            this.log.error(`Error during init dashboard: ${error.message}`);
            this.log.error('Stack trace:', error.stack);
            throw error;
        }
    }

    #resolveBoardId(boardId) {
        let finalBoardId = boardId;
        if (!finalBoardId) {
            this.log.debug('boardId not set: triyng to get from url')
            const urlParams = new URLSearchParams(window.location.search);
            finalBoardId = urlParams.get('boardId');
        }
        this.log.debug(`boardId result: ${finalBoardId}`)
        return finalBoardId;
    }

    async #prepareTodo(finalBoardId) {
        this.cards = [];
        this.board.tasks.forEach(item => {
            try {
                this.cards.push(this.#taskItemToCard(item));
            } catch (err) {
                this.log.error('createTaskCard failed for item:', item);
                this.log.error(err.message, err.stack);
                throw err;
            }
        });
        this.#observeContainersWithCount();
        this.#renderCards(PAGE_TYPES.TODO);
    }

    async #prepareDocs(finalBoardId) {
        await this.fetchDocs(finalBoardId);
        this.cards = [];
        this.board.docs.forEach(item => {
            try {
                this.cards.push(this.#docItemToCard(item));
            } catch (err) {
                this.log.error('createDocCard failed for item:', item);
                this.log.error(err.message, err.stack);
                throw err;
            }
        });
        this.#renderCards(PAGE_TYPES.DOCS);
    }

    async #prepareAdminCards() {
        this.cards = [];
        this.log.debug('start filling cards with admin boards');
        await this.loadUserBoards();
                this.boards.forEach(item => {
            try {
                this.log.debug('creating AdminCard  for item:', item);
                this.cards.push(this.#boardItemToCard(item));
            } catch (err) {
                this.log.error('createAdminCard failed for item:', item);
                this.log.error(err.message, err.stack);
                throw err;
            }
        });
        this.#renderCards(PAGE_TYPES.ADMIN);
    };

    #boardItemToCard(item) {
        return {
            id: item.boardId,
            email: item.owner.email,
            status: 'dummy', // will be inserted to general container
            fullName: `${item.owner.firstName} ${item.owner.lastName}`,
            boardName: `${item.country} ${item.boardType ?? 'Relocation'}`,
            linkTodo: `${this.appPrefix()}/${PAGE_TYPES.TODO}?boardId=${item.boardId}`,
            linkDocs: `${this.appPrefix()}/${PAGE_TYPES.DOCS}?boardId=${item.boardId}`
        }
    }

    #taskItemToCard(item) {
        return {
            ...item,
            id: item.clientTaskId,
            status: this.#processStatus(item.status),
        };
    }

    #docItemToCard(item) {
        const base = item?.taskRef ? { ...item.taskRef } : {};
        return {
            ...base,
            id: base.clientTaskId,
            commentsCount: 0,
            filesCount: 0,
            fileName: item.fileName,
            viewLink: item.viewLink,
            fileStatus: this.#processStatus(item.status),
            card_type: PAGE_TYPES.DOCS
        };
    }

    #processStatus(status) {
        if (this.isFreeUser() && FREE_USER_BLOCKED_STATUSES.includes(status)) {
            this.log.debug(`✨ Free user - remap status ${status}`);
            status = this.getPrevStatus(status);
        }
        return status;
    }

    #updateLocalStorage(board) {
            if (!board || !Array.isArray(board.tasks)) {
                this.log.debug('Board data in local storage is missing or malformed');
                return;
            }
            if (board.createdDate) {
                const isoDate = board.createdDate;
                const date = new Date(isoDate);
                var readableDate = date.toLocaleString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                });
            }

            const goalTasks = board.tasks.filter(task => task.documentRequired).length;
            const doneTasks = board.tasks.filter(task => task.status === 'READY' && task.documentRequired).length;

            localStorage.setItem(LOCALSTORAGE_KEYS.COUNTRY, board.country || '');
            localStorage.setItem(LOCALSTORAGE_KEYS.BOARD_ID, board.boardId || '');
            localStorage.setItem(LOCALSTORAGE_KEYS.GOAL, String(goalTasks));
            localStorage.setItem(LOCALSTORAGE_KEYS.DONE, String(doneTasks));
            localStorage.setItem(LOCALSTORAGE_KEYS.DATE, readableDate || '')
            localStorage.setItem(LOCALSTORAGE_KEYS.EMAIL, board.owner.email || '')

        }

    #renderCards(cardType) {
        this.log.debug(`Step 3: Creating cards based on ${cardType} tasks`);
        this.cards.sort((a, b) => a.priority - b.priority);
        const firstNotStarted = [...this.cards].reverse().find(card => card.status === 'NOT_STARTED');

        if (firstNotStarted) {
            firstNotStarted.onboarding = true;
        } else {
            // no onboarding needed
        }
        this.cards.forEach(item => {
            try {
                this.createCard(item, {
                    card_type: cardType,
                    skip_drawer: cardType === PAGE_TYPES.ADMIN
                });
            } catch (err) {
                this.log.error(`createCard failed for ${cardType} item:`, item);
                this.log.error(err.message, err.stack);
                throw err;
            }
        });
    }

    async init_mg({boardId = null, callback = null} = {}) {
        const path = window.location.pathname;
        const segments = path.split('/').filter(Boolean);
        const page_type = segments[segments.length - 1];
        await this.init_dashboard({boardId: boardId, callback: callback, type: page_type})
        this.init_onboarding();
    }

    /*───────────────────────────  Dashboard/Docs/HUB END ──────────────────────────*/

    /*───────────────────────────  Dashboard helpers START ────────────────────────────*/

    renderBodyClass() {
        if (this.isFreeUser()) {
            this.log.debug(`is free user adding ${BLOCKED_CLASS} class to body`)
            document.body.classList.add(BLOCKED_CLASS);
        } else {
            this.log.debug(`is paid user removing ${BLOCKED_CLASS} class from body`)
            document.body.classList.remove(BLOCKED_CLASS);
        }
    }

    renderUserFields() {
        this.renderUserPoints();
        this.renderNavCountry();
        this.renderProgressBar();
        this.renderBuddyInfo();
        this.renderUserFolder();
        this.renderBodyClass();
    }



    renderHubFields() {
        const countryKey = localStorage.getItem(LOCALSTORAGE_KEYS.COUNTRY);
        if (!countryKey) {
            this.log.warning('No country selected in localStorage');
            return;
        }

        const links = this.config?.hub?.[countryKey]?.links || [];
        const visa = this.config?.hub?.[countryKey]?.visa || [];
        const hubLinksContainer = document.getElementById('hub-links');
        if (!hubLinksContainer) {
            this.log.warning('No element with id "hub-links" found');
            return;
        }

        hubLinksContainer.innerHTML = ''; // Очистить контейнер

        links.forEach(link => {
            const block = document.createElement('div');
            block.className = 'ac-hub__contact';
            block.innerHTML = `
                <div class="ac-hub__contact-icon">
                    <div class="b-embed w-embed">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M13.185 2.81465C13.543 3.17198 13.5277 3.78998 13.5064 4.25798C13.481 4.81398 13.3744 5.52398 13.1644 6.30398C12.745 7.86065 11.893 9.76331 10.357 11.3C8.6357 13.0213 6.5617 14.024 4.91704 14.418C4.70026 14.4689 4.47403 14.4632 4.26006 14.4016C4.04608 14.34 3.85153 14.2244 3.69504 14.066L1.9337 12.3046C1.77528 12.1483 1.65965 11.9539 1.5979 11.74C1.53615 11.5262 1.53034 11.3001 1.58104 11.0833C1.9757 9.43798 2.97837 7.36465 4.6997 5.64331C6.23637 4.10598 8.1397 3.25465 9.6957 2.83531C10.4757 2.62465 11.1857 2.51865 11.7424 2.49331C12.2097 2.47198 12.8277 2.45665 13.185 2.81465Z" fill="white"></path>
                        </svg>
                    </div>
                </div>
                <div class="ac-hub__info-content">
                    <div class="b-table__text">${link.name}</div>
                    ${link.value}
                </div>
            `;
            hubLinksContainer.appendChild(block);
        });


        const visaContainer = document.getElementById('hub-visa');
        visaContainer.innerHTML = ''; // Очистить контейнер
        if (visaContainer) {
            visaContainer.innerHTML = '';
            visa.forEach(field => {
                const block = document.createElement('div');
                block.className = 'ac-hub__info';
                block.innerHTML = `
                    <div class="ac-hub__info-icon">
                        <div class="b-embed w-embed">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14.6337 7.07C14.5803 7.28934 14.4646 7.4885 14.3003 7.64334L12.1003 9.79001C12.0778 9.81322 12.0598 9.84033 12.047 9.87001C12.0396 9.90068 12.0396 9.93266 12.047 9.96334L12.567 13.0033C12.6103 13.2273 12.587 13.4593 12.5003 13.67C12.42 13.8784 12.2782 14.0575 12.0937 14.1833C11.9144 14.3157 11.7022 14.3964 11.4803 14.4167H11.3937C11.1984 14.4163 11.0062 14.3682 10.8337 14.2767L8.10033 12.85C8.07195 12.8336 8.03976 12.825 8.00699 12.825C7.97423 12.825 7.94204 12.8336 7.91366 12.85L5.18033 14.2833C4.97506 14.39 4.7445 14.4384 4.51366 14.4233C4.28943 14.4042 4.07485 14.3235 3.89366 14.19C3.71087 14.0594 3.56966 13.8789 3.48699 13.67C3.40193 13.4586 3.3788 13.2274 3.42033 13.0033L3.94033 9.97001C3.95002 9.93965 3.95002 9.90703 3.94033 9.87667C3.92956 9.84749 3.91376 9.82041 3.89366 9.79667L1.69366 7.63667C1.5344 7.48168 1.42131 7.2855 1.36699 7.07C1.30215 6.85251 1.30215 6.62083 1.36699 6.40334C1.44028 6.18927 1.57228 6.00013 1.74793 5.85749C1.92357 5.71485 2.13578 5.62448 2.36033 5.59667L5.36033 5.15667C5.39021 5.15591 5.41874 5.14403 5.44033 5.12334C5.46591 5.10405 5.48649 5.0789 5.50033 5.05L6.90033 2.26334C6.99566 2.06334 7.14633 1.89467 7.33366 1.77667C7.47605 1.68675 7.63587 1.62799 7.80259 1.60425C7.96932 1.58051 8.13918 1.59232 8.30101 1.63892C8.46285 1.68552 8.61298 1.76584 8.74156 1.87461C8.87013 1.98338 8.97422 2.11813 9.04699 2.27L10.4337 5.04334C10.4504 5.07413 10.4731 5.10131 10.5003 5.12334C10.5243 5.14447 10.555 5.1563 10.587 5.15667L13.6337 5.59667C13.855 5.63001 14.063 5.72467 14.2337 5.87001C14.401 6.01467 14.5277 6.20067 14.6003 6.41001C14.671 6.62334 14.683 6.85134 14.6337 7.07Z" fill="white"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="ac-hub__info-content">
                        <div class="b-table__text">${field.name}</div>
                        <div class="b-text-bold">${field.value}</div>
                    </div>
                `;
                visaContainer.appendChild(block);
            });

        }
    }

    renderCountryInputs() {
        if (!this.config?.form?.countryIds) {
            this.log.warning('config.form.countryIds is not defined');
            return;
        }

        if (!Array.isArray(this.countries) || this.countries.length === 0) {
            this.log.warning('No countries to render in inputs');
            return;
        }

        this.config.form.countryIds.forEach(id => {
            const selectEl = document.getElementById(id);
            if (!id) {
                this.log.warning('Empty or null id found in countryIds array');
                return;
            }
            if (!selectEl) {
                this.log.warning(`No input found with id: ${id}`);
                return;
            }

            selectEl.innerHTML = '';
            this.countries.forEach(country => {
                const option = document.createElement('option');
                option.value = country;
                option.textContent = country;
                selectEl.appendChild(option);
            });
        });
    }

    renderNavCountry() {
        const country = localStorage.getItem(LOCALSTORAGE_KEYS.COUNTRY)
        const countryElement = document.getElementById('nav-country');

        if (countryElement) {
            const items = countryElement.querySelectorAll('[data-country]');
            items.forEach(item => {
                item.classList.remove('active');
                if (country && item.getAttribute('data-country') === country) {
                    item.classList.add('active');
                }
            });
        }
    }

    renderStagingUrls() {
      const isStaging = window.location.pathname.startsWith('/staging/');
      if (!isStaging) return;

      document.querySelectorAll('a[href*="/app/"]').forEach(link => {
        link.href = link.href.replace('/app/', '/staging/');
      });
    }

    appPrefix() {
      return window.location.pathname.startsWith('/staging/') ? '/staging' : '/app';
    }

    renderBuddyInfo() {
        if (this.isBuddyUser()) {
            const adminLink = document.getElementById(ADMIN_LINK_ID)
            if (adminLink) {
                adminLink.style.display = 'flex';
            }
            const boardEmail = localStorage.getItem(LOCALSTORAGE_KEYS.EMAIL);
            if (boardEmail) {
                const buddyEl = document.getElementById('buddy-info')
                if (buddyEl) {
                    buddyEl.style.display = 'block';
                    buddyEl.innerHTML = `<strong>Board owner email:</strong> ${boardEmail}`;
                }
            }
        }
    }

    #hideUserControls() {
        USER_CONTROL_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = "none";
            }
        });
    }

    #appendBoardIdToLinks(boardId) {
      USER_CONTROL_IDS.forEach(id => {
        const link = document.getElementById(id);
        if (link && link.href) {
          try {
            const url = new URL(link.href);
            url.searchParams.set('boardId', boardId);
            link.href = url.toString();
            this.log.debug(`✨ Updated link [${id}]: ${link.href}`);
          } catch (e) {
            this.log.debug(`Invalid URL in link [${id}]:`, link.href);
          }
        }
      });
    }


    renderProgressBar() {
        const createdDate = localStorage.getItem(LOCALSTORAGE_KEYS.DATE);
        const dateEl = document.getElementById('created-date')
        if (dateEl) {
            dateEl.textContent = `Since ${createdDate}`;

        }
        this.updateProgress()
    }

    updateProgress() {
        const goal = parseInt(localStorage.getItem(LOCALSTORAGE_KEYS.GOAL), 10) || 0;
        const done = parseInt(localStorage.getItem(LOCALSTORAGE_KEYS.DONE), 10) || 0;
        const percent = goal > 0 ? Math.round((done / goal) * 100) : 0;
        const countEl = document.getElementById('progress-bar-count');
        const fillEl = document.getElementById('progress-bar-fill');
        if (countEl) {
            countEl.textContent = `Your progress: ${done}/${goal}`;
        }

        if (fillEl) {
            fillEl.style.width = `${percent}%`;
        }
    }



    renderUserFolder() {
        const element = document.getElementById(G_DRIVE_FOLDER_ID);
        if (!element) {
            this.log.debug(`element ${G_DRIVE_FOLDER_ID} for g drive button not found`)
            return;
        }
        if (this.isFreeUser()) {
            element.onclick = () => this.#handleOpenDrive(null);
            return;
        }

        this.#removeInfoColumn();

        this.api.getUserFilesFolder({}, { userId: this.boardUser.id })
            .then(urlFolder => {
                this.userFilesFolder = urlFolder;
                this.log.debug(`url got for user: ${urlFolder}`);


                // Проверка на наличие viewLink
                if (!this.userFilesFolder?.viewLink) {
                    this.log.warning("file folder url not found");
                    if (element) element.remove();
                    return;
                }

                if (element) {
                    // Удалить атрибуты Fancybox
                    element.removeAttribute("data-fancybox");
                    element.removeAttribute("data-src");

                    element.classList.remove('b-button_locked');

                    // element.setAttribute("href", this.userFilesFolder.viewLink);
                    // element.setAttribute("target", "_blank");
                    element.onclick = () => this.#handleOpenDrive(this.userFilesFolder.viewLink);


                    // Удалить иконку "замочек", если есть
                    const lockIcon = element.querySelector('.b-lock-icon, .lock, svg.lock');
                    if (lockIcon) {
                        lockIcon.remove();
                    }
                } else {
                    this.log.warning("element id 'g-drive-folder' not found!");
                }
            })
            .catch(err => {
                this.log.error("Failed to get url folder:", err);
            });
    }

    renderUserPoints() {
        var points = 0
        if (!this.config?.user?.pointsContainerId) {
            this.log.warning('config.user.pointsContainerId is not defined');
            return;
        }

        const el = this.config.user.pointsContainerId;
        if (!el) {
            this.log.warning(`Element with id ${this.config.user.pointsContainerId} not found`);
            return;
        }

        if (!this.currentUser || typeof this.currentUser.points !== 'number') {
            this.log.warning('currentUser or points not set');
        } else {
            points = this.currentUser.points || 0
        }

        el.textContent = points;
        this.log.debug(`User points rendered into #${this.config.user.pointsContainerId}: ${points}`);
    }

    updateUserPoints(diff) {
        if (!this.currentUser) {
            this.log.warning('currentUser not set');
            return;
        }
        if (typeof this.currentUser.points !== 'number') {
            this.currentUser.points = 0;
        }
        this.currentUser.points += diff;
        this.renderUserPoints();
    }

    smartMerge(target, source) {
        for (const key of Object.keys(source)) {
            const srcVal = source[key];
            const tgtVal = target[key];
            this.log.debug(`[smartMerge] Processing key="${key}"`)

            if (Array.isArray(srcVal)) {
                if (srcVal.length === 0 && Array.isArray(tgtVal) && tgtVal.length > 0) {
                    this.log.debug(`[smartMerge] Processing key="${key}" array condition lost `)

                    continue;
                }
                this.log.debug(`[smartMerge] Processing key="${key}" array condition won `)
                target[key] = srcVal;
            } else if (srcVal !== null && typeof srcVal === 'object') {
                if (!tgtVal || typeof tgtVal !== 'object') {
                    target[key] = {};
                }
                this.smartMerge(target[key], srcVal);
            } else if (srcVal === null && tgtVal !== null) {
                continue;
            } else if (srcVal !== undefined) {
                target[key] = srcVal;
            }
        }
    }

    getNextStatus(current) {
        const flow = this.isFreeUser() ? STATUS_FLOW_NO_SUBSCRIPTION : STATUS_FLOW;
        return flow[current]?.next ?? null;
    }

    getPrevStatus(current) {
        const flow = this.isFreeUser() ? STATUS_FLOW_NO_SUBSCRIPTION : STATUS_FLOW;
        return flow[current]?.prev ?? null;
    }

    hideBlockedContainers() {
        if (!this.isFreeUser()) return;

        FREE_USER_BLOCKED_STATUSES.forEach(status => {
            let container = null;

            switch (status) {
                case 'ASAP':
                    container = this.config.containers.asap;
                    break;
                case 'REQUIRES_CHANGES':
                    container = this.config.containers.edit;
                    break;
            }

            if (container) {
                const parent = container.closest('.brd-column'); // ищем родителя
                if (parent) {
                    parent.remove(); // убираем целый .brd-column
                    this.log.info(`✨ Free user - removed parent .brd-column for ${status}`);
                } else {
                    this.log.warn(`⚠️ No parent .brd-column found for ${status}`);
                }
            }
        });
    }

    isFreeUser() {
      return this.boardUser?.subscriptionPlan?.includes('Free') || false;
    }

    clearBoardLocalCache() {
      Object.values(LOCALSTORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      this.log.info('✨ Cleared board cache from localStorage');
    }

    createCard(item, options = {}) {
        const {skip_drawer = false, card_type = PAGE_TYPES.TODO} = options;

        this.log.debug(`Creating card for ${card_type} item: ${item}`);

        var card = null;
        if (card_type === PAGE_TYPES.TODO) {
            card = this.config.template?.cloneNode(true);
        } else if (card_type === PAGE_TYPES.DOCS) {
            card = this.config.docTemplate?.cloneNode(true);
        } else if (card_type === PAGE_TYPES.ADMIN) {
            card = this.config.adminCardTemplate?.cloneNode(true);
        }
        if (card) {
            this.#insertCard(card, item);
        } else {
            throw new Error(`unknown card type "${card_type}". `);
        }

        if (!skip_drawer) {
            this.log.debug(`Creating drawer for ${card_type} item: ${item}`);
            // drawer logic
            const drawer = this.config.drawer?.cloneNode(true);
            if (drawer) {
                this.#insertDrawer(drawer, item);
            }
        }
    }

    /*───────────────────────────  Dashboard helpers END ────────────────────────────*/

    /**
     * @typedef {Object} TaskItem
     * @property {string} name - Task title
     * @property {string} status - Task status
     * @property {string} taskType - Type or category of the task
     * @property {string} shortDescription - Brief description of the task
     * @property {string} longDescription - description for the drawer
     * @property {string} [location] - Country or location where the task applies (optional)
     * @property {string} [deadline] - Deadline date as an ISO string (optional)
     * @property {string} assignName - Name of the assignee
     * @property {string} difficulty - Difficulty level
     * @property {Array} files - Array of attached files
     * @property {Array} comments - Array of comments
     * @property {number} points - Points awarded for the task
     * @property {number} priority - for sorting
     */

    /*───────────────────────────  Card & Drawer DOM START ──────────────────*/

    #getStatusContainer(status) {
        switch (status) {
            case 'NOT_STARTED':
                return this.config.containers.notStarted;
            case 'ASAP':
                return this.config.containers.asap;
            case 'IN_PROGRESS':
                return this.config.containers.inProgress;
            case 'REQUIRES_CHANGES':
                return this.config.containers.edit;
            case 'READY':
                return this.config.containers.ready;
            default:
                this.log.warning(`Unknown status: ${status}`);
                // todo allDrawers rename to general space or similar
                return this.config.mainContainer;
        }
    }

    /** @type {Set<string>} */
    // delete assign from that set after it has been added to backend //
    #optionalFields = new Set(['location', 'deadline', 'assign']);

    /**
     * Populates a cloned task/card template with the values from a task object.
     *
     * @param {HTMLElement} clone  – the clone to populate.
     * @param {TaskItem}    item   – task data.
     * @param {Object}      [opts] – optional behaviour overrides.
     * @param {string}      [opts.fieldSelector='[data-card]']   – selector for all “data holders”.
     * @param {string}      [opts.labelSelector='.js-ingest'] – selector for the label inside each holder.
     * @param {Object}      [opts.renderers]                     – per‑field rendering functions (receive (el, value)).
     */

    #setContent(clone, item, {
        fieldSelector = '[data-card]', labelSelector = '.js-ingest', renderers = {}
    } = {}) {
        const allFields = clone.querySelectorAll(fieldSelector);
        // Derive the attribute name from selector, e.g. '[data-task]' → 'data-task'
        const attrMatch = fieldSelector.match(/\[([^\]=]+)(?:=[^\]]+)?\]/);
        if (!attrMatch) {
            throw new Error(`Migroot#setContent: cannot derive attribute name from selector "${fieldSelector}". ` + 'Provide a selector that contains an attribute filter like "[data-foo]".');
        }
        const attrName = attrMatch[1];

        allFields.forEach(container => {
            const key = container.getAttribute(attrName);
            this.log.debug(`Found key="${key}" in ${fieldSelector}`);
            // for example data-task='status' => key is status
            if (!key) return;

            let value = item[key];
            this.log.debug(`Found value="${value}" for key="${key}" in ${fieldSelector}`);
            const isValueEmpty = value === undefined || value === null || value === '' || (typeof value === 'number' && Number.isNaN(value));

            if (this.#optionalFields.has(key) && isValueEmpty) {
                if (key === 'location') {
                    this.log.debug(`Missing location; setting default to "online"`);
                    value = 'online';
                } else if (key === 'deadline') {
                    this.log.debug(`Missing deadline; setting default to "TBD"`);
                    value = 'TBD';
                } else {
                    this.log.debug(`Optional value="${value}" for key="${key}" in ${fieldSelector} removing`);
                    container.remove(); // not working in drawer
                    return;
                }
            } else if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
                this.log.warning(`Null value="${value}" for key="${key}" in ${fieldSelector} skipping`);
                // return;
            }
            // Arrays → their length
            if (Array.isArray(value)) {
                value = value.length;
            }


            // Find label element or fall back to the container itself
            const labelEl = container.querySelector(labelSelector) || container;
            try {
                const which = renderers[key] ? 'custom' : 'default';
                this.log.debug(`Rendering using ${which} renderer => key="${key}" with value="${value}" into element:`, labelEl);
                (renderers[key] || this.#defaultRenderer)(labelEl, value);
            } catch (err) {
                this.log.error(`Renderer failed for key="${key}" value=`, value);
                this.log.error(err.message, err.stack);
                throw err; // bubble up
            }
        });
    }

    #insertCard(card, item) {
        this.#setContent(card, item, {
            fieldSelector: '[data-card]', labelSelector: '.js-ingest', renderers: {
                viewLink: this.#renderUrl.bind(this),  // for doc-board
                linkTodo: this.#renderUrl.bind(this),  // for admin
                linkDocs: this.#renderUrl.bind(this),  // for admin
                deadline: this.#renderDeadline.bind(this),
                difficulty: this.#renderDifficulty.bind(this)
            }
        });
        const targetContainer = this.#getStatusContainer(item.status);

        card.id = `task-${item.id}`;
        if (item.onboarding) {
            card.dataset.onboarding = 'true';
        }
        card.dataset.required = item.documentRequired ? 'true' : 'false';
        card.dataset.difficulty = item.difficulty || '';
        card.dataset.status = item.status || '';
        this.log.debug(`Setting card content for card ID: ${card.id}`);
        card.onclick = () => this.#handleCardClick(item);
        this.log.debug('Replacing existing card if needed');
        this.#replaceExistingCard(card, targetContainer);
    }


    #insertDrawer(drawer, item) {
        // item == board task object
        this.#setContent(drawer, item, this.#drawerOpts());

        drawer.id = `drawer-${item.clientTaskId}`;

        if (item.onboarding) {
            drawer.dataset.onboarding = 'true';
        }
        drawer.dataset.required = item.documentRequired ? 'true' : 'false';
        drawer.dataset.difficulty = item.difficulty || '';
        drawer.dataset.status = item.status || '';
        this.log.debug(`Setting drawer content for card ID: ${item.clientTaskId}`);
        // CREATE CLOSE BUTTON
        const closeButton = drawer.querySelector('.drw-close');
        if (closeButton) {
            closeButton.onclick = (e) => {
                e.preventDefault();
                if (this.onboarding?.isVisible) {

                    return;
                }
                drawer.style.display = 'none';
            };
        }

        const existingDrawer = document.getElementById(`drawer-${item.clientTaskId}`);
        if (existingDrawer) {
            existingDrawer.replaceWith(drawer);
        } else {
            this.config.mainContainer.appendChild(drawer);
        }
    }

    #handleOpenDrive(link) {
      this.ga.send_event('click_g_drive')
        if (link) {
          window.open(link, '_blank', 'noopener,noreferrer');
        }
    };

    #handleCardClick(item) {
        this.log.debug(`Card clicked: ${item.clientTaskId}`);
        this.ga.send_event('click_task_details')
        const drawerEl = document.getElementById(`drawer-${item.clientTaskId}`);
        if (drawerEl) {
            drawerEl.style.display = 'flex';
            this.log.debug(`Drawer opened for card ID: ${item.clientTaskId}`);

            // --- Enrich with full task data if not fetched yet ---
            const task = this.cards?.find(t => String(t.clientTaskId) === item.clientTaskId);
            this.log.debug('Checking task: ', task);

            this.log.debug('Checking if task needs enrichment', {
                hasTask: !!task, alreadyFetched: task?._detailsFetched
            });
            if (task && !task._detailsFetched) {
                this.log.debug(`Enriching task ${item.clientTaskId} with full details`);
                this.api.getClientTask({}, {taskId: item.clientTaskId})
                    .then(fullTask => {
                        fullTask = this.#taskItemToCard(fullTask);
                        this.smartMerge(task, fullTask);
                        task._detailsFetched = true;
                        this.log.debug(`Task ${task.clientTaskId} enriched with full data`);
                        this.#updateDrawerContent(task);
                    })
                    .catch(err => {
                        this.log.error('Failed to enrich task data:', err);
                    });
            } else {
                this.log.debug(`Task ${item.clientTaskId} already enriched or not found`);
            }
            // --- End enrichment ---

            // drawer closing logic start ///
            if (this._drawerOutsideHandler) {
                document.removeEventListener('pointerdown', this._drawerOutsideHandler);
            }

            this._drawerOutsideHandler = (event) => {
                if  (this.onboarding?.isVisible) {
                    return;
                }
                if (drawerEl && !drawerEl.contains(event.target)) {
                    this.log.debug(`Click outside reopened drawer-${item.clientTaskId}, closing`);
                    drawerEl.style.display = 'none';
                    document.removeEventListener('pointerdown', this._drawerOutsideHandler);
                    this._drawerOutsideHandler = null;
                } else {
                    this.log.debug(`Click inside reopened drawer-${item.clientTaskId}, not closing`);
                }
            };

            document.addEventListener('pointerdown', this._drawerOutsideHandler);
            // drawer closing logic end ///
        }
    }

    /*───────────────────────────  Card & Drawer DOM END ────────────────────*/


    /*───────────────────────────  Drawer helpers START ─────────────────────*/

    #drawerOpts() {
        return {
            fieldSelector: '[data-drawer]', labelSelector: '.js-ingest', renderers: {
                deadline: this.#renderDeadline.bind(this),
                difficulty: this.#renderDifficulty.bind(this),
                longDescription: this.#renderLongDescription.bind(this), // upload_button     : this.#renderUploadButton.bind(this),
                comments: this.#renderComments.bind(this),
                files: this.#renderFiles.bind(this),
            }
        };
    }

    /**
     * Given any element inside a drawer, returns the clientTaskId by
     * walking up to the ancestor with id="drawer‑{id}".
     * Returns null if not found.
     */
    #taskIdFromDrawer(el) {
        const drawer = el.closest('[id^="drawer-"]');
        return drawer ? drawer.id.replace('drawer-', '') : null;
    }

    #defaultRenderer = (el, val) => {
        if (val === undefined || val === null || val === '') {
            el.remove();          // ничего нет – убираем блок
        } else {
            el.textContent = val; // иначе пишем текст
        }
    };

    #renderLongDescription(el, val) {
        if (val) el.innerHTML = val; else el.remove();
    }

    #renderDeadline(el, val) {
        if (val) el.textContent = this.#formatDate(val); else el.remove();
    }

    #renderDifficulty(el, val) {
        if (val) el.textContent = this.#formatDifficulty(val); else el.remove();
    }

    #renderComments(el, val) {
        const arr = Array.isArray(val) ? val : [];
        const container = el.querySelector('.cmt-wrap');
        if (!container) {
            el.textContent = 'Files container not found';
            return;
        }
        if (!arr.length) {
            container.innerHTML = '<div class="drw-empty">No comments yet</div>';
        } else {
            container.innerHTML = arr.map(c => {
                let positionClass, initials, name;

                if (c.author == null) {
                    positionClass = 'cmt-right cmt-migroot';
                    initials = 'M';
                    name = 'Migroot';
                } else {
                    const isUser = c.author.id === this.currentUser.id;
                    positionClass = isUser ? 'cmt-left' : 'cmt-right';

                    const first = c.author?.firstName || '';
                    const last = c.author?.lastName || '';
                    initials = ((first[0] || '') + (last[0] || first[1] || '')).toUpperCase();
                    name = `${first} ${last}`.trim();
                }

                const date = this.#formatDateTime(c.createdDate);
                return `
                  <div class="cmt-item ${positionClass}">
                    <div class="cmt-item__header">
                      <div class="cmt-item__avatar-wrap">
                        <img class="cmt-item__avatar" src="">
                            ${initials}
                      </div>
                      <div class="cmt-item__name">${name}</div>
                      <div class="cmt-item__date">${date}</div>
                    </div>
                    <div class="cmt-item__content">${c.message}</div>
                  </div>
                `;
            }).join('');
        }
    }

    isBuddyUser() {
        return ['BUDDY', 'SUPERVISOR', 'ADMIN'].includes(this.currentUser?.type) &&
               this.currentUser?.email !== 'kornieiev89.o@gmail.com';
    }

    #renderFiles(el, val) {
        const isBuddy = this.isBuddyUser();
        const arr = Array.isArray(val) ? val : [];
        const container = el.querySelector('.drw-uploaded .f-wrap');
        if (!container) {
            el.textContent = 'Files container not found';
            return;
        }

        if (!arr.length) {
            container.innerHTML = '<div class="drw-empty">Nothing yet...</div>';
            return;
        }

        container.innerHTML = arr.map(file => {
            return `
                <div class="file-wrapper">
                  <div class="file-info">
                    <a class="f-item" href="${file.downloadLink}" target="_blank">
                        <div class="f-item__header">
                            <img src="https://cdn.prod.website-files.com/679bc8f10611c9a0d94a0caa/683476cbb9aeb76905819fc7_document-color.svg" alt="" class="f-item__icon">
                            <div class="f-item__name">${file.fileName}</div>
                            <div class="f-item__status ${file.status}">${file.status}</div>
                        </div>
                        <div class="f-item__date">${this.#formatDateTime(file.createdDate)}</div>
                    </a>
                  </div>
                  ${
                isBuddy === true
                    ? `<div class="file-actions">
                        <button data-file-id="${file.fileId}" onclick="handleApproveFile(this)">Approve</button>
                        <button data-file-id="${file.fileId}" onclick="handleRejectFile(this)">Reject</button>
                      </div>`
                    : ''
            }
                </div>
            `;
        }).join('');
    }

    #handleApproveFile(el) {
        this.ga.send_event('click_task_approve_file')
        const fileId = el?.dataset?.fileId;
        const actionsContainer = el.parentElement;
        const wrapper = el.closest('.file-wrapper');
        const originalHTML = actionsContainer.innerHTML;
        actionsContainer.innerHTML = '<div class="loading-placeholder">Grooting... </div>';
        this.api.approveFile({}, { fileId }).then((updatedFile) => {
            this.log.info(`File ${fileId} approved`);
            if (wrapper) {
                const statusEl = wrapper.querySelector('.f-item__status');
                if (statusEl) statusEl.textContent = updatedFile.status;
                if (statusEl) statusEl.className = `f-item__status ${updatedFile.status}`;
            }
            actionsContainer.innerHTML = originalHTML;
            this.#updateTaskAndDrawer(updatedFile);
        }).catch(err => {
            this.log.error(`Failed to approve file ${fileId}:`, err);
            actionsContainer.innerHTML = originalHTML;
        });
    }


    #handleRejectFile(el) {
        this.ga.send_event('click_task_reject_file')
        const fileId = el?.dataset?.fileId;
        const actionsContainer = el.parentElement;
        const wrapper = el.closest('.file-wrapper');
        const originalHTML = actionsContainer.innerHTML;
        actionsContainer.innerHTML = '<div class="loading-placeholder">Grooting...</div>';
        this.api.rejectFile({}, { fileId }).then((updatedFile) => {
            this.log.info(`File ${fileId} rejected`);
            if (wrapper) {
                const statusEl = wrapper.querySelector('.f-item__status');
                if (statusEl) statusEl.textContent = updatedFile.status;
                if (statusEl) statusEl.className = `f-item__status ${updatedFile.status}`;
            }
            actionsContainer.innerHTML = originalHTML;
            this.#updateTaskAndDrawer(updatedFile);
        }).catch(err => {
            this.log.error(`Failed to reject file ${fileId}:`, err);
            actionsContainer.innerHTML = originalHTML;
        });
    }

    #renderUrl(el, val) {
        if (!val) {
            return;
        }
        el.setAttribute('href', val);
    }

    #updateDrawerContent(task) {
        // # find the drawer linked and upd comments and files
        const drawer = document.getElementById(`drawer-${task.clientTaskId}`);
        if (!drawer) return;

        // Tab 2: Comments
        const commentsPane = drawer.querySelector('.tb-pane[data-w-tab="Tab 2"]');
        if (commentsPane) this.#renderComments(commentsPane, task.comments);

        // Tab 3: Files
        const filesPane = drawer.querySelector('.tb-pane[data-w-tab="Tab 3"]');
        if (filesPane) this.#renderFiles(filesPane, task.files);


        this.#setContent(drawer, task, this.#drawerOpts());
        drawer.dataset.status = task.status || '';

    }

    #handleStartFromButton(btn) {
        this.ga.send_event('click_task_start')

        const id = this.#taskIdFromDrawer(btn);
        const item = this.cards?.find(t => String(t.clientTaskId) === id);
        if (item) this.#handleStatusChange(item, 'IN_PROGRESS');
    }

    #handleNextButton(btn) {
        this.ga.send_event('click_task_next_status')
        const id = this.#taskIdFromDrawer(btn);
        const item = this.cards?.find(t => String(t.clientTaskId) === id);
        const next_status = this.getNextStatus(item.status);
        if (item) this.#handleStatusChange(item, next_status);
    }

    #handlePrevButton(btn) {
        this.ga.send_event('click_task_prev_status')
        const id = this.#taskIdFromDrawer(btn);
        const item = this.cards?.find(t => String(t.clientTaskId) === id);
        const prev_status = this.getPrevStatus(item.status);
        if (item) this.#handleStatusChange(item, prev_status);
    }

    #handleReadyButton(btn) {
        this.ga.send_event('click_task_ready_status')
        const id = this.#taskIdFromDrawer(btn);
        const item = this.cards?.find(t => String(t.clientTaskId) === id);
        if (item) this.#handleStatusChange(item, 'READY');
    }

    #handleStatusChange(item, status) {
        this.log.debug('Set new status for task', item.clientTaskId);

        const previousStatus = item.status;
        item.status = status;                 // optimistic
        // // Move card immediately
        this.createCard(item, {skip_drawer: true, card_type: item.card_type});

        // Persist to backend
        this.api.updateClientTask({status: status}, {taskId: item.clientTaskId}).then(updatedTask => {
            this.#updateTaskAndDrawer(updatedTask)
            if (previousStatus === "READY" || status === "READY") {
                this.#updateLocalStorage(this.board);
                this.updateProgress();
            }
            if (status === "READY" && previousStatus !== "READY") {
                this.updateUserPoints(item.points);
            } else if (status !== "READY" && previousStatus === "READY") {
                this.updateUserPoints(-item.points);
            }


        }).catch(err => {
            this.log.error('Failed to update task status:', err);
            item.status = previousStatus;
            this.createCard(item, {card_type: item.card_type})
        });
    }

    #updateTaskAndDrawer(data) {
        const updatedTask = data?.taskRef || data;
        if (!updatedTask || !updatedTask.clientTaskId) {
            this.log.warning(`[updateTaskAndDrawer] No valid task data provided`);
            return;
        }
        const taskId = String(updatedTask.clientTaskId);
        const taskIndex = this.cards.findIndex(t => String(t.clientTaskId) === taskId);
        if (taskIndex === -1) {
            this.log.warning(`[updateTaskAndDrawer] Task with ID ${taskId} not found in cards`);
            return;
        }
        this.log.debug(`[updateTaskAndDrawer] Updating task ID=${taskId}`);
        this.smartMerge(this.cards[taskIndex], updatedTask);
        this.cards[taskIndex]._detailsFetched = true;
        this.createCard(this.cards[taskIndex], {
            skip_drawer: true,
            card_type: this.cards[taskIndex].card_type,
        });
        this.#updateDrawerContent(this.cards[taskIndex]);
        this.log.debug(`[updateTaskAndDrawer] Task ID=${taskId} successfully updated`);
    }

    #handleCreateBoard(formEl) {
        // Prevent default behavior
        this.ga.send_event('click_create_board_finish')
        if (formEl?.preventDefault) {
            formEl.preventDefault();
            formEl = formEl.target;
        }

        const formData = new FormData(formEl);
        const features = [];
        const questionnaire = {};
        const allowedFeatureTypes = new Set(FEATURE_TYPES);
        for (const key of formData.keys()) {
            const values = formData.getAll(key).map(v => v.trim()).filter(v => v !== "");
            questionnaire[key] = values.length > 1 ? values : values[0] || "";
            // todo from checkbox generate features
            if (allowedFeatureTypes.has(key) && values.length > 0) {
                features.push({
                    type: key,
                    value: values.length === 1 ? values[0] : values  // одно значение или массив
                });
            }
        }

        // Show preloader overlay before calling createBoard
        const original = document.getElementById('screen-preloader');

        let overlay = null;
        if (!original) {
            // fallback: create a simple overlay if original is not found
            overlay = document.createElement('div');
            overlay.id = 'board-create-loader';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
            overlay.style.color = 'white';
            overlay.style.fontSize = '24px';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.zIndex = '9999';
            overlay.innerText = '✈️ “Packing your relocation board…”';
        } else {
            overlay = original.cloneNode(true);
            // Remove duplicate id from the cloned overlay
            overlay.id = 'board-create-loader';
            // Find the child with id="preloader-text" and update its id and text
            const innerTextEl = overlay.querySelector('#preloader-text');
            if (innerTextEl) {
                innerTextEl.id = 'board-preloader-text';
                innerTextEl.textContent = '✈️ “Packing your relocation board…”';
            }
        }

        if (!document.getElementById('board-create-loader')) {
            document.body.appendChild(overlay);
        }

        this.createBoard(features, questionnaire).then(async (createdBoard) => {
            if (createdBoard && createdBoard.boardId) {
                this.log.debug('Board successfully created', createdBoard);
                this.ga.send_event('create_board_finish')
                await new Promise(resolve => setTimeout(resolve, 2000));
                // The overlay remains until redirect.

                window.location.href = `${this.appPrefix()}/todo?boardId=${createdBoard.boardId}`;
            } else {
                this.log.error('Invalid response: boardId or status missing', createdBoard);
            }
        }).catch(err => {
            this.log.error('Failed to create board:', err);
            const existing = document.getElementById('board-create-loader');
            if (existing) existing.remove();
            alert('Failed to create board. Please try again later.');
        });

        return false;
    }

    #handleChooseFile(input) {
        this.ga.send_event('click_task_choose_file')
        const labelText = input.closest('.frm-upload__label').querySelector('.frm-upload__text');
        const errorEl = input.closest('.frm-upload__card').querySelector('.frm-upload__error');

        errorEl.textContent = ""; // сбросить ошибку

        if (input.files && input.files.length > 0) {
            const file = input.files[0];

            if (file.size > 25 * 1024 * 1024) {
                errorEl.textContent = "File is too large! Max 25 MB.";
                input.value = "";
                labelText.textContent = 'Add file';
                return;
            }

            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
            if (!allowedTypes.includes(file.type)) {
                errorEl.textContent = "Invalid file type. Allowed: PDF, JPG, PNG.";
                input.value = "";
                labelText.textContent = 'Add file';
                return;
            }

            // Всё ок — показываем имя
            labelText.textContent = file.name;
        } else {
            labelText.textContent = 'Add file';
        }
    }

    #removeInfoColumn() {
      const infoEl = document.getElementById('info');
      if (infoEl) {
        const columnEl = infoEl.closest('.brd-column');
        if (columnEl) {
          columnEl.remove();
          console.log('Column with #info removed');
        } else {
          console.warn('Parent .brd-column not found for #info');
        }
      } else {
        console.warn('Element with id "info" not found');
      }
    }

    // File upload submit handler (overwritten)
    #handleFileUploadSubmit(formEl) {
        this.ga.send_event('click_task_file_send')
        const raw = new FormData(formEl);
        const formData = new FormData();
        const taskId = this.#taskIdFromDrawer(formEl);
        if (!taskId) {
            this.log.error('Cannot extract task ID from form');
            return;
        }
        const uploadedFile = raw.get('fileToUpload');
        const fileInput = formEl.querySelector('input[name="fileToUpload"]');
        const fileLabel = formEl.querySelector('.frm-upload__text');
        const fileError = formEl.querySelector('.frm-upload__error');
        const submitBtn = formEl.querySelector('input[type="submit"]');

        if (!uploadedFile) {
            this.log.error('No file selected for upload');
            return;
        }

        // Additional validation: check if file is empty
        if (uploadedFile.size === 0) {
            this.log.error('Uploaded file is empty');
            if (fileError) fileError.textContent = 'File is empty or file size is 0.';
            // alert('File is empty or filesize is 0. Please add the correct file. Allowed: PDF, JPG, PNG.');
            return;
        }

        const maxSize = 25 * 1024 * 1024;
        if (uploadedFile.size > maxSize) {
            this.log.error('File is too large. Maximum size is 25MB.');
            if (fileError) fileError.textContent = 'File is too large. Maximum size is 25MB.';
            alert('File is too large. Maximum size is 25MB.');
            return;
        }

        // 🔒 Проверка формата
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowedTypes.includes(uploadedFile.type)) {
            this.log.error(`Invalid file type: ${uploadedFile.type}`);
            fileError.textContent = 'Invalid file type. Allowed: PDF, JPG, PNG.';
            alert('Invalid file type. Allowed: PDF, JPG, PNG.');
            return;
        }

        formData.append('file', uploadedFile);

        if (fileLabel) fileLabel.textContent = 'Loading';
        if (submitBtn) submitBtn.disabled = true;

        this.api.uploadFile(formData, {taskId}).then(updatedTask => {
            this.#updateTaskAndDrawer(updatedTask)

            if (submitBtn) submitBtn.disabled = false;
            if (fileInput) fileInput.value = '';
            if (fileLabel) fileLabel.textContent = 'Add file';
            if (fileError) fileError.textContent = '';
        }).catch(err => {
            if (fileError) fileError.textContent = 'File upload failed';
            this.log.error('File upload failed:', err);
        });
    }

    #handleCommentSubmit(formEl) {
        this.ga.send_event('click_task_comment_send')
        const input = formEl.querySelector('input[name="Comment"]');
        const message = input?.value?.trim();
        const taskId = this.#taskIdFromDrawer(formEl);

        if (!taskId || !message) {
            this.log.error('Missing taskId or message');
            return;
        }
        const authorId = this.currentUser?.id;
        const body = {
            author: authorId, message: message
        };
        this.api.commentClientTask(body, {taskId}).then(updatedTask => {
            this.#updateTaskAndDrawer(updatedTask)
            input.value = ''; // clear field
        }).catch(err => {
            this.log.error('Comment submit failed:', err);
        });
    }

    /*───────────────────────────  Drawer helpers END ───────────────────────*/


    /*───────────────────────────  Utility & Formatting START ───────────────*/


    #clearContainers() {
        this.log.debug('Step 2: Clearing containers');
        Object.values(this.config.containers).forEach(container => container.innerHTML = '');
    }

    #observeContainersWithCount() {
        const observerConfig = { childList: true, subtree: false };

        Object.entries(this.config.containers).forEach(([key, container]) => {
            if (!container || !container.id) {
                this.log.warning(`Container ${key} is missing or has no id`);
                return;
            }

            const countEl = document.getElementById(`${container.id}-count`);
            if (!countEl) {
                this.log.warning(`Count element not found for container ${container.id}`);
                return;
            }

            const updateCount = () => {
                countEl.textContent = container.children.length;
            };

            updateCount();
            const observer = new MutationObserver(updateCount);
            observer.observe(container, observerConfig);

            this.log.debug(`MutationObserver attached to #${container.id}`);
        });
    }

    #formatDate(isoString) {
        if (isoString === 'TBD') {
            return isoString;
        }
        const date = new Date(isoString);
        return date.toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', timeZone: this.config.timeZone
        });
    }

    #formatDateTime(isoString) {
        if (isoString === 'TBD') {
            return isoString;
        }

        const date = new Date(isoString);

        return date.toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    }

    #formatDifficulty(value) {
        return value?.toLowerCase?.() || value;
    }

    #getRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    #replaceExistingCard(card, targetContainer) {
        const oldCard = document.getElementById(card.id);
        if (oldCard) oldCard.remove();
        targetContainer.insertBefore(card, targetContainer.firstChild);
    }

    #showLoader(cardId, show, text = 'Loading') {
        const loader = document.querySelector(`#${cardId} .ac-doc__loader`);
        if (loader) {
            loader.style.display = show ? 'flex' : 'none';
            if (show) loader.querySelector('.ac-doc__loader-text').textContent = text;
        }
    }

    #showCreateButton() {
        const original = document.getElementById('screen-preloader');

        if (!original) {
            this.log.warning('no preloader to render');
            return;
        }

        const clone = original.cloneNode(true);

        clone.innerHTML = '';

        const text = document.createElement('h1');
        text.textContent = 'You need to pass short quiz to generate your journey';
        text.style.color = '#333';
        text.style.marginBottom = '20px';
        text.style.fontSize = '32px';
        text.style.textAlign = 'center';
        clone.style.display = 'flex';
        clone.style.flexDirection = 'column';
        clone.style.alignItems = 'center';
        clone.style.justifyContent = 'center';
        clone.style.gap = '20px';
        clone.style.height = '100vh';

        const button = document.createElement('a');
        button.textContent = 'let\'s go';
        // button.href = `${this.appPrefix()}/create-board`;
        button.style.display = 'inline-block';
        button.style.padding = '12px 24px';
        button.style.backgroundColor = '#ff9900';
        button.style.color = '#fff';
        button.style.textDecoration = 'none';
        button.style.fontSize = '18px';
        button.style.borderRadius = '8px';
        button.onclick = () => {
          this.ga.send_event('click_start_initial_quiz');
          window.location.href = `${this.appPrefix()}/create-board`;
        };

        clone.appendChild(text);
        clone.appendChild(button);

        original.parentNode.insertBefore(clone, original.nextSibling);
    }


    /*───────────────────────────  Utility & Formatting END ─────────────────*/
    /**
     * Attach click listeners to all elements whose id ends with "btn-event".
     * On click, sends a custom event with event_label as the button's text.
     * @private
     */
    #attachEventButtons() {
        const buttons = document.querySelectorAll('[data-action-event]');
        buttons.forEach(el => {
            el.addEventListener('click', () => {
                const action = el.getAttribute('data-action-event');
                const label = el.textContent.trim();
                this.event(action, { event_label: label });
            });
        });
    }

    /**
     * Send a custom event to analytics.
     * @param {string} eventAction - The event action name.
     * @param {object} params - Optional extra parameters for the event.
     */
    event(eventAction, params = {}) {
        this.ga.send_event(eventAction, params);
    }
}

window.Migroot = Migroot;