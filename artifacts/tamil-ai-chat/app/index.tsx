import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ParamsStore } from '../context/params-store';
import { ALL_PERSONAS } from '../constants/personas';

const { width } = Dimensions.get('window');
const COLS = 4;
const TILE = (width - 32 - (COLS - 1) * 12) / COLS;

const CATEGORIES = [
  { key: 'pictures',    label: 'Pictures',    emoji: '🖼️',  bg: '#4A90D9', route: null },
  { key: 'camera',      label: 'Camera',      emoji: '📷',  bg: '#E8821A', route: null },
  { key: 'movies',      label: 'Movies',      emoji: '🎬',  bg: '#C0392B', route: null },
  { key: 'screenshots', label: 'Screenshots', emoji: '📱',  bg: '#27AE60', route: null },
  { key: 'downloads',   label: 'Downloads',   emoji: '⬇️',  bg: '#8E6BBE', route: null },
  { key: 'documents',   label: 'Documents',   emoji: '📄',  bg: '#3498DB', route: null },
  { key: 'music',       label: 'Music',       emoji: '🎵',  bg: '#9B59B6', route: null },
  { key: 'ai-girls',    label: 'My AI Girls', emoji: '💕',  bg: '#E91E8C', route: '/ai-girls' },
  { key: 'projects',    label: 'Projects',    emoji: '💼',  bg: '#8E44AD', route: null },
  { key: 'notes',       label: 'Notes',       emoji: '📝',  bg: '#E67E22', route: null },
  { key: 'keys',        label: 'Keys',        emoji: '🔑',  bg: '#F0C040', route: '/keys' },
  { key: 'cloud',       label: 'Cloud',       emoji: '☁️',  bg: '#1ABC9C', route: '/cloud-storage' },
];

export default function HomeScreen() {
  const router = useRouter();

  const handleTile = (cat: typeof CATEGORIES[0]) => {
    if (cat.route) {
      if (cat.route === '/ai-girls') {
        router.push('/ai-girls');
      } else {
        router.push(cat.route as any);
      }
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar backgroundColor="#1565C0" barStyle="light-content" />

      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.headerCloud}>☁️</Text>
          <Text style={s.headerTitle}>My Girls</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/settings')}>
          <Text style={s.headerGear}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionLabel}>STORAGE</Text>

        <View style={s.grid}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={s.tile}
              onPress={() => handleTile(cat)}
              activeOpacity={cat.route ? 0.7 : 0.9}
            >
              <View style={[s.tileIcon, { backgroundColor: cat.bg }]}>
                <Text style={s.tileEmoji}>{cat.emoji}</Text>
              </View>
              <Text style={s.tileLabel} numberOfLines={1}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={s.bottomBar}>
        <TouchableOpacity style={s.bottomBtn} onPress={() => router.canGoBack() && router.back()}>
          <Text style={s.bottomIcon}>←</Text>
          <Text style={s.bottomLabel}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.bottomBtn, s.bottomBtnActive]}>
          <Text style={s.bottomIconActive}>🏠</Text>
          <Text style={s.bottomLabelActive}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.bottomBtn}>
          <Text style={[s.bottomIcon, { color: '#ccc' }]}>→</Text>
          <Text style={[s.bottomLabel, { color: '#ccc' }]}>Forward</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#1565C0',
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerCloud: { fontSize: 26 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  headerGear: { fontSize: 24, color: '#fff' },
  scroll: { padding: 16, paddingBottom: 20 },
  sectionLabel: {
    fontSize: 12, fontWeight: '800', color: '#555',
    letterSpacing: 1.5, marginBottom: 16, marginLeft: 2,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { width: TILE, alignItems: 'center' },
  tileIcon: {
    width: TILE - 8, height: TILE - 8,
    borderRadius: (TILE - 8) / 2,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 6, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 4,
  },
  tileEmoji: { fontSize: 28 },
  tileLabel: { fontSize: 11, color: '#333', fontWeight: '600', textAlign: 'center' },
  bottomBar: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e8e8e8',
    backgroundColor: '#fff', paddingVertical: 10,
  },
  bottomBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  bottomBtnActive: {},
  bottomIcon: { fontSize: 20, color: '#888', fontWeight: 'bold' },
  bottomIconActive: { fontSize: 22 },
  bottomLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  bottomLabelActive: { fontSize: 11, color: '#1565C0', fontWeight: '700', marginTop: 2 },
});
