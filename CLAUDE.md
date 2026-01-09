# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Migroot is a JavaScript-based relocation assistance platform built on Webflow. The application helps users manage their relocation journey through task boards, document management, and progress tracking. The frontend connects to a backend API (Google App Engine) and integrates with third-party services like Outseta (authentication), Intercom (support), and Google Analytics.

## Architecture

### Core Components

**Migroot Class** (`main.js`)
- Main application controller managing the entire frontend lifecycle
- Handles API communication, user state, board data, and UI rendering
- Instantiated globally as `window.mg` for template access
- Supports multiple page types: TODO, DOCS, HUB, ADMIN, CREATE_BOARD, MAIN

**Helper Classes** (`mg_helpers.js`)
- `Logger`: Centralized logging with in-memory storage (last 500 entries)
- `AnalyticsHelper`: GA4 event tracking with custom event parameters and user journey stages
- `OnboardingManager`: Tour.js-based onboarding flow with 9 steps

**Entry Points**
- `header.js`: Pre-authentication setup, GA identifier capture, auth redirects
- `footer.js`: Post-load initialization, waits for Outseta and Migroot, then calls `init_mg()`
- `webflow/header.html`/`footer.html`: CDN script loading for Outseta, Intercom, Fancybox, GTM, OpenWidget

**Webflow Components** (`webflow/components/`)
- `CONFIG.html`: Global configuration object with backend URLs, DOM references, and container mappings
- `hub_config.html`: Country-specific visa requirements and useful links (HUB_CONFIG)
- `card_todo.html`, `card_docs.html`, `card_admin.html`: Task card templates for different page types
- `card_drawer.html`: Task detail drawer template with comments/files sections
- `drawer_helper.html`: Helper functions for drawer interactions
- `eligibility_check.html`: Visa eligibility checking logic
- `pricing_autofill.html`: Dynamic pricing display based on subscription plans
- `preloader.html`: Loading state management during initialization

These are reference copies (synced January 9, 2026) showing what's deployed on Webflow. To update components on Webflow, copy content and paste into Webflow's custom code sections.

### Application Lifecycle (`main.js:init_dashboard()`)

The application has distinct initialization paths based on user authentication status:

**Unauthenticated Users** (`!this.currentUser`):
- Physically cannot access `/app/*` routes (redirected by `footer.js`)
- Only interact with public marketing pages (/, /login, /sign-up)
- Events tracked as `site_interaction` with `init_site` event
- Dashboard initialization is skipped

**Authenticated Users** (`this.currentUser` exists):
- Access granted to `/app/*` routes
- Events tracked as `app_interaction` with `init_app` event
- Analytics configured with buddy mode, subscription plan, and board ownership status
- Dashboard initialized based on page type (TODO, DOCS, HUB, etc.)

### State Management

Board data is loaded from the backend and cached in:
- `this.board`: Current board object with tasks array
- `this.cards`: Transformed task objects for rendering (includes computed `status` and `card_type`)
- `localStorage`: Board metadata (country, boardId, progress metrics, email)
- `this.currentUser`: Authenticated user from Outseta
- `this.boardUser`: Board owner (may differ from currentUser in buddy/admin mode)

### Status Flow

Tasks follow a state machine defined by `STATUS_FLOW` (`main.js:42-48`):
- NOT_STARTED → ASAP → IN_PROGRESS → REQUIRES_CHANGES → READY

Free users bypass blocked statuses (`ASAP`, `REQUIRES_CHANGES`) via `STATUS_FLOW_NO_SUBSCRIPTION` (`main.js:52-58`). Status changes trigger API updates and optimistic UI updates.

### API Layer

Dynamic API methods are auto-generated from `ENDPOINTS` object (`main.js:3-39`):
- `this.api.<endpointName>(body, pathParams)` → calls `this.request()`
- Authorization via Bearer token from Outseta (`this.token`)
- Supports FormData for file uploads

## Development Workflows

### Adding New API Endpoints

1. Add endpoint config to `ENDPOINTS` object in `main.js`
2. API method auto-generated via `generateMethodsFromEndpoints()` (`main.js:392-399`)
3. Call using `this.api.<endpointName>(body, pathParams)`

### Adding Analytics Events

Analytics events follow a user journey funnel structure with automatic categorization:

**Event Categories** (defined in `EVENT_PARAMS` in `mg_helpers.js`):
- `initialization`: Site/app loading (`init_site`, `init_app`)
- `acquisition`: Marketing funnel events (`click_signup`, `click_blog`, `click_prices`)
- `pre_activation`: Post-registration, pre-board creation (`click_start_initial_quiz`, `click_create_board_finish`)
- `activation`: User engaging with their board (`click_task_details`, `click_task_file_send`)
- `navigation`: Internal navigation (`click_app`, `click_todo`, `click_docs`)
- `engagement`: Support interactions (`click_support`)
- `conversion`: Monetization events (`click_buy_plans`, `click_upgrade`)
- `administration`: Buddy/supervisor actions (`click_task_approve_file`)

