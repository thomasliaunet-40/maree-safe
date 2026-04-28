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

          {/* Sliders — vent et vagues uniquement */}
          {activeBoat && !isCreating && (
            <>
              <Text style={styles.sectionLabel}>Seuils de sécurité</Text>
              <SliderCard
                label="Vent maximum"
                sublabel="Au-delà, sortie déconseillée"
                value={activeBoat.maxWind}
                min={10} max={45} step={1}
                unit="kn"
                onChange={v => updateBoat(activeIndex, 'maxWind', v)}
                rangeMin="10 kn" rangeMax="45 kn"
                accentColor={COLORS.sandInk}
                cardStyle={{ backgroundColor: COLORS.sand }}
                valueStyle={{ color: COLORS.sandInk }}
              />
              <SliderCard
                label="Vagues maximum"
                sublabel="Hauteur significative"
                value={activeBoat.maxWaves}
                min={0.5} max={4} step={0.1}
                unit="m"
                onChange={v => updateBoat(activeIndex, 'maxWaves', v)}
                rangeMin="0.5 m" rangeMax="4 m"
                accentColor={COLORS.tideInk}
                cardStyle={{ backgroundColor: COLORS.tide }}
                valueStyle={{ color: COLORS.tideInk }}
              />
            </>
          )}
        </ScrollView>

        <NavFade active="boat" onChange={onNav} />
      </View>
    </KeyboardAvoidingView>
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
          {step < 1 ? value.toFixed(1) : value}
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

  sliderCard:    { backgroundColor: COLORS.paper, borderRadius: 20, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: COLORS.hairline },
  sliderTop:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  sliderLabel:   { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.ink },
  sliderSub:     { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.ink3, marginTop: 2 },
  sliderValue:   { fontSize: 22, fontFamily: FONTS.display, color: COLORS.ink },
  sliderUnit:    { fontSize: 12, opacity: 0.6 },
  sliderRange:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  sliderRangeTxt:{ fontSize: 10, fontFamily: FONTS.mono, color: COLORS.ink4 },
});
