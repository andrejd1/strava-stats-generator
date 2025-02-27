import { NextRequest, NextResponse } from 'next/server';
import { exchangeToken } from '@/app/lib/strava';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/?auth=failed', request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?auth=missing', request.url));
  }

  try {
    const tokenData = await exchangeToken(code);
    
    // Create a redirect URL and include the token (in a real app, you'd use cookies or sessions)
    const redirectUrl = new URL('/', request.url);
    
    // Set cookies for tokens (HTTP-only for security)
    const response = NextResponse.redirect(redirectUrl);
    
    // Set secure cookies with the tokens
    // Expires_at is in seconds from epoch
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
      // Set a long expiry for refresh token
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      path: '/',
    });
    
    response.cookies.set({
      name: 'strava_athlete',
      value: JSON.stringify({
        id: tokenData.athlete.id,
        firstname: tokenData.athlete.firstname,
        lastname: tokenData.athlete.lastname,
      }),
      httpOnly: false, // Not http-only so client can read athlete info
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(tokenData.expires_at * 1000),
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Token exchange error:', error);
    return NextResponse.redirect(new URL('/?auth=failed', request.url));
  }
}