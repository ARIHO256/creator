# EVzone · MyLiveDealz Creator App

React + TypeScript + Vite + MUI + Tailwind starter for the **Creator** experience in the MyLiveDealz / EVzone ecosystem.

## Tech stack

- **React 18** with TypeScript
- **Vite** (build tool and dev server)
- **MUI 5** (Material UI) for theming
- **Tailwind CSS 3** (with EVzone Green / Orange tokens)
- **State-based navigation** (no React Router - uses component state)

## Getting started

```bash
npm install
npm run dev
```

The app will be available at:

- `http://localhost:5173` → Creator dashboard home (default Vite port)

## Project Structure

```
src/
├── layouts/
│   └── CreatorShellLayout.tsx    # Main layout with state-based page routing
├── pages/creator/                 # 20+ page components
│   ├── CreatorLiveDealzFeedPage.tsx
│   ├── CreatorMyDayDashboardPage.tsx
│   ├── OpportunitiesBoardPage.tsx
│   ├── PromoAdzOverviewPage.tsx
│   ├── PromoAdDetailPage.tsx
│   └── ... (and more)
├── shell/                        # UI shell components
│   ├── Sidebar.tsx              # Desktop navigation
│   ├── FooterNav.tsx            # Mobile navigation
│   ├── TopBar.tsx               # Header with search
│   ├── CommandPalette.tsx       # Cmd+K quick actions
│   └── ... (and more)
├── App.tsx                       # Root component
├── main.tsx                      # Entry point (ReactDOM root)
├── theme.ts                      # MUI theme configuration
└── index.css                     # Tailwind imports
```

## Navigation

The app uses **state-based navigation** (not React Router). Pages are switched via:
- **Sidebar** (desktop) - Left navigation panel
- **FooterNav** (mobile) - Bottom navigation bar
- **CommandPalette** (Cmd+K / Ctrl+K) - Quick page navigation
- **Keyboard shortcuts** (g+h, g+l, g+e, g+p, g+c)

## Available Pages

### Overview
- **LiveDealz Feed** (`home`) - Main dashboard with live dealz feed
- **My Day** (`shell`) - Daily dashboard and tasks

### Onboarding & Profile
- **Creator Onboarding** (`onboarding`) - Onboarding wizard
- **Public Profile** (`profile-public`) - Public creator profile

### Opportunities
- **Opportunities Board** (`opportunities`) - Browse available opportunities
- **Suppliers Directory** (`sellers`) - Directory of suppliers
- **My Suppliers** (`my-sellers`) - Suppliers you follow/work with
- **Invites from Suppliers** (`invites`) - Invitations from suppliers

### Collab Flows
- **Campaigns Board** (`creator-campaigns`) - Manage campaigns
- **Proposals Inbox** (`proposals`) - Incoming proposals
- **Negotiation Room** (`proposal-room`) - Proposal negotiations
- **Contracts** (`contracts`) - Active contracts

### Deliverables
- **Task Board** (`task-board`) - Task management
- **Asset Library** (`asset-library`) - Media assets
- **Content Submission** (`content-submission`) - Submit content for review

### Live Sessionz
- **Live Schedule** (`live-schedule`) - Calendar of live sessionz
- **Live Studio** (`live-studio`) - Go live interface
- **Replays & Clips** (`live-history`) - Past live sessionz

### Shoppable Adz
- **My Shoppable Adz** (`Shoppable-Adz`) - Overview of promo campaigns
- **Promo Ad Detail** (`Shoppable-Adz-detail`) - Detailed promo view

### Money & Insights
- **Earnings Dashboard** (`earnings`) - Earnings overview
- **Analytics & Rank** (`analytics`) - Performance analytics

### Settings
- **Creator Settings** (`settings`) - Account and safety settings
- **Role Switcher** (`roles`) - Switch between Creator/Seller/Buyer roles

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the app in the development mode.\
Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm run build`

Builds the app for production to the `dist` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

### `npm run lint`

Runs the linter to check for code quality issues and errors using ESLint.

### `npm run preview`

Locally preview the production build.\
Run this after `npm run build` to check how the production build looks.

## Features

- **Responsive design** - Works on desktop and mobile
- **Keyboard shortcuts** - Quick navigation with keyboard
- **Command palette** - Cmd+K / Ctrl+K for quick actions
- **Role switching** - Switch between Creator/Seller/Buyer experiences
- **Earnings tracking** - View earnings and projections
- **Campaign management** - Manage collaborations and campaigns
- **Live session management** - Schedule and host live sessionz

## Notes

- This is a **state-based navigation** app (no React Router)
- All pages are accessible via Sidebar, FooterNav, or CommandPalette
- The app uses TypeScript for type safety
- Tailwind CSS with custom EVzone color tokens
- MUI theme provider for consistent styling
