import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FabNav, { Screen } from './FabNav';

interface Props {
  active: Screen;
  onChange: (s: Screen) => void;
}

// Reproduit le .ms-screen::after du design CSS :
// gradient blanc transparent→opaque sur 128px au-dessus de la nav,
// + léger blur visuel via l'opacité progressive.
export default function NavFade({ active, onChange }: Props) {
  return (
    <>
      <LinearGradient
        colors={[
          'rgba(255,255,255,0)',
          'rgba(255,255,255,0.60)',
          'rgba(255,255,255,0.92)',
          'rgba(255,255,255,0.98)',
        ]}
        locations={[0, 0.35, 0.70, 1]}
        style={styles.fade}
        pointerEvents="none"
      />
      <FabNav active={active} onChange={onChange} />
    </>
  );
}

const styles = StyleSheet.create({
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 128,
    zIndex: 4,
    pointerEvents: 'none',
  },
});
