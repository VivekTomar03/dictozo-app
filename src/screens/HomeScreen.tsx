import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { useStore } from '../store/useStore';
import { WordResultScreen } from './WordResultScreen';
import { SearchIcon } from '../components/Icons';
import { rf } from '../utils/responsive';

const theme = {
  primary: '#2EBA72',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  textDark: '#1A1A1A',
  textMuted: '#6B7280',
  border: '#E5E7EB',
};

export const HomeScreen = () => {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  const searchedWords = useStore(s => s.searchedWords);
  const addSearchedWord = useStore(s => s.addSearchedWord);

  const handleSearch = (word: string) => {
    const trimmed = word.trim();
    if (!trimmed) return;
    addSearchedWord(trimmed);
    setSelectedWord(trimmed);
    setQuery('');
  };

  if (selectedWord) {
    return <WordResultScreen word={selectedWord} onBack={() => setSelectedWord(null)} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dictozo</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.searchContainer}>
          <TextInput
            placeholder="Search for any word..."
            placeholderTextColor={theme.textMuted}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearch(query)}
            returnKeyType="search"
          />
          <TouchableOpacity onPress={() => handleSearch(query)} style={styles.searchBtn}>
            <SearchIcon size={24} color={theme.primary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Recent Searches</Text>
        <View style={styles.chipRow}>
          {searchedWords.length === 0 ? (
            <Text style={styles.emptyText}>No recent searches yet.</Text>
          ) : (
            searchedWords.map((word, i) => (
              <TouchableOpacity key={i} style={styles.chip} onPress={() => handleSearch(word)}>
                <Text style={styles.chipText}>{word}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { padding: 20, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
  title: { fontSize: rf(28), fontWeight: '900', color: theme.primary, letterSpacing: 1 },
  content: { padding: 20 },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 32,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8
  },
  searchInput: { flex: 1, padding: 16, fontSize: rf(18), color: theme.textDark },
  searchBtn: { paddingHorizontal: 20, justifyContent: 'center', backgroundColor: theme.primaryLight },
  searchBtnText: { fontSize: 24 },
  sectionTitle: { fontSize: rf(20), fontWeight: '700', color: theme.textDark, marginBottom: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    backgroundColor: theme.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border
  },
  chipText: { color: theme.textDark, fontSize: rf(16), fontWeight: '500' },
  emptyText: { color: theme.textMuted, fontSize: rf(16), marginTop: 10 }
});
