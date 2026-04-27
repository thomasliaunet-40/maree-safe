import React from 'react';
import Svg, { Circle, Polygon, Rect, Line, Path, Text as SvgText } from 'react-native-svg';
import { COLORS } from '../constants/colors';

interface Props {
  size?: number;
}

export default function AppLogo({ size = 36 }: Props) {
  const s = size / 100;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="50" fill={COLORS.navy} />
      {/* Corps phare */}
      <Rect x="43" y="38" width="14" height="28" rx="2" fill={COLORS.textPrimary} />
      {/* Tour effilée */}
      <Polygon points="41,38 46,20 54,20 59,38" fill={COLORS.textPrimary} />
      {/* Lanterne */}
      <Rect x="44" y="14" width="12" height="7" rx="1" fill={COLORS.primary} />
      {/* Rayon lumineux */}
      <Polygon points="50,14 28,6 28,14" fill={COLORS.primary} opacity={0.5} />
      {/* Bande décorative */}
      <Rect x="43" y="52" width="14" height="4" fill={COLORS.primary} opacity={0.7} />
      {/* Vagues */}
      <Path
        d="M10 76 Q22 71 35 76 Q48 81 61 76 Q74 71 90 76"
        fill="none"
        stroke={COLORS.primary}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Path
        d="M16 84 Q28 79 41 84 Q54 89 67 84 Q80 79 90 84"
        fill="none"
        stroke={COLORS.primaryLight}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
