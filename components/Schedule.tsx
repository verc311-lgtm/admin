import React, { useState } from 'react';
import { Project } from '../types';
import { CalendarDays, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface ScheduleProps {
    projects: Project[];
    onUpdateDates: (projectId: string, startDate: string, endDate: string | undefined) => void;
}

const Schedule: React.FC<ScheduleProps> = ({ projects, onUpdateDates }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [editForm, setEditForm] = useState({ start: '', end: '' });

    // Get days in month
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1));
    };

    const days = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const calculateDelay = (project: Project) => {
        if (!project.estimatedEndDate || project.status === 'Finished') return 0;
        const end = new Date(project.estimatedEndDate);
        const today = new Date();
        // Reset hours to compare dates only
        today.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        if (today > end) {
            const diffTime = Math.abs(today.getTime() - end.getTime());
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        return 0;
    };

    const isProjectActive = (project: Project, day: Date) => {
        if (!project.startDate) return false;
        const start = new Date(project.startDate);
        const end = project.estimatedEndDate ? new Date(project.estimatedEndDate) : start;

        // Check if day is within range [start, end]
        // Simplify comparison by using ISO strings YYYY-MM-DD
        const dStr = day.toISOString().split('T')[0];
        const sStr = start.toISOString().split('T')[0];
        const eStr = end.toISOString().split('T')[0];

        return dStr >= sStr && dStr <= eStr;
    };

    const getProjectStatusColor = (project: Project, delay: number) => {
        if (project.status === 'Finished') return 'bg-green-500';
        if (delay > 0) return 'bg-red-500';
        if (project.status === 'Draft') return 'bg-gray-400';
        return 'bg-blue-500';
    };

    const openEditModal = (project: Project) => {
        setEditingProject(project);
        setEditForm({
            start: project.startDate || '',
            end: project.estimatedEndDate || ''
        });
    };

    const handleSaveDates = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingProject && editForm.start) {
            onUpdateDates(editingProject.id, editForm.start, editForm.end || undefined);
            setEditingProject(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-2xl font-black text-[#0a192f] uppercase tracking-tighter flex items-center gap-3">
                        <CalendarDays className="w-8 h-8 text-cyan-600" />
                        Project Schedule
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">Timeline & Delays</p>
                </div>

                <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all">
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <span className="text-lg font-bold text-slate-700 min-w-[140px] text-center uppercase tracking-wide">
                        {monthName}
                    </span>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all">
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Timeline Header (Days) */}
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

                {/* Projects Rows */}
                <div className="divide-y divide-slate-100">
                    {projects.map(project => {
                        const delay = calculateDelay(project);
                        const statusColor = getProjectStatusColor(project, delay);

                        return (
                            <div key={project.id} className="grid grid-cols-[200px_1fr] hover:bg-slate-50/50 transition-colors group">
                                <div className="p-4 border-r border-slate-100 flex flex-col justify-center cursor-pointer" onClick={() => openEditModal(project)}>
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
                                        {/* Grid Background */}
                                        {days.map(day => (
                                            <div key={day.toISOString()} className="w-10 flex-shrink-0 border-r border-slate-50 last:border-r-0 h-full"></div>
                                        ))}

                                        {/* Project Bar */}
                                        {/* Note: This is a simplified rendering logic. Precise positioning typically requires absolute positioning based on dates. */}
                                        {/* For this version, we'll iterate days and check active status to render cells, or simpler: absolute bars if we knew pixel widths. */}
                                        {/* Let's stick with cell-based for responsiveness if we render a connector or solid block. */}

                                        <div className="absolute inset-0 flex items-center min-w-max pointer-events-none">
                                            {/* We need to calculate start offset and width. */}
                                            {(() => {
                                                if (!project.startDate) return null;
                                                const start = new Date(project.startDate);
                                                const end = project.estimatedEndDate ? new Date(project.estimatedEndDate) : start;

                                                const monthStart = days[0];
                                                const monthEnd = days[days.length - 1];

                                                // Check if project overlaps this month
                                                if (end < monthStart || start > monthEnd) return null;

                                                // Clamp dates to visible month
                                                const visibleStart = start < monthStart ? monthStart : start;
                                                const visibleEnd = end > monthEnd ? monthEnd : end;

                                                const startIndex = Math.floor((visibleStart.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24));
                                                const durationDays = Math.ceil((visibleEnd.getTime() - visibleStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                                                const leftOffset = startIndex * 40; // 40px per day column
                                                const width = durationDays * 40;

                                                return (
                                                    <div
                                                        className={`h-8 ${statusColor} rounded-lg shadow-sm mx-1 flex items-center px-2 text-white text-xs font-bold overflow-hidden whitespace-nowrap opacity-90`}
                                                        style={{
                                                            left: `${leftOffset}px`,
                                                            width: `${width - 8}px`, // -8 for margin
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

            {/* Edit Modal */}
            {editingProject && (
                <div className="fixed inset-0 bg-[#0a192f]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-[#0a192f]">Schedule Project</h3>
                            <button
                                onClick={() => setEditingProject(null)}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                            >
                                <div className="w-4 h-4 text-slate-500">✕</div>
                            </button>
                        </div>

                        <form onSubmit={handleSaveDates} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Project</label>
                                <div className="font-bold text-slate-700 text-lg">{editingProject.name}</div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Start Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none font-bold text-slate-700"
                                        value={editForm.start}
                                        onChange={e => setEditForm({ ...editForm, start: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Est. End Date</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none font-bold text-slate-700"
                                        value={editForm.end}
                                        onChange={e => setEditForm({ ...editForm, end: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingProject(null)}
                                    className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl uppercase tracking-wider transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl uppercase tracking-wider shadow-lg shadow-cyan-600/20 transition-all"
                                >
                                    Save Schedule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Schedule;
