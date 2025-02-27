import { NextRequest, NextResponse } from 'next/server';
import { getActivity, refreshToken } from '@/app/lib/strava';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const activityId = parseInt(params.id);
  
  if (isNaN(activityId)) {
    return NextResponse.json({ error: 'Invalid activity ID' }, { status: 400 });
  }
  
  const accessToken = request.cookies.get('strava_access_token')?.value;
  const refreshTokenCookie = request.cookies.get('strava_refresh_token')?.value;
  
  if (!accessToken || !refreshTokenCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Try to use the current access token
    try {
      const activity = await getActivity(accessToken, activityId);
      return NextResponse.json({ activity });
    } catch (error) {
      // If the token is expired, try to refresh it
      const tokenData = await refreshToken(refreshTokenCookie);
      
      // Update cookies with new tokens
      const response = NextResponse.json({});
      
      response.cookies.set({
        name: 'strava_access_token',
        value: tokenData.access_token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: new Date(tokenData.expires_at * 1000),
        path: '/',
      });
      
      response.cookies.set({
        name: 'strava_refresh_token',
        value: tokenData.refresh_token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        path: '/',
      });
      
      // Try again with the new access token
      const activity = await getActivity(tokenData.access_token, activityId);
      return NextResponse.json({ activity });
    }
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}