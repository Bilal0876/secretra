import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    Modal, ScrollView, Switch, Platform, KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X, Clock, MapPin, AlignLeft, Users, Calendar as CalendarIcon, Bell, CheckSquare, Phone, UtensilsCrossed, Plane, MoreHorizontal } from 'lucide-react-native';
import { trpc } from '../utils/trpc';



const NAVY = '#111827';
const EVENT_TYPES = [
    { key: 'meeting', label: 'Meeting', color: '#3b82f6', bg: '#eff6ff' },
    { key: 'event', label: 'Event', color: '#8b5cf6', bg: '#f5f3ff' },
    { key: 'reminder', label: 'Reminder', color: '#f59e0b', bg: '#fffbeb' },
    { key: 'task', label: 'Task', color: '#10b981', bg: '#ecfdf5' },
    { key: 'call', label: 'Call', color: '#ef4444', bg: '#fef2f2' },
    { key: 'lunch', label: 'Lunch', color: '#f97316', bg: '#fff7ed' },
    { key: 'travel', label: 'Travel', color: '#06b6d4', bg: '#ecfeff' },
    { key: 'other', label: 'Other', color: '#64748b', bg: '#f1f5f9' },
] as const;
const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
type Priority = typeof PRIORITIES[number];

const PRIORITY_STYLES: Record<Priority, { bg: string; text: string; activeBg: string }> = {
    low: { bg: '#eff6ff', text: '#3b82f6', activeBg: '#3b82f6' },
    medium: { bg: '#f0fdf4', text: '#16a34a', activeBg: '#16a34a' },
    high: { bg: '#fffbeb', text: '#d97706', activeBg: '#d97706' },
    critical: { bg: '#fef2f2', text: '#ef4444', activeBg: '#ef4444' },
};

