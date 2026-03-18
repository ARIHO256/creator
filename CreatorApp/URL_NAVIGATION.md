# Direct URL Navigation Guide

This document lists all available direct URL paths for accessing pages in the MyLiveDealz Creator App. These URLs can be used by external systems (like authentication systems) to redirect users to specific pages.

## Base URL

All URLs use the base path: `http://localhost:5173` (development) or your production domain.

## Available URL Paths

### Overview Pages

| URL Path | Page | Description |
|----------|------|-------------|
| `/` or `/home` | Home / LiveDealz Feed | Main dashboard with live dealz feed |
| `/my-day` | My Day Dashboard | Daily overview and tasks |

### Onboarding & Profile

| URL Path | Page | Description |
|----------|------|-------------|
| `/onboarding` | Creator Onboarding | Multi-step onboarding wizard (for new creators) |
| `/awaiting-approval` | Awaiting Approval | Status page after onboarding submission |
| `/profile` or `/profile-public` | Public Profile | Creator's public profile page |

### Opportunities & Suppliers

| URL Path | Page | Description |
|----------|------|-------------|
| `/opportunities` | Opportunities Board | Browse available campaigns |
| `/sellers` | Suppliers Directory | Discover and search suppliers |
| `/my-sellers` | My Suppliers | View your connected suppliers |
| `/invites` | Invites from Suppliers | Manage supplier invitations |

### Collaboration & Campaigns

| URL Path | Page | Description |
|----------|------|-------------|
| `/campaigns` or `/creator-campaigns` | Campaigns Board | Manage your campaigns pipeline |
| `/proposals` | Proposals Inbox | View and respond to proposals |
| `/proposal-room` | Negotiation Room | Active proposal negotiations |
| `/contracts` | Contracts | View and manage contracts |

### Deliverables

| URL Path | Page | Description |
|----------|------|-------------|
| `/task-board` | Task Board | Manage tasks and deliverables |
| `/asset-library` | Asset Library | Upload and manage assets |
| `/content-submission` | Content Submission | Submit content for review |

### Live Sessionz

| URL Path | Page | Description |
|----------|------|-------------|
| `/live-schedule` | Live Schedule | Calendar view of scheduled sessionz |
| `/live-studio` | Live Studio | Go live and manage live sessionz |
| `/live-history` | Replays & Clips | View past live sessionz and clips |

### Promotions

| URL Path | Page | Description |
|----------|------|-------------|
| `/Shoppable-Adz` | My Shoppable Adz | Overview of all Shoppable Adz campaigns |
| `/shoppable-marketplace` | Shoppable Adz Marketplace | Discover and browse available Shoppable Adz campaigns |
| `/my-active-shoppable-adz` | My Active Shoppable Adz | Dashboard tracking active campaigns with performance metrics |
| `/link-tools` | Link Tools | Toolkit for sharing and managing campaign links |

### Money & Insights

| URL Path | Page | Description |
|----------|------|-------------|
| `/earnings` | Earnings Dashboard | View earnings, payouts, and forecasts |
| `/analytics` | Analytics & Rank | Performance analytics and rankings |

### Settings

| URL Path | Page | Description |
|----------|------|-------------|
| `/settings` | Creator Settings | Account and preference settings |
| `/roles` or `/role-switcher` | Role Switcher | Switch between Creator/Seller/Buyer roles |

## Usage Examples

### External Authentication System Integration

After a user signs up, redirect them to onboarding:

```javascript
// After successful signup
window.location.href = 'http://localhost:5173/onboarding';
```

After onboarding is submitted, redirect to awaiting approval:

```javascript
// After onboarding submission
window.location.href = 'http://localhost:5173/awaiting-approval';
```

After admin approval, redirect to home:

```javascript
// After approval
window.location.href = 'http://localhost:5173/home';
```

### With Query Parameters

You can also pass additional data via query parameters (the pages can read these):

```javascript
// Redirect with user ID and token
window.location.href = 'http://localhost:5173/onboarding?userId=123&token=abc&email=user@example.com';
```

The onboarding page can access these parameters:

```javascript
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('userId');
const token = urlParams.get('token');
const email = urlParams.get('email');
```

## Implementation Notes

1. **Path Matching**: The app automatically detects the URL path on initial load and navigates to the corresponding page.

2. **Case Sensitivity**: URL paths are case-sensitive. Use lowercase paths as shown above.

3. **Default Route**: If an invalid path is provided, the app defaults to the home page (`/home`).

4. **Single Page Application**: This is a SPA (Single Page Application), so all routes are handled client-side. The Vite dev server automatically serves the `index.html` for all routes.

5. **Production Deployment**: 
   - **Yes, it works on hosted sites!** The URL navigation works the same way in production.
   - Configuration files have been included in this project for common hosting platforms.
   - The app code itself doesn't need any changes - it reads `window.location.pathname` which works the same in development and production.

## Hosting Platform Configuration

This project includes configuration files for common hosting platforms. These files ensure that all routes serve `index.html`, allowing the React app to handle client-side routing.

### Included Configuration Files

- **`vercel.json`** - For Vercel deployments (automatically detected)
- **`netlify.toml`** - For Netlify deployments (automatically detected)
- **`.htaccess`** - For Apache/shared hosting (copy to `dist/` folder after build)
- **`public/_redirects`** - For Cloudflare Pages and some other platforms
- **`nginx.conf`** - Reference file for Nginx servers (copy configuration to your server)

### Platform-Specific Notes

**Netlify & Vercel:**
- Configuration files are automatically detected
- Just deploy and it works!

**Apache / Shared Hosting:**
- Copy `.htaccess` to your `dist/` folder after building
- Upload the entire `dist/` folder to your server

**Nginx:**
- Copy the `location /` block from `nginx.conf` to your server configuration
- Restart Nginx after updating config

**Cloudflare Pages:**
- The `public/_redirects` file will be automatically used
- Deploy and it works!

**Other Platforms:**
- Check your platform's documentation for SPA/SPA fallback configuration
- Most modern platforms handle this automatically

## Quick Reference

```
/                    → Home
/onboarding          → Onboarding
/awaiting-approval   → Awaiting Approval
/profile             → Public Profile
/my-day              → My Day Dashboard
/opportunities       → Opportunities Board
/sellers             → Suppliers Directory
/my-sellers          → My Suppliers
/invites             → Invites from Suppliers
/campaigns           → Campaigns Board
/proposals           → Proposals Inbox
/proposal-room       → Negotiation Room
/contracts           → Contracts
/task-board          → Task Board
/asset-library       → Asset Library
/content-submission  → Content Submission
/Shoppable-Adz           → My Shoppable Adz Overview
/shoppable-marketplace   → Shoppable Adz Marketplace
/my-active-shoppable-adz → My Active Shoppable Adz
/link-tools              → Link Tools
/live-schedule       → Live Schedule
/live-studio         → Live Studio
/live-history        → Replays & Clips
/earnings            → Earnings Dashboard
/analytics           → Analytics & Rank
/settings            → Creator Settings
/roles               → Role Switcher
```

## Testing

To test URL navigation:

1. Start the development server: `npm run dev`
2. Open your browser and navigate to any of the URLs above
3. The corresponding page should load automatically

Example:
- Navigate to: `http://localhost:5173/onboarding`
- The onboarding page should appear immediately

