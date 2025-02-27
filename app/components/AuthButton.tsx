"use client";

import { useState, useEffect } from 'react';
import { getStravaAuthUrl } from '@/app/lib/strava';

interface AuthButtonProps {
  onLogin: () => void;
  onLogout: () => void;
}

export default function AuthButton({ onLogin, onLogout }: AuthButtonProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [athlete, setAthlete] = useState<{
    firstname?: string;
    lastname?: string;
  } | null>(null);
  const [authUrl, setAuthUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check if the user is logged in via cookies
    const athleteCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('strava_athlete='));
    
    if (athleteCookie) {
      try {
        const athleteData = JSON.parse(decodeURIComponent(athleteCookie.split('=')[1]));
        setAthlete(athleteData);
        setIsLoggedIn(true);
        onLogin();
      } catch (error) {
        console.error('Error parsing athlete cookie:', error);
      }
    }
    
    // Get the Strava auth URL
    const fetchAuthUrl = async () => {
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const url = await getStravaAuthUrl(origin);
        setAuthUrl(url);
      } catch (error) {
        console.error('Error getting auth URL:', error);
        // If there's an error getting the auth URL, use a hardcoded URL format with environment variable
        const clientId = process.env.NEXT_PUBLIC_STRAVA_ID;
        if (clientId && typeof window !== 'undefined') {
          const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/callback`);
          setAuthUrl(`https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=read,activity:read`);
        }
      }
    };
    
    fetchAuthUrl();
  }, [onLogin]);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        setIsLoggedIn(false);
        setAthlete(null);
        onLogout();
      }
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-4">
      {isLoggedIn ? (
        <>
          <div className="text-sm">
            Welcome, {athlete?.firstname} {athlete?.lastname}
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50"
          >
            {isLoading ? 'Logging out...' : 'Logout'}
          </button>
        </>
      ) : (
        <a
          href={authUrl}
          className="bg-[#FC4C02] text-white px-4 py-2 rounded-lg hover:bg-[#D44002] inline-flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0 5 13.828h4.172l2.086-4.1" />
          </svg>
          Connect with Strava
        </a>
      )}
    </div>
  );
}