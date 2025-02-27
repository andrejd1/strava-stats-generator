# Strava Stats Overlay Creator

A web app that lets you create customized images with Strava activity statistics overlays. Connect your Strava account, select an activity, upload your own image, and customize the overlay to create beautiful activity images to share.

## Features

- Strava authentication with OAuth
- Browse and select your Strava activities
- Upload your own images
- Customizable stats overlay:
  - Choose which stats to display
  - Customize position, colors, and opacity
  - Drag-and-drop positioning
  - Multiple aspect ratio options (16:9, 4:3, 1:1, original)
- Download the final image

## Setup

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Strava API access (create an app at https://www.strava.com/settings/api)

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Strava API Credentials
STRAVA_ID=your_strava_id
CLIENT_SECRET=your_client_secret
ACCESS_TOKEN=your_access_token

# Public variables (accessible from browser)
NEXT_PUBLIC_STRAVA_ID=your_strava_id
```

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
# or
yarn
# or
pnpm install
```

3. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the app.

## Usage

1. Connect your Strava account by clicking the "Connect with Strava" button
2. Browse and select an activity from your recent Strava activities
3. Upload an image to use as the background
4. Customize the stats overlay:
   - Select which stats to display
   - Choose position and aspect ratio
   - Adjust background opacity and text color
   - Drag the stats box to your preferred position
5. Download the final image with the "Download Image" button

## Technologies Used

- Next.js 15+ with App Router
- React 19+
- TypeScript
- Strava API
- Tailwind CSS
- Canvas API for image manipulation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
