// @ts-nocheck
import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  FileText,
  Search,
  Plus,
  X,
  Filter,
  AlertCircle,
  Pin,
  Archive,
  Check,
} from 'lucide-react-native';
import { trpc } from '../../utils/trpc';

const NAVY = '#111827';
const SURFACE = '#f6f5f3';
const BORDER = '#f0eeec';
const MUTED = '#9ca3af';
const CORAL = '#e87a6e';

// ── Shared helpers ──

const renderBackdrop = (props: any) => (
  <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />
);

const SheetLabel = ({ children }: { children: string }) => (
  <Text style={{ fontSize: 11, fontWeight: '600', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
    {children}
  </Text>
);

const SheetInput = ({ style, ...props }: any) => (
  <BottomSheetTextInput
    placeholderTextColor={MUTED}
    style={[{
      backgroundColor: SURFACE,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      fontSize: 15,
      color: NAVY,
      borderWidth: 1,
      borderColor: BORDER,
      marginBottom: 18,
    }, style]}
    {...props}
  />
);

const PrimaryBtn = ({ onPress, disabled, loading, label }: any) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.85}
    style={{
      backgroundColor: NAVY,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      opacity: disabled || loading ? 0.4 : 1,
    }}
  >
    {loading
      ? <ActivityIndicator color="white" size="small" />
      : <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>{label}</Text>}
  </TouchableOpacity>
);

