import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Props {
  deg: number;
  size?: number;
  color?: string;
  bg?: string;
}

export default function Compass({ deg, size = 56, color = '#5a4520', bg = 'rgba(0,0,0,0.06)' }: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.n, { color, fontSize: size * 0.16 }]}>N</Text>
      <Svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 24 24"
        style={{ transform: [{ rotate: `${deg + 180}deg` }] }}
      >
        <Path d="M12 3 L7 18 L12 14 L17 18 Z" fill={color} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  n: {
    position: 'absolute',
    top: 4,
    fontWeight: '600',
    opacity: 0.5,
  },
});
