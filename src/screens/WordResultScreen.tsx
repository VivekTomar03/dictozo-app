import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useStore } from '../store/useStore';
import { rf } from '../utils/responsive';
import { getWordDefinitions, getTranslation } from '../services/api';
import { BackIcon, EditIcon, SaveIcon, CheckIcon } from '../components/Icons';
import { Skeleton } from '../components/Skeleton';

const theme = {
  primary: '#2EBA72',
  primaryLight: '#E8F7F0',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  textDark: '#1A1A1A',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  error: '#EF4444',
};

type Tab = 'Definition' | 'Translation';

export const WordResultScreen = ({ word, onBack }: { word: string, onBack: () => void }) => {
  const [activeTab, setActiveTab] = useState<Tab>('Definition');
  const [loading, setLoading] = useState(true);
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [translation, setTranslation] = useState<any>(null);
  const [error, setError] = useState('');
  const [targetLang, setTargetLang] = useState(useStore.getState().language);

  const LANGUAGES = [
    { code: 'hi', name: 'Hindi' },
    { code: 'gu', name: 'Gujarati' },
    { code: 'mr', name: 'Marathi' },
    { code: 'bn', name: 'Bengali' },
    { code: 'pa', name: 'Punjabi' },
    { code: 'ta', name: 'Tamil' },
    { code: 'te', name: 'Telugu' },
    { code: 'kn', name: 'Kannada' },
    { code: 'ml', name: 'Malayalam' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
  ];

  const email = useStore(s => s.email);
  const plan = useStore(s => s.plan);
  const language = useStore(s => s.language);
  const favourites = useStore(s => s.favourites);
  const setFavourites = useStore(s => s.setFavourites);

  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customDefinition, setCustomDefinition] = useState('');

  React.useEffect(() => {
    if (activeTab === 'Definition') {
      loadDefinitions();
    } else {
      loadTranslation(targetLang);
    }
    // Check if word already in favourites
    if (favourites[word.toUpperCase()]) {
      setIsSaved(true);
    }
  }, [activeTab, word]);

  const handleLanguageChange = (langCode: string) => {
    setTargetLang(langCode);
    const { setLanguage } = useStore.getState();
    setLanguage(langCode);
    loadTranslation(langCode);
  };

  const loadDefinitions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getWordDefinitions(word);
      setDefinitions(Array.isArray(res) ? res : []);
    } catch (err) {
      setError('Failed to load definitions');
    } finally {
      setLoading(false);
    }
  };

  const loadTranslation = async (lang: string = targetLang) => {
    setLoading(true);
    setError('');
    try {
      const res = await getTranslation(word, lang);
      setTranslation(res);
    } catch (err) {
      setError('Failed to translate');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const wordKey = word.trim().toUpperCase();

    // 1. Check if already saved
    if (favourites[wordKey]) {
      Alert.alert('Already Saved', 'This word is already in your dictionary.');
      setIsSaved(true);
      return;
    }

    if (saving) return;

    // 2. Quota check
    const limit = plan?._sa ?? 20;
    if (Object.keys(favourites).length >= limit) {
      Alert.alert('Limit Reached', 'Save limit reached. Please upgrade your plan.');
      return;
    }

    setSaving(true);
    try {
      // 3. Prepare payload
      const entry = {
        data: definitions.length > 0 ? definitions : [{
          partOfSpeech: 'translation',
          definition: translation?.translatedText || 'No definition found.',
          examples: []
        }],
        url: 'mobile',
        savedAt: new Date().toISOString(),
      };

      const entryJson = JSON.stringify(entry);
      const nextFavs = { ...favourites, [wordKey]: entryJson };
      const nextFavsJson = JSON.stringify(nextFavs);

      // 4. Save to Server
      const { syncUser } = await import('../services/api');
      await syncUser(email, { favourites: nextFavsJson });

      // 5. Update local store and storage
      setFavourites(nextFavs);
      setIsSaved(true);

      // 6. Save to SQLite for assistant
      const { saveWord: saveToDb } = await import('../services/db');
      await saveToDb(word, definitions[0]?.definition || translation?.translatedText || '');

      // 7. Sync back from server to be sure
      const { getUser } = await import('../services/api');
      const res = await getUser(email);
      if (res.status && res.data) {
        const d = res.data;
        const favs = JSON.parse(d.favourites ?? '{}');
        const mast = JSON.parse(d.mastered ?? '{}');
        setFavourites(favs);
        const { setMastered } = useStore.getState();
        setMastered(mast);
      }

      Alert.alert('Success', 'Word saved successfully!');
    } catch (err) {
      console.error('Save error:', err);
      Alert.alert('Error', 'Failed to save word. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCustom = async () => {
    if (!customDefinition.trim()) {
      Alert.alert('Error', 'Please enter a definition');
      return;
    }

    const wordKey = word.trim().toUpperCase();

    // Check if already saved
    if (favourites[wordKey]) {
      Alert.alert('Already Saved', 'This word is already in your dictionary.');
      setCustomModalVisible(false);
      return;
    }

    setSaving(true);
    setCustomModalVisible(false);
    try {
      const entry = {
        data: [{
          definition: customDefinition.trim(),
          partOfSpeech: 'Custom Definition',
          examples: [],
          isCustom: true
        }],
        url: 'mobile',
        savedAt: new Date().toISOString(),
      };

      const entryJson = JSON.stringify(entry);
      const nextFavs = { ...favourites, [wordKey]: entryJson };
      const nextFavsJson = JSON.stringify(nextFavs);

      const { syncUser } = await import('../services/api');
      await syncUser(email, { favourites: nextFavsJson });

      setFavourites(nextFavs);
      setIsSaved(true);

      const { saveWord: saveToDb } = await import('../services/db');
      await saveToDb(word, customDefinition.trim());

      Alert.alert('Success', 'Custom definition saved!');
      setCustomDefinition('');
    } catch (err) {
      Alert.alert('Error', 'Failed to save custom definition');
    } finally {
      setSaving(false);
    }
  };

  const DefinitionSkeleton = () => (
    <View style={{ gap: 12 }}>
      {[1, 2, 3].map(i => (
        <View key={i} style={styles.defCard}>
          <Skeleton width="40%" height={20} style={{ marginBottom: 8 }} />
          <Skeleton width="90%" height={16} style={{ marginBottom: 4 }} />
          <Skeleton width="70%" height={16} />
        </View>
      ))}
    </View>
  );

  const TranslationSkeleton = () => (
    <View style={styles.transCard}>
      <Skeleton width="30%" height={16} style={{ marginBottom: 12 }} />
      <Skeleton width="80%" height={24} style={{ marginBottom: 8 }} />
      <Skeleton width="50%" height={14} />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <BackIcon size={28} color={theme.textDark} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.wordTitle}>{word}</Text>
      </View>

      <View style={styles.tabRow}>
        {(['Definition', 'Translation'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setActiveTab(t)}
            style={[styles.tab, activeTab === t && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === t && styles.activeTabText]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          activeTab === 'Definition' ? <DefinitionSkeleton /> : <TranslationSkeleton />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : activeTab === 'Definition' ? (
          Array.isArray(definitions) && definitions.length > 0 ? (
            definitions.map((def, i) => (
              <View key={i} style={styles.defCard}>
                <View style={styles.posBadge}>
                  <Text style={styles.posText}>{def.partOfSpeech}</Text>
                </View>
                <Text style={styles.definitionText}>{def.definition}</Text>
                {def.examples?.map((ex: string, j: number) => (
                  <Text key={j} style={styles.exampleText}>• {ex}</Text>
                ))}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No definitions found.</Text>
          )
        ) : (
          <View>
            <View style={styles.langSelector}>
              <Text style={styles.langLabel}>Translate to:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.langList}>
                {LANGUAGES.map(lang => (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => handleLanguageChange(lang.code)}
                    style={[styles.langBtn, targetLang === lang.code && styles.langBtnActive]}
                  >
                    <Text style={[styles.langBtnText, targetLang === lang.code && styles.langBtnTextActive]}>{lang.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.transCard}>
              <Text style={styles.transText}>{translation?.translatedText || '...'}</Text>
              <Text style={styles.sourceText}>Detected: {translation?.detectedSourceLanguage || 'en'}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() => setCustomModalVisible(true)}
        >
          <EditIcon size={20} color={theme.primary} />
          <Text style={styles.secondaryBtnText}>Custom Def</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.primaryBtn, isSaved && styles.disabledBtn]}
          onPress={handleSave}
          disabled={isSaved || saving}
        >
          {saving ? (
            <ActivityIndicator color={theme.surface} />
          ) : isSaved ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <CheckIcon size={20} color={theme.surface} strokeWidth={3} />
              <Text style={styles.primaryBtnText}>Saved</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <SaveIcon size={20} color={theme.surface} />
              <Text style={styles.primaryBtnText}>Save Word</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={customModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCustomModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Custom Definition</Text>
            <Text style={styles.modalSubTitle}>Enter your own definition for "{word}"</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Type definition here..."
              placeholderTextColor={theme.textMuted}
              multiline
              value={customDefinition}
              onChangeText={setCustomDefinition}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setCustomModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSubmitBtn]}
                onPress={handleSaveCustom}
              >
                <Text style={styles.modalSubmitText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border
  },
  backButton: { marginRight: 16 },
  backIcon: { fontSize: 28, color: theme.textDark },
  wordTitle: { fontSize: rf(28), fontWeight: 'bold', color: theme.textDark, textTransform: 'capitalize' },
  tabRow: { flexDirection: 'row', backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: theme.primary },
  tabText: { fontSize: rf(18), color: theme.textMuted, fontWeight: '600' },
  activeTabText: { color: theme.primary },
  content: { padding: 20 },
  defCard: {
    backgroundColor: theme.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.border
  },
  posBadge: {
    backgroundColor: theme.primaryLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 8
  },
  posText: { color: theme.primary, fontSize: rf(14), fontWeight: 'bold' },
  definitionText: { fontSize: rf(18), color: theme.textDark, lineHeight: rf(28), marginBottom: 8 },
  exampleText: { fontSize: rf(16), color: theme.textMuted, fontStyle: 'italic', marginBottom: 4 },
  transCard: {
    backgroundColor: theme.surface,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center'
  },
  transText: { fontSize: rf(32), fontWeight: 'bold', color: theme.primary, marginBottom: 8 },
  sourceText: { fontSize: rf(16), color: theme.textMuted },
  errorText: { color: theme.error, textAlign: 'center', marginTop: 40 },
  emptyText: { color: theme.textMuted, textAlign: 'center', marginTop: 40, fontSize: rf(18) },
  footer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    gap: 12
  },
  btn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryBtn: { backgroundColor: theme.primary },
  secondaryBtn: {
    backgroundColor: theme.primaryLight,
    borderWidth: 1,
    borderColor: theme.primary,
    flexDirection: 'row',
    gap: 8
  },
  primaryBtnText: { color: theme.surface, fontSize: rf(18), fontWeight: 'bold' },
  secondaryBtnText: { color: theme.primary, fontSize: rf(18), fontWeight: 'bold' },
  disabledBtn: { backgroundColor: '#9CA3AF' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4
  },
  modalTitle: { fontSize: rf(24), fontWeight: 'bold', color: theme.textDark, marginBottom: 8 },
  modalSubTitle: { fontSize: rf(16), color: theme.textMuted, marginBottom: 20 },
  modalInput: {
    backgroundColor: theme.background,
    borderRadius: 12,
    padding: 16,
    fontSize: rf(18),
    color: theme.textDark,
    height: 120,
    textAlignVertical: 'top',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.border
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalCancelBtn: { backgroundColor: theme.background },
  modalSubmitBtn: { backgroundColor: theme.primary },
  modalCancelText: { color: theme.textMuted, fontSize: rf(16), fontWeight: '600' },
  modalSubmitText: { color: theme.surface, fontSize: rf(16), fontWeight: 'bold' },
  langSelector: { marginBottom: 20 },
  langLabel: { fontSize: rf(14), fontWeight: 'bold', color: theme.textMuted, marginBottom: 10, marginLeft: 4 },
  langList: { gap: 8 },
  langBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  langBtnActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  langBtnText: { color: theme.textDark, fontSize: rf(14), fontWeight: '600' },
  langBtnTextActive: { color: theme.surface }
});
