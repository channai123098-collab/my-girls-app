import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Image, Modal, Dimensions, ActivityIndicator,
  Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadToCloudinary, listCloudinaryImages, deleteFromCloudinary } from '../services/api';

const { width } = Dimensions.get('window');
const THUMB = (width - 6) / 3;
const LOCAL_KEY = 'my_girls_cloud_images';

export interface CloudImage {
  url: string;
  public_id: string;
  category: string;
  createdAt: number;
  width?: number;
  height?: number;
}

export async function saveCloudImage(img: CloudImage) {
  try {
    const existing = await AsyncStorage.getItem(LOCAL_KEY);
    const list: CloudImage[] = existing ? JSON.parse(existing) : [];
    const alreadyExists = list.some(i => i.public_id === img.public_id);
    if (!alreadyExists) {
      list.unshift(img);
      await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(0, 300)));
    }
  } catch {}
}

export async function saveGeneratedImageToCloud(
  b64_json: string,
  mimeType: string,
  category: string = 'ai',
): Promise<CloudImage | null> {
  try {
    const result = await uploadToCloudinary(b64_json, mimeType, 'my-girls');
    const img: CloudImage = {
      url: result.url,
      public_id: result.public_id,
      category,
      createdAt: Date.now(),
      width: result.width,
      height: result.height,
    };
    await saveCloudImage(img);
    return img;
  } catch {
    return null;
  }
}

const CATEGORIES = [
  { key: 'all',      label: 'All',       icon: '🖼️' },
  { key: 'ai',       label: 'AI',        icon: '🤖' },
  { key: 'faceswap', label: 'Face Swap', icon: '🤳' },
  { key: 'group',    label: 'Group',     icon: '👥' },
];

