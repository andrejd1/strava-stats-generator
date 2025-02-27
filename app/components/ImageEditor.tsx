"use client";

import { useState, useRef, useEffect } from 'react';
import { StravaActivity } from '@/app/lib/strava';
import StatsSelector from './StatsSelector';

interface ImageEditorProps {
  activity: StravaActivity | null;
}

type AspectRatio = '16:9' | '4:3' | '1:1' | 'original';
type Position = 'top-center' | 'top-left' | 'top-right' | 'bottom-center' | 'bottom-left' | 'bottom-right' | 'center';

interface StatsPosition {
  x: number;
  y: number;
  width: number;
  isDragging: boolean;
  borderRadius: number;
  dragOffsetX: number;
  dragOffsetY: number;
}

export default function ImageEditor({ activity }: ImageEditorProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('original');
  const [statsPosition, setStatsPosition] = useState<StatsPosition>({
    x: 20,
    y: 20,
    width: 800, // Default width, will be calculated dynamically
    isDragging: false,
    borderRadius: 50, // Default border radius (0 = no rounding)
    dragOffsetX: 0,
    dragOffsetY: 0
  });
  const [position, setPosition] = useState<Position>('top-left');
  const [backgroundColor, setBackgroundColor] = useState('rgba(0, 0, 0, 0.5)');
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontSizePercent, setFontSizePercent] = useState(3); // 5% of image height as default
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStats, setSelectedStats] = useState<string[]>([
    'name', 'start_date', 'distance', 'moving_time', 'average_pace'
  ]);
  
  const handleStatsChange = (stats: string[]) => {
    // Use the functional form to ensure we're working with the latest state
    setSelectedStats(() => stats);
    
    // Force a re-render of the canvas with the new stats
    if (canvasRef.current && activity) {
      setTimeout(() => renderCanvas(), 0);
    }
  };
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  useEffect(() => {
    // Only run in the browser
    if (typeof window === 'undefined') return;
    
    if (selectedImage && activity) {
      // Use requestAnimationFrame to ensure we're in a clean browser animation frame
      requestAnimationFrame(() => {
        renderCanvas();
      });
    }
  }, [selectedImage, activity, aspectRatio, statsPosition, backgroundColor, textColor, fontSizePercent, position]);
  
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        setError("Error processing image");
        return;
      }
      
      setSelectedImage(result);
      setError(null);
      
      // Create a new image for dimensions
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        renderCanvas();
      };
      img.src = result;
    };
    reader.onerror = () => {
      setError("Error reading file");
    };
    reader.readAsDataURL(file);
  };
  
  const handleAspectRatioChange = (ratio: AspectRatio) => {
    setAspectRatio(ratio);
  };
  
  const handlePositionChange = (newPosition: Position) => {
    setPosition(newPosition);
    
    if (!canvasRef.current || !imageRef.current) return;
    
    const canvas = canvasRef.current;
    const padding = 100; // Keep padding consistent
    
    // Calculate fontSize based on canvas height
    const fontSize = Math.round(canvas.height * (fontSizePercent / 100));
    
    // Calculate the minimum height for stats display
    const lineHeight = fontSize + 10;
    const headerHeight = fontSize + 14;
    const numStats = selectedStats.length;
    const minHeight = padding * 2 + headerHeight + (numStats * lineHeight);
    
    // Get the current width
    const statsWidth = statsPosition.width;
    
    // Set position based on the selection
    switch (newPosition) {
      case 'top-center':
        setStatsPosition(prev => ({ ...prev, x: (canvas.width - statsWidth) / 2, y: padding }));
        break;
      case 'top-left':
        setStatsPosition(prev => ({ ...prev, x: padding, y: padding }));
        break;
      case 'top-right':
        setStatsPosition(prev => ({ ...prev, x: canvas.width - statsWidth - padding, y: padding }));
        break;
      case 'center':
        setStatsPosition(prev => ({ ...prev, x: (canvas.width - statsWidth) / 2, y: (canvas.height - minHeight) / 2 }));
        break;
      case 'bottom-left':
        setStatsPosition(prev => ({ ...prev, x: padding, y: canvas.height - minHeight - padding }));
        break;
        case 'bottom-right':
        setStatsPosition(prev => ({ ...prev, x: canvas.width - statsWidth - padding, y: canvas.height - minHeight - padding }));
        break;
      case 'bottom-center':
        setStatsPosition(prev => ({ ...prev, x: (canvas.width - statsWidth) / 2, y: canvas.height - minHeight - padding / 2 }));
        break;
      }
  };
  
  const renderCanvas = () => {
    // Only render in browser context
    if (typeof window === 'undefined') return;
    
    if (!selectedImage || !activity || !canvasRef.current || !imageRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas 2D context');
      return;
    }
    
    const img = imageRef.current;
    
    // Calculate dimensions based on aspect ratio
    let width = img.width;
    let height = img.height;
    
    if (aspectRatio !== 'original') {
      const parts = aspectRatio.split(':');
      const w = Number(parts[0]) || 1;
      const h = Number(parts[1]) || 1;
      const targetRatio = w / h;
      const currentRatio = width / height;
      
      if (currentRatio > targetRatio) {
        // Image is wider than target, crop width
        width = height * targetRatio;
      } else {
        // Image is taller than target, crop height
        height = width / targetRatio;
      }
    }
    
    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;
    
    // Draw image with proper centering for aspect ratio crop
    const sourceX = (img.width - width) / 2;
    const sourceY = (img.height - height) / 2;
    
    ctx.drawImage(
      img,
      sourceX, sourceY, width, height,
      0, 0, width, height
    );
    
    // Calculate fontSize based on canvas height
    const fontSize = Math.round(canvas.height * (fontSizePercent / 100));
    
    // Calculate overlay height based on number of stats
    const lineHeight = fontSize + 10;
    const padding = 30; // Increased padding for more space
    const headerHeight = fontSize + 14;
    const overlayHeight = padding * 2 + headerHeight + (selectedStats.length * lineHeight);
    
    // Calculate the width needed for stats based on the text
    let maxTextWidth = 0;
    
    // Calculate width for activity name if included
    if (selectedStats.includes('name')) {
      ctx.font = `bold ${fontSize + 4}px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;
      const titleWidth = ctx.measureText(activity.name).width + (padding * 2);
      maxTextWidth = Math.max(maxTextWidth, titleWidth);
    }
    
    // Calculate width for other stats
    ctx.font = `${fontSize}px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;
    
    // Determine labels and values for each stat
    const getStatLabel = (key: string): string => {
      switch(key) {
        case 'start_date': return 'Date & Time';
        case 'distance': return 'Distance';
        case 'moving_time': return 'Time';
        case 'elapsed_time': return 'Total Time';
        case 'average_speed': return 'Avg Speed';
        case 'max_speed': return 'Max Speed';
        case 'average_pace': return 'Avg Pace';
        case 'max_pace': return 'Max Pace';
        case 'total_elevation_gain': return 'Elevation';
        case 'average_heartrate': return 'Avg HR';
        case 'max_heartrate': return 'Max HR';
        case 'suffer_score': return 'Suffer Score';
        case 'calories': return 'Calories';
        case 'type': return 'Activity';
        default: return key;
      }
    };
    
    const getStatValue = (key: string): string => {
      if (!activity) return '';
      
      switch(key) {
        case 'start_date': return activity.start_date;
        case 'distance': return `${activity.distance}km`;
        case 'moving_time': return `${activity.moving_time}min`;
        case 'elapsed_time': return `${activity.elapsed_time}min`;
        case 'average_speed': return `${activity.average_speed}km/h`;
        case 'max_speed': return `${activity.max_speed}km/h`;
        case 'average_pace': return activity.average_pace;
        case 'max_pace': return activity.max_pace;
        case 'total_elevation_gain': return `${activity.total_elevation_gain}m`;
        case 'average_heartrate': return activity.average_heartrate ? `${Math.round(activity.average_heartrate)}bpm` : '';
        case 'max_heartrate': return activity.max_heartrate ? `${Math.round(activity.max_heartrate)}bpm` : '';
        case 'suffer_score': return activity.suffer_score ? `${activity.suffer_score}` : '';
        case 'calories': return activity.calories ? `${activity.calories}` : '';
        case 'type': return activity.type;
        default: return '';
      }
    };
    
    // Measure width of each stat text
    selectedStats.filter(stat => stat !== 'name').forEach(stat => {
      const label = getStatLabel(stat);
      const value = getStatValue(stat);
      const statText = `${label}: ${value}`;
      const textWidth = ctx.measureText(statText).width + (padding * 2);
      maxTextWidth = Math.max(maxTextWidth, textWidth);
    });
    
    // Add some extra padding
    maxTextWidth += 20;
    
    // Update stats position width
    if (Math.abs(maxTextWidth - statsPosition.width) > 50) {
      setStatsPosition(prev => ({ ...prev, width: maxTextWidth }));
    }
    
    // Draw stats overlay with optional rounded corners
    ctx.fillStyle = backgroundColor;
    
    if (statsPosition.borderRadius > 0) {
      // Draw rounded rectangle
      const radius = Math.min(
        statsPosition.borderRadius,
        statsPosition.width / 2,
        overlayHeight / 2
      );
      
      ctx.beginPath();
      ctx.moveTo(statsPosition.x + radius, statsPosition.y);
      ctx.lineTo(statsPosition.x + statsPosition.width - radius, statsPosition.y);
      ctx.quadraticCurveTo(statsPosition.x + statsPosition.width, statsPosition.y, statsPosition.x + statsPosition.width, statsPosition.y + radius);
      ctx.lineTo(statsPosition.x + statsPosition.width, statsPosition.y + overlayHeight - radius);
      ctx.quadraticCurveTo(statsPosition.x + statsPosition.width, statsPosition.y + overlayHeight, statsPosition.x + statsPosition.width - radius, statsPosition.y + overlayHeight);
      ctx.lineTo(statsPosition.x + radius, statsPosition.y + overlayHeight);
      ctx.quadraticCurveTo(statsPosition.x, statsPosition.y + overlayHeight, statsPosition.x, statsPosition.y + overlayHeight - radius);
      ctx.lineTo(statsPosition.x, statsPosition.y + radius);
      ctx.quadraticCurveTo(statsPosition.x, statsPosition.y, statsPosition.x + radius, statsPosition.y);
      ctx.closePath();
      ctx.fill();
    } else {
      // Draw regular rectangle
      ctx.fillRect(statsPosition.x, statsPosition.y, statsPosition.width, overlayHeight);
    }
    
    // Add stats text
    ctx.fillStyle = textColor;
    let yPos = statsPosition.y + padding + fontSize + 4;
    
    // Only show title if name is in selected stats
    if (selectedStats.includes('name')) {
      ctx.textAlign = 'left';
      ctx.font = `bold ${fontSize + 4}px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;
      ctx.fillText(activity.name, statsPosition.x + padding, yPos);
      
      // Add Strava-like orange underline for title
      ctx.strokeStyle = '#FC4C02'; // Strava orange
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(statsPosition.x + padding, yPos + 8);
      ctx.lineTo(statsPosition.x + statsPosition.width - padding, yPos + 8);
      ctx.stroke();
      
      yPos += lineHeight + 15; // More space after title
    }
    
    // Create a table-like layout for stats
    const labelWidth = 150; // Width reserved for the label column
    
    // Skip 'name' as it's handled separately
    selectedStats.filter(stat => stat !== 'name').forEach(stat => {
      const label = getStatLabel(stat);
      const value = getStatValue(stat);
      
      // Draw label (left-aligned)
      ctx.textAlign = 'left';
      ctx.font = `${fontSize}px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;
      ctx.fillText(label, statsPosition.x + padding, yPos);
      
      // Draw value (right-aligned)
      ctx.textAlign = 'right';
      ctx.font = `bold ${fontSize}px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;
      ctx.fillText(value, statsPosition.x + statsPosition.width - padding, yPos);
      
      // Draw subtle separator line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(statsPosition.x + padding, yPos + 10);
      ctx.lineTo(statsPosition.x + statsPosition.width - padding, yPos + 10);
      ctx.stroke();
      
      yPos += lineHeight;
    });
    
    // Reset text alignment for future text
    ctx.textAlign = 'left';
  };
  
  const startDragging = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate fontSize based on canvas height
    const fontSize = Math.round(canvas.height * (fontSizePercent / 100));
    
    // Calculate the minimum height for stats display
    const lineHeight = fontSize + 10;
    const padding = 30; // Keep padding consistent
    const headerHeight = fontSize + 14;
    const numStats = selectedStats.length;
    const minHeight = padding * 2 + headerHeight + (numStats * lineHeight);
    
    // Check if click is within the stats box
    if (
      x >= statsPosition.x && 
      x <= statsPosition.x + statsPosition.width && 
      y >= statsPosition.y && 
      y <= statsPosition.y + minHeight
    ) {
      // Calculate the offset between mouse position and box's top-left corner
      const offsetX = x - statsPosition.x;
      const offsetY = y - statsPosition.y;
      
      setStatsPosition(prev => ({ 
        ...prev, 
        isDragging: true,
        dragOffsetX: offsetX,
        dragOffsetY: offsetY
      }));
    }
  };
  
  const stopDragging = () => {
    // Only update if actually dragging to avoid unnecessary renders
    if (statsPosition.isDragging) {
      setStatsPosition({
        ...statsPosition,
        isDragging: false
      });
    }
  };
  
  const dragStats = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!statsPosition.isDragging || !canvasRef.current) return;
    
    e.preventDefault(); // Prevent any browser handling
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate fontSize based on canvas height
    const fontSize = Math.round(canvas.height * (fontSizePercent / 100));
    
    // Calculate the minimum height for stats display
    const lineHeight = fontSize + 10;
    const padding = 30; // Keep padding consistent
    const headerHeight = fontSize + 14;
    const numStats = selectedStats.length;
    const minHeight = padding * 2 + headerHeight + (numStats * lineHeight);
    
    // Ensure stats box stays within canvas boundaries
    const maxX = Math.max(0, canvas.width - statsPosition.width);
    const maxY = Math.max(0, canvas.height - minHeight);
    
    // Account for the initial click offset within the box
    const newX = Math.max(0, Math.min(maxX, x - statsPosition.dragOffsetX));
    const newY = Math.max(0, Math.min(maxY, y - statsPosition.dragOffsetY));
    
    // Use direct state update to avoid re-renders
    setStatsPosition({
      ...statsPosition,
      x: newX,
      y: newY
    });
  };
  
  const downloadImage = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `strava-overlay-${activity?.name}-${new Date().getTime()}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };
  
  return (
    <div className="space-y-6" suppressHydrationWarning>
      <div className="flex flex-col md:flex-row md:space-x-6 space-y-6 md:space-y-0">
        {/* Left side: Canvas and Image Upload */}
        <div className="w-full md:w-2/3 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Upload Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-violet-50 file:text-violet-700
              hover:file:bg-violet-100"
            />
            {error && <div className="text-red-500 text-sm">{error}</div>}
          </div>
          
          <div className="border border-gray-300 rounded-lg relative">
            <canvas
              ref={canvasRef}
              onMouseDown={startDragging}
              onMouseUp={stopDragging}
              onMouseLeave={stopDragging}
              onMouseMove={dragStats}
              style={{ cursor: statsPosition.isDragging ? 'grabbing' : 'grab' }}
              className="max-w-full rounded-lg"
              suppressHydrationWarning
            />
            {!selectedImage && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                Upload an image to start editing
              </div>
            )}
          </div>
          
          {selectedImage && activity && (
            <button
              onClick={downloadImage}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 w-full"
            >
              Download Image
            </button>
          )}
        </div>
        
        {/* Right side: Editing Controls */}
        <div className="w-full md:w-1/3 space-y-6">
          {activity ? (
            <>
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-bold text-black text-lg border-l-4 border-[#FC4C02] pl-2">Selected Activity:</h3>
                <p className="font-medium text-gray-800">{activity.name ?? "Please select the activity"}</p>
                <p className="text-sm text-gray-500">
                  {activity.type} • {activity.start_date} • {activity.distance}km
                </p>
              </div>
              
              {selectedImage && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-bold border-l-4 border-[#FC4C02] pl-2">Aspect Ratio</h3>
                    <div className="flex flex-wrap gap-2">
                      {(['original', '9:16', '16:9', '3:4', '4:3', '1:1'] as AspectRatio[]).map(ratio => (
                        <button
                          key={ratio}
                          onClick={() => handleAspectRatioChange(ratio)}
                          className={`px-3 py-1 text-sm rounded-full ${
                            aspectRatio === ratio
                              ? 'bg-[#FC4C02] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-bold border-l-4 border-[#FC4C02] pl-2">Stats Position</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {(['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right', 'center',] as Position[]).map(pos => (
                        <button
                          key={pos}
                          onClick={() => handlePositionChange(pos)}
                          className={`px-3 py-1 text-sm rounded-lg ${
                            position === pos
                              ? 'bg-[#FC4C02] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {pos.replace('-', ' ')}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">Tip: You can also drag the stats box on the image</p>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-bold border-l-4 border-[#FC4C02] pl-2">Appearance</h3>
                    <div className="space-y-2">
                      <label className="block text-sm">Background Opacity</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        defaultValue="0.5"
                        onChange={(e) => {
                          const bgColor = `rgba(0, 0, 0, ${e.target.value})`;
                          setBackgroundColor(bgColor);
                        }}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm">Text Color</label>
                      <input
                        type="color"
                        defaultValue="#ffffff"
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-full h-10 cursor-pointer rounded border border-gray-300"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm">Font Size ({fontSizePercent}% of image height)</label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={fontSizePercent}
                        onChange={(e) => setFontSizePercent(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm">Corner Radius</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={statsPosition.borderRadius}
                        onChange={(e) => setStatsPosition(prev => ({ 
                          ...prev, 
                          borderRadius: parseInt(e.target.value) 
                        }))}
                        className="w-full"
                      />
                    </div>
                    {/* Stats width is now calculated automatically based on text */}
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-bold border-l-4 border-[#FC4C02] pl-2">Stats to Display</h3>
                    <StatsSelector 
                      activity={activity} 
                      onStatsChange={handleStatsChange} 
                    />
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="bg-gray-100 p-6 rounded-lg">
              <p className="text-gray-700">Please select an activity to continue.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}