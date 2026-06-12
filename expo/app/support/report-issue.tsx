import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  AlertTriangle,
  MapPin,
  Send,
  ChevronDown,
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/lib/use-permissions';
import { getMetersByUser } from '@/lib/api/meters';
import { createTask } from '@/lib/api/tasks';
import Colors from '@/constants/colors';
import { captureError } from '@/lib/sentry';

export default function ReportIssueScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { isEndUser } = usePermissions();
  const params = useLocalSearchParams<{
    connectionId?: string;
    utilityId?: string;
  }>();

  /* ── State ─────────────────────────────────────── */
  const [connections, setConnections] = useState<any[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>(
    params.connectionId || '',
  );
  const [showConnectionPicker, setShowConnectionPicker] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [titleError, setTitleError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');

  /* ── Load user connections ─────────────────────── */
  const fetchConnections = async () => {
    if (!user || !isEndUser) return;
    setLoadingConnections(true);
    try {
      const data = await getMetersByUser(user.id);
      setConnections(data);
      // Pre-select if only one connection
      if (data.length === 1 && !selectedConnectionId) {
        setSelectedConnectionId(data[0].id);
      }
    } catch (e) {
      captureError(e, { screen: 'report-issue', action: 'fetchConnections' });
    } finally {
      setLoadingConnections(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchConnections();
    }, [user?.id]),
  );

  /* ── Helpers ───────────────────────────────────── */
  const getUtilityId = (): string | undefined => {
    // From URL param
    if (params.utilityId) return params.utilityId;
    // From selected connection
    const conn = connections.find((c) => c.id === selectedConnectionId);
    if (conn?.utility_id) return conn.utility_id;
    // Fallback: prijavitelj (radnik / osoblje) pripada svom vodovodu
    return user?.utility_id;
  };

  const getSelectedConnectionLabel = () => {
    if (!selectedConnectionId) return 'Odaberite priključak';
    const conn = connections.find((c) => c.id === selectedConnectionId);
    if (!conn) return selectedConnectionId;
    return `${conn.serialNumber} – ${conn.address}`;
  };

  /* ── Validation ────────────────────────────────── */
  const validate = (): boolean => {
    let valid = true;
    if (!title.trim()) {
      setTitleError('Naslov je obavezan');
      valid = false;
    } else {
      setTitleError('');
    }
    if (!description.trim()) {
      setDescriptionError('Opis problema je obavezan');
      valid = false;
    } else {
      setDescriptionError('');
    }
    return valid;
  };

  /* ── Submit ────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!validate()) return;

    const utilityId = getUtilityId();
    if (!utilityId) {
      Alert.alert(
        'Greška',
        'Nije moguće odrediti vodovod. Odaberite priključak.',
      );
      return;
    }

    setIsLoading(true);
    try {
      await createTask({
        utility_id: utilityId,
        title: title.trim(),
        description: description.trim(),
        task_type: 'other',
        priority: isUrgent ? 'urgent' : 'normal',
        connection_id: selectedConnectionId || undefined,
      });

      Alert.alert(
        'Uspjeh',
        'Vaša prijava kvara je uspješno poslana. Bićete obaviješteni o statusu.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e: any) {
      Alert.alert('Greška', e?.message || 'Slanje prijave nije uspjelo.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Render ────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <Header
          title="Prijava kvara"
          showBack
          onLeftPress={() => router.back()}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Connection selector (end_user only & no pre-selected) */}
          {isEndUser && connections.length > 0 && (
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Priključak</Text>

              {loadingConnections ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.picker}
                    onPress={() =>
                      setShowConnectionPicker(!showConnectionPicker)
                    }
                  >
                    <View style={styles.pickerLeft}>
                      <MapPin size={16} color={Colors.primary} />
                      <Text
                        style={[
                          styles.pickerText,
                          !selectedConnectionId && styles.pickerPlaceholder,
                        ]}
                        numberOfLines={1}
                      >
                        {getSelectedConnectionLabel()}
                      </Text>
                    </View>
                    <ChevronDown size={18} color={Colors.textLight} />
                  </TouchableOpacity>

                  {showConnectionPicker && (
                    <View style={styles.pickerDropdown}>
                      {connections.map((conn) => (
                        <TouchableOpacity
                          key={conn.id}
                          style={[
                            styles.pickerItem,
                            selectedConnectionId === conn.id &&
                              styles.pickerItemActive,
                          ]}
                          onPress={() => {
                            setSelectedConnectionId(conn.id);
                            setShowConnectionPicker(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.pickerItemText,
                              selectedConnectionId === conn.id && {
                                color: Colors.primary,
                                fontWeight: '600',
                              },
                            ]}
                          >
                            {conn.serialNumber} – {conn.address}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}
            </Card>
          )}

          {/* Issue details */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Detalji problema</Text>

            <Input
              label="Naslov"
              placeholder="Kratko opišite problem"
              value={title}
              onChangeText={(t) => {
                setTitle(t);
                if (titleError) setTitleError('');
              }}
              error={titleError}
            />

            <Input
              label="Opis problema"
              placeholder="Detaljno opišite kvar ili problem..."
              value={description}
              onChangeText={(t) => {
                setDescription(t);
                if (descriptionError) setDescriptionError('');
              }}
              multiline
              numberOfLines={5}
              style={styles.multiline}
              error={descriptionError}
            />

            {/* Urgency toggle */}
            <TouchableOpacity
              style={[styles.urgentBtn, isUrgent && styles.urgentBtnActive]}
              onPress={() => setIsUrgent(!isUrgent)}
            >
              <AlertTriangle
                size={20}
                color={isUrgent ? Colors.error : Colors.textLight}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text
                  style={[
                    styles.urgentTitle,
                    isUrgent && { color: Colors.error },
                  ]}
                >
                  Hitna intervencija
                </Text>
                <Text style={styles.urgentDesc}>
                  Označite ako je potrebna hitna reakcija
                </Text>
              </View>
              <View
                style={[
                  styles.urgentToggle,
                  isUrgent && styles.urgentToggleActive,
                ]}
              >
                <View
                  style={[
                    styles.urgentToggleThumb,
                    isUrgent && styles.urgentToggleThumbActive,
                  ]}
                />
              </View>
            </TouchableOpacity>
          </Card>

          {/* Submit */}
          <Button
            title="Pošalji prijavu"
            leftIcon={<Send size={18} color="#fff" />}
            onPress={handleSubmit}
            isLoading={isLoading}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6f9' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  section: { marginBottom: 16, padding: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 14,
  },

  /* Connection picker */
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  pickerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  pickerText: { fontSize: 14, color: Colors.text, flex: 1 },
  pickerPlaceholder: { color: Colors.textLight },
  pickerDropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerItemActive: { backgroundColor: Colors.highlight },
  pickerItemText: { fontSize: 14, color: Colors.text },

  /* Multiline input */
  multiline: { height: 110, textAlignVertical: 'top' },

  /* Urgency button */
  urgentBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#fafafa',
  },
  urgentBtnActive: {
    borderColor: Colors.error + '66',
    backgroundColor: '#FFF3F3',
  },
  urgentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  urgentDesc: { fontSize: 12, color: Colors.textLight },

  /* Toggle switch */
  urgentToggle: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  urgentToggleActive: { backgroundColor: Colors.error },
  urgentToggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  urgentToggleThumbActive: { alignSelf: 'flex-end' },

  submitBtn: { marginTop: 4 },
});
