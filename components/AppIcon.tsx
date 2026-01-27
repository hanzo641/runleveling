import React from 'react';
import Svg, { 
  Path, 
  Circle, 
  Defs, 
  LinearGradient, 
  Stop, 
  G,
  Rect
} from 'react-native-svg';

interface AppIconProps {
  size?: number;
}

// App Icon for RunLeveling
export default function AppIcon({ size = 200 }: AppIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        {/* Main gradient - Purple to Blue */}
        <LinearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#6366F1" />
          <Stop offset="50%" stopColor="#8B5CF6" />
          <Stop offset="100%" stopColor="#4F46E5" />
        </LinearGradient>
        {/* Gold accent gradient */}
        <LinearGradient id="goldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FCD34D" />
          <Stop offset="100%" stopColor="#F59E0B" />
        </LinearGradient>
        {/* Fire gradient for energy effect */}
        <LinearGradient id="fireGradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <Stop offset="0%" stopColor="#F59E0B" />
          <Stop offset="50%" stopColor="#EF4444" />
          <Stop offset="100%" stopColor="#FCD34D" />
        </LinearGradient>
      </Defs>
      
      {/* Background rounded square */}
      <Rect x="10" y="10" width="180" height="180" rx="40" fill="url(#bgGradient)" />
      
      {/* Runner silhouette */}
      <G transform="translate(50, 30)">
        {/* Head */}
        <Circle cx="50" cy="25" r="18" fill="#FFFFFF" />
        
        {/* Body - athletic pose */}
        <Path 
          d="M50 43 L50 85" 
          stroke="#FFFFFF" 
          strokeWidth="10" 
          strokeLinecap="round" 
        />
        
        {/* Arms - running motion */}
        <Path 
          d="M50 55 L25 75" 
          stroke="#FFFFFF" 
          strokeWidth="8" 
          strokeLinecap="round" 
        />
        <Path 
          d="M50 55 L80 50" 
          stroke="#FFFFFF" 
          strokeWidth="8" 
          strokeLinecap="round" 
        />
        
        {/* Legs - dynamic running pose */}
        <Path 
          d="M50 85 L25 125" 
          stroke="#FFFFFF" 
          strokeWidth="9" 
          strokeLinecap="round" 
        />
        <Path 
          d="M50 85 L80 115" 
          stroke="#FFFFFF" 
          strokeWidth="9" 
          strokeLinecap="round" 
        />
      </G>
      
      {/* Level up arrow / Energy effect */}
      <G transform="translate(130, 40)">
        <Path 
          d="M20 50 L35 20 L50 50 L40 50 L40 80 L30 80 L30 50 Z" 
          fill="url(#goldGradient)" 
        />
      </G>
      
      {/* Speed lines */}
      <G stroke="rgba(255,255,255,0.6)" strokeWidth="3" strokeLinecap="round">
        <Path d="M30 80 L15 80" />
        <Path d="M35 100 L10 100" />
        <Path d="M30 120 L15 120" />
      </G>
      
      {/* Small XP stars */}
      <G fill="url(#goldGradient)">
        <Circle cx="40" cy="50" r="5" />
        <Circle cx="165" cy="85" r="4" />
        <Circle cx="155" cy="140" r="6" />
      </G>
    </Svg>
  );
}

// Static icon for app.json (as base64 or file reference)
export const AppIconSVG = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366F1"/>
      <stop offset="50%" stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#4F46E5"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FCD34D"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </linearGradient>
  </defs>
  <rect x="51" y="51" width="922" height="922" rx="205" fill="url(#bgGrad)"/>
  <g transform="translate(256, 154)">
    <circle cx="256" cy="128" r="92" fill="#FFFFFF"/>
    <path d="M256 220 L256 435" stroke="#FFFFFF" stroke-width="51" stroke-linecap="round"/>
    <path d="M256 282 L128 384" stroke="#FFFFFF" stroke-width="41" stroke-linecap="round"/>
    <path d="M256 282 L410 256" stroke="#FFFFFF" stroke-width="41" stroke-linecap="round"/>
    <path d="M256 435 L128 640" stroke="#FFFFFF" stroke-width="46" stroke-linecap="round"/>
    <path d="M256 435 L410 589" stroke="#FFFFFF" stroke-width="46" stroke-linecap="round"/>
  </g>
  <g transform="translate(666, 205)">
    <path d="M102 256 L179 102 L256 256 L205 256 L205 410 L154 410 L154 256 Z" fill="url(#goldGrad)"/>
  </g>
  <g stroke="rgba(255,255,255,0.6)" stroke-width="15" stroke-linecap="round">
    <path d="M154 410 L77 410"/>
    <path d="M179 512 L51 512"/>
    <path d="M154 614 L77 614"/>
  </g>
  <g fill="url(#goldGrad)">
    <circle cx="205" cy="256" r="26"/>
    <circle cx="845" cy="435" r="20"/>
    <circle cx="794" cy="717" r="31"/>
  </g>
</svg>
`;
