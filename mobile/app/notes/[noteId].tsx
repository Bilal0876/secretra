// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  Pin,
  Archive,
  Trash2,
  Edit3,
  FileText,
  Clock,
  Check,
} from 'lucide-react-native';
import Markdown from 'react-native-markdown-display';
import { trpc } from '../../utils/trpc';

const NAVY = '#111827';
const SURFACE = '#f6f5f3';
const BORDER = '#f0eeec';
const MUTED = '#9ca3af';

export default function NoteEditorScreen() {
  const { noteId } = useLocalSearchParams<{ noteId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [plainText, setPlainText] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const utils = trpc.useUtils();

  // Fetch the note data
  const { data: notes } = trpc.note.getNotes.useQuery();
  const note = notes?.find((n: any) => n.id === noteId);

  // Initialize state from fetched note
  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setPlainText(note.plainText || '');
      setIsPinned(note.isPinned || false);
      setIsArchived(note.isArchived || false);
      setCreatedAt(note.createdAt);
    }
  }, [note?.id]);

  const updateNoteMutation = trpc.note.updateNote.useMutation({
    onSuccess: () => {
      utils.note.getNotes.invalidate();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    },
  });

  const deleteNoteMutation = trpc.note.deleteNote.useMutation({
    onSuccess: () => {
      utils.note.getNotes.invalidate();
      router.back();
    },
  });

  // Auto-save on content change (debounced)
  useEffect(() => {
    if (!noteId || !note) return;
    const t = setTimeout(() => {
      if (title.trim() || plainText.trim()) {
        setSaveStatus('saving');
        updateNoteMutation.mutate({ id: noteId, title, plainText });
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [title, plainText]);

  const handleTogglePin = useCallback(() => {
    const newVal = !isPinned;
    setIsPinned(newVal);
    updateNoteMutation.mutate({ id: noteId!, isPinned: newVal });
  }, [isPinned, noteId]);

  const handleToggleArchive = useCallback(() => {
    const newVal = !isArchived;
    setIsArchived(newVal);
    updateNoteMutation.mutate({ id: noteId!, isArchived: newVal });
  }, [isArchived, noteId]);

  const handleDelete = useCallback(() => {
    if (noteId) {
      deleteNoteMutation.mutate({ id: noteId });
    }
  }, [noteId]);

  if (!note) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: SURFACE }}>
        <ActivityIndicator size="small" color={NAVY} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <StatusBar style="dark" />

      {/* ─── Header ─── */}
      <View style={{
        paddingTop: insets.top + 8,
        paddingBottom: 12,
        paddingHorizontal: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={{
              width: 36, height: 36, borderRadius: 11,
              backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: BORDER,
            }}
          >
            <ArrowLeft size={18} color={NAVY} />
          </TouchableOpacity>

          {/* Actions row */}
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {/* Save status */}
            {saveStatus === 'saving' && <ActivityIndicator size="small" color={MUTED} />}
            {saveStatus === 'saved' && <Check size={14} color="#22c55e" />}

            {/* Pin */}
            <TouchableOpacity
              onPress={handleTogglePin}
              style={{
                width: 34, height: 34, borderRadius: 10,
                backgroundColor: isPinned ? '#fef3c7' : SURFACE,
                borderWidth: 1, borderColor: isPinned ? '#fcd34d' : BORDER,
                alignItems: 'center', justifyContent: 'center',
              }}
              activeOpacity={0.7}
            >
              <Pin size={14} color={isPinned ? '#d97706' : MUTED} />
            </TouchableOpacity>

            {/* Archive */}
            <TouchableOpacity
              onPress={handleToggleArchive}
              style={{
                width: 34, height: 34, borderRadius: 10,
                backgroundColor: isArchived ? '#f0fdf4' : SURFACE,
                borderWidth: 1, borderColor: isArchived ? '#86efac' : BORDER,
                alignItems: 'center', justifyContent: 'center',
              }}
              activeOpacity={0.7}
            >
              <Archive size={14} color={isArchived ? '#16a34a' : MUTED} />
            </TouchableOpacity>

            {/* Edit / Preview toggle */}
            <TouchableOpacity
              onPress={() => setIsEditing(!isEditing)}
              style={{
                height: 34, paddingHorizontal: 12, borderRadius: 10,
                backgroundColor: isEditing ? NAVY : SURFACE,
                borderWidth: 1, borderColor: isEditing ? NAVY : BORDER,
                alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5,
              }}
              activeOpacity={0.7}
            >
              {isEditing
                ? <FileText size={13} color="white" />
                : <Edit3 size={13} color={MUTED} />}
              <Text style={{ fontSize: 12, fontWeight: '600', color: isEditing ? 'white' : MUTED }}>
                {isEditing ? 'Preview' : 'Edit'}
              </Text>
            </TouchableOpacity>

            {/* Delete */}
            <TouchableOpacity
              onPress={() => setShowDeleteConfirm(true)}
              style={{
                width: 34, height: 34, borderRadius: 10,
                backgroundColor: '#fef2f2',
                borderWidth: 1, borderColor: '#fecaca',
                alignItems: 'center', justifyContent: 'center',
              }}
              activeOpacity={0.7}
            >
              <Trash2 size={14} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ─── Delete Confirmation Overlay ─── */}
      {showDeleteConfirm && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 100, backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'center', alignItems: 'center',
          paddingHorizontal: 32,
        }}>
          <View style={{
            backgroundColor: 'white', borderRadius: 20, padding: 28,
            width: '100%', maxWidth: 340, alignItems: 'center',
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
          }}>
            <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Trash2 size={20} color="#ef4444" />
            </View>
            <Text style={{ fontSize: 17, fontWeight: '800', color: NAVY, marginBottom: 6 }}>Delete log?</Text>
            <Text style={{ color: MUTED, textAlign: 'center', fontSize: 13, lineHeight: 20, marginBottom: 24 }}>
              "{title || 'Untitled log'}" will be permanently removed.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity
                onPress={() => setShowDeleteConfirm(false)}
                style={{ flex: 1, backgroundColor: SURFACE, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#64748b', fontWeight: '600', fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                style={{ flex: 1, backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                activeOpacity={0.85}
              >
                {deleteNoteMutation.isPending
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ─── Content ─── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 80 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Log title"
            placeholderTextColor={MUTED}
            style={{
              fontSize: 22,
              fontWeight: '800',
              color: NAVY,
              marginBottom: 16,
              paddingVertical: 4,
            }}
          />

          {/* Content area */}
          {isEditing ? (
            <TextInput
              multiline
              value={plainText}
              onChangeText={setPlainText}
              placeholder="Write your log…"
              placeholderTextColor={MUTED}
              style={{
                fontSize: 15,
                color: NAVY,
                lineHeight: 24,
                minHeight: 400,
                textAlignVertical: 'top',
                backgroundColor: SURFACE,
                padding: 16,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: BORDER,
              }}
            />
          ) : (
            <View style={{
              backgroundColor: SURFACE, padding: 16, borderRadius: 14,
              borderWidth: 1, borderColor: BORDER, minHeight: 300,
            }}>
              <Markdown style={{ body: { color: NAVY, fontSize: 15, lineHeight: 24 } }}>
                {plainText || '*No content yet. Tap Edit to write.*'}
              </Markdown>
            </View>
          )}

          {/* Timestamp */}
          {createdAt && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 20 }}>
              <Clock size={12} color={MUTED} />
              <Text style={{ fontSize: 12, color: MUTED }}>
                Created {new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
