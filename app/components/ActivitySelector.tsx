"use client";

import { useState, useEffect } from 'react';
import { StravaActivity } from '@/app/lib/strava';

interface ActivitySelectorProps {
  onSelect: (activity: StravaActivity) => void;
  isLoggedIn: boolean;
  imageEditorRef?: { loadImageFromUrl: (url: string) => void } | null;
}

export default function ActivitySelector({ onSelect, isLoggedIn, imageEditorRef }: ActivitySelectorProps) {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState<number | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<StravaActivity | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      const fetchActivities = async () => {
        if (!isLoggedIn) return;

        setIsLoading(true);
        setError(null);

        try {
          const response = await fetch(`/api/strava/activities?page=${page}&perPage=10`);

          if (!response.ok) {
            throw new Error('Failed to fetch activities');
          }

          const data = await response.json();

          if (data.activities.length === 0) {
            setHasMore(false);
          } else {
            setActivities(prevActivities =>
              page === 1 ? data.activities : [...prevActivities, ...data.activities]
            );
          }
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Error fetching activities');
        } finally {
          setIsLoading(false);
        }
      };
      fetchActivities();
    }
  }, [isLoggedIn, page]);

  const handleLoadMore = () => {
    setPage(prevPage => prevPage + 1);
  };

  const handleSelectActivity = async (activity: StravaActivity) => {
    setLoadingActivity(activity.id);
    try {
      const response = await fetch(`/api/strava/activities/${activity.id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch activity details');
      }

      const data = await response.json();
      setSelectedActivity(data.activity);
      onSelect(data.activity);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error fetching activity details');
    } finally {
      setLoadingActivity(null);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="bg-gray-100 p-6 rounded-lg">
        <p className="text-gray-700">Please log in with Strava to view your activities.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Your Strava Activities</h2>

      {error && <div className="text-red-500">{error}</div>}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {activities.length === 0 && !isLoading ? (
          <p className="text-gray-500">No activities found.</p>
        ) : (
          activities.map(activity => (
            <div
              key={activity.id}
              onClick={() => handleSelectActivity(activity)}
              className={`text-black bg-white p-4 rounded-lg shadow cursor-pointer hover:bg-gray-50 transition-colors ${selectedActivity?.id === activity.id ? 'border-2 border-[#FC4C02]' : ''}`}
            >
              <div className="font-medium">{activity.name}</div>
              <div className="text-sm text-gray-500">
                {activity.sport_type || activity.type} • {activity.start_date} • {activity.distance}km
              </div>
              {loadingActivity === activity.id && (
                <div className="flex justify-center mt-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#FC4C02]"></div>
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FC4C02]"></div>
          </div>
        )}
      </div>

      {hasMore && activities.length > 0 && (
        <button
          onClick={handleLoadMore}
          disabled={isLoading}
          className="w-full py-2 text-center text-[#FC4C02] font-medium border border-[#FC4C02] rounded-lg hover:bg-[#FEF0EC] disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Load More Activities'}
        </button>
      )}

      {selectedActivity?.photos?.photos && selectedActivity.photos.photos.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Activity Photos</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {selectedActivity.photos.photos.map((photo) => (
              <div
                key={photo.unique_id}
                className="cursor-pointer p-1 hover:bg-gray-100 rounded-lg"
                onClick={async () => {
                  try {
                    if (imageEditorRef && photo.urls[600]) {
                      // Fetch the image data as blob directly
                      const imageUrl = photo.urls[600];
                      if (!imageUrl) {
                        throw new Error("Image URL is undefined");
                      }

                      const response = await fetch(`/api/proxy/image?url=${encodeURIComponent(imageUrl)}`);
                      if (!response.ok) {
                        throw new Error(`Proxy request failed: ${response.status} ${response.statusText}`);
                      }

                      const blob = await response.blob();

                      // Create object URL from blob
                      const objectUrl = URL.createObjectURL(blob);

                      // Use the exposed method
                      imageEditorRef.loadImageFromUrl(objectUrl);
                    } else if (photo.urls[600]) {
                      // Fallback to opening in new tab
                      window.open(photo.urls[600], '_blank');
                    }
                  } catch (error) {
                    console.error("Error loading image:", error);
                    // Fallback if proxy fails
                    if (photo.urls[600]) {
                      window.open(photo.urls[600], '_blank');
                    }
                  }
                }}
              >
                <img
                  src={`/api/proxy/image?url=${encodeURIComponent(photo.urls[600])}`}
                  alt="Activity photo"
                  className="w-full h-auto rounded-lg"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}