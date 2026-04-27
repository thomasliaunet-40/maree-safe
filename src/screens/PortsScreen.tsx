import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Port } from '../types';
import { ALL_PORTS } from '../constants/ports';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import Icon from '../components/Icon';
import FabNav, { Screen } from '../components/FabNav';

const FAVORITES = ['boucau-bayonne-biarritz', 'lorient', 'concarneau', 'la-rochelle', 'saint-malo'];

interface Props {
  selectedPort: Port;
  onSelect: (port: Port) => void;
  onNav: (s: Screen) => void;
}

export default function PortsScreen({ selectedPort, onSelect, onNav }: Props) {
  const [query, setQuery] = useState('');

  const filtered = ALL_PORTS.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.region.toLowerCase().includes(query.toLowerCase())
  );
  const favs   = filtered.filter(p => FAVORITES.includes(p.id));
  const others = filtered.filter(p => !FAVORITES.includes(p.id));

  const PortRow = ({ p }: { p: Port }) => {
    const selected = p.id === selectedPort.id;
    const isFav = FAVORITES.includes(p.id);
    return (
      <TouchableOpacity
        style={[styles.portRow, selected && styles.portRowSelected]}
        onPress={() => { onSelect(p); onNav('home'); }}
        activeOpacity={0.8}
      >
        <View style={[styles.portAvatar, selected && styles.portAvatarSelected]}>
          <Text style={[styles.portAvatarTxt, selected && { color: '#fff' }]}>
            {p.name.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.portName, selected && styles.portNameSelected]}>{p.name}</Text>
          <Text style={[styles.portRegion, selected && styles.portRegionSelected]}>{p.region}</Text>
        </View>
        {isFav && <Icon name="star" size={16} fill={COLORS.warn} stroke={COLORS.warn} />}
        {selected && (
          <View style={styles.checkBadge}>
            <Icon name="check" size={14} stroke="#fff" strokeWidth={2.5} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => onNav('home')} style={styles.backBtn} activeOpacity={0.7}>
          <Icon name="chevronLeft" size={20} stroke={COLORS.ink2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Mes ports</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Choisissez un port</Text>

        {/* Recherche */}
        <View style={styles.searchBox}>
          <Icon name="search" size={18} stroke={COLORS.ink3} />
          <TextInput
            style={styles.searchInput}
            placeholder="Port ou région…"
            placeholderTextColor={COLORS.ink4}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {/* Mini-carte stylisée */}
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapLabel}>Côte atlantique · {ALL_PORTS.length} ports</Text>
        </View>

        {favs.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Favoris</Text>
            {favs.map(p => <PortRow key={p.id} p={p} />)}
          </>
        )}

        {others.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Tous les ports</Text>
            {others.map(p => <PortRow key={p.id} p={p} />)}
          </>
        )}
      </ScrollView>

      <FabNav active="ports" onChange={onNav} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.paper },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 14, paddingBottom: 8 },
  backBtn:{ padding: 4 },
  topTitle:{ fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.ink },

  scroll:       { flex: 1 },
  scrollContent:{ padding: 18, paddingBottom: 120 },

  heading: { fontSize: 32, fontFamily: FONTS.display, color: COLORS.ink, marginBottom: 18, marginHorizontal: 4, marginTop: 8 },

  searchBox:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.paperSoft, borderRadius: 16, padding: 12, marginBottom: 18, borderWidth: 1, borderColor: COLORS.hairline },
  searchInput:{ flex: 1, fontSize: 14, fontFamily: FONTS.regular, color: COLORS.ink },

  mapPlaceholder: { height: 100, borderRadius: 22, backgroundColor: COLORS.tide, marginBottom: 22, alignItems: 'flex-end', justifyContent: 'flex-end', padding: 12 },
  mapLabel: { fontSize: 11, fontFamily: FONTS.semiBold, color: COLORS.tideInk, backgroundColor: 'rgba(255,255,255,0.75)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },

  sectionLabel: { fontSize: 11, fontFamily: FONTS.semiBold, color: COLORS.ink3, textTransform: 'uppercase', letterSpacing: 0.12, marginBottom: 8, marginTop: 4 },

  portRow:         { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18, marginBottom: 4 },
  portRowSelected: { backgroundColor: COLORS.ink },
  portAvatar:      { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.tide, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  portAvatarSelected:{ backgroundColor: COLORS.brand },
  portAvatarTxt:   { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.tideInk },
  portName:        { fontSize: 16, fontFamily: FONTS.semiBold, color: COLORS.ink },
  portNameSelected:{ color: '#fff' },
  portRegion:      { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.ink3 },
  portRegionSelected:{ color: 'rgba(255,255,255,0.6)' },
  checkBadge:      { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' },
});