**Pre-Activation Auto-Detection**:
- `AnalyticsHelper` tracks if user has a board via `setHasBoard()`
- For `app_interaction` events, if `!hasBoard`, category is automatically set to `pre_activation`
- This captures the critical post-signup, pre-board-creation journey phase

**Adding New Events**:
1. Define event parameters in `EVENT_PARAMS` object (`mg_helpers.js`)
2. Send via `this.ga.send_event(eventName, extraParams)`
3. Auto-attach to DOM elements using `data-event-action` attribute
4. Update `hasBoard` status in `init_dashboard()`, `fetchBoard()`, and `createBoard()` to maintain accurate pre-activation tracking

### Modifying Task Rendering

Tasks are rendered through a template cloning system:
- Templates: `this.config.template` (TODO), `this.config.docTemplate` (DOCS), `this.config.adminCardTemplate` (ADMIN)
- Data binding via `data-card` attributes matched to task object keys
- Custom renderers defined in `#drawerOpts()` (`main.js:1339-1349`)
- Update drawer content via `#updateDrawerContent()` which re-renders comments, files, and dynamic fields

### Working with User Roles

Three user contexts affect behavior:
- **Regular User**: `isFreeUser()` checks subscription plan, hides blocked statuses
- **Buddy User**: `isBuddyUser()` checks user type (BUDDY/SUPERVISOR/ADMIN), shows admin controls
- **Board Owner vs Current User**: `this.boardUser` (board owner) vs `this.currentUser` (logged-in user) - critical distinction for admin/buddy flows

## Important Patterns

### Optimistic Updates

Status changes, file approvals, and comments use optimistic rendering:
1. Update local state immediately
2. Re-render UI via `createCard()` or `#updateDrawerContent()`
3. Call API in background
4. Revert on error or merge server response via `smartMerge()`

### Task Enrichment

Cards initially render with minimal data. Full task details (comments, files) are lazy-loaded on first drawer open via `getClientTask` API, then cached with `_detailsFetched` flag (`main.js:1278-1304`).

### Container Observation

Task counts in column headers are auto-updated via `MutationObserver` on each status container (`main.js:1859-1884`).

### Smart Merging

`smartMerge()` preserves existing arrays if server returns empty arrays, avoiding data loss during partial updates.

### Analytics State Management

The `AnalyticsHelper` maintains critical user journey state:
- `hasBoard`: Tracks if user has created a board (impacts `pre_activation` category)
- `isBuddyUser`: Determines if user is buddy/supervisor/admin
- `senderPlan`: User's subscription level (Free/Paid)
- `sender`: Derived from buddy status ('buddy' or 'user')

These states are set during `init_dashboard()` and updated on major lifecycle events (board creation, board loading).

### Analytics Data Flow

**Event Pipeline:**
```
Code (send_event) → window.dataLayer → GTM → GA4 → BigQuery → Looker Studio
```

**Implementation Layers:**
1. **Frontend (this codebase)**: Events sent via `this.ga.send_event()` to `window.dataLayer`
2. **Google Tag Manager**: Processes events, applies tags/triggers, forwards to GA4
3. **Google Analytics 4**: Collects events, user properties, session data
4. **BigQuery**: Automatic daily export of raw GA4 event data
5. **Looker Studio**: Dashboard visualizations built on BigQuery datasets (draft dashboards available)

**Key Event Parameters:**
- `event`: `app_interaction` (authenticated) or `site_interaction` (public)
- `event_action`: Specific action name
- `event_category`: User journey stage (initialization, acquisition, pre_activation, activation, navigation, engagement, conversion, administration)
- `event_sender`: `buddy` or `user`
- `event_sender_plan`: Subscription level
- Custom parameters: Task IDs, file types, country selections, etc.

**BigQuery Access:** Contact data team for dataset access and schema documentation. Events available ~24 hours after occurrence.

## External Dependencies

- **Outseta**: Auth provider, accessed via `window.Outseta.getAccessToken()`
- **OpenWidget**: Support chat widget
- **Fancybox**: Modal system for upgrade prompts
- **Tour.js**: Onboarding library (`window.tourguide`)
- **Google Analytics 4**: Via GTM, events sent to `window.dataLayer`

## Deployment & Versioning

