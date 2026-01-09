# Migroot Frontend

Migroot is a JavaScript-based relocation assistance platform built on Webflow. The application helps users manage their relocation journey through task boards, document management, and progress tracking.

## Technology Stack

- **Frontend Framework**: Vanilla JavaScript (ES6+) with Webflow as CMS/hosting
- **Authentication**: Outseta
- **Analytics**: Google Tag Manager → GA4 → BigQuery → Looker Studio
- **Support**: OpenWidget
- **UI Libraries**: Fancybox (modals), Tour.js (onboarding)
- **Backend**: Google App Engine (Python)
- **CDN**: jsDelivr (GitHub-based)

## Architecture Overview

### Core Components

#### 1. **main.js** - Main Application Controller
The `Migroot` class is the core application controller managing:
- API communication via auto-generated methods from `ENDPOINTS` configuration
- User authentication state (`currentUser`, `boardUser`, `token`)
- Board data management (`board`, `cards`)
- UI rendering through template cloning system
- Page type handling (TODO, DOCS, HUB, ADMIN, CREATE_BOARD, MAIN)

Key features:
- Dynamic API method generation: `this.api.<endpointName>(body, pathParams)`
- Status flow management with free/paid user distinction
- Optimistic UI updates for better UX
- Global instance exposed as `window.mg`

#### 2. **mg_helpers.js** - Helper Classes

**Logger**
- Centralized logging with styled console output
- In-memory log storage (last 500 entries)
- Debug/info/warning/error levels
- Accessible via `window.getErrorLog()` for support

**AnalyticsHelper**
- GA4 event tracking via `window.dataLayer`
- Automatic event categorization by user journey stage
- Pre-activation detection (post-signup, pre-board)
- User context tracking (buddy mode, subscription plan, board ownership)
- Auto-attach events to DOM via `data-event-action` attributes

**OnboardingManager**
- Tour.js-based 9-step onboarding flow
- Context-aware step visibility
- Integration with task drawer interactions

**EligibilityChecker**
- Multi-country digital nomad visa eligibility logic
- Work type, income, and family composition validation
- Results ranking and reasoning

**AutoFillHelper**
- Email auto-fill for sign-up forms
- Promo code auto-fill for subscription plans
- localStorage-based state management

#### 3. **header.js** - Pre-Authentication Setup
- Google Analytics identifier capture (ClientId, SessionId)
- UTM parameters tracking and persistence
- Promo code capture from URL (`?ref=` parameter)
- First-touch attribution data storage

#### 4. **footer.js** - Application Initialization
- Waits for Outseta and Migroot to load
- Authentication state detection and redirects
- Initializes dashboard for authenticated users on `/app/*` and `/staging/*` routes
- Preloader management (start/finish/error states)

### Webflow Integration

**CDN Script Loading** (`webflow/header.html` and `footer.html`)

Scripts are loaded from jsDelivr CDN with git hash versioning:
```javascript
const MIGROOT_MAIN_HASH = 'ba43a0f304a8f08bf96dba4d80ba7c64a4293339';
```

Loaded in this order:
1. **header.html**: header.js, Outseta, mg_helpers.js, GTM, Fancybox, Tour.js
2. **footer.html**: main.js, footer.js, OpenWidget

**Components Directory** (`webflow/components/`)

These HTML files are copied into Webflow's custom code sections for specific pages:

- **CONFIG.html**: Global configuration object with backend URLs, DOM element references, container mappings
- **hub_config.html**: Country-specific visa requirements and useful links (Spain, Portugal, etc.)
- **card_todo.html**, **card_docs.html**, **card_admin.html**: Task card templates for different page types
- **card_drawer.html**: Task detail drawer template with comments/files sections
- **drawer_helper.html**: Helper functions for drawer interactions
- **eligibility_check.html**: Visa eligibility checking UI logic
- **pricing_autofill.html**: Dynamic pricing display based on subscription plans
- **preloader.html**: Loading state management during initialization

