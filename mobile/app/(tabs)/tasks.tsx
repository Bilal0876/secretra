// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CheckCircle2,
  Circle,
  Plus,
  Filter,
  ChevronRight,
  Clock,
  AlertCircle,
  X,
  Trash2,
} from 'lucide-react-native';
import { trpc } from '../../utils/trpc';

const NAVY = '#111827';
const SURFACE = '#f6f5f3';
const BORDER = '#f0eeec';
const MUTED = '#9ca3af';
const CORAL = '#e87a6e';

type TaskPriority = 'P1' | 'P2' | 'P3' | 'P4';
type TaskStatus = 'todo' | 'in_progress' | 'done';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  startDate?: string | null;
  dueDate?: string | null;
}

// ── Priority config ──
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  P1: '#ef4444',
  P2: '#f59e0b',
  P3: '#3b82f6',
  P4: '#9ca3af',
};

// ── Shared sheet helpers ──
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

const GhostBtn = ({ onPress, label }: any) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={{ backgroundColor: SURFACE, borderRadius: 12, paddingVertical: 14, alignItems: 'center', flex: 1 }}
  >
    <Text style={{ color: '#64748b', fontWeight: '600', fontSize: 15 }}>{label}</Text>
  </TouchableOpacity>
);

// ── Priority pill ──
const PriorityPill = ({ value, active, onPress }: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      flex: 1, paddingVertical: 10, borderRadius: 10,
      alignItems: 'center',
      backgroundColor: active ? NAVY : 'white',
      borderWidth: 1,
      borderColor: active ? NAVY : BORDER,
    }}
    activeOpacity={0.7}
  >
    <Text style={{ fontWeight: '700', fontSize: 13, color: active ? 'white' : MUTED }}>{value}</Text>
  </TouchableOpacity>
);

// ── Chip (filter) ──
const Chip = ({ label, active, coral, onPress }: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: active ? (coral ? CORAL : NAVY) : 'white',
      borderWidth: 1,
      borderColor: active ? (coral ? CORAL : NAVY) : BORDER,
      marginBottom: 8,
      marginRight: 8,
    }}
    activeOpacity={0.7}
  >
    <Text style={{ fontWeight: '600', fontSize: 13, color: active ? 'white' : '#64748b' }}>{label}</Text>
  </TouchableOpacity>
);

