class Logger {
    constructor(debug = false) {
        this.debug = debug;
    }

    _getCurrentTime() {
        const now = new Date();
        const timeString = now.toISOString().slice(11, 23);
        return timeString;
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

const ENDPOINTS = {
    searchBoard: {
        path: 'board/search',
        method: 'POST'
    },
    currentUser: {
        path: 'currentUser',
        method: 'GET'
    },
    getUser: {
        path: 'user/{userId}',
        method: 'GET'
    },
    searchUsers: {
        path: 'user/search',
        method: 'POST'
    },
    getBoard: {
        path: 'board/{boardId}',
        method: 'GET'
    },
    searchBoards: {
        path: 'board/search',
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
};


class Migroot {
    constructor(config) {
        this.config = config;
        this.backend_url = config.backend_url || 'https://migroot-447015.oa.r.appspot.com/v1'; // taking from config
        this.endpoints = ENDPOINTS;
        this.log = new Logger(this.config.debug);
        this.user = null;
        this.boardId = null;
        this.board = null;
        this.token = null;
        this.init()

        // expose instance and proxy helpers to window (for inline‑onclick in templates)
        window.mg = this;
        window.handleFileUpload   = el => this.#handleUploadFromButton(el);
        window.handleUpdateStatus = el => this.#handleStartFromButton(el);

    }

    init() {
        this.generateMethodsFromEndpoints();
        this.log.info('Migroot initialized');
    }

    /*───────────────────────────  API helpers START ────────────────────────*/

    async fetchData(boardId = null) {
        try {
            this.token = await this.getAccessToken();

            let finalBoardId = boardId;

            if (!finalBoardId) {
                const urlParams = new URLSearchParams(window.location.search);
                finalBoardId = urlParams.get('boardId');
            }

            if (finalBoardId) {
                await this.loadBoardById(finalBoardId);
            } else {
                await this.loadDummyUserBoard();
            }
        } catch (error) {
            this.log.error('Initialization failed:', error);
            throw error;
        }
    }


    async loadBoardById(boardId) {
        this.board = await this.getBoard({}, {
            boardId: boardId
        });
        this.boardId = this.board.boardId;
        this.user = this.board.owner;

        console.log('Board loaded by ID:', this.board);
        console.log('User initialized from board owner:', this.user);

        if (!this.user?.id || !this.user?.type) {
            throw new Error('Owner of the board is missing id or type.');
        }
    }

    async loadDummyUserBoard() {
        this.user = {
            id: 'f73b9855-efe5-4a89-9c80-3798dc10d1ab',
            type: 'CLIENT',
            email: 'dummyemail@dog.com',
            name: 'Dummy user'
        };
        console.log('Dummy user initialized:', this.user);

        const boards = await this.searchBoard({
            userType: this.user.type,
            userId: this.user.id
        });

        console.log('Boards found for dummy user:', boards);

        if (!Array.isArray(boards) || boards.length === 0) {
            throw new Error('No boards found for dummy user.');
        }

        this.board = boards[0];
        this.boardId = this.board.boardId;
        this.user = this.board.owner;

        console.log('First board initialized for dummy user:', this.board);
        console.log('User replaced from board owner:', this.user);

        if (!this.user?.id || !this.user?.type) {
            throw new Error('Owner of the dummy board is missing id or type.');
        }
    }


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

    /*───────────────────────────  API helpers END ──────────────────────────*/

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
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: method !== 'GET' ? JSON.stringify(body) : undefined
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
        for (const [name, config] of Object.entries(this.endpoints)) {
            this[name] = async (body = {}, pathParams = {}) => {
                return await this.request(name, body, config.method, pathParams);
            };
        }
    }

    /*───────────────────────────  Dashboard START ──────────────────────────*/

    async init_dashboard({ boardId = null, callback = null } = {}) {
      try {
        this.log.info('Step 1: Clearing containers');
        this.#clearContainers();

        this.log.info('Step 2: Fetching user and board');
        await this.fetchData(boardId); // ✅ исправлено имя

        this.log.info('Step 3: Creating tasks');
        this.board.tasks.forEach(item => this.createCard(item));

        this.log.info('Dashboard initialized successfully');

        if (typeof callback === 'function') {
          this.log.info('callback called');
          callback({ taskCount: this.board.tasks.length }); // можно передавать аргументы
        }

      } catch (error) {
        this.log.error(`Error during init dashboard: ${error.message}`);
        throw error; // ✅ проброс наружу
      }
    }

    createCard(item) {
        this.log.info(`Step 5: Creating card for item: ${item}`);

        const card = this.config.template?.cloneNode(true);
        if (card) {
            this.#insertCard(card, item);
        }
        // drawer logic
        const drawer = this.config.drawer?.cloneNode(true);
        if (drawer) {
            this.#createDrawer(drawer, item);


        }


    }

    /*───────────────────────────  Dashboard END ────────────────────────────*/

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
            case 'TO_DO':
                return this.config.containers.notStarted;
            case 'URGENT':
                return this.config.containers.asap;
            case 'IN_PROGRESS':
                return this.config.containers.inProgress;
            case 'EDIT':
                return this.config.containers.edit;
            case 'READY':
                return this.config.containers.ready;
            default:
                this.log.error(`Unknown status: ${status}`);
                return this.config.containers.notStarted;
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
     * @param {Object}      [opts.formatters]                    – additional/override value formatters.
     * @param {Object}      [opts.renderers]                     – per‑field rendering functions (receive (el, value)).
     */

    #setContent(
        clone,
        item,
        {
            fieldSelector = '[data-task]',
            labelSelector = '.t-mark__label',
            formatters    = {},
            renderers     = {},
        } = {}
    ) {
        // default formatters that exist for every call
        const defaultFormatters = {
            deadline  : val => this.#formatDate(val),
            difficulty: val => this.#formatDifficulty(val),
        };

        // user‑supplied formatters override the defaults
        const fns = { ...defaultFormatters, ...formatters };
        const defaultRenderer = (el, val) => { el.textContent = val; };

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
            // for example data-task='status' => key is status
            if (!key) return;

            let value = item[key];

            if (!value) return;
            // Arrays → their length, unless a formatter overrides it
            if (Array.isArray(value) && !fns[key]) {
                value = value.length;
            }

            // Apply formatter (default or custom) if any
            if (fns[key]) {
                value = fns[key](value);
            }

            const isValueEmpty =
                value === undefined ||
                value === null ||
                value === '' ||
                (typeof value === 'number' && Number.isNaN(value));

            if (this.#optionalFields.has(key) && isValueEmpty) {
                container.remove();
                return;
            }

            // Find label element or fall back to the container itself
            const labelEl = container.querySelector(labelSelector) || container;
            (renderers[key] || defaultRenderer)(labelEl, value);
        });
    }

    #insertCard(card, item) {
        this.#setContent(card, item);
        const targetContainer = this.#getStatusContainer(item.status);

        card.id = `doc-${item.clientTaskId}`;
        this.log.info(`Step 6: Setting card content for card ID: ${card.id}`);
        card.onclick = () => {
            const drawerEl = document.getElementById(`drawer-${item.clientTaskId}`);
            if (drawerEl) drawerEl.style.display = 'flex';
        };
        this.log.info('Step 11: Replacing existing card if needed');
        this.#replaceExistingCard(card, targetContainer);
    }

    #createDrawer(drawer, item) {
        // 1) populate generic [data-task] marks (same as in cards)
        this.#setContent(drawer, item, {
            fieldSelector: '[data-task]',
            labelSelector: '.t-mark__label'
        });

        // 2) drawer‑specific content via unified renderers
        this.#setContent(drawer, item, this.#drawerOpts());

        drawer.id = `drawer-${item.clientTaskId}`;
        this.log.info(`Step 7: Setting drawer content for card ID: ${item.clientTaskId}`);
        // CREATE CLOSE BUTTON
        const closeButton = drawer.querySelector('.t-close');
        if (closeButton) {
            closeButton.onclick = () => {
                drawer.style.display = 'none';
            };
        }

        document.body.appendChild(drawer);
    }

    /*───────────────────────────  Card & Drawer DOM END ────────────────────*/


    /*───────────────────────────  Drawer helpers START ─────────────────────*/

    #renderLongDescription(el, val) {
        if (val) el.innerHTML = val;
        else el.remove();
    }

    #renderUploadButton(el, _val) {
        /* 1) clone HTML snippet that comes from CONFIG
           2) adjust its id using the current item
           3) rely on whatever onclick the template already has.
           No hidden <input> creation or extra DOM building. */
        const snippet = this.config.buttons?.uploadButton;
        if (!snippet) {
            el.remove();
            return;
        }
        let node;
        if (snippet instanceof HTMLElement) {
            node = snippet.cloneNode(true);
        } else {
            const tmp = document.createElement('div');
            tmp.innerHTML = snippet;
            node = tmp.firstElementChild.cloneNode(true);
        }
        // ensure unique id
        const taskId = (this.#findItemByAncestorId(el, '').clientTaskId);
        if (node.id) {
            node.id = `${node.id}-${taskId}`;
        } else {
            node.id = `upload-${taskId}`;
        }
        // fallback event handler if no inline-onclick
        node.addEventListener('click', () => this.#handleUpload(this.#findItemByAncestorId(el, '')));
        el.replaceWith(node);
    }

    /* inline‑onclick helpers (used by templates) */
    #handleUploadFromButton(btn) {
        const item = this.#findItemByAncestorId(btn, 'upload-');
        if (item) this.#handleUpload(item);
    }

    #handleStartFromButton(btn) {
        const item = this.#findItemByAncestorId(btn, 'start-');
        if (item) this.#handleStart(item);
    }

    #findItemByAncestorId(element, prefix) {
        let el = element;
        while (el && el !== document) {
            if (el.id && el.id.startsWith(prefix)) {
                const taskId = el.id.slice(prefix.length);
                return this.board?.tasks?.find(t => String(t.clientTaskId) === taskId);
            }
            el = el.parentElement;
        }
        return null;
    }

    #handleUpload(item) {
        this.log.info('Upload file clicked for task', item.clientTaskId);
        // real upload logic already handled by node input; proxy kept for compatibility
    }

    #handleStart(item) {
        this.log.info('Start clicked for task', item.clientTaskId);
        // here you can call updateClientTask etc.
    }

    #renderComments(el, val) {
        const arr = Array.isArray(val) ? val : [];
        if (!arr.length) return el.remove();
        el.innerHTML = arr.map(c => `<p class="mb-1">${c}</p>`).join('');
    }

    #renderFiles(el, val) {
        const arr = Array.isArray(val) ? val : [];
        if (!arr.length) return el.remove();
        el.innerHTML = arr
          .map(f => `<a class="d-block mb-1" target="_blank" href="${f}">${f.split('/').pop()}</a>`)
          .join('');
    }

    #drawerOpts() {
        return {
            fieldSelector: '[data-drawer]',
            renderers: {
                longDescription : this.#renderLongDescription.bind(this),
                upload_button   : this.#renderUploadButton.bind(this),
                comments        : this.#renderComments.bind(this),
                files           : this.#renderFiles.bind(this),
            },
        };
    }

    /*───────────────────────────  Drawer helpers END ───────────────────────*/


    /*───────────────────────────  Utility & Formatting START ───────────────*/


    #clearContainers() {
        Object.values(this.config.containers).forEach(container => container.innerHTML = '');
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
      const map = {
        EASY: 'fun',
        MEDIUM: 'challenge',
        HARD: 'nightmare',
      };
      return map[value] || value;
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

    /*───────────────────────────  Utility & Formatting END ─────────────────*/
}
window.Migroot = Migroot;

