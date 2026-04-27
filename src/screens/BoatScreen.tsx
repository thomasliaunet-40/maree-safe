import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import Svg, { Path, Line } from 'react-native-svg';
import { BoatSettings, BOAT_TYPES } from '../types';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import Icon from '../components/Icon';
import FabNav, { Screen } from '../components/FabNav';

interface Props {
  boat: BoatSettings;
  onChange: (b: BoatSettings) => void;
  onNav: (s: Screen) => void;
}

export default function BoatScreen({ boat, onChange, onNav }: Props) {
  const update = (k: keyof BoatSettings, v: any) => onChange({ ...boat, [k]: v });

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => onNav('home')} activeOpacity={0.7}>
          <Icon name="chevronLeft" size={20} stroke={COLORS.ink2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Mon voilier</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Réglages</Text>

        {/* Hero card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroTag}>Mon bateau</Text>
          <Text style={styles.heroLength}>
            {boat.length}<Text style={styles.heroUnit}> m</Text>
          </Text>
          <Text style={styles.heroSub}>
            {BOAT_TYPES.find(t => t.id === boat.type)?.label ?? ''} · {boat.experience}
          </Text>
          {/* Silhouette SVG */}
          <View style={{ marginTop: 18, alignItems: 'center' }}>
            <Svg width={200} height={80} viewBox="0 0 200 80">
              <Path d="M30 60 Q 100 80 170 60 L 160 50 L 40 50 Z" fill="rgba(255,255,255,0.15)" />
              <Path d="M40 50 L 100 8 L 100 50 Z" fill="rgba(255,255,255,0.85)" />
              <Line x1={100} y1={8} x2={100} y2={60} stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} />
              <Path d="M0 70 Q 50 65 100 70 T 200 70" stroke="rgba(255,255,255,0.3)" strokeWidth={1} fill="none" />
              <Path d="M0 76 Q 50 71 100 76 T 200 76" stroke="rgba(255,255,255,0.2)" strokeWidth={1} fill="none" />
            </Svg>
          </View>
        </View>

        {/* Type de voilier */}
        <Text style={styles.sectionLabel}>Type de voilier</Text>
        <View style={styles.typeGrid}>
          {BOAT_TYPES.map(t => {
            const sel = t.id === boat.type;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.typeCard, sel && styles.typeCardSelected]}
                onPress={() => update('type', t.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeLabel, sel && styles.typeLabelSelected]}>{t.label}</Text>
                <Text style={[styles.typeSub, sel && styles.typeSubSelected]}>{t.subtitle}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Caractéristiques */}
        <Text style={styles.sectionLabel}>Caractéristiques</Text>
        <SliderCard
          label="Longueur"
          value={boat.length}
          min={3} max={20} step={0.5}
          unit="m"
          onChange={v => update('length', v)}
          rangeMin="3 m" rangeMax="20 m"
          accentColor={COLORS.brand}
        />
        <SliderCard
          label="Tirant d'eau"
          value={boat.draft}
          min={0.4} max={3.5} step={0.1}
          unit="m"
          onChange={v => update('draft', v)}
          rangeMin="0.4 m" rangeMax="3.5 m"
          accentColor={COLORS.brand}
        />

        {/* Seuils de sécurité */}
        <Text style={styles.sectionLabel}>Seuils de sécurité</Text>
        <SliderCard
          label="Vent maximum"
          sublabel="Au-delà, sortie déconseillée"
          value={boat.maxWind}
          min={10} max={45} step={1}
          unit="kn"
          onChange={v => update('maxWind', v)}
          rangeMin="10 kn" rangeMax="45 kn"
          accentColor={COLORS.sandInk}
          cardStyle={{ backgroundColor: COLORS.sand }}
          valueStyle={{ color: COLORS.sandInk }}
        />
        <SliderCard
          label="Vagues maximum"
          sublabel="Hauteur significative"
          value={boat.maxWaves}
          min={0.5} max={4} step={0.1}
          unit="m"
          onChange={v => update('maxWaves', v)}
          rangeMin="0.5 m" rangeMax="4 m"
          accentColor={COLORS.tideInk}
          cardStyle={{ backgroundColor: COLORS.tide }}
          valueStyle={{ color: COLORS.tideInk }}
        />

        {/* Expérience */}
        <Text style={styles.sectionLabel}>Niveau d'expérience</Text>
        <View style={styles.expRow}>
          {(['Débutant', 'Confirmé', 'Expert'] as const).map(lvl => {
            const sel = boat.experience === lvl;
            return (
              <TouchableOpacity
                key={lvl}
                style={[styles.expBtn, sel && styles.expBtnSelected]}
                onPress={() => update('experience', lvl)}
                activeOpacity={0.8}
              >
                <Text style={[styles.expTxt, sel && styles.expTxtSelected]}>{lvl}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <FabNav active="boat" onChange={onNav} />
    </View>
  );
}

interface SliderCardProps {
  label: string;
  sublabel?: string;
  value: number;
  min: number; max: number; step: number;
  unit: string;
  onChange: (v: number) => void;
  rangeMin: string; rangeMax: string;
  accentColor?: string;
  cardStyle?: object;
  valueStyle?: object;
}

function SliderCard({ label, sublabel, value, min, max, step, unit, onChange, rangeMin, rangeMax, accentColor, cardStyle, valueStyle }: SliderCardProps) {
  return (
    <View style={[styles.sliderCard, cardStyle]}>
      <View style={styles.sliderTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sliderLabel}>{label}</Text>
          {sublabel && <Text style={styles.sliderSub}>{sublabel}</Text>}
        </View>
        <Text style={[styles.sliderValue, valueStyle]}>
          {typeof value === 'number' && step < 1 ? value.toFixed(1) : value}
          <Text style={styles.sliderUnit}> {unit}</Text>
        </Text>
      </View>
      <Slider
        style={{ width: '100%' }}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={accentColor ?? COLORS.brand}
        maximumTrackTintColor="rgba(0,0,0,0.15)"
        thumbTintColor={accentColor ?? COLORS.brand}
      />
      <View style={styles.sliderRange}>
        <Text style={styles.sliderRangeTxt}>{rangeMin}</Text>
        <Text style={styles.sliderRangeTxt}>{rangeMax}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: COLORS.paper },
  topBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 14, paddingBottom: 8 },
  topTitle:  { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.ink },
  scroll:        { flex: 1 },
  scrollContent: { padding: 18, paddingBottom: 120 },
  heading:   { fontSize: 32, fontFamily: FONTS.display, color: COLORS.ink, marginTop: 8, marginHorizontal: 4, marginBottom: 18 },

  heroCard: { backgroundColor: COLORS.ink, borderRadius: 28, padding: 20, marginBottom: 22 },
  heroTag:  { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.semiBold, letterSpacing: 0.12, textTransform: 'uppercase' },
  heroLength:{ fontSize: 32, fontFamily: FONTS.display, color: '#fff', marginTop: 8, lineHeight: 34 },
  heroUnit: { fontSize: 16, opacity: 0.6 },
  heroSub:  { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.regular, marginTop: 4 },

  sectionLabel: { fontSize: 11, fontFamily: FONTS.semiBold, color: COLORS.ink3, textTransform: 'uppercase', letterSpacing: 0.12, marginBottom: 12 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  typeCard: { width: '48%', padding: 14, borderRadius: 18, backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.hairline },
  typeCardSelected: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  typeLabel:{ fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.ink },
  typeLabelSelected:{ color: '#fff' },
  typeSub:  { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.ink3, marginTop: 4 },
  typeSubSelected:{ color: 'rgba(255,255,255,0.65)' },

  sliderCard:  { backgroundColor: COLORS.paper, borderRadius: 20, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: COLORS.hairline },
  sliderTop:   { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  sliderLabel: { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.ink },
  sliderSub:   { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.ink3, marginTop: 2 },
  sliderValue: { fontSize: 22, fontFamily: FONTS.display, color: COLORS.ink },
  sliderUnit:  { fontSize: 12, opacity: 0.6 },
  sliderRange: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  sliderRangeTxt:{ fontSize: 10, fontFamily: FONTS.mono, color: COLORS.ink4 },

  expRow: { flexDirection: 'row', gap: 8, marginBottom: 22 },
  expBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.hairline },
  expBtnSelected:{ backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  expTxt: { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.ink },
  expTxtSelected:{ color: '#fff' },
});
