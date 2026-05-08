import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, NativeModules, AppState, TextInput, Alert, Linking, Platform } from 'react-native';
import { getAllSavedWords } from '../services/db';
import { useStore } from '../store/useStore';
import { TrashIcon, CheckIcon, ShareIcon } from '../components/Icons';
import { Skeleton } from '../components/Skeleton';
import { rf } from '../utils/responsive';
import { exportToCSV } from '../utils/export';

const { DictozoModule } = NativeModules;

const theme = {
  primary: '#2EBA72',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  textDark: '#1A1A1A',
  textMuted: '#6B7280',
  border: '#E5E7EB',
};

export const SavedWordsScreen = () => {
  const [words, setWords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAssistantEnabled, setIsAssistantEnabled] = useState(false);
  const [hasOverlayPermission, setHasOverlayPermission] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  
  const email = useStore(s => s.email);
  const plan = useStore(s => s.plan);
  const favourites = useStore(s => s.favourites);
  const mastered = useStore(s => s.mastered);
  const setFavourites = useStore(s => s.setFavourites);
  const setMastered = useStore(s => s.setMastered);

  useEffect(() => {
    loadWords();
    checkPermissions();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkPermissions();
        loadWords();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [favourites, mastered]); // Reload when favourites or mastered change

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
        
        // Also update storage
        AppStorage.setFavourites(favs);
        AppStorage.setMastered(mast);
      }
    } catch (e) {
      console.warn('Failed to sync with server:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const loadWords = () => {
    // Convert store favourites to list format
    const list = Object.keys(favourites).map(word => {
      const raw = favourites[word];
      try {
        const parsed = JSON.parse(raw);
        const item = parsed.data?.[0];
        return {
          id: word,
          word,
          definition: item?.definition || item?.translatedText || 'No definition',
          savedAt: parsed.savedAt,
          raw // Keep raw to move to mastered
        };
      } catch {
        return { id: word, word, definition: 'Error', savedAt: '', raw: '' };
      }
    }).sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    
    // Filter out anything that is in mastered
    const filtered = list.filter(item => !mastered[item.word.toUpperCase()]);
    setWords(filtered);
  };

  const ListSkeleton = () => (
    <View style={{ padding: 16, gap: 12 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} style={styles.card}>
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width="40%" height={20} />
            <Skeleton width="80%" height={16} />
          </View>
        </View>
      ))}
    </View>
  );

  const handleMaster = async (word: string, originalData: string) => {
    try {
      const wordKey = word.toUpperCase();
      
      // 1. Prepare next states - preserve original full entry if available
      const nextMastered = { ...mastered, [wordKey]: originalData };
      const nextFavs = { ...favourites };
      delete nextFavs[wordKey];

      // 2. Sync to Server via PUT /users/update
      const { syncUser } = await import('../services/api');
      await syncUser(email, { 
        mastered: JSON.stringify(nextMastered),
        favourites: JSON.stringify(nextFavs)
      });

      // 3. Update local state
      setMastered(nextMastered);
      setFavourites(nextFavs);
      
      Alert.alert('Mastered', `"${word}" has been moved to mastered words.`);
      syncWithServer(); // Sync back to be sure
    } catch (err) {
      console.error('Master error:', err);
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
      
      syncWithServer(); // Sync back to be sure
    } catch (err) {
      Alert.alert('Error', 'Failed to delete word');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedWords.size === 0) return;
    
    Alert.alert(
      'Delete Selected',
      `Delete ${selectedWords.size} selected words?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { deleteWords } = await import('../services/api');
              const wordsToDelete = Array.from(selectedWords);
              await deleteWords(email, wordsToDelete);
              
              const nextFavs = { ...favourites };
              wordsToDelete.forEach(w => delete nextFavs[w.toUpperCase()]);
              setFavourites(nextFavs);
              setSelectedWords(new Set());
              syncWithServer();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete selected words');
            }
          }
        }
      ]
    );
  };

  const toggleSelection = (word: string) => {
    const next = new Set(selectedWords);
    if (next.has(word)) next.delete(word);
    else next.add(word);
    setSelectedWords(next);
  };

  const handleDeleteAll = async () => {
    Alert.alert(
      'Delete All',
      'Are you sure you want to delete all saved words?',
      [
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
      ]
    );
  };

  const handleAssistantSetup = () => {
    if (Platform.OS === 'android') {
      DictozoModule.openAccessibilitySettings();
    } else {
      Linking.openSettings();
    }
  };

  const filteredWords = words.filter(w => 
    w.word.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const renderItem = ({ item }: { item: any }) => {
    const isSelected = selectedWords.has(item.word);
    
    return (
      <TouchableOpacity 
        onPress={() => selectedWords.size > 0 ? toggleSelection(item.word) : toggleSelection(item.word)}
        activeOpacity={0.8}
        style={[styles.card, isSelected && styles.selectedCard]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.wordSection}>
            <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
              {isSelected && <CheckIcon size={12} color="#FFF" strokeWidth={4} />}
            </View>
            <Text style={styles.wordText}>{item.word}</Text>
          </View>
          <View style={styles.actionRow}>
            {!isSelected && (
              <>
                <TouchableOpacity onPress={() => handleMaster(item.word, item.raw)} style={styles.masterBtn}>
                  <CheckIcon size={16} color={theme.primary} strokeWidth={3} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.word)} style={styles.actionBtn}>
                  <TrashIcon size={22} color="#EF4444" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        <Text style={styles.definitionText} numberOfLines={3}>{item.definition}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Saved Words</Text>
          <Text style={styles.headerSubtitle}>
            {words.length} / {plan?._sa ?? 20} words
          </Text>
        </View>
        
        {selectedWords.size > 0 ? (
          <TouchableOpacity style={styles.batchDeleteBtn} onPress={handleBatchDelete}>
            <Text style={styles.batchDeleteText}>Delete ({selectedWords.size})</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <TouchableOpacity 
              style={styles.exportBtn} 
              onPress={() => exportToCSV(words)}
            >
              <ShareIcon size={22} color={theme.primary} strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteAllBtn} onPress={handleDeleteAll}>
              <Text style={styles.deleteAllText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.searchBar}>
        <TextInput 
          placeholder="Filter saved words..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>

      {(!isAssistantEnabled || !hasOverlayPermission) && (
        <TouchableOpacity style={styles.setupBanner} onPress={handleAssistantSetup}>
          <Text style={styles.setupText}>⚠️ Assistant needs setup to work in other apps</Text>
        </TouchableOpacity>
      )}

      {refreshing && words.length === 0 ? (
        <ListSkeleton />
      ) : words.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No saved words yet.</Text>
          <Text style={styles.emptySubText}>Words you save will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredWords}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={syncWithServer}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.surface,
  },
  headerTitle: { fontSize: rf(28), fontWeight: 'bold', color: theme.textDark },
  headerSubtitle: { fontSize: rf(16), color: theme.textMuted, marginTop: 2 },
  activeTagText: { color: theme.primary, fontWeight: 'bold', fontSize: rf(16) },
  listContainer: { padding: 16 },
  card: {
    backgroundColor: theme.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  wordText: {
    fontSize: rf(20),
    fontWeight: 'bold',
    color: theme.textDark,
    textTransform: 'capitalize',
    flex: 1
  },
  actionRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  actionBtn: { padding: 4 },
  masterBtn: { 
    backgroundColor: '#E8F7F0', 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: theme.primary 
  },
  masterBtnText: { color: theme.primary, fontWeight: 'bold', fontSize: rf(14) },
  deleteIcon: { fontSize: 22 },
  definitionText: { fontSize: rf(16), color: theme.textMuted, lineHeight: rf(24) },
  deleteAllBtn: { padding: 8 },
  deleteAllText: { color: '#EF4444', fontWeight: 'bold' },
  searchBar: { padding: 16, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
  searchInput: { backgroundColor: theme.background, padding: 12, borderRadius: 8, color: theme.textDark },
  setupBanner: { backgroundColor: '#FEF3C7', padding: 12, alignItems: 'center' },
  setupText: { color: '#D97706', fontWeight: '600', fontSize: 16 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: rf(20), color: theme.textDark, fontWeight: 'bold', marginBottom: 8 },
  emptySubText: { fontSize: rf(16), color: theme.textMuted, textAlign: 'center' },
  selectedCard: { borderColor: theme.primary, backgroundColor: '#F0FDF4', borderWidth: 2 },
  wordSection: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { 
    width: 22, 
    height: 22, 
    borderRadius: 11, 
    borderWidth: 2, 
    borderColor: theme.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.surface
  },
  checkboxActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  batchDeleteBtn: { backgroundColor: '#FEE2E2', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  batchDeleteText: { color: '#EF4444', fontWeight: 'bold', fontSize: rf(16) },
  exportBtn: {
    padding: 8,
    backgroundColor: '#E8F7F0',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.primary,
  }
});
