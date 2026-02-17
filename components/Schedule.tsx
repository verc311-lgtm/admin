import React, { useState } from 'react';
import { Project, Crew, Assignment } from '../types';
import { CalendarDays, ChevronLeft, ChevronRight, AlertCircle, Users, CheckSquare, Share2, Plus } from 'lucide-react';

interface ScheduleProps {
    projects: Project[];
    crews: Crew[];
    assignments: Assignment[];
    onUpdateDates: (projectId: string, startDate: string, endDate: string | undefined) => void;
    onAddAssignment: (assignment: Omit<Assignment, 'id'>) => void;
    onDeleteAssignment: (id: string) => void;
    onAddCrew: (name: string) => void;
}

const Schedule: React.FC<ScheduleProps> = ({ projects, crews, assignments = [], onUpdateDates, onAddAssignment, onDeleteAssignment, onAddCrew }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'Timeline' | 'Weekly'>('Timeline');
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [editForm, setEditForm] = useState({ start: '', end: '' });

    // Weekly Assignment State
    const [selectedCell, setSelectedCell] = useState<{ crewId: string, date: Date } | null>(null);
    const [selectedDays, setSelectedDays] = useState<Date[]>([]);
    const [assignmentForm, setAssignmentForm] = useState({ id: '', projectId: '', activity: '', workers: '' });
    const [newCrewName, setNewCrewName] = useState('');
    const [showCrewModal, setShowCrewModal] = useState(false);

    // --- Helpers ---

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1));
    };

    const getWeekDays = (date: Date) => {
        const startOfWeek = new Date(date);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        startOfWeek.setDate(diff);

        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            return d;
        });
    };

    const days = viewMode === 'Timeline' ? getDaysInMonth(currentDate) : getWeekDays(currentDate);
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const resetForm = () => {
        setAssignmentForm({ id: '', projectId: '', activity: '', workers: '' });
        setSelectedDays([]);
    };

    const handlePrev = () => {
        if (viewMode === 'Timeline') {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        } else {
            const newDate = new Date(currentDate);
            newDate.setDate(newDate.getDate() - 7);
            setCurrentDate(newDate);
        }
    };

    const handleNext = () => {
        if (viewMode === 'Timeline') {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        } else {
            const newDate = new Date(currentDate);
            newDate.setDate(newDate.getDate() + 7);
            setCurrentDate(newDate);
        }
    };

    const calculateDelay = (project: Project) => {
        if (!project.estimatedEndDate || project.status === 'Finished') return 0;
        const end = new Date(project.estimatedEndDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        if (today > end) {
            const diffTime = Math.abs(today.getTime() - end.getTime());
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        return 0;
    };

    const getProjectStatusColor = (project: Project, delay: number) => {
        if (project.status === 'Finished') return 'bg-green-500';
        if (delay > 0) return 'bg-red-500';
        if (project.status === 'Draft') return 'bg-gray-400';
        return 'bg-blue-500';
    };

    // --- Saving Handlers ---

    const handleSaveDates = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingProject && editForm.start) {
            onUpdateDates(editingProject.id, editForm.start, editForm.end || undefined);
            setEditingProject(null);
        }
    };

    const handleSaveAssignment = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedCell && assignmentForm.projectId) {
            // Bulk Assignment Loop
            selectedDays.forEach(day => {
                onAddAssignment({
                    crewId: selectedCell.crewId,
                    projectId: assignmentForm.projectId,
                    date: day.toISOString().split('T')[0],
                    activity: assignmentForm.activity,
                    workers: assignmentForm.workers,
                    status: 'Pending'
                });
            });

            setSelectedCell(null);
            resetForm();
        }
    };

    const handleSaveCrew = (e: React.FormEvent) => {
        e.preventDefault();
        if (newCrewName) {
            onAddCrew(newCrewName);
            setNewCrewName('');
            setShowCrewModal(false);
        }
    };

    // --- WhatsApp Logic ---

    const shareScheduleWhatsApp = () => {
        if (viewMode !== 'Weekly') return;

        const weekStart = days[0];
        const weekEnd = days[6];
        let message = `*WEEKLY REPORT: ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}*\n`;
        message += `----------------------------------\n`;

        crews.forEach(crew => {
            const crewAssignments = assignments.filter(a => {
                const aDate = new Date(a.date);
                return a.crewId === crew.id && aDate >= weekStart && aDate <= weekEnd;
            });

            if (crewAssignments.length > 0) {
                message += `🚀 *GROUP: ${crew.name.toUpperCase()}*\n`;

                // Sort by date
                crewAssignments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                crewAssignments.forEach(a => {
                    const p = projects.find(proj => proj.id === a.projectId);
                    const dateObj = new Date(a.date);
                    const dayName = dateObj.toLocaleDateString('default', { weekday: 'long' }); // Monday
                    const dateNum = dateObj.toLocaleDateString('default', { day: 'numeric', month: 'short' }); // 17 Feb

                    message += `📅 *${dayName} (${dateNum})*\n`;
                    message += `   🏗️ Project: ${p?.name || 'Unknown'}\n`;
                    message += `   📝 Activity: ${a.activity}\n`;
                    if (a.workers) {
                        message += `   👷 Team: *${a.workers}*\n`;
                    }
                    message += `\n`;
                });
                message += `----------------------------------\n`;
            }
        });

        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-2xl font-black text-[#0a192f] uppercase tracking-tighter flex items-center gap-3">
                        <CalendarDays className="w-8 h-8 text-cyan-600" />
                        Project Schedule
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">Manage Timelines & Operations</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('Timeline')}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${viewMode === 'Timeline' ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Timeline
                        </button>
                        <button
                            onClick={() => setViewMode('Weekly')}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${viewMode === 'Weekly' ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Weekly Ops
                        </button>
                    </div>

                    {viewMode === 'Weekly' && (
                        <>
                            <button onClick={() => setShowCrewModal(true)} className="p-2 bg-cyan-100/50 hover:bg-cyan-100 text-cyan-700 rounded-xl transition-colors" title="Add Crew">
                                <Plus className="w-5 h-5" />
                            </button>
                            <button onClick={shareScheduleWhatsApp} className="p-2 bg-green-100/50 hover:bg-green-100 text-green-700 rounded-xl transition-colors" title="Share on WhatsApp">
                                <Share2 className="w-5 h-5" />
                            </button>
                        </>
                    )}

                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl ml-2">
                        <button onClick={handlePrev} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all">
                            <ChevronLeft className="w-4 h-4 text-slate-600" />
                        </button>
                        <span className="text-xs font-bold text-slate-700 min-w-[100px] text-center uppercase tracking-wide">
                            {viewMode === 'Timeline' ? monthName : `Week of ${days[0].getDate()}`}
                        </span>
                        <button onClick={handleNext} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all">
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                        </button>
                    </div>
                </div>
            </div>

            {/* --- TIMELINE VIEW --- */}
            {viewMode === 'Timeline' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="grid grid-cols-[200px_1fr] border-b border-slate-100">
                        <div className="p-4 bg-slate-50 border-r border-slate-100 font-bold text-slate-600 uppercase text-xs tracking-wider flex items-center">
                            Project Name
                        </div>
                        <div className="overflow-x-auto">
                            <div className="flex min-w-max">
                                {days.map(day => (
                                    <div key={day.toISOString()} className="w-10 flex-shrink-0 border-r border-slate-100 last:border-r-0">
                                        <div className={`h-10 flex flex-col items-center justify-center text-[10px] font-bold ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-slate-50 text-slate-400' : 'text-slate-600'
                                            }`}>
                                            <span>{day.getDate()}</span>
                                            <span className="text-[8px] uppercase">{day.toLocaleString('default', { weekday: 'narrow' })}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {projects.map(project => {
                            const delay = calculateDelay(project);
                            const statusColor = getProjectStatusColor(project, delay);

                            return (
                                <div key={project.id} className="grid grid-cols-[200px_1fr] hover:bg-slate-50/50 transition-colors group">
                                    <div className="p-4 border-r border-slate-100 flex flex-col justify-center cursor-pointer" onClick={() => {
                                        setEditingProject(project);
                                        setEditForm({ start: project.startDate || '', end: project.estimatedEndDate || '' });
                                    }}>
                                        <div className="font-bold text-slate-700 text-sm truncate group-hover:text-cyan-700 transition-colors">
                                            {project.name}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${project.status === 'Finished' ? 'bg-green-100 text-green-700' :
                                                project.status === 'Draft' ? 'bg-gray-100 text-gray-600' : 'bg-cyan-100 text-cyan-700'
                                                }`}>
                                                {project.status}
                                            </span>
                                            {delay > 0 && (
                                                <span className="text-[9px] font-bold text-red-600 flex items-center gap-0.5 animate-pulse">
                                                    <AlertCircle className="w-3 h-3" />
                                                    {delay}d Delay
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto relative">
                                        <div className="flex min-w-max h-full relative">
                                            {days.map(day => (
                                                <div key={day.toISOString()} className="w-10 flex-shrink-0 border-r border-slate-50 last:border-r-0 h-full min-h-[60px]"></div>
                                            ))}

                                            <div className="absolute inset-0 flex items-center min-w-max pointer-events-none">
                                                {(() => {
                                                    if (!project.startDate) return null;
                                                    const start = new Date(project.startDate);
                                                    const end = project.estimatedEndDate ? new Date(project.estimatedEndDate) : start;

                                                    const monthStart = days[0];
                                                    const monthEnd = days[days.length - 1];

                                                    if (end < monthStart || start > monthEnd) return null;

                                                    const visibleStart = start < monthStart ? monthStart : start;
                                                    const visibleEnd = end > monthEnd ? monthEnd : end;

                                                    const startIndex = Math.floor((visibleStart.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24));
                                                    const durationDays = Math.ceil((visibleEnd.getTime() - visibleStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                                                    const leftOffset = startIndex * 40;
                                                    const width = durationDays * 40;

                                                    return (
                                                        <div
                                                            className={`h-8 ${statusColor} rounded-lg shadow-sm mx-1 flex items-center px-2 text-white text-xs font-bold overflow-hidden whitespace-nowrap opacity-90`}
                                                            style={{
                                                                left: `${leftOffset}px`,
                                                                width: `${width > 0 ? width - 8 : 0}px`,
                                                                position: 'absolute'
                                                            }}
                                                        >
                                                            {delay > 0 && <AlertCircle className="w-4 h-4 mr-1 text-white" />}
                                                            {project.name}
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
            )}

            {/* --- WEEKLY OPS VIEW --- */}
            {viewMode === 'Weekly' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    {/* Header Row */}
                    <div className="grid grid-cols-[150px_repeat(7,1fr)] border-b border-slate-100">
                        <div className="p-4 bg-slate-50 border-r border-slate-100 font-bold text-slate-600 uppercase text-xs tracking-wider flex items-center">
                            Teams / Crews
                        </div>
                        {days.map(day => (
                            <div key={day.toISOString()} className="p-3 text-center border-r border-slate-100 last:border-r-0 bg-slate-50">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{day.toLocaleString('default', { weekday: 'short' })}</div>
                                <div className="text-sm font-bold text-slate-700">{day.getDate()}</div>
                            </div>
                        ))}
                    </div>

                    {/* Crew Rows */}
                    {crews.map(crew => (
                        <div key={crew.id} className="grid grid-cols-[150px_repeat(7,1fr)] border-b border-slate-100 last:border-b-0 min-h-[100px]">
                            <div className="p-4 border-r border-slate-100 flex flex-col justify-center bg-slate-50/30">
                                <div className="font-bold text-slate-700">{crew.name}</div>
                            </div>
                            {days.map(day => {
                                // Find assignment
                                const dateStr = day.toISOString().split('T')[0];
                                const assignment = assignments?.find(a => a.crewId === crew.id && a.date === dateStr);
                                const project = projects.find(p => p.id === assignment?.projectId);

                                return (
                                    <div
                                        key={day.toISOString()}
                                        className="border-r border-slate-100 last:border-r-0 p-2 hover:bg-cyan-50/50 transition-colors cursor-pointer relative group"
                                        onClick={() => {
                                            const dayDate = day;
                                            // Pre-select if assignment exists
                                            const assign = assignments?.find(a => a.crewId === crew.id && a.date === day.toISOString().split('T')[0]);

                                            setSelectedCell({ crewId: crew.id, date: dayDate });
                                            setSelectedDays([dayDate]); // Reset bulk select to this day

                                            if (assign) {
                                                setAssignmentForm({
                                                    id: assign.id,
                                                    projectId: assign.projectId,
                                                    activity: assign.activity,
                                                    workers: assign.workers || ''
                                                });
                                            } else {
                                                setAssignmentForm({ id: '', projectId: '', activity: '', workers: '' });
                                            }
                                        }}
                                    >
                                        {assignment ? (
                                            <div className="h-full flex flex-col gap-1 p-2 bg-white border-l-4 border-cyan-500 rounded shadow-sm text-xs">
                                                <div className="font-bold text-cyan-700 truncate">{project?.name || 'Unknown Project'}</div>
                                                <div className="text-slate-600 leading-tight">{assignment.activity}</div>
                                                {assignment.workers && (
                                                    <div className="mt-auto pt-1 flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                        <Users className="w-3 h-3" />
                                                        {assignment.workers}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <Plus className="w-5 h-5 text-slate-300" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}

                    {crews.length === 0 && (
                        <div className="p-10 text-center text-slate-400">
                            <p>No crews defined. Click "+" to add a team.</p>
                        </div>
                    )}
                </div>
            )}

            {/* --- MODALS --- */}

            {/* Edit Date Modal (Timeline) */}
            {editingProject && (
                <div className="fixed inset-0 bg-[#0a192f]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-[#0a192f]">Schedule Project</h3>
                            <button onClick={() => setEditingProject(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><div className="w-4 h-4 text-slate-500">✕</div></button>
                        </div>
                        <form onSubmit={handleSaveDates} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Project</label>
                                <div className="font-bold text-slate-700 text-lg">{editingProject.name}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Start Date</label>
                                    <input type="date" required className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none font-bold text-slate-700" value={editForm.start} onChange={e => setEditForm({ ...editForm, start: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Est. End Date</label>
                                    <input type="date" className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none font-bold text-slate-700" value={editForm.end} onChange={e => setEditForm({ ...editForm, end: e.target.value })} />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setEditingProject(null)} className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl uppercase tracking-wider transition-all">Cancel</button>
                                <button type="submit" className="flex-1 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl uppercase tracking-wider shadow-lg shadow-cyan-600/20 transition-all">Save Schedule</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assignment Modal (Weekly) */}
            {selectedCell && (
                <div className="fixed inset-0 bg-[#0a192f]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-[#0a192f]">
                                {assignmentForm.projectId ? 'Edit Assignment' : 'Add Assignment'}
                            </h3>
                            <button onClick={() => { setSelectedCell(null); resetForm(); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><div className="w-4 h-4 text-slate-500">✕</div></button>
                        </div>
                        <form onSubmit={handleSaveAssignment} className="p-6 space-y-4">

                            {/* Date Selection (Bulk) */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Days</label>
                                <div className="flex flex-wrap gap-2">
                                    {days.map(day => {
                                        const dayName = day.toLocaleDateString('default', { weekday: 'short' });
                                        const dayNum = day.getDate();
                                        const isSelected = selectedDays.some(d => d.getTime() === day.getTime());
                                        const isOriginal = day.getTime() === selectedCell.date.getTime();

                                        return (
                                            <button
                                                key={day.toISOString()}
                                                type="button"
                                                onClick={() => {
                                                    const timestamp = day.getTime();
                                                    if (isSelected && !isOriginal) {
                                                        setSelectedDays(selectedDays.filter(d => d.getTime() !== timestamp));
                                                    } else if (!isSelected) {
                                                        setSelectedDays([...selectedDays, day]);
                                                    }
                                                }}
                                                className={`px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all ${isSelected
                                                    ? 'bg-cyan-600 border-cyan-600 text-white'
                                                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-cyan-300'
                                                    }`}
                                            >
                                                {dayName} {dayNum}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1 font-medium">* Click multiple days to assign widely.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Project</label>
                                <select
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none font-bold text-slate-700"
                                    value={assignmentForm.projectId}
                                    onChange={e => setAssignmentForm({ ...assignmentForm, projectId: e.target.value })}
                                >
                                    <option value="">-- Select Project --</option>
                                    {projects.filter(p => p.status !== 'Finished').map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Activity / Note</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Pouring Concrete"
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none font-bold text-slate-700"
                                    value={assignmentForm.activity}
                                    onChange={e => setAssignmentForm({ ...assignmentForm, activity: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Workers (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. John, Mike, Steve"
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none font-bold text-slate-700"
                                    value={assignmentForm.workers}
                                    onChange={e => setAssignmentForm({ ...assignmentForm, workers: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                {assignmentForm.id && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (window.confirm('Delete this assignment?')) {
                                                onDeleteAssignment(assignmentForm.id);
                                                setSelectedCell(null);
                                                resetForm();
                                            }
                                        }}
                                        className="px-4 py-3 bg-red-100 hover:bg-red-200 text-red-600 font-bold rounded-xl transition-all"
                                        title="Delete"
                                    >
                                        🗑️
                                    </button>
                                )}
                                <button type="button" onClick={() => { setSelectedCell(null); resetForm(); }} className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl uppercase tracking-wider transition-all">Cancel</button>
                                <button type="submit" className="flex-1 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl uppercase tracking-wider shadow-lg shadow-cyan-600/20 transition-all">
                                    {selectedDays.length > 1 ? `Assign (${selectedDays.length} Days)` : 'Assign'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Crew Modal */}
            {showCrewModal && (
                <div className="fixed inset-0 bg-[#0a192f]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-[#0a192f]">Add New Crew</h3>
                            <button onClick={() => setShowCrewModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><div className="w-4 h-4 text-slate-500">✕</div></button>
                        </div>
                        <form onSubmit={handleSaveCrew} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Crew Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Dock Team"
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none font-bold text-slate-700"
                                    value={newCrewName}
                                    onChange={e => setNewCrewName(e.target.value)}
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowCrewModal(false)} className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl uppercase tracking-wider transition-all">Cancel</button>
                                <button type="submit" className="flex-1 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl uppercase tracking-wider shadow-lg shadow-cyan-600/20 transition-all">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Schedule;
