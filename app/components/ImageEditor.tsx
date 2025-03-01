"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { StravaActivity } from '@/app/lib/strava';
import StatsSelector from './StatsSelector';
import { formattedDate, formattedMovingTime } from '../utils/formatters';

interface ImageEditorProps {
  activity: StravaActivity | null;
  onImageEditorRef?: (ref: { loadImageFromUrl: (url: string) => void }) => void;
}

const PADDING = 20;

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
  hasSetWidth?: boolean;
}

export default function ImageEditor({ activity, onImageEditorRef }: ImageEditorProps) {
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

  // For vertical crop position (0-100%, default is center at 50%)
  const [verticalCropPosition, setVerticalCropPosition] = useState<number>(50);
  const [position, setPosition] = useState<Position>('top-left');
  const [backgroundColor, setBackgroundColor] = useState('rgba(0, 0, 0, 0.5)');
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontSizePercent, setFontSizePercent] = useState(3); // 5% of image height as default
  const [error, setError] = useState<string | null>(null);
  const [selectedStats, setSelectedStats] = useState<string[]>([
    'name', 'start_date', 'distance', 'moving_time', 'average_pace'
  ]);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleStatsChange = (stats: string[]) => {
    // Just update the state - the useEffect will handle rendering
    setSelectedStats([...stats]);
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const uploadImageRef = useRef<HTMLDivElement | null>(null);
  // Added file input ref to clear its value when activity changes
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activity && uploadImageRef.current) {
      uploadImageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activity]);

  useEffect(() => {
    if (activity) {
      let defaultStats: string[] = [];
      switch (activity.type.toLowerCase()) {
        case 'run':
        case 'virtualrun':
          defaultStats = ['name', 'start_date', 'distance', 'moving_time', 'average_pace', 'average_heartrate', 'calories'];
          break;
        case 'trailrun':
          defaultStats = ['name', 'start_date', 'distance', 'moving_time', 'average_pace', 'average_heartrate', 'total_elevation_gain', 'calories'];
          break;
        case 'walk':
        case 'hike':
          defaultStats = ['name', 'start_date', 'distance', 'moving_time', 'average_pace', 'average_heartrate', 'total_elevation_gain', 'calories'];
          break;
        case 'ride':
        case 'gravelride':
        case 'mountainbikeride':
        case 'virtualride':
        case 'ebikeride':
        case 'emountainbikeride':
          defaultStats = ['name', 'start_date', 'distance', 'moving_time', 'average_speed', 'average_heartrate', 'total_elevation_gain', 'calories'];
          break;
        default:
          defaultStats = ['name', 'start_date', 'moving_time', 'average_heartrate', 'calories'];
      }
      setSelectedStats(defaultStats);
    }
  }, [activity]);

  const renderCanvas = useCallback(() => {
    // Only render in browser context
    if (typeof window === 'undefined') return;

    if (!selectedImage || !activity || !canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas 2D context');
      return;
    }

    // Define available stats in the order they should appear
    const availableStats = [
      { key: 'name', label: 'Activity Name' },
      { key: 'type', label: 'Activity Type' },
      { key: 'start_date', label: 'Date' },
      { key: 'distance', label: 'Distance (km)' },
      { key: 'moving_time', label: 'Moving Time (min)' },
      { key: 'elapsed_time', label: 'Elapsed Time (min)' },
      { key: 'average_pace', label: 'Average Pace (min/km)' },
      { key: 'max_pace', label: 'Max Pace (min/km)' },
      { key: 'average_speed', label: 'Average Speed (km/h)' },
      { key: 'max_speed', label: 'Max Speed (km/h)' },
      { key: 'total_elevation_gain', label: 'Elevation Gain (m)' },
    ];

    // Add optional stats if they exist in the activity
    if (activity.average_heartrate) {
      availableStats.push({ key: 'average_heartrate', label: 'Avg Heart Rate (bpm)' });
    }

    if (activity.max_heartrate) {
      availableStats.push({ key: 'max_heartrate', label: 'Max Heart Rate (bpm)' });
    }

    if (activity.calories) {
      availableStats.push({ key: 'calories', label: 'Calories' });
    }

    if (activity.suffer_score) {
      availableStats.push({ key: 'suffer_score', label: 'Suffer Score' });
    }

    const img = imageRef.current;

    // Calculate dimensions based on aspect ratio
    const width = img.width;
    let height = img.height;
    const sourceX = 0;
    let sourceY = 0;

    if (aspectRatio !== 'original') {
      // New cover algorithm:
      const iw = img.width, ih = img.height;
      // Calculate target ratio from aspectRatio string, e.g. "16:9" becomes 16/9.
      const [num, den] = aspectRatio.split(':').map(Number);
      const targetRatio = num / den;

      // First, try to use full width.
      const chFromWidth = iw / targetRatio;
      let cw, ch;
      if (chFromWidth <= ih) {
        cw = iw;
        ch = chFromWidth;
      } else {
        // Otherwise use full height.
        cw = ih * targetRatio;
        ch = ih;
      }
      canvas.width = cw;
      canvas.height = ch;

      // Compute scale factor (for cover effect)
      const scale = Math.max(cw / iw, ch / ih);
      const srcWidth = cw / scale;
      const srcHeight = ch / scale;
      const srcX = (iw - srcWidth) / 2;
      const srcY = (ih - srcHeight) / 2;

      ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, cw, ch);
    } else {
      // If 'original', use the image's natural dimensions.
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);
    }

    // Calculate fontSize based on canvas height, with a minimum size for readability
    // For high-resolution images, use a square root scaling to avoid too small text
    const baseSize = Math.round(canvas.height * (fontSizePercent / 100));
    // Set minimum font size (never smaller than what would be used on a 600px tall image)
    const minFontSize = Math.round(600 * (fontSizePercent / 100));
    const fontSize = Math.max(minFontSize, baseSize);

    // Calculate all measurements proportionally to font size
    const paddingScale = fontSize / minFontSize;
    const padding = Math.round(PADDING * paddingScale);
    // Scale line height and header height proportionally
    const baseLineHeight = 10;
    const baseHeaderExtra = 14;
    const lineHeight = fontSize + Math.round(baseLineHeight * paddingScale);
    const headerHeight = fontSize + Math.round(baseHeaderExtra * paddingScale);

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
      switch (key) {
        case 'start_date': return 'Date ';
        case 'distance': return 'Distance ';
        case 'moving_time': return 'Moving Time ';
        case 'elapsed_time': return 'Total Time ';
        case 'average_speed': return 'Avg Speed ';
        case 'max_speed': return 'Max Speed ';
        case 'average_pace': return 'Avg Pace ';
        case 'max_pace': return 'Max Pace ';
        case 'total_elevation_gain': return 'Elevation ';
        case 'average_heartrate': return 'Avg HR ';
        case 'max_heartrate': return 'Max HR ';
        case 'suffer_score': return 'Suffer Score ';
        case 'calories': return 'Calories ';
        case 'type': return 'Activity ';
        default: return key;
      }
    };

    const getStatValue = (key: string): string => {
      if (!activity) return '';

      switch (key) {
        case 'start_date': return formattedDate(activity.start_date_local);
        case 'distance': return `${activity.distance}km`;
        case 'moving_time': return formattedMovingTime(activity.moving_time);
        case 'elapsed_time': return formattedMovingTime(activity.elapsed_time);
        case 'average_speed': return `${activity.average_speed}km/h`;
        case 'max_speed': return `${activity.max_speed}km/h`;
        case 'average_pace': return activity.average_pace;
        case 'max_pace': return activity.max_pace;
        case 'total_elevation_gain': return `${activity.total_elevation_gain}m`;
        case 'average_heartrate': return activity.average_heartrate ? `${Math.round(activity.average_heartrate)} bpm` : '';
        case 'max_heartrate': return activity.max_heartrate ? `${Math.round(activity.max_heartrate)} bpm` : '';
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

    // Add some extra padding for better appearance
    maxTextWidth += PADDING * 2;  // Add extra padding to both sides

    // Ensure width doesn't exceed canvas width
    // Apply double padding to ensure there's padding on both sides
    const maxAllowedWidth = canvas.width - (padding * 2);
    maxTextWidth = Math.min(maxTextWidth, maxAllowedWidth);

    // Only update width when rendering initially or when there's a significant change
    // to prevent render loops
    if (!statsPosition.hasSetWidth || Math.abs(maxTextWidth - statsPosition.width) > 100) {
      setStatsPosition(prev => ({
        ...prev,
        width: maxTextWidth,
        hasSetWidth: true
      }));
    }

    // Calculate how many lines the title might take up
    let titleLines = 1;
    if (selectedStats.includes('name')) {
      // Calculate available width for the text
      const availableWidth = maxTextWidth - (padding * 2);

      // Estimate title lines using text measurement
      ctx.font = `bold ${fontSize + 4}px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;
      const words = activity.name.split(' ');
      let line = '';
      const tempLines = [];

      // Build lines by adding words until we exceed maxWidth
      for (let i = 0; i < words.length; i++) {
        const testLine = line + (line ? ' ' : '') + words[i];
        const metrics = ctx.measureText(testLine);

        if (metrics.width > availableWidth && i > 0) {
          tempLines.push(line);
          line = words[i];
        } else {
          line = testLine;
        }
      }

      // Add the last line
      if (line) {
        tempLines.push(line);
      }

      titleLines = tempLines.length;
    }

    // Calculate overlay height adding the title lines
    const overlayHeight = padding * 2 + headerHeight +
      ((selectedStats.length - (selectedStats.includes('name') ? 1 : 0)) * lineHeight) +
      (titleLines * lineHeight);

    // Draw stats overlay with optional rounded corners
    ctx.fillStyle = backgroundColor;

    // Make sure overlay width is properly constrained
    const finalWidth = Math.min(statsPosition.width, canvas.width - (statsPosition.x + padding));

    if (statsPosition.borderRadius > 0) {
      // Draw rounded rectangle
      const radius = Math.min(
        statsPosition.borderRadius,
        finalWidth / 2,
        overlayHeight / 2
      );

      ctx.beginPath();
      ctx.moveTo(statsPosition.x + radius, statsPosition.y);
      ctx.lineTo(statsPosition.x + finalWidth - radius, statsPosition.y);
      ctx.quadraticCurveTo(statsPosition.x + finalWidth, statsPosition.y, statsPosition.x + finalWidth, statsPosition.y + radius);
      ctx.lineTo(statsPosition.x + finalWidth, statsPosition.y + overlayHeight - radius);
      ctx.quadraticCurveTo(statsPosition.x + finalWidth, statsPosition.y + overlayHeight, statsPosition.x + finalWidth - radius, statsPosition.y + overlayHeight);
      ctx.lineTo(statsPosition.x + radius, statsPosition.y + overlayHeight);
      ctx.quadraticCurveTo(statsPosition.x, statsPosition.y + overlayHeight, statsPosition.x, statsPosition.y + overlayHeight - radius);
      ctx.lineTo(statsPosition.x, statsPosition.y + radius);
      ctx.quadraticCurveTo(statsPosition.x, statsPosition.y, statsPosition.x + radius, statsPosition.y);
      ctx.closePath();
      ctx.fill();
    } else {
      // Draw regular rectangle
      ctx.fillRect(statsPosition.x, statsPosition.y, finalWidth, overlayHeight);
    }

    // Add stats text
    ctx.fillStyle = textColor;
    let yPos = statsPosition.y + padding + fontSize + 4;

    // Only show title if name is in selected stats
    if (selectedStats.includes('name')) {
      ctx.textAlign = 'left';
      ctx.font = `bold ${fontSize + 4}px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;

      // Calculate available width for the text
      const maxWidth = statsPosition.width - (padding * 2.5);

      // Split activity name into multiple lines if needed
      const words = activity.name.split(' ');
      let line = '';
      const lines = [];

      // Build lines by adding words until we exceed maxWidth
      for (let i = 0; i < words.length; i++) {
        const testLine = line + (line ? ' ' : '') + words[i];
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && i > 0) {
          // If adding this word exceeds width, add current line to lines array
          lines.push(line);
          line = words[i];
        } else {
          line = testLine;
        }
      }

      // Add the last line
      if (line) {
        lines.push(line);
      }

      // Draw each line of the title
      let titleYPos = yPos;
      lines.forEach(lineText => {
        ctx.fillText(lineText, statsPosition.x + padding, titleYPos);
        titleYPos += lineHeight;
      });

      // Adjust yPos based on how many lines we have (first line already counted)
      yPos += lineHeight * (lines.length - 1) + lineHeight + 15; // More space after title
    }

    // Get the ordered list of stats (all available stats in their original order)
    const orderedStats = availableStats.map(stat => stat.key);

    // Filter to only include selected stats, preserving the original order
    const orderedSelectedStats = orderedStats
      .filter(stat => selectedStats.includes(stat))
      .filter(stat => stat !== 'name'); // Exclude name from the list

    // Draw each stat in the preserved order
    orderedSelectedStats.forEach(stat => {
      const label = getStatLabel(stat);
      const value = getStatValue(stat);

      // Draw label (left-aligned)
      ctx.textAlign = 'left';
      ctx.font = `${fontSize}px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;
      ctx.fillText(label, statsPosition.x + padding, yPos);

      // Draw value (right-aligned with proper padding)
      ctx.textAlign = 'right';
      ctx.font = `bold ${fontSize}px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;
      // Use finalWidth instead of statsPosition.width to ensure proper right-side padding
      ctx.fillText(value, statsPosition.x + finalWidth - (padding * 1.5), yPos);

      yPos += lineHeight;
    });

    // Reset text alignment for future text
    ctx.textAlign = 'left';
  }, [selectedImage, activity, canvasRef, imageRef, aspectRatio, verticalCropPosition, fontSizePercent, selectedStats, statsPosition, backgroundColor, textColor]);



  // Reset selectedImage when activity changes
  useEffect(() => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  }, [activity]);


  // Use stable ref for the image loading function to prevent re-renders
  const loadImageFromUrlRef = useRef((url: string) => {
    if (!url) {
      console.error("loadImageFromUrl called with undefined or empty URL");
      return;
    }

    // Create a new image and load it
    const img = new Image();

    img.onload = () => {
      imageRef.current = img;
      setSelectedImage(url);
    };
    img.onerror = (e) => {
      console.error("Failed to load image from URL:", url, e);
    };
    img.src = url;
  });

  // Create a stable API object with useMemo
  const imageEditorApi = useMemo(() => ({
    loadImageFromUrl: loadImageFromUrlRef.current
  }), []);

  // Register the stable API object
  useEffect(() => {
    if (onImageEditorRef) {
      onImageEditorRef(imageEditorApi);
    }
  }, [onImageEditorRef, imageEditorApi]);

  // Single combined useEffect for rendering canvas when any visual parameters change
  useEffect(() => {
    if (typeof window === 'undefined' || !canvasRef.current || !activity || !selectedImage) return;

    // Use a debounced render to prevent too many rapid re-renders
    const timer = setTimeout(() => {
      requestAnimationFrame(() => {
        renderCanvas();
      });
    }, 50); // Small debounce to prevent render loops

    return () => clearTimeout(timer);
  }, [
    selectedStats,
    activity,
    selectedImage,
    verticalCropPosition,
    aspectRatio,
    statsPosition,
    backgroundColor,
    textColor,
    fontSizePercent,
    position,
    renderCanvas
  ]);

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
        // renderCanvas will be called by the useEffect when selectedImage changes
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

    // Reset vertical crop position to center when changing aspect ratio
    setVerticalCropPosition(50);
  };

  const handlePositionChange = (newPosition: Position) => {
    setPosition(newPosition);

    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;

    // Calculate fontSize based on canvas height, with a minimum size for readability
    const baseSize = Math.round(canvas.height * (fontSizePercent / 100));
    // Set minimum font size (never smaller than what would be used on a 600px tall image)
    const minFontSize = Math.round(600 * (fontSizePercent / 100));
    const fontSize = Math.max(minFontSize, baseSize);

    // Scale padding proportionally to font size
    const paddingScale = fontSize / minFontSize;
    const padding = Math.round(PADDING * paddingScale);

    // Scale line height and header height proportionally
    const baseLineHeight = 10;
    const baseHeaderExtra = 14;
    const lineHeight = fontSize + Math.round(baseLineHeight * paddingScale);
    const headerHeight = fontSize + Math.round(baseHeaderExtra * paddingScale);
    const numStats = selectedStats.length;
    const minHeight = padding * 2 + headerHeight + (numStats * lineHeight);

    // Calculate actual stats width to use (capped by canvas width if needed)
    const actualStatsWidth = Math.min(statsPosition.width, canvas.width - padding * 2);

    // Set position based on the selection
    switch (newPosition) {
      case 'top-center':
        setStatsPosition(prev => ({ ...prev, x: Math.max(padding, (canvas.width - actualStatsWidth) / 2), y: padding }));
        break;
      case 'top-left':
        setStatsPosition(prev => ({ ...prev, x: padding, y: padding }));
        break;
      case 'top-right':
        setStatsPosition(prev => ({ ...prev, x: Math.max(padding, canvas.width - actualStatsWidth - padding), y: padding }));
        break;
      case 'center':
        setStatsPosition(prev => ({
          ...prev,
          x: Math.max(padding, (canvas.width - actualStatsWidth) / 2),
          y: Math.max(padding, (canvas.height - minHeight) / 2)
        }));
        break;
      case 'bottom-left':
        setStatsPosition(prev => ({
          ...prev,
          x: padding,
          y: Math.max(padding, canvas.height - minHeight - padding)
        }));
        break;
      case 'bottom-right':
        setStatsPosition(prev => ({
          ...prev,
          x: Math.max(padding, canvas.width - actualStatsWidth - padding),
          y: Math.max(padding, canvas.height - minHeight - padding)
        }));
        break;
      case 'bottom-center':
        setStatsPosition(prev => ({
          ...prev,
          x: Math.max(padding, (canvas.width - actualStatsWidth) / 2),
          y: Math.max(padding, canvas.height - minHeight - padding)
        }));
        break;
    }
  };

  const startDragging = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate fontSize based on canvas height, with a minimum size for readability
    const baseSize = Math.round(canvas.height * (fontSizePercent / 100));
    // Set minimum font size (never smaller than what would be used on a 600px tall image)
    const minFontSize = Math.round(600 * (fontSizePercent / 100));
    const fontSize = Math.max(minFontSize, baseSize);

    // Calculate all measurements proportionally to font size
    const paddingScale = fontSize / minFontSize;
    const padding = Math.round(PADDING * paddingScale);
    // Scale line height and header height proportionally
    const baseLineHeight = 10;
    const baseHeaderExtra = 14;
    const lineHeight = fontSize + Math.round(baseLineHeight * paddingScale);
    const headerHeight = fontSize + Math.round(baseHeaderExtra * paddingScale);
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

    // Calculate fontSize based on canvas height, with a minimum size for readability
    const baseSize = Math.round(canvas.height * (fontSizePercent / 100));
    // Set minimum font size (never smaller than what would be used on a 600px tall image)
    const minFontSize = Math.round(600 * (fontSizePercent / 100));
    const fontSize = Math.max(minFontSize, baseSize);

    // Calculate all measurements proportionally to font size
    const paddingScale = fontSize / minFontSize;
    const padding = Math.round(PADDING * paddingScale);
    // Scale line height and header height proportionally
    const baseLineHeight = 10;
    const baseHeaderExtra = 14;
    const lineHeight = fontSize + Math.round(baseLineHeight * paddingScale);
    const headerHeight = fontSize + Math.round(baseHeaderExtra * paddingScale);
    const numStats = selectedStats.length;
    const minHeight = padding + headerHeight + (numStats * lineHeight);

    // Calculate actual stats width to use (capped by canvas width if needed)
    const actualStatsWidth = Math.min(statsPosition.width, canvas.width - (padding * 2));

    // Ensure stats box stays within canvas boundaries
    const maxX = Math.max(0, canvas.width - actualStatsWidth - padding);
    const maxY = Math.max(0, canvas.height - minHeight - padding);

    // Account for the initial click offset within the box
    const newX = Math.max(padding, Math.min(maxX, x - statsPosition.dragOffsetX));
    const newY = Math.max(padding, Math.min(maxY, y - statsPosition.dragOffsetY));

    // Use direct state update to avoid re-renders
    setStatsPosition({
      ...statsPosition,
      x: newX,
      y: newY
    });
  };

  const downloadImage = () => {
    if (!canvasRef.current) return;
    setIsDownloading(true);
    const link = document.createElement("a");
    link.download = `strava-overlay-${activity?.name}-${new Date().getTime()}.jpg`;
    link.href = canvasRef.current.toDataURL("image/jpeg");
    link.click();
    setIsDownloading(false);
  };

  return (
    <div className="space-y-6" suppressHydrationWarning>
      <div className="flex flex-col md:flex-row md:space-x-6 space-y-6 md:space-y-0">
        {/* Left side: Canvas and Image Upload */}
        <div className="w-full md:w-2/3 space-y-4" ref={uploadImageRef}>
          <div className="space-y-2">
            <label className="block text-xl font-medium text-white">Upload Image</label>
            {activity ? <input
              ref={fileInputRef} // attached file input ref
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-violet-50 file:text-violet-700
              hover:file:bg-violet-100"
            /> :
              <label className="block text-sm font-medium text-gray-500">Please select an activity to continue.</label>}
            {error && <div className="text-red-500 text-sm">{error}</div>}
          </div>

          {activity && <div className="border border-gray-300 rounded-lg relative">
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
          </div>}

          {selectedImage && activity && (
            <button
              onClick={downloadImage}
              className={`bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 w-full ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isDownloading}
            >
              {isDownloading ? 'Downloading...' : 'Download Image'}
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
                          className={`px-3 py-1 text-sm rounded-full ${aspectRatio === ratio
      ? 'bg-[#FC4C02] text-white'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>

                    {aspectRatio !== 'original' && (
                      <div className="space-y-2 mt-3">
                        <label className="block text-sm">Vertical Position</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={verticalCropPosition}
                          onChange={(e) => {
                            setVerticalCropPosition(parseInt(e.target.value));
                            // Removed direct renderCanvas call - handled by useEffect
                          }}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Top</span>
                          <span>Center</span>
                          <span>Bottom</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-bold border-l-4 border-[#FC4C02] pl-2">Stats Position</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {(['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right', 'center',] as Position[]).map(pos => (
                        <button
                          key={pos}
                          onClick={() => handlePositionChange(pos)}
                          className={`px-3 py-1 text-sm rounded-lg ${position === pos
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
                        max="7"
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
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-bold border-l-4 border-[#FC4C02] pl-2">Stats to Display</h3>
                    <StatsSelector
                      activity={activity}
                      selectedStats={selectedStats}
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