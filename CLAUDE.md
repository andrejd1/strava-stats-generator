# Strava Stats Generator Developer Guide

## Commands
- `npm run dev` - Start dev server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Code Style Guidelines
- **TypeScript**: Use strict types, interfaces for props/state
- **Components**: Use functional components with React hooks
- **Imports**: Group by external, internal, then types
- **Naming**: PascalCase for components, camelCase for functions/variables
- **Error Handling**: Use try/catch with specific error messages
- **State Management**: Prefer useState/useRef for local state
- **CSS**: Use Tailwind utility classes
- **Path Imports**: Use `@/*` for absolute imports from root
- **File Structure**: 
  - `/app`: Next.js App Router pages and layouts
  - `/components`: Reusable UI components
  - `/lib`: Utility functions and API clients

## Formatting
- Avoid unnecessary comments
- Use async/await over promise chains
- Follow Next.js best practices for data fetching