// ── Note card ──
function NoteItem({ note, onPress }: { note: any; onPress: () => void }) {
  const dateStr = new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.65}
      style={{
        backgroundColor: 'white',
        borderRadius: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: BORDER,
        padding: 14,
      }}
    >
      {/* Title row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 }}>
        {note.isPinned && <Pin size={12} color="#d97706" />}
        {note.isArchived && <Archive size={12} color={MUTED} />}
        <Text style={{ fontSize: 15, fontWeight: '700', color: NAVY, flex: 1 }} numberOfLines={1}>
          {note.title || 'Untitled log'}
        </Text>
        <Text style={{ fontSize: 11, color: MUTED, fontWeight: '500' }}>{dateStr}</Text>
      </View>

      {/* Preview */}
      {!!note.plainText && (
        <Text style={{ fontSize: 13, color: MUTED, lineHeight: 19 }} numberOfLines={2}>
          {note.plainText}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ── Main screen ──
export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [isSortModalVisible, setSortModalVisible] = useState(false);
  const [sortOrder, setSortOrder] = useState('Newest');
  const [showArchived, setShowArchived] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const addModalRef = useRef<BottomSheetModal>(null);
  const filterModalRef = useRef<BottomSheetModal>(null);

  useEffect(() => { if (isAddModalVisible) addModalRef.current?.present(); else addModalRef.current?.dismiss(); }, [isAddModalVisible]);
  useEffect(() => { if (isSortModalVisible) filterModalRef.current?.present(); else filterModalRef.current?.dismiss(); }, [isSortModalVisible]);

  const { data: notes, isLoading, refetch, isRefetching, isError } = trpc.note.getNotes.useQuery();

  const processedNotes = useMemo(() => {
    if (!notes) return [];
    let result = [...notes];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(n =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.plainText && n.plainText.toLowerCase().includes(q))
      );
    }
    if (!search.trim() && !showArchived) result = result.filter(n => !n.isArchived);
    result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (sortOrder === 'Newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortOrder === 'Oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortOrder === 'A-Z') return (a.title || '').localeCompare(b.title || '');
      if (sortOrder === 'Z-A') return (b.title || '').localeCompare(a.title || '');
      return 0;
    });
    return result;
  }, [notes, search, sortOrder, showArchived]);

  const createNoteMutation = trpc.note.createNote.useMutation({
    onSuccess: (newNote) => {
      refetch();
      setAddModalVisible(false);
      setNewTitle('');
      setNewDesc('');
      // Navigate to the newly created note's full-screen editor
      if (newNote?.id) {
        router.push(`/notes/${newNote.id}`);
      }
    },
  });

  const handleCreateNote = () => {
    if (!newDesc.trim() && !newTitle.trim()) return;
    createNoteMutation.mutate({ title: newTitle.trim() || 'Untitled log', plainText: newDesc.trim() || undefined });
  };

  const todayText = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();

  // ── Loading ──
  if (isLoading && !isRefetching) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: SURFACE }}>
      <ActivityIndicator size="small" color={NAVY} />
    </View>
  );

  // ── Error ──
  if (isError) return (
    <View style={{ flex: 1, backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <AlertCircle color="#ef4444" size={24} />
      <Text style={{ color: NAVY, fontSize: 16, fontWeight: '700', marginTop: 12 }}>Failed to load logs</Text>
      <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: NAVY, borderRadius: 12 }}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: SURFACE }}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View style={{
        backgroundColor: 'white',
        paddingTop: insets.top + 10,
        paddingBottom: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
      }}>
        {/* Title row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: '600', color: MUTED, letterSpacing: 0.8, marginBottom: 2 }}>{todayText}</Text>
            <Text style={{ fontSize: 26, fontWeight: '800', color: NAVY, letterSpacing: -0.5 }}>Logs</Text>
          </View>
          <TouchableOpacity
            onPress={() => setAddModalVisible(true)}
            activeOpacity={0.85}
            style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={18} color="white" />
          </TouchableOpacity>
        </View>

        {/* Search row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Search input */}
          <View style={{
            flex: 1, flexDirection: 'row', alignItems: 'center',
            backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
            borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9,
          }}>
            <Search size={14} color={MUTED} />
            <TextInput
              style={{ flex: 1, marginLeft: 8, fontSize: 14, color: NAVY, fontWeight: '500' }}
              placeholder="Search logs…"
              placeholderTextColor={MUTED}
              value={search}
              onChangeText={setSearch}
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={13} color={MUTED} />
              </TouchableOpacity>
            )}
          </View>

          {/* Sort button */}
          <TouchableOpacity
            onPress={() => setSortModalVisible(true)}
            style={{
              width: 36, height: 36, borderRadius: 11,
              backgroundColor: sortOrder !== 'Newest' ? NAVY : 'white',
              borderWidth: 1, borderColor: sortOrder !== 'Newest' ? NAVY : BORDER,
              alignItems: 'center', justifyContent: 'center',
            }}
            activeOpacity={0.7}
          >
            <Filter size={15} color={sortOrder !== 'Newest' ? 'white' : NAVY} />
          </TouchableOpacity>

          {/* Archive toggle */}
          <TouchableOpacity
            onPress={() => setShowArchived(!showArchived)}
            style={{
              width: 36, height: 36, borderRadius: 11,
              backgroundColor: showArchived ? CORAL : 'white',
              borderWidth: 1, borderColor: showArchived ? CORAL : BORDER,
              alignItems: 'center', justifyContent: 'center',
            }}
            activeOpacity={0.7}
          >
            <Archive size={15} color={showArchived ? 'white' : NAVY} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── List ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={NAVY} />}
      >
        {/* Meta row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: MUTED, letterSpacing: 0.8 }}>
            {search ? 'RESULTS' : showArchived ? 'ARCHIVED' : 'RECENT'}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: MUTED, letterSpacing: 0.8 }}>
            {processedNotes.length} {processedNotes.length === 1 ? 'ENTRY' : 'ENTRIES'}
          </Text>
        </View>

        {processedNotes.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 72 }}>
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'white', borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <FileText size={22} color="#cbd5e1" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#cbd5e1' }}>
              {showArchived ? 'No archived logs' : search ? 'No results' : 'No logs yet'}
            </Text>
            <Text style={{ fontSize: 13, color: MUTED, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
              {!search && !showArchived ? 'Tap + to write your first log.' : ''}
            </Text>
          </View>
        ) : (
          processedNotes.map((note: any) => (
            <NoteItem
              key={note.id}
              note={note}
              onPress={() => {
                router.push(`/notes/${note.id}`);
              }}
            />
          ))
        )}
      </ScrollView>

      {/* ══════════════════════════════════════
          ADD LOG SHEET
      ══════════════════════════════════════ */}
      <BottomSheetModal
        ref={addModalRef}
        snapPoints={['70%']}
        enablePanDownToClose
        keyboardBehavior="interactive"
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: '#e2e8f0', width: 36 }}
        backgroundStyle={{ backgroundColor: 'white', borderRadius: 24 }}
        onChange={(i) => { if (i === -1) setAddModalVisible(false); }}
      >
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 6, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: NAVY }}>New log</Text>
            <TouchableOpacity onPress={() => setAddModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={18} color={MUTED} />
            </TouchableOpacity>
          </View>

          <SheetLabel>Title</SheetLabel>
          <SheetInput
            placeholder="Subject or title…"
            value={newTitle}
            onChangeText={setNewTitle}
            style={{ fontWeight: '600' }}
          />

          <SheetLabel>Content</SheetLabel>
          <SheetInput
            placeholder="Write your log entry…"
            multiline
            value={newDesc}
            onChangeText={setNewDesc}
            style={{ minHeight: 120, textAlignVertical: 'top', marginBottom: 24 }}
          />

          <PrimaryBtn
            onPress={handleCreateNote}
            disabled={!newDesc.trim() && !newTitle.trim()}
            loading={createNoteMutation.isPending}
            label="Save log"
          />
        </BottomSheetScrollView>
      </BottomSheetModal>

      {/* ══════════════════════════════════════
          SORT SHEET
      ══════════════════════════════════════ */}
      <BottomSheetModal
        ref={filterModalRef}
        snapPoints={['38%']}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: '#e2e8f0', width: 36 }}
        backgroundStyle={{ backgroundColor: 'white', borderRadius: 24 }}
        onChange={(i) => { if (i === -1) setSortModalVisible(false); }}
      >
        <BottomSheetView style={{ paddingHorizontal: 24, paddingTop: 6, paddingBottom: 32 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: NAVY }}>Sort by</Text>
            <TouchableOpacity onPress={() => setSortModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={18} color={MUTED} />
            </TouchableOpacity>
          </View>

          <View style={{ gap: 8 }}>
            {['Newest', 'Oldest', 'A-Z', 'Z-A'].map((opt) => {
              const active = sortOrder === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  onPress={() => { setSortOrder(opt); setSortModalVisible(false); }}
                  style={{
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    paddingVertical: 13, paddingHorizontal: 14,
                    borderRadius: 12, borderWidth: 1,
                    backgroundColor: active ? SURFACE : 'white',
                    borderColor: active ? NAVY : BORDER,
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: active ? NAVY : MUTED }}>{opt}</Text>
                  {active && <Check size={15} color={NAVY} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}