// ── Date helpers ──
function formatTaskDate(start?: string | null, due?: string | null) {
  if (!start && !due) return 'No date';
  const fmt = (d: string) => {
    const date = new Date(d);
    const mo = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const h = date.getHours();
    const m = date.getMinutes();
    if (h || m) {
      const displayH = h % 12 || 12;
      const ampm = h >= 12 ? 'PM' : 'AM';
      return `${mo} ${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
    }
    return mo;
  };
  if (start && due) return `${fmt(start)} → ${fmt(due)}`;
  if (due) return `Due ${fmt(due)}`;
  return `From ${fmt(start!)}`;
}

function formatPickerDate(date: Date) {
  const mo = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const h = date.getHours();
  const m = date.getMinutes();
  const displayH = h % 12 || 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${mo} ${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// ── Task row ──
function TaskItem({ task, onToggle, onPress }: { task: any; onToggle: () => void; onPress: () => void }) {
  const isDone = task.status === 'done';
  const pColor = PRIORITY_COLOR[task.priority as TaskPriority] ?? MUTED;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.65}
      style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 14, marginBottom: 10,
        paddingVertical: 13, paddingHorizontal: 14,
        borderWidth: 1, borderColor: BORDER,
      }}
    >
      {/* Checkbox */}
      <TouchableOpacity onPress={onToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        {isDone ? (
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={13} color="white" />
          </View>
        ) : (
          <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: pColor, opacity: 0.5 }} />
          </View>
        )}
      </TouchableOpacity>

      {/* Content */}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 15, fontWeight: '600', color: isDone ? '#cbd5e1' : NAVY, textDecorationLine: isDone ? 'line-through' : 'none' }}
        >
          {task.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isDone ? '#e2e8f0' : pColor }} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: MUTED }}>{task.priority}</Text>
          {(task.startDate || task.dueDate) && (
            <>
              <Text style={{ color: BORDER, fontSize: 11 }}>·</Text>
              <Clock size={10} color={MUTED} />
              <Text style={{ fontSize: 11, color: MUTED }} numberOfLines={1}>{formatTaskDate(task.startDate, task.dueDate)}</Text>
            </>
          )}
        </View>
      </View>

      <ChevronRight size={14} color={BORDER} style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );
}

// ── Tab button ──
function TabBtn({ label, active, count, onPress }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: active ? 'white' : 'transparent',
        borderWidth: active ? 1 : 0,
        borderColor: BORDER,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: '700', color: active ? NAVY : MUTED }}>{label}</Text>
      <View style={{
        marginLeft: 7, paddingHorizontal: 7, paddingVertical: 2,
        borderRadius: 6, backgroundColor: active ? NAVY : '#f1f5f9',
      }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: active ? 'white' : MUTED }}>{count}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ──
export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'active' | 'done'>('active');
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Filters
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'ALL'>('ALL');
  const [filterTimeline, setFilterTimeline] = useState<'ALL' | 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'FLEXIBLE'>('ALL');
  const activeFiltersCount = (filterPriority !== 'ALL' ? 1 : 0) + (filterTimeline !== 'ALL' ? 1 : 0);

  // Form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('P3');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end'>('start');
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  const addModalRef = useRef<BottomSheetModal>(null);
  const filterModalRef = useRef<BottomSheetModal>(null);
  const detailModalRef = useRef<BottomSheetModal>(null);

  useEffect(() => { if (isAddModalVisible) addModalRef.current?.present(); else addModalRef.current?.dismiss(); }, [isAddModalVisible]);
  useEffect(() => { if (isFilterModalVisible) filterModalRef.current?.present(); else filterModalRef.current?.dismiss(); }, [isFilterModalVisible]);
  useEffect(() => { if (isDetailModalVisible) detailModalRef.current?.present(); else detailModalRef.current?.dismiss(); }, [isDetailModalVisible]);

  const { data: tasks, isLoading, refetch, isRefetching, isError } = trpc.task.getTasks.useQuery();

  const createTaskMutation = trpc.task.createTask.useMutation({
    onSuccess: () => { refetch(); setAddModalVisible(false); resetForm(); },
    onError: (err) => Alert.alert('Error', err.message),
  });
  const updateTaskMutation = trpc.task.updateTask.useMutation({
    onSuccess: () => { refetch(); setDetailModalVisible(false); },
    onError: (err) => Alert.alert('Error', err.message),
  });
  const deleteTaskMutation = trpc.task.deleteTask.useMutation({
    onSuccess: () => { refetch(); setDetailModalVisible(false); },
    onError: (err) => Alert.alert('Error', err.message),
  });

  // Conflict detection for current user
  const availabilityQuery = trpc.calendar.getTeamAvailability.useQuery(
    {
      // Mock a group or use a dedicated check personal procedure? 
      // For now, let's use a simple personal check or just rely on the error from mutation.
      // But user wants "real-time" feedback. 
      // I'll create a new procedure in calendar.ts for personal availability check.
      groupId: '', // Special case or just use a new one
    },
    { enabled: false }
  );

  const checkPersonalConflicts = trpc.calendar.getEvents.useQuery(
    {
      startDate: (isDetailModalVisible ? selectedTask?.startDate : startDate?.toISOString()) || undefined,
      endDate: (isDetailModalVisible ? selectedTask?.dueDate : dueDate?.toISOString()) || undefined,
    },
    {
      enabled: (isAddModalVisible || isDetailModalVisible) && !!((isDetailModalVisible ? selectedTask?.startDate : startDate) && (isDetailModalVisible ? selectedTask?.dueDate : dueDate)),
    }
  );

  // We check for conflicts in the returned events. 
  // Optimization: Use a dedicated 'checkConflicts' procedure if available.
  const hasConflict = useMemo(() => {
    const s = isDetailModalVisible ? selectedTask?.startDate : startDate?.toISOString();
    const e = isDetailModalVisible ? selectedTask?.dueDate : dueDate?.toISOString();
    if (!s || !e || !checkPersonalConflicts.data) return false;
    
    // The query returns events overlapping with the range. 
    // If it returns anything (excluding the current task if it had an eventId), it's a conflict.
    return checkPersonalConflicts.data.length > 0;
  }, [checkPersonalConflicts.data, isDetailModalVisible, selectedTask, startDate, dueDate]);

  const resetForm = () => { setNewTitle(''); setNewDesc(''); setNewPriority('P3'); setStartDate(null); setDueDate(null); };

  const toggleTask = (id: string, currentStatus: string) =>
    updateTaskMutation.mutate({ id, status: currentStatus === 'done' ? 'todo' : 'done' });

  const handleCreateTask = () => {
    if (!newTitle.trim()) return;
    const payload: any = { title: newTitle, description: newDesc, priority: newPriority };
    if (startDate) payload.startDate = startDate.toISOString();
    if (dueDate) payload.dueDate = dueDate.toISOString();
    createTaskMutation.mutate(payload);
  };

  const handlePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowPicker(false);
    if (!selectedDate) return;
    const isDetail = isDetailModalVisible && selectedTask;
    if (pickerTarget === 'start') {
      const current = isDetail ? (selectedTask.startDate ? new Date(selectedTask.startDate) : new Date()) : (startDate || new Date());
      if (pickerMode === 'date') {
        selectedDate.setHours(current.getHours(), current.getMinutes());
        isDetail ? setSelectedTask({ ...selectedTask, startDate: selectedDate.toISOString() }) : setStartDate(selectedDate);
        setTimeout(() => { setPickerMode('time'); setPickerTarget('start'); setShowPicker(true); }, 100);
      } else {
        isDetail ? setSelectedTask({ ...selectedTask, startDate: selectedDate.toISOString() }) : setStartDate(selectedDate);
      }
    } else {
      const current = isDetail ? (selectedTask.dueDate ? new Date(selectedTask.dueDate) : new Date()) : (dueDate || new Date());
      if (pickerMode === 'date') {
        selectedDate.setHours(current.getHours(), current.getMinutes());
        isDetail ? setSelectedTask({ ...selectedTask, dueDate: selectedDate.toISOString() }) : setDueDate(selectedDate);
        setTimeout(() => { setPickerMode('time'); setPickerTarget('end'); setShowPicker(true); }, 100);
      } else {
        isDetail ? setSelectedTask({ ...selectedTask, dueDate: selectedDate.toISOString() }) : setDueDate(selectedDate);
      }
    }
  };

  const handleUpdateTask = () => {
    if (!selectedTask?.title.trim()) return;
    updateTaskMutation.mutate({
      id: selectedTask.id,
      title: selectedTask.title,
      description: selectedTask.description || undefined,
      priority: selectedTask.priority,
      startDate: selectedTask.startDate,
      dueDate: selectedTask.dueDate,
    });
  };

  const filteredTasks = tasks?.filter((task: any) => {
    if (activeTab === 'done' && task.status !== 'done') return false;
    if (activeTab === 'active' && task.status === 'done') return false;
    if (filterPriority !== 'ALL' && task.priority !== filterPriority) return false;
    if (filterTimeline !== 'ALL') {
      const now = new Date(); now.setHours(0, 0, 0, 0);
      const eod = new Date(now); eod.setHours(23, 59, 59, 999);
      const hasDate = task.startDate || task.dueDate;
      if (filterTimeline === 'FLEXIBLE') return !hasDate;
      if (!hasDate) return false;
      const check = new Date(task.dueDate || task.startDate);
      if (filterTimeline === 'OVERDUE' && check >= now) return false;
      if (filterTimeline === 'TODAY' && (check < now || check > eod)) return false;
      if (filterTimeline === 'UPCOMING' && check <= eod) return false;
    }
    return true;
  }) || [];

  const stats = {
    active: tasks?.filter((t: any) => t.status !== 'done').length || 0,
    done: tasks?.filter((t: any) => t.status === 'done').length || 0,
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
      <AlertCircle color="#ef4444" size={28} />
      <Text style={{ color: NAVY, fontSize: 16, fontWeight: '700', marginTop: 12 }}>Failed to load tasks</Text>
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
        paddingBottom: 14,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: '600', color: MUTED, letterSpacing: 0.8, marginBottom: 2 }}>{todayText}</Text>
            <Text style={{ fontSize: 26, fontWeight: '800', color: NAVY, letterSpacing: -0.5 }}>Tasks</Text>
          </View>
          <TouchableOpacity
            onPress={() => setAddModalVisible(true)}
            activeOpacity={0.85}
            style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={18} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Tabs + filter ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 8 }}>
        <TabBtn label="In Progress" active={activeTab === 'active'} count={stats.active} onPress={() => setActiveTab('active')} />
        <TabBtn label="Done" active={activeTab === 'done'} count={stats.done} onPress={() => setActiveTab('done')} />
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => setFilterModalVisible(true)}
          style={{
            width: 36, height: 36, borderRadius: 11,
            backgroundColor: 'white', alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: BORDER,
          }}
          activeOpacity={0.7}
        >
          <Filter size={16} color={activeFiltersCount > 0 ? CORAL : NAVY} />
          {activeFiltersCount > 0 && (
            <View style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 4, backgroundColor: CORAL, borderWidth: 1.5, borderColor: 'white' }} />
          )}
        </TouchableOpacity>
      </View>

      {/* ── List ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={NAVY} />}
      >
        {filteredTasks.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 72, paddingHorizontal: 24 }}>
            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <CheckCircle2 size={24} color="#cbd5e1" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#cbd5e1' }}>
              {activeTab === 'done' ? 'No completed tasks' : 'Nothing here yet'}
            </Text>
            <Text style={{ fontSize: 13, color: MUTED, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
              {activeTab === 'active' ? 'Tap + to add your first task.' : 'Complete tasks to see them here.'}
            </Text>
          </View>
        ) : (
          filteredTasks.map((task: any) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={() => toggleTask(task.id, task.status)}
              onPress={() => { setSelectedTask(task); setDetailModalVisible(true); setShowDeleteConfirm(false); }}
            />
          ))
        )}
      </ScrollView>

      {/* ══════════════════════════════════════
          ADD TASK SHEET
      ══════════════════════════════════════ */}
      <BottomSheetModal
        ref={addModalRef}
        snapPoints={['75%']}
        enablePanDownToClose
        onChange={(i) => { if (i === -1) setAddModalVisible(false); }}
        keyboardBehavior="interactive"
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: '#e2e8f0', width: 36 }}
        backgroundStyle={{ backgroundColor: 'white', borderRadius: 24 }}
      >
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 6, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: NAVY }}>New task</Text>
            <TouchableOpacity onPress={() => setAddModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={18} color={MUTED} />
            </TouchableOpacity>
          </View>

          <SheetLabel>Title</SheetLabel>
          <SheetInput placeholder="What needs to be done?" value={newTitle} onChangeText={setNewTitle} />

          <SheetLabel>Description</SheetLabel>
          <SheetInput
            placeholder="Add details (optional)"
            multiline value={newDesc} onChangeText={setNewDesc}
            style={{ minHeight: 72, textAlignVertical: 'top' }}
          />

          <SheetLabel>Timeline</SheetLabel>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
            <TouchableOpacity
              onPress={() => { setPickerTarget('start'); setPickerMode('date'); setShowPicker(true); }}
              style={{ flex: 1, backgroundColor: SURFACE, borderRadius: 12, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: BORDER }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 10, fontWeight: '600', color: MUTED, marginBottom: 3 }}>START</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: startDate ? NAVY : MUTED }}>
                {startDate ? formatPickerDate(startDate) : 'Set start'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setPickerTarget('end'); setPickerMode('date'); setShowPicker(true); }}
              style={{ flex: 1, backgroundColor: SURFACE, borderRadius: 12, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: BORDER }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 10, fontWeight: '600', color: MUTED, marginBottom: 3 }}>DUE</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: dueDate ? NAVY : MUTED }}>
                {dueDate ? formatPickerDate(dueDate) : 'Set due date'}
              </Text>
            </TouchableOpacity>
          </View>
          <SheetLabel>Priority</SheetLabel>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
            {(['P1', 'P2', 'P3', 'P4'] as TaskPriority[]).map((p) => (
              <PriorityPill key={p} value={p} active={newPriority === p} onPress={() => setNewPriority(p)} />
            ))}
          </View>

          {/* Conflict Warning */}
          {hasConflict && (
            <View style={{ marginBottom: 24, backgroundColor: '#fff7ed', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#fed7aa', flexDirection: 'row', gap: 10 }}>
              <AlertCircle size={18} color="#ea580c" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#9a3412' }}>Schedule Conflict</Text>
                <Text style={{ fontSize: 12, color: '#c2410c', marginTop: 2 }}>
                  This task overlaps with existing events or tasks on your calendar.
                </Text>
              </View>
            </View>
          )}

          <PrimaryBtn onPress={handleCreateTask} disabled={!newTitle.trim()} loading={createTaskMutation.isPending} label="Add task" />
        </BottomSheetScrollView>

        {showPicker && (
          <DateTimePicker
            value={pickerTarget === 'start' ? (startDate || new Date()) : (dueDate || new Date())}
            mode={pickerMode} is24Hour={false} onChange={handlePickerChange}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          />
        )}
      </BottomSheetModal>

      {/* ══════════════════════════════════════
          FILTER SHEET
      ══════════════════════════════════════ */}
      <BottomSheetModal
        ref={filterModalRef}
        snapPoints={['48%']}
        enablePanDownToClose
        onChange={(i) => { if (i === -1) setFilterModalVisible(false); }}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: '#e2e8f0', width: 36 }}
        backgroundStyle={{ backgroundColor: 'white', borderRadius: 24 }}
      >
        <BottomSheetView style={{ paddingHorizontal: 24, paddingTop: 6, paddingBottom: 32 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: NAVY }}>Filter</Text>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              {activeFiltersCount > 0 && (
                <TouchableOpacity onPress={() => { setFilterPriority('ALL'); setFilterTimeline('ALL'); }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: CORAL }}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setFilterModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={18} color={MUTED} />
              </TouchableOpacity>
            </View>
          </View>

          <SheetLabel>Priority</SheetLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
            {(['ALL', 'P1', 'P2', 'P3', 'P4'] as const).map((p) => (
              <Chip key={p} label={p === 'ALL' ? 'Any' : p} active={filterPriority === p} onPress={() => setFilterPriority(p)} />
            ))}
          </View>

          <SheetLabel>Timeline</SheetLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24 }}>
            {(['ALL', 'OVERDUE', 'TODAY', 'UPCOMING', 'FLEXIBLE'] as const).map((t) => {
              const labels = { ALL: 'All', OVERDUE: 'Overdue', TODAY: 'Today', UPCOMING: 'Upcoming', FLEXIBLE: 'Flexible' };
              return <Chip key={t} label={labels[t]} active={filterTimeline === t} coral onPress={() => setFilterTimeline(t)} />;
            })}
          </View>

          <PrimaryBtn onPress={() => setFilterModalVisible(false)} label={activeFiltersCount > 0 ? `Apply (${activeFiltersCount})` : 'Apply'} />
        </BottomSheetView>
      </BottomSheetModal>

      {/* ══════════════════════════════════════
          DETAIL / EDIT SHEET
      ══════════════════════════════════════ */}
      <BottomSheetModal
        ref={detailModalRef}
        snapPoints={['80%']}
        enablePanDownToClose
        onChange={(i) => { if (i === -1) { setDetailModalVisible(false); setShowDeleteConfirm(false); } }}
        keyboardBehavior="interactive"
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: '#e2e8f0', width: 36 }}
        backgroundStyle={{ backgroundColor: 'white', borderRadius: 24 }}
      >
        {showDeleteConfirm && selectedTask ? (
          <BottomSheetView style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, alignItems: 'center' }}>
            <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Trash2 size={20} color="#ef4444" />
            </View>
            <Text style={{ fontSize: 17, fontWeight: '800', color: NAVY, marginBottom: 6 }}>Delete task?</Text>
            <Text style={{ color: MUTED, textAlign: 'center', fontSize: 13, lineHeight: 20, marginBottom: 28 }}>
              "<Text style={{ color: NAVY, fontWeight: '600' }}>{selectedTask.title}</Text>" will be permanently removed.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <GhostBtn onPress={() => setShowDeleteConfirm(false)} label="Cancel" />
              <TouchableOpacity
                onPress={() => { deleteTaskMutation.mutate({ id: selectedTask.id }); setShowDeleteConfirm(false); }}
                style={{ flex: 1, backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                activeOpacity={0.85}
              >
                {deleteTaskMutation.isPending
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Delete</Text>}
              </TouchableOpacity>
            </View>
          </BottomSheetView>
        ) : selectedTask ? (
          <BottomSheetScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 6, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: NAVY }}>Edit task</Text>
              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                <TouchableOpacity onPress={() => setShowDeleteConfirm(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Trash2 size={16} color="#ef4444" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDetailModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={18} color={MUTED} />
                </TouchableOpacity>
              </View>
            </View>

            <SheetLabel>Title</SheetLabel>
            <SheetInput value={selectedTask.title} onChangeText={(t) => setSelectedTask({ ...selectedTask, title: t })} />

            <SheetLabel>Description</SheetLabel>
            <SheetInput
              multiline placeholder="Add details"
              value={selectedTask.description || ''}
              onChangeText={(t) => setSelectedTask({ ...selectedTask, description: t })}
              style={{ minHeight: 72, textAlignVertical: 'top' }}
            />

            <SheetLabel>Timeline</SheetLabel>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
              <TouchableOpacity
                onPress={() => { setPickerTarget('start'); setPickerMode('date'); setShowPicker(true); }}
                style={{ flex: 1, backgroundColor: SURFACE, borderRadius: 12, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: BORDER }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 10, fontWeight: '600', color: MUTED, marginBottom: 3 }}>START</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: selectedTask.startDate ? NAVY : MUTED }}>
                  {selectedTask.startDate ? formatPickerDate(new Date(selectedTask.startDate)) : 'Set start'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setPickerTarget('end'); setPickerMode('date'); setShowPicker(true); }}
                style={{ flex: 1, backgroundColor: SURFACE, borderRadius: 12, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: BORDER }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 10, fontWeight: '600', color: MUTED, marginBottom: 3 }}>DUE</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: selectedTask.dueDate ? NAVY : MUTED }}>
                  {selectedTask.dueDate ? formatPickerDate(new Date(selectedTask.dueDate)) : 'Set due date'}
                </Text>
              </TouchableOpacity>
            </View>

            <SheetLabel>Priority</SheetLabel>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
              {(['P1', 'P2', 'P3', 'P4'] as TaskPriority[]).map((p) => (
                <PriorityPill key={p} value={p} active={selectedTask.priority === p} onPress={() => setSelectedTask({ ...selectedTask, priority: p })} />
              ))}
            </View>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => { toggleTask(selectedTask.id, selectedTask.status); setDetailModalVisible(false); }}
                style={{ flex: 1, backgroundColor: SURFACE, borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: BORDER }}
                activeOpacity={0.7}
              >
                <Text style={{ fontWeight: '700', color: NAVY, fontSize: 14 }}>
                  {selectedTask.status === 'done' ? 'Mark active' : 'Mark done'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpdateTask}
                disabled={!selectedTask.title.trim() || updateTaskMutation.isPending}
                style={{ flex: 1, backgroundColor: NAVY, borderRadius: 12, paddingVertical: 13, alignItems: 'center', opacity: !selectedTask.title.trim() ? 0.4 : 1 }}
                activeOpacity={0.85}
              >
                {updateTaskMutation.isPending
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text style={{ fontWeight: '700', color: 'white', fontSize: 14 }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </BottomSheetScrollView>
        ) : null}

        {showPicker && isDetailModalVisible && (
          <DateTimePicker
            value={pickerTarget === 'start'
              ? (selectedTask?.startDate ? new Date(selectedTask.startDate) : new Date())
              : (selectedTask?.dueDate ? new Date(selectedTask.dueDate) : new Date())}
            mode={pickerMode} is24Hour={false} onChange={handlePickerChange}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          />
        )}
      </BottomSheetModal>
    </View>
  );
}