> **Note**: Components in this directory were last synced on **January 9, 2026** and represent the current production state. These are reference copies showing what's deployed on Webflow.

### Deployment & Versioning

**Deployment Flow:**
1. Make changes to JS files (`main.js`, `mg_helpers.js`, `header.js`, `footer.js`)
2. Test locally by copying to Webflow custom code or using browser DevTools overrides
3. Commit changes to GitHub: `git commit -m "description"`
4. Push to GitHub: `git push`
5. Copy the commit hash (e.g., `ba43a0f304a8f08bf96dba4d80ba7c64a4293339`)
6. Update `MIGROOT_MAIN_HASH` in `webflow/header.html` on Webflow
7. Test on staging environment (`migroot.webflow.io`)
8. If all tests pass, update production hash

**CDN URL Pattern:**
```
https://cdn.jsdelivr.net/gh/Migroot-io/migroot-js@{COMMIT_HASH}/{filename}.js
```

**Benefits of this approach:**
- Immutable deployments (each commit hash is permanent)
- Instant rollback by changing hash
- CDN caching and performance
- Version control tied to git history

### Environment Management

The application uses **three independent mechanisms** for environment configuration:

#### 1. Backend Environment (hostname only)

Backend API URL is selected based on **hostname only** in `main.js:102`:

```javascript
// In main.js constructor
const host = window.location.hostname;
this.backend_url = host === 'migroot.webflow.io'
  ? 'https://migroot-447015.oa.r.appspot.com/v1'      // Staging backend
  : 'https://migroot-prod.oa.r.appspot.com/v1';        // Production backend
```

**Note**: The same logic exists in `CONFIG.html:4-6` (`backend_url` property), but it's **not used** because `main.js` overrides it. The commented line `main.js:101` shows the original implementation that took `config.backend_url`. The duplicate in CONFIG can be removed.

**Outseta instance** also depends on hostname (configured in `webflow/header.html`):
- `migroot.webflow.io` → `migrootio-staging.outseta.com`
- Other domains → `migrootio.outseta.com`

#### 2. Frontend Version (pathname only)

Frontend JavaScript version (commit hash) is selected based on **pathname only**:

```javascript
// In webflow/header.html
const pathname = window.location.pathname;
const IS_STAGING = pathname.startsWith('/staging/');
const MIGROOT_MAIN_HASH = IS_STAGING
  ? 'ba43a0f304a8f08bf96dba4d80ba7c64a4293339' // staging frontend hash
  : 'ba43a0f304a8f08bf96dba4d80ba7c64a4293339'; // production frontend hash
```

This allows testing different frontend versions independently:
- `/staging/todo` → staging frontend
- `/app/todo` → production frontend

#### 3. Debug Mode (hostname OR pathname)

Debug logging is enabled if **either** condition is true:

```javascript
// In main.js constructor
const host = window.location.hostname;
const path = window.location.pathname;
this.config.debug = path.includes('/staging/') || host === 'migroot.webflow.io' || this.config.debug;
```

**Note on Analytics Event Types:**

Event type classification (`app_interaction` vs `site_interaction`) is **not** about environment separation—it's about user context for analytics:

```javascript
// In mg_helpers.js send_event()
const defaultEvent = (window.location.pathname.includes('/app/') || window.location.pathname.includes('/staging/'))
  ? 'app_interaction'    // Authenticated user area (any dashboard page)
  : 'site_interaction';  // Public marketing pages
```

**Environment Combinations:**

These mechanisms are independent, allowing combinations like:

| Hostname | Path | Backend | Frontend Hash | Debug | Use Case |
|----------|------|---------|---------------|-------|----------|
| `migroot.webflow.io` | `/staging/todo` | Staging | Staging | ✅ | Full staging |
| `migroot.webflow.io` | `/app/todo` | Staging | Production | ✅ | Test prod frontend with staging backend |
| `production.com` | `/staging/todo` | Production | Staging | ✅ | Test staging frontend with prod backend |
| `production.com` | `/app/todo` | Production | Production | ❌ | Full production |

