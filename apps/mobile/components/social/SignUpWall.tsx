import { StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { trackSignupWallShown, trackSignupDismissed } from '@/services/analytics';
import { useEffect } from 'react';

type Props = {
  visible: boolean;
  trigger: string;
  onDismiss: () => void;
};

export default function SignUpWall({ visible, trigger, onDismiss }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (visible) trackSignupWallShown(trigger);
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Love what you've played?</Text>
          <Text style={styles.subtitle}>Create your own apps, follow creators, and more.</Text>

          <TouchableOpacity style={styles.primaryButton} onPress={() => { onDismiss(); router.push('/auth/register'); }}>
            <Text style={styles.primaryText}>Sign Up</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => { onDismiss(); router.push('/auth/login'); }}>
            <Text style={styles.secondaryText}>Already have an account? Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dismissButton} onPress={() => { trackSignupDismissed(trigger); onDismiss(); }}>
            <Text style={styles.dismissText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 24 },
  primaryButton: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: { padding: 12, alignItems: 'center', marginBottom: 8 },
  secondaryText: { color: '#007AFF', fontSize: 15 },
  dismissButton: { padding: 12, alignItems: 'center' },
  dismissText: { color: '#888', fontSize: 14 },
});
