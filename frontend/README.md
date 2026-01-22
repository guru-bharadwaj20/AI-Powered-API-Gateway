# SafeRoute AI - React Frontend

This is the React version of the SafeRoute AI frontend, converted from plain HTML/CSS/JavaScript with Tailwind CSS for styling.

## Features

- ✅ Fully converted to React with hooks (useState, useEffect, useCallback)
- ✅ Tailwind CSS for styling (replacing original CSS)
- ✅ Custom hooks for state management (useMetrics, useLogs, useNotification)
- ✅ Component-based architecture
- ✅ Chart.js integration for fraud detection patterns
- ✅ Real-time dashboard updates
- ✅ Interactive test panel and demo scenarios
- ✅ Identical functionality to original frontend
- ✅ Responsive design maintained

## Project Structure

```
frontend-react/
├── public/
│   └── index.html           # Main HTML file
├── src/
│   ├── components/          # React components
│   │   ├── Header.js        # Navigation header
│   │   ├── Sidebar.js       # Left sidebar with test panel
│   │   ├── TestPanel.js     # API testing interface
│   │   ├── ScenarioButtons.js # Demo scenarios
│   │   ├── Dashboard.js     # Main dashboard container
│   │   ├── MetricsSection.js # Traffic metrics
│   │   ├── RiskSection.js   # Risk distribution
│   │   ├── ChartsSection.js # Fraud patterns chart
│   │   ├── LogsSection.js   # Live request stream
│   │   ├── AnalysisSection.js # AI insights
│   │   ├── WelcomeModal.js  # Welcome screen
│   │   ├── DetailModal.js   # Request details modal
│   │   ├── NotificationContainer.js # Toast notifications
│   │   └── HelpPanel.js     # Context help
│   ├── hooks/               # Custom React hooks
│   │   ├── useMetrics.js    # Metrics data management
│   │   ├── useLogs.js       # Logs data management
│   │   └── useNotification.js # Notification system
│   ├── App.js               # Main app component
│   ├── index.js             # React entry point
│   └── index.css            # Tailwind CSS imports
├── tailwind.config.js       # Tailwind configuration
├── postcss.config.js        # PostCSS configuration
└── package.json             # Dependencies

```

## Installation

From the root directory:

```bash
# Install backend dependencies
npm install

# Install React frontend dependencies
cd frontend-react
npm install
cd ..
```

## Running the Application

### Option 1: Run backend and React frontend together

```bash
npm run dev:react
```

This will start:
- Payment Service on port 3001
- Account Service on port 3002
- Verification Service on port 3003
- API Gateway on port 3000
- React App on port 3001 (automatically opens in browser)

### Option 2: Run separately

```bash
# Terminal 1: Start backend services
npm start

# Terminal 2: Start React frontend
npm run start:react
```

Then open http://localhost:3001 in your browser.

## Key Differences from Original Frontend

### Technology Stack
- **Original**: Plain HTML, CSS, JavaScript
- **React**: React components, JSX, Tailwind CSS

### Styling Approach
- **Original**: Custom CSS with CSS variables
- **React**: Tailwind CSS utility classes with custom theme

### State Management
- **Original**: Global variables and DOM manipulation
- **React**: React hooks (useState, useEffect) and props

### Code Organization
- **Original**: Single HTML file with inline JavaScript
- **React**: Modular components and custom hooks

## Component Architecture

### Main App Component (App.js)
- Manages global state (modals, settings)
- Coordinates data flow between components
- Handles API interactions

### Custom Hooks

**useMetrics**: Fetches and manages metrics data
- Auto-refresh every 2 seconds (when enabled)
- Resets metrics to initial state

**useLogs**: Fetches and manages request logs
- Filters logs based on pause state
- Auto-refresh support

**useNotification**: Toast notification system
- Auto-dismiss after 5 seconds
- Multiple notification types (success, error, warning, info)

### Key Components

**Header**: Navigation with settings dropdown
**Sidebar**: Test panel and demo scenarios
**Dashboard**: Main content area with metrics, charts, logs
**Modals**: Welcome screen and detail views
**NotificationContainer**: Toast notifications

## Customization

### Tailwind Configuration
Edit `tailwind.config.js` to customize:
- Colors (primary, success, warning, danger)
- Shadows
- Animations
- Breakpoints

### API Endpoint
The API base URL is set to `http://localhost:3000`. To change it, edit the `API_BASE` constant in `src/App.js`.

## Available Scripts

In the `frontend-react` directory:

### `npm start`
Runs the app in development mode on port 3001.

### `npm run build`
Builds the app for production to the `build` folder.

### `npm test`
Launches the test runner.

## Design Consistency

The React version maintains:
- ✅ Exact same UI/UX as original
- ✅ All original functionality
- ✅ Same color scheme and design
- ✅ Identical user interactions
- ✅ Responsive layout

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

When adding new components:
1. Create component file in `src/components/`
2. Use Tailwind classes for styling
3. Extract complex logic into custom hooks
4. Follow existing component patterns

## License

MIT
