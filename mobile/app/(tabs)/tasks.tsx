import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';
import { 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Plus, 
  Filter, 
  Search, 
  ChevronRight,
  Clock,
  AlertCircle,
  X,
  Trash2,
  Edit2
} from 'lucide-react-native';
import { trpc } from '../../utils/trpc';

const { width, height } = Dimensions.get('window');
const NAVY = '#111827';
const SOFT_BG = '#f6f5f3';
const ACCENT = '#3b82f6';
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

export default function TasksScreen() {
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'done'
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Filter State
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'ALL'>('ALL');
  const [filterTimeline, setFilterTimeline] = useState<'ALL' | 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'FLEXIBLE'>('ALL');
  
  const activeFiltersCount = (filterPriority !== 'ALL' ? 1 : 0) + (filterTimeline !== 'ALL' ? 1 : 0);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('P3');
  
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end'>('start');
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  // Use tRPC to fetch tasks
  const { data: tasks, isLoading, refetch, isRefetching } = trpc.task.getTasks.useQuery();
  
  const createTaskMutation = trpc.task.createTask.useMutation({
    onSuccess: () => {
      refetch();
      setAddModalVisible(false);
      resetForm();
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const updateTaskMutation = trpc.task.updateTask.useMutation({
    onSuccess: () => {
      refetch();
      setDetailModalVisible(false);
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const deleteTaskMutation = trpc.task.deleteTask.useMutation({
    onSuccess: () => {
      refetch();
      setDetailModalVisible(false);
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const resetForm = () => {
    setNewTitle('');
    setNewDesc('');
    setNewPriority('P3');
    setStartDate(null);
    setDueDate(null);
  };

  const toggleTask = (id: string, currentStatus: string) => {
    updateTaskMutation.mutate({
      id,
      status: currentStatus === 'done' ? 'todo' : 'done',
    });
  };

  const handleCreateTask = () => {
    if (!newTitle.trim()) return;
    
    // Simple validation for ISO dates if provided
    const payload: any = {
      title: newTitle,
      description: newDesc,
      priority: newPriority,
    };

    if (startDate) payload.startDate = startDate.toISOString();
    if (dueDate) payload.dueDate = dueDate.toISOString();

    createTaskMutation.mutate(payload);
  };

  const handlePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) {
      if (isDetailModalVisible && selectedTask) {
         if (pickerTarget === 'start') {
             const current = selectedTask.startDate ? new Date(selectedTask.startDate) : new Date();
             if (pickerMode === 'date') {
                selectedDate.setHours(current.getHours(), current.getMinutes());
                setSelectedTask({...selectedTask, startDate: selectedDate.toISOString()});
                setTimeout(() => { setPickerMode('time'); setPickerTarget('start'); setShowPicker(true); }, 100);
             } else {
                setSelectedTask({...selectedTask, startDate: selectedDate.toISOString()});
             }
         } else {
             const current = selectedTask.dueDate ? new Date(selectedTask.dueDate) : new Date();
             if (pickerMode === 'date') {
                selectedDate.setHours(current.getHours(), current.getMinutes());
                setSelectedTask({...selectedTask, dueDate: selectedDate.toISOString()});
                setTimeout(() => { setPickerMode('time'); setPickerTarget('end'); setShowPicker(true); }, 100);
             } else {
                setSelectedTask({...selectedTask, dueDate: selectedDate.toISOString()});
             }
         }
      } else {
        if (pickerTarget === 'start') {
          const current = startDate || new Date();
          if (pickerMode === 'date') {
            selectedDate.setHours(current.getHours(), current.getMinutes());
            setStartDate(selectedDate);
            setTimeout(() => { setPickerMode('time'); setPickerTarget('start'); setShowPicker(true); }, 100);
          } else {
            setStartDate(selectedDate);
          }
        } else {
          const current = dueDate || new Date();
          if (pickerMode === 'date') {
            selectedDate.setHours(current.getHours(), current.getMinutes());
            setDueDate(selectedDate);
            setTimeout(() => { setPickerMode('time'); setPickerTarget('end'); setShowPicker(true); }, 100);
          } else {
            setDueDate(selectedDate);
          }
        }
      }
    }
  };

  const handleUpdateTaskDetails = () => {
    if (!selectedTask || !selectedTask.title.trim()) return;
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
    // Tab filter
    if (activeTab === 'done' && task.status !== 'done') return false;
    if (activeTab === 'active' && task.status === 'done') return false;
    
    // Priority filter
    if (filterPriority !== 'ALL' && task.priority !== filterPriority) return false;
    
    // Timeline filter
    if (filterTimeline !== 'ALL') {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);
      
      const hasDate = task.startDate || task.dueDate;
      if (filterTimeline === 'FLEXIBLE' && hasDate) return false;
      if (filterTimeline !== 'FLEXIBLE' && !hasDate) return false;

      if (hasDate && filterTimeline !== 'FLEXIBLE') {
        const checkDate = new Date(task.dueDate || task.startDate);
        if (filterTimeline === 'OVERDUE' && checkDate < now) return false;
        if (filterTimeline === 'TODAY' && (checkDate < now || checkDate > endOfToday)) return false;
        if (filterTimeline === 'UPCOMING' && checkDate <= endOfToday) return false;
      }
    }
    
    return true;
  }) || [];

  const stats = {
    active: tasks?.filter((t: any) => t.status !== 'done').length || 0,
    done: tasks?.filter((t: any) => t.status === 'done').length || 0,
  };

  if (isLoading && !isRefetching) {
    return (
      <View className="flex-1 justify-center items-center bg-[#f6f5f3]">
        <ActivityIndicator size="large" color={NAVY} />
        <Text className="mt-4 text-slate-500 font-medium">Loading your priorities...</Text>
      </View>
    );
  }

  const todayText = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <View className="flex-1" style={{ backgroundColor: SOFT_BG }}>
      <StatusBar style="dark" />
      
      {/* Modern Slim Header */}
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
        <View className="flex-row justify-between items-end">
          <View>
            <Text className="text-[12px] font-bold text-slate-400 uppercase tracking-[2px] mb-1">{todayText}</Text>
            <Text className="text-[32px] font-black text-[#111827] tracking-tight">Tasks</Text>
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
      </View>

      {/* Modern Tabs */}
      <View className="flex-row px-6 py-6 gap-3 items-center">
        <TabButton 
          label="In Progress" 
          active={activeTab === 'active'} 
          onPress={() => setActiveTab('active')} 
          count={stats.active}
        />
        <TabButton 
          label="Done" 
          active={activeTab === 'done'} 
          onPress={() => setActiveTab('done')} 
          count={stats.done}
        />
        <View className="flex-1" />
        <TouchableOpacity 
          onPress={() => setFilterModalVisible(true)} 
          className="w-12 h-12 rounded-2xl bg-white items-center justify-center border border-slate-100 relative"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}
        >
          <Filter size={20} color={activeFiltersCount > 0 ? CORAL : NAVY} />
          {activeFiltersCount > 0 && (
            <View className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ backgroundColor: CORAL }} />
          )}
        </TouchableOpacity>
      </View>

      {/* Task List */}
      <View className="flex-1">
        <ScrollView 
          className="flex-1 px-6"
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={NAVY} />
          }
        >
          {filteredTasks.length === 0 ? (
            <View className="mt-20 items-center justify-center px-10">
              <View className="w-24 h-24 bg-slate-100 rounded-[35px] items-center justify-center mb-8 rotate-[10deg]">
                <CheckCircle2 size={48} color="#cbd5e1" />
              </View>
              <Text className="text-2xl font-black text-slate-300 text-center tracking-tight">
                {activeTab === 'done' ? 'No history yet' : "Clean Slate"}
              </Text>
              <Text className="text-[15px] text-slate-400 text-center mt-3 font-medium leading-6">
                {activeTab === 'active' 
                  ? "Your priority queue is empty. Capture something important now." 
                  : "Finish some tasks to see them archived here."}
              </Text>
            </View>
          ) : (
            filteredTasks.map((task: any, index: number) => (
              <TaskItem 
                key={task.id} 
                task={task} 
                onToggle={() => toggleTask(task.id, task.status)}
                onPress={() => {
                  setSelectedTask(task);
                  setDetailModalVisible(true);
                  setShowDeleteConfirm(false);
                }}
                isLast={index === filteredTasks.length - 1}
              />
            ))
          )}
        </ScrollView>
      </View>

      {/* Modern Add Task Modal */}
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
              <Text className="text-2xl font-bold text-navy" style={{ color: NAVY }}>Define Priority</Text>
              <TouchableOpacity 
                onPress={() => setAddModalVisible(false)}
                className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center"
              >
                <X size={18} color={NAVY} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="max-h-[60vh]">
              <View className="mb-4">
                <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Title</Text>
                <TextInput
                  placeholder="Capture the core goal..."
                  placeholderTextColor="#cbd5e1"
                  className="bg-slate-50 p-4 rounded-2xl text-[15px] font-bold text-navy border border-slate-100"
                  value={newTitle}
                  onChangeText={setNewTitle}
                  style={{ color: NAVY }}
                />
              </View>

              <View className="mb-4">
                <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Description</Text>
                <TextInput
                  placeholder="Elaborate on the details..."
                  placeholderTextColor="#cbd5e1"
                  multiline
                  className="bg-slate-50 p-4 rounded-2xl text-[14px] font-medium text-navy border border-slate-100 min-h-[80px]"
                  value={newDesc}
                  onChangeText={setNewDesc}
                  style={{ color: NAVY }}
                  textAlignVertical="top"
                />
              </View>

              <View className="mb-4">
                <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Timeline (Optional)</Text>
                <View className="flex-row gap-3">
                  <TouchableOpacity 
                    onPress={() => { setPickerTarget('start'); setPickerMode('date'); setShowPicker(true); }}
                    className="flex-1 bg-slate-50 p-4 rounded-2xl items-center border border-slate-100"
                  >
                    <Text className="text-[9px] font-bold text-slate-400 uppercase mb-1">Start</Text>
                    <Text className="text-[12px] font-bold text-navy" style={{ color: NAVY }}>
                      {startDate ? formatPickerDate(startDate) : 'Set Start'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={() => { setPickerTarget('end'); setPickerMode('date'); setShowPicker(true); }}
                    className="flex-1 bg-slate-50 p-4 rounded-2xl items-center border border-slate-100"
                  >
                    <Text className="text-[9px] font-bold text-slate-400 uppercase mb-1">Finish</Text>
                    <Text className="text-[12px] font-bold text-navy" style={{ color: NAVY }}>
                      {dueDate ? formatPickerDate(dueDate) : 'Set Finish'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="mb-8">
                <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Urgency Level</Text>
                <View className="flex-row gap-3">
                  {(['P1', 'P2', 'P3', 'P4'] as TaskPriority[]).map((p) => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setNewPriority(p)}
                      className={`flex-1 py-3.5 rounded-2xl items-center border ${newPriority === p ? 'bg-navy border-navy shadow-sm' : 'bg-white border-slate-200'}`}
                      style={newPriority === p ? { backgroundColor: NAVY } : {}}
                    >
                      <Text className={`font-bold tracking-tight ${newPriority === p ? 'text-white' : 'text-slate-500'}`}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={handleCreateTask}
              disabled={!newTitle.trim() || createTaskMutation.isPending}
              className={`py-4 rounded-2xl items-center ${!newTitle.trim() ? 'bg-slate-100' : 'bg-navy'}`}
              style={newTitle.trim() ? { 
                backgroundColor: NAVY,
                shadowColor: NAVY,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
              } : {}}
            >
              {createTaskMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-[16px]">Initialize Priority</Text>
              )}
            </TouchableOpacity>
          </View>
          
          {showPicker && (
            <DateTimePicker
              value={pickerTarget === 'start' ? (startDate || new Date()) : (dueDate || new Date())}
              mode={pickerMode}
              is24Hour={true}
              onChange={handlePickerChange}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            />
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isFilterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/60"
        >
          <Pressable className="flex-1" onPress={() => setFilterModalVisible(false)} />
          <View className="bg-white rounded-t-[50px] px-8 pt-12 pb-14 shadow-2xl">
            <View className="w-12 h-1.5 bg-slate-100 rounded-full self-center mb-8" />
            
            <View className="flex-row justify-between items-center mb-8">
              <Text className="text-2xl font-bold text-navy" style={{ color: NAVY }}>Filters</Text>
              <View className="flex-row gap-2">
                {activeFiltersCount > 0 && (
                  <TouchableOpacity onPress={() => { setFilterPriority('ALL'); setFilterTimeline('ALL'); }} className="px-4 py-1.5 bg-slate-50 items-center justify-center rounded-full border border-slate-100">
                    <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Clear</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setFilterModalVisible(false)} className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center">
                  <X size={16} color={NAVY} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="max-h-[60vh]">
              {/* Priority Filter */}
              <View className="mb-8">
                <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Urgency Level</Text>
                <View className="flex-row flex-wrap gap-2.5">
                  {(['ALL', 'P1', 'P2', 'P3', 'P4'] as const).map((p) => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setFilterPriority(p)}
                      className={`px-5 py-3 rounded-2xl items-center border ${filterPriority === p ? 'bg-navy border-navy shadow-sm' : 'bg-white border-slate-200'}`}
                      style={filterPriority === p ? { backgroundColor: NAVY } : {}}
                    >
                      <Text className={`font-bold text-[13px] tracking-tight ${filterPriority === p ? 'text-white' : 'text-slate-500'}`}>
                        {p === 'ALL' ? 'Any' : p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Timeline Filter */}
              <View className="mb-8">
                <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Timeline</Text>
                <View className="flex-row flex-wrap gap-2.5">
                  {(['ALL', 'OVERDUE', 'TODAY', 'UPCOMING', 'FLEXIBLE'] as const).map((t) => {
                    const labels = {
                      ALL: 'All Time',
                      OVERDUE: 'Overdue',
                      TODAY: 'Today',
                      UPCOMING: 'Upcoming',
                      FLEXIBLE: 'Flexible'
                    };
                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setFilterTimeline(t)}
                        className={`px-4 py-3 rounded-2xl items-center border ${filterTimeline === t ? 'bg-coral border-coral shadow-sm' : 'bg-white border-slate-200'}`}
                        style={filterTimeline === t ? { backgroundColor: CORAL, borderColor: CORAL } : {}}
                      >
                        <Text className={`font-black tracking-tight ${filterTimeline === t ? 'text-white' : 'text-slate-500'}`}>
                          {labels[t]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setFilterModalVisible(false)}
              className="py-4 rounded-2xl items-center flex-row justify-center"
              style={{ 
                backgroundColor: NAVY,
                shadowColor: NAVY,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
              }}
            >
              <Text className="text-white font-bold text-[16px]">Apply Filters</Text>
              {activeFiltersCount > 0 && (
                <View className="ml-3 bg-white/20 px-3 py-1 rounded-full">
                  <Text className="text-white text-[12px] font-black">{activeFiltersCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Task Detail Modal */}
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
            
            {showDeleteConfirm && selectedTask ? (
              <View className="items-center py-4">
                <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-5">
                  <AlertCircle size={28} color="#ef4444" />
                </View>
                <Text className="text-2xl font-bold text-navy mb-2">Delete Priority?</Text>
                <Text className="text-slate-500 text-center mb-8 px-4 leading-6">
                  Are you sure you want to permanently delete "{selectedTask.title}"? This cannot be undone.
                </Text>
                
                <View className="flex-row gap-3 w-full">
                  <TouchableOpacity 
                    onPress={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-4 bg-slate-50 rounded-2xl items-center border border-slate-100"
                  >
                    <Text className="font-bold text-slate-600">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                        deleteTaskMutation.mutate({ id: selectedTask.id });
                        setShowDeleteConfirm(false);
                    }}
                    className="flex-1 py-4 bg-coral rounded-2xl items-center shadow-sm"
                    style={{ backgroundColor: CORAL }}
                  >
                    {deleteTaskMutation.isPending ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="font-bold text-white">Delete</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : selectedTask ? (
              <>
                <View className="flex-row justify-between items-center mb-6">
                  <Text className="text-2xl font-bold text-navy" style={{ color: NAVY }}>Edit Priority</Text>
                  <View className="flex-row gap-3 items-center">
                    <TouchableOpacity onPress={() => setShowDeleteConfirm(true)} className="p-2">
                       <Trash2 size={18} color="#ef4444" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setDetailModalVisible(false)} className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center">
                      <X size={16} color={NAVY} />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} className="max-h-[60vh]">
                  <View className="mb-4">
                    <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Title</Text>
                    <TextInput
                      className="bg-slate-50 p-4 rounded-2xl text-[15px] font-bold text-navy border border-slate-100"
                      value={selectedTask.title}
                      onChangeText={(t) => setSelectedTask({...selectedTask, title: t})}
                      style={{ color: NAVY }}
                    />
                  </View>
                  
                  <View className="mb-4">
                    <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Description</Text>
                    <TextInput
                      multiline
                      className="bg-slate-50 p-4 rounded-2xl text-[14px] font-medium text-navy border border-slate-100 min-h-[80px]"
                      value={selectedTask.description || ''}
                      onChangeText={(t) => setSelectedTask({...selectedTask, description: t})}
                      style={{ color: NAVY }}
                      textAlignVertical="top"
                    />
                  </View>
                  
                  <View className="mb-4">
                    <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Timeline</Text>
                    <View className="flex-row gap-3">
                      <TouchableOpacity 
                        onPress={() => { setPickerTarget('start'); setPickerMode('date'); setShowPicker(true); }}
                        className="flex-1 bg-slate-50 p-4 rounded-2xl items-center border border-slate-100"
                      >
                        <Text className="text-[9px] font-bold text-slate-400 uppercase mb-1">Start</Text>
                        <Text className="text-[12px] font-bold text-navy" style={{ color: NAVY }}>
                          {selectedTask.startDate ? formatPickerDate(new Date(selectedTask.startDate)) : 'Set Start'}
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        onPress={() => { setPickerTarget('end'); setPickerMode('date'); setShowPicker(true); }}
                        className="flex-1 bg-slate-50 p-4 rounded-2xl items-center border border-slate-100"
                      >
                        <Text className="text-[9px] font-bold text-slate-400 uppercase mb-1">Finish</Text>
                        <Text className="text-[12px] font-bold text-navy" style={{ color: NAVY }}>
                          {selectedTask.dueDate ? formatPickerDate(new Date(selectedTask.dueDate)) : 'Set Finish'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="mb-8">
                    <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Urgency Level</Text>
                    <View className="flex-row gap-3">
                      {(['P1', 'P2', 'P3', 'P4'] as TaskPriority[]).map((p) => (
                        <TouchableOpacity
                          key={p}
                          onPress={() => setSelectedTask({...selectedTask, priority: p})}
                          className={`flex-1 py-3.5 rounded-2xl items-center border ${selectedTask.priority === p ? 'bg-navy border-navy shadow-sm' : 'bg-white border-slate-200'}`}
                          style={selectedTask.priority === p ? { backgroundColor: NAVY } : {}}
                        >
                          <Text className={`font-bold tracking-tight ${selectedTask.priority === p ? 'text-white' : 'text-slate-500'}`}>{p}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </ScrollView>

                <View className="flex-row gap-3 pt-2">
                  <TouchableOpacity 
                    onPress={() => {
                        handleUpdateTaskDetails();
                        toggleTask(selectedTask.id, selectedTask.status);
                        setDetailModalVisible(false);
                    }}
                    className="flex-1 bg-slate-100 py-4 rounded-2xl items-center border border-slate-200"
                  >
                    <Text className="font-bold text-navy" style={{ color: NAVY }}>
                      {selectedTask.status === 'done' ? 'Mark Active' : 'Complete It'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={() => {
                        handleUpdateTaskDetails();
                        setDetailModalVisible(false);
                    }}
                    disabled={!selectedTask.title.trim() || updateTaskMutation.isPending}
                    className="flex-1 py-4 rounded-2xl items-center shadow-sm"
                    style={{ backgroundColor: NAVY }}
                  >
                    {updateTaskMutation.isPending ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="font-bold text-white">Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
          
          {showPicker && isDetailModalVisible && (
            <DateTimePicker
              value={pickerTarget === 'start' 
                ? (selectedTask?.startDate ? new Date(selectedTask.startDate) : new Date()) 
                : (selectedTask?.dueDate ? new Date(selectedTask.dueDate) : new Date())}
              mode={pickerMode}
              is24Hour={true}
              onChange={handlePickerChange}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            />
          )}
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function TabButton({ label, active, onPress, count }: { label: string, active: boolean, onPress: () => void, count: number }) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      className={`flex-row items-center px-6 py-3 rounded-2xl ${active ? 'bg-white' : ''}`}
      style={active ? { 
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 3
      } : {}}
    >
      <Text className={`text-[15px] font-black tracking-tight ${active ? 'text-[#111827]' : 'text-slate-300'}`}>
        {label}
      </Text>
      <View className={`ml-3 px-2 py-0.5 rounded-lg ${active ? 'bg-[#111827]' : 'bg-slate-100'}`}>
        <Text className={`text-[10px] font-black ${active ? 'text-white' : 'text-slate-400'}`}>
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function TaskItem({ task, onToggle, onPress, isLast }: { task: any, onToggle: () => void, onPress: () => void, isLast: boolean }) {
  const isDone = task.status === 'done';
  const priorityColor = task.priority === 'P1' ? '#ef4444' : task.priority === 'P2' ? '#f59e0b' : '#3b82f6';

  return (
    <TouchableOpacity 
      onPress={onPress}
      className={`flex-row items-start p-5 bg-white rounded-[24px] mb-3 border border-slate-100`}
      activeOpacity={0.7}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 1
      }}
    >
      <TouchableOpacity 
        onPress={onToggle}
        className="mt-0.5"
      >
        {isDone ? (
          <View className="bg-emerald-500 rounded-full w-6 h-6 items-center justify-center shadow-lg shadow-emerald-200">
            <CheckCircle2 size={14} color="white" />
          </View>
        ) : (
          <View className="w-6 h-6 rounded-full border-[1.5px] border-slate-200 items-center justify-center bg-slate-50/30">
            <View className="w-2 h-2 rounded-full" style={{ backgroundColor: priorityColor, opacity: 0.4 }} />
          </View>
        )}
      </TouchableOpacity>
      
      <View className="flex-1 ml-4 overflow-hidden">
        <Text 
          className={`text-[16px] font-bold tracking-tight pr-2 ${isDone ? 'text-slate-300 line-through' : 'text-[#111827]'}`}
          numberOfLines={1}
          style={{ color: isDone ? '#cbd5e1' : '#111827' }}
        >
          {task.title}
        </Text>
        
        <View className="flex-row items-center mt-2.5 flex-nowrap pr-2">
          <View className="flex-row items-center mr-3 bg-slate-50 py-1 px-2 rounded-md border border-slate-100 shrink">
            <Clock size={10} color={isDone ? "#cbd5e1" : "#64748b"} />
            <Text className="text-[9.5px] text-slate-500 ml-1.5 font-bold uppercase tracking-wider shrink" numberOfLines={1} ellipsizeMode="tail">
              {formatTaskDate(task.startDate, task.dueDate)}
            </Text>
          </View>
          <View className="flex-row items-center shrink-0">
             <View 
              className="w-1.5 h-1.5 rounded-full mr-1.5" 
              style={{ backgroundColor: isDone ? '#e2e8f0' : priorityColor }} 
            />
            <Text className="text-[10px] font-bold uppercase tracking-tight text-slate-400">
              {task.priority || 'P3'}
            </Text>
          </View>
        </View>
      </View>
      
      <View className="mt-1.5 ml-1">
        <ChevronRight size={16} color="#e2e8f0" />
      </View>
    </TouchableOpacity>
  );
}

function formatTaskDate(start: string | null | undefined, due: string | null | undefined) {
  if (!start && !due) return 'Flexible Timeline';
  
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + 
           (d.getHours() !== 0 || d.getMinutes() !== 0 
             ? ` ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}` 
             : '');
  };

  if (start && due) return `${formatDate(start)} → ${formatDate(due)}`;
  if (due) return `Due ${formatDate(due)}`;
  return `Starts ${formatDate(start!)}`;
}
function formatPickerDate(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + 
         ` ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
}