export default function CloudStorageScreen() {
  const router = useRouter();
  const [images, setImages] = useState<CloudImage[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [preview, setPreview] = useState<CloudImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchingCloud, setFetchingCloud] = useState(false);

  const loadLocalImages = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_KEY);
      const list: CloudImage[] = raw ? JSON.parse(raw) : [];
      setImages(list);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  const syncFromCloud = useCallback(async () => {
    setFetchingCloud(true);
    try {
      const cloudImgs = await listCloudinaryImages('my-girls');
      const local = await AsyncStorage.getItem(LOCAL_KEY);
      const localList: CloudImage[] = local ? JSON.parse(local) : [];

      const merged = [...localList];
      for (const ci of cloudImgs) {
        if (!merged.some(i => i.public_id === ci.public_id)) {
          merged.push({
            url: ci.url,
            public_id: ci.public_id,
            category: 'ai',
            createdAt: Date.now(),
          });
        }
      }
      merged.sort((a, b) => b.createdAt - a.createdAt);
      await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(merged.slice(0, 300)));
      setImages(merged);
    } catch (e: any) {
      Alert.alert('Sync பிழை', e?.message || 'Cloud sync வேலை செய்யல');
    } finally {
      setFetchingCloud(false);
    }
  }, []);

  useEffect(() => {
    loadLocalImages();
  }, []);

  const filtered = activeCategory === 'all'
    ? images
    : images.filter(img => img.category === activeCategory);

  const deleteImage = async (img: CloudImage) => {
    Alert.alert('Delete பண்ணட்டுமா?', 'Cloud-லயும் local-லயும் remove ஆகும்', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteFromCloudinary(img.public_id);
          } catch {}
          const raw = await AsyncStorage.getItem(LOCAL_KEY);
          const list: CloudImage[] = raw ? JSON.parse(raw) : [];
          const updated = list.filter(i => i.public_id !== img.public_id);
          await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
          setImages(updated);
          setPreview(null);
        },
      },
    ]);
  };

  const categoryCounts = CATEGORIES.map(c => ({
    ...c,
    count: c.key === 'all' ? images.length : images.filter(i => i.category === c.key).length,
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerCloud}>☁️</Text>
          <Text style={styles.headerTitle}>My Cloud</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.syncBtn} onPress={syncFromCloud} disabled={fetchingCloud}>
            {fetchingCloud
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.syncBtnTxt}>🔄 Sync</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/settings')}>
            <Text style={styles.headerGear}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadLocalImages(); }}
            tintColor="#6C63FF"
          />
        }
      >
        <Text style={styles.sectionLabel}>STORAGE</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.catScroll}
          contentContainerStyle={styles.catRow}
        >
          {categoryCounts.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.catCard, activeCategory === cat.key && styles.catCardActive]}
              onPress={() => setActiveCategory(cat.key)}
            >
              <Text style={styles.catIcon}>{cat.icon}</Text>
              <Text style={[styles.catLabel, activeCategory === cat.key && styles.catLabelActive]}>
                {cat.label}
              </Text>
              {cat.count > 0 && (
                <View style={styles.catBadge}>
                  <Text style={styles.catBadgeText}>{cat.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.storageInfo}>
          <Text style={styles.storageTitle}>☁️ Cloudinary — my-girls folder</Text>
          <Text style={styles.storageCount}>{images.length} images</Text>
        </View>

        {images.length === 0 && !loading && (
          <View style={styles.syncCard}>
            <Text style={styles.syncCardTitle}>Cloud-ல் images இல்லை</Text>
            <Text style={styles.syncCardText}>
              Chat-ல் AI image generate பண்ணா auto-save ஆகும்.{'\n'}
              🔄 Sync button tap பண்ணி Cloudinary-ல் உள்ள images fetch பண்ணலாம்.
            </Text>
            <TouchableOpacity style={styles.syncCardBtn} onPress={syncFromCloud} disabled={fetchingCloud}>
              {fetchingCloud
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.syncCardBtnTxt}>🔄 Sync from Cloud</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color="#6C63FF" size="large" style={{ marginTop: 60 }} />
        ) : filtered.length === 0 && images.length > 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>{activeCategory} category-ல் images இல்லை</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filtered.map(img => (
              <TouchableOpacity key={img.public_id} onPress={() => setPreview(img)}>
                <Image source={{ uri: img.url }} style={styles.thumb} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        {preview && (
          <View style={styles.modalBg}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setPreview(null)}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            <Image source={{ uri: preview.url }} style={styles.fullImg} resizeMode="contain" />
            <View style={styles.modalActions}>
              <View>
                <Text style={styles.modalCat}>{preview.category.toUpperCase()}</Text>
                <Text style={styles.modalDate}>
                  {new Date(preview.createdAt).toLocaleDateString('ta-IN')}
                </Text>
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteImage(preview)}>
                <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1a1a2e' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#16213e',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerCloud: { fontSize: 24 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  headerGear: { fontSize: 22 },
  syncBtn: {
    backgroundColor: '#6C63FF', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6, minWidth: 70, alignItems: 'center',
  },
  syncBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  scroll: { flex: 1 },
  sectionLabel: {
    color: '#aaa', fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10,
  },
  catScroll: { marginBottom: 4 },
  catRow: { paddingHorizontal: 12, gap: 10, paddingBottom: 8 },
  catCard: {
    width: 80, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8,
    backgroundColor: '#16213e', borderRadius: 16, borderWidth: 1.5, borderColor: '#2a2a4a',
  },
  catCardActive: { borderColor: '#6C63FF', backgroundColor: '#2d2b55' },
  catIcon: { fontSize: 28, marginBottom: 6 },
  catLabel: { color: '#aaa', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  catLabelActive: { color: '#6C63FF' },
  catBadge: {
    position: 'absolute', top: 6, right: 6, backgroundColor: '#6C63FF',
    borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center',
  },
  catBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  storageInfo: {
    margin: 16, padding: 14, backgroundColor: '#16213e', borderRadius: 12,
    borderWidth: 1, borderColor: '#2a2a4a',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  storageTitle: { color: '#fff', fontSize: 13, fontWeight: '600' },
  storageCount: { color: '#6C63FF', fontSize: 13, fontWeight: 'bold' },
  syncCard: {
    margin: 16, padding: 20, backgroundColor: '#16213e',
    borderRadius: 16, borderWidth: 1, borderColor: '#2a2a4a', alignItems: 'center',
  },
  syncCardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  syncCardText: { color: '#aaa', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  syncCardBtn: {
    backgroundColor: '#6C63FF', borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  syncCardBtnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, paddingHorizontal: 2 },
  thumb: { width: THUMB, height: THUMB, backgroundColor: '#2a2a4a' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#888', fontSize: 15, textAlign: 'center' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  modalClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 },
  modalCloseText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  fullImg: { width, height: width, alignSelf: 'center' },
  modalActions: {
    position: 'absolute', bottom: 60, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20,
  },
  modalCat: { color: '#6C63FF', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  modalDate: { color: '#aaa', fontSize: 12, marginTop: 2 },
  deleteBtn: { backgroundColor: '#c62828', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  deleteBtnText: { color: '#fff', fontWeight: 'bold' },
});
