import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';
import { COLORS } from '../constants/colors';

export type Screen = 'home' | 'week' | 'ports' | 'tide' | 'boat';

const ITEMS: { id: Screen; icon: React.ComponentProps<typeof Icon>['name'] }[] = [
  { id: 'home',  icon: 'home' },
  { id: 'week',  icon: 'calendar' },
  { id: 'tide',  icon: 'wave' },
  { id: 'boat',  icon: 'settings' },
];

interface Props {
  active: Screen;
  onChange: (s: Screen) => void;
}

export default function FabNav({ active, onChange }: Props) {
  return (
    <View style={styles.nav}>
      {ITEMS.map(it => (
        <TouchableOpacity
          key={it.id}
          style={[styles.btn, active === it.id && styles.btnActive]}
          onPress={() => onChange(it.id)}
          activeOpacity={0.8}
        >
          <Icon
            name={it.icon}
            size={22}
            stroke={active === it.id ? '#fff' : 'rgba(255,255,255,0.55)'}
            strokeWidth={2}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: COLORS.ink,
    borderRadius: 999,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 18,
    zIndex: 10,
  },
  btn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActive: {
    backgroundColor: COLORS.brand,
  },
});
