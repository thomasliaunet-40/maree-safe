import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline, G } from 'react-native-svg';

type IconName =
  | 'home' | 'calendar' | 'map' | 'wave' | 'settings'
  | 'location' | 'bell' | 'chevronRight' | 'chevronDown' | 'chevronLeft'
  | 'arrowUp' | 'arrowDown' | 'wind' | 'anchor' | 'search'
  | 'star' | 'plus' | 'info' | 'check' | 'boat';

interface Props {
  name: IconName;
  size?: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
}

export default function Icon({ name, size = 20, stroke = 'currentColor', fill = 'none', strokeWidth = 1.8 }: Props) {
  const props = { stroke, fill, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  const icons: Record<IconName, React.ReactNode> = {
    home: <><Path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" {...props}/></>,
    calendar: <><Rect x="3" y="5" width="18" height="16" rx="2" {...props}/><Path d="M3 9h18M8 3v4M16 3v4" {...props}/></>,
    map: <><Path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2z" {...props}/><Path d="M9 4v14M15 6v14" {...props}/></>,
    wave: <><Path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0" {...props}/><Path d="M2 18c2-3 4-3 6 0s4 3 6 0 4-3 6 0" {...props}/></>,
    settings: <><Circle cx="12" cy="12" r="3" {...props}/><Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.7 15a1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" {...props}/></>,
    location: <><Path d="M12 22s8-7.5 8-13a8 8 0 1 0-16 0c0 5.5 8 13 8 13z" {...props}/><Circle cx="12" cy="9" r="3" {...props}/></>,
    bell: <><Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" {...props}/><Path d="M10 21a2 2 0 0 0 4 0" {...props}/></>,
    chevronRight: <><Path d="M9 6l6 6-6 6" {...props}/></>,
    chevronDown: <><Path d="M6 9l6 6 6-6" {...props}/></>,
    chevronLeft: <><Path d="M15 6l-6 6 6 6" {...props}/></>,
    arrowUp: <><Path d="M12 19V5M5 12l7-7 7 7" {...props}/></>,
    arrowDown: <><Path d="M12 5v14M5 12l7 7 7-7" {...props}/></>,
    wind: <><Path d="M3 8h11a3 3 0 1 0-3-3" {...props}/><Path d="M3 16h17a3 3 0 1 1-3 3" {...props}/><Path d="M3 12h13" {...props}/></>,
    anchor: <><Circle cx="12" cy="5" r="2" {...props}/><Path d="M12 7v15M5 12h14M5 12a7 7 0 0 0 7 7M19 12a7 7 0 0 1-7 7" {...props}/></>,
    search: <><Circle cx="11" cy="11" r="7" {...props}/><Path d="M21 21l-4.3-4.3" {...props}/></>,
    star: <><Path d="M12 3l2.7 6 6.6.6-5 4.5 1.5 6.5L12 17l-5.8 3.6 1.5-6.5-5-4.5 6.6-.6z" {...props}/></>,
    plus: <><Path d="M12 5v14M5 12h14" {...props}/></>,
    info: <><Circle cx="12" cy="12" r="9" {...props}/><Path d="M12 8h.01M11 12h1v4h1" {...props}/></>,
    check: <><Path d="M5 12l4 4 10-10" {...props}/></>,
    boat: <><Path d="M3 17l9-13 9 13" {...props}/><Path d="M3 17c2 2 4 2 6 0s4-2 6 0 4 2 6 0" {...props}/><Path d="M12 4v13" {...props}/></>,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {icons[name]}
    </Svg>
  );
}