### Analytics Architecture

**Event Flow:**

```
Code (send_event)
  ↓
window.dataLayer (GTM)
  ↓
Google Tag Manager (event processing, tags, triggers)
  ↓
Google Analytics 4 (event collection, user properties)
  ↓
BigQuery (automatic export, raw event data)
  ↓
Looker Studio (dashboards, visualizations)
```

**Event Structure:**

Every event sent includes:
- `event`: `app_interaction` or `site_interaction`
- `event_action`: Specific action name (e.g., `click_task_details`)
- `event_category`: User journey stage (initialization, acquisition, pre_activation, activation, navigation, engagement, conversion, administration)
- `event_label`: Human-readable description
- `event_sender`: `buddy` or `user`
- `event_sender_plan`: Subscription level (Free/Paid)
- Custom parameters (optional)

**Event Categories:**

- **initialization**: Site/app loading (`init_site`, `init_app`)
- **acquisition**: Marketing funnel events (signup, blog, prices)
- **pre_activation**: Post-registration, pre-board creation (critical conversion funnel stage)
- **activation**: User engaging with board (tasks, files, comments)
- **navigation**: Internal navigation (page switches)
- **engagement**: Support interactions
- **conversion**: Monetization events (upgrade, buy)
- **administration**: Buddy/supervisor actions (file approvals)

**Pre-Activation Auto-Detection:**

The system automatically categorizes events as `pre_activation` when:
1. User is authenticated (`app_interaction`)
2. User has not created a board yet (`!hasBoard`)
3. Event category would normally be `activation` or `(not_set)`

This captures the critical post-signup, pre-board-creation journey phase for funnel analysis.

## How-To Guides

### 1. Adding Backend Endpoints

**Step 1: Define endpoint in `ENDPOINTS` object** (`main.js`)

```javascript
const ENDPOINTS = {
    // ... existing endpoints ...

    myNewEndpoint: {
        path: 'resource/{resourceId}/action',  // Use {paramName} for path parameters
        method: 'POST'                          // GET, POST, PUT, DELETE
    }
};
```

**Step 2: Use the auto-generated API method**

The `generateMethodsFromEndpoints()` method automatically creates `this.api.<endpointName>()`:

```javascript
// In any Migroot class method:
async someMethod() {
    try {
        const result = await this.api.myNewEndpoint(
            { bodyParam: 'value', anotherParam: 123 },  // Request body
            { resourceId: '123' }                        // Path parameters
        );
        console.log('Result:', result);
    } catch (error) {
        this.log.error('API call failed:', error);
    }
}
```

**Notes:**
- Path parameters are replaced in the URL: `resource/{resourceId}` → `resource/123`
- Authorization header is automatically added from `this.token`
- FormData is supported (for file uploads)
- Errors are logged via Logger

### 2. Environment & Testing

#### Local Development

**Option A: Test in Webflow Preview**
1. Copy your modified JS into Webflow custom code (Page Settings → Custom Code)
2. Use Webflow's preview mode
3. Open browser DevTools to see logs

**Option B: Browser DevTools Overrides**
1. Open Chrome DevTools → Sources → Overrides
2. Enable local overrides
3. Override the jsDelivr script URLs with your local files
4. Refresh page

**Debug Configuration:**
```javascript
// Enable debug logs
CONFIG.debug = true;

// Skip dashboard initialization (for non-app pages)
CONFIG.skip_dashboard = true;

// Access error logs
window.getErrorLog();  // Returns formatted error log text
```

#### Testing with Different Environments

**Staging:**
- URL: `https://migroot.webflow.io/staging/todo` (or any `/staging/*` path)
- Debug logs: Automatically enabled
- Backend: Staging API
- Outseta: Staging instance

