import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface Props {
  height?: number;
}

export default function AppLogo({ height = 32 }: Props) {
  const width = height * (140 / 105);
  return (
    <Svg width={width} height={height} viewBox="0 0 140 105" fill="none">
      <Path d="M 6 92 Q 70 54 134 92" stroke="#3DD9C8" strokeWidth="11" strokeLinecap="round" />
      <Path d="M 28 60 Q 70 35 112 60" stroke="#F4A05A" strokeWidth="11" strokeLinecap="round" />
      <Path d="M 50 28 Q 70 16 90 28" stroke="#E8614A" strokeWidth="11" strokeLinecap="round" />
    </Svg>
  );
}
