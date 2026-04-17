// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Pressable,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { 
  FileText, 
  Search, 
  Plus, 
  CheckCircle2,
  X,
  Trash2,
  Filter,
  AlertCircle,
  Pin,
  Archive,
  ArchiveRestore,
  Edit3,
  Clock
} from 'lucide-react-native';
import Markdown from 'react-native-markdown-display';
import { trpc } from '../../utils/trpc';

const { width } = Dimensions.get('window');
const NAVY = '#111827';
const SOFT_BG = '#f6f5f3';
const CORAL = '#e87a6e';

export default function NotesScreen() {
  const [search, setSearch] = useState('');
  
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [saveStatus, setSaveStatus] = useState<'idle'|'saving'|'saved'>('idle');
  
  const [sortOrder, setSortOrder] = useState('Newest');
  const [isSortModalVisible, setSortModalVisible] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Use tRPC to fetch ALL notes (we filter locally for instant UI)
  const { data: notes, isLoading, refetch, isRefetching } = trpc.note.getNotes.useQuery();

  const processedNotes = React.useMemo(() => {
    if (!notes) return [];
    let result = [...notes];
    
    // Local Search Filter
    if (search.trim()) {
       const q = search.toLowerCase();
       result = result.filter(n => 
         (n.title && n.title.toLowerCase().includes(q)) || 
         (n.plainText && n.plainText.toLowerCase().includes(q)) ||
         (n.tags && n.tags.some((tag: string) => tag.toLowerCase().includes(q)))
       );
    }

    // Default exclude archived from main view unless specifically searching for it or showArchived is true
    if (!search.trim() && !showArchived) {
      result = result.filter(n => !n.isArchived);
    }
    
    // Sort
    result.sort((a, b) => {
      // Pinned logs float to highest priority
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (sortOrder === 'Newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortOrder === 'Oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortOrder === 'A-Z') {
        return (a.title || 'Untitled Log').localeCompare(b.title || 'Untitled Log');
      } else if (sortOrder === 'Z-A') {
        return (b.title || 'Untitled Log').localeCompare(a.title || 'Untitled Log');
      }
      return 0;
    });
    return result;
  }, [notes, search, sortOrder, showArchived]);

  // @ts-ignore - Failsafe to bypass TS inference depth limit with Prisma
  const createNoteMutation = trpc.note.createNote.useMutation({
    onSuccess: () => {
      refetch();
      setAddModalVisible(false);
      setNewTitle('');
      setNewDesc('');
    }
  });

  // @ts-ignore - Failsafe to bypass TS inference depth limit with Prisma
  const updateNoteMutation = trpc.note.updateNote.useMutation({
    onSuccess: () => {
      refetch();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  });

  const deleteNoteMutation = trpc.note.deleteNote.useMutation({
    onSuccess: () => {
      refetch();
      setDetailModalVisible(false);
      setShowDeleteConfirm(false);
    }
  });

  // Debounced Auto-Save
  React.useEffect(() => {
    if (!selectedNote || !isDetailModalVisible) return;
    
    const timeoutId = setTimeout(() => {
      if (
        selectedNote.title?.trim() !== '' || 
        selectedNote.plainText?.trim() !== ''
      ) {
         setSaveStatus('saving');
         updateNoteMutation.mutate({
           id: selectedNote.id,
           title: selectedNote.title,
           plainText: selectedNote.plainText,
         });
      }
    }, 1500); // Save 1.5s after user stops typing
    
    return () => clearTimeout(timeoutId);
  }, [selectedNote?.title, selectedNote?.plainText]);

  const handleCreateNote = () => {
    if (!newDesc.trim() && !newTitle.trim()) return;
    createNoteMutation.mutate({
      title: newTitle.trim() || 'Untitled Log',
      plainText: newDesc.trim() || undefined,
    });
  };

  const handleUpdateNote = () => {
    if (!selectedNote) return;
    setSaveStatus('saving');
    updateNoteMutation.mutate({
      id: selectedNote.id,
      title: selectedNote.title,
      plainText: selectedNote.plainText,
    });
    setDetailModalVisible(false);
  };

  const handleTogglePin = () => {
    if (!selectedNote) return;
    const upd = { ...selectedNote, isPinned: !selectedNote.isPinned };
    setSelectedNote(upd);
    setSaveStatus('saving');
    updateNoteMutation.mutate({ id: upd.id, isPinned: upd.isPinned });
  };

  const handleToggleArchive = () => {
    if (!selectedNote) return;
    const upd = { ...selectedNote, isArchived: !selectedNote.isArchived };
    setSelectedNote(upd);
    setSaveStatus('saving');
    updateNoteMutation.mutate({ id: upd.id, isArchived: upd.isArchived });
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const todayText = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  if (isLoading && !isRefetching) {
    return (
      <View className="flex-1 justify-center items-center bg-[#f6f5f3]">
        <ActivityIndicator size="large" color={NAVY} />
        <Text className="mt-4 text-slate-500 font-medium">Opening your logs...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: SOFT_BG }}>
      <StatusBar style="dark" />
      
      {/* Premium Header */}
      <View 
        className="px-6 pt-16 pb-4 bg-white border-b border-slate-50"
        style={{ 
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.02,
          shadowRadius: 4,
          elevation: 1
        }}
      >
        <View className="flex-row justify-between items-end mb-6">
          <View>
            <Text className="text-[12px] font-bold text-slate-400 uppercase tracking-[2px] mb-1">{todayText}</Text>
            <Text className="text-[32px] font-black text-[#111827] tracking-tight">Logs</Text>
          </View>
          <TouchableOpacity 
            onPress={() => setAddModalVisible(true)}
            className="w-10 h-10 rounded-full items-center justify-center bg-[#111827]"
            activeOpacity={0.8}
            style={{
              shadowColor: NAVY,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.15,
              shadowRadius: 15,
              elevation: 4
            }}
          >
            <Plus size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl mb-2">
          <Search size={18} color="#94a3b8" />
          <TextInput 
            className="flex-1 ml-3 text-[15px] font-bold text-navy"
            placeholder="Search logs..."
            placeholderTextColor="#cbd5e1"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} className="ml-2 bg-slate-200 p-1.5 rounded-full">
              <X size={14} color="#64748b" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setSortModalVisible(true)} className="ml-3 border-l border-slate-200 pl-3">
             <Filter size={18} color={sortOrder !== 'Newest' ? CORAL : NAVY} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowArchived(!showArchived)} className="ml-3 border-l border-slate-200 pl-3">
             <Archive size={18} color={showArchived ? CORAL : NAVY} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Note List */}
      <ScrollView 
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={NAVY} />
        }
      >
        <View className="mt-6 mb-4 flex-row items-center justify-between">
          <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
            {search.length > 0 ? 'Search Results' : 'Recent Entries'}
          </Text>
          <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{processedNotes.length} Total</Text>
        </View>

        {(processedNotes.length === 0) ? (
          <View className="mt-20 items-center justify-center px-10">
            <View className="w-24 h-24 bg-slate-100 rounded-[35px] items-center justify-center mb-8 rotate-[-10deg]">
              <FileText size={48} color="#cbd5e1" />
            </View>
            <Text className="text-2xl font-black text-slate-300 text-center tracking-tight">Empty Log</Text>
            <Text className="text-[15px] text-slate-400 text-center mt-3 font-medium leading-6">
              Start documenting important details. Tap the add button to log a new entry.
            </Text>
          </View>
        ) : (
          processedNotes.map((note: any) => (
            <NoteItem 
              key={note.id} 
              note={note} 
              onPress={() => {
                setSelectedNote(note);
                setShowDeleteConfirm(false);
                setIsEditingMode(false);
                setDetailModalVisible(true);
              }}
            />
          ))
        )}
      </ScrollView>

      {/* Modern Add Log Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isAddModalVisible}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/60"
        >
          <Pressable className="flex-1" onPress={() => setAddModalVisible(false)} />
          <View className="bg-white rounded-t-[50px] px-8 pt-12 pb-14 shadow-2xl">
            <View className="w-12 h-1.5 bg-slate-100 rounded-full self-center mb-8" />
            
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-navy" style={{ color: NAVY }}>Draft Log</Text>
              <TouchableOpacity 
                onPress={() => setAddModalVisible(false)}
                className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center"
              >
                <X size={18} color={NAVY} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="max-h-[60vh]">
              <View className="mb-4">
                <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Title / Subject</Text>
                <TextInput
                  placeholder="Capture the subject..."
                  placeholderTextColor="#cbd5e1"
                  className="bg-slate-50 p-4 rounded-2xl text-[15px] font-bold text-navy border border-slate-100"
                  value={newTitle}
                  onChangeText={setNewTitle}
                  style={{ color: NAVY }}
                />
              </View>

              <View className="mb-8">
                <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Log Content</Text>
                <TextInput
                  placeholder="Write documentation..."
                  placeholderTextColor="#cbd5e1"
                  multiline
                  className="bg-slate-50 p-4 rounded-2xl text-[14px] font-medium text-navy border border-slate-100 min-h-[150px]"
                  value={newDesc}
                  onChangeText={setNewDesc}
                  style={{ color: NAVY }}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={handleCreateNote}
              disabled={(!newDesc.trim() && !newTitle.trim()) || createNoteMutation.isPending}
              className={`py-4 rounded-2xl items-center ${(!newDesc.trim() && !newTitle.trim()) ? 'bg-slate-100' : 'bg-navy'}`}
              style={(!newDesc.trim() && !newTitle.trim()) ? {} : { 
                backgroundColor: NAVY,
                shadowColor: NAVY,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
              }}
            >
              {createNoteMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-[16px]">Save Entry</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit/Detail Log Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isDetailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/60"
        >
          <Pressable className="flex-1" onPress={() => setDetailModalVisible(false)} />
          <View className="bg-white rounded-t-[50px] px-8 pt-12 pb-14 shadow-2xl">
            <View className="w-12 h-1.5 bg-slate-100 rounded-full self-center mb-8" />
            
            {showDeleteConfirm && selectedNote ? (
              <View className="items-center py-4">
                <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-5">
                  <AlertCircle size={28} color="#ef4444" />
                </View>
                <Text className="text-2xl font-bold text-navy mb-2">Delete Log?</Text>
                <Text className="text-slate-500 text-center mb-8 px-4 leading-6">
                  Are you sure you want to permanently delete this entry? This cannot be undone.
                </Text>
                
                <View className="flex-row gap-3 w-full">
                  <TouchableOpacity 
                    onPress={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-4 bg-slate-50 rounded-2xl items-center border border-slate-100"
                  >
                    <Text className="font-bold text-slate-600">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => deleteNoteMutation.mutate({ id: selectedNote.id })}
                    className="flex-1 py-4 bg-coral rounded-2xl items-center shadow-sm"
                    style={{ backgroundColor: CORAL }}
                  >
                    {deleteNoteMutation.isPending ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="font-bold text-white">Delete</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : selectedNote ? (
              <>
                <View className="flex-row justify-between items-center mb-6">
                  <Text className="text-2xl font-bold text-navy max-w-[50%]" style={{ color: NAVY }} numberOfLines={1}>{selectedNote.title || 'Log Entry'}</Text>
                  <View className="flex-row gap-1 items-center">
                    <TouchableOpacity onPress={handleTogglePin} className={`p-2 rounded-full ${selectedNote.isPinned ? 'bg-amber-100' : 'bg-slate-50'}`}>
                       <Pin size={16} color={selectedNote.isPinned ? '#d97706' : '#94a3b8'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleToggleArchive} className={`p-2 rounded-full ${selectedNote.isArchived ? 'bg-amber-100' : 'bg-slate-50'}`}>
                       {selectedNote.isArchived ? <ArchiveRestore size={16} color="#d97706" /> : <Archive size={16} color="#94a3b8" />}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowDeleteConfirm(true)} className="p-2 ml-1">
                       <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setDetailModalVisible(false)} className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center ml-1">
                      <X size={16} color={NAVY} />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} className="max-h-[60vh]">
                  <View className="mb-4">
                    <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Title / Subject</Text>
                    <TextInput
                      className="bg-slate-50 p-4 rounded-2xl text-[15px] font-bold text-navy border border-slate-100"
                      value={selectedNote.title || ''}
                      onChangeText={(t) => setSelectedNote({...selectedNote, title: t})}
                      style={{ color: NAVY }}
                      placeholder="Untitled Log"
                      placeholderTextColor="#cbd5e1"
                    />
                  </View>
                  
                  <View className="mb-8">
                    <View className="flex-row justify-between mb-2 ml-1 pr-1">
                      <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Log Content</Text>
                      <TouchableOpacity onPress={() => setIsEditingMode(!isEditingMode)} className="flex-row items-center">
                        {isEditingMode ? <FileText size={12} color={NAVY} /> : <Edit3 size={12} color={NAVY} />}
                        <Text className="text-[11px] font-bold text-navy ml-1">{isEditingMode ? 'PREVIEW' : 'EDIT MARKDOWN'}</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {isEditingMode ? (
                      <TextInput
                        multiline
                        className="bg-slate-50 p-4 rounded-2xl text-[14px] font-medium text-navy border border-slate-100 min-h-[250px]"
                        value={selectedNote.plainText || ''}
                        onChangeText={(t) => setSelectedNote({...selectedNote, plainText: t})}
                        style={{ color: NAVY }}
                        placeholder="Write dynamic Markdown here..."
                        placeholderTextColor="#cbd5e1"
                        textAlignVertical="top"
                      />
                    ) : (
                      <View className="bg-slate-50 p-4 rounded-2xl border border-slate-100 min-h-[250px]">
                        {selectedNote.plainText ? (
                           <Markdown style={{ body: { color: NAVY, fontSize: 15, lineHeight: 24 } }}>{selectedNote.plainText}</Markdown>
                        ) : (
                           <Text className="text-slate-400 font-medium italic">Empty log body...</Text>
                        )}
                      </View>
                    )}
                  </View>
                </ScrollView>

                <View className="flex-row items-center justify-between pt-2">
                  <View className="flex-row items-center pl-2 flex-1">
                    {saveStatus === 'saving' ? (
                       <ActivityIndicator size="small" color="#94a3b8" />
                    ) : saveStatus === 'saved' ? (
                       <CheckCircle2 size={16} color="#10b981" />
                    ) : (
                       <Clock size={16} color="#e2e8f0" />
                    )}
                    <Text className="text-[12px] font-bold text-slate-400 ml-2">
                       {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Auto-saved'}
                    </Text>
                  </View>

                  <TouchableOpacity 
                    onPress={() => setDetailModalVisible(false)}
                    className="flex-1 py-4 rounded-2xl items-center shadow-sm"
                    style={{ backgroundColor: NAVY }}
                  >
                    <Text className="font-bold text-white tracking-widest uppercase text-[12px]">Done</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Sort Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isSortModalVisible}
        onRequestClose={() => setSortModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/60"
        >
          <Pressable className="flex-1" onPress={() => setSortModalVisible(false)} />
          <View className="bg-white rounded-t-[40px] px-8 pt-10 pb-14 shadow-2xl">
            <View className="flex-row justify-between items-center mb-6">
               <Text className="text-2xl font-bold text-navy" style={{ color: NAVY }}>Sort Logs</Text>
               <TouchableOpacity onPress={() => setSortModalVisible(false)} className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center">
                 <X size={18} color={NAVY} />
               </TouchableOpacity>
            </View>
            
            <View className="gap-3">
              {['Newest', 'Oldest', 'A-Z', 'Z-A'].map(option => (
                <TouchableOpacity 
                  key={option}
                  onPress={() => { setSortOrder(option); setSortModalVisible(false); }}
                  className={`p-4 rounded-2xl flex-row justify-between items-center border ${sortOrder === option ? 'bg-slate-50' : 'border-slate-100'}`}
                  style={sortOrder === option ? { borderColor: NAVY } : {}}
                >
                  <Text className={`font-bold text-[16px] ${sortOrder === option ? 'text-navy' : 'text-slate-400'}`} style={sortOrder === option ? { color: NAVY } : {}}>{option}</Text>
                  {sortOrder === option && <CheckCircle2 size={20} color={NAVY} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function NoteItem({ note, onPress }: { note: any; onPress: () => void }) {
  const dateObj = new Date(note.createdAt);
  const dateStr = dateObj.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
  
  return (
    <TouchableOpacity 
      onPress={onPress}
      className="bg-white rounded-[24px] p-5 mb-3 border border-slate-100"
      style={{ 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.03, 
        shadowRadius: 10,
        elevation: 1 
      }}
      activeOpacity={0.7}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1 mr-3 flex-row items-center">
          {note.isPinned && <Pin size={14} color="#d97706" className="mr-2" />}
          {note.isArchived && <Archive size={14} color="#94a3b8" className="mr-2" />}
          <Text className="text-[16px] font-bold text-navy pr-2 leading-6" style={{ color: NAVY }} numberOfLines={1}>
            {note.title || 'Untitled Log'}
          </Text>
        </View>
      </View>
      
      <Text className="text-[14px] font-medium text-slate-500 leading-5 mb-4" numberOfLines={2}>
        {note.plainText || 'No content provided.'}
      </Text>

      <View className="flex-row items-center border-t border-slate-50 pt-3">
        <View className="flex-row items-center bg-slate-50 py-1 px-2.5 rounded-lg border border-slate-100">
          <Clock size={11} color="#64748b" />
          <Text className="text-[10px] text-slate-500 ml-1.5 font-bold uppercase tracking-wider">{dateStr}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
