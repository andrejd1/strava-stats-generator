import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Clear all Strava-related cookies
  response.cookies.delete('strava_access_token');
  response.cookies.delete('strava_refresh_token');
  response.cookies.delete('strava_athlete');
  
  return response;
}