**CDN Deployment:**
- JavaScript files are served via jsDelivr CDN: `https://cdn.jsdelivr.net/gh/Migroot-io/migroot-js@{COMMIT_HASH}/{filename}.js`
- Version controlled by git commit hash defined in `webflow/header.html` as `MIGROOT_MAIN_HASH`
- Current production hash: `ba43a0f304a8f08bf96dba4d80ba7c64a4293339`

**Deployment Process:**
1. Commit and push changes to GitHub
2. Copy commit hash from `git log -1 --format="%H"`
3. Update `MIGROOT_MAIN_HASH` in `webflow/header.html` on Webflow
4. Test on staging (`migroot.webflow.io`) first
5. Update production hash if tests pass

**Rollback:** Simply revert `MIGROOT_MAIN_HASH` to previous working commit hash in Webflow.

## Environment Configuration

The application uses **three independent mechanisms** for environment management:

### 1. Backend Environment (hostname)
Backend API URL selection is based **only on hostname**:
- `migroot.webflow.io` → staging backend (`https://migroot-447015.oa.r.appspot.com/v1`)
- Other domains → production backend (`https://migroot-prod.oa.r.appspot.com/v1`)

Configured in `main.js:102`:
```javascript
this.backend_url = host === 'migroot.webflow.io'
  ? 'https://migroot-447015.oa.r.appspot.com/v1'
  : 'https://migroot-prod.oa.r.appspot.com/v1';
```

**Note**: Duplicate logic exists in `CONFIG.html:4-6` but is **not used** (main.js overrides). Line `main.js:101` is commented out (previously took `config.backend_url`). The CONFIG.html duplicate can be removed.

**Outseta instance** also follows hostname (configured in `webflow/header.html`).

### 2. Frontend Version (pathname)
Frontend JavaScript version (commit hash) selection is based **only on pathname**:
- Path starts with `/staging/` → staging frontend hash
- Path starts with `/app/` → production frontend hash

Configured in `webflow/header.html:3-7`:
```javascript
const IS_STAGING = pathname.startsWith('/staging/');
const MIGROOT_MAIN_HASH = IS_STAGING ? 'staging_hash' : 'production_hash';
```

This allows independent frontend/backend testing combinations.

### 3. Debug Mode (hostname OR pathname)
Debug logging is enabled if **either** hostname is staging **or** pathname includes `/staging/`:

Configured in `main.js:100`:
```javascript
this.config.debug = path.includes('/staging/') || host === 'migroot.webflow.io' || this.config.debug;
```

### Analytics Event Types
Event type (`app_interaction` vs `site_interaction`) is **not** environment-related—it indicates user context:
- `/app/*` or `/staging/*` → `app_interaction` (authenticated area)
- Other paths → `site_interaction` (public marketing)

Configured in `mg_helpers.js:333-335`.

## Feature Flags

Free users are blocked from certain statuses and features via `isFreeUser()` check. Blocked containers are hidden via `hideBlockedContainers()` (`main.js:1024-1049`).

## Testing Considerations

**Local Testing:**
- Set `CONFIG.token` manually or use Outseta auth
- Set `CONFIG.skip_dashboard = true` to bypass board initialization on non-app pages
- Enable debug logs: `CONFIG.debug = true`
- Access error logs: `window.getErrorLog()` in browser console

**Testing on Staging:**
- **Full staging**: `https://migroot.webflow.io/staging/todo`
  - Backend: Staging (hostname)
  - Frontend: Staging (pathname)
  - Debug: Enabled (both hostname and pathname)
  - Outseta: Staging (hostname)
- **Staging backend + production frontend**: `https://migroot.webflow.io/app/todo`
  - Backend: Staging (hostname)
  - Frontend: Production (pathname)
  - Debug: Enabled (hostname)
  - Outseta: Staging (hostname)

**Deployment Testing:**
1. Test changes locally using Webflow preview or browser DevTools overrides
2. Commit and push to GitHub
3. Update hash to staging (`MIGROOT_MAIN_HASH` in Webflow)
4. Test all affected functionality on staging
5. Check browser console for errors and analytics events
6. Update production hash only after staging validation

## Analytics Implementation Notes

When modifying user flows or adding features that affect board creation/ownership:

1. **Board Creation Flow**: After `createBoard()` succeeds, call `this.ga.setHasBoard(true)` to transition user out of pre-activation state
2. **Board Loading**: After `fetchBoard()` succeeds, call `this.ga.setHasBoard(true)` to ensure consistent state
3. **Initial Load**: In `init_dashboard()`, check `localStorage` for existing `boardId` to set initial `hasBoard` state
4. **Event Type Logic**: Events are automatically typed as `site_interaction` (unauthenticated) or `app_interaction` (authenticated) based on URL path (`/app/` or `/staging/`)
5. **Category Override**: Manual `event_category` in `extraParams` overrides auto-detection, including pre-activation logic