

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
    }, updateUser: {
        path: 'user/{userId}', method: 'PUT'
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
    }, downloadFile: {
        path: 'board/file/{fileId}/download', method: 'GET'
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
    // Analytics data (needed before backend loads)
    BOARD_ID: 'defaultBoardId',
    USER_TYPE: 'defaultUserType',
    SUBSCRIPTION_PLAN: 'defaultSubscriptionPlan'
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
    CREATE_BOARD: 'create-board',
    MAIN: 'main',
});

class Migroot {
    constructor(config) {
        const host = window.location.hostname;
        const path = window.location.pathname;
        this.config = config;
        this.config.debug = path.includes('/staging/') || host === 'migroot.webflow.io' || this.config.debug;
        // this.backend_url = config.backend_url || 'https://migroot-447015.oa.r.appspot.com/v1'; // taking from config
        this.backend_url = host === 'migroot.webflow.io' ? 'https://migroot-447015.oa.r.appspot.com/v1' : 'https://migroot-prod.oa.r.appspot.com/v1';
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
                autoScroll: false,
                // propagateEvents: true, not working
            })
        }
        this.generateMethodsFromEndpoints();
        this.initHandlers();
        this.#setupAskMessageHandlers();
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
        // Try to get token from Outseta with retries (5 attempts, 500ms delay)
        for (let i = 0; i < 5; i++) {
            if (window.Outseta?.getAccessToken) {
                const token = window.Outseta.getAccessToken();
                if (token) return token;
            }
            if (i < 4) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // Fallback: first try standard URL search params
        const urlParams = new URLSearchParams(window.location.search);
        let urlToken = urlParams.get('access_token');

        // If not found, try regex search in full URL (handles hash case)
        if (!urlToken) {
            const match = window.location.href.match(/[?&]access_token=([^&\s#]+)/);
            urlToken = match ? match[1] : null;
        }

        if (urlToken) return urlToken;

        throw new Error("Access token not found in Outseta or URL");
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
            let hasBoard = false;

            if (boardId) {
                await this.loadBoardById(boardId);
                hasBoard = true;
            } else if (this.isBuddyUser()) {
                // Buddy users without specific boardId should go to admin
                return { hasBoard: false, isBuddy: true };
            } else {
                hasBoard = await this.loadFirstUserBoard();
            }

            if (this.board) {
                this.#updateLocalStorage(this.board);
                this.ga.setHasBoard(true);
            }

            return { hasBoard, isBuddy: false };
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

    async searchUserBoards(boardUser = null) {
        this.boardUser = boardUser || this.currentUser

        if (!this.boardUser?.id || !this.boardUser?.type) {
            this.log.error('User init error for user:', this.boardUser)
            return [];
        }

        this.log.debug('User initialized:', this.boardUser);

        const boards = await this.api.searchBoard({
            userType: this.boardUser.type, userId: this.boardUser.id
        });
        this.boards = boards;
        this.log.debug('Boards found for user:', boards);

        return Array.isArray(boards) ? boards : [];
    }

    async loadFirstUserBoard(boardUser = null) {
        const boards = await this.searchUserBoards(boardUser);

        if (boards.length === 0) {
            this.log.warning('No boards found for user:', this.boardUser)
            return false;
        }

        const boardId = boards[0].boardId;
        this.board = await this.api.getBoard({}, { boardId });
        this.boardId = boardId;
        this.boardUser = this.board.owner;

        this.log.debug('First board initialized for user:', this.board);
        return true;
    }

    async loadUserBoardDocs(boardUser = null) {
        const hasBoard = await this.loadFirstUserBoard(boardUser);
        if (!hasBoard || !this.boardId) {
            this.log.error('No docs and boards found for user:', this.boardUser)
            return false;
        }
        await this.loadBoardDocsById(this.boardId)
        return true;
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
            this.ga.setHasBoard(true);
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
        const onboardingManager = new OnboardingManager(this);
        onboardingManager.init();
    }

    markOnboardingPassed() {
        // todo send to backand
    };

    /// onboarding end
    /*───────────────────────────  Dashboard/Docs/HUB START ──────────────────────────*/


    async init_dashboard({boardId = null, callback = null, type = PAGE_TYPES.TODO} = {}) {
        try {
            this.log.debug('Step 1: Fetching user and board');
            this.ga.send_event('init_main')
            await this.fetchUserData();

            // ═══════════════════════════════════════════════════════════════════════════
            // AUTHENTICATION CHECK: Незалогиненных пользователей не пускаем в /app/
            // ═══════════════════════════════════════════════════════════════════════════
            // Если пользователь не залогинен - он может быть только на публичном сайте
            // (маркетинговые страницы /, /login, /sign-up). В /app/ его редиректит footer.js
            if (!this.currentUser) {
                const wasLogged = sessionStorage.getItem('wasLogged');

                if (wasLogged) {
                    // Был залогинен, но сейчас нет → пользователь разлогинился
                    this.ga.send_event('logout', { user_id: null });
                    sessionStorage.removeItem('wasLogged');
                } else {
                    // Никогда не был залогинен → обычный посетитель на сайте
                    // init_site = пользователь на публичном сайте (не в приложении)
                    // так как физически не может зайти в приложение без логина,
                    // единственное возможное место для неавторизованных это сайт
                    this.ga.send_event('init_site');
                }
                // Прерываем инициализацию дашборда - незалогиненным пользователям он не нужен
                return;
            } else {
                // ═══════════════════════════════════════════════════════════════════════
                // AUTHENTICATED USER: Настраиваем аналитику для залогиненного пользователя
                // ═══════════════════════════════════════════════════════════════════════

                // Определяем тип пользователя: обычный юзер или buddy/admin
                this.ga.setBuddyMode(this.isBuddyUser());

                // Определяем план подписки (Free/Paid)
                this.ga.setSenderPlan(this.currentUser?.subscriptionPlan);

                // Сохраняем данные аналитики в localStorage для быстрой инициализации в следующей сессии
                localStorage.setItem(LOCALSTORAGE_KEYS.USER_TYPE, this.currentUser?.type || 'USER');
                localStorage.setItem(LOCALSTORAGE_KEYS.SUBSCRIPTION_PLAN, this.currentUser?.subscriptionPlan || 'Free');

                // Запоминаем, что пользователь залогинен (для отслеживания logout)
                sessionStorage.setItem('wasLogged', 'true');

                // ═══════════════════════════════════════════════════════════════════════
                // PRE-ACTIVATION CHECK: Есть ли у пользователя борда?
                // ═══════════════════════════════════════════════════════════════════════
                // Если юзер зарегистрировался, но еще не создал борду → события будут
                // с category: 'pre_activation' (см. mg_helpers.js send_event)
                const storedBoardId = localStorage.getItem(LOCALSTORAGE_KEYS.BOARD_ID);
                this.ga.setHasBoard(!!storedBoardId);
            }

            // ═══════════════════════════════════════════════════════════════════════════
            // SKIP DASHBOARD: Не инициализируем дашборд на маркетинговых страницах
            // ═══════════════════════════════════════════════════════════════════════════
            // config.skip_dashboard = true на страницах вне /app/ (например, /, /blog)
            // Исключение: MAIN страница нужна для отображения buddy info
            if (this.config.skip_dashboard && type !== PAGE_TYPES.MAIN) {
                return;
            }

            // init_app = пользователь залогинен и находится в приложении /app/*
            const user_id = this.currentUser?.id ?? null;
            this.ga.send_event('init_app', {event_label: type, user_id: user_id})

            const finalBoardId = this.#resolveBoardId(boardId);

            // ═══════════════════════════════════════════════════════════════════════════
            // PAGE TYPE INITIALIZATION: Загружаем данные в зависимости от типа страницы
            // ═══════════════════════════════════════════════════════════════════════════
            switch (type) {
                case PAGE_TYPES.TODO:
                    // Страница TODO: канбан-доска с задачами
                    // Загружаем борду, рендерим карточки задач по колонкам (статусам)
                    this.clearBoardLocalCache()
                    this.#clearContainers();
                    const todoResult = await this.fetchBoard(finalBoardId);

                    if (!todoResult.hasBoard) {
                        if (todoResult.isBuddy) {
                            window.location.href = `${this.appPrefix()}/admin`;
                            return;
                        }
                        // No board - redirect to HUB to show empty state
                        window.location.href = `${this.appPrefix()}/hub`;
                        return;
                    }

                    this.#appendBoardIdToLinks(this.boardId);
                    await this.#prepareTodo(this.boardId);
                    this.hideBlockedContainers();
                    break;

                case PAGE_TYPES.DOCS:
                    // Страница DOCS: список документов для просмотра/аппрува
                    this.clearBoardLocalCache()
                    this.#clearContainers();
                    const docsResult = await this.fetchBoard(finalBoardId);

                    if (!docsResult.hasBoard) {
                        if (docsResult.isBuddy) {
                            window.location.href = `${this.appPrefix()}/admin`;
                            return;
                        }
                        // No board - redirect to HUB to show empty state
                        window.location.href = `${this.appPrefix()}/hub`;
                        return;
                    }

                    this.#appendBoardIdToLinks(this.boardId);
                    await this.#prepareDocs(this.boardId);
                    break;

                case PAGE_TYPES.CREATE_BOARD:
                    // Страница создания борды: форма с выбором стран
                    // У пользователя еще НЕТ борды - он ее только создает
                    await this.fetchCountryList();
                    this.renderCountryInputs();
                    this.autoFillCreateBoardForm();
                    break;

                case PAGE_TYPES.HUB:
                    // Страница HUB: показываем инфу по стране и прогресс релокации
                    const hubResult = await this.fetchBoard(finalBoardId);

                    const emptyStateDivs = document.querySelectorAll('.ac-hub__empty-state');
                    const createAccountDiv = document.querySelector('.ac-hub__create-account');

                    if (!hubResult.hasBoard) {
                        if (hubResult.isBuddy) {
                            // window.location.href = `${this.appPrefix()}/admin`;
                            // return;
                        }
                        // No board - remove previous sibling for each empty state div
                        emptyStateDivs.forEach(div => {
                            if (div.previousElementSibling) {
                                div.previousElementSibling.remove();
                            }
                        });
                        // No board - show create account div
                        if (createAccountDiv) {
                            createAccountDiv.style.display = 'inline-flex';
                        }

                        // Render hub fields even without board (shows ?, Mystery Country, random guides)
                        this.renderHubFields();

                        // Render user UI (points, nav, etc.) even without board
                        this.renderUserFields();

                        // Hide preloader when no board exists on HUB page
                        if (typeof preloaderFinish === 'function') {
                            preloaderFinish();
                        }
                        return;
                    }

                    // Has board - remove all empty state divs
                    emptyStateDivs.forEach(div => div.remove());
                    // Has board - remove create account div
                    if (createAccountDiv) {
                        createAccountDiv.remove();
                    }

                    this.#appendBoardIdToLinks(this.boardId);
                    this.renderHubFields();
                    break;

                case PAGE_TYPES.ADMIN:
                    // Страница ADMIN: для buddy/supervisor - список всех бордов юзеров
                    this.clearBoardLocalCache()
                    await this.#prepareAdminCards();
                    this.#hideUserControls();
                    break;

                case PAGE_TYPES.MAIN:
                    // Главная страница: минимальная инициализация для buddy info
                    this.renderBuddyInfo();
                    return;

                default:
                    // Не дашборд-страница (например, /blog) - инициализация не нужна
                    this.log.debug('page is not a dashboard: ', type);
                    return;
            }

            // ═══════════════════════════════════════════════════════════════════════════
            // POST-LOAD RENDERING: Рендерим UI элементы после загрузки данных
            // ═══════════════════════════════════════════════════════════════════════════

            // Сохраняем данные борды в localStorage для кеширования и трекинга прогресса
            // (country, boardId, goal/done/inProgress counts, date, email)
            if (this.board) {
                this.#updateLocalStorage(this.board)
            }

            // Рендерим UI пользователя: прогресс-бар, поинты, Google Drive кнопку и т.д.
            // Пропускаем для CREATE_BOARD, т.к. у пользователя еще нет борды
            if (type !== PAGE_TYPES.CREATE_BOARD) {
                this.renderUserFields();
            };

            this.renderStagingUrls();
            this.#attachEventButtons();
            this.log.debug('Dashboard initialized successfully');
            // ═══════════════════════════════════════════════════════════════════════════
            // CALLBACK: Уведомляем footer.js что инициализация завершена
            // ═══════════════════════════════════════════════════════════════════════════
            // Callback используется для скрытия preloader (см. footer.js initDashboard)
            if (typeof callback === 'function') {
                this.log.debug('callback called');
                try {
                    callback({cards: this.cards.length});
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

        // Open task drawer from URL if taskId parameter exists
        this.#openTaskFromUrl();
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
        await this.searchUserBoards();
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
        const base = item?.taskRef ? {...item.taskRef} : {};
        return {
            ...base,
            id: base.clientTaskId,
            commentsCount: 0,
            filesCount: 0,
            fileName: item.fileName,
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
        if (!board?.boardId) {
            this.log.debug('Board ID is missing, cannot update localStorage');
            return;
        }

        // Save only boardId for analytics (to determine hasBoard status)
        localStorage.setItem(LOCALSTORAGE_KEYS.BOARD_ID, board.boardId);

        // UI data (country, date, email, task counts) is read directly from this.board
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
        let page_type;
        if (path === '/' ) {
            page_type = 'main'
        } else {
            const segments = path.split('/').filter(Boolean);
            page_type = segments[segments.length - 1];
        }
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
        this.#setupDeleteRequestHandler();
}


    /**
     * Get eligibility data from board questionnaire with backward compatibility
     * Supports old and new questionnaire formats
     */
    getEligibilityDataFromBoard() {
        if (!this.board?.questionnaire) {
            return null;
        }

        const q = this.board.questionnaire;

        return {
            work_type: q.work_type,
            remote_work: q.remote_work || q.work_remote, // Support both formats
            move_with: Array.isArray(q['move_with[]']) ? q['move_with[]'] :
                       (q.move_with ? [q.move_with] : []),
            work_income: this.normalizeWorkIncome(q.work_income),
            experience: Array.isArray(q.experience) ? q.experience :
                        (q.experience ? [q.experience] : ["degree", "experience"]) // Fallback for old users
        };
    }

    /**
     * Render and unlock achievements on HUB based on user progress
     */
    renderAchievements() {
        const achievements = [
            {
                id: 'a-navigator',
                name: 'Country Navigator',
                check: () => !!this.board?.country
            },
            {
                id: 'a-master',
                name: 'Documents Master',
                check: () => {
                    const uploadedFiles = this.board?.tasks?.reduce((count, task) => {
                        return count + (task.files?.length || 0);
                    }, 0) || 0;
                    return uploadedFiles >= 3;
                }
            },
            {
                id: 'a-explorer',
                name: 'Task Explorer',
                check: () => {
                    const completedTasks = this.board?.tasks?.filter(t => t.status === 'READY').length || 0;
                    return completedTasks >= 5;
                }
            },
            {
                id: 'a-strategist',
                name: 'Relocation Strategist',
                check: () => {
                    const tasks = this.board?.tasks || [];
                    if (tasks.length === 0) return false;
                    const completedTasks = tasks.filter(t => t.status === 'READY').length;
                    return (completedTasks / tasks.length) >= 0.5;
                }
            },
            {
                id: 'a-collector',
                name: 'Coin Collector',
                check: () => {
                    const coins = this.currentUser?.points || 0;
                    return coins >= 30;
                }
            }
        ];

        achievements.forEach(achievement => {
            const element = document.getElementById(achievement.id);
            if (!element) {
                this.log.debug(`Achievement element not found: ${achievement.id}`);
                return;
            }

            const isUnlocked = achievement.check();

            if (isUnlocked) {
                element.setAttribute('data-achive', 'unlock');
                this.log.debug(`✅ Achievement unlocked: ${achievement.name}`);
            } else {
                element.setAttribute('data-achive', 'lock');
                this.log.debug(`🔒 Achievement locked: ${achievement.name}`);
            }
        });

        this.log.info('Achievements updated');
    }

    /**
     * Render eligibility labels for all countries on HUB
     * Updates Match/Maybe/No match labels based on user's questionnaire data
     */
    renderCountryEligibility() {
        // Check if EligibilityChecker is available
        if (typeof EligibilityChecker === 'undefined') {
            this.log.warning('EligibilityChecker not available');
            return;
        }

        // Get user eligibility data from board
        const userData = this.getEligibilityDataFromBoard();
        if (!userData) {
            this.log.debug('No questionnaire data available for eligibility check');
            return;
        }

        this.log.debug('Checking eligibility for all countries with user data:', userData);

        // Find all country blocks
        const countryBlocks = document.querySelectorAll('.ac-hub__countries .ac-hub__country');
        if (countryBlocks.length === 0) {
            this.log.debug('No country blocks found on HUB');
            return;
        }

        countryBlocks.forEach(block => {
            // Get country name from block
            const countryNameEl = block.querySelector('.ac-hub__country-name');
            if (!countryNameEl) return;

            const countryName = countryNameEl.textContent.trim();

            // Check if country has config in HUB_CONFIG
            if (typeof HUB_CONFIG === 'undefined' || !HUB_CONFIG[countryName]) {
                this.log.debug(`No HUB_CONFIG found for country: ${countryName}`);
                return;
            }

            // Get visa requirements for this country
            const visaRequirements = HUB_CONFIG[countryName].test;
            if (!visaRequirements) {
                this.log.debug(`No visa requirements for country: ${countryName}`);
                return;
            }

            // Check eligibility
            // evaluateMatch expects format: {countryName: {test: {...}}}
            const testObj = { [countryName]: { test: visaRequirements } };
            const results = EligibilityChecker.evaluateMatch(userData, testObj);
            const result = results[countryName];

            // Find label element
            const labelEl = block.querySelector('.ac-hub__label');
            if (!labelEl) return;

            // Update label based on status
            labelEl.textContent = result.status;

            // Remove old status classes
            labelEl.classList.remove('ac-hub__label_match', 'ac-hub__label_maybe', 'ac-hub__label_no-match');

            // Add new status class
            if (result.status === 'Match') {
                labelEl.classList.add('ac-hub__label_match');
            } else if (result.status === 'Maybe') {
                labelEl.classList.add('ac-hub__label_maybe');
            } else {
                labelEl.classList.add('ac-hub__label_no-match');
            }

            // Update subtext under country name
            const subtext = block.querySelector('.ac-hub__country-info .b-text-medium');
            if (subtext) {
                if (result.status === 'Match') {
                    subtext.textContent = 'All requirements met ✓';
                } else if (result.reasons && result.reasons.length > 0) {
                    subtext.textContent = result.reasons[0];
                }
            }

            // Add click handler to open support with pre-filled message
            block.style.cursor = 'pointer';
            block.addEventListener('click', () => {
                const subject = `Relocation to ${countryName}`;
                const reasonsLabel = result.status === 'Match' ? 'Additional info' : 'Reasons';
                const body = `Hi! I'm interested in relocating to ${countryName}.

My eligibility status: ${result.status}
${result.reasons.length > 0 ? `\n${reasonsLabel}:\n- ` + result.reasons.join('\n- ') : ''}

Could you help me understand my options?`;

                this.#openSupportWithMessage(subject, body);
            });

            this.log.debug(`${countryName}: ${result.status}`, result.reasons);
        });

        this.log.info('Country eligibility labels updated');
    }

    renderHubFields() {
        const countryKey = this.board?.country;

        // Always display country in "Your progress" header (even if unknown)
        const progressTitle = document.querySelector('.ac-hub__card .ac-hub__title-1');
        if (progressTitle && progressTitle.textContent.trim() === 'Your progress') {
            const countrySpan = document.createElement('span');
            countrySpan.style.fontWeight = 'normal';
            countrySpan.style.color = '#888';
            countrySpan.textContent = ` → ${countryKey || 'Mystery Country'}`;
            progressTitle.appendChild(countrySpan);
        }

        // Personalize welcome message
        this.renderHubWelcome();

        // Update progress bar and counters
        this.renderHubProgress();

        // Update country eligibility labels
        this.renderCountryEligibility();

        // Update achievements
        this.renderAchievements();

        // If no country selected, can't render country-specific data
        if (!countryKey) {
            this.log.debug('No country selected in localStorage');
            // No country - render random guides from all countries
            this.#renderRandomGuides();
            return;
        }

        // Get hub data from HUB_CONFIG (defined in hub_config.js)
        if (typeof HUB_CONFIG === 'undefined') {
            this.log.warning('HUB_CONFIG is not defined');
            return;
        }

        const hubData = HUB_CONFIG[countryKey];
        if (!hubData) {
            this.log.debug(`No hub data found for country: ${countryKey}`);
            return;
        }

        // 1. Render Visa Requirements
        this.#renderVisaRequirements(hubData.requirements || []);

        // 2. Render Recommended Tasks (first 3 NOT_STARTED tasks)
        this.#renderRecommendedTasks();

        // 3. Render Useful Links
        this.#renderUsefulLinks(hubData.links || []);

        // 4. Render Guides for current country
        this.#renderGuides(hubData.guides || []);
    }

    renderHubWelcome() {
        const firstName = this.currentUser?.firstName || 'nomad';
        const heading = document.querySelector('.ac-hub__heading');
        if (heading) {
            heading.textContent = `Welcome back, ${firstName}! 👋`;
        }

        // Update user avatar in welcome block from currentUser
        const avatarImg = document.querySelector('.ac-hub__welcome .ac-hub__migroot');
        if (avatarImg && this.currentUser?.iconUrl) {
            avatarImg.src = this.currentUser.iconUrl;
            avatarImg.alt = `${firstName}'s profile picture`;
        }

        this.log.debug(`Hub welcome personalized: ${firstName}`);
    }

    renderHubProgress() {
        this.updateProgress();
    }

    #renderVisaRequirements(requirements) {
        const container = document.querySelector('.ac-hub__requirements .ac-hub__filled');
        if (!container) {
            this.log.debug('Visa requirements container not found');
            return;
        }

        container.innerHTML = '';

        requirements.forEach(req => {
            const block = document.createElement('div');
            block.className = 'ac-hub__requirement';
            block.innerHTML = `
                <div class="b-text-medium b-text-grey">${req.title}</div>
                <div class="b-text-bold b-text-right">${req.value}</div>
            `;
            container.appendChild(block);
        });

        this.log.debug(`Rendered ${requirements.length} visa requirements`);
    }

    #renderRecommendedTasks() {
        const container = document.querySelector('.ac-hub__tasks');
        if (!container) {
            this.log.debug('Recommended tasks container not found');
            return;
        }

        container.innerHTML = '';

        // Get top 3 NOT_STARTED required tasks by priority (highest first)
        const topTasks = (this.board?.tasks || [])
            .filter(task => task.status === 'NOT_STARTED' && task.documentRequired)
            .sort((a, b) => b.priority - a.priority)
            .slice(0, 3);

        if (topTasks.length === 0) {
            container.innerHTML = '<div class="drw-empty">No tasks available</div>';
            return;
        }

        topTasks.forEach(task => {
            const block = document.createElement('div');
            block.className = 't-hub';
            block.style.cursor = 'pointer';
            block.innerHTML = `
                <div class="t-hub__content">
                    <div class="b-text-bold">${task.name || 'Untitled task'}</div>
                    <div class="b-text-medium">${task.shortDescription || ''}</div>
                </div>
                <div data-task="points" class="t-mark t-mark_hub-points">
                    <img loading="lazy" alt="" src="https://cdn.prod.website-files.com/679bc8f10611c9a0d94a0caa/679bc8f10611c9a0d94a0d1e_Point.svg" class="t-mark__avatar">
                    <div class="t-mark__label">${task.points || 0}</div>
                </div>
            `;

            // Add click handler to redirect to TODO page with taskId
            block.onclick = () => {
                const url = `${this.appPrefix()}/todo?boardId=${this.boardId}&taskId=${task.clientTaskId}`;
                this.log.debug(`Redirecting to: ${url}`);
                window.location.href = url;
            };

            container.appendChild(block);
        });

        this.log.debug(`Rendered ${topTasks.length} recommended tasks (sorted by priority)`);
    }

    #renderUsefulLinks(links) {
        const container = document.querySelector('.ac-hub__contacts');
        if (!container) {
            this.log.debug('Useful links container not found');
            return;
        }

        container.innerHTML = '';

        links.forEach(link => {
            const block = document.createElement('div');
            block.className = 'ac-hub__contact';
            block.innerHTML = `
                <div class="ac-hub__contact-details">
                    <div class="b-text-medium">${link.label}</div>
                    <a href="${link.url}" target="_blank" class="b-text-bold b-link b-text-right">${link.title}</a>
                </div>
            `;
            container.appendChild(block);
        });

        this.log.debug(`Rendered ${links.length} useful links`);
    }

    #renderGuides(guides) {
        const container = document.querySelector('.ac-hub__guides');
        if (!container) {
            this.log.debug('Guides container not found');
            return;
        }

        container.innerHTML = '';

        if (!guides || guides.length === 0) {
            this.log.debug('No guides available');
            return;
        }

        guides.forEach(guide => {
            const block = document.createElement('a');
            block.href = guide.url;
            block.target = '_blank';
            block.className = 'ln-post ac-hub__post w-inline-block';
            block.innerHTML = `
                <div class="ln-post__preview ac-hu_post-preview">
                    <img sizes="100vw" srcset="${guide.image}" src="${guide.image}" alt="${guide.title}" loading="lazy" class="ln-post__image">
                </div>
                <div class="ln-post__content">
                    <p class="ac-hub__post-title">${guide.title}</p>
                    <div class="ln-post__info">
                        <div class="ln-post__author">
                            <div class="ln-post__author-name">${guide.author || 'Migroot Team'}</div>
                        </div>
                        <div class="ln-post__sep"></div>
                        <div class="ln-post__data">${guide.date || ''}</div>
                    </div>
                </div>
            `;
            container.appendChild(block);
        });

        this.log.debug(`Rendered ${guides.length} guides`);
    }

    #renderRandomGuides() {
        // Get all guides from all countries in HUB_CONFIG
        if (typeof HUB_CONFIG === 'undefined') {
            this.log.warning('HUB_CONFIG is not defined');
            return;
        }

        const allGuides = [];
        const seenUrls = new Set();

        Object.values(HUB_CONFIG).forEach(countryData => {
            if (countryData.guides && Array.isArray(countryData.guides)) {
                countryData.guides.forEach(guide => {
                    // Only add unique guides (check by URL)
                    if (!seenUrls.has(guide.url)) {
                        seenUrls.add(guide.url);
                        allGuides.push(guide);
                    }
                });
            }
        });

        if (allGuides.length === 0) {
            this.log.debug('No guides found in HUB_CONFIG');
            return;
        }

        // Shuffle array and pick first 3
        const shuffled = allGuides.sort(() => 0.5 - Math.random());
        const selectedGuides = shuffled.slice(0, 3);

        this.#renderGuides(selectedGuides);
        this.log.debug(`Rendered ${selectedGuides.length} random unique guides from ${allGuides.length} total unique`);
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
            const boardEmail = this.board?.owner?.email;
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

    #openSupportWithMessage(subject, body) {
        const supportLink = document.querySelector('[data-o-support]');
        if (!supportLink) {
            this.log.warning('Support element not found');
            return;
        }

        const formDefaults = JSON.stringify({
            Subject: subject,
            Body: body
        });

        supportLink.setAttribute('data-form-defaults', formDefaults);
        supportLink.click();

        setTimeout(() => {
            supportLink.removeAttribute('data-form-defaults');
        }, 100);
    }

    #setupDeleteRequestHandler() {
        const deleteButton = document.getElementById('acc-delete-request');
        if (!deleteButton) return;

        deleteButton.onclick = () => {
            this.#openSupportWithMessage(
                'Account termination request',
                'Hi, I want to delete my account and all my data'
            );
        };
    }

    #setupAskMessageHandlers() {
        const askButtons = document.querySelectorAll('[data-ask-message]');
        if (!askButtons.length) return;

        askButtons.forEach((button) => {
            button.onclick = () => {
                const message = button.getAttribute('data-ask-message');
                const title = button.getAttribute('data-ask-title') || 'Question';
                this.#openSupportWithMessage(title, message);
            };
        });
    }


    renderProgressBar() {
        let createdDate = null;

        // Get date from board if available
        if (this.board?.createdDate) {
            const date = new Date(this.board.createdDate);
            const options = { month: 'short', day: 'numeric', year: 'numeric' };
            createdDate = date.toLocaleDateString('en-US', options);
        } else {
            // Fallback to today's date if no board exists
            const today = new Date();
            const options = { month: 'short', day: 'numeric', year: 'numeric' };
            createdDate = today.toLocaleDateString('en-US', options);
        }

        const dateEl = document.getElementById('created-date');
        if (dateEl) {
            dateEl.textContent = `Since ${createdDate}`;
        }
        this.updateProgress();
    }

    updateProgress() {
        // Try to get data from this.board.tasks first (live data), fallback to localStorage
        const tasks = this.board?.tasks || [];
        const hasBoard = tasks.length > 0;

        let allTasks, completedTasks, requiredTasks, completedRequired, inProgressTasks;

        if (hasBoard) {
            // Use live data from this.board.tasks
            allTasks = tasks.length;
            completedTasks = tasks.filter(t => t.status === 'READY').length;
            requiredTasks = tasks.filter(t => t.documentRequired).length;
            completedRequired = tasks.filter(t => t.documentRequired && t.status === 'READY').length;
            inProgressTasks = tasks.filter(t => t.status !== 'READY' && t.status !== 'NOT_STARTED' && t.documentRequired).length;
        } else {
            // No board loaded - show zeros
            allTasks = 0;
            completedTasks = 0;
            requiredTasks = 0;
            completedRequired = 0;
            inProgressTasks = 0;
        }

        // Update HUB-specific elements (counter text)
        const agendaNotes = document.querySelectorAll('.ac-progress__agenda .ac-progress__note');
        if (agendaNotes[0]) {
            const texts = agendaNotes[0].querySelectorAll('.b-text-medium');
            if (texts[1]) texts[1].textContent = `${completedRequired} of ${requiredTasks}`;
        }
        if (agendaNotes[1]) {
            const texts = agendaNotes[1].querySelectorAll('.b-text-medium');
            if (texts[1]) texts[1].textContent = `${completedTasks} of ${allTasks}`;
        }

        // Calculate percentages for HUB page
        // requiredPercent = dark green bar (required tasks only)
        const requiredPercent = (hasBoard && requiredTasks > 0) ? Math.round((completedRequired / requiredTasks) * 100) : 0;

        // allPercent = light green bar (weighted: 80% required + 20% optional)
        let allPercent = 0;
        if (hasBoard && allTasks > 0) {
            const optionalTasks = allTasks - requiredTasks;
            const completedOptional = completedTasks - completedRequired;

            const requiredProgress = requiredTasks > 0 ? (completedRequired / requiredTasks) : 0;
            const optionalProgress = optionalTasks > 0 ? (completedOptional / optionalTasks) : 0;

            // Weighted formula: 80% required + 20% optional
            allPercent = Math.round((requiredProgress * 0.8 + optionalProgress * 0.2) * 100);
        }

        // Calculate percentages for TODO/DOCS page (with inProgress weighting)
        const effectiveDone = completedRequired + inProgressTasks * 0.5;
        const inProgressPercent = requiredTasks > 0 ? Math.round((inProgressTasks * 0.5 / requiredTasks) * 100) : 0;
        const totalPercent = requiredTasks > 0 ? Math.round((effectiveDone / requiredTasks) * 100) : 0;

        // Update progress bars (works for both HUB and TODO/DOCS)
        const progressFillEl = document.querySelector('#progress-bar-fill');
        const doneFillEl = document.querySelector('#done-bar-fill');

        // HUB page has different selector
        const progressFillHubEl = document.querySelector('#progress-bar-fill.ac-progress__filled_required');
        const doneFillHubEl = document.querySelector('#done-bar-fill.ac-progress__filled');

        // Update text and bars based on page type
        const countEl = document.getElementById('progress-bar-count');

        if (progressFillHubEl && doneFillHubEl) {
            // HUB page
            doneFillHubEl.style.width = `${allPercent}%`;
            progressFillHubEl.style.width = `${requiredPercent}%`;
            // Update text to match HUB bar (allPercent)
            if (countEl) {
                countEl.textContent = `Your relocation progress: ${allPercent} %`;
            }
        } else if (progressFillEl && doneFillEl) {
            // TODO/DOCS page
            progressFillEl.style.width = `${inProgressPercent}%`;
            doneFillEl.style.width = `${totalPercent}%`;
            // Update text to match TODO/DOCS bar (totalPercent)
            if (countEl) {
                countEl.textContent = `Your relocation progress: ${totalPercent} %`;
            }
        }

        this.log.debug(`Progress updated: ${completedTasks}/${allTasks} all, ${completedRequired}/${requiredTasks} required`);
    }


    renderUserFolder() {
        const element = document.getElementById(G_DRIVE_FOLDER_ID);
        if (!element) {
            this.log.debug(`element ${G_DRIVE_FOLDER_ID} for g drive button not found`)
            return;
        }

        // Google Drive button is now blocked for ALL users
        // Files are accessed through GCS download API instead
        element.onclick = () => this.#handleOpenDrive(null);
        this.log.debug('Google Drive button blocked for all users (GCS migration)');
    }

    renderUserPoints() {
        var points = 0
        if (!this.config?.user?.pointsContainerId) {
            this.log.debug('config.user.pointsContainerId is not defined');
            return;
        }

        const el = this.config.user.pointsContainerId;
        if (!el) {
            this.log.debug(`Element with id ${this.config.user.pointsContainerId} not found`);
            return;
        }

        if (!this.currentUser || typeof this.currentUser.points !== 'number') {
            this.log.debug('currentUser or points not set');
        } else {
            points = this.currentUser.points || 0
        }

        el.textContent = points;
        this.log.debug(`User points rendered: ${points}`);
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
     * @property {number} [duration] - Duration in days (optional)
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
    #optionalFields = new Set(['location', 'duration', 'assign']);

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
                } else if (key === 'duration') {
                    this.log.debug(`Missing duration; setting default to "TBD"`);
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
                duration: this.#renderDuration.bind(this),
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
                        if (drawerEl.dataset.onboarding === 'true') {
                            fullTask.comments.push(this.#wellcomeComment());
                        }
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
                if (this.onboarding?.isVisible || this.isModalOpen()) {
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
    };

    #openTaskFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const taskId = urlParams.get('taskId');

        if (!taskId) {
            this.log.debug('No taskId in URL');
            return;
        }

        this.log.debug(`Opening task from URL: ${taskId}`);

        // Find task in this.cards
        const task = this.cards.find(t => String(t.clientTaskId) === taskId);

        if (task) {
            // Use existing method to open drawer
            this.#handleCardClick(task);
        } else {
            this.log.warning(`Task with ID ${taskId} not found in cards`);
        }
    }

    isModalOpen(id = 'paid') {
      const el = document.getElementById(id);
      return el?.classList.contains('fancybox__content') || false;
    }
    /*───────────────────────────  Card & Drawer DOM END ────────────────────*/


    /*───────────────────────────  Drawer helpers START ─────────────────────*/

    #drawerOpts() {
        return {
            fieldSelector: '[data-drawer]', labelSelector: '.js-ingest', renderers: {
                duration: this.#renderDuration.bind(this),
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

    #renderDuration(el, val) {
        if (val) el.textContent = this.#formatDuration(val); else el.remove();
    }

    #renderDifficulty(el, val) {
        if (val) el.textContent = this.#formatDifficulty(val); else el.remove();
    }

    #wellcomeComment() {
        return {
            author: null,
            message: 'Hi! I’m here to help. Need more? Try our expert buddy for <a href="#" target="_blank" data-fancybox="" data-src="#paid" data-event-action="click_welcome_comment">real-time support.</a>',
            createdDate: this.board.createdDate
        }
    }

    #renderComments(el, val) {
        const arr = Array.isArray(val) ? val : [];
        const container = el.querySelector('.cmt-wrap');
        if (!container) {
            el.textContent = 'Comments container not found';
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
        this.log.debug(`[renderFiles] Called with ${val?.length || 0} files`);
        const isBuddy = this.isBuddyUser();
        const arr = Array.isArray(val) ? val : [];
        const container = el.querySelector('.drw-uploaded .f-wrap');
        if (!container) {
            this.log.warning('[renderFiles] Files container not found');
            el.textContent = 'Files container not found';
            return;
        }
        this.log.debug(`[renderFiles] Container found, rendering ${arr.length} files`);

        if (!arr.length) {
            container.innerHTML = '<div class="drw-empty">Nothing yet...</div>';
            return;
        }

        container.innerHTML = arr.map(file => {
            return `
                <div class="file-wrapper">
                  <div class="file-info">
                    <a class="f-item" href="#" data-file-id="${file.fileId}">
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

        // Attach click handlers for file download
        container.querySelectorAll('.f-item[data-file-id]').forEach(link => {
            link.onclick = async (e) => {
                e.preventDefault();
                const fileId = link.getAttribute('data-file-id');
                try {
                    const response = await this.api.downloadFile({}, { fileId });
                    if (response.downloadUrl) {
                        window.open(response.downloadUrl, '_blank', 'noopener,noreferrer');
                    } else {
                        this.log.error('No downloadUrl in response');
                    }
                } catch (err) {
                    this.log.error('Failed to get download URL:', err);
                }
            };
        });
    }

    #handleApproveFile(el) {
        this.ga.send_event('click_task_approve_file')
        const fileId = el?.dataset?.fileId;

        // Find task and file for optimistic update BEFORE modifying DOM
        const drawer = el.closest('.t-drawer');
        this.log.debug(`[handleApproveFile] el=${!!el}, drawer element=${!!drawer}, drawer.id=${drawer?.id}`);
        const taskId = drawer?.id?.replace('drawer-', '');
        const task = this.cards?.find(t => String(t.clientTaskId) === taskId);
        const file = task?.files?.find(f => String(f.fileId) === String(fileId));
        const previousStatus = file?.status;

        this.log.debug(`[handleApproveFile] taskId=${taskId}, task=${!!task}, file=${!!file}, fileId=${fileId}`);

        // Now show loading placeholder
        const actionsContainer = el.parentElement;
        const wrapper = el.closest('.file-wrapper');
        const originalHTML = actionsContainer.innerHTML;
        actionsContainer.innerHTML = '<div class="loading-placeholder">Grooting... </div>';

        // Optimistic update
        if (file) {
            file.status = 'APPROVED';
            this.log.warning(`[handleApproveFile] Updated file status to APPROVED, calling updateDrawerContent`);
            this.#updateDrawerContent(task);
        } else {
            this.log.warning(`[handleApproveFile] Could not find file or task for optimistic update`);
        }

        this.api.approveFile({}, {fileId}).then((updatedFile) => {
            this.log.info(`File ${fileId} approved`, updatedFile);

            // Update task status if it changed
            if (updatedFile.taskRef && task) {
                const newTaskStatus = this.#processStatus(updatedFile.taskRef.status);
                if (task.status !== newTaskStatus) {
                    this.log.debug(`[handleApproveFile] Task status changed from ${task.status} to ${newTaskStatus}`);
                    task.status = newTaskStatus;
                    // Move card to new column
                    this.createCard(task, {skip_drawer: true, card_type: task.card_type});
                    // Update drawer status display
                    this.#updateDrawerContent(task);
                }
            }

            actionsContainer.innerHTML = originalHTML;
        }).catch(err => {
            this.log.error(`Failed to approve file ${fileId}:`, err);
            // Revert optimistic update on error
            if (file && previousStatus) {
                file.status = previousStatus;
                this.#updateDrawerContent(task);
            }
            actionsContainer.innerHTML = originalHTML;
        });
    }


    #handleRejectFile(el) {
        this.ga.send_event('click_task_reject_file')
        const fileId = el?.dataset?.fileId;

        // Find task and file for optimistic update BEFORE modifying DOM
        const drawer = el.closest('.t-drawer');
        this.log.debug(`[handleRejectFile] el=${!!el}, drawer element=${!!drawer}, drawer.id=${drawer?.id}`);
        const taskId = drawer?.id?.replace('drawer-', '');
        const task = this.cards?.find(t => String(t.clientTaskId) === taskId);
        const file = task?.files?.find(f => String(f.fileId) === String(fileId));
        const previousStatus = file?.status;

        this.log.debug(`[handleRejectFile] taskId=${taskId}, task=${!!task}, file=${!!file}, fileId=${fileId}`);

        // Now show loading placeholder
        const actionsContainer = el.parentElement;
        const wrapper = el.closest('.file-wrapper');
        const originalHTML = actionsContainer.innerHTML;
        actionsContainer.innerHTML = '<div class="loading-placeholder">Grooting...</div>';

        // Optimistic update
        if (file) {
            file.status = 'REJECTED';
            this.#updateDrawerContent(task);
        }

        this.api.rejectFile({}, {fileId}).then((updatedFile) => {
            this.log.info(`File ${fileId} rejected`, updatedFile);

            // Update task status if it changed
            if (updatedFile.taskRef && task) {
                const newTaskStatus = this.#processStatus(updatedFile.taskRef.status);
                if (task.status !== newTaskStatus) {
                    this.log.debug(`[handleRejectFile] Task status changed from ${task.status} to ${newTaskStatus}`);
                    task.status = newTaskStatus;
                    // Move card to new column
                    this.createCard(task, {skip_drawer: true, card_type: task.card_type});
                    // Update drawer status display
                    this.#updateDrawerContent(task);
                }
            }

            actionsContainer.innerHTML = originalHTML;
        }).catch(err => {
            this.log.error(`Failed to reject file ${fileId}:`, err);
            // Revert optimistic update on error
            if (file && previousStatus) {
                file.status = previousStatus;
                this.#updateDrawerContent(task);
            }
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
        this.log.debug(`[updateDrawerContent] Called for task ${task?.clientTaskId}`);
        const drawer = document.getElementById(`drawer-${task.clientTaskId}`);
        if (!drawer) {
            this.log.warning(`[updateDrawerContent] Drawer not found for task ${task?.clientTaskId}`);
            return;
        }
        this.log.debug(`[updateDrawerContent] Drawer found, updating content`);

        // Tab 2: Comments
        const commentsPane = drawer.querySelector('.tb-pane[data-w-tab="Tab 2"]');
        if (commentsPane) this.#renderComments(commentsPane, task.comments);

        // Tab 3: Files
        const filesPane = drawer.querySelector('.tb-pane[data-w-tab="Tab 3"]');
        this.log.debug(`[updateDrawerContent] Files pane found: ${!!filesPane}, files count: ${task.files?.length}`);
        if (filesPane) this.#renderFiles(filesPane, task.files);


        this.#setContent(drawer, task, this.#drawerOpts());
        drawer.dataset.status = task.status || '';
        this.#attachEventButtons();
        this.log.debug(`[updateDrawerContent] Drawer content updated successfully`);

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
            this.#updateLocalStorage(this.board);
            this.updateProgress();
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
        this.smartMerge(this.board.tasks[taskIndex], updatedTask);
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
            overlay.innerText = '✈️ Packing your relocation board…';
        } else {
            overlay = original.cloneNode(true);
            // Remove duplicate id from the cloned overlay
            overlay.id = 'board-create-loader';
            // Find the child with id="preloader-text" and update its id and text
            const innerTextEl = overlay.querySelector('#preloader-text');
            if (innerTextEl) {
                innerTextEl.id = 'board-preloader-text';
                innerTextEl.textContent = '✈️ Packing your relocation board…';
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

                window.location.href = `${this.appPrefix()}/hub?boardId=${createdBoard.boardId}`;
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
        const observerConfig = {childList: true, subtree: false};

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

    #formatDuration(days) {
        if (days === 'TBD' || !days) return 'TBD';
        const num = parseInt(days, 10);
        if (isNaN(num)) return 'TBD';
        return num === 1 ? '1 day' : `${num} days`;
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
        const buttons = document.querySelectorAll('[data-event-action]');
        buttons.forEach(el => {
            if (el.dataset.eventAttached === "true") return;
            el.addEventListener('click', () => {
                const action = el.getAttribute('data-event-action');
                const label = el.textContent.trim();
                this.event(action, {event_label: label});
            });
            el.dataset.eventAttached = "true";
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

    /**
     * Normalize work_income to object format {min, max}
     * Supports 3 formats:
     * 1. Object: {min: 3001, max: 5000}
     * 2. JSON string: "{\"min\":3001,\"max\":5000}"
     * 3. Old text format: "€3,001 - €5,000"
     */
    normalizeWorkIncome(income) {
        // Already an object - return as is
        if (typeof income === 'object' && income !== null) {
            return income;
        }

        // JSON string - parse it
        if (typeof income === 'string' && income.startsWith('{')) {
            try {
                return JSON.parse(income);
            } catch (e) {
                this.log.warning('Failed to parse work_income JSON string:', income);
                return {min: 0, max: 0};
            }
        }

        // Old text format - convert using mapping
        return this.parseOldIncomeFormat(income);
    }

    /**
     * Convert old text format income to {min, max} object
     */
    parseOldIncomeFormat(incomeString) {
        const mapping = {
            "Below €1,500": {min: 0, max: 1500},
            "€1,501 - €3,000": {min: 1501, max: 3000},
            "€3,001 - €5,000": {min: 3001, max: 5000},
            "€5,001 - €10,000": {min: 5001, max: 10000},
            "Above €10,000": {min: 10001, max: 999999}
        };
        return mapping[incomeString] || {min: 0, max: 0};
    }

    /**
     * Auto-fill create board form from quiz results in localStorage
     */
    autoFillCreateBoardForm() {
        const form = document.querySelector('#createBoard');
        if (!form) return;

        // Get quiz results from localStorage
        const quizData = EligibilityChecker.getStoredQuizResults();
        if (!quizData) {
            this.log.info('No quiz data found in localStorage for auto-fill');
            return;
        }

        this.log.info('Auto-filling create board form with quiz data:', quizData);

        // Fill work_type (radio buttons)
        if (quizData.work_type) {
            const workTypeRadio = form.querySelector(`input[name="work_type"][value="${quizData.work_type}"]`);
            if (workTypeRadio) {
                workTypeRadio.checked = true;
            }
        }

        // Fill remote_work (radio buttons)
        if (quizData.remote_work) {
            const remoteWorkRadio = form.querySelector(`input[name="remote_work"][value="${quizData.remote_work}"]`);
            if (remoteWorkRadio) {
                remoteWorkRadio.checked = true;
            }
        }

        // Fill move_with (checkboxes)
        if (quizData.move_with && Array.isArray(quizData.move_with)) {
            quizData.move_with.forEach(value => {
                const checkbox = form.querySelector(`input[name="move_with[]"][value="${value}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }

        // Fill work_income (radio buttons)
        // work_income is already in JSON format: {"min": 0, "max": 1500}
        if (quizData.work_income) {
            const incomeValue = JSON.stringify(quizData.work_income);
            const incomeRadio = form.querySelector(`input[name="work_income"][value='${incomeValue}']`);
            if (incomeRadio) {
                incomeRadio.checked = true;
            }
        }

        // Fill experience (checkboxes)
        if (quizData.experience && Array.isArray(quizData.experience)) {
            quizData.experience.forEach(value => {
                const checkbox = form.querySelector(`input[name="experience[]"][value="${value}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }

        // Pre-select destination country from matched_countries (if only one match)
        if (quizData.matched_countries && quizData.matched_countries.length === 1) {
            const destinationInput = form.querySelector('input[name="COUNTRY_OF_DESTINATION"]');
            if (destinationInput) {
                destinationInput.value = quizData.matched_countries[0];
            }
        }

        this.log.info('Create board form auto-filled successfully');
    }
}

window.Migroot = Migroot;