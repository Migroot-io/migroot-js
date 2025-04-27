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
            info: 'color: blue; font-weight: bold;',
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


// const CONFIG = {
//     user: {
// fullName: 'Denis Mironov',
// firstName: 'Denis',
// plan: 'Free registration',
// email: 'denis.mironov.personal@gmail.com',
// linkId: null
// },
//     template: document.getElementById('doc-template'),
//     buttons: {
//         uploadFile: document.getElementById('upload_file').innerHTML,
//         openTf: document.getElementById('open_tf').innerHTML,
//         openUrl: document.getElementById('open_url').innerHTML,
//         submitUrl: document.getElementById('submit_url').innerHTML
//     },
//     containers: {
//         ready: document.getElementById('ready'),
//         inProgress: document.getElementById('in-progress'),
//         notStarted: document.getElementById('not-started')
//     },
//     webUrl: 'https://script.google.com/macros/s/AKfycbxLRZANt4ayb0x_IRClCEw6cjA5s7b2Iv6v4sjNMmNbL1WMsNTx32eK1q8zw4CHVOJq0Q/exec',
//     emotions: ["normal", "smile", "surprise"],
//     migrootComments: {
//         review: ["Wait for checking", "So-o-o-on please wait", "Okay, let's see!"],
//         start: ["Every document tells a story.", "Efficiency is key in document management.", "Timely action is critical to success."]
//     },
//     timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
// };

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
    // createBoard: { path: 'board', method: 'POST' },
    // createTask: { path: 'task', method: 'POST' },
    // updateTask: { path: 'task/{taskId}', method: 'PUT' },
    // getTask: { path: 'task/{taskId}', method: 'GET' },
    // searchTasks: { path: 'task/search', method: 'POST' },
    // createUser: { path: 'user', method: 'POST' },
    // updateUser: { path: 'user/{userId}', method: 'PUT' },
    // deleteClientTask: { path: 'board/task/{taskId}', method: 'DELETE' }
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

    }

    init() {
        this.generateMethodsFromEndpoints();
        this.log.info('Migroot initialized');
    }

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

    ////////////////////////// old logic ////////////////////////
    async init_dashboard(boadrId = null; callback = null) {
        try {
            this.log.info('Step 1: Clearing containers');
            this.#clearContainers();

            this.log.info('Step 2: Fetching user and board');
            await this.fetchData(boadrId);

            this.log.info('Step 3: Creating tasks');
            this.board.tasks.forEach(item => this.createCard(item));
            this.log.info('Dashboard initialized successfully');
            if (callback && typeof callback === 'function') {
                this.log.info('callback called');
                callback(); // Можно передать сюда аргументы, если нужно
            }
        } catch (error) {
            this.log.error(`Error during init dashboard: ${error.message}`);
        }
    };

    createCard(item) {
        this.log.info(`Step 5: Creating card for item: ${item}`);
        if (!this.#shouldDisplayTask(item)) {
            this.log.info('Task is not eligible for display, skipping');
            return;
        }
        const targetContainer = this.#getStatusContainer(item.Status);
        const newCardId = `doc-${item.id}`;
        const clone = this.config.template.cloneNode(true);

        this.log.info(`Step 6: Setting card content for card ID: ${newCardId}`);
        this.#setCardContent(clone, item);

        this.log.info('Step 7: Handling data attributes');
        this.#handleDataAttributes(clone, item);

        this.log.info('Step 8: Handling comment');
        this.#handleComment(clone, item);

        this.log.info('Step 9: Handling buttons');
        this.#handleButtons(clone, item);

        this.log.info('Step 10: Handling file status');
        this.#handleFileStatus(clone, item);

        this.log.info('Step 11: Replacing existing card if needed');
        this.#replaceExistingCard(newCardId, clone, targetContainer);
    }

    updateCard(data, cardId) {
        fetch(this.post_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(data => this.createCard(data.result.updatedData))
            .catch(error => {
                this.log.error(`Error updating card: ${error.message}`);
                this.#showLoader(cardId, false);
            });
    }

    updateCardUrl(id, url, filetype) {
        const cardId = `doc-${id}`;
        const data = this.#createUpdateData(id, url, filetype, 'Uploaded');
        this.updateCard(data, cardId);
    }

    updateCardComment(id, comment) {
        const cardId = `doc-${id}`;
        const data = this.#createUpdateData(id, null, null, 'In progress', comment);
        this.updateCard(data, cardId);
    }

    createDummyCard() {
        const dummyCard = this.config.template.cloneNode(true);
        dummyCard.id = 'dummy-card';
        dummyCard.querySelector('.ac-doc__title').textContent = 'Dummy Card';
        dummyCard.querySelector('.ac-doc__description').textContent = 'This is a placeholder card for testing purposes.';
        dummyCard.querySelector('.ac-docs__mark.ac-docs__due_date').textContent = this.#formatDate(new Date().toISOString());
        dummyCard.querySelector('.ac-docs__mark.ac-docs__mark_country').textContent = 'Test Location';
        dummyCard.querySelector('.ac-docs__mark.ac-docs__applicicant').textContent = 'Test User';
        dummyCard.setAttribute('data-icon-status', 'test');
        dummyCard.setAttribute('data-original-status', 'Not uploaded');
        dummyCard.setAttribute('data-translate-status', 'Not uploaded');
        const readyContainer = this.#getStatusContainer('Ready');
        readyContainer.insertBefore(dummyCard, readyContainer.firstChild);
    }


    #clearContainers() {
        Object.values(this.config.containers).forEach(container => container.innerHTML = '');
    }

    #configureUserUrls() {
        const baseUrl = this.config.user.linkId ? `${this.config.webUrl}?link=${this.config.user.linkId}&user=` : `${this.config.webUrl}?user=`;
        const username = this.config.user.email;
        this.get_url = `${baseUrl}${username}&action=getData`;
        this.post_url = `${baseUrl}${username}&action=updateData`;
    };


    #shouldDisplayTask(item) {
        if (item.TaskType === 'task-free' && this.config.user.plan !== 'Free registration') return false;
        if (item.TaskType === 'task-paid' && this.config.user.plan === 'Free registration') return false;
        return true;
    }

    #getStatusContainer(status) {
        switch (status) {
            case 'Not started':
                return this.config.containers.notStarted;
            case 'In progress':
                return this.config.containers.inProgress;
            case 'Ready':
                return this.config.containers.ready;
            default:
                this.log.error(`Unknown status: ${status}`);
                return this.config.containers.notStarted;
        }
    }

    #setCardContent(clone, item) {
        clone.querySelector('.ac-doc__title').textContent = item.DocumentTitle;
        clone.querySelector('.ac-doc__description').textContent = item.Description;
        clone.querySelector('.ac-docs__mark.ac-docs__due_date').textContent = this.#formatDate(item.DueDate);
        clone.querySelector('.ac-docs__mark.ac-docs__mark_country').textContent = item.Location;
        clone.querySelector('.ac-docs__mark.ac-docs__applicicant').textContent = item.Applicant === 'You' && this.config.user ? this.config.user.firstName : item.Applicant;
    };

    #handleDataAttributes(clone, item) {
        clone.setAttribute('data-icon-status', item.IconStatus);
        clone.setAttribute('data-original-status', item.OriginalStatus);
        clone.setAttribute('data-translate-status', item.TranslateStatus);
        clone.setAttribute('data-task-type', item.TaskType);
        clone.setAttribute('data-points', item.Points);
        clone.setAttribute('data-applicant-id', item.ApplicantID);
        clone.setAttribute('data-emotion', item.Emotion);
    }

    #handleButtons(clone, item) {
        const uploadContainer = clone.querySelector('.ac-doc__action');
        if (item.ButtonLink) {
            const typeformLink = item.ButtonLink.match(/TF=(.*)/);
            uploadContainer.innerHTML = typeformLink ? this.config.buttons.openTf : this.config.buttons.openUrl;
        } else {
            uploadContainer.innerHTML = this.config.buttons.uploadFile;
        }
    };

    #handleComment(clone, item) {
        if (!item.Comment || item.Comment.trim() === '') {
            clone.getElementsByClassName('ac-comment__text')[0].textContent = getRandom(MigrootStartComments);;
        } else {
            clone.getElementsByClassName('ac-comment__text')[0].textContent = item.Comment;
        }
    };

    #handleFileStatus(clone, item) {
        const filesProgressBlock = clone.querySelector('.ac-doc__progress-bar');
        const originalFileBlock = clone.querySelector('.original-file-block');
        const translateFileBlock = clone.querySelector('.translate-file-block');
        const uploadContainer = clone.querySelector('.ac-doc__action');
        const originalLink = clone.querySelector('.original-link');
        const translateLink = clone.querySelector('.translate-link');
        var button;
        if (item.OriginalStatus != 'Not uploaded') {
            if (originalLink) originalLink.href = item.OriginalLink;
        };

        if (item.TranslateStatus != 'Not uploaded') {
            if (translateLink) translateLink.href = item.TranslateLink;
        };

        if (item.OriginalStatus === 'Verified' && (item.TaskType != 'document' || item.TranslateStatus === 'Verified' || item.TranslateStatus === 'Not needed')) {
            if (uploadContainer) uploadContainer.remove();
        } else if (item.OriginalStatus === 'Verified' && item.TaskType === 'document') {
            // document with needed and not verified translate
            if (uploadContainer) uploadContainer.querySelector('.ac-submit.w-button').setAttribute('data-filetype', 'Translate');
            // IMPORTANT !!!
            if (uploadContainer) uploadContainer.querySelector('.ac-submit.w-button').innerText = "Upload Translated"
            if (uploadContainer && item.TranslateStatus != 'Not loaded') uploadContainer.querySelector('.ac-submit.w-button').innerText = "Reload Translated"
        } else if (item.Status === 'In progress') {
            // any task in ptogress without a translate and have button
            this.log.info(item);
            console.log(item);
            this.log.info(clone);
            console.log(clone);
            button = uploadContainer.querySelector('.ac-submit.w-button');
            this.log.info(button);
            console.log(button);
            if (button) button.innerText = "Reload file"
        };



        if (item.OriginalStatus === 'Not needed') {
            if (filesProgressBlock) filesProgressBlock.remove();
        } else if (item.TranslateStatus === 'Not needed') {
            if (translateFileBlock) translateFileBlock.remove();
        };
    };

    #createUpdateData(id, url, filetype, status, userComment = 'Check my file please') {
        return {
            id,
            [`${filetype}Link`]: url,
            [`${filetype}Status`]: status,
            UserComment: userComment,
            IconStatus: 'off',
            Status: status,
            Emotion: this.#getRandom(this.config.emotions),
            Comment: this.#getRandom(this.config.migrootComments.review)
        };
    }

    #formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            timeZone: this.config.timeZone
        });
    }

    #getRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    #replaceExistingCard(newCardId, clone, targetContainer) {
        const oldCard = document.getElementById(newCardId);
        if (oldCard) oldCard.remove();
        clone.id = newCardId;
        targetContainer.insertBefore(clone, targetContainer.firstChild);
    }

    #showLoader(cardId, show, text = 'Loading') {
        const loader = document.querySelector(`#${cardId} .ac-doc__loader`);
        if (loader) {
            loader.style.display = show ? 'flex' : 'none';
            if (show) loader.querySelector('.ac-doc__loader-text').textContent = text;
        }
    }
    #getUserPlan() {
        return this.config.user ? this.config.user.plan : 'Free registration';
    }
}
// // Создание объекта Migroot с конфигурацией
//const window.mg = new Migroot(CONFIG);

// Пример вызова метода init_dashboard
// window.mg.init_dashboard();
// window.mg.createDummyCard();
window.Migroot = Migroot;
