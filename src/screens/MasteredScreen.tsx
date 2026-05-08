import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useStore } from '../store/useStore';
import { TrashIcon } from '../components/Icons';
import { Skeleton } from '../components/Skeleton';
import { rf } from '../utils/responsive';

const theme = {
  primary: '#2EBA72',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  textDark: '#1A1A1A',
  textMuted: '#6B7280',
  border: '#E5E7EB',
};

export const MasteredScreen = () => {
  const mastered = useStore(s => s.mastered);
  const setMastered = useStore(s => s.setMastered);
  const setFavourites = useStore(s => s.setFavourites);
  const email = useStore(s => s.email);
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    // Initial load handled by pull-to-refresh
  }, []);

  const syncWithServer = async () => {
    setRefreshing(true);
    try {
      const { getUser } = await import('../services/api');
      const { AppStorage } = await import('../services/storage');
      const res = await getUser(email);
      console.log('[Mastered] Sync result:', res.status);
      if (res.status && res.data) {
        const d = res.data;
        const favs = JSON.parse(d.favourites ?? '{}');
        const mast = JSON.parse(d.mastered ?? '{}');
        
        setFavourites(favs);
        setMastered(mast);
        
        AppStorage.setFavourites(favs);
        AppStorage.setMastered(mast);
      }
    } catch (e) {
      console.warn('Failed to sync mastered words:', e);
    } finally {
      setRefreshing(false);
    }
  };

  // Convert the Record<string, string> to an array of { word, data }
  const words = Object.keys(mastered).map(word => {
    try {
      const parsed = JSON.parse(mastered[word]);
      const item = parsed.data?.[0];
      return {
        word,
        definition: item?.definition || item?.translatedText || 'No definition available.',
        savedAt: parsed.savedAt
      };
    } catch {
      return { word, definition: 'Error parsing data', savedAt: '' };
    }
  }).sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

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





  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.wordText}>{item.word}</Text>
      </View>
      <Text style={styles.definitionText} numberOfLines={2}>{item.definition}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Mastered</Text>
          <Text style={styles.subtitle}>{words.length} words mastered</Text>
        </View>
      </View>

      {refreshing && words.length === 0 ? (
        <ListSkeleton />
      ) : words.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No mastered words yet.</Text>
          <Text style={styles.emptySubText}>Words you master will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={words}
          keyExtractor={(item) => item.word}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
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
    backgroundColor: theme.surface, 
    borderBottomWidth: 1, 
    borderBottomColor: theme.border,
    flexDirection: 'row',
    alignItems: 'center'
  },
  title: { fontSize: rf(28), fontWeight: 'bold', color: theme.textDark },
  subtitle: { fontSize: rf(16), color: theme.textMuted, marginTop: 2 },
  clearText: { color: '#EF4444', fontWeight: 'bold', fontSize: rf(16) },
  list: { padding: 16 },
  card: {
    backgroundColor: theme.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  wordText: { fontSize: rf(20), fontWeight: 'bold', color: theme.textDark, textTransform: 'capitalize' },
  definitionText: { fontSize: rf(16), color: theme.textMuted, lineHeight: rf(22) },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: rf(22), color: theme.textDark, fontWeight: 'bold', marginBottom: 8 },
  emptySubText: { fontSize: rf(16), color: theme.textMuted, textAlign: 'center' }
});