**Production:**
- URL: Your custom domain
- Debug logs: Disabled (unless `CONFIG.debug = true`)
- Backend: Production API
- Outseta: Production instance

#### Deployment Process

1. **Make changes** to JS files
   ```bash
   # Edit main.js, mg_helpers.js, etc.
   ```

2. **Test locally** (see options above)

3. **Commit and push**
   ```bash
   git add main.js mg_helpers.js
   git commit -m "Add new feature X"
   git push
   ```

4. **Get commit hash**
   ```bash
   git log -1 --format="%H"
   # Output: ba43a0f304a8f08bf96dba4d80ba7c64a4293339
   ```

5. **Update hash in Webflow**
   - Go to `webflow/header.html` on Webflow
   - Update `MIGROOT_MAIN_HASH` constant:
     ```javascript
     const MIGROOT_MAIN_HASH = 'ba43a0f304a8f08bf96dba4d80ba7c64a4293339';
     ```
   - Can have different hashes for staging vs production

6. **Test on staging**
   - Visit `migroot.webflow.io`
   - Verify functionality
   - Check browser console for errors

7. **Deploy to production**
   - Update production hash in Webflow
   - Monitor error logs
   - Check analytics events

#### Rollback Procedure

If something breaks:
1. Find the previous working commit hash: `git log --oneline`
2. Update `MIGROOT_MAIN_HASH` back to that hash in Webflow
3. Publish changes
4. Fix the issue locally and redeploy

### 3. Adding Analytics Events

#### Option A: Define in Code (Programmatic Events)

**Step 1: Add event parameters** in `EVENT_PARAMS` object (`mg_helpers.js`)

```javascript
const EVENT_PARAMS = {
    // ... existing events ...

    my_new_event: {
        event_category: 'activation',           // Choose appropriate category
        event_label: 'User performed action X', // Human-readable description
        // Optional: custom parameters
        custom_param_1: 'default_value'
    }
};
```

**Available Categories:**
- `initialization` - Site/app loading
- `acquisition` - Marketing funnel (signup, blog, prices)
- `pre_activation` - Post-signup, pre-board creation
- `activation` - User engaging with board
- `navigation` - Internal navigation
- `engagement` - Support interactions
- `conversion` - Monetization (upgrade, buy)
- `administration` - Buddy/supervisor actions

**Step 2: Send event from code**

```javascript
// In any method with access to this.ga (Migroot instance):
this.ga.send_event('my_new_event', {
    // Optional: override or add parameters
    custom_param_1: 'custom_value',
    task_id: this.currentTask.id,
    board_id: this.boardId
});
```

**Example - Track task completion:**

```javascript
// In mg_helpers.js EVENT_PARAMS:
task_completed: {
    event_category: 'activation',
    event_label: 'Task marked as complete'
},

// In main.js when task status changes to READY:
if (newStatus === 'READY') {
    this.ga.send_event('task_completed', {
        task_id: taskId,
        task_title: task.title,
        time_to_complete_hours: Math.round((Date.now() - task.startedAt) / 3600000)
    });
}
```

#### Option B: Auto-Attach to DOM (Click Events)

**For click events, add `data-event-action` attribute in Webflow:**

```html
<!-- In Webflow, add custom attribute: -->
<button data-event-action="click_my_button">
    Click me
</button>

<!-- Events are auto-sent on click via #attachEventButtons() -->
```

The event name must exist in `EVENT_PARAMS` for the label/category to be included.

**Example - Track link clicks:**

```html
<!-- Blog link -->
<a href="/blog" data-event-action="click_blog">
    Read our blog
</a>

<!-- Upgrade button -->
<button data-event-action="click_upgrade" data-fancybox data-src="#upgrade-modal">
    Upgrade to Pro
</button>
```

**Additional event data from element:**

You can add custom `data-*` attributes that will be included in the event:

```html
<button
    data-event-action="click_hub_useful_link"
    data-link-title="Embassy Contact"
    data-country="Spain">
    Contact Spanish Embassy
</button>
```

Then in the event handler, extract and send:
```javascript
const linkTitle = element.dataset.linkTitle;
const country = element.dataset.country;
this.ga.send_event('click_hub_useful_link', {
    link_title: linkTitle,
    country: country
});
```

#### Pre-Activation Event Tracking

**Important**: When adding events that could occur before board creation:

1. **Update hasBoard state** in these methods:
   - `init_dashboard()` - Check localStorage for existing boardId
   - `fetchBoard()` - After successful board load: `this.ga.setHasBoard(true)`
   - `createBoard()` - After successful board creation: `this.ga.setHasBoard(true)`

2. **The system will automatically**:
   - Set `event_category: 'pre_activation'` for activation events when `!hasBoard`
   - Preserve other categories (initialization, conversion, navigation, etc.)
   - Type events as `app_interaction` vs `site_interaction` based on URL path

**Example - Post-signup quiz:**

```javascript
// In EVENT_PARAMS:
click_start_initial_quiz: {
    event_category: 'pre_activation',  // Explicitly set
    event_label: 'Go to generate journey quiz'
},

// When user clicks "Start Quiz" after signup:
this.ga.send_event('click_start_initial_quiz');

// Event will have:
// - event: 'app_interaction' (because user is logged in)
// - event_category: 'pre_activation' (explicitly set or auto-detected)
// - event_sender_plan: 'Free' (from user's subscription)
// - Additional context from AnalyticsHelper state
```

#### Testing Analytics Events

**In Development:**
1. Enable debug mode: `CONFIG.debug = true`
2. Events will have `debug_mode: true` parameter
3. Watch browser console for `[Analytics]` logs
4. Check `window.dataLayer` array in console

**In GA4:**
1. Use DebugView (for events with `debug_mode: true`)
2. Check Realtime reports (within 30 seconds)
3. Verify event parameters in event details

**In BigQuery:**
1. Events appear within 24 hours (daily export)
2. Query: `SELECT * FROM analytics_<property_id>.events_<date> WHERE event_name = 'app_interaction'`
3. Check `event_params` for custom parameters

### 4. Development with Claude Code

#### Using CLAUDE.md

The `CLAUDE.md` file contains architecture documentation specifically for Claude Code AI assistant.

**What's in CLAUDE.md:**
- High-level architecture overview
- Core components and their responsibilities
- Application lifecycle and state management
- Development workflows (adding endpoints, analytics, modifying UI)
- Important patterns (optimistic updates, task enrichment, smart merging)
- External dependencies and integration points

**When to update CLAUDE.md:**
- After significant architectural changes
- When adding new major features or components
- When changing development workflows
- When deprecating old patterns

**Working with Claude Code:**

1. **Claude reads CLAUDE.md on /init** to understand the codebase
2. **Use natural language commands**:
   - "Add endpoint for fetching user preferences"
   - "Add analytics event for bookmark creation"
   - "Refactor task status flow to support custom statuses"
3. **Claude follows established patterns**:
   - Auto-generated API methods
   - Event parameter structure
   - Optimistic UI updates
4. **For complex changes**, Claude can update CLAUDE.md to reflect new patterns

#### Key Development Patterns

**Optimistic Updates:**
```javascript
// 1. Update local state immediately
this.cards = this.cards.map(card =>
    card.id === taskId ? {...card, status: newStatus} : card
);

// 2. Re-render UI
this.createCard(updatedCard);

// 3. Call API in background
this.api.updateClientTask({ status: newStatus }, { taskId })
    .catch(error => {
        // 4. Revert on error
        this.log.error('Update failed:', error);
        this.#revertCardStatus(taskId, oldStatus);
    });
```

