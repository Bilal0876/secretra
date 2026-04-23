import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, TouchableOpacity,
    Switch, Platform,  ScrollView,
} from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetScrollView, BottomSheetTextInput, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { scheduleEventReminder } from '../utils/notifications';
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

const REMINDER_OPTIONS = [
    { label: 'None', minutes: null },
    { label: 'At time of event', minutes: 0 },
    { label: '5 minutes before', minutes: 5 },
    { label: '15 minutes before', minutes: 15 },
    { label: '30 minutes before', minutes: 30 },
    { label: '1 hour before', minutes: 60 },
];

function EventTypeSection({
    selected, onSelect, customValue, onCustomChange, readOnly
}: {
    selected: string;
    onSelect: (key: string) => void;
    customValue: string;
    onCustomChange: (v: string) => void;
    readOnly?: boolean;
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
                                disabled={readOnly}
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
                    <BottomSheetTextInput
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
    initialGroupId?: string;
    readOnly?: boolean;
}

export function AddEventModal({ visible, onClose, eventToEdit, initialGroupId, readOnly }: Props) {
    const utils = trpc.useUtils();
    const { data: currentUser } = trpc.profile.me.useQuery();

    const [eventType, setEventType] = useState('meeting');
    const [customType, setCustomType] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDesc] = useState('');
    const [location, setLocation] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<string[]>([]);
    const [isAllDay, setIsAllDay] = useState(false);
    const [priority, setPriority] = useState<Priority>('medium');
    const [startAt, setStart] = useState(() => {
        const d = new Date();
        d.setMinutes(0, 0, 0);
        d.setHours(d.getHours() + 1);
        return d;
    });
    const [endAt, setEnd] = useState(() => {
        const d = new Date();
        d.setMinutes(0, 0, 0);
        d.setHours(d.getHours() + 2);
        return d;
    });
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [reminderMinutes, setReminderMinutes] = useState<number | null>(5);

    const lastInitRef = useRef<string | null>(null);
    const prevVisibleRef = useRef(false);
    const bottomSheetRef = useRef<BottomSheetModal>(null);

    useEffect(() => {
        if (visible && !prevVisibleRef.current) {
            bottomSheetRef.current?.present();
        } else if (!visible && prevVisibleRef.current) {
            bottomSheetRef.current?.dismiss();
        }
        prevVisibleRef.current = visible;
    }, [visible]);

    const handleSheetChanges = useCallback((index: number) => {
        if (index === -1 && visible) {
            handleClose();
        }
    }, [visible]);

    // Fetch groups
    const { data: groups = [] } = trpc.group.getGroups.useQuery();

    // Fetch members of the selected group
    const { data: groupMembers = [] } = trpc.group.getGroup.useQuery(
        { id: selectedGroupId! },
        { enabled: !!selectedGroupId }
    );

    // Filtered members (excluding current user if they are the owner)
    const membersList = (groupMembers as any)?.members || [];

    // Check availability for selected attendees
    const { data: availability = [] } = (trpc.calendar as any).getTeamAvailability.useQuery(
        {
            groupId: selectedGroupId!,
            startDate: startAt.toISOString(),
            endDate: endAt.toISOString(),
        },
        {
            enabled: !!selectedGroupId && visible,
            refetchInterval: 10000,
        }
    );

    // Personal usage conflict check (for when no group is selected)
    const personalConflicts = trpc.calendar.getEvents.useQuery(
        { startDate: startAt.toISOString(), endDate: endAt.toISOString() },
        { enabled: !selectedGroupId && visible }
    );

    // Only show busy status for SELECTED attendees OR myself
    const busyMembers = (availability as any[]).filter((m: any) =>
        m.isBusy && (selectedAttendeeIds.includes(m.userId) || m.userId === currentUser?.id)
    );

    const hasPersonalConflict = !selectedGroupId && (personalConflicts.data?.length ?? 0) > 0;

    const { mutate: createEvent, isPending: isCreating } = trpc.calendar.createEvent.useMutation({
        onSuccess: () => {
            utils.calendar.getEvents.invalidate();
            handleClose();
        },
        onError: (error) => {
            alert(error.message);
        },
    });

    const { mutate: updateEvent, isPending: isUpdating } = trpc.calendar.updateEvent.useMutation({
        onSuccess: () => {
            utils.calendar.getEvents.invalidate();
            handleClose();
        },
        onError: (error) => {
            alert(error.message);
        },
    });

    const isPending = isCreating || isUpdating;

    useEffect(() => {
        // Only initialize if we just became visible OR if the event identity changed
        const currentId = eventToEdit?.id || 'new';
        const justOpened = visible && !lastInitRef.current;
        const eventChanged = visible && eventToEdit && lastInitRef.current !== currentId;

        if (justOpened || eventChanged) {
            if (eventToEdit) {
                const eventTypeKey = EVENT_TYPES.some((t) => t.key === eventToEdit.eventType)
                    ? eventToEdit.eventType
                    : 'other';

                setTitle(eventToEdit.title ?? '');
                setDesc(eventToEdit.description ?? '');
                setLocation(eventToEdit.location ?? '');
                setSelectedGroupId(eventToEdit.groupId ?? null);
                setSelectedAttendeeIds(eventToEdit.attendees?.map((a: any) => a.id) ?? []);
                setIsAllDay(eventToEdit.isAllDay ?? false);
                setPriority(eventToEdit.priority ?? 'medium');
                setStart(new Date(eventToEdit.startAt));
                setEnd(new Date(eventToEdit.endAt));
                setEventType(eventTypeKey);
                setCustomType(eventTypeKey === 'other' ? (eventToEdit.eventType ?? '') : '');
                setReminderMinutes(eventToEdit.reminderMinutes ?? 5);
            } else {
                // Reset for NEW event
                setTitle('');
                setDesc('');
                setLocation('');
                setSelectedGroupId(initialGroupId || null);
                setSelectedAttendeeIds([]);
                setIsAllDay(false);
                setPriority('medium');
                setEventType('meeting');
                setCustomType('');
                setReminderMinutes(5);
                
                const d = new Date();
                d.setMinutes(0, 0, 0);
                d.setHours(d.getHours() + 1);
                setStart(d);
                
                const de = new Date(d);
                de.setHours(de.getHours() + 1);
                setEnd(de);
            }
            lastInitRef.current = currentId;
        }

        if (!visible) {
            lastInitRef.current = null;
        }
    }, [visible, eventToEdit, initialGroupId]);

    function handleClose() {
        setTitle(''); setDesc(''); setLocation('');
        setSelectedGroupId(null);
        setSelectedAttendeeIds([]);
        setIsAllDay(false); setPriority('medium');
        setEventType('meeting'); setCustomType('');
        setReminderMinutes(5);
        onClose();
    }

    function handleSave() {
        if (readOnly || !title.trim()) return;

        const payload = {
            title: title.trim(),
            description: description || undefined,
            location: location || undefined,
            groupId: selectedGroupId || undefined,
            attendeeIds: selectedAttendeeIds.length > 0 ? selectedAttendeeIds : undefined,
            isAllDay,
            priority,
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            eventType: eventType === 'other' ? (customType.trim() || 'other') : eventType,
            reminderMinutes: reminderMinutes,
        };

        if (eventToEdit?.id) {
            updateEvent({ id: eventToEdit.id, ...payload }, {
                onSuccess: () => {
                   if (reminderMinutes !== null) {
                        try {
                            const { scheduleEventReminder } = require('../utils/notifications');
                            scheduleEventReminder(
                                title.trim(),
                                new Date(startAt),
                                reminderMinutes,
                                eventToEdit.id
                            );
                        } catch (e) {
                            console.error('Failed to reschedule local reminder:', e);
                        }
                    }
                }
            });
        } else {
            createEvent(payload, {
                onSuccess: (newEvent) => {
                    if (reminderMinutes !== null) {
                        try {
                            const { scheduleEventReminder } = require('../utils/notifications');
                            scheduleEventReminder(
                                title.trim(),
                                new Date(startAt),
                                reminderMinutes,
                                newEvent.id
                            );
                        } catch (e) {
                            console.error('Failed to schedule local reminder:', e);
                        }
                    }
                }
            });
        }
    }

    const formatTime = (d: Date) =>
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    return (
        <BottomSheetModal
            ref={bottomSheetRef}
            snapPoints={['100%']}
            enablePanDownToClose
            onChange={handleSheetChanges}
            backdropComponent={(props) => (
                <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
            )}
            backgroundStyle={{ backgroundColor: '#f6f5f3' }}
            keyboardBehavior="interactive"
        >
            
                {/* Header */}
                <View className="flex-row justify-between items-center px-5 py-4 bg-white border-b border-slate-100">
                    <TouchableOpacity onPress={handleClose} className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
                        <X size={18} color={NAVY} />
                    </TouchableOpacity>
                    <Text className="text-[17px] font-bold text-[#111827]">
                        {readOnly ? 'Event Details' : (eventToEdit ? 'Edit Event' : 'New Event')}
                    </Text>
                    {!readOnly ? (
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
                    ) : (
                        <View className="w-14" /> /* Balance the header */
                    )}
                </View>

                <BottomSheetScrollView className="flex-1" contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
                    {/* Title */}
                    <View className="bg-white rounded-[20px] px-4 py-3">
                        <BottomSheetTextInput
                            placeholder="Event title"
                            placeholderTextColor="#cbd5e1"
                            value={title}
                            onChangeText={setTitle}
                            className="text-[17px] font-bold text-[#1e293b]"
                            autoFocus={!readOnly}
                            editable={!readOnly}
                        />
                    </View>

                    <EventTypeSection
                        selected={eventType}
                        onSelect={setEventType}
                        customValue={customType}
                        onCustomChange={setCustomType}
                        readOnly={readOnly}
                    />

                    {/* Description + Location */}
                    <View className="bg-white rounded-[20px] overflow-hidden">
                        <View className="flex-row items-start px-4 py-3 border-b border-slate-50">
                            <AlignLeft size={16} color="#94a3b8" style={{ marginTop: 3 }} />
                            <BottomSheetTextInput
                                placeholder="Add description"
                                placeholderTextColor="#cbd5e1"
                                value={description}
                                onChangeText={setDesc}
                                multiline
                                editable={!readOnly}
                                className="flex-1 ml-3 text-[15px] text-slate-700"
                                style={{ minHeight: 60 }}
                            />
                        </View>
                        <View className="flex-row items-center px-4 py-3">
                            <MapPin size={16} color="#94a3b8" />
                            <BottomSheetTextInput
                                placeholder="Add location"
                                placeholderTextColor="#cbd5e1"
                                value={location}
                                onChangeText={setLocation}
                                editable={!readOnly}
                                className="flex-1 ml-3 text-[15px] text-slate-700"
                            />
                        </View>
                    </View>

                    {/* Department/Group Selection - Only shown if not pre-selected via context */}
                    {groups.length > 0 && !initialGroupId && (
                        <View className="bg-white rounded-[20px] px-4 py-4" pointerEvents={readOnly ? 'none' : 'auto'}>
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

                    {/* Participant Selection - Always shown if group context exists */}
                    {(selectedGroupId || initialGroupId) && (
                        <View 
                            className={`bg-white rounded-[20px] px-4 py-4 ${!initialGroupId ? 'mt-3' : ''}`}
                            pointerEvents={readOnly ? 'none' : 'auto'}
                        >
                            {membersList.length > 0 && (
                                <View>
                                    <View className="flex-row justify-between items-center mb-3">
                                        <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                            Invite Participants
                                        </Text>
                                        {!readOnly && (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    const allIds = membersList.map((m: any) => m.userId).filter(Boolean);
                                                    setSelectedAttendeeIds(selectedAttendeeIds.length === allIds.length ? [] : allIds);
                                                }}
                                            >
                                                <Text className="text-[11px] font-bold text-[#3b82f6]">
                                                    {selectedAttendeeIds.length === membersList.length ? 'Clear All' : 'Select All'}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                                        {membersList.map((m: any) => {
                                            const mId = m.userId || m.id;
                                            const isSelected = selectedAttendeeIds.includes(mId);
                                            return (
                                                <TouchableOpacity
                                                    key={mId}
                                                    onPress={() => {
                                                        setSelectedAttendeeIds(prev =>
                                                            prev.includes(mId) ? prev.filter(id => id !== mId) : [...prev, mId]
                                                        );
                                                    }}
                                                    disabled={readOnly}
                                                    className="items-center"
                                                >
                                                    <View
                                                        className="w-12 h-12 rounded-full items-center justify-center border-2"
                                                        style={{
                                                            backgroundColor: isSelected ? '#111827' : '#f8fafc',
                                                            borderColor: isSelected ? '#3b82f6' : '#e2e8f0',
                                                        }}
                                                    >
                                                        <Text className={`text-[12px] font-bold ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                                                            {m.email.slice(0, 2).toUpperCase()}
                                                        </Text>
                                                    </View>
                                                    <Text className="text-[10px] text-slate-500 mt-1 font-medium" numberOfLines={1} style={{ width: 44, textAlign: 'center' }}>
                                                        {m.email.split('@')[0]}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            )}

                            {/* Busy Members Warning */}
                            {(busyMembers.length > 0 || hasPersonalConflict) && !readOnly && (
                                <View className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex-row items-start gap-3">
                                    <Bell size={16} color="#d97706" style={{ marginTop: 2 }} />
                                    <View className="flex-1">
                                        <Text className="text-[13px] font-bold text-amber-800">Schedule Conflict</Text>
                                        <View className="mt-1">
                                            {hasPersonalConflict && (
                                                <Text className="text-[12px] text-amber-700">
                                                    • You already have an event scheduled during this time.
                                                </Text>
                                            )}
                                            {busyMembers.map((m, idx) => (
                                                <Text key={idx} className="text-[12px] text-amber-700">
                                                    • {m.userId === currentUser?.id ? 'You' : m.name} {m.userId === currentUser?.id ? 'have' : 'has'} {m.conflictingEvents.length} overlap{m.conflictingEvents.length > 1 ? 's' : ''}
                                                </Text>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

                    {/* All Day + Time */}
                    <View className="bg-white rounded-[20px] overflow-hidden" pointerEvents={readOnly ? 'none' : 'auto'}>
                        <View className="flex-row justify-between items-center px-4 py-4 border-b border-slate-50">
                            <Text className="text-[15px] font-semibold text-[#1e293b]">All day</Text>
                            {!readOnly && <Switch value={isAllDay} onValueChange={setIsAllDay} trackColor={{ true: NAVY }} />}
                            {readOnly && <Text className="text-[15px] text-slate-400">{isAllDay ? 'Yes' : 'No'}</Text>}
                        </View>

                        {!isAllDay && (
                            <>
                                <TouchableOpacity
                                    className="flex-row items-center justify-between px-4 py-4 border-b border-slate-50"
                                    onPress={() => setShowStartPicker(true)}
                                    disabled={readOnly}
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
                                    disabled={readOnly}
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
                    <View className="bg-white rounded-[20px] px-4 py-4" pointerEvents={readOnly ? 'none' : 'auto'}>
                        <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Priority</Text>
                        <View className="flex-row gap-2">
                            {PRIORITIES.map((p) => {
                                const s = PRIORITY_STYLES[p];
                                const active = priority === p;
                                return (
                                    <TouchableOpacity
                                        key={p}
                                        onPress={() => setPriority(p)}
                                        disabled={readOnly}
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

                    {/* Reminders */}
                    <View className="bg-white rounded-[20px] px-4 py-4" pointerEvents={readOnly ? 'none' : 'auto'}>
                        <View className="flex-row items-center gap-2 mb-3">
                            <Bell size={14} color="#94a3b8" />
                            <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Initial Reminder</Text>
                        </View>
                        <View className="flex-row flex-wrap gap-2">
                            {REMINDER_OPTIONS.map((opt) => {
                                const active = reminderMinutes === opt.minutes;
                                return (
                                    <TouchableOpacity
                                        key={opt.label}
                                        onPress={() => setReminderMinutes(opt.minutes)}
                                        disabled={readOnly}
                                        className="py-2 px-3 rounded-full items-center"
                                        style={{ backgroundColor: active ? '#f59e0b' : '#fffbeb' }}
                                    >
                                        <Text style={{ color: active ? '#fff' : '#d97706', fontWeight: '600', fontSize: 12 }}>
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </BottomSheetScrollView>

                {/* Native time pickers */}
                {showStartPicker && (
                    <DateTimePicker
                        value={startAt}
                        mode="time"
                        is24Hour={false}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(_, date) => { 
                            if (Platform.OS === 'android') setShowStartPicker(false); 
                            if (date) setStart(date); 
                        }}
                    />
                )}
                {showEndPicker && (
                    <DateTimePicker
                        value={endAt}
                        mode="time"
                        is24Hour={false}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(_, date) => { 
                            if (Platform.OS === 'android') setShowEndPicker(false); 
                            if (date) setEnd(date); 
                        }}
                    />
                )}
            
        </BottomSheetModal>
    );
}