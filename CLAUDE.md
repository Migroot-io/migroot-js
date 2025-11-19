# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Migroot is a JavaScript-based relocation assistance platform built on Webflow. The application helps users manage their relocation journey through task boards, document management, and progress tracking. The frontend connects to a backend API (Google App Engine) and integrates with third-party services like Outseta (authentication), Intercom (support), and Google Analytics.

## Architecture

### Core Components

**Migroot Class** (`main.js:94-2008`)
- Main application controller managing the entire frontend lifecycle
- Handles API communication, user state, board data, and UI rendering
- Instantiated globally as `window.mg` for template access
- Supports multiple page types: TODO, DOCS, HUB, ADMIN, CREATE_BOARD, MAIN

**Helper Classes** (`mg_helpers.js`)
- `Logger`: Centralized logging with in-memory storage (last 500 entries)
- `AnalyticsHelper`: GA4 event tracking with custom event parameters
- `OnboardingManager`: Tour.js-based onboarding flow with 9 steps

**Entry Points**
- `header.js`: Pre-authentication setup, GA identifier capture, auth redirects
- `footer.js`: Post-load initialization, waits for Outseta and Migroot, then calls `init_mg()`
- `header.html`/`footer.html`: CDN script loading for Outseta, Intercom, Fancybox, GTM

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

1. Define event parameters in `EVENT_PARAMS` (`mg_helpers.js:94-257`)
2. Send via `this.ga.send_event(eventName, extraParams)`
3. Auto-attached to elements with `data-event-action` attribute

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

`smartMerge()` (`main.js:987-1012`) preserves existing arrays if server returns empty arrays, avoiding data loss during partial updates.

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