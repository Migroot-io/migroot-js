class Logger {
    constructor(debug = false) {
        this.debug = debug;
    }

    _getCurrentTime() {
        const now = new Date();
        return now.toISOString().slice(11, 23);
    }

    _log(message, vars = null, type = 'info') {
        const styles = {
            info: 'color: white; font-weight: 500;',
            warning: 'color: orange; font-weight: bold;',
            error: 'color: red; font-weight: bold;'
        };

        const logType = type.toLowerCase();
        const timestamp = this._getCurrentTime();

        if (styles[logType]) {
            console.log(`%c[${timestamp}] [${logType.toUpperCase()}]: ${message}`, styles[logType], vars);
        } else {
            console.log(`[${timestamp}] [LOGGER]: ${message}`, vars);
        }
    }

    info(message, vars) {
        if (this.debug) {
            this._log(message, vars, 'info');
        }
    }

    warning(message, vars) {
        this._log(message, vars, 'warning');
    }

    error(message, vars) {
        this._log(message, vars, 'error');
    }
}


/* Example CONFIG – adjust and pass to new Migroot(CONFIG)
const CONFIG = {
    // templates
    template : document.getElementById('doc-template'),
    drawer   : document.getElementById('drawer-template'),

    // buttons (HTML taken from hidden <template> tags)
    buttons : {
        startButton : document.getElementById('start_button').innerHTML,
        uploadButton: document.getElementById('upload_button').innerHTML,
    },

    // kanban columns
    containers : {
        ready      : document.getElementById('ready'),
        inProgress : document.getElementById('in-progress'),
        notStarted : document.getElementById('not-started'),
        asap       : document.getElementById('asap'),
        edit       : document.getElementById('edit'),
    },

    // backend & misc
    backend_url : 'https://api.example.com/v1',
    debug       : true,
    timeZone    : Intl.DateTimeFormat().resolvedOptions().timeZone,
};
*/

const STATUS_FLOW = {
  NOT_STARTED: { next: 'ASAP', prev: null },
  ASAP: { next: 'IN_PROGRESS', prev: 'NOT_STARTED' },
  IN_PROGRESS: { next: 'REQUIRES_CHANGES', prev: 'ASAP' },
  REQUIRES_CHANGES: { next: 'READY', prev: 'IN_PROGRESS' },
  READY: { next: null, prev: 'REQUIRES_CHANGES' },
};

const ENDPOINTS = {
    createBoard: {
        path: 'board',
        method: 'POST'
    },
    searchBoard: {
        path: 'board/search',
        method: 'POST'
    },
    getBoard: {
        path: 'board/{boardId}',
        method: 'GET'
    },
    currentUser: {
        path: 'currentUser',
        method: 'GET'
    },
    getUser: {
        path: 'user/{userId}',
        method: 'GET'
    },
    getCountryList: {
        path: 'countries',
        method: 'GET'
    },
    searchUsers: {
        path: 'user/search',
        method: 'POST'
    },
    addClientTask: {
        path: 'board/{boardId}',
        method: 'POST'
    },
    getClientTask: {
        path: 'board/task/{taskId}',
        method: 'GET'
    },
    updateClientTask: {
        path: 'board/task/{taskId}',
        method: 'PUT'
    },
    uploadFile: {
        path: 'board/task/{taskId}/uploadFile',
        method: 'POST'
    },
    filesView: {
        path: 'board/{boardId}/files/view',
        method: 'GET'
    },
    commentClientTask: {
        path: 'board/task/{taskId}/comment',
        method: 'POST'
    }
};


class Migroot {
    constructor(config) {
        this.config = config;
        this.backend_url = config.backend_url || 'https://migroot-447015.oa.r.appspot.com/v1'; // taking from config
        this.endpoints = ENDPOINTS;
        this.log = new Logger(this.config.debug);
        this.boardUser = null; // for what ??? for dummy user?
        this.currentUser = null;
        this.boardId = null;
        this.board = {};
        this.board.tasks = [];
        this.board.docs = null;
        this.countries = null;
        this.token = null;
        this.init()
    }

    init() {
        // expose instance and proxy helpers to window (for inline‑onclick in templates)
        window.mg = this;
        this.generateMethodsFromEndpoints();
        this.initHandlers();
        this.log.info('Migroot initialized');
    }

