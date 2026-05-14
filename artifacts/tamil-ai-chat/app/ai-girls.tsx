import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, Modal, Pressable, Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALL_PERSONAS, Persona } from '../constants/personas';
import { ParamsStore } from '../context/params-store';

const PHOTO_FOLDERS = [
  { id: 'breast',    label: 'Breast Show',  emoji: '📸', color: '#E91E63' },
  { id: 'buttocks',  label: 'Buttocks',     emoji: '📸', color: '#9C27B0' },
  { id: 'cleavage',  label: 'Cleavage',     emoji: '📸', color: '#E53935' },
  { id: 'halfbreast',label: 'Half Breast',  emoji: '📸', color: '#F44336' },
  { id: 'highslit',  label: 'High Slit',    emoji: '📸', color: '#FF5722' },
  { id: 'legs',      label: 'Legs Spread',  emoji: '📸', color: '#FF9800' },
  { id: 'lingerie',  label: 'Lingerie',     emoji: '📸', color: '#8E24AA' },
  { id: 'lowneck',   label: 'Low Neckline', emoji: '📸', color: '#E91E63' },
  { id: 'nude',      label: 'Nude',         emoji: '📸', color: '#C62828' },
  { id: 'seductive', label: 'Seductive',    emoji: '📸', color: '#AD1457' },
  { id: 'wet',       label: 'Wet Clothes',  emoji: '📸', color: '#1565C0' },
  { id: 'sleeping',  label: 'Sleeping',     emoji: '📸', color: '#4527A0' },
];

const STYLE_TO_PROMPT: Record<string, string> = {
  breast: 'topless, showing breasts, bare chest',
  buttocks: 'showing buttocks, from behind, revealing pose',
  cleavage: 'deep cleavage, revealing neckline',
  halfbreast: 'half breast visible, deep cleavage, low cut top',
  highslit: 'high slit dress, revealing thighs',
  legs: 'legs spread wide, revealing pose',
  lingerie: 'wearing lingerie, seductive pose',
  lowneck: 'low neckline, showing chest',
  nude: 'nude, fully naked, explicit',
  seductive: 'seductive pose, alluring, provocative look',
  wet: 'wet clothes, drenched, see through wet fabric',
  sleeping: 'sleeping pose, exposed, lying down',
};

