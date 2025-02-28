import { NextRequest, NextResponse } from 'next/server';
import { getActivities, refreshToken } from '@/app/lib/strava';

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('strava_access_token')?.value;
  const refreshTokenCookie = request.cookies.get('strava_refresh_token')?.value;
  
  if (!accessToken || !refreshTokenCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '30');
    
    // Try to use the current access token
    try {
      const activities = await getActivities(accessToken, page, perPage);
      return NextResponse.json({ activities });
    } catch (error) {
      console.error('Error fetching activity with access token:', error);
      
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
      const activities = await getActivities(tokenData.access_token, page, perPage);
      return NextResponse.json({ activities });
    }
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}