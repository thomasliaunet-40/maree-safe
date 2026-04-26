import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  SafeAreaView,
  SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Port } from '../types';
import { COLORS } from '../constants/colors';
import { ALL_PORTS, REGIONS, PORTS_BY_REGION } from '../constants/ports';

interface Props {
  selectedPort: Port;
  onSelect: (port: Port) => void;
}

export default function PortSelector({ selectedPort, onSelect }: Props) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');

  const sections = search.trim()
    ? [
        {
          title: 'Résultats',
          data: ALL_PORTS.filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.region.toLowerCase().includes(search.toLowerCase())
          ),
        },
      ]
    : REGIONS.map(region => ({
        title: region,
        data: PORTS_BY_REGION[region] ?? [],
      }));

  const handleSelect = (port: Port) => {
    onSelect(port);
    setVisible(false);
    setSearch('');
  };

  return (
    <>
      <TouchableOpacity style={styles.selector} onPress={() => setVisible(true)}>
        <Ionicons name="location" size={16} color={COLORS.primary} />
        <Text style={styles.selectorText} numberOfLines={1}>
          {selectedPort.name}
        </Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choisir un port</Text>
            <TouchableOpacity onPress={() => { setVisible(false); setSearch(''); }}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Recherche */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={16} color={COLORS.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un port..."
              placeholderTextColor={COLORS.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Liste */}
          <SectionList
            sections={sections}
            keyExtractor={item => item.id}
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
            )}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.portItem,
                  item.id === selectedPort.id && styles.portItemSelected,
                ]}
                onPress={() => handleSelect(item)}
              >
                <View style={styles.portInfo}>
                  <Text style={styles.portName}>{item.name}</Text>
                  <Text style={styles.portRegion}>{item.region}</Text>
                </View>
                {item.id === selectedPort.id && (
                  <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            stickySectionHeadersEnabled
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: 200,
  },
  selectorText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  modal: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  sectionHeader: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  portItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  portItemSelected: {
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  portInfo: {
    flex: 1,
  },
  portName: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  portRegion: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 20,
  },
});
