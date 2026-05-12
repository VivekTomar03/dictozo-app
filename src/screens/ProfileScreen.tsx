import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { useStore } from '../store/useStore';
import { rf, rs } from '../utils/responsive';
import { 
  LanguageIcon, 
  FlashcardIcon, 
  SettingsIcon, 
  PlayIcon, 
  HelpIcon, 
  LogoutIcon, 
  ChevronRightIcon, 
  CrownIcon 
} from '../components/Icons';

const theme = {
  primary: '#2EBA72',
  primaryLight: '#E8F7F0',
  secondary: '#1A1A1A',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  textDark: '#1A1A1A',
  textMuted: '#6B7280',
  border: '#F1F5F9',
  danger: '#FEE2E2',
  dangerText: '#EF4444',
};

export const ProfileScreen = () => {
  const email = useStore(s => s.email);
  const planName = useStore(s => s.planName);
  const trChars = useStore(s => s.trChars);
  const language = useStore(s => s.language);
  const logout = useStore(s => s.logout);

  const initial = email ? email.charAt(0).toUpperCase() : 'U';

  const handleLanguageChange = async () => {
    const nextLang = language === 'hi' ? 'es' : 'hi';
    const { syncUser } = await import('../services/api');
    await syncUser(email, { language: nextLang });
    useStore.getState().setLanguage(nextLang);
  };

  const MenuItem = ({ icon: Icon, title, subtitle, onPress, isDanger }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIconContainer, isDanger && { backgroundColor: theme.danger }]}>
        <Icon size={rs(20)} color={isDanger ? theme.dangerText : theme.primary} />
      </View>
      <View style={styles.menuInfo}>
        <Text style={[styles.menuTitle, isDanger && { color: theme.dangerText }]}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      <ChevronRightIcon size={rs(20)} color={isDanger ? theme.dangerText : theme.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
        <View style={styles.headerAvatar}>
          <Text style={styles.avatarTextSmall}>{initial}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.accountCard}>
          <View style={styles.accountTop}>
            <View style={styles.mainAvatar}>
              <Text style={styles.avatarTextLarge}>{initial}</Text>
            </View>
            <View style={styles.accountInfo}>
              <Text style={styles.emailText}>{email}</Text>
              <View style={styles.planBadge}>
                <Text style={styles.planText}>{planName.toUpperCase()}</Text>
              </View>
            </View>
          </View>


          <TouchableOpacity 
            style={styles.upgradeBtn}
            onPress={() => Linking.openURL('https://dictozo.com/#pricing')}
          >
            <CrownIcon size={rs(18)} color="#FFF" />
            <Text style={styles.upgradeText}>Upgrade to Pro</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menuSection}>
          <MenuItem 
            icon={LanguageIcon} 
            title="Translation Language" 
            subtitle={`Current: ${language.toUpperCase()}`} 
            onPress={handleLanguageChange}
          />
          <MenuItem 
            icon={FlashcardIcon} 
            title="Flashcards (Dashboard)" 
            onPress={() => Linking.openURL('https://dictozo.com/dashboard')}
          />
          <MenuItem 
            icon={SettingsIcon} 
            title="Account Settings" 
            onPress={() => Linking.openURL('https://dictozo.com/dashboard/settings')}
          />
          <MenuItem 
            icon={PlayIcon} 
            title="How to Use (Video)" 
            onPress={() => Linking.openURL('https://www.youtube.com/watch?v=Bfk0KudbrI0')}
          />
          <MenuItem 
            icon={HelpIcon} 
            title="FAQs" 
            onPress={() => Linking.openURL('https://dictozo.com/faq/')}
          />
          <MenuItem 
            icon={LogoutIcon} 
            title="Logout" 
            onPress={logout}
            isDanger
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rs(20),
    paddingVertical: rs(16),
    backgroundColor: theme.surface,
  },
  headerTitle: {
    fontSize: rf(28),
    fontWeight: 'bold',
    color: theme.textDark,
  },
  headerAvatar: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    backgroundColor: theme.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextSmall: {
    fontSize: rf(18),
    fontWeight: 'bold',
    color: theme.primary,
  },
  content: {
    padding: rs(20),
  },
  accountCard: {
    backgroundColor: theme.surface,
    borderRadius: rs(24),
    padding: rs(24),
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: rs(24),
  },
  accountTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(20),
    marginBottom: rs(24),
  },
  mainAvatar: {
    width: rs(80),
    height: rs(80),
    borderRadius: rs(40),
    backgroundColor: theme.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextLarge: {
    fontSize: rf(36),
    fontWeight: 'bold',
    color: theme.primary,
  },
  accountInfo: {
    flex: 1,
  },
  emailText: {
    fontSize: rf(18),
    fontWeight: 'bold',
    color: theme.textDark,
    marginBottom: rs(6),
  },
  planBadge: {
    backgroundColor: theme.primaryLight,
    paddingHorizontal: rs(12),
    paddingVertical: rs(4),
    borderRadius: rs(12),
    alignSelf: 'flex-start',
  },
  planText: {
    fontSize: rf(12),
    fontWeight: 'bold',
    color: theme.primary,
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.background,
    padding: rs(12),
    borderRadius: rs(16),
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: rs(20),
  },
  usageIcon: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(10),
    backgroundColor: theme.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rs(12),
  },
  usageLabel: {
    flex: 1,
    fontSize: rf(14),
    color: theme.textMuted,
    fontWeight: '500',
  },
  usageValue: {
    fontSize: rf(16),
    fontWeight: 'bold',
    color: theme.primary,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
    paddingVertical: rs(16),
    borderRadius: rs(16),
    gap: rs(10),
  },
  upgradeText: {
    fontSize: rf(16),
    fontWeight: 'bold',
    color: '#FFF',
  },
  menuSection: {
    gap: rs(12),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    padding: rs(16),
    borderRadius: rs(20),
    borderWidth: 1,
    borderColor: theme.border,
  },
  menuIconContainer: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(12),
    backgroundColor: theme.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rs(16),
  },
  menuInfo: {
    flex: 1,
  },
  menuTitle: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.textDark,
  },
  menuSubtitle: {
    fontSize: rf(13),
    color: theme.textMuted,
    marginTop: rs(2),
  },
});