    initHandlers() {
        // window.handleFileUpload   = el => this.#handleUploadFromButton(el);
        window.handleUpdateStatus = el => this.#handleStartFromButton(el);
        window.handleFileUploadSubmit = el => this.#handleFileUploadSubmit(el);
        window.handleCommentSubmit = el => this.#handleCommentSubmit(el);
        window.handleChooseFile = el => this.#handleChooseFile(el);
        window.handleNextButton = el => this.#handleNextButton(el);
        window.handlePrevButton = el => this.#handlePrevButton(el);
        window.handleReadyButton = el => this.#handleReadyButton(el);
        window.handleChooseFile = el => this.#handleChooseFile(el);
        window.handleCreateBoard = el => this.#handleCreateBoard(el);
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
            this.currentUser = await this.api.currentUser();
            this.log.info('Current user set from API:', this.currentUser);
        } catch (error) {
            this.log.error('User initialization failed:', error);
            throw error;
        }
    }

    async fetchCountryList() {
        try {
            this.countries = await this.api.getCountryList();
            this.log.info('fetch country list done:', this.countries);
        } catch (error) {
            this.log.error('fetch countries failed:', error);
            throw error;
        }
    }

    async fetchBoard(boardId = null) {
        function updateLocalStorage(board) {
            if (!board || !Array.isArray(board.tasks)) {
                console.warn('Board data is missing or malformed');
                return;
            }
            if (board.createdDate) {
                const isoDate = board.createdDate;
                const date = new Date(isoDate);
                var readableDate = date.toLocaleString('en-GB', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric',
                                        });
            }

            const goalTasks = board.tasks.filter(task => task.documentRequired).length;
            const doneTasks = board.tasks.filter(
                task => task.status === 'READY' && task.documentRequired
            ).length;

            localStorage.setItem('defaultCountry', board.country || '');
            localStorage.setItem('defaultBoardId', board.boardId || '');
            localStorage.setItem('defaultBoardGoalTasks', String(goalTasks));
            localStorage.setItem('defaultBoardDoneTasks', String(doneTasks));
            localStorage.setItem('defaultBoardDate', readableDate || '')
        }

        try {
            let finalBoardId = boardId;

            if (!finalBoardId) {
                const urlParams = new URLSearchParams(window.location.search);
                finalBoardId = urlParams.get('boardId');
            }

            if (!finalBoardId) {
                finalBoardId = localStorage.getItem('defaultBoardId');
            }

            if (finalBoardId) {
                await this.loadBoardById(finalBoardId);
            } else {
                await this.loadUserBoard()
                // await this.loadDummyUserBoard();
            }
            updateLocalStorage(this.board);
        } catch (error) {
            this.log.error('Board initialization failed:', error);
            throw error;
        }
    }

    async fetchDocs(boardId = null) {
        try {
            let finalBoardId = boardId;

            if (!finalBoardId) {
                const urlParams = new URLSearchParams(window.location.search);
                finalBoardId = urlParams.get('boardId');
            }

            if (!finalBoardId) {
                finalBoardId = localStorage.getItem('defaultBoardId');
            }

            if (finalBoardId) {
                await this.loadBoardDocsById(finalBoardId);
            } else {
                await this.loadUserBoardDocs()
            }
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

        console.log('Board loaded by ID:', this.board);
        console.log('User initialized from board owner:', this.boardUser);

        if (!this.boardUser?.id || !this.boardUser?.type) {
            throw new Error('Owner of the board is missing id or type.');
        }
    }

    async loadBoardDocsById(boardId) {
        try {
            const res = await this.api.filesView({}, { boardId });
            this.board.docs = res.files;
            this.log.info(`Docs loaded for board ID ${boardId}:`, res);
        } catch (error) {
            this.log.error(`Failed to load docs for board ID ${boardId}:`, error);
            throw new Error('Fetch docs error');
        }
    }

    async loadUserBoard(boardUser = null) {
        this.boardUser = boardUser || this.currentUser

        if (!this.boardUser?.id || !this.boardUser?.type) {
            this.log.error('User init error for user:', this.boardUser)
            throw new Error('User init error');
        }

        this.log.info(' user initialized:', this.boardUser);

        const boards = await this.api.searchBoard({
            userType: this.boardUser.type,
            userId: this.boardUser.id
        });

        this.log.info('Boards found for user:', boards);

        if (!Array.isArray(boards) || boards.length === 0) {
            this.log.warning('No boards found for user:', this.boardUser)
            this.#showCreateButton();
            throw new Error('No boards found for user.');
        }

        this.board = boards[0];
        this.boardId = this.board.boardId;

        this.log.info('First board initialized for user:', this.board);
    }

    async loadUserBoardDocs(boardUser = null) {
        await this.loadUserBoard(boardUser);
        if (!this.boardId) {
            this.log.error('No docs and boards found for user:', this.boardUser)
            throw new Error('Fetch docs error: cant get board for user');
        }
        await this.loadBoardDocsById(this.boardId)
    }

    // async loadDummyUserBoard() {
    //     const dummy_user = {
    //         id: 'f73b9855-efe5-4a89-9c80-3798dc10d1ab',
    //         type: 'CLIENT',
    //         email: 'dummyemail@dog.com',
    //         name: 'Dummy user'
    //     };
    //     console.log('Dummy user initialized:', dummy_user);
    //
    //     await this.loadUserBoard(dummy_user);
    // }

    /**
     * Creates a new board.
     *
     * @param {Array<Feature>} features - Array of feature objects. Must include at least:
     *   COUNTRY_OF_CITIZENSHIP and COUNTRY_OF_VISA_APPLICATION.
     */
    async createBoard(features) {
        if (!Array.isArray(features)) {
            throw new Error('features must be an array of Feature objects');
        }
        try {
            this.token = await this.getAccessToken();
            this.currentUser = await this.api.currentUser();
            this.log.info('Current user set from API:', this.currentUser);

            if (!this.currentUser?.id || !this.currentUser?.type) {
                throw new Error('User init error');
            }

            const createdBoard = await this.api.createBoard({
                owner: {
                    id: this.currentUser?.id,
                    type: this.currentUser?.type
                },
                features: features
            });

            this.log.info('board created:', createdBoard);
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
                'Authorization': `Bearer ${accessToken}`,
                ...(isFormData ? {} : { 'Content-Type': 'application/json' })
            };

            const payload = method !== 'GET'
                ? (isFormData ? body : JSON.stringify(body))
                : undefined;

            const response = await fetch(url, {
                method: method,
                headers: headers,
                body: payload
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

    /*───────────────────────────  Dashboard/Docs/HUB START ──────────────────────────*/



    async init_dashboard({ boardId = null, callback = null, type = 'todo' } = {}) {
      try {


          this.log.info('Step 2: Fetching user and board');
          await this.fetchUserData();
          let finalBoardId = boardId;

          if (!finalBoardId) {
              const urlParams = new URLSearchParams(window.location.search);
              finalBoardId = urlParams.get('boardId');
          }
          if (type === 'todo') {
              this.log.info('Step 1: Clearing containers');
              this.#clearContainers();
              await this.fetchBoard(finalBoardId);
              this.log.info('Step 3: Creating cards based on tasks');
              this.board.tasks.forEach(item => {
                    try {
                        this.createCard(item, { card_type: type });
                    } catch (err) {
                        this.log.error('createCard failed for item:', item);
                        this.log.error(err.message, err.stack);
                        throw err;
                    }
                });
          } else if (type === 'docs') {
              this.log.info('Step 1: Clearing containers');
              this.#clearContainers();
              await this.fetchDocs(finalBoardId);
              this.board.tasks = []
              this.board.docs.forEach(item => {
                  try {
                      var task = item.taskRef
                      task.commentsCount = 0;
                      task.filesCount = 0;
                      task.fileName = item.fileName;
                      task.viewLink = item.viewLink;
                      task.fileStatus = item.status;
                      task.card_type = type;
                      this.board.tasks.push(task);
                  } catch (err) {
                      this.log.error('createDocCard failed for item:', item);
                      this.log.error(err.message, err.stack);
                      throw err;
                  }
              });
              this.log.info('Step 3: Creating cards based on tasks');
              this.board.tasks.forEach(item => {
                    try {
                        this.createCard(item, { card_type: type });
                    } catch (err) {
                        this.log.error('createCard failed for item:', item);
                        this.log.error(err.message, err.stack);
                        throw err;
                    }
                });
          } else if (type === 'create-board') {
              await this.fetchCountryList();
              this.renderCountryInputs();
          } else if (type === 'hub') {
              this.renderHubFields();
          } else {
                this.log.info('page is not a dashboard: ', type);
                return;
        }


        this.renderUserFields();
        this.log.info('Dashboard initialized successfully');

        if (typeof callback === 'function') {
          this.log.info('callback called');
          callback({ taskCount: this.board.tasks.length }); // можно передавать аргументы
        }

      } catch (error) {
        this.log.error(`Error during init dashboard: ${error.message}`);
        this.log.error('Stack trace:', error.stack);
        throw error;
      }
    }

    async init_mg({ boardId = null, callback = null} = {}) {
        const path = window.location.pathname;
        const segments = path.split('/').filter(Boolean);
        const page_type = segments[segments.length - 1];
        await this.init_dashboard({boardId: boardId, callback: callback, type: page_type})
    }

    /*───────────────────────────  Dashboard/Docs/HUB END ──────────────────────────*/

    /*───────────────────────────  Dashboard helpers START ────────────────────────────*/


    renderUserFields() {
        this.renderUserPoints();
        this.renderNavCountry();
        this.renderProgressBar();
        // ect
    }

    renderHubFields() {
        const countryKey = localStorage.getItem('defaultCountry');
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

            // selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }

    renderNavCountry() {
        const country = localStorage.getItem('defaultCountry')
        const countryElement = document.getElementById('nav-country');

        if (countryElement) {
          const items = countryElement.querySelectorAll('[data-country]');

          items.forEach(item => {
            // Всегда убираем active у всех
            item.classList.remove('active');

            // Если country существует и совпадает, ставим active
            if (country && item.getAttribute('data-country') === country) {
              item.classList.add('active');
            }
          });
        }
    }

    renderProgressBar() {
        const createdDate = localStorage.getItem('defaultBoardDate');
        const goal = parseInt(localStorage.getItem('defaultBoardGoalTasks'), 10) || 0;
        const done = parseInt(localStorage.getItem('defaultBoardDoneTasks'), 10) || 0;
        const percent = goal > 0 ? Math.round((done / goal) * 100) : 0;
        const dateEl = document.getElementById('created-date')
        const countEl = document.getElementById('progress-bar-count');
        const fillEl = document.getElementById('progress-bar-fill');

        if (dateEl) {
            dateEl.textContent = `Since ${createdDate}`;

        }
        if (countEl) {
            countEl.textContent = `Your progress: ${done}/${goal}`;
        }

        if (fillEl) {
            fillEl.style.width = `${percent}%`;
        }
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
            this.log.warning('boardUser or points not set');
        } else {
            points = mg.currentUser.points || 0
        }

        el.textContent = points;
        this.log.info(`User points rendered into #${this.config.user.pointsContainerId}: ${points}`);
    }

    smartMerge(target, source) {
        for (const key of Object.keys(source)) {
            const srcVal = source[key];
            const tgtVal = target[key];

            if (Array.isArray(srcVal)) {
                // Если пустой массив и в target уже что-то есть — пропускаем
                if (srcVal.length === 0 && Array.isArray(tgtVal) && tgtVal.length > 0) {
                    continue;
                }
                target[key] = srcVal;
            } else if (srcVal !== null && typeof srcVal === 'object') {
                if (!tgtVal || typeof tgtVal !== 'object') {
                    target[key] = {};
                }
                this.smartMerge(target[key], srcVal);
            } else if (srcVal === null && tgtVal !== null) {
                // Если новое значение null, а старое не null — пропускаем
                continue;
            } else if (srcVal !== undefined) {
                target[key] = srcVal;
            }
        }
    }

    getNextStatus(current) {
            return STATUS_FLOW[current]?.next ?? null;
        }

    getPrevStatus(current) {
            return STATUS_FLOW[current]?.prev ?? null;
        }

    createCard(item, options = {}) {
        const { skip_drawer = false , card_type = 'todo'} = options;

        this.log.info(`Step 5: Creating card for ${card_type} item: ${item}`);

        var card = null;
        if (card_type === 'todo') {
            card = this.config.template?.cloneNode(true);
        } else if (card_type === 'docs') {
            card = this.config.docTemplate?.cloneNode(true);
        }
        if (card) {
            this.#insertCard(card, item);
        } else {
            throw new Error(
                `unknown card type "${card_type}". `
            );
        }

        if (!skip_drawer) {
            this.log.info(`Step 5a: Creating drawer for ${card_type} item: ${item}`);
            // drawer logic
            const drawer = this.config.drawer?.cloneNode(true);
            if (drawer) {
                this.#insertDrawer(drawer, item);
            }
        }
    }

    createDocCard(item, options = {}) {
        const { skip_drawer = false } = options;
        this.log.info(`Step 5: Creating Doc card for item: ${item}`);

        const doc_card = this.config.docTemplate?.cloneNode(true);
        if (doc_card) {
            this.#insertDocCard(doc_card, item);
        }
        if (!skip_drawer) {
            // drawer logic
            this.log.info(`Step 5: Creating drawer for Doc card for item: ${item}`);
            const drawer = this.config.drawer?.cloneNode(true);
            if (drawer) {
                this.#insertDrawer(drawer, item.taskRef);
            } else {
                this.log.error('cant find drawer template node');
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
                this.log.error(`Unknown status: ${status}`);
                return this.config.containers.notStarted;
        }
    }

    #getDocStatusContainer(status) {
        switch (status) {
            case 'REVIEW':
                return this.config.docsContainers.review;
            case 'APPROVED':
                return this.config.docsContainers.approved;
            case 'REJECTED':
                return this.config.docsContainers.rejected;
            case 'NOT_UPLOADED':
                return this.config.docsContainers.notUploaded;
            default:
                this.log.error(`Unknown status: ${status}`);
                return this.config.docsContainers.notUploaded;
        }
    }

    /** @type {Set<string>} */
    // delete assign from that set after it has been added to backaend //
    #optionalFields = new Set(['location', 'deadline', 'assign']);

    /**
     * Populates a cloned task/card template with the values from a task object.
     *
     * @param {HTMLElement} clone  – the clone to populate.
     * @param {TaskItem}    item   – task data.
     * @param {Object}      [opts] – optional behaviour overrides.
     * @param {string}      [opts.fieldSelector='[data-task]']   – selector for all “data holders”.
     * @param {string}      [opts.labelSelector='.t-mark__label'] – selector for the label inside each holder.
     * @param {Object}      [opts.renderers]                     – per‑field rendering functions (receive (el, value)).
     */

    #setContent(
        clone,
        item,
        {
            fieldSelector = '[data-task]',
            labelSelector = '.t-mark__label',
            renderers     = {}
        } = {}
    ) {
        const allFields = clone.querySelectorAll(fieldSelector);
        // Derive the attribute name from selector, e.g. '[data-task]' → 'data-task'
        const attrMatch = fieldSelector.match(/\[([^\]=]+)(?:=[^\]]+)?\]/);
        if (!attrMatch) {
            throw new Error(
                `Migroot#setContent: cannot derive attribute name from selector "${fieldSelector}". ` +
                'Provide a selector that contains an attribute filter like "[data-foo]".'
            );
        }
        const attrName = attrMatch[1];

        allFields.forEach(container => {
            const key = container.getAttribute(attrName);
            this.log.info(`Found key="${key}" in ${fieldSelector}`);
            // for example data-task='status' => key is status
            if (!key) return;

            let value = item[key];
            this.log.info(`Found value="${value}" for key="${key}" in ${fieldSelector}`);
            const isValueEmpty =
                value === undefined ||
                value === null ||
                value === '' ||
                (typeof value === 'number' && Number.isNaN(value));

            if (this.#optionalFields.has(key) && isValueEmpty) {
                if (key === 'location') {
                    this.log.info(`Missing location; setting default to "online"`);
                    value = 'online';
                } else if (key === 'deadline') {
                    this.log.info(`Missing deadline; setting default to "TBD"`);
                    value = 'TBD';
                } else {
                    this.log.info(`Optional value="${value}" for key="${key}" in ${fieldSelector} removing`);
                    container.remove(); // not working in drawer
                    return;
                }
            } else if (!value) {
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
                this.log.info(`Rendering key="${key}" into element:`, labelEl);
                this.log.info('Value to render:', value);
                const which = renderers[key] ? 'custom' : 'default';
                this.log.info(`Using ${which} renderer for key="${key}"`);
                (renderers[key] || this.#defaultRenderer)(labelEl, value);
            } catch (err) {
                this.log.error(
                    `Renderer failed for key="${key}" value=`, value
                );
                this.log.error(err.message, err.stack);
                throw err; // bubble up
            }
        });
    }

    #insertCard(card, item) {
        this.#setContent(card, item, {
            fieldSelector: '[data-task]',
            labelSelector: '.t-mark__label',
            renderers: {
                viewLink           : this.#renderFileUrl.bind(this),  // for doc-board
                deadline          : this.#renderDeadline.bind(this),
                difficulty        : this.#renderDifficulty.bind(this)
            }
        });
        const targetContainer = this.#getStatusContainer(item.status);

        card.id = `task-${item.clientTaskId}`;
        card.dataset.required = item.documentRequired ? 'true' : 'false';
        card.dataset.difficulty = item.difficulty || '';
        card.dataset.status = item.status || '';
        this.log.info(`Step 6: Setting card content for card ID: ${card.id}`);
        card.onclick = () => {
            // Log card click
            this.log.info(`Card clicked: ${item.clientTaskId}`);
            const drawerEl = document.getElementById(`drawer-${item.clientTaskId}`);
            if (drawerEl) {
                drawerEl.style.display = 'flex';
                this.log.info(`Drawer opened for card ID: ${item.clientTaskId}`);

                // --- Enrich with full task data if not fetched yet ---
                const task = this.board?.tasks?.find(t => String(t.clientTaskId) === item.clientTaskId);
                this.log.info('Checking task: ', task);

                // Logging before checking enrichment
                this.log.info('Checking if task needs enrichment', { hasTask: !!task, alreadyFetched: task?._detailsFetched });
                if (task && !task._detailsFetched) {
                    // Log before enrichment
                    this.log.info(`Enriching task ${item.clientTaskId} with full details`);
                    this.api.getClientTask({}, { taskId: item.clientTaskId }).then(fullTask => {
                    this.smartMerge(task, fullTask);
                    task._detailsFetched = true;
                        this.log.info(`Task ${task.clientTaskId} enriched with full data`);
                        this.#onTaskEnriched(task);
                    }).catch(err => {
                        this.log.error('Failed to enrich task data:', err);
                    });
                } else {
                    this.log.info(`Task ${item.clientTaskId} already enriched or not found`);
                }
                // --- End enrichment ---

                // drawer closing logic start ///
                if (this._drawerOutsideHandler) {
                    document.removeEventListener('pointerdown', this._drawerOutsideHandler);
                }

                this._drawerOutsideHandler = (event) => {
                    if (drawerEl && !drawerEl.contains(event.target)) {
                        this.log.info(`Click outside reopened drawer-${item.clientTaskId}, closing`);
                        drawerEl.style.display = 'none';
                        document.removeEventListener('pointerdown', this._drawerOutsideHandler);
                        this._drawerOutsideHandler = null;
                    } else {
                        this.log.info(`Click inside reopened drawer-${item.clientTaskId}, not closing`);
                    }
                };

                document.addEventListener('pointerdown', this._drawerOutsideHandler);
                // drawer closing logic end ///
            }
        };
        this.log.info('Step 11: Replacing existing card if needed');
        this.#replaceExistingCard(card, targetContainer);
    }

    #insertDocCard(card, item) {
        this.#setContent(card, item, {
            fieldSelector: '[data-doc]',
            labelSelector: '.t-mark__label',
            renderers: {
                viewLink           : this.#renderFileUrl.bind(this),
                deadline          : this.#renderDeadline.bind(this),
                difficulty        : this.#renderDifficulty.bind(this)
            }
        });
        const targetContainer = this.#getStatusContainer(item.taskRef.status);

        card.id = `doc-${item.taskRef.clientTaskId}`;
        card.dataset.status = item.taskRef.status || '';
        this.log.info(`Step 6: Setting card content for card ID: ${card.id}`);
        card.onclick = () => this.handleCardClick(item.taskRef);
        this.log.info('Step 11: Replacing existing card if needed');
        this.#replaceExistingCard(card, targetContainer);
    }

    #insertDrawer(drawer, item) {
        // item == board task object
        this.#setContent(drawer, item,
            this.#drawerOpts()
        );

        drawer.id = `drawer-${item.clientTaskId}`;
        drawer.dataset.required = item.documentRequired ? 'true' : 'false';
        drawer.dataset.difficulty = item.difficulty || '';
        drawer.dataset.status = item.status || '';
        this.log.info(`Step 7: Setting drawer content for card ID: ${item.clientTaskId}`);
        // CREATE CLOSE BUTTON
        const closeButton = drawer.querySelector('.drw-close');
        if (closeButton) {
            closeButton.onclick = (e) => {
                e.preventDefault();
                drawer.style.display = 'none';
            };
        }

        const existingDrawer = document.getElementById(`drawer-${item.clientTaskId}`);
        if (existingDrawer) {
            existingDrawer.replaceWith(drawer);
        } else {
            this.config.allDrawers.appendChild(drawer);
        }
    }

    handleCardClick(item) {
        this.log.info(`Card clicked: ${item.clientTaskId}`);
        const drawerEl = document.getElementById(`drawer-${item.clientTaskId}`);
        if (drawerEl) {
            drawerEl.style.display = 'flex';
            this.log.info(`Drawer opened for card ID: ${item.clientTaskId}`);

            // --- Enrich with full task data if not fetched yet ---
            const task = this.board?.tasks?.find(t => String(t.clientTaskId) === item.clientTaskId);
            this.log.info('Checking task: ', task);

            this.log.info('Checking if task needs enrichment', { hasTask: !!task, alreadyFetched: task?._detailsFetched });
            if (task && !task._detailsFetched) {
                this.log.info(`Enriching task ${item.clientTaskId} with full details`);
                this.api.getClientTask({}, { taskId: item.clientTaskId })
                    .then(fullTask => {
                        this.smartMerge(task, fullTask);
                        task._detailsFetched = true;
                        this.log.info(`Task ${task.clientTaskId} enriched with full data`);
                        this.#onTaskEnriched(task);
                    })
                    .catch(err => {
                        this.log.error('Failed to enrich task data:', err);
                    });
            } else {
                this.log.info(`Task ${item.clientTaskId} already enriched or not found`);
            }
            // --- End enrichment ---

            // drawer closing logic start ///
            if (this._drawerOutsideHandler) {
                document.removeEventListener('pointerdown', this._drawerOutsideHandler);
            }

            this._drawerOutsideHandler = (event) => {
                if (drawerEl && !drawerEl.contains(event.target)) {
                    this.log.info(`Click outside reopened drawer-${item.clientTaskId}, closing`);
                    drawerEl.style.display = 'none';
                    document.removeEventListener('pointerdown', this._drawerOutsideHandler);
                    this._drawerOutsideHandler = null;
                } else {
                    this.log.info(`Click inside reopened drawer-${item.clientTaskId}, not closing`);
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
            fieldSelector: '[data-drawer]',
            labelSelector: '.t-label',
            renderers: {
                deadline          : this.#renderDeadline.bind(this),
                difficulty        : this.#renderDifficulty.bind(this),
                longDescription   : this.#renderLongDescription.bind(this),
                // upload_button     : this.#renderUploadButton.bind(this),
                // start_button      : this.#renderStartButton.bind(this),
                comments          : this.#renderComments.bind(this),
                files             : this.#renderFiles.bind(this),
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
        if (val) el.innerHTML = val;
        else el.remove();
    }

    #renderDeadline(el, val) {
        if (val) el.textContent = this.#formatDate(val);
        else el.remove();
    }

    #renderDifficulty(el, val) {
        if (val) el.textContent = this.#formatDifficulty(val);
        else el.remove();
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
                const isUser = c.author.id === this.currentUser.id;
                const positionClass = isUser ? 'cmt-left' : 'cmt-right';
                const initials = `${(c.author?.firstName || '')[0] || ''}${(c.author?.lastName || '')[0] || (c.author?.firstName || ' ')[1] || ''}`.toUpperCase();
                const name = `${c.author?.firstName || ''} ${c.author?.lastName || ''}`.trim();
                const date = this.#formatDate(c.createdDate);
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

    #renderFiles(el, val) {
        const arr = Array.isArray(val) ? val : [];
        const container = el.querySelector('.drw-uploaded .f-wrap');
        if (!container) {
            el.textContent = 'Files container not found';
            return;
        }

        if (!arr.length) {
            // const container = el.querySelector('.drw-uploaded');
            container.innerHTML = '<div class="drw-empty">Nothing yet...</div>';
            return;
        }

        container.innerHTML = arr.map(file => `
            <a class="f-item" href="${file.downloadLink}" target="_blank">
                <div class="f-item__header">
                    <img src="https://cdn.prod.website-files.com/679bc8f10611c9a0d94a0caa/683476cbb9aeb76905819fc7_document-color.svg" alt="" class="f-item__icon">
                    <div class="f-item__name">${file.fileName}</div>
                    <div class="f-item__status ${file.status}">${file.status}</div>
                </div>
                <div class="f-item__date">${this.#formatDate(file.createdDate)}</div>
            </a>
        `).join('');
    }

    #renderFileUrl(el, val) {
        if (!val) {
            return;
        }
        el.setAttribute('href', val);
    }

    #onTaskEnriched(task) {
        // # find the drawer linked and upd comments and files
        const drawer = document.getElementById(`drawer-${task.clientTaskId}`);
        if (!drawer) return;

        // Tab 2: Comments
        const commentsPane = drawer.querySelector('.tb-pane[data-w-tab="Tab 2"]');
        if (commentsPane) this.#renderComments(commentsPane, task.comments);

        // Tab 3: Files
        const filesPane = drawer.querySelector('.tb-pane[data-w-tab="Tab 3"]');
        if (filesPane) this.#renderFiles(filesPane, task.files);

        // todo upd status and numbers
        this.#setContent(drawer, task,
            this.#drawerOpts()
        );
        drawer.dataset.status = task.status || '';

    }

    #handleStartFromButton(btn) {
        const id = this.#taskIdFromDrawer(btn);
        const item = this.board?.tasks?.find(t => String(t.clientTaskId) === id);
        if (item) this.#handleStatusChange(item, 'IN_PROGRESS');
    }

    #handleNextButton(btn) {
        const id = this.#taskIdFromDrawer(btn);
        const item = this.board?.tasks?.find(t => String(t.clientTaskId) === id);
        const next_status = this.getNextStatus( item.status );
        if (item) this.#handleStatusChange(item, next_status);
    }

    #handlePrevButton(btn) {
        const id = this.#taskIdFromDrawer(btn);
        const item = this.board?.tasks?.find(t => String(t.clientTaskId) === id);
        const prev_status = this.getPrevStatus( item.status );
        if (item) this.#handleStatusChange(item, prev_status);
    }

    #handleReadyButton(btn) {
        const id = this.#taskIdFromDrawer(btn);
        const item = this.board?.tasks?.find(t => String(t.clientTaskId) === id);
        if (item) this.#handleStatusChange(item, 'READY');
    }

    #handleStatusChange(item, status) {
        this.log.info('Set new status for task', item.clientTaskId);

        const previousStatus = item.status;
        item.status = status;                 // optimistic
        // // Move card immediately
        this.createCard(item, { skip_drawer: true, card_type: item.card_type });

        // Persist to backend
        this.api.updateClientTask(
            { status: status },
            { taskId: item.clientTaskId }
        ).then(updatedTask => {
            const taskIndex = this.board.tasks.findIndex(t => String(t.clientTaskId) === item.clientTaskId);
            if (taskIndex !== -1) {
                this.smartMerge(this.board.tasks[taskIndex], updatedTask);
                // Object.assign(this.board.tasks[taskIndex], updatedTask);
                this.board.tasks[taskIndex]._detailsFetched = true;
                this.createCard(this.board.tasks[taskIndex], { skip_drawer: true , card_type: this.board.tasks[taskIndex].card_type});
                this.#onTaskEnriched(this.board.tasks[taskIndex]);

            }
        }).catch(err => {
            // rollback on failure
            this.log.error('Failed to update task status:', err);
            // alert('Server error: Could not change status the task. Try again.');
            // restore status and position
            item.status = previousStatus;
            this.createCard(item, { card_type: item.card_type })
            // let drawerEl = document.getElementById(`drawer-${item.clientTaskId}`);
            // if (drawerEl) drawerEl.style.display = 'flex';
        });
        // TODO if success - update mg.board.tasks by id
    }

    #handleCreateBoard(formEl) {
        // Prevent default behavior (если вызывается напрямую из onsubmit)
        if (formEl?.preventDefault) {
            formEl.preventDefault();
            formEl = formEl.target; // formEl теперь — сама форма
        }

        const formData = new FormData(formEl);

        const features = [];
        const allowedFeatureTypes = new Set([
            'COUNTRY_OF_CITIZENSHIP',
            'COUNTRY_OF_VISA_APPLICATION',
            'COUNTRY_OF_DESTINATION',
            'COUNTRY_OF_RECENT_STAY',
            'COUNTRY_OF_LABOR_CONTRACT',
            'COUNTRY_OF_ENTREPRENEURSHIP',
            'MOVE_WITH_SPOUSE',
            'MOVE_WITH_CHILDREN',
            'MOVE_WITH_PARENTS',
            'MOVE_WITH_PETS'
        ]);
        for (const [key, value] of formData.entries()) {
            if (value && value.trim() !== "" && allowedFeatureTypes.has(key)) {
                features.push({
                    type: key,
                    value: value.trim()
                });
            }
        }

        this.createBoard(features).then(async (createdBoard) => {
            if (createdBoard && createdBoard.boardId) {
                this.log.info('Board successfully created', createdBoard);
                await new Promise(resolve => setTimeout(resolve, 2000));
                window.location.href = `/app/todo?boardId=${createdBoard.boardId}`;
            } else {
                this.log.error('Invalid response: boardId or status missing', createdBoard);
            }
        }).catch(err => {
            this.log.error('Failed to create board:', err);
            alert('Failed to create board. Please try again.');
        });

        return false;
    }

    #handleChooseFile(input) {
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

    // File upload submit handler (overwritten)
    #handleFileUploadSubmit(formEl) {
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

        const maxSize = 25 * 1024 * 1024;
        if (uploadedFile.size > maxSize) {
            this.log.error('File is too large. Maximum size is 25MB.');
            if (fileError) fileError.textContent = 'File is too large. Maximum size is 25MB.';
            return;
        }

        // 🔒 Проверка формата
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowedTypes.includes(uploadedFile.type)) {
            this.log.error(`Invalid file type: ${uploadedFile.type}`);
            alert('Invalid file type. Allowed: PDF, JPG, PNG.');
            return;
        }

        formData.append('file', uploadedFile);

        if (fileLabel) fileLabel.textContent = 'Loading';
        if (submitBtn) submitBtn.disabled = true;

        this.api.uploadFile(formData, { taskId }).then(updatedTask => {
            const taskIndex = this.board.tasks.findIndex(t => String(t.clientTaskId) === taskId);
            if (taskIndex !== -1) {
                this.smartMerge(this.board.tasks[taskIndex], updatedTask);
                // Object.assign(this.board.tasks[taskIndex], updatedTask);
                this.board.tasks[taskIndex]._detailsFetched = true;
                this.createCard(this.board.tasks[taskIndex], { skip_drawer: true, card_type: this.board.tasks[taskIndex].card_type });
                this.#onTaskEnriched(this.board.tasks[taskIndex]);
            } else {
                this.log.warning(`Task with ID ${taskId} not found in board`);
            }

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
        const input = formEl.querySelector('input[name="Comment"]');
        const message = input?.value?.trim();
        const taskId = this.#taskIdFromDrawer(formEl);

        if (!taskId || !message) {
            this.log.error('Missing taskId or message');
            return;
        }
        const authorId = this.currentUser?.id;
        const body = {
            author: authorId,
            message: message
        };
        this.api.commentClientTask(body, { taskId }).then(updatedTask => {
            const taskIndex = this.board.tasks.findIndex(t => String(t.clientTaskId) === taskId);
            if (taskIndex !== -1) {
                this.smartMerge(this.board.tasks[taskIndex], updatedTask);
                // Object.assign(this.board.tasks[taskIndex], updatedTask);
                this.board.tasks[taskIndex]._detailsFetched = true;
                this.createCard(this.board.tasks[taskIndex], {
                    skip_drawer: true,
                    card_type: this.board.tasks[taskIndex].card_type
                });
                this.#onTaskEnriched(this.board.tasks[taskIndex]);
            } else {
                this.log.warning(`Task with ID ${taskId} not found in board`);
            }

            input.value = ''; // clear field
        }).catch(err => {
            this.log.error('Comment submit failed:', err);
        });
    }

    /*───────────────────────────  Drawer helpers END ───────────────────────*/


    /*───────────────────────────  Utility & Formatting START ───────────────*/


    #clearContainers() {
        Object.values(this.config.containers).forEach(container => container.innerHTML = '');
    }

    #clearDocsContainers() {
        Object.values(this.config.docsContainers).forEach(container => container.innerHTML = '');
    }

    #formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            timeZone: this.config.timeZone
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

      // Добавить кнопку
      const button = document.createElement('a');
      button.textContent = 'Let`s do it!';
      button.href = '/app/create-board';
      button.style.display = 'inline-block';
      button.style.padding = '12px 24px';
      button.style.backgroundColor = '#ff9900';
      button.style.color = '#fff';
      button.style.textDecoration = 'none';
      button.style.fontSize = '18px';
      button.style.borderRadius = '8px';

      // Вставляем новый контент
      clone.appendChild(text);
      clone.appendChild(button);

      // Вставить клон сразу после оригинала
      original.parentNode.insertBefore(clone, original.nextSibling);
    }


    /*───────────────────────────  Utility & Formatting END ─────────────────*/
}
window.Migroot = Migroot;
