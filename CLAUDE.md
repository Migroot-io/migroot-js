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
- `header.html`/`footer.html`: CDN script loading for Outseta, Intercom, Fancybox, GTM

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

## External Dependencies

- **Outseta**: Auth provider, accessed via `window.Outseta.getAccessToken()`
- **Intercom**: Support chat, triggered via `data-intercom="show"` attribute
- **Fancybox**: Modal system for upgrade prompts
- **Tour.js**: Onboarding library (`window.tourguide`)
- **Google Analytics 4**: Via GTM, events sent to `window.dataLayer`

## Backend Integration

Backend URL switches based on hostname:
- `migroot.webflow.io` → `https://migroot-447015.oa.r.appspot.com/v1` (staging)
- Production → `https://migroot-prod.oa.r.appspot.com/v1`

Debug mode auto-enabled on staging or when `config.debug = true`.

## Feature Flags

Free users are blocked from certain statuses and features via `isFreeUser()` check. Blocked containers are hidden via `hideBlockedContainers()` (`main.js:1024-1049`).

## Testing Considerations

- Local testing requires setting `CONFIG.token` or running with Outseta auth
- Use `CONFIG.skip_dashboard = true` to bypass board initialization on non-app pages
- Access error logs via `window.getErrorLog()` (defined in `initHandlers()`)

## Analytics Implementation Notes

When modifying user flows or adding features that affect board creation/ownership:

1. **Board Creation Flow**: After `createBoard()` succeeds, call `this.ga.setHasBoard(true)` to transition user out of pre-activation state
2. **Board Loading**: After `fetchBoard()` succeeds, call `this.ga.setHasBoard(true)` to ensure consistent state
3. **Initial Load**: In `init_dashboard()`, check `localStorage` for existing `boardId` to set initial `hasBoard` state
4. **Event Type Logic**: Events are automatically typed as `site_interaction` (unauthenticated) or `app_interaction` (authenticated) based on URL path (`/app/` or `/staging/`)
5. **Category Override**: Manual `event_category` in `extraParams` overrides auto-detection, including pre-activation logic