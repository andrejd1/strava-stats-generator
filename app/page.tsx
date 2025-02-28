"use client";

import { useState } from "react";
import AuthButton from "@/app/components/AuthButton";
import ActivitySelector from "@/app/components/ActivitySelector";
import ImageEditor from "@/app/components/ImageEditor";
import { StravaActivity } from "@/app/lib/strava";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<StravaActivity | null>(null);
  const [imageEditorRef, setImageEditorRef] = useState<{ loadImageFromUrl: (url: string) => void } | null>(null);
  
  const handleLogin = () => {
    setIsLoggedIn(true);
  };
  
  const handleLogout = () => {
    setIsLoggedIn(false);
    setSelectedActivity(null);
  };
  
  const handleActivitySelect = (activity: StravaActivity) => {
    setSelectedActivity(activity);
  };
  
  const handleImageEditorRef = (ref: { loadImageFromUrl: (url: string) => void }) => {
    setImageEditorRef(ref);
  };
  
  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Strava Stats Overlay Creator</h1>
          <AuthButton onLogin={handleLogin} onLogout={handleLogout} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <ActivitySelector 
              onSelect={handleActivitySelect}
              isLoggedIn={isLoggedIn}
              imageEditorRef={imageEditorRef}
            />
          </div>
          
          <div className="md:col-span-2">
            <ImageEditor activity={selectedActivity} onImageEditorRef={handleImageEditorRef} />
          </div>
        </div>
        
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            This app creates customized Strava activity images with your stats overlay.
            Connect your Strava account, select an activity, and upload an image to get started.
          </p>
        </div>
      </div>
    </main>
  );
}