function EventTypeSection({
    selected, onSelect, customValue, onCustomChange,
}: {
    selected: string;
    onSelect: (key: string) => void;
    customValue: string;
    onCustomChange: (v: string) => void;
}) {
    return (
        <View className="bg-white rounded-[20px] overflow-hidden">
            <View className="px-4 pt-4 pb-2">
                <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Event type
                </Text>
                <View className="flex-row flex-wrap gap-2">
                    {EVENT_TYPES.map((t) => {
                        const active = selected === t.key;
                        return (
                            <TouchableOpacity
                                key={t.key}
                                onPress={() => onSelect(t.key)}
                                className="items-center rounded-2xl py-3"
                                style={{
                                    width: '22%',
                                    backgroundColor: active ? t.bg : '#f8fafc',
                                    borderWidth: 1.5,
                                    borderColor: active ? t.color : 'transparent',
                                }}
                                activeOpacity={0.7}
                            >
                                <EventTypeIcon typeKey={t.key} color={t.color} />
                                <Text
                                    className="text-[11px] font-bold mt-1.5 text-center"
                                    style={{ color: t.color }}
                                >
                                    {t.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {selected === 'other' && (
                <View className="px-4 pb-4">
                    <TextInput
                        placeholder="Describe the type…"
                        placeholderTextColor="#cbd5e1"
                        value={customValue}
                        onChangeText={onCustomChange}
                        autoFocus
                        className="bg-slate-50 rounded-xl px-4 py-3 text-[14px] text-slate-700"
                        style={{ borderWidth: 1.5, borderColor: '#e2e8f0' }}
                    />
                </View>
            )}
        </View>
    );
}

function EventTypeIcon({ typeKey, color }: { typeKey: string; color: string }) {
    const iconMap: Record<string, React.ReactNode> = {
        meeting: <Users size={18} color={color} />,
        event: <CalendarIcon size={18} color={color} />,
        reminder: <Bell size={18} color={color} />,
        task: <CheckSquare size={18} color={color} />,
        call: <Phone size={18} color={color} />,
        lunch: <UtensilsCrossed size={18} color={color} />,
        travel: <Plane size={18} color={color} />,
        other: <MoreHorizontal size={18} color={color} />,
    };
    return (
        <View
            className="w-9 h-9 rounded-xl items-center justify-center"
            style={{ backgroundColor: color + '22' }}
        >
            {iconMap[typeKey]}
        </View>
    );
}

interface Props {
    visible: boolean;
    onClose: () => void;
    eventToEdit?: any;
}

export function AddEventModal({ visible, onClose, eventToEdit }: Props) {
    const utils = trpc.useUtils();

    const [eventType, setEventType] = useState('meeting');
    const [customType, setCustomType] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDesc] = useState('');
    const [location, setLocation] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [isAllDay, setIsAllDay] = useState(false);
    const [priority, setPriority] = useState<Priority>('medium');
    const [startAt, setStart] = useState(() => {
        const d = new Date(); d.setMinutes(0, 0, 0); return d;
    });
    const [endAt, setEnd] = useState(() => {
        const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0); return d;
    });
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    // Fetch groups
    const { data: groups = [] } = trpc.group.getGroups.useQuery();

    const { mutate: createEvent, isPending: isCreating } = trpc.calendar.createEvent.useMutation({
        onSuccess: () => {
            utils.calendar.getEvents.invalidate();
            handleClose();
        },
    });

    const { mutate: updateEvent, isPending: isUpdating } = trpc.calendar.updateEvent.useMutation({
        onSuccess: () => {
            utils.calendar.getEvents.invalidate();
            handleClose();
        },
    });

    const isPending = isCreating || isUpdating;

    useEffect(() => {
        if (visible && eventToEdit) {
            const eventTypeKey = EVENT_TYPES.some((t) => t.key === eventToEdit.eventType)
                ? eventToEdit.eventType
                : 'other';

            setTitle(eventToEdit.title ?? '');
            setDesc(eventToEdit.description ?? '');
            setLocation(eventToEdit.location ?? '');
            setSelectedGroupId(eventToEdit.groupId ?? null);
            setIsAllDay(eventToEdit.isAllDay ?? false);
            setPriority(eventToEdit.priority ?? 'medium');
            setStart(new Date(eventToEdit.startAt));
            setEnd(new Date(eventToEdit.endAt));
            setEventType(eventTypeKey);
            setCustomType(eventTypeKey === 'other' ? (eventToEdit.eventType ?? '') : '');
        }
    }, [visible, eventToEdit]);

    function handleClose() {
        setTitle(''); setDesc(''); setLocation('');
        setSelectedGroupId(null);
        setIsAllDay(false); setPriority('medium');
        setEventType('meeting'); setCustomType('');
        onClose();
    }

    function handleSave() {
        if (!title.trim()) return;

        const payload = {
            title: title.trim(),
            description: description || undefined,
            location: location || undefined,
            groupId: selectedGroupId || undefined,
            isAllDay,
            priority,
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            eventType: eventType === 'other' ? (customType.trim() || 'other') : eventType,
        };

        if (eventToEdit?.id) {
            updateEvent({ id: eventToEdit.id, ...payload });
        } else {
            createEvent(payload);
        }
    }

    const formatTime = (d: Date) =>
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
            <KeyboardAvoidingView
                style={{ flex: 1, backgroundColor: '#f6f5f3' }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View className="flex-row justify-between items-center px-5 py-4 bg-white border-b border-slate-100">
                    <TouchableOpacity onPress={handleClose} className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
                        <X size={18} color={NAVY} />
                    </TouchableOpacity>
                    <Text className="text-[17px] font-bold text-[#111827]">
                        {eventToEdit ? 'Edit Event' : 'New Event'}
                    </Text>
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={!title.trim() || isPending}
                        className="rounded-full px-5 py-2"
                        style={{ backgroundColor: title.trim() ? NAVY : '#e2e8f0' }}
                    >
                        <Text style={{ color: title.trim() ? '#fff' : '#94a3b8', fontWeight: '700', fontSize: 14 }}>
                            {isPending ? (eventToEdit ? 'Updating…' : 'Saving…') : (eventToEdit ? 'Update' : 'Save')}
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
                    {/* Title */}
                    <View className="bg-white rounded-[20px] px-4 py-3">
                        <TextInput
                            placeholder="Event title"
                            placeholderTextColor="#cbd5e1"
                            value={title}
                            onChangeText={setTitle}
                            className="text-[17px] font-bold text-[#1e293b]"
                            autoFocus
                        />
                    </View>

                    <EventTypeSection
                        selected={eventType}
                        onSelect={setEventType}
                        customValue={customType}
                        onCustomChange={setCustomType}
                    />

                    {/* Description + Location */}
                    <View className="bg-white rounded-[20px] overflow-hidden">
                        <View className="flex-row items-start px-4 py-3 border-b border-slate-50">
                            <AlignLeft size={16} color="#94a3b8" style={{ marginTop: 3 }} />
                            <TextInput
                                placeholder="Add description"
                                placeholderTextColor="#cbd5e1"
                                value={description}
                                onChangeText={setDesc}
                                multiline
                                className="flex-1 ml-3 text-[15px] text-slate-700"
                                style={{ minHeight: 60 }}
                            />
                        </View>
                        <View className="flex-row items-center px-4 py-3">
                            <MapPin size={16} color="#94a3b8" />
                            <TextInput
                                placeholder="Add location"
                                placeholderTextColor="#cbd5e1"
                                value={location}
                                onChangeText={setLocation}
                                className="flex-1 ml-3 text-[15px] text-slate-700"
                            />
                        </View>
                    </View>

                    {/* Department/Group Selection */}
                    {groups.length > 0 && (
                        <View className="bg-white rounded-[20px] px-4 py-4">
                            <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                                Department
                            </Text>
                            <View className="flex-row flex-wrap gap-2">
                                <TouchableOpacity
                                    onPress={() => setSelectedGroupId(null)}
                                    className="py-2 px-3 rounded-full items-center"
                                    style={{
                                        backgroundColor: !selectedGroupId ? '#111827' : '#f1f5f9',
                                    }}
                                >
                                    <Text style={{
                                        fontSize: 12,
                                        fontWeight: '600',
                                        color: !selectedGroupId ? '#fff' : '#64748b',
                                    }}>
                                        None
                                    </Text>
                                </TouchableOpacity>

                                {groups.map((group: any) => {
                                    const isActive = selectedGroupId === group.id;
                                    return (
                                        <TouchableOpacity
                                            key={group.id}
                                            onPress={() => setSelectedGroupId(group.id)}
                                            className="py-2 px-3 rounded-full items-center"
                                            style={{
                                                backgroundColor: isActive ? '#06b6d4' : '#ecfeff',
                                            }}
                                        >
                                            <Text style={{
                                                fontSize: 12,
                                                fontWeight: '600',
                                                color: isActive ? '#fff' : '#0891b2',
                                            }}>
                                                {group.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {/* All Day + Time */}
                    <View className="bg-white rounded-[20px] overflow-hidden">
                        <View className="flex-row justify-between items-center px-4 py-4 border-b border-slate-50">
                            <Text className="text-[15px] font-semibold text-[#1e293b]">All day</Text>
                            <Switch value={isAllDay} onValueChange={setIsAllDay} trackColor={{ true: NAVY }} />
                        </View>

                        {!isAllDay && (
                            <>
                                <TouchableOpacity
                                    className="flex-row items-center justify-between px-4 py-4 border-b border-slate-50"
                                    onPress={() => setShowStartPicker(true)}
                                >
                                    <View className="flex-row items-center gap-3">
                                        <Clock size={16} color="#94a3b8" />
                                        <Text className="text-[15px] text-slate-500">Start</Text>
                                    </View>
                                    <Text className="text-[15px] font-semibold text-[#111827]">{formatTime(startAt)}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    className="flex-row items-center justify-between px-4 py-4"
                                    onPress={() => setShowEndPicker(true)}
                                >
                                    <View className="flex-row items-center gap-3">
                                        <Clock size={16} color="#94a3b8" />
                                        <Text className="text-[15px] text-slate-500">End</Text>
                                    </View>
                                    <Text className="text-[15px] font-semibold text-[#111827]">{formatTime(endAt)}</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>

                    {/* Priority */}
                    <View className="bg-white rounded-[20px] px-4 py-4">
                        <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Priority</Text>
                        <View className="flex-row gap-2">
                            {PRIORITIES.map((p) => {
                                const s = PRIORITY_STYLES[p];
                                const active = priority === p;
                                return (
                                    <TouchableOpacity
                                        key={p}
                                        onPress={() => setPriority(p)}
                                        className="flex-1 py-2 rounded-full items-center"
                                        style={{ backgroundColor: active ? s.activeBg : s.bg }}
                                    >
                                        <Text style={{ color: active ? '#fff' : s.text, fontWeight: '700', fontSize: 12 }}>
                                            {p.charAt(0).toUpperCase() + p.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </ScrollView>

                {/* Native time pickers */}
                {showStartPicker && (
                    <DateTimePicker
                        value={startAt}
                        mode="time"
                        is24Hour={false}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(_, date) => { setShowStartPicker(false); if (date) setStart(date); }}
                    />
                )}
                {showEndPicker && (
                    <DateTimePicker
                        value={endAt}
                        mode="time"
                        is24Hour={false}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(_, date) => { setShowEndPicker(false); if (date) setEnd(date); }}
                    />
                )}
            </KeyboardAvoidingView>
        </Modal>
    );
}