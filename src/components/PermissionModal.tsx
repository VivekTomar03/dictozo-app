import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { rf, rs } from '../utils/responsive';
import { AccessibilityIcon, OverlayIcon, CloseIcon, ChevronRightIcon, CheckIcon } from './Icons';

interface Step {
  id: number;
  text: string;
  subText: string;
}

interface PermissionModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'accessibility' | 'overlay';
  onEnable: () => void;
}

const theme = {
  primary: '#2EBA72',
  primaryLight: '#E8F7F0',
  surface: '#FFFFFF',
  textDark: '#1A1A1A',
  textMuted: '#6B7280',
  border: '#F1F5F9',
};

export const PermissionModal = ({ visible, onClose, type, onEnable }: PermissionModalProps) => {
  const isA11y = type === 'accessibility';

  const steps: Step[] = isA11y ? [
    { id: 1, text: 'Open Settings', subText: 'Go to your device Settings.' },
    { id: 2, text: 'Tap Accessibility', subText: "Find and tap on 'Accessibility'." },
    { id: 3, text: 'Select Installed Apps', subText: "Tap on 'Installed Apps'." },
    { id: 4, text: 'Tap Dictozo Assistant', subText: "Find and tap on 'Dictozo Assistant'." },
    { id: 5, text: 'Enable the Service', subText: 'Turn on the toggle to enable Accessibility Permission.' },
  ] : [
    { id: 1, text: 'Open Settings', subText: 'Go to your device Settings.' },
    { id: 2, text: 'Tap Apps', subText: "Open 'Apps' or 'Installed Apps'." },
    { id: 3, text: 'Tap Special App Access', subText: "Select 'Special App Access'." },
    { id: 4, text: 'Tap Display Over Other Apps', subText: "Find and tap on 'Display Over Other Apps'." },
    { id: 5, text: 'Enable for Dictozo', subText: 'Turn on the toggle for Dictozo to allow the permission.' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <CloseIcon size={rs(24)} color={theme.textMuted} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              {isA11y ? (
                <AccessibilityIcon size={rs(32)} color={theme.primary} />
              ) : (
                <OverlayIcon size={rs(32)} color={theme.primary} />
              )}
            </View>
            <Text style={styles.title}>
              Enable {isA11y ? 'Accessibility' : 'Display Over Other Apps'} Permission
            </Text>
            <Text style={styles.desc}>
              This permission allows Dictozo Assistant to {isA11y ? 'read the text on your screen and provide meanings.' : 'show meanings on top of other apps.'}
            </Text>
          </View>

          <ScrollView style={styles.stepList} showsVerticalScrollIndicator={false}>
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumberCircle}>
                    <Text style={styles.stepNumberText}>{step.id}</Text>
                  </View>
                  <View style={styles.stepInfo}>
                    <Text style={styles.stepText}>{step.text}</Text>
                    <Text style={styles.stepSubText}>{step.subText}</Text>
                  </View>
                  <ChevronRightIcon size={rs(20)} color={theme.border} />
                </View>
                {index < steps.length - 1 && (
                  <View style={styles.connectorContainer}>
                    <View style={styles.connector} />
                  </View>
                )}
              </React.Fragment>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.enableBtn} onPress={onEnable}>
            <CheckIcon size={rs(18)} color="#FFF" strokeWidth={4} />
            <Text style={styles.enableBtnText}>Permission Enabled</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: rs(24),
  },
  content: {
    backgroundColor: theme.surface,
    borderRadius: rs(32),
    padding: rs(24),
    maxHeight: '90%',
  },
  closeBtn: {
    alignSelf: 'flex-end',
    backgroundColor: theme.background,
    padding: rs(8),
    borderRadius: rs(20),
  },
  header: {
    alignItems: 'center',
    marginBottom: rs(24),
  },
  iconCircle: {
    width: rs(72),
    height: rs(72),
    borderRadius: rs(36),
    backgroundColor: theme.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rs(16),
  },
  title: {
    fontSize: rf(20),
    fontWeight: 'bold',
    color: theme.textDark,
    textAlign: 'center',
    marginBottom: rs(12),
  },
  desc: {
    fontSize: rf(14),
    color: theme.textMuted,
    textAlign: 'center',
    lineHeight: rf(22),
  },
  stepList: {
    marginBottom: rs(24),
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    padding: rs(16),
    borderRadius: rs(20),
    gap: rs(16),
  },
  stepNumberCircle: {
    width: rs(32),
    height: rs(32),
    borderRadius: rs(16),
    backgroundColor: theme.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: rf(16),
    fontWeight: 'bold',
    color: theme.primary,
  },
  stepInfo: {
    flex: 1,
  },
  stepText: {
    fontSize: rf(15),
    fontWeight: 'bold',
    color: theme.textDark,
  },
  stepSubText: {
    fontSize: rf(13),
    color: theme.textMuted,
    marginTop: rs(2),
  },
  connectorContainer: {
    height: rs(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: {
    width: 2,
    flex: 1,
    backgroundColor: theme.primary,
    opacity: 0.3,
  },
  enableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(12),
    backgroundColor: theme.primary,
    paddingVertical: rs(16),
    borderRadius: rs(16),
  },
  enableBtnText: {
    fontSize: rf(16),
    fontWeight: 'bold',
    color: '#FFF',
  },
});
