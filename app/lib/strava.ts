// Helper function for pace formatting
function formatPace(speedInMetersPerSecond: number): string {
  if (!speedInMetersPerSecond || speedInMetersPerSecond === 0) return "-";

  // Convert m/s to minutes per kilometer
  const paceInMinPerKm = 1000 / (speedInMetersPerSecond * 60);

  // Extract minutes and seconds
  const minutes = Math.floor(paceInMinPerKm);
  const seconds = Math.round((paceInMinPerKm - minutes) * 60);

  // Format as MM:SS
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  average_speed: number;
  max_speed: number;
  average_pace: string;
  max_pace: string;
  average_heartrate?: number;
  max_heartrate?: number;
  suffer_score?: number;
  calories?: number;
}

export interface StravaTokenResponse {
  token_type: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete: {
    id: number;
    firstname: string;
    lastname: string;
    profile: string;
  };
}

export async function getStravaAuthUrl(origin?: string) {
  const clientId = process.env.NEXT_PUBLIC_STRAVA_ID;
  if (!clientId) {
    throw new Error('Missing Strava client ID');
  }

  // Redirect URI should be your callback URL
  const redirectUri = `${origin || ''}/api/auth/callback`;
  const scope = 'read,activity:read';

  return `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
}

export async function exchangeToken(code: string): Promise<StravaTokenResponse> {
  const clientId = process.env.STRAVA_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Strava credentials');
  }

  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange token');
  }

  return response.json();
}

export async function refreshToken(refreshToken: string): Promise<StravaTokenResponse> {
  const clientId = process.env.STRAVA_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Strava credentials');
  }

  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  return response.json();
}

export async function getActivities(accessToken: string, page = 1, perPage = 30): Promise<StravaActivity[]> {
  const response = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch activities');
  }

  const activities = await response.json();
  return activities.map((activity: {
    id: number;
    name: string;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    total_elevation_gain: number;
    type: string;
    sport_type: string;
    start_date: string;
    average_speed: number;
    max_speed: number;
    average_heartrate?: number;
    max_heartrate?: number;
    suffer_score?: number;
    calories?: number;
  }) => ({
    id: activity.id,
    name: activity.name,
    distance: Math.round((activity.distance / 1000) * 100) / 100, // Convert to km
    moving_time: Math.round(activity.moving_time / 60), // Convert to minutes
    elapsed_time: Math.round(activity.elapsed_time / 60),
    total_elevation_gain: Math.round(activity.total_elevation_gain),
    type: activity.type,
    sport_type: activity.sport_type,
    start_date: new Date(activity.start_date).toLocaleString(),
    start_date_local: activity.start_date,
    average_speed: Math.round(activity.average_speed * 3.6 * 100) / 100, // Convert to km/h
    max_speed: Math.round(activity.max_speed * 3.6 * 100) / 100,
    average_pace: formatPace(activity.average_speed),
    max_pace: formatPace(activity.max_speed),
    average_heartrate: activity.average_heartrate,
    max_heartrate: activity.max_heartrate,
    suffer_score: activity.suffer_score,
    calories: activity.calories,
  }));
}

export async function getActivity(accessToken: string, activityId: number): Promise<StravaActivity> {
  const response = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch activity');
  }

  const activity = await response.json();
  return {
    id: activity.id,
    name: activity.name,
    distance: Math.round((activity.distance / 1000) * 100) / 100, // Convert to km
    moving_time: Math.round(activity.moving_time / 60), // Convert to minutes
    elapsed_time: Math.round(activity.elapsed_time / 60),
    total_elevation_gain: Math.round(activity.total_elevation_gain),
    type: activity.type,
    sport_type: activity.sport_type,
    start_date: new Date(activity.start_date).toLocaleString(),
    start_date_local: activity.start_date,
    average_speed: Math.round(activity.average_speed * 3.6 * 100) / 100, // Convert to km/h
    max_speed: Math.round(activity.max_speed * 3.6 * 100) / 100,
    average_pace: formatPace(activity.average_speed),
    max_pace: formatPace(activity.max_speed),
    average_heartrate: activity.average_heartrate,
    max_heartrate: activity.max_heartrate,
    suffer_score: activity.suffer_score,
    calories: activity.calories,
  };
}