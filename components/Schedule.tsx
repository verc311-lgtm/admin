import React, { useState, useMemo } from 'react';
import { Project, Crew, Assignment } from '../types';
import {
    CalendarDays, ChevronLeft, ChevronRight, AlertTriangle,
    Users, Share2, Plus, X, Trash2, BarChart2, Grid,
    CheckCircle2, Clock, Zap, Eye, EyeOff
} from 'lucide-react';

interface ScheduleProps {
    projects: Project[];
    crews: Crew[];
    assignments: Assignment[];
    onUpdateDates: (projectId: string, startDate: string, endDate: string | undefined) => void;
    onAddAssignment: (assignment: Omit<Assignment, 'id'>) => void;
    onDeleteAssignment: (id: string) => void;
    onAddCrew: (name: string) => void;
}

const PROJECT_COLORS = [
    { bg: 'bg-violet-500', bgLight: 'bg-violet-50', border: 'border-violet-400', text: 'text-violet-700', hex: '#8b5cf6' },
    { bg: 'bg-cyan-500', bgLight: 'bg-cyan-50', border: 'border-cyan-400', text: 'text-cyan-700', hex: '#06b6d4' },
    { bg: 'bg-rose-500', bgLight: 'bg-rose-50', border: 'border-rose-400', text: 'text-rose-700', hex: '#f43f5e' },
    { bg: 'bg-amber-500', bgLight: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700', hex: '#f59e0b' },
    { bg: 'bg-emerald-500', bgLight: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-700', hex: '#10b981' },
    { bg: 'bg-pink-500', bgLight: 'bg-pink-50', border: 'border-pink-400', text: 'text-pink-700', hex: '#ec4899' },
    { bg: 'bg-orange-500', bgLight: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-700', hex: '#f97316' },
    { bg: 'bg-indigo-500', bgLight: 'bg-indigo-50', border: 'border-indigo-400', text: 'text-indigo-700', hex: '#6366f1' },
];

const getProjectColor = (idx: number) => PROJECT_COLORS[idx % PROJECT_COLORS.length];

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    'Active': { label: 'Active', icon: <Zap className="w-3 h-3" />, cls: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
    'Draft': { label: 'Draft', icon: <Clock className="w-3 h-3" />, cls: 'bg-slate-100 text-slate-500 border-slate-200' },
    'Finished': { label: 'Done', icon: <CheckCircle2 className="w-3 h-3" />, cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    'Delayed': { label: 'Delayed', icon: <AlertTriangle className="w-3 h-3" />, cls: 'bg-rose-100 text-rose-700 border-rose-200' },
};

const Schedule: React.FC<ScheduleProps> = ({
    projects, crews, assignments = [],
    onUpdateDates, onAddAssignment, onDeleteAssignment, onAddCrew
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'Timeline' | 'Weekly'>('Timeline');
    const [showFinished, setShowFinished] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [editForm, setEditForm] = useState({ start: '', end: '' });
    const [selectedCell, setSelectedCell] = useState<{ crewId: string; date: Date } | null>(null);
    const [selectedDays, setSelectedDays] = useState<Date[]>([]);
    const [assignmentForm, setAssignmentForm] = useState({ id: '', projectId: '', activity: '', workers: '' });
    const [newCrewName, setNewCrewName] = useState('');
    const [showCrewModal, setShowCrewModal] = useState(false);

    // Filter finished projects unless user opts to show them
    const visibleProjects = useMemo(() =>
        showFinished ? projects : projects.filter(p => p.status !== 'Finished'),
        [projects, showFinished]
    );
    const finishedCount = projects.filter(p => p.status === 'Finished').length;

    const projectColorMap = useMemo(() => {
        const map: Record<string, typeof PROJECT_COLORS[0]> = {};
        projects.forEach((p, i) => { map[p.id] = getProjectColor(i); });
        return map;
    }, [projects]);

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => new Date(year, month, i + 1));
    };

    const getWeekDays = (date: Date) => {
        const s = new Date(date);
        const day = s.getDay();
        s.setDate(s.getDate() - day + (day === 0 ? -6 : 1));
        return Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return d; });
    };

    const days = viewMode === 'Timeline' ? getDaysInMonth(currentDate) : getWeekDays(currentDate);
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const calculateDelay = (p: Project) => {
        if (!p.estimatedEndDate || p.status === 'Finished') return 0;
        const end = new Date(p.estimatedEndDate); end.setHours(0, 0, 0, 0);
        return today > end ? Math.ceil((today.getTime() - end.getTime()) / 86400000) : 0;
    };

    const getProjectProgress = (p: Project) => {
        if (p.status === 'Finished') return 100;
        if (!p.startDate || !p.estimatedEndDate) return 0;
        const start = new Date(p.startDate).getTime();
        const end = new Date(p.estimatedEndDate).getTime();
        const now = Date.now();
        if (now <= start) return 0;
        if (now >= end) return 99;
        return Math.round(((now - start) / (end - start)) * 100);
    };

    const handlePrev = () => {
        if (viewMode === 'Timeline') setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        else { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }
    };
    const handleNext = () => {
        if (viewMode === 'Timeline') setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        else { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }
    };

    const handleSaveDates = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingProject && editForm.start) {
            onUpdateDates(editingProject.id, editForm.start, editForm.end || undefined);
            setEditingProject(null);
        }
    };

    const resetForm = () => { setAssignmentForm({ id: '', projectId: '', activity: '', workers: '' }); setSelectedDays([]); };

    const handleSaveAssignment = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedCell && assignmentForm.projectId) {
            selectedDays.forEach(day => onAddAssignment({
                crewId: selectedCell.crewId, projectId: assignmentForm.projectId,
                date: day.toISOString().split('T')[0],
                activity: assignmentForm.activity, workers: assignmentForm.workers, status: 'Pending'
            }));
            setSelectedCell(null); resetForm();
        }
    };

    const handleSaveCrew = (e: React.FormEvent) => {
        e.preventDefault();
        if (newCrewName) { onAddCrew(newCrewName); setNewCrewName(''); setShowCrewModal(false); }
    };

    const shareScheduleWhatsApp = () => {
        if (viewMode !== 'Weekly') return;
        const [weekStart, weekEnd] = [days[0], days[6]];
        let msg = `*WEEKLY REPORT: ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}*\n${'─'.repeat(30)}\n`;
        crews.forEach(crew => {
            const ca = assignments.filter(a => {
                const d = new Date(a.date);
                return a.crewId === crew.id && d >= weekStart && d <= weekEnd;
            });
            if (ca.length > 0) {
                msg += `\n🚀 *${crew.name.toUpperCase()}*\n`;
                ca.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(a => {
                    const p = projects.find(x => x.id === a.projectId);
                    const d = new Date(a.date);
                    msg += `📅 *${d.toLocaleDateString('default', { weekday: 'long' })} (${d.toLocaleDateString('default', { day: 'numeric', month: 'short' })})*\n`;
                    msg += `   🏗️ ${p?.name || 'Unknown'}\n   📝 ${a.activity}\n${a.workers ? `   👷 ${a.workers}\n` : ''}\n`;
                });
                msg += `${'─'.repeat(30)}\n`;
            }
        });
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const activeCount = projects.filter(p => p.status === 'Active').length;
    const delayedCount = projects.filter(p => calculateDelay(p) > 0).length;

    return (
        <div className="space-y-5 pb-10">

            {/* ── HERO HEADER ── */}
            <div className="bg-[#0a192f] rounded-[2rem] p-6 md:p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

                <div className="relative z-10 flex flex-col gap-5">
                    {/* Title row */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-cyan-500/20 p-2 rounded-xl"><CalendarDays className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" /></div>
                            <div>
                                <h2 className="text-xl md:text-2xl font-black tracking-tight">Project Schedule</h2>
                                <p className="text-slate-400 text-xs hidden md:block">Plan, track, and manage your operations</p>
                            </div>
                        </div>

                        {/* Stats — inline on mobile */}
                        <div className="flex gap-4 md:gap-6">
                            <div className="flex flex-col items-center">
                                <span className="text-2xl md:text-3xl font-black text-cyan-400">{activeCount}</span>
                                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Active</span>
                            </div>
                            <div className="w-px bg-slate-700" />
                            <div className="flex flex-col items-center">
                                <span className="text-2xl md:text-3xl font-black text-emerald-400">{finishedCount}</span>
                                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Done</span>
                            </div>
                            <div className="w-px bg-slate-700" />
                            <div className="flex flex-col items-center">
                                <span className="text-2xl md:text-3xl font-black text-rose-400">{delayedCount}</span>
                                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Late</span>
                            </div>
                        </div>
                    </div>

                    {/* Controls row — wraps cleanly on mobile */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* View Mode */}
                        <div className="flex bg-white/10 p-1 rounded-xl backdrop-blur-sm border border-white/10 flex-shrink-0">
                            <button onClick={() => setViewMode('Timeline')} className={`px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 ${viewMode === 'Timeline' ? 'bg-white text-[#0a192f] shadow' : 'text-slate-300 hover:text-white'}`}>
                                <BarChart2 className="w-3.5 h-3.5" /> Gantt
                            </button>
                            <button onClick={() => setViewMode('Weekly')} className={`px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 ${viewMode === 'Weekly' ? 'bg-white text-[#0a192f] shadow' : 'text-slate-300 hover:text-white'}`}>
                                <Grid className="w-3.5 h-3.5" /> Board
                            </button>
                        </div>

                        {/* Show/Hide finished */}
                        {finishedCount > 0 && (
                            <button onClick={() => setShowFinished(v => !v)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold tracking-wide transition-all flex-shrink-0 ${showFinished ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-white/10 border-white/10 text-slate-400 hover:text-white'}`}>
                                {showFinished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                {showFinished ? 'Hide Done' : `Show Done (${finishedCount})`}
                            </button>
                        )}

                        {/* Weekly-only buttons */}
                        {viewMode === 'Weekly' && (
                            <>
                                <button onClick={() => setShowCrewModal(true)} title="Add Team" className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl transition-all flex-shrink-0">
                                    <Plus className="w-4 h-4" />
                                </button>
                                <button onClick={shareScheduleWhatsApp} title="WhatsApp" className="p-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/20 text-emerald-300 rounded-xl transition-all flex-shrink-0">
                                    <Share2 className="w-4 h-4" />
                                </button>
                            </>
                        )}

                        {/* Navigator — pushed to end on wide, stays in flow on narrow */}
                        <div className="flex items-center gap-1 bg-white/10 border border-white/10 rounded-xl p-1 ml-auto flex-shrink-0">
                            <button onClick={handlePrev} className="p-2 hover:bg-white/10 rounded-lg transition-all"><ChevronLeft className="w-4 h-4 text-slate-300" /></button>
                            <span className="text-xs font-bold text-white px-1 text-center" style={{ minWidth: 100 }}>
                                {viewMode === 'Timeline'
                                    ? monthName
                                    : `${days[0].toLocaleDateString('default', { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString('default', { month: 'short', day: 'numeric' })}`}
                            </span>
                            <button onClick={handleNext} className="p-2 hover:bg-white/10 rounded-lg transition-all"><ChevronRight className="w-4 h-4 text-slate-300" /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── TIMELINE / GANTT VIEW ── */}
            {viewMode === 'Timeline' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    {/* Scrollable wrapper — key fix for mobile */}
                    <div className="overflow-x-auto">
                        <div style={{ minWidth: 600 }}>
                            {/* Header row */}
                            <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: '220px 1fr' }}>
                                <div className="p-3 bg-slate-50 border-r border-slate-100">
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Project</span>
                                </div>
                                <div className="flex">
                                    {days.map(day => {
                                        const isToday = day.toDateString() === today.toDateString();
                                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                        return (
                                            <div key={day.toISOString()} className={`w-9 flex-shrink-0 border-r border-slate-100 last:border-r-0 ${isWeekend ? 'bg-slate-50' : ''}`}>
                                                <div className={`h-12 flex flex-col items-center justify-center text-[10px] font-bold relative ${isToday ? 'bg-cyan-50' : ''}`}>
                                                    {isToday && <div className="absolute top-0 left-0 right-0 h-0.5 bg-cyan-500 rounded-full" />}
                                                    <span className={isToday ? 'text-cyan-600 font-black' : isWeekend ? 'text-slate-400' : 'text-slate-500'}>{day.getDate()}</span>
                                                    <span className={`text-[8px] uppercase ${isToday ? 'text-cyan-500' : 'text-slate-400'}`}>{day.toLocaleString('default', { weekday: 'narrow' })}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Project rows */}
                            <div className="divide-y divide-slate-100">
                                {visibleProjects.length === 0 && (
                                    <div className="p-14 text-center text-slate-300">
                                        <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                        <p className="font-bold text-sm">No active projects scheduled.</p>
                                        {finishedCount > 0 && <p className="text-xs mt-1 text-slate-400">{finishedCount} finished project{finishedCount > 1 ? 's' : ''} hidden — click "Show Done" to view.</p>}
                                    </div>
                                )}
                                {visibleProjects.map((project, pidx) => {
                                    const delay = calculateDelay(project);
                                    const progress = getProjectProgress(project);
                                    const color = projectColorMap[project.id] || getProjectColor(pidx);
                                    const statusKey = delay > 0 ? 'Delayed' : (project.status || 'Draft');
                                    const status = STATUS_CONFIG[statusKey] || STATUS_CONFIG['Draft'];

                                    return (
                                        <div key={project.id} className="grid hover:bg-slate-50/60 transition-colors group" style={{ gridTemplateColumns: '220px 1fr' }}>
                                            {/* Left: info */}
                                            <div className="p-3 border-r border-slate-100 flex flex-col justify-center cursor-pointer"
                                                onClick={() => { setEditingProject(project); setEditForm({ start: project.startDate || '', end: project.estimatedEndDate || '' }); }}>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color.bg}`} />
                                                    <span className="font-bold text-slate-800 text-sm truncate group-hover:text-cyan-700 transition-colors">{project.name}</span>
                                                </div>
                                                <div className="ml-4">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border inline-flex items-center gap-1 ${status.cls}`}>
                                                        {status.icon} {status.label}
                                                    </span>
                                                </div>
                                                {project.startDate && (
                                                    <div className="ml-4 mt-2">
                                                        <div className="flex justify-between mb-0.5">
                                                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Progress</span>
                                                            <span className="text-[9px] font-black text-slate-600">{progress}%</span>
                                                        </div>
                                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ${delay > 0 ? 'bg-rose-500' : project.status === 'Finished' ? 'bg-emerald-500' : color.bg}`}
                                                                style={{ width: `${progress}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right: Gantt bar */}
                                            <div className="relative">
                                                <div className="flex h-full relative">
                                                    {days.map(day => {
                                                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                                        const isToday = day.toDateString() === today.toDateString();
                                                        return (
                                                            <div key={day.toISOString()} className={`w-9 flex-shrink-0 border-r border-slate-50 last:border-r-0 min-h-[80px] ${isWeekend ? 'bg-slate-50/40' : ''} ${isToday ? 'bg-cyan-50/30' : ''}`} />
                                                        );
                                                    })}
                                                    {/* Bar overlay */}
                                                    <div className="absolute inset-0 flex items-center pointer-events-none px-1">
                                                        {(() => {
                                                            if (!project.startDate) return null;
                                                            const start = new Date(project.startDate);
                                                            const end = project.estimatedEndDate ? new Date(project.estimatedEndDate) : start;
                                                            const [ms, me] = [days[0], days[days.length - 1]];
                                                            if (end < ms || start > me) return null;
                                                            const vs = start < ms ? ms : start;
                                                            const ve = end > me ? me : end;
                                                            const si = Math.floor((vs.getTime() - ms.getTime()) / 86400000);
                                                            const dur = Math.ceil((ve.getTime() - vs.getTime()) / 86400000) + 1;
                                                            return (
                                                                <div className="absolute h-9 rounded-xl flex items-center px-2.5 overflow-hidden shadow-md"
                                                                    style={{ left: `${si * 36 + 4}px`, width: `${Math.max(dur * 36 - 8, 36)}px`, backgroundColor: color.hex }}>
                                                                    <div className="absolute inset-0 rounded-xl bg-white opacity-25" style={{ width: `${progress}%` }} />
                                                                    <div className="relative flex items-center gap-1.5 w-full">
                                                                        {delay > 0 && <AlertTriangle className="w-3 h-3 text-white flex-shrink-0" />}
                                                                        <span className="text-white text-[11px] font-bold truncate">{project.name}</span>
                                                                        {dur > 4 && <span className="ml-auto text-white/70 text-[10px] font-bold">{progress}%</span>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-3 items-center">
                        {Object.entries(STATUS_CONFIG).map(([, v]) => (
                            <div key={v.label} className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${v.cls}`}>
                                {v.icon} {v.label}
                            </div>
                        ))}
                        <span className="text-[10px] text-slate-400 ml-auto italic hidden md:block">Tap any row to edit dates</span>
                    </div>
                </div>
            )}

            {/* ── BOARD / WEEKLY VIEW ── */}
            {viewMode === 'Weekly' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    {/* Scrollable on mobile */}
                    <div className="overflow-x-auto">
                        <div style={{ minWidth: 560 }}>
                            {/* Day headers */}
                            <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: '130px repeat(7, 1fr)' }}>
                                <div className="px-3 py-3 bg-slate-50 border-r border-slate-100 flex items-center gap-2">
                                    <Users className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Teams</span>
                                </div>
                                {days.map(day => {
                                    const isToday = day.toDateString() === today.toDateString();
                                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                    return (
                                        <div key={day.toISOString()} className={`p-2 text-center border-r border-slate-100 last:border-r-0 relative ${isToday ? 'bg-cyan-50' : isWeekend ? 'bg-slate-50/70' : 'bg-slate-50'}`}>
                                            {isToday && <div className="absolute top-0 left-0 right-0 h-0.5 bg-cyan-500" />}
                                            <div className={`text-[9px] font-black uppercase tracking-widest ${isToday ? 'text-cyan-600' : 'text-slate-400'}`}>{day.toLocaleString('default', { weekday: 'short' })}</div>
                                            <div className={`text-base font-black mt-0.5 ${isToday ? 'text-cyan-600' : isWeekend ? 'text-slate-400' : 'text-slate-700'}`}>{day.getDate()}</div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Crew rows */}
                            {crews.length === 0 ? (
                                <div className="p-14 text-center">
                                    <Users className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                                    <p className="text-slate-400 font-bold text-sm">No teams yet.</p>
                                    <button onClick={() => setShowCrewModal(true)} className="mt-3 px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wide rounded-xl transition-all inline-flex items-center gap-2">
                                        <Plus className="w-4 h-4" /> Add Team
                                    </button>
                                </div>
                            ) : (
                                crews.map((crew, cidx) => (
                                    <div key={crew.id} className="grid border-b border-slate-100 last:border-b-0" style={{ gridTemplateColumns: '130px repeat(7, 1fr)', minHeight: '90px' }}>
                                        {/* Crew label */}
                                        <div className="p-3 border-r border-slate-100 flex items-center gap-2 bg-gradient-to-r from-slate-50 to-white">
                                            <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: PROJECT_COLORS[cidx % PROJECT_COLORS.length].hex }} />
                                            <div className="min-w-0">
                                                <div className="font-black text-slate-700 text-sm truncate">{crew.name}</div>
                                                <div className="text-[10px] text-slate-400">
                                                    {assignments.filter(a => { const d = new Date(a.date); return a.crewId === crew.id && d >= days[0] && d <= days[6]; }).length} tasks
                                                </div>
                                            </div>
                                        </div>

                                        {/* Day cells */}
                                        {days.map(day => {
                                            const dateStr = day.toISOString().split('T')[0];
                                            const assignment = assignments?.find(a => a.crewId === crew.id && a.date === dateStr);
                                            const color = assignment ? (projectColorMap[assignment.projectId] || getProjectColor(0)) : null;
                                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                            const isToday = day.toDateString() === today.toDateString();
                                            const proj = projects.find(p => p.id === assignment?.projectId);

                                            return (
                                                <div key={day.toISOString()}
                                                    className={`border-r border-slate-100 last:border-r-0 p-1.5 cursor-pointer transition-all relative group ${isWeekend ? 'bg-slate-50/50' : ''} ${isToday ? 'bg-cyan-50/30' : ''} ${!assignment ? 'hover:bg-slate-50' : ''}`}
                                                    onClick={() => {
                                                        const assign = assignments?.find(a => a.crewId === crew.id && a.date === dateStr);
                                                        setSelectedCell({ crewId: crew.id, date: day }); setSelectedDays([day]);
                                                        setAssignmentForm(assign
                                                            ? { id: assign.id, projectId: assign.projectId, activity: assign.activity, workers: assign.workers || '' }
                                                            : { id: '', projectId: '', activity: '', workers: '' });
                                                    }}>
                                                    {assignment && color && proj ? (
                                                        <div className={`h-full w-full rounded-lg p-2 ${color.bgLight} border ${color.border} flex flex-col gap-0.5 shadow-sm hover:shadow-md transition-shadow`}>
                                                            <div className={`text-[9px] font-black uppercase tracking-wider ${color.text} truncate flex items-center gap-1`}>
                                                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color.bg}`} />
                                                                {proj.name}
                                                            </div>
                                                            <div className="text-[10px] font-semibold text-slate-700 leading-tight line-clamp-2">{assignment.activity}</div>
                                                            {assignment.workers && (
                                                                <div className="mt-auto flex items-center gap-1 text-[9px] font-bold text-slate-400">
                                                                    <Users className="w-2.5 h-2.5" />{assignment.workers}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                                                                <Plus className="w-3.5 h-3.5 text-slate-400" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODALS ── */}

            {/* Edit Date Modal */}
            {editingProject && (
                <div className="fixed inset-0 bg-[#0a192f]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setEditingProject(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6 bg-gradient-to-br from-[#0a192f] to-[#112240] text-white">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-1">Schedule Project</p>
                                    <h3 className="font-black text-xl">{editingProject.name}</h3>
                                </div>
                                <button onClick={() => setEditingProject(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <form onSubmit={handleSaveDates} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Start</label>
                                    <input type="date" required className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none font-bold text-slate-700" value={editForm.start} onChange={e => setEditForm({ ...editForm, start: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">End</label>
                                    <input type="date" className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none font-bold text-slate-700" value={editForm.end} onChange={e => setEditForm({ ...editForm, end: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setEditingProject(null)} className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all">Cancel</button>
                                <button type="submit" className="flex-1 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-600/20 transition-all">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assignment Modal */}
            {selectedCell && (
                <div className="fixed inset-0 bg-[#0a192f]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => { setSelectedCell(null); resetForm(); }}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-5 bg-gradient-to-br from-[#0a192f] to-[#112240] text-white">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-1">{assignmentForm.id ? 'Edit' : 'New'} Assignment</p>
                                    <h3 className="font-black text-lg">{crews.find(c => c.id === selectedCell.crewId)?.name}</h3>
                                    <p className="text-slate-400 text-xs mt-0.5">{selectedCell.date.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                                </div>
                                <button onClick={() => { setSelectedCell(null); resetForm(); }} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <form onSubmit={handleSaveAssignment} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Days</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {days.map(day => {
                                        const isSel = selectedDays.some(d => d.getTime() === day.getTime());
                                        const isOrig = day.getTime() === selectedCell.date.getTime();
                                        return (
                                            <button key={day.toISOString()} type="button"
                                                onClick={() => {
                                                    if (isSel && !isOrig) setSelectedDays(selectedDays.filter(d => d.getTime() !== day.getTime()));
                                                    else if (!isSel) setSelectedDays([...selectedDays, day]);
                                                }}
                                                className={`px-2.5 py-2 rounded-xl text-xs font-bold border-2 transition-all ${isSel ? 'bg-cyan-600 border-cyan-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-cyan-300'}`}>
                                                {day.toLocaleDateString('default', { weekday: 'short' })} {day.getDate()}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Project</label>
                                <select required className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none font-bold text-slate-700"
                                    value={assignmentForm.projectId} onChange={e => setAssignmentForm({ ...assignmentForm, projectId: e.target.value })}>
                                    <option value="">— Select —</option>
                                    {projects.filter(p => p.status !== 'Finished').map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Activity</label>
                                <input type="text" required placeholder="e.g. Install Dock Pilings"
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none font-bold text-slate-700"
                                    value={assignmentForm.activity} onChange={e => setAssignmentForm({ ...assignmentForm, activity: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Workers (Optional)</label>
                                <input type="text" placeholder="e.g. John, Mike"
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none font-bold text-slate-700"
                                    value={assignmentForm.workers} onChange={e => setAssignmentForm({ ...assignmentForm, workers: e.target.value })} />
                            </div>
                            <div className="flex gap-3 pt-1">
                                {assignmentForm.id && (
                                    <button type="button" onClick={() => { if (window.confirm('Delete?')) { onDeleteAssignment(assignmentForm.id); setSelectedCell(null); resetForm(); } }}
                                        className="p-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border-2 border-rose-100 transition-all">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                                <button type="button" onClick={() => { setSelectedCell(null); resetForm(); }} className="flex-1 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all">Cancel</button>
                                <button type="submit" className="flex-1 px-5 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-600/20 transition-all">
                                    {selectedDays.length > 1 ? `Assign (${selectedDays.length})` : 'Assign'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Crew Modal */}
            {showCrewModal && (
                <div className="fixed inset-0 bg-[#0a192f]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowCrewModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-5 bg-gradient-to-br from-[#0a192f] to-[#112240] text-white">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-1">New Team</p>
                                    <h3 className="font-black text-xl">Add Crew</h3>
                                </div>
                                <button onClick={() => setShowCrewModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <form onSubmit={handleSaveCrew} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Team Name</label>
                                <input type="text" required placeholder="e.g. Dock Crew Alpha"
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none font-bold text-slate-700"
                                    value={newCrewName} onChange={e => setNewCrewName(e.target.value)} />
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setShowCrewModal(false)} className="flex-1 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all">Cancel</button>
                                <button type="submit" className="flex-1 px-5 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-600/20 transition-all">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Schedule;
