import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, NativeModules, AppState, TextInput, Alert, Linking, Platform } from 'react-native';
import { useStore } from '../store/useStore';
import {
  TrashIcon,
  CheckIcon,
  DownloadIcon,
  SearchIcon,
  FilterIcon,
  AccessibilityIcon,
  OverlayIcon,
  InfoIcon,
  ChevronRightIcon,
  CrownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  StarIcon
} from '../components/Icons';
import { PermissionModal } from '../components/PermissionModal';
import { rf, rs } from '../utils/responsive';
import { exportToCSV } from '../utils/export';

const { DictozoModule } = NativeModules;

const theme = {
  primary: '#2EBA72',
  primaryLight: '#E8F7F0',
  secondary: '#1A1A1A',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  textDark: '#1A1A1A',
  textMuted: '#6B7280',
  border: '#F1F5F9',
  warning: '#FFFBEB',
  warningText: '#D97706',
  danger: '#FEE2E2',
  dangerText: '#EF4444',
};

export const SavedWordsScreen = () => {
  const [words, setWords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAssistantEnabled, setIsAssistantEnabled] = useState(false);
  const [hasOverlayPermission, setHasOverlayPermission] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'accessibility' | 'overlay'>('accessibility');
  const [isPermissionExpanded, setIsPermissionExpanded] = useState(false);

  const email = useStore(s => s.email);
  const plan = useStore(s => s.plan);
  const favourites = useStore(s => s.favourites);
  const mastered = useStore(s => s.mastered);
  const setFavourites = useStore(s => s.setFavourites);
  const setMastered = useStore(s => s.setMastered);
  const setPlanName = useStore(s => s.setPlanName);
  const setTrChars = useStore(s => s.setTrChars);

  useEffect(() => {
    loadWords();
    checkPermissions();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkPermissions();
        loadWords();
      }
    });

    return () => subscription.remove();
  }, [favourites, mastered]);

  const checkPermissions = async () => {
    try {
      const a11y = await DictozoModule.checkAccessibilityPermission();
      setIsAssistantEnabled(a11y);
      const overlay = await DictozoModule.checkOverlayPermission();
      setHasOverlayPermission(overlay);
    } catch (e) {
      console.warn(e);
    }
  };

  const syncWithServer = async () => {
    setRefreshing(true);
    try {
      const { getUser } = await import('../services/api');
      const { AppStorage } = await import('../services/storage');
      const res = await getUser(email);
      if (res.status && res.data) {
        const d = res.data;
        const favs = JSON.parse(d.favourites ?? '{}');
        const mast = JSON.parse(d.mastered ?? '{}');
        setFavourites(favs);
        setMastered(mast);
        setPlanName(d.plan_name);
        setTrChars(d.tr_chars);
        AppStorage.setFavourites(favs);
        AppStorage.setMastered(mast);
        AppStorage.setPlanName(d.plan_name);
        AppStorage.setTranslationChars(d.tr_chars);
      }
    } catch (e) {
      console.warn('Failed to sync with server:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const loadWords = () => {
    const list = Object.keys(favourites).map(word => {
      const raw = favourites[word];
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const definitions = parsed.data?.map((d: any) => 
          `${d.partOfSpeech ? `[${d.partOfSpeech}] ` : ''}${d.definition}`
        ).join('\n\n') || parsed.translatedText || 'No definition found.';

        return {
          id: word,
          word,
          definition: definitions,
          savedAt: parsed.savedAt,
          raw
        };
      } catch {
        return { id: word, word, definition: 'No definition found.', savedAt: '', raw: '' };
      }
    }).sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

    const filtered = list.filter(item => !mastered[item.word.toUpperCase()]);
    setWords(filtered);
  };

  const handleMaster = async (word: string, originalData: string) => {
    try {
      const wordKey = word.toUpperCase();
      const nextMastered = { ...mastered, [wordKey]: originalData };
      const nextFavs = { ...favourites };
      delete nextFavs[wordKey];

      const { syncUser } = await import('../services/api');
      await syncUser(email, {
        mastered: JSON.stringify(nextMastered),
        favourites: JSON.stringify(nextFavs)
      });

      setMastered(nextMastered);
      setFavourites(nextFavs);
      syncWithServer();
    } catch (err) {
      Alert.alert('Error', 'Failed to update mastered words on server');
    }
  };

  const handleDelete = async (word: string) => {
    try {
      const wordKey = word.toUpperCase();
      const { deleteWords } = await import('../services/api');
      await deleteWords(email, [wordKey]);
      const nextFavs = { ...favourites };
      delete nextFavs[wordKey];
      setFavourites(nextFavs);
      syncWithServer();
    } catch (err) {
      Alert.alert('Error', 'Failed to delete word');
    }
  };

  const toggleSelection = (word: string) => {
    const next = new Set(selectedWords);
    if (next.has(word)) next.delete(word);
    else next.add(word);
    setSelectedWords(next);
  };

  const handleBatchMaster = async () => {
    if (selectedWords.size === 0) return;
    try {
      const wordsToMaster = Array.from(selectedWords);
      let nextMastered = { ...mastered };
      let nextFavs = { ...favourites };

      wordsToMaster.forEach(w => {
        const key = w.toUpperCase();
        nextMastered[key] = favourites[key];
        delete nextFavs[key];
      });

      const { syncUser } = await import('../services/api');
      await syncUser(email, {
        mastered: JSON.stringify(nextMastered),
        favourites: JSON.stringify(nextFavs)
      });

      setMastered(nextMastered);
      setFavourites(nextFavs);
      setSelectedWords(new Set());
      syncWithServer();
    } catch (err) {
      Alert.alert('Error', 'Failed to master selected words');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedWords.size === 0) return;
    Alert.alert('Delete Selected', `Delete ${selectedWords.size} selected words?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { deleteWords } = await import('../services/api');
            const wordsToDelete = Array.from(selectedWords).map(w => w.toUpperCase());
            await deleteWords(email, wordsToDelete);

            const nextFavs = { ...favourites };
            wordsToDelete.forEach(w => delete nextFavs[w]);
            setFavourites(nextFavs);
            setSelectedWords(new Set());
            syncWithServer();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete selected words');
          }
        }
      }
    ]);
  };


  const handleDeleteAll = () => {
    Alert.alert('Delete All', 'Are you sure you want to delete all saved words?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete All',
        style: 'destructive',
        onPress: async () => {
          try {
            const { deleteAllWords } = await import('../services/api');
            await deleteAllWords(email);
            setFavourites({});
            loadWords();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete all words');
          }
        },
      },
    ]);
  };

  const handleAssistantSetup = (type?: 'accessibility' | 'overlay') => {
    if (Platform.OS === 'android') {
      if (type) {
        setModalType(type);
        setModalVisible(true);
      } else {
        if (!isAssistantEnabled) {
          setModalType('accessibility');
          setModalVisible(true);
        } else if (!hasOverlayPermission) {
          setModalType('overlay');
          setModalVisible(true);
        }
      }
    } else {
      Linking.openSettings();
    }
  };

  const openNativeSettings = () => {
    setModalVisible(false);
    if (modalType === 'accessibility') {
      DictozoModule.openAccessibilitySettings();
    } else {
      DictozoModule.openOverlaySettings();
    }
  };

  const filteredWords = words.filter(w =>
    w.word.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }: { item: any }) => {
    const isSelected = selectedWords.has(item.word);
    return (
      <TouchableOpacity
        onPress={() => toggleSelection(item.word)}
        activeOpacity={0.7}
        style={[styles.card, isSelected && styles.selectedCard]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
              {isSelected && <CheckIcon size={rs(12)} color="#FFF" strokeWidth={4} />}
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.wordRow}>
              <Text style={styles.wordText}>{item.word}</Text>
              {!isSelected && (
                <TouchableOpacity onPress={() => handleDelete(item.word)} style={styles.cardTrashBtn}>
                  <TrashIcon size={rs(20)} color={theme.dangerText} />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.definitionText}>{item.definition}</Text>

            {!isSelected && (
              <View style={styles.cardFooter}>
                <TouchableOpacity
                  onPress={() => handleMaster(item.word, item.raw)}
                  style={styles.markMasteredBtn}
                >
                  <StarIcon size={rs(14)} color={theme.textMuted} strokeWidth={3} />
                  <Text style={styles.markMasteredText}>Mark as Mastered</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Saved Words</Text>
            <Text style={styles.headerSubtitle}>{words.length} / {plan?._sa ?? 20} words</Text>
          </View>
          <View style={styles.headerActions}>
            {selectedWords.size > 0 ? (
              <>
                <TouchableOpacity style={styles.headerActionBtn} onPress={handleBatchMaster}>
                  <View style={styles.actionIconContainer}>
                    <CrownIcon size={rs(24)} color={theme.primary} />
                  </View>
                  <Text style={styles.actionText}>Master ({selectedWords.size})</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerActionBtn} onPress={handleBatchDelete}>
                  <View style={styles.actionIconContainerDanger}>
                    <TrashIcon size={rs(24)} color={theme.dangerText} />
                  </View>
                  <Text style={styles.actionText}>Delete ({selectedWords.size})</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.headerActionBtn} onPress={() => exportToCSV(words)}>
                  <View style={styles.actionIconContainer}>
                    <DownloadIcon size={rs(24)} color={theme.primary} />
                  </View>
                  <Text style={styles.actionText}>Download</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerActionBtn} onPress={handleDeleteAll}>
                  <View style={styles.actionIconContainerDanger}>
                    <TrashIcon size={rs(24)} color={theme.dangerText} />
                  </View>
                  <Text style={styles.actionText}>Delete All</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.searchContainer}>
          <SearchIcon size={rs(20)} color={theme.textMuted} />
          <TextInput
            placeholder="Search saved words..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          <FilterIcon size={rs(20)} color={theme.textMuted} />
        </View>
      </View>

      <FlatList
        data={filteredWords}
        keyExtractor={(item) => item.word}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={syncWithServer}
        extraData={selectedWords}
        ListHeaderComponent={
          (!isAssistantEnabled || !hasOverlayPermission) ? (
            <View style={styles.permissionBox}>
              <TouchableOpacity
                style={styles.permissionHeader}
                onPress={() => setIsPermissionExpanded(!isPermissionExpanded)}
                activeOpacity={0.7}
              >
                <InfoIcon size={rs(24)} color={theme.warningText} />
                <Text style={styles.permissionTitle}>Assistant needs setup to work</Text>
                {isPermissionExpanded ? (
                  <ChevronUpIcon size={rs(20)} color={theme.warningText} />
                ) : (
                  <ChevronDownIcon size={rs(20)} color={theme.warningText} />
                )}
              </TouchableOpacity>

              {isPermissionExpanded && (
                <>
                  <Text style={styles.permissionDesc}>
                    To show meanings and help you while using other apps, please enable the following permissions:
                  </Text>

                  <View style={styles.permissionList}>
                    <View style={styles.permissionItem}>
                      <View style={styles.permissionIconCircle}>
                        <AccessibilityIcon size={rs(20)} color={theme.primary} />
                      </View>
                      <View style={styles.permissionInfo}>
                        <Text style={styles.permissionName}>Accessibility Permission</Text>
                        <Text style={styles.permissionSub}>Helps assistant read the text on your screen.</Text>
                      </View>
                      <TouchableOpacity style={styles.enableBtn} onPress={() => handleAssistantSetup('accessibility')}>
                        <Text style={styles.enableText}>Enable</Text>
                        <ChevronRightIcon size={rs(16)} color={theme.primary} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.permissionItem}>
                      <View style={styles.permissionIconCircle}>
                        <OverlayIcon size={rs(20)} color={theme.primary} />
                      </View>
                      <View style={styles.permissionInfo}>
                        <Text style={styles.permissionName}>Display Over Other Apps</Text>
                        <Text style={styles.permissionSub}>Allows assistant to show meanings on top of other apps.</Text>
                      </View>
                      <TouchableOpacity style={styles.enableBtn} onPress={() => handleAssistantSetup('overlay')}>
                        <Text style={styles.enableText}>Enable</Text>
                        <ChevronRightIcon size={rs(16)} color={theme.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No saved words yet.</Text>
          </View>
        }
      />


      <PermissionModal
        visible={modalVisible}
        type={modalType}
        onClose={() => setModalVisible(false)}
        onEnable={openNativeSettings}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    padding: rs(20),
    backgroundColor: theme.surface,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: rs(20),
  },
  headerTitle: {
    fontSize: rf(24),
    fontWeight: 'bold',
    color: theme.textDark,
  },
  headerSubtitle: {
    fontSize: rf(14),
    color: theme.textMuted,
    marginTop: rs(2),
  },
  headerActions: {
    flexDirection: 'row',
    gap: rs(16),
  },
  headerActionBtn: {
    alignItems: 'center',
    gap: rs(4),
  },
  checkbox: {
    width: rs(26),
    height: rs(26),
    borderRadius: rs(13),
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.surface,
  },
  checkboxActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  actionIconContainer: {
    width: rs(48),
    height: rs(48),
    borderRadius: rs(12),
    backgroundColor: theme.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconContainerDanger: {
    width: rs(48),
    height: rs(48),
    borderRadius: rs(12),
    backgroundColor: theme.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: rf(12),
    fontWeight: '600',
    color: theme.textDark,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: rs(16),
    paddingHorizontal: rs(16),
    paddingVertical: rs(12),
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: rs(12),
    fontSize: rf(16),
    color: theme.textDark,
    padding: 0,
  },
  permissionBox: {
    backgroundColor: theme.warning,
    marginHorizontal: rs(20),
    marginTop: rs(20),
    marginBottom: rs(8),
    borderRadius: rs(24),
    padding: rs(24),
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(14),
    marginBottom: rs(16),
  },
  permissionTitle: {
    fontSize: rf(16),
    fontWeight: 'bold',
    color: theme.warningText,
    flex: 1,
    lineHeight: rf(22),
  },
  permissionDesc: {
    fontSize: rf(13),
    color: '#92400E',
    lineHeight: rf(18),
    marginBottom: rs(20),
  },
  permissionList: {
    gap: rs(16),
  },
  permissionItem: {
    backgroundColor: theme.surface,
    borderRadius: rs(20),
    padding: rs(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(14),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  permissionIconCircle: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    backgroundColor: theme.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionInfo: {
    flex: 1,
  },
  permissionName: {
    fontSize: rf(15),
    fontWeight: 'bold',
    color: theme.textDark,
  },
  permissionSub: {
    fontSize: rf(12),
    color: theme.textMuted,
    marginTop: rs(2),
  },
  enableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    backgroundColor: theme.primaryLight,
    paddingHorizontal: rs(12),
    paddingVertical: rs(8),
    borderRadius: rs(10),
  },
  enableText: {
    fontSize: rf(14),
    fontWeight: 'bold',
    color: theme.primary,
  },
  listContent: {
    paddingBottom: rs(120),
  },
  card: {
    backgroundColor: theme.surface,
    marginHorizontal: rs(20),
    marginBottom: rs(16),
    borderRadius: rs(20),
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  selectedCard: {
    borderColor: theme.primary,
    backgroundColor: '#F0FDF4',
  },
  cardHeader: {
    flexDirection: 'row',
    padding: rs(16),
    gap: rs(16), // Added gap to prevent overlap
    alignItems: 'flex-start',
  },
  cardBody: {
    flex: 1,
  },
  wordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rs(6),
  },
  wordText: {
    fontSize: rf(16),
    fontWeight: 'bold',
    color: theme.textDark,
    flex: 1,
    marginRight: rs(12),
  },
  definitionText: {
    fontSize: rf(13),
    color: theme.textMuted,
    lineHeight: rf(18),
    marginBottom: rs(12),
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  markMasteredBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    paddingHorizontal: rs(16),
    paddingVertical: rs(8),
    borderRadius: rs(12),
    borderWidth: 1.5, // Slightly thicker border
    borderColor: '#E2E8F0', // More visible grey border
    backgroundColor: '#F8FAFC',
  },
  markMasteredText: {
    fontSize: rf(12),
    fontWeight: '600',
    color: theme.textMuted,
  },
  cardTrashBtn: {
    padding: rs(6),
    backgroundColor: '#FFF1F1',
    borderRadius: rs(10),
  },
  emptyContainer: {
    padding: rs(40),
    alignItems: 'center',
  },
  emptyText: {
    fontSize: rf(16),
    color: theme.textMuted,
  },
});
