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
    uploadFile: {
        path: 'board/task/{taskId}/uploadFile',
        method: 'POST'
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
        this.user = null;
        this.boardId = null;
        this.board = null;
        this.token = null;
        this.init()

        // expose instance and proxy helpers to window (for inline‑onclick in templates)
        window.mg = this;
        // window.handleFileUpload   = el => this.#handleUploadFromButton(el);
        window.handleUpdateStatus = el => this.#handleStartFromButton(el);
        window.handleFileUploadSubmit = el => this.#handleFileUploadSubmit(el);
        window.handleCommentSubmit = el => this.#handleCommentSubmit(el);
        window.handleChooseFile = el => this.#handleChooseFile(el);
        window.handleNextButton = el => this.#handleNextButton(el);
        window.handlePrevButton = el => this.#handlePrevButton(el);
        window.handleReadyButton = el => this.#handleReadyButton(el);
        window.handleChooseFile = el => this.#handleChooseFile(el);

    }

    init() {
        this.generateMethodsFromEndpoints();
        this.log.info('Migroot initialized');
    }

    /*───────────────────────────  API helpers START ────────────────────────*/

    async fetchData(boardId = null) {
        try {
            this.token = await this.getAccessToken();
            this.currentUser = await this.api.currentUser();
            this.log.info('Current user set from API:', this.currentUser);

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
        this.board = await this.api.getBoard({}, {
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

        const boards = await this.api.searchBoard({
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

    /*───────────────────────────  Dashboard START ──────────────────────────*/

    async init_dashboard({ boardId = null, callback = null } = {}) {
      try {
        this.log.info('Step 1: Clearing containers');
        this.#clearContainers();

        this.log.info('Step 2: Fetching user and board');
        await this.fetchData(boardId); // ✅ исправлено имя

        this.log.info('Step 3: Creating tasks');
        this.board.tasks.forEach(item => {
            try {
                this.createCard(item);
            } catch (err) {
                this.log.error('createCard failed for item:', item);
                this.log.error(err.message, err.stack);
                throw err;
            }
        });

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

    smartMerge(target, source) {
        for (const key of Object.keys(source)) {
            const srcVal = source[key];
            if (Array.isArray(srcVal)) {
                // Если массив, то просто заменяем (или можно сделать merge по ID, если нужно)
                target[key] = srcVal;
            } else if (srcVal !== null && typeof srcVal === 'object') {
                if (!target[key] || typeof target[key] !== 'object') {
                    target[key] = {};
                }
                smartMerge(target[key], srcVal);
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
        const { skip_drawer = false } = options;

        this.log.info(`Step 5: Creating card for item: ${item}`);
        // pseudo‑fields for drawer buttons
        // item.upload_button = item.status !== 'READY';
        // item.start_button = item.status === 'TO_DO' || item.status === 'ASAP';
        const card = this.config.template?.cloneNode(true);
        if (card) {
            this.#insertCard(card, item);
        }
        if (!skip_drawer) {
            // drawer logic
            const drawer = this.config.drawer?.cloneNode(true);
            if (drawer) {
                this.#insertDrawer(drawer, item);
            }
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
                deadline          : this.#renderDeadline.bind(this),
                difficulty        : this.#renderDifficulty.bind(this)
            }
        });
        const targetContainer = this.#getStatusContainer(item.status);

        card.id = `doc-${item.clientTaskId}`;
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

    #insertDrawer(drawer, item) {
        // 1) populate generic [data-task] marks (same as in cards)
        this.#setContent(drawer, item, {
            fieldSelector: '[data-task]',
            labelSelector: '.t-mark__label',
            renderers: {
                deadline          : this.#renderDeadline.bind(this),
                difficulty        : this.#renderDifficulty.bind(this)
            }
        });

        // 2) drawer‑specific content via unified renderers
        this.#setContent(drawer, item,
            this.#drawerOpts());

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

    // #renderUploadButton(el, val) {
    //     const snippet = this.config.buttons?.uploadButton;
    //     this.log.info('Render upload button – snippet found:', !!snippet);
    //     if (!snippet) {
    //         el.remove();
    //         return;
    //     }
    //     if (!val) {
    //         el.remove();
    //         return;
    //     }
    //     let node;
    //     if (snippet instanceof HTMLElement) {
    //         node = snippet.cloneNode(true);
    //     } else {
    //         const tmp = document.createElement('div');
    //         tmp.innerHTML = snippet;
    //         node = tmp.firstElementChild.cloneNode(true);
    //     }
    //     const taskId = this.#taskIdFromDrawer(el);
    //     node.id = `upload-${taskId}`;
    //     el.replaceWith(node);
    // }

    // #renderStartButton(el, val) {
    //     const snippet = this.config.buttons?.startButton;
    //     this.log.info('Render start button – snippet found:', !!snippet);
    //     if (!snippet) {
    //         el.remove();
    //         return;
    //     }
    //     if (!val) {
    //         el.remove();
    //         return;
    //     }
    //     let node;
    //     if (snippet instanceof HTMLElement) {
    //         node = snippet.cloneNode(true);
    //     } else {
    //         const tmp = document.createElement('div');
    //         tmp.innerHTML = snippet;
    //         node = tmp.firstElementChild.cloneNode(true);
    //     }
    //     const taskId = this.#taskIdFromDrawer(el);
    //     node.id = `start-${taskId}`;
    //     el.replaceWith(node);
    // }

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
        // this.#setContent(drawer, task,
        //     this.#drawerOpts()
        // );
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
        this.createCard(item, { skip_drawer: true });

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
                this.createCard(this.board.tasks[taskIndex], { skip_drawer: true });
                this.#onTaskEnriched(this.board.tasks[taskIndex]);

            }
        }).catch(err => {
            // rollback on failure
            this.log.error('Failed to update task status:', err);
            // alert('Server error: Could not change status the task. Try again.');
            // restore status and position
            item.status = previousStatus;
            this.createCard(item)
            // let drawerEl = document.getElementById(`drawer-${item.clientTaskId}`);
            // if (drawerEl) drawerEl.style.display = 'flex';
        });
        // TODO if success - update mg.board.tasks by id
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
        formData.append('file', uploadedFile);

        this.api.uploadFile(formData, { taskId }).then(updatedTask => {
            const taskIndex = this.board.tasks.findIndex(t => String(t.clientTaskId) === taskId);
            if (taskIndex !== -1) {
                this.smartMerge(this.board.tasks[taskIndex], updatedTask);
                // Object.assign(this.board.tasks[taskIndex], updatedTask);
                this.board.tasks[taskIndex]._detailsFetched = true;
                this.createCard(this.board.tasks[taskIndex], { skip_drawer: true });
                this.#onTaskEnriched(this.board.tasks[taskIndex]);
            } else {
                this.log.warning(`Task with ID ${taskId} not found in board`);
            }
        }).catch(err => {
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
                this.createCard(this.board.tasks[taskIndex], { skip_drawer: true });
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

    /*───────────────────────────  Utility & Formatting END ─────────────────*/
}
window.Migroot = Migroot;