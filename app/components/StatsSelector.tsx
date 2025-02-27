"use client";

import { useState } from 'react';
import { StravaActivity } from '@/app/lib/strava';

interface StatsSelectorProps {
  activity: StravaActivity | null;
  onStatsChange: (selectedStats: string[]) => void;
}

export default function StatsSelector({ activity, onStatsChange }: StatsSelectorProps) {
  // We should sync this with the parent's state
  const [selectedStats, setSelectedStats] = useState<string[]>([
    'name', 'start_date', 'distance', 'moving_time', 'average_pace'
  ]);
  
  if (!activity) {
    return null;
  }
  
  const availableStats = [
    { key: 'name', label: 'Activity Name', default: true },
    { key: 'start_date', label: 'Date & Time', default: true },
    { key: 'distance', label: 'Distance (km)', default: true },
    { key: 'moving_time', label: 'Moving Time (min)', default: true },
    { key: 'elapsed_time', label: 'Elapsed Time (min)', default: false },
    { key: 'average_pace', label: 'Average Pace (min/km)', default: true },
    { key: 'max_pace', label: 'Max Pace (min/km)', default: false },
    { key: 'average_speed', label: 'Average Speed (km/h)', default: false },
    { key: 'max_speed', label: 'Max Speed (km/h)', default: false },
    { key: 'total_elevation_gain', label: 'Elevation Gain (m)', default: false },
    { key: 'type', label: 'Activity Type', default: false },
  ];
  
  // Add optional stats if they exist in the activity
  if (activity.average_heartrate) {
    availableStats.push({ key: 'average_heartrate', label: 'Avg Heart Rate (bpm)', default: false });
  }
  
  if (activity.max_heartrate) {
    availableStats.push({ key: 'max_heartrate', label: 'Max Heart Rate (bpm)', default: false });
  }
  
  if (activity.calories) {
    availableStats.push({ key: 'calories', label: 'Calories', default: false });
  }
  
  if (activity.suffer_score) {
    availableStats.push({ key: 'suffer_score', label: 'Suffer Score', default: false });
  }
  
  const handleStatToggle = (statKey: string) => {
    // First update the local state
    const newSelected = selectedStats.includes(statKey)
      ? selectedStats.filter(key => key !== statKey)
      : [...selectedStats, statKey];
    
    // Update local state
    setSelectedStats(newSelected);
    
    // Use setTimeout to update parent state after render is complete
    setTimeout(() => {
      onStatsChange(newSelected);
    }, 0);
  };
  
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {availableStats.map(stat => (
          <div key={stat.key} className="flex items-center">
            <input
              type="checkbox"
              id={`stat-${stat.key}`}
              checked={selectedStats.includes(stat.key)}
              onChange={() => handleStatToggle(stat.key)}
              className="mr-2 h-4 w-4 text-[#FC4C02] focus:ring-[#FC4C02]"
            />
            <label htmlFor={`stat-${stat.key}`} className="text-sm">
              {stat.label}
            </label>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">Select the stats you want to display</p>
    </div>
  );
}