export default function AIGirlsScreen() {
  const router = useRouter();
  const [personas, setPersonas] = useState<Persona[]>(ALL_PERSONAS);
  const [showCharModal, setShowCharModal] = useState(false);
  const [pendingFolderId, setPendingFolderId] = useState<string | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedForGroup, setSelectedForGroup] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const merged = await Promise.all(ALL_PERSONAS.map(async p => {
        try {
          const saved = await AsyncStorage.getItem(`persona_edit_${p.id}`);
          if (saved) return { ...p, ...JSON.parse(saved), prompt: JSON.parse(saved).prompt ?? p.prompt };
        } catch {}
        return p;
      }));
      setPersonas(merged);
    };
    load();
  }, []);

  const handleFolderTap = (folderId: string) => {
    setPendingFolderId(folderId);
    setShowCharModal(true);
  };

  const handleCharSelect = (persona: Persona) => {
    setShowCharModal(false);
    const stylePrompt = pendingFolderId ? (STYLE_TO_PROMPT[pendingFolderId] || '') : '';
    ParamsStore.setChatParams({ personaId: persona.id, provider: 'gemini', providerLabel: persona.name });
    ParamsStore.setPendingPhotoStyle(stylePrompt);
    router.push('/chat');
  };

  const startGroupChat = () => {
    const selected = personas.filter(p => selectedForGroup.includes(p.id));
    if (selected.length < 2) return;
    setShowGroupModal(false);
    setSelectedForGroup([]);
    ParamsStore.setGroupPersonaIds(selected.map(p => p.id));
    router.push('/group-chat');
  };

  const renderFolder = ({ item }: { item: typeof PHOTO_FOLDERS[0] }) => (
    <TouchableOpacity style={s.folderRow} onPress={() => handleFolderTap(item.id)} activeOpacity={0.7}>
      <View style={[s.folderIcon, { backgroundColor: item.color + '22' }]}>
        <Text style={s.folderEmoji}>📸</Text>
      </View>
      <Text style={[s.folderLabel, { color: item.color }]}>{item.label}</Text>
      <Text style={s.folderArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.headerBack}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>My AI Girls</Text>
        <TouchableOpacity onPress={() => { }}>
          <Text style={s.headerRefresh}>↻</Text>
        </TouchableOpacity>
      </View>

      <View style={s.breadcrumb}>
        <Text style={s.breadcrumbTxt}>🏠 Home › My AI Girls</Text>
      </View>

      <View style={s.actionBar}>
        <TouchableOpacity style={s.uploadBtn} onPress={() => {
          ParamsStore.setChatParams({ personaId: personas[0]?.id ?? '', provider: 'gemini', providerLabel: personas[0]?.name ?? '' });
          router.push('/chat');
        }}>
          <Text style={s.uploadBtnTxt}>⬆ Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.groupBtn} onPress={() => setShowGroupModal(true)}>
          <Text style={s.groupBtnTxt}>👥 Group Chat</Text>
        </TouchableOpacity>
      </View>

      <View style={s.charSection}>
        <Text style={s.charSectionTitle}>📁 My AI Girls</Text>
        <TouchableOpacity style={s.charSectionArrow}>
          <Text style={s.folderArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={PHOTO_FOLDERS}
        keyExtractor={i => i.id}
        renderItem={renderFolder}
        ItemSeparatorComponent={() => <View style={s.sep} />}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      <View style={s.bottomBar}>
        <TouchableOpacity style={s.bottomBtn} onPress={() => router.back()}>
          <Text style={s.bottomIcon}>←</Text>
          <Text style={s.bottomLabel}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.bottomBtn} onPress={() => router.replace('/')}>
          <Text style={s.bottomIconHome}>🏠</Text>
          <Text style={s.bottomLabelActive}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.bottomBtn}>
          <Text style={[s.bottomIcon, { color: '#ccc' }]}>→</Text>
          <Text style={[s.bottomLabel, { color: '#ccc' }]}>Forward</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showCharModal} transparent animationType="slide" onRequestClose={() => setShowCharModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Character தேர்வு செய்</Text>
            <Text style={s.modalSub}>யாரோட {PHOTO_FOLDERS.find(f => f.id === pendingFolderId)?.label} photo வேணும்?</Text>
            {personas.map(p => (
              <TouchableOpacity key={p.id} style={s.charRow} onPress={() => handleCharSelect(p)}>
                <View style={[s.charAvatar, { backgroundColor: p.avatarColor }]}>
                  <Text style={s.charAvatarTxt}>{p.emoji}</Text>
                </View>
                <Text style={s.charName}>{p.name}</Text>
                <Text style={s.charArrow}>›</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowCharModal(false)}>
              <Text style={s.cancelBtnTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showGroupModal} transparent animationType="slide" onRequestClose={() => setShowGroupModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Group Chat</Text>
            <Text style={s.modalSub}>2+ characters select பண்ணுங்க</Text>
            {personas.map(p => {
              const sel = selectedForGroup.includes(p.id);
              return (
                <TouchableOpacity key={p.id} style={[s.charRow, sel && { backgroundColor: '#e8f5e9' }]}
                  onPress={() => setSelectedForGroup(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}>
                  <View style={[s.charAvatar, { backgroundColor: p.avatarColor }]}>
                    <Text style={s.charAvatarTxt}>{p.emoji}</Text>
                  </View>
                  <Text style={s.charName}>{p.name}</Text>
                  {sel && <Text style={{ color: '#25D366', fontSize: 18, fontWeight: 'bold' }}>✓</Text>}
                </TouchableOpacity>
              );
            })}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Pressable style={s.cancelBtn} onPress={() => { setShowGroupModal(false); setSelectedForGroup([]); }}>
                <Text style={s.cancelBtnTxt}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[s.startBtn, selectedForGroup.length < 2 && { opacity: 0.5 }]}
                onPress={startGroupChat}
                disabled={selectedForGroup.length < 2}
              >
                <Text style={s.startBtnTxt}>Start ({selectedForGroup.length})</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#1565C0', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  headerBack: { color: '#fff', fontSize: 28, fontWeight: 'bold', paddingHorizontal: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  headerRefresh: { color: '#fff', fontSize: 22, paddingHorizontal: 4 },
  breadcrumb: { backgroundColor: '#1a2a4a', paddingHorizontal: 16, paddingVertical: 10 },
  breadcrumbTxt: { color: '#90CAF9', fontSize: 13 },
  actionBar: { flexDirection: 'row', gap: 12, padding: 12, backgroundColor: '#f9f9f9', borderBottomWidth: 1, borderBottomColor: '#eee' },
  uploadBtn: { flex: 1, backgroundColor: '#E67E22', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  uploadBtnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  groupBtn: { flex: 1, backgroundColor: '#1a2a4a', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  groupBtnTxt: { color: '#FFD700', fontWeight: 'bold', fontSize: 14 },
  charSection: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  charSectionTitle: { fontSize: 15, fontWeight: '700', color: '#333' },
  charSectionArrow: {},
  folderRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  folderIcon: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  folderEmoji: { fontSize: 20 },
  folderLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  folderArrow: { color: '#bbb', fontSize: 22, fontWeight: 'bold' },
  sep: { height: 1, backgroundColor: '#f5f5f5', marginLeft: 70 },
  bottomBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e8e8e8', backgroundColor: '#fff', paddingVertical: 10, position: 'absolute', bottom: 0, left: 0, right: 0 },
  bottomBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  bottomIcon: { fontSize: 20, color: '#333', fontWeight: 'bold' },
  bottomIconHome: { fontSize: 22 },
  bottomLabel: { fontSize: 11, color: '#333', marginTop: 2, fontWeight: '600' },
  bottomLabelActive: { fontSize: 11, color: '#1565C0', fontWeight: '700', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1565C0', marginBottom: 4 },
  modalSub: { fontSize: 13, color: '#888', marginBottom: 14 },
  charRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderRadius: 10, marginBottom: 4 },
  charAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  charAvatarTxt: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  charName: { flex: 1, fontSize: 15, color: '#111', fontWeight: '500' },
  charArrow: { color: '#bbb', fontSize: 22 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#ccc', alignItems: 'center' },
  cancelBtnTxt: { color: '#555', fontWeight: '600' },
  startBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#1565C0', alignItems: 'center' },
  startBtnTxt: { color: '#fff', fontWeight: 'bold' },
});
