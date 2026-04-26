import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

interface Props {
  visible: boolean;
  currentKey: string;
  onSave: (key: string) => void;
  onDismiss: () => void;
}

export default function ApiKeyModal({ visible, currentKey, onSave, onDismiss }: Props) {
  const [key, setKey] = useState(currentKey);

  const handleSave = () => {
    onSave(key.trim());
    onDismiss();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Clé API Marée</Text>
          <TouchableOpacity onPress={onDismiss}>
            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Les données de marée françaises sont fournies par{' '}
              <Text style={styles.link} onPress={() => Linking.openURL('https://api-maree.fr')}>
                api-maree.fr
              </Text>
              {'. '}
              Inscrivez-vous gratuitement pour obtenir une clé API.
            </Text>
          </View>

          <Text style={styles.label}>Votre clé API</Text>
          <TextInput
            style={styles.input}
            value={key}
            onChangeText={setKey}
            placeholder="Entrez votre clé API (32 caractères)"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
          />

          <Text style={styles.hint}>
            Sans clé valide, les données de marée ne seront pas disponibles. La météo marine
            reste accessible sans clé.
          </Text>

          <TouchableOpacity
            style={[styles.saveButton, !key.trim() && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!key.trim()}
          >
            <Text style={styles.saveButtonText}>Enregistrer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => Linking.openURL('https://api-maree.fr')}
          >
            <Ionicons name="open-outline" size={14} color={COLORS.primary} />
            <Text style={styles.registerButtonText}>Obtenir une clé gratuite</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.25)',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  link: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: 'monospace' as const,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  registerButtonText: {
    fontSize: 14,
    color: COLORS.primary,
  },
});
