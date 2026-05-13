import React, { useRef, useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  useWindowDimensions, NativeScrollEvent, NativeSyntheticEvent,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import Svg, { Path, Line } from 'react-native-svg';
import { BoatSettings, BOAT_DEFAULT } from '../types';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import Icon from '../components/Icon';
import NavFade, { Screen } from '../components/NavFade';

const SLOT_COUNT = 3;

interface Props {
  boats: (BoatSettings | null)[];
  activeIndex: number;
  onBoatsChange: (boats: (BoatSettings | null)[]) => void;
  onActiveIndexChange: (index: number) => void;
  onNav: (s: Screen) => void;
}

export default function BoatScreen({ boats, activeIndex, onBoatsChange, onActiveIndexChange, onNav }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const carouselRef = useRef<ScrollView>(null);

  // Formulaire de création inline
  const [creatingIndex, setCreatingIndex] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formDraft, setFormDraft] = useState(1.8);

  // Confirmation de suppression inline
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);

  const openCreation = (index: number) => {
    setFormName('');
    setFormDraft(1.8);
    setCreatingIndex(index);
  };

  const cancelCreation = () => setCreatingIndex(null);

  const confirmCreation = (index: number) => {
    const next = [...boats] as (BoatSettings | null)[];
    next[index] = {
      name: formName.trim() || 'Mon voilier',
      draft: formDraft,
      maxWind: BOAT_DEFAULT.maxWind,
      maxWaves: BOAT_DEFAULT.maxWaves,
      warnWind: BOAT_DEFAULT.warnWind,
      warnWaves: BOAT_DEFAULT.warnWaves,
    };
    onBoatsChange(next);
    setCreatingIndex(null);
  };

  const confirmDelete = (index: number) => {
    const next = [...boats] as (BoatSettings | null)[];
    next[index] = null;
    onBoatsChange(next);
    setConfirmDeleteIndex(null);
  };

  const updateBoat = (index: number, key: keyof BoatSettings, value: any) => {
    const next = [...boats] as (BoatSettings | null)[];
    next[index] = { ...(next[index] as BoatSettings), [key]: value };
    onBoatsChange(next);
  };

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    const clamped = Math.max(0, Math.min(SLOT_COUNT - 1, index));
    if (clamped !== activeIndex) onActiveIndexChange(clamped);
  }, [screenWidth, activeIndex, onActiveIndexChange]);

  const activeBoat = boats[activeIndex];
  const isCreating = creatingIndex === activeIndex;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => onNav('home')} activeOpacity={0.7}>
            <Icon name="chevronLeft" size={20} stroke={COLORS.ink2} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Mon voilier</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.heading}>Réglages</Text>

          {/* Carousel */}
          <View style={{ marginHorizontal: -18 }}>
            <ScrollView
              ref={carouselRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScroll}
              contentOffset={{ x: activeIndex * screenWidth, y: 0 }}
              scrollEventThrottle={16}
              scrollEnabled={creatingIndex === null}
            >
              {Array.from({ length: SLOT_COUNT }).map((_, i) => {
                const boat = boats[i];
                const creating = creatingIndex === i;

                return (
                  <View key={i} style={{ width: screenWidth, paddingHorizontal: 18 }}>

                    {/* Confirmation de suppression */}
                    {boat && !creating && confirmDeleteIndex === i && (
                      <View style={styles.heroCard}>
                        <Text style={styles.heroTag}>Supprimer ce bateau ?</Text>
                        <Text style={styles.heroName}>{boat.name}</Text>
                        <Text style={styles.deleteWarning}>
                          Cette action est irréversible. Tous les réglages seront perdus.
                        </Text>
                        <View style={styles.formActions}>
                          <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() => setConfirmDeleteIndex(null)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.cancelTxt}>Annuler</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => confirmDelete(i)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.confirmTxt}>Supprimer</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Slot rempli */}
                    {boat && !creating && confirmDeleteIndex !== i && (
                      <View style={styles.heroCard}>
                        <View style={styles.heroHeader}>
                          <Text style={styles.heroTag}>Bateau {i + 1}</Text>
                          <TouchableOpacity
                            onPress={() => setConfirmDeleteIndex(i)}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          >
                            <Icon name="trash" size={16} stroke="rgba(255,255,255,0.45)" />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.heroName}>{boat.name}</Text>
                        <Text style={styles.heroSub}>Tirant d'eau · {boat.draft.toFixed(1)}m</Text>
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
                    )}

                    {/* Formulaire de création inline */}
                    {creating && (
                      <View style={styles.heroCard}>
                        <Text style={styles.heroTag}>Nouveau bateau</Text>

                        <TextInput
                          style={styles.nameInput}
                          placeholder="Nom du bateau"
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          value={formName}
                          onChangeText={setFormName}
                          autoFocus
                          returnKeyType="done"
                        />

                        <Text style={styles.draftLabel}>
                          Tirant d'eau · <Text style={styles.draftValue}>{formDraft.toFixed(1)} m</Text>
                        </Text>
                        <Slider
                          style={{ width: '100%', marginTop: 4 }}
                          minimumValue={0.4}
                          maximumValue={3.5}
                          step={0.1}
                          value={formDraft}
                          onValueChange={setFormDraft}
                          minimumTrackTintColor="rgba(255,255,255,0.8)"
                          maximumTrackTintColor="rgba(255,255,255,0.2)"
                          thumbTintColor="#fff"
                        />

                        <View style={styles.formActions}>
                          <TouchableOpacity style={styles.cancelBtn} onPress={cancelCreation} activeOpacity={0.7}>
                            <Text style={styles.cancelTxt}>Annuler</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.confirmBtn} onPress={() => confirmCreation(i)} activeOpacity={0.8}>
                            <Text style={styles.confirmTxt}>Ajouter</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Slot vide */}
                    {!boat && !creating && (
                      <TouchableOpacity
                        style={styles.heroCardEmpty}
                        onPress={() => openCreation(i)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.addBtn}>
                          <Icon name="plus" size={30} stroke="rgba(255,255,255,0.65)" strokeWidth={1.5} />
                        </View>
                        <Text style={styles.addTxt}>Ajouter mon bateau</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {/* Dots */}
          <View style={styles.dots}>
            {Array.from({ length: SLOT_COUNT }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === activeIndex && styles.dotActive,
                  boats[i] && i !== activeIndex && styles.dotFilled,
                ]}
              />
            ))}
          </View>

          {/* Sliders — vent et vagues */}
          {activeBoat && !isCreating && (
            <>
              <Text style={styles.sectionLabel}>Seuils de sécurité</Text>
              <RangeSliderCard
                label="Vent"
                unit="kn"
                warn={activeBoat.warnWind ?? BOAT_DEFAULT.warnWind!}
                max={activeBoat.maxWind}
                rangeMin={10} rangeMax={45} step={1}
                onWarnChange={v => {
                  const next = [...boats] as (BoatSettings | null)[];
                  const b = next[activeIndex] as BoatSettings;
                  next[activeIndex] = { ...b, warnWind: v, maxWind: Math.max(b.maxWind, v + 1) };
                  onBoatsChange(next);
                }}
                onMaxChange={v => {
                  const next = [...boats] as (BoatSettings | null)[];
                  const b = next[activeIndex] as BoatSettings;
                  next[activeIndex] = { ...b, maxWind: v, warnWind: Math.min(b.warnWind ?? BOAT_DEFAULT.warnWind!, v - 1) };
                  onBoatsChange(next);
                }}
              />
              <RangeSliderCard
                label="Vagues"
                unit="m"
                warn={activeBoat.warnWaves ?? BOAT_DEFAULT.warnWaves!}
                max={activeBoat.maxWaves}
                rangeMin={0.2} rangeMax={4} step={0.1}
                onWarnChange={v => {
                  const next = [...boats] as (BoatSettings | null)[];
                  const b = next[activeIndex] as BoatSettings;
                  next[activeIndex] = { ...b, warnWaves: v, maxWaves: Math.max(b.maxWaves, parseFloat((v + 0.1).toFixed(1))) };
                  onBoatsChange(next);
                }}
                onMaxChange={v => {
                  const next = [...boats] as (BoatSettings | null)[];
                  const b = next[activeIndex] as BoatSettings;
                  next[activeIndex] = { ...b, maxWaves: v, warnWaves: Math.min(b.warnWaves ?? BOAT_DEFAULT.warnWaves!, parseFloat((v - 0.1).toFixed(1))) };
                  onBoatsChange(next);
                }}
              />
              <TouchableOpacity
                style={styles.validateBtn}
                onPress={() => onNav('home')}
                activeOpacity={0.85}
              >
                <Icon name="check" size={18} stroke="#fff" strokeWidth={2.5} />
                <Text style={styles.validateTxt}>Valider les réglages</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        <NavFade active="boat" onChange={onNav} />
      </View>
    </KeyboardAvoidingView>
  );
}

interface RangeSliderCardProps {
  label: string;
  unit: string;
  warn: number;
  max: number;
  rangeMin: number;
  rangeMax: number;
  step: number;
  onWarnChange: (v: number) => void;
  onMaxChange: (v: number) => void;
}

function RangeSliderCard({ label, unit, warn, max, rangeMin, rangeMax, step, onWarnChange, onMaxChange }: RangeSliderCardProps) {
  const total = rangeMax - rangeMin;
  const fmt = (v: number) => step < 1 ? v.toFixed(1) : String(Math.round(v));
  const greenPct = Math.max(0, ((warn - rangeMin) / total) * 100);
  const orangePct = Math.max(0, ((max - warn) / total) * 100);
  const redPct = Math.max(0, ((rangeMax - max) / total) * 100);

  return (
    <View style={styles.sliderCard}>
      {/* Header */}
      <View style={styles.sliderTop}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={[styles.thresholdDot, { backgroundColor: COLORS.warn }]} />
            <Text style={styles.thresholdVal}>{fmt(warn)} {unit}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={[styles.thresholdDot, { backgroundColor: COLORS.stop }]} />
            <Text style={styles.thresholdVal}>{fmt(max)} {unit}</Text>
          </View>
        </View>
      </View>

      {/* Barre colorée */}
      <View style={styles.colorBar}>
        <View style={[styles.colorSeg, { flex: greenPct, backgroundColor: COLORS.go }]} />
        <View style={[styles.colorSeg, { flex: orangePct, backgroundColor: COLORS.warn }]} />
        <View style={[styles.colorSeg, { flex: redPct, backgroundColor: COLORS.stop }]} />
      </View>

      {/* Slider vigilance (orange) */}
      <View style={styles.thresholdRow}>
        <View style={[styles.thresholdDot, { backgroundColor: COLORS.warn }]} />
        <Text style={styles.thresholdRowLabel}>Orange dès <Text style={{ color: COLORS.ink, fontFamily: FONTS.semiBold }}>{fmt(warn)} {unit}</Text></Text>
      </View>
      <Slider
        style={{ width: '100%', marginTop: -4 }}
        minimumValue={rangeMin}
        maximumValue={rangeMax}
        step={step}
        value={warn}
        onValueChange={v => onWarnChange(Math.min(parseFloat(v.toFixed(1)), parseFloat((max - step).toFixed(1))))}
        minimumTrackTintColor={COLORS.go}
        maximumTrackTintColor="rgba(0,0,0,0.1)"
        thumbTintColor={COLORS.warn}
      />

      {/* Slider danger (rouge) */}
      <View style={[styles.thresholdRow, { marginTop: 6 }]}>
        <View style={[styles.thresholdDot, { backgroundColor: COLORS.stop }]} />
        <Text style={styles.thresholdRowLabel}>Rouge dès <Text style={{ color: COLORS.ink, fontFamily: FONTS.semiBold }}>{fmt(max)} {unit}</Text></Text>
      </View>
      <Slider
        style={{ width: '100%', marginTop: -4 }}
        minimumValue={rangeMin}
        maximumValue={rangeMax}
        step={step}
        value={max}
        onValueChange={v => onMaxChange(Math.max(parseFloat(v.toFixed(1)), parseFloat((warn + step).toFixed(1))))}
        minimumTrackTintColor={COLORS.warn}
        maximumTrackTintColor="rgba(0,0,0,0.1)"
        thumbTintColor={COLORS.stop}
      />

      <View style={styles.sliderRange}>
        <Text style={styles.sliderRangeTxt}>{fmt(rangeMin)} {unit}</Text>
        <Text style={styles.sliderRangeTxt}>{fmt(rangeMax)} {unit}</Text>
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

  // Hero card remplie
  heroCard:   { backgroundColor: COLORS.ink, borderRadius: 28, padding: 22, minHeight: 180 },
  heroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  heroTag:    { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontFamily: FONTS.semiBold, letterSpacing: 0.12, textTransform: 'uppercase' },
  heroName:   { fontSize: 28, fontFamily: FONTS.display, color: '#fff', marginTop: 6, lineHeight: 32 },
  heroSub:    { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.regular, marginTop: 4 },

  // Formulaire création
  nameInput: {
    fontSize: 24, fontFamily: FONTS.display, color: '#fff',
    marginTop: 14, marginBottom: 20,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.25)',
    paddingBottom: 8,
  },
  draftLabel: { fontSize: 13, fontFamily: FONTS.semiBold, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  draftValue: { color: '#fff', fontFamily: FONTS.display, fontSize: 16 },
  formActions:{ flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelBtn:  { flex: 1, paddingVertical: 11, borderRadius: 14, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  cancelTxt:  { fontSize: 14, fontFamily: FONTS.semiBold, color: 'rgba(255,255,255,0.55)' },
  confirmBtn:    { flex: 2, paddingVertical: 11, borderRadius: 14, alignItems: 'center', backgroundColor: COLORS.brand },
  confirmTxt:    { fontSize: 14, fontFamily: FONTS.semiBold, color: '#fff' },
  deleteBtn:     { flex: 2, paddingVertical: 11, borderRadius: 14, alignItems: 'center', backgroundColor: COLORS.stop },
  deleteWarning: { fontSize: 13, fontFamily: FONTS.regular, color: 'rgba(255,255,255,0.55)', marginTop: 10, marginBottom: 4, lineHeight: 18 },

  // Hero card vide
  heroCardEmpty: {
    height: 180, backgroundColor: COLORS.ink, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  addBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  addTxt: { fontSize: 14, fontFamily: FONTS.semiBold, color: 'rgba(255,255,255,0.5)' },

  // Dots
  dots:      { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14, marginBottom: 24 },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.hairline },
  dotActive: { width: 20, borderRadius: 3, backgroundColor: COLORS.ink },
  dotFilled: { backgroundColor: COLORS.ink3 },

  sectionLabel: { fontSize: 11, fontFamily: FONTS.semiBold, color: COLORS.ink3, textTransform: 'uppercase', letterSpacing: 0.12, marginBottom: 12 },

  sliderCard:      { backgroundColor: COLORS.paper, borderRadius: 20, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: COLORS.hairline },
  sliderTop:       { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  sliderLabel:     { fontSize: 15, fontFamily: FONTS.semiBold, color: COLORS.ink },
  sliderRange:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  sliderRangeTxt:  { fontSize: 10, fontFamily: FONTS.mono, color: COLORS.ink4 },
  colorBar:        { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 14 },
  colorSeg:        { height: 8 },
  thresholdDot:    { width: 8, height: 8, borderRadius: 4 },
  thresholdVal:    { fontSize: 12, fontFamily: FONTS.mono, color: COLORS.ink3 },
  thresholdRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  thresholdRowLabel: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.ink3 },

  validateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginTop: 8, marginBottom: 4,
    backgroundColor: COLORS.ink, borderRadius: 20, paddingVertical: 16,
  },
  validateTxt: { fontSize: 15, fontFamily: FONTS.semiBold, color: '#fff' },
});