**Task Enrichment (Lazy Loading):**
```javascript
// Cards render with minimal data initially
// Full details (comments, files) loaded on first drawer open
async openDrawer(taskId) {
    const task = this.cards.find(c => c.id === taskId);

    if (!task._detailsFetched) {
        const fullTask = await this.api.getClientTask({}, { taskId });
        Object.assign(task, fullTask);
        task._detailsFetched = true;
    }

    this.#updateDrawerContent(task);
}
```

**Smart Merging (Preserve Data):**
```javascript
// Preserve existing arrays if server returns empty arrays
function smartMerge(local, server) {
    const merged = {...local, ...server};

    // If server returns empty array, keep local array
    if (Array.isArray(local.comments) && local.comments.length > 0) {
        if (!server.comments || server.comments.length === 0) {
            merged.comments = local.comments;
        }
    }

    return merged;
}
```

**Auto-Generated API Methods:**
```javascript
// DON'T write manual fetch calls:
async getBoard() {
    const response = await fetch(`${this.backend_url}/board/${boardId}`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return response.json();
}

// DO use auto-generated API methods:
const board = await this.api.getBoard({}, { boardId });
```

## Key Files Reference

### JavaScript Files

| File | Purpose | Key Classes/Functions |
|------|---------|----------------------|
| `main.js` | Main application controller | `Migroot` class, `ENDPOINTS`, `STATUS_FLOW`, `init_dashboard()` |
| `mg_helpers.js` | Helper utilities | `Logger`, `AnalyticsHelper`, `OnboardingManager`, `EligibilityChecker`, `AutoFillHelper`, `EVENT_PARAMS` |
| `header.js` | Pre-auth setup | `captureGAIdentifiers()` |
| `footer.js` | Initialization | `waitForMigroot()`, `waitForOutseta()`, `initDashboard()`, `redirectNotAuth()`, `redirectAuth()` |
| `debug.js` | Debug utilities (gitignored) | Local development helpers |

### Webflow Files

| File | Purpose | Usage |
|------|---------|-------|
| `webflow/header.html` | CDN script loading | Embedded in Webflow site `<head>` on all pages |
| `webflow/footer.html` | Post-load initialization | Embedded before `</body>` on all pages |
| `webflow/components/CONFIG.html` | Global configuration | Embedded on dashboard pages (TODO, DOCS, HUB, ADMIN) |
| `webflow/components/hub_config.html` | Country data | Embedded on HUB page |
| `webflow/components/card_*.html` | Task card templates | Embedded on respective pages |
| `webflow/components/eligibility_check.html` | Eligibility UI logic | Embedded on quiz/check pages |
| `webflow/components/pricing_autofill.html` | Pricing auto-fill | Embedded on pricing/subscription pages |
| `webflow/components/preloader.html` | Loading states | Embedded on dashboard pages |

### Documentation Files

| File | Purpose | Audience |
|------|---------|----------|
| `README.md` | Project overview, architecture, how-tos | Developers |
| `CLAUDE.md` | Architecture documentation for AI assistant | Claude Code |
| `.gitignore` | Git ignore rules | Git |

## Additional Resources

- **Backend API**: Contact backend team for API documentation
- **Webflow Project**: Access via Webflow account
- **Google Tag Manager**: [GTM Container ID: GTM-NV4KXL5V]
- **Google Analytics 4**: Contact analytics team for property access
- **BigQuery**: Contact data team for dataset access
- **Looker Studio**: Dashboard drafts available (contact analytics team)
- **Outseta**: Auth/subscription management console

## Support

For questions or issues:
1. Check error logs: `window.getErrorLog()` in browser console
2. Enable debug mode: `CONFIG.debug = true`
3. Review Logger output in browser console
4. Check GTM preview mode for event tracking issues
5. Contact support team with error logs

---

**Last Updated**: January 9, 2026
**Current Version Hash**: `ba43a0f304a8f08bf96dba4d80ba7c64a4293339`
