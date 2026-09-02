import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Project, Crew, Assignment } from '../types';
import {
    LayoutDashboard, KanbanSquare, FolderOpen, CalendarDays,
    Users, FileText, Search, Plus, Trash2, Edit3, CheckSquare,
    DollarSign, Clock, MapPin, Phone, Mail, Award, ArrowRight,
    Upload, Download, FileUp, PlusCircle, CheckCircle2, AlertCircle,
    UserCheck, ChevronLeft, ChevronRight, Check, Eye, X, Printer, Briefcase, Loader2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ScheduleProps {
    projects: Project[];
    crews: Crew[];
    assignments: Assignment[];
    onUpdateDates: (projectId: string, startDate: string, endDate: string | undefined) => void;
    onAddAssignment: (assignment: Omit<Assignment, 'id'>) => void;
    onDeleteAssignment: (id: string) => void;
    onCreatePMProject?: (projectData: any) => Promise<void>;
    onUpdateProjectPM?: (projectId: string, stage: string, pmData: string, extraFields?: any) => Promise<void>;
    onDeleteProject?: (projectId: string) => Promise<void>;
    zapierWebhookUrl?: string;
    onUpdateWebhookUrl?: (url: string) => void;
}

// 10 Pipeline Stages in order
const PIPELINE_STAGES = [
    'NEW LEAD',
    'SITE VISIT',
    'PROPOSAL',
    'OSCAR APPROVED',
    'PROPOSAL SENT',
    'APPROVED',
    'SCHEDULED',
    'IN PROGRESS',
    'COMPLETED',
    'PAID / CLOSED'
];

const STAGE_COLORS: Record<string, string> = {
    'NEW LEAD': 'bg-slate-100 text-slate-700 border-slate-200',
    'SITE VISIT': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'PROPOSAL': 'bg-pink-100 text-pink-700 border-pink-200',
    'OSCAR APPROVED': 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    'PROPOSAL SENT': 'bg-amber-100 text-amber-700 border-amber-200',
    'APPROVED': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'SCHEDULED': 'bg-violet-100 text-violet-700 border-violet-200',
    'IN PROGRESS': 'bg-cyan-100 text-cyan-700 border-cyan-200',
    'COMPLETED': 'bg-blue-100 text-blue-700 border-blue-200',
    'PAID / CLOSED': 'bg-slate-800 text-slate-200 border-slate-900'
};

const PROJECT_TYPES = [
    'Dock / Pier',
    'Dock Repair',
    'Bulkhead',
    'Seawall',
    'Riprap',
    'Retaining Wall',
    'Boat Lift',
    'Demolition',
    'Other'
];

const SCOPE_TEMPLATES: Record<string, { title: string; scope: string; included: string; exclusions: string; warranty: string }> = {
    'Dock / Pier': {
        title: 'New Custom Marine Dock & Pier',
        scope: 'Construct a new custom residential dock extending from shoreline. Piles driven into seabed to secure framing. Decking installed using premium fasteners.',
        included: '6"x6" marine grade piling, Yellow Pine framing (2x8 structure), Choice deck boards, galvanized structural bolts and fasteners.',
        exclusions: 'Electrical wiring, water pipe connection, plumbing fixtures, custom handrail modifications unless specified.',
        warranty: '1-year workmanship warranty. Marine treatment warranty on pilings as per supplier specifications.'
    },
    'Bulkhead': {
        title: 'Shoreline Protection Bulkhead',
        scope: 'Install a wooden marine bulkhead to stabilize the shoreline and prevent further erosion. Drive bulkhead piles and sheeting, install tie-back anchors, filter cloth and gravel backfill.',
        included: 'T&G marine sheeting 2.5cca, double 6x6 walers, tie-backs with deadmen anchors, commercial non-woven geotextile fabric, top soil and gravel backfill.',
        exclusions: 'Removal of large rock outcroppings, landscaping post-backfill, regulatory permit agency fees.',
        warranty: '2-year warranty on structural stability. Workmanship guaranteed.'
    },
    'Riprap': {
        title: 'Rip-Rap Stone Slope Protection',
        scope: 'Slope stabilization using high-durability Class I Rip-Rap stone bedding overlaying heavy filter fabric cloth and secured with anchor pins.',
        included: 'Class I Rip-Rap stones, underlayment filter cloth, gravel bed support, anchor pins, mobilization of excavation equipment.',
        exclusions: 'Excavation of unknown underground structures, concrete retaining modifications.',
        warranty: '1-year shifting warranty. Material warranties provided by the quarry.'
    }
};

interface ProjectPMData {
    phone?: string;
    email?: string;
    address?: string;
    projectType?: string;
    description?: string;
    leadSource?: string;
    assignedEmployee?: string;
    notes?: string;
    
    siteVisit?: {
        date?: string;
        employee?: string;
        measurements?: string;
        conditions?: string;
        notes?: string;
        recommendations?: string;
    };
    
    proposal?: {
        number?: string;
        title?: string;
        scope?: string;
        included?: string;
        price?: number;
        duration?: string;
        paymentTerms?: string;
        exclusions?: string;
        warranty?: string;
        notes?: string;
        selectedPhotos?: string[];
        sentDate?: string;
        recipient?: string;
        version?: number;
        status?: 'Sent' | 'Follow Up' | 'Accepted' | 'Declined';
        approvedDate?: string;
        approvedAmount?: number;
        signature?: string;
        depositRequired?: number;
        depositReceived?: boolean;
    };
    
    checklist?: {
        siteVisit?: boolean;
        getMeasurements?: boolean;
        createProposal?: boolean;
        oscarApproval?: boolean;
        sendProposal?: boolean;
        reviewCustomerProposal?: boolean;
        signContract?: boolean;
    };
    
    schedule?: {
        startDate?: string;
        estimatedEndDate?: string;
        manager?: string;
        crewId?: string;
        notes?: string;
    };
    
    dailyLogs?: {
        id: string;
        date: string;
        completed: string;
        crewName: string;
        hours: number;
        notes: string;
        files?: string[];
    }[];
    
    changeOrders?: {
        id: string;
        number: string;
        description: string;
        price: number;
        additionalDays: number;
        status: 'Pending' | 'Approved' | 'Declined';
        approvedDate?: string;
    }[];
    
    invoices?: {
        id: string;
        number: string;
        amount: number;
        date: string;
        status: 'Unpaid' | 'Paid';
        description?: string;
    }[];
    
    files?: {
        id: string;
        name: string;
        folder: 'Photos & Videos' | 'proposal' | 'Contract & CO' | 'Invoices';
        url: string;
        size: string;
        date: string;
    }[];
    
    activityHistory?: {
        id: string;
        action: string;
        user: string;
        date: string;
    }[];
    
    daysInStages?: Record<string, number>;
}

const Schedule: React.FC<ScheduleProps> = ({
    projects, crews, assignments,
    onUpdateDates, onAddAssignment, onDeleteAssignment, onAddCrew,
    onCreatePMProject, onUpdateProjectPM, onDeleteProject,
    zapierWebhookUrl: propWebhookUrl, onUpdateWebhookUrl
}) => {
    // 1. Navigation & Views States
    const [subView, setSubView] = useState<'Dashboard' | 'Projects' | 'Pipeline' | 'Calendar' | 'Customers' | 'Files'>('Dashboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [projectDetailTab, setProjectDetailTab] = useState<'Overview' | 'Site Visit' | 'Proposal' | 'Contract' | 'Files' | 'Schedule' | 'Daily Logs' | 'Change Orders' | 'Invoices'>('Overview');
    
    // Calendar month navigator
    const [calendarDate, setCalendarDate] = useState(new Date());

    // 2. Modals & Forms States
    const [newLeadModal, setNewLeadModal] = useState(false);
    const [projectTypesList, setProjectTypesList] = useState(PROJECT_TYPES);
    const [showCustomTypeInput, setShowCustomTypeInput] = useState(false);
    const [customTypeVal, setCustomTypeVal] = useState('');
    const [newLeadForm, setNewLeadForm] = useState({
        customerName: '', phone: '', email: '', address: '',
        projectType: 'Dock / Pier', description: '', leadSource: '',
        assignedEmployee: '', notes: ''
    });

    const [editLeadModal, setEditLeadModal] = useState(false);
    const [editLeadForm, setEditLeadForm] = useState({
        customerName: '', phone: '', email: '', address: '',
        projectType: 'Dock / Pier', description: '', leadSource: '',
        assignedEmployee: '', notes: ''
    });

    // Appointment scheduling states
    const [appointmentModal, setAppointmentModal] = useState(false);
    const [selectedAppointmentDate, setSelectedAppointmentDate] = useState<Date | null>(null);
    const [selectedProjectForAppointment, setSelectedProjectForAppointment] = useState<Project | null>(null);
    const [appointmentForm, setAppointmentForm] = useState({
        projectId: '',
        time: '09:00',
        activity: 'Site Visit',
        crewId: '',
        notes: ''
    });
    const [viewAppointmentDetails, setViewAppointmentDetails] = useState<Assignment | null>(null);
    const [projectSearchQuery, setProjectSearchQuery] = useState('');
    const [showProjectSearchDropdown, setShowProjectSearchDropdown] = useState(false);

    // Webhook Settings
    const [zapierWebhookUrl, setZapierWebhookUrl] = useState(() => propWebhookUrl || localStorage.getItem('zapier_webhook_url') || '');

    React.useEffect(() => {
        if (propWebhookUrl !== undefined) {
            setZapierWebhookUrl(propWebhookUrl);
        }
    }, [propWebhookUrl]);

    const [showSettings, setShowSettings] = useState(false);
    const [isCreatingLead, setIsCreatingLead] = useState(false);
    const creatingLeadLockRef = useRef(false);
    const sentLeadWebhooksRef = useRef<Set<string>>(new Set());

    // Site Visit Drag Scheduling States
    const [siteVisitDragModal, setSiteVisitDragModal] = useState(false);
    const [draggedProject, setDraggedProject] = useState<Project | null>(null);
    const [dragVisitForm, setDragVisitForm] = useState({
        date: new Date().toISOString().split('T')[0],
        employee: '',
        notes: ''
    });

    const [siteVisitForm, setSiteVisitForm] = useState({
        date: '', employee: '', measurements: '',
        conditions: '', notes: '', recommendations: ''
    });

    const [proposalForm, setProposalForm] = useState({
        title: '', scope: '', included: '', price: 0,
        duration: '', paymentTerms: '', exclusions: '', warranty: '', notes: ''
    });

    const [proposalSentForm, setProposalSentForm] = useState({
        sentDate: '', recipient: '', amount: 0, version: 1, status: 'Sent' as const
    });

    const [approvalForm, setApprovalForm] = useState({
        approvedDate: '', approvedAmount: 0, signature: '',
        depositRequired: 0, depositReceived: false
    });

    const [scheduleForm, setScheduleForm] = useState({
        startDate: '', estimatedEndDate: '', manager: '', crewId: '', notes: ''
    });

    const [logForm, setLogForm] = useState({
        date: '', completed: '', crewName: '', hours: 0, notes: ''
    });

    const [coForm, setCOForm] = useState({
        description: '', price: 0, additionalDays: 0
    });

    const [invoiceForm, setInvoiceForm] = useState({
        number: '', amount: 0, date: '', description: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadTargetFolder, setUploadTargetFolder] = useState<any>(null);

    // Helpers to parse / stringify pm_data
    const getPMData = (p: Project): ProjectPMData => {
        try {
            if (!p.pm_data) return {};
            return typeof p.pm_data === 'string' ? JSON.parse(p.pm_data) : p.pm_data;
        } catch (e) {
            return {};
        }
    };

    const savePMData = async (projectId: string, stage: string, data: ProjectPMData, extraFields: Partial<Project> = {}) => {
        if (onUpdateProjectPM) {
            await onUpdateProjectPM(projectId, stage, JSON.stringify(data), extraFields);
            // Update selected project locally if open
            if (selectedProject && selectedProject.id === projectId) {
                setSelectedProject(prev => prev ? { ...prev, pipelineStage: stage, pm_data: JSON.stringify(data), ...extraFields } : null);
            }
        }
    };

    const logActivity = (data: ProjectPMData, action: string): ProjectPMData => {
        const history = data.activityHistory || [];
        const newLog = {
            id: Math.random().toString(36).substring(2, 9),
            action,
            user: 'Coastal Admin',
            date: new Date().toISOString()
        };
        return {
            ...data,
            activityHistory: [newLog, ...history]
        };
    };

    // Calculate dynamic stats
    const stats = useMemo(() => {
        const outstandingBalance = projects
            .filter(p => p.pipelineStage !== 'PAID / CLOSED')
            .reduce((sum, p) => sum + (p.balance || 0), 0);

        return {
            active: projects.filter(p => ['APPROVED', 'SCHEDULED', 'IN PROGRESS', 'COMPLETED'].includes(p.pipelineStage || 'NEW LEAD')).length,
            pendingProposals: projects.filter(p => p.pipelineStage === 'PROPOSAL SENT').length,
            approved: projects.filter(p => p.pipelineStage === 'APPROVED').length,
            inProgress: projects.filter(p => p.pipelineStage === 'IN PROGRESS').length,
            completed: projects.filter(p => p.pipelineStage === 'COMPLETED').length,
            outstandingBalance
        };
    }, [projects]);

    // Stage counts mapping
    const stageCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        PIPELINE_STAGES.forEach(s => counts[s] = 0);
        projects.forEach(p => {
            const stage = p.pipelineStage || 'NEW LEAD';
            counts[stage] = (counts[stage] || 0) + 1;
        });
        return counts;
    }, [projects]);

    // Group projects by pipeline stage
    const projectsByStage = useMemo(() => {
        const grouped: Record<string, Project[]> = {};
        PIPELINE_STAGES.forEach(s => { grouped[s] = []; });
        projects.forEach(p => {
            const stage = p.pipelineStage || 'NEW LEAD';
            if (grouped[stage]) grouped[stage].push(p);
        });
        return grouped;
    }, [projects]);

    // Filter projects for global search
    const filteredProjects = useMemo(() => {
        if (!searchQuery) return projects;
        const q = searchQuery.toLowerCase();
        return projects.filter(p => {
            const pm = getPMData(p);
            return (
                p.name.toLowerCase().includes(q) ||
                p.id.toLowerCase().includes(q) ||
                p.client.toLowerCase().includes(q) ||
                (pm.address && pm.address.toLowerCase().includes(q)) ||
                (pm.phone && pm.phone.toLowerCase().includes(q)) ||
                (pm.proposal?.number && pm.proposal.number.toLowerCase().includes(q))
            );
        });
    }, [projects, searchQuery]);

    // Group list of customers
    const customers = useMemo(() => {
        const map: Record<string, { name: string; email: string; phone: string; address: string; projectsList: Project[] }> = {};
        projects.forEach(p => {
            const pm = getPMData(p);
            const clientName = p.client || 'Unknown Customer';
            if (!map[clientName]) {
                map[clientName] = {
                    name: clientName,
                    email: pm.email || '',
                    phone: pm.phone || '',
                    address: pm.address || '',
                    projectsList: []
                };
            }
            map[clientName].projectsList.push(p);
        });
        return Object.values(map);
    }, [projects]);

    // Lead ID Auto-Generator
    const getNextProjectID = () => {
        const year = new Date().getFullYear();
        const pattern = new RegExp(`PROJECT-${year}-(\\d{4})`);
        let maxSeq = 0;
        projects.forEach(p => {
            const match = p.id.match(pattern);
            if (match) {
                const seq = parseInt(match[1], 10);
                if (seq > maxSeq) maxSeq = seq;
            }
        });
        return `PROJECT-${year}-${String(maxSeq + 1).padStart(4, '0')}`;
    };

    // Proposal ID Auto-Generator
    const getNextProposalID = () => {
        const year = new Date().getFullYear();
        const pattern = new RegExp(`PROP-${year}-(\\d{4})`);
        let maxSeq = 0;
        projects.forEach(p => {
            const pm = getPMData(p);
            const match = pm.proposal?.number?.match(pattern);
            if (match) {
                const seq = parseInt(match[1], 10);
                if (seq > maxSeq) maxSeq = seq;
            }
        });
        return `PROP-${year}-${String(maxSeq + 1).padStart(4, '0')}`;
    };

    // Lead Form Submitter
    const handleCreateLead = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isCreatingLead || creatingLeadLockRef.current) return;

        if (!newLeadForm.customerName || !newLeadForm.address) {
            alert('Customer Name and Project Address are required.');
            return;
        }

        creatingLeadLockRef.current = true;
        setIsCreatingLead(true);

        try {
            const finalProjectType = showCustomTypeInput ? (customTypeVal.trim() || 'Other') : newLeadForm.projectType;

            // If custom type is new, add it to list
            if (showCustomTypeInput && finalProjectType && !projectTypesList.includes(finalProjectType)) {
                setProjectTypesList(prev => [...prev, finalProjectType]);
            }

            const nextId = getNextProjectID();
            const initialPMData: ProjectPMData = {
                phone: newLeadForm.phone,
                email: newLeadForm.email,
                address: newLeadForm.address,
                projectType: finalProjectType,
                description: newLeadForm.description,
                leadSource: newLeadForm.leadSource,
                assignedEmployee: newLeadForm.assignedEmployee,
                notes: newLeadForm.notes,
                checklist: {
                    siteVisit: false,
                    getMeasurements: false,
                    createProposal: false,
                    oscarApproval: false,
                    sendProposal: false,
                    reviewCustomerProposal: false,
                    signContract: false
                },
                files: [],
                dailyLogs: [],
                changeOrders: [],
                invoices: [],
                activityHistory: []
            };

            const loggedPM = logActivity(initialPMData, `Lead created with ID ${nextId} assigned to ${newLeadForm.assignedEmployee || 'Unassigned'}`);
            
            const dbProject = {
                id: nextId,
                name: `${finalProjectType} for ${newLeadForm.customerName}`,
                client: newLeadForm.customerName,
                totalAmount: 0.00,
                balance: 0.00,
                paidAmount: 0.00,
                totalExpenses: 0.00,
                profit: 0.00,
                startDate: new Date().toISOString().split('T')[0],
                status: 'Draft',
                pipelineStage: 'NEW LEAD',
                pm_data: JSON.stringify(loggedPM)
            };

            if (onCreatePMProject) {
                await onCreatePMProject(dbProject);

                // Trigger Webhook to Make/Zapier in the background automatically on lead creation ONLY ONCE
                if (zapierWebhookUrl && !sentLeadWebhooksRef.current.has(nextId)) {
                    sentLeadWebhooksRef.current.add(nextId);
                    const payload = {
                        action: 'CREATE_LEAD',
                        event: 'lead_created',
                        folderName: newLeadForm.address || newLeadForm.customerName,
                        projectId: nextId,
                        customerName: newLeadForm.customerName,
                        address: newLeadForm.address || 'No Address',
                        phone: newLeadForm.phone || 'No Phone',
                        email: newLeadForm.email || 'No Email',
                        projectType: finalProjectType,
                        previousStage: '',
                        newStage: 'NEW LEAD',
                        amount: 0,
                        assignedEmployee: newLeadForm.assignedEmployee || 'Unassigned',
                        notes: newLeadForm.notes,
                        triggeredAt: new Date().toISOString()
                    };

                    fetch(zapierWebhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    }).then(() => console.log('Make Webhook fired successfully for single Google Drive folder creation'))
                      .catch(err => console.error('Make Webhook error:', err));
                }

                setNewLeadModal(false);
                setShowCustomTypeInput(false);
                setCustomTypeVal('');
                setNewLeadForm({
                    customerName: '', phone: '', email: '', address: '',
                    projectType: 'Dock / Pier', description: '', leadSource: '',
                    assignedEmployee: '', notes: ''
                });
            }
        } catch (err: any) {
            console.error('Error creating lead:', err);
            alert('Error creating lead: ' + (err?.message || 'Unknown error'));
        } finally {
            setIsCreatingLead(false);
            creatingLeadLockRef.current = false;
        }
    };

    const handleOpenEditLead = () => {
        if (!selectedProject) return;
        const pm = getPMData(selectedProject);
        setEditLeadForm({
            customerName: selectedProject.client || '',
            phone: pm.phone || '',
            email: pm.email || '',
            address: pm.address || selectedProject.name || '',
            projectType: pm.projectType || 'Dock / Pier',
            leadSource: pm.leadSource || '',
            assignedEmployee: pm.assignedEmployee || '',
            description: pm.description || '',
            notes: pm.notes || ''
        });
        setEditLeadModal(true);
    };

    const handleUpdateLead = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject) return;

        let pm = getPMData(selectedProject);
        
        // Log changes
        const changes: string[] = [];
        if (selectedProject.client !== editLeadForm.customerName) changes.push(`customer name`);
        if (pm.phone !== editLeadForm.phone) changes.push(`phone`);
        if (pm.email !== editLeadForm.email) changes.push(`email`);
        if (pm.address !== editLeadForm.address) changes.push(`address`);
        if (pm.projectType !== editLeadForm.projectType) changes.push(`project type`);
        if (pm.leadSource !== editLeadForm.leadSource) changes.push(`lead source`);
        if (pm.assignedEmployee !== editLeadForm.assignedEmployee) changes.push(`representative`);
        if (pm.description !== editLeadForm.description) changes.push(`description`);
        if (pm.notes !== editLeadForm.notes) changes.push(`notes`);

        pm.phone = editLeadForm.phone;
        pm.email = editLeadForm.email;
        pm.address = editLeadForm.address;
        pm.projectType = editLeadForm.projectType;
        pm.leadSource = editLeadForm.leadSource;
        pm.assignedEmployee = editLeadForm.assignedEmployee;
        pm.description = editLeadForm.description;
        pm.notes = editLeadForm.notes;

        const actionText = changes.length > 0 ? `Updated lead details: ${changes.join(', ')}` : 'Saved lead details with no changes';
        pm = logActivity(pm, actionText);

        const newPmDataStr = JSON.stringify(pm);

        if (onUpdateProjectPM) {
            await onUpdateProjectPM(
                selectedProject.id,
                selectedProject.pipelineStage || 'NEW LEAD',
                newPmDataStr,
                {
                    client: editLeadForm.customerName,
                    name: `${editLeadForm.projectType} for ${editLeadForm.customerName}`
                }
            );

            // Update local selectedProject state
            setSelectedProject(prev => prev ? {
                ...prev,
                client: editLeadForm.customerName,
                name: `${editLeadForm.projectType} for ${editLeadForm.customerName}`,
                pm_data: newPmDataStr
            } : null);

            setEditLeadModal(false);
            alert('Lead details updated successfully!');
        }
    };

    const getLocalDateString = (date: Date) => {
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().split('T')[0];
    };

    const formatTimeString = (timeStr: string) => {
        if (!timeStr) return '';
        const [hourStr, minStr] = timeStr.split(':');
        const hour = parseInt(hourStr);
        const min = parseInt(minStr);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        const displayMin = min < 10 ? `0${min}` : minStr;
        return `${displayHour}:${displayMin} ${ampm}`;
    };

    const handleOpenScheduleAppointment = (date: Date) => {
        setSelectedAppointmentDate(date);
        setSelectedProjectForAppointment(null);
        setProjectSearchQuery('');
        setShowProjectSearchDropdown(false);
        setAppointmentForm({
            projectId: '',
            time: '09:00',
            activity: 'Site Visit',
            crewId: '',
            notes: ''
        });
        setAppointmentModal(true);
    };

    const handleCreateAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAppointmentDate || !appointmentForm.projectId) {
            alert("Please search and select a valid project from the list.");
            return;
        }

        const dateStr = getLocalDateString(selectedAppointmentDate);
        const formattedTime = formatTimeString(appointmentForm.time);
        
        // Save the details inside the assignment
        // Activity layout: "⏰ 10:30 AM - Site Visit"
        const finalActivity = `⏰ ${formattedTime} - ${appointmentForm.activity}`;
        
        const assignmentData = {
            projectId: appointmentForm.projectId,
            crewId: appointmentForm.crewId || 'unassigned',
            date: dateStr,
            activity: finalActivity,
            workers: appointmentForm.notes || '', // Store notes here
            status: 'Pending' as const
        };

        if (onAddAssignment) {
            await onAddAssignment(assignmentData);
            setAppointmentModal(false);
            alert('Appointment scheduled successfully!');
        }
    };

    const handleOpenAppointmentDetails = (assignment: Assignment) => {
        setViewAppointmentDetails(assignment);
    };
    const handleDragStart = (e: React.DragEvent, projectId: string) => {
        e.dataTransfer.setData('text/plain', projectId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent, targetStage: string) => {
        e.preventDefault();
        const projectId = e.dataTransfer.getData('text/plain');
        const project = projects.find(p => p.id === projectId);
        if (!project || project.pipelineStage === targetStage) return;

        // If target stage is SITE VISIT, intercept with popup modal
        if (targetStage === 'SITE VISIT') {
            setDraggedProject(project);
            const pm = getPMData(project);
            setDragVisitForm({
                date: new Date().toISOString().split('T')[0],
                employee: pm.assignedEmployee || '',
                notes: ''
            });
            setSiteVisitDragModal(true);
            return;
        }

        let pm = getPMData(project);
        pm = logActivity(pm, `Moved project from stage '${project.pipelineStage || 'NEW LEAD'}' to '${targetStage}'`);
        
        const extraFields: Partial<Project> = {};
        if (targetStage === 'PAID / CLOSED') {
            extraFields.status = 'Finished';
        } else if (targetStage === 'IN PROGRESS') {
            extraFields.status = 'In Progress';
        } else if (targetStage === 'NEW LEAD') {
            extraFields.status = 'Draft';
        }

        // Trigger Webhook to Zapier in the background automatically (ONLY for Zapier tasks, NEVER for Make Google Drive creation)
        if (zapierWebhookUrl && !zapierWebhookUrl.includes('make.com')) {
            const payload = {
                projectId: project.id,
                customerName: project.client,
                address: pm.address || 'No Address',
                phone: pm.phone || 'No Phone',
                email: pm.email || 'No Email',
                projectType: pm.projectType || 'Other',
                previousStage: project.pipelineStage || 'NEW LEAD',
                newStage: targetStage,
                amount: project.totalAmount || 0,
                assignedEmployee: pm.assignedEmployee || 'Unassigned',
                startDate: project.startDate,
                endDate: project.estimatedEndDate || project.startDate,
                triggeredAt: new Date().toISOString()
            };

            fetch(zapierWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(() => console.log('Zapier Webhook fired automatically in the background'))
              .catch(err => console.error('Zapier Webhook error:', err));
        }

        await savePMData(projectId, targetStage, pm, extraFields);
    };

    const handleConfirmSiteVisitDrag = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!draggedProject) return;

        let pm = getPMData(draggedProject);
        pm.siteVisit = {
            date: dragVisitForm.date,
            employee: dragVisitForm.employee,
            measurements: pm.siteVisit?.measurements || '',
            conditions: pm.siteVisit?.conditions || '',
            notes: dragVisitForm.notes,
            recommendations: pm.siteVisit?.recommendations || ''
        };

        pm = logActivity(pm, `Moved to SITE VISIT and scheduled inspection for ${dragVisitForm.date} assigned to ${dragVisitForm.employee}`);

        const extraFields: Partial<Project> = {
            estimatedEndDate: dragVisitForm.date
        };

        // Trigger Webhook to Zapier/Make (ONLY for Zapier tasks, NEVER for Make Google Drive creation)
        if (zapierWebhookUrl && !zapierWebhookUrl.includes('make.com')) {
            const payload = {
                projectId: draggedProject.id,
                customerName: draggedProject.client,
                address: pm.address || 'No Address',
                phone: pm.phone || 'No Phone',
                email: pm.email || 'No Email',
                projectType: pm.projectType || 'Other',
                previousStage: draggedProject.pipelineStage || 'NEW LEAD',
                newStage: 'SITE VISIT',
                amount: draggedProject.totalAmount || 0,
                assignedEmployee: dragVisitForm.employee || 'Unassigned',
                startDate: draggedProject.startDate,
                endDate: dragVisitForm.date, // Site Visit Scheduled Date represents the Event/End Date
                notes: dragVisitForm.notes,
                triggeredAt: new Date().toISOString()
            };

            fetch(zapierWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(() => console.log('Zapier Webhook fired for Site Visit scheduling'))
              .catch(err => console.error('Zapier Webhook error:', err));
        }

        await savePMData(draggedProject.id, 'SITE VISIT', pm, extraFields);
        setSiteVisitDragModal(false);
        setDraggedProject(null);
    };

    // Load sub-forms when selecting/opening a project
    const handleSelectProject = (project: Project) => {
        setSelectedProject(project);
        setProjectDetailTab('Overview');
        const pm = getPMData(project);

        // Populate forms with project data
        setSiteVisitForm({
            date: pm.siteVisit?.date || '',
            employee: pm.siteVisit?.employee || '',
            measurements: pm.siteVisit?.measurements || '',
            conditions: pm.siteVisit?.conditions || '',
            notes: pm.siteVisit?.notes || '',
            recommendations: pm.siteVisit?.recommendations || ''
        });

        setProposalForm({
            title: pm.proposal?.title || `${pm.projectType || 'Project'} Construction Proposal`,
            scope: pm.proposal?.scope || '',
            included: pm.proposal?.included || '',
            price: pm.proposal?.price || project.totalAmount || 0,
            duration: pm.proposal?.duration || '',
            paymentTerms: pm.proposal?.paymentTerms || '50% deposit, 50% upon completion',
            exclusions: pm.proposal?.exclusions || '',
            warranty: pm.proposal?.warranty || '1-year structural warranty',
            notes: pm.proposal?.notes || ''
        });

        setProposalSentForm({
            sentDate: pm.proposal?.sentDate || new Date().toISOString().split('T')[0],
            recipient: pm.proposal?.recipient || pm.email || '',
            amount: pm.proposal?.price || project.totalAmount || 0,
            version: pm.proposal?.version || 1,
            status: pm.proposal?.status || 'Sent'
        });

        setApprovalForm({
            approvedDate: pm.proposal?.approvedDate || new Date().toISOString().split('T')[0],
            approvedAmount: pm.proposal?.approvedAmount || pm.proposal?.price || project.totalAmount || 0,
            signature: pm.proposal?.signature || '',
            depositRequired: pm.proposal?.depositRequired || 0,
            depositReceived: pm.proposal?.depositReceived || false
        });

        setScheduleForm({
            startDate: pm.schedule?.startDate || project.startDate || '',
            estimatedEndDate: pm.schedule?.estimatedEndDate || project.estimatedEndDate || '',
            manager: pm.schedule?.manager || pm.assignedEmployee || '',
            crewId: pm.schedule?.crewId || '',
            notes: pm.schedule?.notes || ''
        });
    };

    // Save Site Visit Details
    const handleSaveSiteVisit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject) return;
        let pm = getPMData(selectedProject);
        pm.siteVisit = { ...siteVisitForm };
        pm = logActivity(pm, `Saved site visit information by ${siteVisitForm.employee || 'unassigned'}`);

        // Automatically progress stage if in NEW LEAD
        const currentStage = selectedProject.pipelineStage || 'NEW LEAD';
        const targetStage = currentStage === 'NEW LEAD' ? 'SITE VISIT' : currentStage;

        await savePMData(selectedProject.id, targetStage, pm);
        alert('Site visit information saved successfully.');
    };

    // Load reusable scope of work template
    const handleLoadTemplate = (typeKey: string) => {
        const t = SCOPE_TEMPLATES[typeKey];
        if (t) {
            setProposalForm(prev => ({
                ...prev,
                scope: t.scope,
                included: t.included,
                exclusions: t.exclusions,
                warranty: t.warranty
            }));
        }
    };

    // Create & Save Proposal
    const handleSaveProposal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject) return;
        let pm = getPMData(selectedProject);
        
        const propNum = pm.proposal?.number || getNextProposalID();
        pm.proposal = {
            ...pm.proposal,
            ...proposalForm,
            number: propNum,
            version: (pm.proposal?.version || 0) + 1,
            status: pm.proposal?.status || 'Sent'
        };

        pm = logActivity(pm, `Created/Updated Proposal version ${pm.proposal.version} (Number: ${propNum}) for amount $${proposalForm.price}`);

        // Automatically progress to PROPOSAL stage if in SITE VISIT
        const currentStage = selectedProject.pipelineStage || 'NEW LEAD';
        const targetStage = currentStage === 'SITE VISIT' ? 'PROPOSAL' : currentStage;

        await savePMData(selectedProject.id, targetStage, pm);
        alert(`Proposal ${propNum} saved successfully!`);
    };

    // Export Proposal PDF & Save in virtual Google Drive
    const handleExportProposalPDF = () => {
        if (!selectedProject) return;
        const pm = getPMData(selectedProject);
        const prop = pm.proposal;
        if (!prop || !prop.number) {
            alert('Please build and save the proposal first.');
            return;
        }

        const doc = new jsPDF();
        
        // Header theme
        doc.setFillColor(10, 25, 47); // Dark Blue navy
        doc.rect(0, 0, 210, 35, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text('COASTALVA MARINE CONSTRUCTION', 15, 22);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('SHORELINE STABILIZATION & CONSTRUCTION', 15, 29);
        doc.text(`Proposal #: ${prop.number}`, 155, 22);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 155, 29);

        // Client info block
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('PROPOSAL PREPARED FOR:', 15, 50);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Customer Name: ${selectedProject.client}`, 15, 57);
        doc.text(`Project Address: ${pm.address || 'N/A'}`, 15, 63);
        doc.text(`Email: ${pm.email || 'N/A'} | Phone: ${pm.phone || 'N/A'}`, 15, 69);

        doc.setFont('helvetica', 'bold');
        doc.text(`Project Title: ${prop.title || 'Proposal'}`, 15, 80);

        // Details grid
        (doc as any).autoTable({
            startY: 85,
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59], fontStyle: 'bold' },
            head: [['Description of Work', 'Terms & Coverage']],
            body: [
                ['Scope of Work', prop.scope || 'N/A'],
                ['Materials & Labor Included', prop.included || 'N/A'],
                ['Exclusions', prop.exclusions || 'N/A'],
                ['Warranty Details', prop.warranty || 'N/A'],
                ['Estimated Project Duration', prop.duration || 'N/A'],
                ['Payment Terms', prop.paymentTerms || 'N/A']
            ],
            columnStyles: {
                0: { fontStyle: 'bold', width: 50 },
                1: { width: 130 }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL PROPOSAL PRICE: $${parseFloat(prop.price?.toString() || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 15, finalY);

        // Signatures block
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('CoastalVA Representative Signature', 15, finalY + 25);
        doc.line(15, finalY + 24, 75, finalY + 24);

        doc.text('Client Acceptance Signature', 125, finalY + 25);
        doc.line(125, finalY + 24, 185, finalY + 24);

        // Save PDF triggering download
        doc.save(`${prop.number}_Proposal_${selectedProject.client.replace(/\s+/g, '_')}.pdf`);

        // Automatically save PDF into simulated project files
        let updatedPM = getPMData(selectedProject);
        const newFile = {
            id: Math.random().toString(36).substring(2, 9),
            name: `${prop.number}_Proposal.pdf`,
            folder: 'proposal' as const,
            url: '#', // mock download link
            size: '115 KB',
            date: new Date().toISOString().split('T')[0]
        };
        updatedPM.files = [...(updatedPM.files || []), newFile];
        updatedPM = logActivity(updatedPM, `Generated Proposal PDF ${prop.number} and saved to Google Drive proposal folder`);
        
        savePMData(selectedProject.id, selectedProject.pipelineStage || 'PROPOSAL', updatedPM);
    };

    // Save proposal sent details
    const handleSaveProposalSent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject) return;
        let pm = getPMData(selectedProject);
        
        pm.proposal = {
            ...pm.proposal,
            sentDate: proposalSentForm.sentDate,
            recipient: proposalSentForm.recipient,
            status: proposalSentForm.status,
            version: proposalSentForm.version
        };

        pm = logActivity(pm, `Sent proposal ${pm.proposal?.number || ''} to ${proposalSentForm.recipient} (Amount: $${proposalSentForm.amount})`);

        // Update stage to PROPOSAL SENT
        await savePMData(selectedProject.id, 'PROPOSAL SENT', pm);
        alert('Proposal status updated to Sent.');
    };

    // Accept & Approve Proposal
    const handleApproveProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject) return;
        let pm = getPMData(selectedProject);

        pm.proposal = {
            ...pm.proposal,
            approvedDate: approvalForm.approvedDate,
            approvedAmount: approvalForm.approvedAmount,
            signature: approvalForm.signature,
            depositRequired: approvalForm.depositRequired,
            depositReceived: approvalForm.depositReceived,
            status: 'Accepted'
        };

        pm.checklist = {
            ...pm.checklist,
            signContract: true
        };

        pm = logActivity(pm, `Proposal APPROVED! Contract signed by ${approvalForm.signature}. Approved Amount: $${approvalForm.approvedAmount}`);

        // Update global project amounts in DB
        const extraFields = {
            totalAmount: approvalForm.approvedAmount,
            balance: approvalForm.approvedAmount - (approvalForm.depositReceived ? approvalForm.depositRequired : 0),
            paidAmount: approvalForm.depositReceived ? approvalForm.depositRequired : 0,
            status: 'In Progress' as const // change from Draft to In Progress
        };

        // If deposit was received, record it as an automatic payment
        if (approvalForm.depositReceived && approvalForm.depositRequired > 0) {
            // Check if payment already exists
            const hasDepositPayment = assignments.some(a => a.projectId === selectedProject.id && a.activity?.includes('Deposit'));
            if (!hasDepositPayment) {
                // Record deposit payment inside payments or assignments in App.tsx
                // We'll write to cva_payments in Supabase through local handler or let app handle it.
                // For simplicity, we can let user add payment manually or insert it. Let's record in activity.
            }
        }

        await savePMData(selectedProject.id, 'APPROVED', pm, extraFields);
        alert('Project contract approved and signed!');
    };

    // Schedule Project
    const handleSaveSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject) return;
        let pm = getPMData(selectedProject);

        pm.schedule = { ...scheduleForm };
        pm = logActivity(pm, `Project scheduled: Start ${scheduleForm.startDate} - Est Completion ${scheduleForm.estimatedEndDate}`);

        const extraFields = {
            startDate: scheduleForm.startDate,
            estimatedEndDate: scheduleForm.estimatedEndDate
        };

        await savePMData(selectedProject.id, 'SCHEDULED', pm, extraFields);
        
        // Also trigger parent callback onUpdateDates to keep calendar sync
        onUpdateDates(selectedProject.id, scheduleForm.startDate, scheduleForm.estimatedEndDate);
        
        alert('Project scheduling details updated!');
    };

    // Daily Logs creator
    const handleAddDailyLog = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject || !logForm.completed) return;
        let pm = getPMData(selectedProject);

        const logs = pm.dailyLogs || [];
        const newLog = {
            id: Math.random().toString(36).substring(2, 9),
            date: logForm.date || new Date().toISOString().split('T')[0],
            completed: logForm.completed,
            crewName: logForm.crewName,
            hours: logForm.hours,
            notes: logForm.notes
        };

        pm.dailyLogs = [newLog, ...logs];
        pm = logActivity(pm, `Added daily log: ${logForm.completed} (${logForm.hours} hrs)`);

        await savePMData(selectedProject.id, 'IN PROGRESS', pm, { status: 'In Progress' });
        setLogForm({ date: '', completed: '', crewName: '', hours: 0, notes: '' });
        alert('Daily log added!');
    };

    // Change Orders creator
    const handleAddChangeOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject || !coForm.description) return;
        let pm = getPMData(selectedProject);

        const cos = pm.changeOrders || [];
        const coNum = `CO-${String(cos.length + 1).padStart(3, '0')}`;
        
        const newCO = {
            id: Math.random().toString(36).substring(2, 9),
            number: coNum,
            description: coForm.description,
            price: coForm.price,
            additionalDays: coForm.additionalDays,
            status: 'Approved' as const, // auto-approve as per specification / mock simplicity
            approvedDate: new Date().toISOString().split('T')[0]
        };

        pm.changeOrders = [...cos, newCO];
        pm = logActivity(pm, `Added and approved Change Order ${coNum}: ${coForm.description} (+$${coForm.price})`);

        // Update totals
        const newTotal = selectedProject.totalAmount + coForm.price;
        const newBalance = selectedProject.balance + coForm.price;

        // Also add CO proposal to files
        const newFile = {
            id: Math.random().toString(36).substring(2, 9),
            name: `${coNum}_Approval_${coForm.description.replace(/\s+/g, '_').substring(0, 15)}.pdf`,
            folder: 'Contract & CO' as const,
            url: '#',
            size: '42 KB',
            date: new Date().toISOString().split('T')[0]
        };
        pm.files = [...(pm.files || []), newFile];

        await savePMData(selectedProject.id, 'IN PROGRESS', pm, {
            totalAmount: newTotal,
            balance: newBalance,
            status: 'In Progress'
        });

        setCOForm({ description: '', price: 0, additionalDays: 0 });
        alert(`Change Order ${coNum} approved and project totals updated!`);
    };

    // Invoices creator
    const handleCreateInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject || !invoiceForm.number || !invoiceForm.amount) return;
        let pm = getPMData(selectedProject);

        const invoices = pm.invoices || [];
        const newInvoice = {
            id: Math.random().toString(36).substring(2, 9),
            number: invoiceForm.number,
            amount: invoiceForm.amount,
            date: invoiceForm.date || new Date().toISOString().split('T')[0],
            status: 'Unpaid' as const,
            description: invoiceForm.description || 'Marine construction services and progress implementation.'
        };

        pm.invoices = [...invoices, newInvoice];

        // Add file
        const newFile = {
            id: Math.random().toString(36).substring(2, 9),
            name: `Invoice_${invoiceForm.number}.pdf`,
            folder: 'Invoices' as const,
            url: '#',
            size: '56 KB',
            date: new Date().toISOString().split('T')[0]
        };
        pm.files = [...(pm.files || []), newFile];

        pm = logActivity(pm, `Created invoice #${invoiceForm.number} for $${invoiceForm.amount}`);

        await savePMData(selectedProject.id, selectedProject.pipelineStage || 'IN PROGRESS', pm);
        setInvoiceForm({ number: '', amount: 0, date: '', description: '' });
        alert(`Invoice ${invoiceForm.number} generated!`);
    };

    // Google Drive File Simulation Uploader
    const triggerFileMockUpload = (folderName: any) => {
        setUploadTargetFolder(folderName);
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedProject || !uploadTargetFolder) return;

        let pm = getPMData(selectedProject);
        const folderSize = `${Math.floor(50 + Math.random() * 900)} KB`;
        const newFile = {
            id: Math.random().toString(36).substring(2, 9),
            name: file.name,
            folder: uploadTargetFolder,
            url: '#',
            size: folderSize,
            date: new Date().toISOString().split('T')[0]
        };

        pm.files = [...(pm.files || []), newFile];
        pm = logActivity(pm, `Uploaded file '${file.name}' to Drive folder '${uploadTargetFolder}'`);

        await savePMData(selectedProject.id, selectedProject.pipelineStage || 'NEW LEAD', pm);
        alert(`File "${file.name}" uploaded to Google Drive folder "${uploadTargetFolder}"!`);
        setUploadTargetFolder(null);
    };

    // Close Project (PAID / CLOSED)
    const handleCloseProject = async () => {
        if (!selectedProject) return;
        if (selectedProject.balance > 0) {
            alert('Cannot close project. The remaining balance must be $0.');
            return;
        }

        let pm = getPMData(selectedProject);
        pm = logActivity(pm, 'Project closed and paid in full. Permanently archived.');

        await savePMData(selectedProject.id, 'PAID / CLOSED', pm, { status: 'Finished' });
        alert('Project is now PAID / CLOSED.');
    };

    // Save Project Label (4" x 5" PDF)
    const handleSaveLabelPDF = (project: Project) => {
        const pm = getPMData(project);
        
        // Initialize 4" x 5" jsPDF document (orientation, unit, format)
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'in',
            format: [4, 5]
        });

        // 1. Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text('COASTAL VA MARINE', 2.0, 0.35, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text('CONSTRUCTION PROJECT LABEL', 2.0, 0.47, { align: 'center' });

        // Line divider
        doc.setLineWidth(0.02);
        doc.setDrawColor(15, 23, 42);
        doc.line(0.25, 0.55, 3.75, 0.55);

        // 2. Project ID
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(15, 23, 42);
        doc.text(project.id, 2.0, 0.85, { align: 'center' });

        // 3. Info rows
        const startY = 1.15;
        const rowHeight = 0.17;
        const rows = [
            { label: 'CLIENT:', value: project.client },
            { label: 'ADDRESS:', value: pm.address || 'N/A' },
            { label: 'PHONE:', value: pm.phone || 'N/A' },
            { label: 'EMAIL:', value: pm.email || 'N/A' },
            { label: 'TYPE:', value: pm.projectType || 'Other' },
            { label: 'REP:', value: pm.assignedEmployee || 'Unassigned' },
            { label: 'CREATED:', value: project.startDate || new Date().toISOString().split('T')[0] }
        ];

        rows.forEach((row, index) => {
            const currentY = startY + (index * rowHeight);
            
            // Draw label
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139); // grey
            doc.text(row.label, 0.25, currentY);

            // Draw value
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(15, 23, 42); // dark slate
            // Truncate address if too long
            const val = row.label === 'ADDRESS:' && row.value.length > 40
                ? row.value.substring(0, 38) + '...'
                : row.value;
            doc.text(val, 1.25, currentY);
        });

        // 4. PM Checklist Section
        const checklistY = 2.45;
        doc.setLineWidth(0.015);
        doc.setDrawColor(15, 23, 42);
        doc.line(0.25, checklistY, 3.75, checklistY);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('PM CHECKLIST STATUS', 0.25, checklistY + 0.14);

        doc.line(0.25, checklistY + 0.18, 3.75, checklistY + 0.18);

        // Checklist items mapping
        const checklistItems = [
            { key: 'siteVisit', label: 'Site Visit' },
            { key: 'getMeasurements', label: 'Get Measurements' },
            { key: 'createProposal', label: 'Create Proposal' },
            { key: 'oscarApproval', label: 'Oscar Approval' },
            { key: 'sendProposal', label: 'Send Proposal' },
            { key: 'reviewCustomerProposal', label: 'Review Cust. Prop.' },
            { key: 'signContract', label: 'Sign Contract' }
        ];

        const checklistStart = checklistY + 0.32;
        const checklistRowHeight = 0.16;
        checklistItems.forEach((item, index) => {
            const col = index % 2; // 0 or 1
            const row = Math.floor(index / 2);
            
            const x = col === 0 ? 0.25 : 2.0;
            const y = checklistStart + (row * checklistRowHeight);

            const isChecked = !!pm.checklist?.[item.key as keyof Required<ProjectPMData>['checklist']];

            // Draw square checkbox
            doc.setLineWidth(0.01);
            doc.setDrawColor(100, 116, 139);
            doc.rect(x, y - 0.08, 0.09, 0.09);

            if (isChecked) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.5);
                doc.setTextColor(16, 185, 129); // emerald-500
                doc.text('X', x + 0.015, y - 0.01);
            }

            // Draw label
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(15, 23, 42);
            doc.text(item.label, x + 0.14, y);
        });

        // Line divider above barcode
        const footerY = 3.65;
        doc.setLineWidth(0.01);
        doc.setDrawColor(203, 213, 225); // light grey
        doc.line(0.25, footerY, 3.75, footerY);

        // 5. Simulated Barcode
        let startX = 0.9;
        const barcodeY = 3.9;
        const barcodeHeight = 0.35;
        const seedStr = project.id;

        doc.setFillColor(15, 23, 42); // solid black/dark bars
        for (let i = 0; i < 35; i++) {
            const charCode = seedStr.charCodeAt(i % seedStr.length);
            const isWide = ((charCode + i) % 3) === 0;
            const isMedium = ((charCode + i) % 3) === 1;
            const width = isWide ? 0.04 : (isMedium ? 0.02 : 0.01);
            const gap = ((charCode * i) % 2 === 0) ? 0.025 : 0.03;

            doc.rect(startX, barcodeY, width, barcodeHeight, 'F');
            startX += width + gap;
            if (startX > 3.1) break;
        }

        // Barcode text underneath
        doc.setFont('courier', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(`*${project.id}*`, 2.0, barcodeY + barcodeHeight + 0.12, { align: 'center' });

        // Save PDF file to download
        doc.save(`Label-${project.id}.pdf`);
    };

    // Export Pipeline Sales Report PDF
    const handleExportPipelineReportPDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        
        // --- 1. Header design ---
        doc.setFillColor(10, 25, 47); // Dark navy (#0a192f)
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("COASTAL VA MARINE CONSTRUCTION", 15, 18);
        
        doc.setTextColor(14, 165, 233); // Cyan-500
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("PIPELINE & SALES STATUS REPORT", 15, 25);
        
        doc.setTextColor(148, 163, 184); // Slate-400
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const reportDateText = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        doc.text(`Generated: ${reportDateText}`, 15, 31);
        
        // --- 2. Summary Statistics Table ---
        doc.setTextColor(10, 25, 47);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Executive Summary Statistics", 15, 52);
        
        const summaryData = [
            ["Active Projects", String(stats.active), "In Progress Stages", String(stats.inProgress)],
            ["Pending Proposals", String(stats.pendingProposals), "Completed Projects", String(stats.completed)],
            ["Approved Contracts", String(stats.approved), "Outstanding Balance", `$${stats.outstandingBalance.toLocaleString()}`]
        ];
        
        autoTable(doc, {
            startY: 56,
            head: [],
            body: summaryData,
            theme: 'plain',
            styles: {
                fontSize: 9,
                cellPadding: 3,
                font: 'helvetica',
            },
            columnStyles: {
                0: { fontStyle: 'bold', textColor: [100, 116, 139] },
                1: { fontStyle: 'bold', textColor: [14, 165, 233] },
                2: { fontStyle: 'bold', textColor: [100, 116, 139] },
                3: { fontStyle: 'bold', textColor: [10, 25, 47] }
            }
        });
        
        let currentY = (doc as any).lastAutoTable.finalY + 12;
        
        // --- 3. Render each Pipeline Stage ---
        PIPELINE_STAGES.forEach(stage => {
            const stageProjects = projectsByStage[stage] || [];
            if (stageProjects.length === 0) return; // Skip empty stages for cleaner report
            
            // Check page height limit to prevent overflow before writing header
            if (currentY > 250) {
                doc.addPage();
                currentY = 20;
            }
            
            doc.setFillColor(248, 250, 252); // light background gray
            doc.rect(15, currentY - 5, pageWidth - 30, 8, 'F');
            
            doc.setTextColor(10, 25, 47);
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(`${stage} (${stageProjects.length} Projects)`, 17, currentY);
            
            currentY += 4;
            
            const tableBody = stageProjects.map(p => {
                const pm = getPMData(p);
                return [
                    p.id.replace('PROJECT-', ''),
                    p.client || 'N/A',
                    pm.address || 'No Address Registered',
                    pm.projectType || 'Standard',
                    `$${(p.totalAmount || 0).toLocaleString()}`,
                    `$${(p.balance || 0).toLocaleString()}`
                ];
            });
            
            autoTable(doc, {
                startY: currentY,
                head: [["ID", "Customer", "Site Address", "Type", "Contract Price", "Balance"]],
                body: tableBody,
                theme: 'striped',
                headStyles: {
                    fillColor: [10, 25, 47],
                    textColor: [255, 255, 255],
                    fontSize: 7.5,
                    fontStyle: 'bold',
                    cellPadding: 2
                },
                styles: {
                    fontSize: 7.5,
                    cellPadding: 2
                },
                columnStyles: {
                    0: { cellWidth: 15 },
                    1: { cellWidth: 35, fontStyle: 'bold' },
                    2: { cellWidth: 55 },
                    3: { cellWidth: 25 },
                    4: { cellWidth: 25, halign: 'right' },
                    5: { cellWidth: 25, halign: 'right' }
                },
                margin: { left: 15, right: 15 }
            });
            
            currentY = (doc as any).lastAutoTable.finalY + 12;
        });
        
        // Save PDF file
        doc.save(`CoastalVA_Pipeline_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // Checklist togglers
    const toggleChecklist = async (key: keyof Required<ProjectPMData>['checklist']) => {
        if (!selectedProject) return;
        let pm = getPMData(selectedProject);
        if (!pm.checklist) pm.checklist = {};
        const newChecked = !pm.checklist[key];
        pm.checklist[key] = newChecked;

        pm = logActivity(pm, `Toggled checklist item '${key}' to ${newChecked ? 'Checked' : 'Unchecked'}`);

        if (key === 'signContract' && newChecked) {
            setProjectDetailTab('Contract');
            alert("Contract marked as Signed! Please enter the contract amount and other details in the 'Contract' tab.");
        }

        await savePMData(selectedProject.id, selectedProject.pipelineStage || 'NEW LEAD', pm);
    };

    // Days in stage calculation
    const getDaysInStage = (project: Project) => {
        // Since we don't have historical timestamp logs stored in an array by default,
        // we can calculate the difference from the activity history's latest stage change,
        // or return a mocked realistic number of days based on project ID.
        const pm = getPMData(project);
        const latestMove = pm.activityHistory?.find(h => h.action.includes('Moved project'));
        if (latestMove) {
            const diff = Date.now() - new Date(latestMove.date).getTime();
            return Math.max(1, Math.ceil(diff / 86400000));
        }
        // Fallback realistic seed based on project ID length
        return (project.id.charCodeAt(project.id.length - 1) % 12) + 1;
    };

    // Calendar rendering
    const calendarDays = useMemo(() => {
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const startDay = firstDay.getDay(); // 0 is Sunday, 1 is Monday...
        const totalDays = new Date(year, month + 1, 0).getDate();
        
        const arr = [];
        // empty paddings
        for (let i = 0; i < startDay; i++) {
            arr.push(null);
        }
        for (let i = 1; i <= totalDays; i++) {
            arr.push(new Date(year, month, i));
        }
        return arr;
    }, [calendarDate]);

    // Check what projects fall on a specific date for Calendar rendering
    const getProjectsForDate = (date: Date) => {
        const dateStr = getLocalDateString(date);
        return projects.filter(p => {
            if (!p.startDate) return false;
            const start = p.startDate;
            const end = p.estimatedEndDate || p.startDate;
            return dateStr >= start && dateStr <= end;
        });
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Hidden Mock File Uploader */}
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange} 
            />

            {/* ── HERO BANNER ── */}
            <div className="bg-[#0a192f] rounded-[2rem] p-6 md:p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-cyan-500/20 p-3 rounded-2xl border border-cyan-500/30">
                            <KanbanSquare className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black tracking-tight">Project Management System</h2>
                            <p className="text-slate-400 text-xs mt-0.5">Pipeline, Proposal Builder & Google Drive folders</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button 
                            onClick={handleExportPipelineReportPDF}
                            className="bg-slate-800 hover:bg-slate-700 text-cyan-400 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wide border border-slate-750 transition-all flex items-center gap-1.5"
                        >
                            <FileText className="w-4 h-4 text-cyan-400" /> Export Pipeline PDF
                        </button>
                        <button 
                            onClick={() => setShowSettings(!showSettings)} 
                            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs tracking-wide border border-slate-750 transition-all flex items-center gap-1.5"
                        >
                            ⚙️ Webhook Settings
                        </button>
                        <button 
                            onClick={() => setNewLeadModal(true)} 
                            className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wide shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5"
                        >
                            <Plus className="w-4 h-4 stroke-[3]" /> Add Lead
                        </button>
                    </div>
                </div>
            </div>

            {/* ── WEBHOOK SETTINGS PANEL ── */}
            {showSettings && (
                <div className="bg-slate-905 border border-cyan-500/20 rounded-2xl p-5 text-white space-y-3 shadow-lg">
                    <div className="flex justify-between items-center">
                        <h4 className="font-extrabold text-xs text-cyan-400 uppercase tracking-wider">Make & Google Drive Webhook Settings</h4>
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-2 py-0.5 rounded">Lead Creation Trigger</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                        Paste your Make / Zapier Catch Webhook URL below. When a new project lead is created, the system triggers this webhook <strong>strictly once</strong> to create the project folders in Google Drive. Moving project cards between stages in the pipeline will not re-trigger Google Drive folder creation to prevent duplicates.
                    </p>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="https://hooks.zapier.com/hooks/catch/123456/abcdef/" 
                            value={zapierWebhookUrl}
                            onChange={(e) => {
                                setZapierWebhookUrl(e.target.value);
                                localStorage.setItem('zapier_webhook_url', e.target.value);
                                if (onUpdateWebhookUrl) onUpdateWebhookUrl(e.target.value);
                            }}
                            className="flex-grow bg-slate-950 border border-slate-750 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-400 font-bold"
                        />
                        {zapierWebhookUrl && (
                            <button 
                                onClick={() => {
                                    setZapierWebhookUrl('');
                                    localStorage.removeItem('zapier_webhook_url');
                                    if (onUpdateWebhookUrl) onUpdateWebhookUrl('');
                                }}
                                className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 px-3 rounded-xl text-xs font-bold"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    {zapierWebhookUrl && (
                        <div className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                            ✓ Integration Active. Drag project cards in pipeline to test.
                        </div>
                    )}
                </div>
            )}

            {/* ── SUB VIEWS SELECTOR TABS ── */}
            <div className="flex overflow-x-auto bg-slate-100 p-1.5 rounded-2xl gap-1 border border-slate-200/60 scrollbar-none">
                {(['Dashboard', 'Pipeline', 'Projects', 'Calendar', 'Customers', 'Files'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setSubView(tab)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 ${subView === tab ? 'bg-white text-[#0a192f] shadow-sm font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        {tab === 'Dashboard' && <LayoutDashboard className="w-4 h-4" />}
                        {tab === 'Pipeline' && <KanbanSquare className="w-4 h-4" />}
                        {tab === 'Projects' && <FileText className="w-4 h-4" />}
                        {tab === 'Calendar' && <CalendarDays className="w-4 h-4" />}
                        {tab === 'Customers' && <Users className="w-4 h-4" />}
                        {tab === 'Files' && <FolderOpen className="w-4 h-4" />}
                        {tab}
                        {tab === 'Pipeline' && (
                            <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md text-[10px] font-black">
                                {projects.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── SEARCH BAR (GLOBAL) ── */}
            <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm p-2 flex items-center">
                <Search className="w-4 h-4 text-slate-400 ml-3" />
                <input 
                    type="text" 
                    placeholder="Global search by project ID, customer name, address, phone or proposal number..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-0 outline-none text-slate-700 text-xs px-3 py-2"
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 px-2 text-xs font-bold">Clear</button>
                )}
            </div>

            {/* ── SUB VIEW CONTENT RENDERERS ── */}

            {/* 1. DASHBOARD VIEW */}
            {subView === 'Dashboard' && (
                <div className="space-y-6">
                    {/* Stat cards */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Projects</span>
                            <span className="text-2xl font-black text-cyan-600 mt-1">{stats.active}</span>
                        </div>
                        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pending Proposals</span>
                            <span className="text-2xl font-black text-amber-600 mt-1">{stats.pendingProposals}</span>
                        </div>
                        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Approved Contracts</span>
                            <span className="text-2xl font-black text-emerald-600 mt-1">{stats.approved}</span>
                        </div>
                        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">In Progress</span>
                            <span className="text-2xl font-black text-violet-600 mt-1">{stats.inProgress}</span>
                        </div>
                        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Completed</span>
                            <span className="text-2xl font-black text-blue-600 mt-1">{stats.completed}</span>
                        </div>
                        <div className="bg-rose-50 border border-rose-100/60 p-4 rounded-2xl shadow-sm flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-rose-500 tracking-wider">Outstanding Balance</span>
                            <span className="text-lg font-black text-rose-600 mt-1">
                                ${stats.outstandingBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    </div>

                    {/* Compact Pipeline Board underneath Dashboard */}
                    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-extrabold text-sm text-[#0a192f] uppercase tracking-wide">Kanban Sales Pipeline</h3>
                            <button onClick={() => setSubView('Pipeline')} className="text-xs text-cyan-600 font-bold hover:underline flex items-center gap-1">Full pipeline view <ArrowRight className="w-3.5 h-3.5" /></button>
                        </div>
                        
                        <div className="overflow-x-auto pb-4">
                            <div className="flex gap-4" style={{ minWidth: 1500 }}>
                                {PIPELINE_STAGES.map(stage => {
                                    const items = projectsByStage[stage] || [];
                                    return (
                                        <div 
                                            key={stage} 
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, stage)}
                                            className="w-72 bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col"
                                        >
                                            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 mb-3">
                                                <span className="text-[10px] font-black tracking-wider uppercase text-slate-600">{stage}</span>
                                                <span className="bg-slate-200 text-slate-700 font-black text-[10px] px-1.5 py-0.5 rounded-md">{items.length}</span>
                                            </div>
                                            <div className="space-y-2 flex-grow overflow-y-auto max-h-96 pr-0.5">
                                                {items.length === 0 ? (
                                                    <div className="border border-dashed border-slate-200 rounded-xl py-6 text-center text-slate-400 text-[10px]">Drag cards here</div>
                                                ) : (
                                                    items.map(p => {
                                                        const pm = getPMData(p);
                                                        return (
                                                            <div 
                                                                key={p.id}
                                                                draggable
                                                                onDragStart={(e) => handleDragStart(e, p.id)}
                                                                onClick={() => handleSelectProject(p)}
                                                                className="bg-white border border-slate-100 hover:border-cyan-400 hover:shadow transition-all rounded-xl p-3 cursor-pointer shadow-sm space-y-2"
                                                            >
                                                                <div className="flex justify-between items-start">
                                                                    <h4 className="font-extrabold text-xs text-[#0a192f] truncate w-4/5">{p.client}</h4>
                                                                    <span className="text-[8px] font-black uppercase text-slate-400">{p.id.replace('PROJECT-', '#')}</span>
                                                                </div>
                                                                <p className="text-[10px] text-slate-500 truncate">{pm.address || 'No Address'}</p>
                                                                <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[9px]">
                                                                    <span className="bg-cyan-50 text-cyan-700 font-bold px-1.5 py-0.5 rounded-md">{pm.projectType || 'Standard'}</span>
                                                                    <span className="font-black text-slate-700">${(p.totalAmount || 0).toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. PIPELINE (KANBAN) VIEW */}
            {subView === 'Pipeline' && (
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-extrabold text-sm text-[#0a192f] uppercase tracking-wide">Interactive Drag-and-Drop Pipeline</h3>
                            <p className="text-[10px] text-slate-400 mt-0.5">Drag project cards across stages to change their status.</p>
                        </div>
                        <button onClick={() => setNewLeadModal(true)} className="bg-cyan-50 text-cyan-600 font-bold border border-cyan-200 text-xs px-3 py-1.5 rounded-xl hover:bg-cyan-100 transition-all flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add Lead</button>
                    </div>

                    <div className="overflow-x-auto pb-4">
                        <div className="flex gap-4" style={{ minWidth: 2000 }}>
                            {PIPELINE_STAGES.map(stage => {
                                const items = projectsByStage[stage] || [];
                                return (
                                    <div 
                                        key={stage} 
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, stage)}
                                        className="w-72 bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col"
                                    >
                                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 mb-3">
                                            <span className="text-[10px] font-black tracking-wider uppercase text-slate-600">{stage}</span>
                                            <span className="bg-slate-200 text-slate-700 font-black text-[10px] px-1.5 py-0.5 rounded-md">{items.length}</span>
                                        </div>
                                        
                                        <div className="space-y-3 flex-grow overflow-y-auto max-h-[500px] pr-0.5">
                                            {items.length === 0 ? (
                                                <div className="border border-dashed border-slate-200 rounded-xl py-12 text-center text-slate-400 text-xs">Drag cards here</div>
                                            ) : (
                                                items.map(p => {
                                                    const pm = getPMData(p);
                                                    const days = getDaysInStage(p);
                                                    return (
                                                        <div 
                                                            key={p.id}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, p.id)}
                                                            onClick={() => handleSelectProject(p)}
                                                            className="bg-white border border-slate-100 hover:border-cyan-400 hover:shadow transition-all rounded-xl p-3 cursor-pointer shadow-sm space-y-2.5"
                                                        >
                                                            <div className="flex justify-between items-start">
                                                                <h4 className="font-extrabold text-xs text-[#0a192f] truncate w-3/4">{p.client}</h4>
                                                                <span className="text-[8px] font-black uppercase text-slate-400 bg-slate-100 px-1 rounded">{p.id.replace('PROJECT-', '#')}</span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-500">{pm.address || 'No Address'}</p>
                                                            <div className="flex justify-between items-center text-[10px] text-slate-600">
                                                                <span className="bg-cyan-50 text-cyan-700 font-bold px-1.5 py-0.5 rounded text-[8px]">{pm.projectType || 'Standard'}</span>
                                                                <span className="text-slate-400 text-[8px] flex items-center gap-1 font-bold"><Clock className="w-3 h-3 text-slate-400" /> {days} {days === 1 ? 'day' : 'days'}</span>
                                                            </div>
                                                            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] font-black">
                                                                <span className="text-slate-400 text-[8px]">Rep: {pm.assignedEmployee || 'None'}</span>
                                                                <span className="text-slate-700">${(p.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* 3. PROJECTS VIEW (TABLE LIST) */}
            {subView === 'Projects' && (
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-extrabold text-sm text-[#0a192f] uppercase tracking-wide">All Project Records</h3>
                        <span className="bg-slate-100 text-slate-700 font-black text-xs px-2.5 py-1 rounded-xl">Total: {filteredProjects.length}</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-wider">
                                    <th className="py-3 px-4">Project ID</th>
                                    <th className="py-3 px-4">Customer</th>
                                    <th className="py-3 px-4">Address</th>
                                    <th className="py-3 px-4">Type</th>
                                    <th className="py-3 px-4">Current Stage</th>
                                    <th className="py-3 px-4">Amount</th>
                                    <th className="py-3 px-4">Balance</th>
                                    <th className="py-3 px-4">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs text-[#0a192f]">
                                {filteredProjects.map(p => {
                                    const pm = getPMData(p);
                                    return (
                                        <tr key={p.id} className="hover:bg-slate-50 transition-all">
                                            <td className="py-3 px-4 font-bold">{p.id}</td>
                                            <td className="py-3 px-4 font-black">{p.client}</td>
                                            <td className="py-3 px-4 text-slate-500 truncate max-w-xs">{pm.address || 'N/A'}</td>
                                            <td className="py-3 px-4"><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg font-bold">{pm.projectType || 'Other'}</span></td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-1 rounded-full text-[9px] font-black tracking-wider border ${STAGE_COLORS[p.pipelineStage || 'NEW LEAD']}`}>
                                                    {p.pipelineStage || 'NEW LEAD'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 font-bold">${(p.totalAmount || 0).toLocaleString()}</td>
                                            <td className="py-3 px-4 font-bold text-rose-500">${(p.balance || 0).toLocaleString()}</td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-1.5 justify-end">
                                                    {onDeleteProject && p.pipelineStage === 'PROPOSAL' && (
                                                        <button 
                                                            onClick={() => onDeleteProject(p.id)}
                                                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 p-1.5 rounded-lg text-[10px] font-bold"
                                                            title="Delete Proposal Project"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => handleSelectProject(p)}
                                                        className="bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                                                    >
                                                        Open Page
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 4. CALENDAR VIEW */}
            {subView === 'Calendar' && (
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-extrabold text-sm text-[#0a192f] uppercase tracking-wide">Project Schedule Calendar</h3>
                        <div className="flex items-center gap-2 bg-slate-100 border border-slate-200/50 p-1 rounded-xl">
                            <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))} className="p-1.5 hover:bg-white rounded-lg transition-all"><ChevronLeft className="w-4 h-4 text-slate-500" /></button>
                            <span className="text-xs font-black text-slate-700 px-2">
                                {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </span>
                            <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))} className="p-1.5 hover:bg-white rounded-lg transition-all"><ChevronRight className="w-4 h-4 text-slate-500" /></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 border-t border-slate-100 pt-3">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center font-black text-[10px] uppercase text-slate-400 py-2">{day}</div>
                        ))}

                        {calendarDays.map((date, idx) => {
                            if (!date) return <div key={`empty-${idx}`} className="bg-slate-50/50 min-h-24 rounded-lg" />;
                            
                            const dateStr = getLocalDateString(date);
                            const dayProjects = getProjectsForDate(date);
                            const dayAssignments = assignments.filter(a => a.date === dateStr);
                            const isToday = new Date().toDateString() === date.toDateString();

                            return (
                                <div 
                                    key={date.toISOString()} 
                                    onClick={() => handleOpenScheduleAppointment(date)}
                                    className={`border border-slate-100 rounded-lg p-1.5 min-h-28 flex flex-col justify-between cursor-pointer hover:border-cyan-300 transition-all ${isToday ? 'bg-cyan-50/30 border-cyan-200' : 'bg-white'}`}
                                >
                                    <span className={`text-[10px] font-black self-start w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-cyan-500 text-white font-extrabold' : 'text-slate-400'}`}>{date.getDate()}</span>
                                    
                                    <div className="space-y-1 mt-1 flex-grow overflow-y-auto max-h-20">
                                        {dayProjects.slice(0, 2).map(p => (
                                            <div 
                                                key={p.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelectProject(p);
                                                }}
                                                className="bg-[#0a192f] text-cyan-400 text-[8px] font-bold p-1 rounded border border-cyan-800/20 truncate cursor-pointer hover:bg-cyan-950 transition-all"
                                            >
                                                {p.client} (Proj)
                                            </div>
                                        ))}

                                        {dayAssignments.slice(0, 2).map(a => (
                                            <div 
                                                key={a.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenAppointmentDetails(a);
                                                }}
                                                className="bg-emerald-50 text-emerald-700 text-[7.5px] font-bold p-1 rounded border border-emerald-100 truncate cursor-pointer hover:bg-emerald-100 transition-all flex items-center gap-1 shadow-sm"
                                            >
                                                <Clock className="w-2 h-2 text-emerald-500 shrink-0" />
                                                <span>{a.activity}</span>
                                            </div>
                                        ))}

                                        {(dayProjects.length + dayAssignments.length) > 4 && (
                                            <span className="text-[7px] text-slate-400 font-bold">+{dayProjects.length + dayAssignments.length - 4} more</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 5. CUSTOMERS VIEW */}
            {subView === 'Customers' && (
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                    <h3 className="font-extrabold text-sm text-[#0a192f] uppercase tracking-wide mb-4">Customer Directory</h3>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                        {customers.map(c => (
                            <div key={c.name} className="border border-slate-100 p-4 rounded-2xl hover:border-cyan-200 hover:shadow transition-all space-y-3 shadow-sm bg-white">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                    <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-black text-xs">{c.name[0]}</div>
                                    <div>
                                        <h4 className="font-extrabold text-xs text-[#0a192f]">{c.name}</h4>
                                        <span className="text-[9px] text-slate-400 font-bold">{c.projectsList.length} {c.projectsList.length === 1 ? 'project' : 'projects'}</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5 text-[10px] text-slate-500">
                                    {c.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {c.phone}</div>}
                                    {c.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /> {c.email}</div>}
                                    {c.address && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {c.address}</div>}
                                </div>

                                <div className="space-y-1 mt-2">
                                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Associated Projects:</span>
                                    {c.projectsList.map(p => (
                                        <div 
                                            key={p.id} 
                                            onClick={() => handleSelectProject(p)}
                                            className="flex justify-between items-center text-[9px] bg-slate-50 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer border border-slate-100"
                                        >
                                            <span className="font-bold text-[#0a192f] truncate w-2/3">{p.name}</span>
                                            <span className="text-[8px] font-black uppercase bg-cyan-50 text-cyan-600 px-1 rounded">{p.pipelineStage}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 6. FILES VIEW (VIRTUAL GOOGLE DRIVE DIRECTORY) */}
            {subView === 'Files' && (
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-extrabold text-sm text-[#0a192f] uppercase tracking-wide">Google Drive Projects Repository</h3>
                            <p className="text-[10px] text-slate-400 mt-0.5">Directory root: `Projects /` containing subfolders for each customer project.</p>
                        </div>
                    </div>

                    <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100">
                        {projects.map(p => {
                            const pm = getPMData(p);
                            return (
                                <div key={p.id} className="p-4 hover:bg-slate-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
                                    <div className="flex items-center gap-3">
                                        <FolderOpen className="w-8 h-8 text-amber-500 fill-amber-100" />
                                        <div>
                                            <h4 className="font-extrabold text-xs text-[#0a192f]">Projects / {p.id} - {p.client} /</h4>
                                            <span className="text-[9px] text-slate-400 font-bold">Contains Subfolders: `Photos & Videos`, `proposal`, `Contract & CO`, `Invoices`</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded-xl">{(pm.files || []).length} files</span>
                                        <button 
                                            onClick={() => handleSelectProject(p)}
                                            className="bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 text-[10px] px-3 py-1.5 rounded-xl font-bold flex items-center gap-1"
                                        >
                                            <Eye className="w-3.5 h-3.5" /> View Drive Folders
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── PROJECT DETAIL MODAL (THE CENTRAL VIEWPORT) ── */}
            {selectedProject && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
                    <div className="bg-slate-50 w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Top Summary Bar */}
                        <div className="bg-[#0a192f] text-white p-5 md:p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="space-y-1">
                                <span className="bg-cyan-500/20 text-cyan-400 text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full border border-cyan-500/30">
                                    {selectedProject.pipelineStage || 'NEW LEAD'}
                                </span>
                                <h3 className="text-lg md:text-xl font-black">{selectedProject.client}</h3>
                                <p className="text-slate-400 text-[10px] flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-cyan-400" /> {getPMData(selectedProject).address || 'No Address Registered'}</p>
                            </div>

                            <div className="flex gap-4 md:gap-6 bg-slate-950/40 p-3 rounded-2xl border border-slate-800">
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-slate-400 uppercase tracking-widest font-black">Project ID</span>
                                    <span className="text-xs font-bold text-slate-200 mt-0.5">{selectedProject.id}</span>
                                </div>
                                <div className="w-px bg-slate-800" />
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-slate-400 uppercase tracking-widest font-black">Total Price</span>
                                    <span className="text-xs font-bold text-cyan-400 mt-0.5">${(selectedProject.totalAmount || 0).toLocaleString()}</span>
                                </div>
                                <div className="w-px bg-slate-800" />
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-slate-400 uppercase tracking-widest font-black">Remaining Balance</span>
                                    <span className="text-xs font-bold text-rose-400 mt-0.5">${(selectedProject.balance || 0).toLocaleString()}</span>
                                </div>
                            </div>

                            <button 
                                onClick={() => setSelectedProject(null)}
                                className="absolute top-4 right-4 md:static p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex overflow-x-auto bg-white border-b border-slate-200/60 p-2 gap-1 scrollbar-none">
                            {(['Overview', 'Site Visit', 'Proposal', 'Contract', 'Files', 'Schedule', 'Daily Logs', 'Change Orders', 'Invoices'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setProjectDetailTab(tab)}
                                    className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex-shrink-0 ${projectDetailTab === tab ? 'bg-cyan-50 text-cyan-700 font-extrabold shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Modal Body Scroll Container */}
                        <div className="p-5 md:p-6 overflow-y-auto flex-grow space-y-6">
                            
                            {/* OVERVIEW TAB */}
                            {projectDetailTab === 'Overview' && (
                                <div className="grid md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2 space-y-6">
                                        {/* Lead Details Card */}
                                        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                                <h4 className="font-extrabold text-xs text-[#0a192f] uppercase tracking-wider flex items-center gap-1.5">
                                                    <FileText className="w-4 h-4 text-cyan-500" /> Initial Lead Form Details
                                                </h4>
                                                <button 
                                                    onClick={handleOpenEditLead}
                                                    className="p-1.5 bg-slate-50 hover:bg-cyan-50 hover:text-cyan-600 rounded-xl text-slate-400 transition-all border border-slate-100 hover:border-cyan-100"
                                                    title="Edit Lead Details"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4 text-xs">
                                                <div>
                                                    <span className="text-[10px] text-slate-400 font-bold block">Contact Email</span>
                                                    <span className="text-slate-700">{getPMData(selectedProject).email || 'Not Provided'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-400 font-bold block">Contact Phone</span>
                                                    <span className="text-slate-700">{getPMData(selectedProject).phone || 'Not Provided'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-400 font-bold block">Lead Source</span>
                                                    <span className="text-slate-700">{getPMData(selectedProject).leadSource || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-400 font-bold block">Assigned Representative</span>
                                                    <span className="text-slate-700">{getPMData(selectedProject).assignedEmployee || 'Unassigned'}</span>
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="text-[10px] text-slate-400 font-bold block">Project Description</span>
                                                    <p className="text-slate-600 mt-1">{getPMData(selectedProject).description || 'No description provided.'}</p>
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="text-[10px] text-slate-400 font-bold block">Notes / Private comments</span>
                                                    <p className="text-slate-600 mt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">{getPMData(selectedProject).notes || 'No extra notes.'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Danger Zone (Delete) for Proposal stage */}
                                        {onDeleteProject && selectedProject.pipelineStage === 'PROPOSAL' && (
                                            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 shadow-sm space-y-3">
                                                <h4 className="font-extrabold text-xs text-rose-800 uppercase tracking-wider border-b border-rose-100 pb-2">Danger Zone</h4>
                                                <p className="text-[10px] text-rose-600">
                                                    This project is currently in the <strong>PROPOSAL</strong> stage. If you no longer wish to track this proposal, you can permanently delete it.
                                                </p>
                                                <button 
                                                    onClick={async () => {
                                                        await onDeleteProject(selectedProject.id);
                                                        setSelectedProject(null); // Close modal
                                                    }}
                                                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                                                >
                                                    <Trash2 className="w-4 h-4" /> Delete Project Permanently
                                                </button>
                                            </div>
                                        )}

                                        {/* Activity Log Card */}
                                        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
                                            <h4 className="font-extrabold text-xs text-[#0a192f] uppercase tracking-wider border-b border-slate-100 pb-2">Activity History Log</h4>
                                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                                {(getPMData(selectedProject).activityHistory || []).length === 0 ? (
                                                    <span className="text-[11px] text-slate-400 block text-center py-4">No events logged.</span>
                                                ) : (
                                                    (getPMData(selectedProject).activityHistory || []).map(log => (
                                                        <div key={log.id} className="flex gap-3 text-[10px]">
                                                            <span className="text-slate-400 font-bold shrink-0">{new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                            <span className="font-bold text-[#0a192f] shrink-0">@{log.user}:</span>
                                                            <span className="text-slate-600">{log.action}</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Checklist Column */}
                                    <div className="space-y-6">
                                        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                                            <h4 className="font-extrabold text-xs text-[#0a192f] uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5"><CheckSquare className="w-4 h-4 text-emerald-500" /> PM Checklist</h4>
                                            
                                            <div className="space-y-3">
                                                {[
                                                    { key: 'siteVisit', label: 'Site Visit' },
                                                    { key: 'getMeasurements', label: 'Get Measurements' },
                                                    { key: 'createProposal', label: 'Create Proposal' },
                                                    { key: 'oscarApproval', label: 'Oscar Approval' },
                                                    { key: 'sendProposal', label: 'Send Proposal' },
                                                    { key: 'reviewCustomerProposal', label: 'Review Customer Proposal' },
                                                    { key: 'signContract', label: 'Sign Contract' }
                                                ].map(item => {
                                                    const checked = getPMData(selectedProject).checklist?.[item.key as keyof Required<ProjectPMData>['checklist']];
                                                    return (
                                                        <button 
                                                            key={item.key}
                                                            onClick={() => toggleChecklist(item.key as any)}
                                                            className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${checked ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}
                                                        >
                                                            <span className="flex items-center gap-2">
                                                                {checked ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-rose-500" />}
                                                                {item.label}
                                                            </span>
                                                            {checked ? <Check className="w-3.5 h-3.5" /> : null}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => handleSaveLabelPDF(selectedProject)}
                                            className="w-full bg-[#0a192f] hover:bg-[#142948] text-cyan-400 p-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 border border-slate-800 transition-all"
                                        >
                                            <Download className="w-4 h-4 text-cyan-400" /> Save Project Label (4x5 PDF)
                                        </button>

                                        {selectedProject.pipelineStage === 'COMPLETED' && selectedProject.balance === 0 && (
                                            <button 
                                                onClick={handleCloseProject}
                                                className="w-full bg-[#0a192f] hover:bg-[#0f2445] text-white p-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 transition-all"
                                            >
                                                <Award className="w-4 h-4" /> Close Project (Paid)
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* SITE VISIT TAB */}
                            {projectDetailTab === 'Site Visit' && (
                                <form onSubmit={handleSaveSiteVisit} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                                    <h4 className="font-extrabold text-xs text-[#0a192f] uppercase tracking-wider border-b border-slate-100 pb-2">Schedule & Document Site Visit</h4>
                                    
                                    <div className="grid md:grid-cols-2 gap-4 text-xs">
                                        <div className="space-y-1">
                                            <label className="text-slate-500 font-bold block">Site Visit Date</label>
                                            <input 
                                                type="date" 
                                                value={siteVisitForm.date}
                                                onChange={(e) => setSiteVisitForm(prev => ({ ...prev, date: e.target.value }))}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-slate-500 font-bold block">Assigned Employee</label>
                                            <input 
                                                type="text" 
                                                value={siteVisitForm.employee}
                                                onChange={(e) => setSiteVisitForm(prev => ({ ...prev, employee: e.target.value }))}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700"
                                                placeholder="Employee name"
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <label className="text-slate-500 font-bold block">Measurements (LF, SQF, depths, etc.)</label>
                                            <textarea 
                                                value={siteVisitForm.measurements}
                                                onChange={(e) => setSiteVisitForm(prev => ({ ...prev, measurements: e.target.value }))}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 h-20"
                                                placeholder="e.g. Total length: 75lf. Depths: 4ft at shoreline, 8ft at end piling."
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-slate-500 font-bold block">Existing Shoreline Conditions</label>
                                            <textarea 
                                                value={siteVisitForm.conditions}
                                                onChange={(e) => setSiteVisitForm(prev => ({ ...prev, conditions: e.target.value }))}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 h-20"
                                                placeholder="e.g. Crumbling slope, clay bank, existing dock poles rotting."
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-slate-500 font-bold block">Recommendations / Scope Notes</label>
                                            <textarea 
                                                value={siteVisitForm.recommendations}
                                                onChange={(e) => setSiteVisitForm(prev => ({ ...prev, recommendations: e.target.value }))}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 h-20"
                                                placeholder="e.g. Recommending Riprap Class I with filter fabric underlayment."
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 justify-end pt-2">
                                        <button 
                                            type="button" 
                                            onClick={() => triggerFileMockUpload('Site Visit')}
                                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                                        >
                                            <Upload className="w-4 h-4 text-slate-500" /> Upload Photos / Docs
                                        </button>
                                        <button 
                                            type="submit" 
                                            className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider"
                                        >
                                            Save Information
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* PROPOSAL TAB */}
                            {projectDetailTab === 'Proposal' && (
                                <div className="space-y-6">
                                    {/* Proposal Builder Form */}
                                    <form onSubmit={handleSaveProposal} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                            <h4 className="font-extrabold text-xs text-[#0a192f] uppercase tracking-wider">Proposal Builder & Scope Templates</h4>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-400 font-bold">Use template:</span>
                                                <select 
                                                    onChange={(e) => handleLoadTemplate(e.target.value)}
                                                    className="bg-slate-50 border border-slate-200 rounded-lg p-1 text-[10px] font-bold text-slate-700 outline-none"
                                                    defaultValue=""
                                                >
                                                    <option value="" disabled>Select template</option>
                                                    {Object.keys(SCOPE_TEMPLATES).map(k => (
                                                        <option key={k} value={k}>{k}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4 text-xs">
                                            <div className="space-y-1 col-span-2">
                                                <label className="text-slate-500 font-bold block">Proposal Title</label>
                                                <input 
                                                    type="text" 
                                                    value={proposalForm.title}
                                                    onChange={(e) => setProposalForm(prev => ({ ...prev, title: e.target.value }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                                />
                                            </div>
                                            <div className="space-y-1 col-span-2">
                                                <label className="text-slate-500 font-bold block">Scope of Work</label>
                                                <textarea 
                                                    value={proposalForm.scope}
                                                    onChange={(e) => setProposalForm(prev => ({ ...prev, scope: e.target.value }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 h-24"
                                                />
                                            </div>
                                            <div className="space-y-1 col-span-2">
                                                <label className="text-slate-500 font-bold block">Included Materials & Labor Details</label>
                                                <textarea 
                                                    value={proposalForm.included}
                                                    onChange={(e) => setProposalForm(prev => ({ ...prev, included: e.target.value }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 h-20"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-slate-500 font-bold block">Project Price ($)</label>
                                                <input 
                                                    type="number" 
                                                    value={proposalForm.price}
                                                    onChange={(e) => setProposalForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-slate-500 font-bold block">Estimated Duration</label>
                                                <input 
                                                    type="text" 
                                                    value={proposalForm.duration}
                                                    onChange={(e) => setProposalForm(prev => ({ ...prev, duration: e.target.value }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                                    placeholder="e.g. 5-7 business days"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-slate-500 font-bold block">Payment Terms</label>
                                                <input 
                                                    type="text" 
                                                    value={proposalForm.paymentTerms}
                                                    onChange={(e) => setProposalForm(prev => ({ ...prev, paymentTerms: e.target.value }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-slate-500 font-bold block">Warranty Coverage</label>
                                                <input 
                                                    type="text" 
                                                    value={proposalForm.warranty}
                                                    onChange={(e) => setProposalForm(prev => ({ ...prev, warranty: e.target.value }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                                />
                                            </div>
                                            <div className="space-y-1 col-span-2">
                                                <label className="text-slate-500 font-bold block">Exclusions / Notes</label>
                                                <textarea 
                                                    value={proposalForm.exclusions}
                                                    onChange={(e) => setProposalForm(prev => ({ ...prev, exclusions: e.target.value }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 h-16"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-3 justify-end pt-2">
                                            <button 
                                                type="submit" 
                                                className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider"
                                            >
                                                Save Proposal Draft
                                            </button>
                                            {getPMData(selectedProject).proposal?.number && (
                                                <button 
                                                    type="button"
                                                    onClick={handleExportProposalPDF}
                                                    className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                                                >
                                                    <Download className="w-4 h-4 text-cyan-400" /> Export PDF
                                                </button>
                                            )}
                                        </div>
                                    </form>

                                    {/* Proposal Status/Sent Form */}
                                    {getPMData(selectedProject).proposal?.number && (
                                        <form onSubmit={handleSaveProposalSent} className="bg-slate-100 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                                            <h4 className="font-extrabold text-xs text-[#0a192f] uppercase tracking-wider border-b border-slate-200 pb-2">Record Proposal Dispatch Details</h4>
                                            
                                            <div className="grid md:grid-cols-4 gap-4 text-xs">
                                                <div className="space-y-1">
                                                    <label className="text-slate-500 font-bold block">Date Sent</label>
                                                    <input 
                                                        type="date" 
                                                        value={proposalSentForm.sentDate}
                                                        onChange={(e) => setProposalSentForm(prev => ({ ...prev, sentDate: e.target.value }))}
                                                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                                    />
                                                </div>
                                                <div className="space-y-1 col-span-2">
                                                    <label className="text-slate-500 font-bold block">Recipient Email</label>
                                                    <input 
                                                        type="email" 
                                                        value={proposalSentForm.recipient}
                                                        onChange={(e) => setProposalSentForm(prev => ({ ...prev, recipient: e.target.value }))}
                                                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-slate-500 font-bold block">Status badge</label>
                                                    <select 
                                                        value={proposalSentForm.status}
                                                        onChange={(e) => setProposalSentForm(prev => ({ ...prev, status: e.target.value as any }))}
                                                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700"
                                                    >
                                                        <option value="Sent">Sent</option>
                                                        <option value="Follow Up">Follow Up</option>
                                                        <option value="Accepted">Accepted</option>
                                                        <option value="Declined">Declined</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-2">
                                                <button 
                                                    type="submit" 
                                                    className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider"
                                                >
                                                    Save Status
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            )}

                            {/* CONTRACT TAB */}
                            {projectDetailTab === 'Contract' && (
                                <div className="space-y-6">
                                    <form onSubmit={handleApproveProject} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                            <h4 className="font-extrabold text-xs text-[#0a192f] uppercase tracking-wider flex items-center gap-1.5">
                                                <Briefcase className="w-4 h-4 text-cyan-500" /> Contract & Sign-Off Details
                                            </h4>
                                            {getPMData(selectedProject).checklist?.signContract && (
                                                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full border border-emerald-200">
                                                    Signed & Active
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid md:grid-cols-3 gap-4 text-xs">
                                            <div className="space-y-1">
                                                <label className="text-slate-500 font-bold block">Signing / Approval Date *</label>
                                                <input 
                                                    type="date" 
                                                    value={approvalForm.approvedDate}
                                                    onChange={(e) => setApprovalForm(prev => ({ ...prev, approvedDate: e.target.value }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 focus:bg-white focus:border-cyan-500 transition-all" 
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-slate-500 font-bold block">Contract Amount ($) *</label>
                                                <input 
                                                    type="number" 
                                                    value={approvalForm.approvedAmount || ''}
                                                    onChange={(e) => setApprovalForm(prev => ({ ...prev, approvedAmount: parseFloat(e.target.value) || 0 }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-900 focus:bg-white focus:border-cyan-500 transition-all text-sm" 
                                                    placeholder="0.00"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-slate-500 font-bold block">Client Signature / Signoff *</label>
                                                <input 
                                                    type="text" 
                                                    value={approvalForm.signature}
                                                    onChange={(e) => setApprovalForm(prev => ({ ...prev, signature: e.target.value }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 focus:bg-white focus:border-cyan-500 transition-all" 
                                                    placeholder="Client signature text"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-slate-500 font-bold block">Deposit Amount Required ($)</label>
                                                <input 
                                                    type="number" 
                                                    value={approvalForm.depositRequired || ''}
                                                    onChange={(e) => setApprovalForm(prev => ({ ...prev, depositRequired: parseFloat(e.target.value) || 0 }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 focus:bg-white focus:border-cyan-500 transition-all" 
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div className="space-y-1 flex items-center pt-5">
                                                <label className="flex items-center gap-2 text-slate-650 font-bold cursor-pointer select-none">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={approvalForm.depositReceived}
                                                        onChange={(e) => setApprovalForm(prev => ({ ...prev, depositReceived: e.target.checked }))}
                                                        className="w-4 h-4 rounded border-slate-350 text-cyan-600 focus:ring-cyan-500" 
                                                    />
                                                    Deposit Received & Cleared
                                                </label>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-4 border-t border-slate-100">
                                            <button 
                                                type="submit" 
                                                className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-cyan-600/10 active:scale-95 transition-all"
                                            >
                                                {getPMData(selectedProject).checklist?.signContract ? 'Update Contract Details' : 'Sign & Register Contract'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* FILES TAB (GOOGLE DRIVE INTEGRATION) */}
                            {projectDetailTab === 'Files' && (
                                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                        <h4 className="font-extrabold text-xs text-[#0a192f] uppercase tracking-wider">Simulated Google Drive Project Files</h4>
                                        <span className="text-[10px] text-slate-400 font-bold">Drive path: `Projects / {selectedProject.id} - {selectedProject.client} /`</span>
                                    </div>

                                    {/* Google Drive Sub-folders Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            'Photos & Videos', 'proposal', 'Contract & CO', 'Invoices'
                                        ].map(folder => {
                                            const folderFiles = (getPMData(selectedProject).files || []).filter(f => f.folder === folder);
                                            return (
                                                <div key={folder} className="border border-slate-100 bg-slate-50 p-4 rounded-2xl flex flex-col justify-between space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <FolderOpen className="w-6 h-6 text-amber-500 fill-amber-100" />
                                                        <span className="font-black text-[11px] text-[#0a192f] truncate">{folder}</span>
                                                    </div>
                                                    
                                                    <div className="text-[10px] text-slate-500 space-y-1">
                                                        {folderFiles.length === 0 ? (
                                                            <span className="text-[9px] text-slate-400 italic block">No files uploaded</span>
                                                        ) : (
                                                            folderFiles.map(f => (
                                                                <a 
                                                                    key={f.id} 
                                                                    href={f.url} 
                                                                    className="text-cyan-600 font-bold block truncate hover:underline"
                                                                    title={f.name}
                                                                >
                                                                    📄 {f.name}
                                                                </a>
                                                            ))
                                                        )}
                                                    </div>

                                                    <button 
                                                        onClick={() => triggerFileMockUpload(folder)}
                                                        className="w-full bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-[10px] py-1 rounded-lg font-bold flex items-center justify-center gap-1 mt-2"
                                                    >
                                                        <Upload className="w-3 h-3 text-slate-400" /> Upload File
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* SCHEDULE TAB */}
                            {projectDetailTab === 'Schedule' && (
                                <div className="grid md:grid-cols-2 gap-6">
                                    <form onSubmit={handleSaveSchedule} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                                        <h4 className="font-extrabold text-xs text-[#0a192f] uppercase tracking-wider border-b border-slate-100 pb-2">Calendar Schedule Settings</h4>
                                        
                                        <div className="grid md:grid-cols-2 gap-4 text-xs">
                                            <div className="space-y-1">
                                                <label className="text-slate-500 font-bold block">Start Date</label>
                                                <input 
                                                    type="date" 
                                                    value={scheduleForm.startDate}
                                                    onChange={(e) => setScheduleForm(prev => ({ ...prev, startDate: e.target.value }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-slate-500 font-bold block">Estimated Completion Date</label>
                                                <input 
                                                    type="date" 
                                                    value={scheduleForm.estimatedEndDate}
                                                    onChange={(e) => setScheduleForm(prev => ({ ...prev, estimatedEndDate: e.target.value }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-slate-500 font-bold block">Project Manager</label>
                                                <input 
                                                    type="text" 
                                                    value={scheduleForm.manager}
                                                    onChange={(e) => setScheduleForm(prev => ({ ...prev, manager: e.target.value }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-slate-500 font-bold block">Assigned Crew</label>
                                                <select 
                                                    value={scheduleForm.crewId}
                                                    onChange={(e) => setScheduleForm(prev => ({ ...prev, crewId: e.target.value }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700"
                                                >
                                                    <option value="">Unassigned</option>
                                                    {crews.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-span-2 space-y-1">
                                                <label className="text-slate-500 font-bold block">Schedule Notes / Planning details</label>
                                                <textarea 
                                                    value={scheduleForm.notes}
                                                    onChange={(e) => setScheduleForm(prev => ({ ...prev, notes: e.target.value }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 h-16"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-2">
                                            <button 
                                                type="submit" 
                                                className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider"
                                            >
                                                Save Schedule
                                            </button>
                                        </div>
                                    </form>

                                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
                                        <h4 className="font-extrabold text-xs text-[#0a192f] uppercase tracking-wider border-b border-slate-100 pb-2">Contract Milestone Details</h4>
                                        <div className="space-y-3 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Contract Signed:</span>
                                                <span className={`font-black ${getPMData(selectedProject).checklist?.signContract ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {getPMData(selectedProject).checklist?.signContract ? 'YES (Approved)' : 'NO (Draft)'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Oscar Approved:</span>
                                                <span className={`font-black ${getPMData(selectedProject).checklist?.oscarApproval ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {getPMData(selectedProject).checklist?.oscarApproval ? 'YES (Approved)' : 'NO (Pending)'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Scheduled Start Date:</span>
                                                <span className="font-black text-slate-700">{getPMData(selectedProject).schedule?.startDate || 'Not Set'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Est. Completion:</span>
                                                <span className="font-black text-slate-700">{getPMData(selectedProject).schedule?.estimatedEndDate || 'Not Set'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* DAILY LOGS TAB */}
                            {projectDetailTab === 'Daily Logs' && (
                                <div className="grid md:grid-cols-3 gap-6">
                                    <form onSubmit={handleAddDailyLog} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 md:col-span-1">
                                        <h4 className="font-extrabold text-xs text-[#0a192f] uppercase tracking-wider border-b border-slate-100 pb-2">Create Daily construction Log</h4>
                                        
                                        <div className="space-y-3 text-xs">
                                            <div className="space-y-1">
                                                <label className="text-slate-500 font-bold block">Log Date</label>
                                                <input 
                                                    type="date" 
                                                    value={logForm.date}
                                                    onChange={(e) => setLogForm(prev => ({ ...prev, date: e.target.value }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-slate-500 font-bold block">Work Completed Summary</label>
                                                <input 
                                                    type="text" 
                                                    value={logForm.completed}
                                                    onChange={(e) => setLogForm(prev => ({ ...prev, completed: e.target.value }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700"
                                                    placeholder="e.g. Drove 5 timber pilings"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-slate-500 font-bold block">Assigned Crew Name</label>
                                                <input 
                                                    type="text" 
                                                    value={logForm.crewName}
                                                    onChange={(e) => setLogForm(prev => ({ ...prev, crewName: e.target.value }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700"
                                                    placeholder="e.g. Framing Team A"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-slate-500 font-bold block">Hours Logged</label>
                                                <input 
                                                    type="number" 
                                                    value={logForm.hours}
                                                    onChange={(e) => setLogForm(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-slate-500 font-bold block">Additional details / Obstacles</label>
                                                <textarea 
                                                    value={logForm.notes}
                                                    onChange={(e) => setLogForm(prev => ({ ...prev, notes: e.target.value }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 h-16"
                                                    placeholder="Weather details, equipment delay..."
                                                />
                                            </div>
                                        </div>

                                        <button 
                                            type="submit" 
                                            className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 p-2.5 rounded-xl text-xs font-black uppercase tracking-wider mt-2"
                                        >
                                            Add Daily Log
                                        </button>
                                    </form>

                                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 md:col-span-2">
                                        <h4 className="font-extrabold text-xs text-[#0a192f] uppercase tracking-wider border-b border-slate-100 pb-2">Daily Log Timeline</h4>
                                        <div className="space-y-3 overflow-y-auto max-h-96">
                                            {(getPMData(selectedProject).dailyLogs || []).length === 0 ? (
                                                <span className="text-xs text-slate-400 block text-center py-12">No daily logs registered yet.</span>
                                            ) : (
                                                (getPMData(selectedProject).dailyLogs || []).map(log => (
                                                    <div key={log.id} className="border border-slate-100 p-3.5 rounded-2xl text-xs space-y-2 relative bg-slate-50">
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-black text-slate-700">{log.completed}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold">{log.date}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                                                            <span>Crew: <span className="font-bold text-[#0a192f]">{log.crewName || 'N/A'}</span></span>
                                                            <span>Hours: <span className="font-bold text-[#0a192f]">{log.hours} hrs</span></span>
                                                        </div>
                                                        {log.notes && (
                                                            <p className="text-slate-500 mt-1 bg-white p-2 rounded-xl border border-slate-100">{log.notes}</p>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* CHANGE ORDERS TAB */}
                            {projectDetailTab === 'Change Orders' && (
                                <div className="grid md:grid-cols-3 gap-6">
                                    <form onSubmit={handleAddChangeOrder} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 md:col-span-1">
                                        <h4 className="font-extrabold text-xs text-[#0a192f] uppercase tracking-wider border-b border-slate-100 pb-2">Request Change Order (Increases Total)</h4>
                                        
                                        <div className="space-y-3 text-xs">
                                            <div className="space-y-1">
                                                <label className="text-slate-500 font-bold block">Description of Change</label>
                                                <textarea 
                                                    value={coForm.description}
                                                    onChange={(e) => setCOForm(prev => ({ ...prev, description: e.target.value }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 h-20"
                                                    placeholder="e.g. Add 10 additional linear feet of bulkhead."
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-slate-500 font-bold block">Price Modification ($)</label>
                                                <input 
                                                    type="number" 
                                                    value={coForm.price}
                                                    onChange={(e) => setCOForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-slate-500 font-bold block">Additional Construction Days</label>
                                                <input 
                                                    type="number" 
                                                    value={coForm.additionalDays}
                                                    onChange={(e) => setCOForm(prev => ({ ...prev, additionalDays: parseInt(e.target.value) || 0 }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                                />
                                            </div>
                                        </div>

                                        <button 
                                            type="submit" 
                                            className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 p-2.5 rounded-xl text-xs font-black uppercase tracking-wider mt-2"
                                        >
                                            Submit & Approve CO
                                        </button>
                                    </form>

                                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 md:col-span-2">
                                        <h4 className="font-extrabold text-xs text-[#0a192f] uppercase tracking-wider border-b border-slate-100 pb-2">Change Orders list</h4>
                                        <div className="space-y-3 overflow-y-auto max-h-96">
                                            {(getPMData(selectedProject).changeOrders || []).length === 0 ? (
                                                <span className="text-xs text-slate-400 block text-center py-12">No change orders registered.</span>
                                            ) : (
                                                (getPMData(selectedProject).changeOrders || []).map(co => (
                                                    <div key={co.id} className="border border-slate-100 p-3.5 rounded-2xl text-xs flex justify-between items-center bg-slate-50">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-black text-slate-700">{co.number}</span>
                                                                <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded">{co.status}</span>
                                                            </div>
                                                            <p className="text-slate-500">{co.description}</p>
                                                        </div>
                                                        <div className="text-right font-black shrink-0">
                                                            <span className="text-emerald-600">+${co.price.toLocaleString()}</span>
                                                            <span className="text-[10px] text-slate-400 block">+{co.additionalDays} Days</span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* INVOICES TAB */}
                            {projectDetailTab === 'Invoices' && (
                                <div className="grid md:grid-cols-3 gap-6">
                                    <form onSubmit={handleCreateInvoice} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 md:col-span-1">
                                        <h4 className="font-extrabold text-xs text-[#0a192f] uppercase tracking-wider border-b border-slate-100 pb-2">Generate Project Invoice</h4>
                                        
                                        <div className="space-y-3 text-xs">
                                            <div className="space-y-1">
                                                <label className="text-slate-500 font-bold block">Invoice Number</label>
                                                <input 
                                                    type="text" 
                                                    value={invoiceForm.number}
                                                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, number: e.target.value }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                                    placeholder="INV-2026-0001"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-slate-500 font-bold block">Invoice Amount ($)</label>
                                                <input 
                                                    type="number" 
                                                    value={invoiceForm.amount}
                                                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-slate-500 font-bold block">Invoice Date</label>
                                                <input 
                                                    type="date" 
                                                    value={invoiceForm.date}
                                                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, date: e.target.value }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-slate-500 font-bold block">Detailed Invoice Description / Scope *</label>
                                                <textarea 
                                                    rows={2}
                                                    required
                                                    value={invoiceForm.description}
                                                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, description: e.target.value }))}
                                                    placeholder="Describe the milestone or scope covered (e.g. Deposit draw, Framing complete)..."
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 resize-none" 
                                                />
                                            </div>
                                        </div>

                                        <button 
                                            type="submit" 
                                            className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 p-2.5 rounded-xl text-xs font-black uppercase tracking-wider mt-2"
                                        >
                                            Generate Invoice
                                        </button>
                                    </form>

                                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 md:col-span-2">
                                        <h4 className="font-extrabold text-xs text-[#0a192f] uppercase tracking-wider border-b border-slate-100 pb-2">Billed Invoices History</h4>
                                        <div className="space-y-3 overflow-y-auto max-h-96">
                                            {(getPMData(selectedProject).invoices || []).length === 0 ? (
                                                <span className="text-xs text-slate-400 block text-center py-12">No invoices created.</span>
                                            ) : (
                                                (() => {
                                                    const sortedInvoices = [...(getPMData(selectedProject).invoices || [])]
                                                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                                                    return sortedInvoices.map((inv) => {
                                                        const idx = sortedInvoices.findIndex(i => i.id === inv.id);
                                                        const num = idx !== -1 ? idx + 1 : 1;
                                                        const seqText = num === 1 ? '1st Progress Draw' : (num === 2 ? '2nd Progress Draw' : (num === 3 ? '3rd Progress Draw' : `${num}th Progress Draw`));
                                                        return (
                                                            <div key={inv.id} className="border border-slate-100 p-3.5 rounded-2xl text-xs flex flex-col gap-1.5 bg-slate-50">
                                                                <div className="flex justify-between items-start">
                                                                    <div className="space-y-0.5">
                                                                        <span className="font-black text-[#0a192f]">Invoice #{inv.number} ({seqText})</span>
                                                                        <span className="text-[10px] text-slate-400 block">{inv.date}</span>
                                                                    </div>
                                                                    <div className="text-right shrink-0">
                                                                        <span className="font-black text-slate-700">${inv.amount.toLocaleString()}</span>
                                                                        <span className="bg-amber-100 text-amber-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded block mt-1">{inv.status}</span>
                                                                    </div>
                                                                </div>
                                                                {inv.description && (
                                                                    <div className="border-t border-slate-200/60 pt-1.5 text-[10px] text-slate-500 font-bold italic">
                                                                        {inv.description}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    });
                                                })()
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}

            {/* ── SCHEDULE APPOINTMENT DIALOG / MODAL ── */}
            {appointmentModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-[#0a192f] text-white p-5 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="font-black text-sm uppercase tracking-wide">Schedule Calendar Appointment</h3>
                            <button onClick={() => setAppointmentModal(false)} className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        
                        <form onSubmit={handleCreateAppointment} className="p-5 overflow-y-auto space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="text-slate-500 font-bold block">Selected Date</label>
                                <input 
                                    type="text" 
                                    value={selectedAppointmentDate ? selectedAppointmentDate.toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-500" 
                                    readOnly
                                />
                            </div>

                            <div className="space-y-1 relative">
                                <label className="text-slate-500 font-bold block">Select Project *</label>
                                <div className="relative z-10">
                                    <input 
                                        type="text"
                                        placeholder="🔍 Type client name or site address to filter..."
                                        value={projectSearchQuery}
                                        onFocus={() => setShowProjectSearchDropdown(true)}
                                        onChange={(e) => {
                                            setProjectSearchQuery(e.target.value);
                                            setShowProjectSearchDropdown(true);
                                            if (!e.target.value) {
                                                setSelectedProjectForAppointment(null);
                                                setAppointmentForm(prev => ({ ...prev, projectId: '' }));
                                            }
                                        }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pr-10 outline-none font-bold text-slate-700 placeholder-slate-400"
                                        required
                                    />
                                    {appointmentForm.projectId && (
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                setSelectedProjectForAppointment(null);
                                                setAppointmentForm(prev => ({ ...prev, projectId: '' }));
                                                setProjectSearchQuery('');
                                                setShowProjectSearchDropdown(false);
                                            }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 p-1"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                {showProjectSearchDropdown && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-20 cursor-default" 
                                            onClick={() => setShowProjectSearchDropdown(false)} 
                                        />
                                        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-48 overflow-y-auto z-30 divide-y divide-slate-100">
                                            {(() => {
                                                const filtered = projects.filter(p => 
                                                    p.client.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                                                    p.name.toLowerCase().includes(projectSearchQuery.toLowerCase())
                                                );
                                                
                                                if (filtered.length === 0) {
                                                    return <div className="p-3 text-slate-400 text-center font-medium">No projects found.</div>;
                                                }
                                                
                                                return filtered.map(p => (
                                                    <div 
                                                        key={p.id}
                                                        onClick={() => {
                                                            setSelectedProjectForAppointment(p);
                                                            setAppointmentForm(prev => ({ ...prev, projectId: p.id }));
                                                            setProjectSearchQuery(`${p.client} - ${p.name}`);
                                                            setShowProjectSearchDropdown(false);
                                                        }}
                                                        className="p-3 hover:bg-cyan-50/50 cursor-pointer transition-all flex flex-col gap-0.5 text-left"
                                                    >
                                                        <span className="font-extrabold text-[#0a192f]">{p.client}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold">{p.name}</span>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    </>
                                )}
                            </div>

                            {selectedProjectForAppointment && (() => {
                                const pm = getPMData(selectedProjectForAppointment);
                                return (
                                    <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-[11px] space-y-1.5 shadow-inner">
                                        <p className="font-extrabold text-[#0a192f] uppercase tracking-wider text-[9px] border-b pb-1">Auto-loaded Project Info</p>
                                        <p className="text-slate-600"><strong>Site Address:</strong> {pm.address || selectedProjectForAppointment.name || 'Not Provided'}</p>
                                        <p className="text-slate-600"><strong>Contact Phone:</strong> {pm.phone || 'Not Provided'}</p>
                                        <p className="text-slate-600"><strong>Contact Email:</strong> {pm.email || 'Not Provided'}</p>
                                        <p className="text-slate-600"><strong>Lead Representative:</strong> {pm.assignedEmployee || 'Unassigned'}</p>
                                    </div>
                                );
                            })()}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-slate-500 font-bold block">Appointment Time *</label>
                                    <input 
                                        type="time" 
                                        value={appointmentForm.time}
                                        onChange={(e) => setAppointmentForm(prev => ({ ...prev, time: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-slate-500 font-bold block">Event / Activity Type</label>
                                    <select
                                        value={appointmentForm.activity}
                                        onChange={(e) => setAppointmentForm(prev => ({ ...prev, activity: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700"
                                    >
                                        <option value="Site Visit">Site Visit & Measurements</option>
                                        <option value="Proposal Review">Proposal Review</option>
                                        <option value="Contract Signing">Contract Signing</option>
                                        <option value="Construction Check">Construction Inspection</option>
                                        <option value="General Meeting">General Meeting</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-500 font-bold block">Assign Crew (Optional)</label>
                                <select 
                                    value={appointmentForm.crewId}
                                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, crewId: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700"
                                >
                                    <option value="">Select Crew...</option>
                                    {crews.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-500 font-bold block">Appointment Notes / Planning details</label>
                                <textarea 
                                    rows={3}
                                    value={appointmentForm.notes}
                                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, notes: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 resize-none" 
                                    placeholder="Enter planning details, meeting objectives, or instructions..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setAppointmentModal(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold">Cancel</button>
                                <button type="submit" className="bg-[#0a192f] hover:bg-slate-800 text-white px-5 py-2 rounded-xl font-black uppercase tracking-wider shadow">Save Appointment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── VIEW APPOINTMENT DETAILS DIALOG / MODAL ── */}
            {viewAppointmentDetails && (() => {
                const proj = projects.find(p => p.id === viewAppointmentDetails.projectId);
                const crew = crews.find(c => c.id === viewAppointmentDetails.crewId);
                const pm = proj ? getPMData(proj) : null;
                return (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
                            <div className="bg-emerald-600 text-white p-5 border-b border-emerald-700 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-emerald-100" />
                                    <h3 className="font-black text-sm uppercase tracking-wide">Appointment Scheduled</h3>
                                </div>
                                <button onClick={() => setViewAppointmentDetails(null)} className="p-1 hover:bg-white/10 rounded-lg text-emerald-100 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>
                            
                            <div className="p-6 space-y-4 text-xs">
                                <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Scheduled Event</span>
                                    <span className="text-sm font-black text-[#0a192f] block bg-slate-50 p-2.5 rounded-xl border border-slate-100">{viewAppointmentDetails.activity}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Date</span>
                                        <span className="text-slate-700 font-bold block">{viewAppointmentDetails.date}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Assigned Crew</span>
                                        <span className="text-slate-700 font-bold block">{crew ? crew.name : 'Unassigned / Rep Only'}</span>
                                    </div>
                                </div>

                                {proj && (
                                    <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-[11px] space-y-2 shadow-inner">
                                        <p className="font-extrabold text-[#0a192f] uppercase tracking-wider text-[9px] border-b pb-1">Linked Project Info</p>
                                        <p className="text-slate-700"><strong>Customer Name:</strong> {proj.client}</p>
                                        <p className="text-slate-700"><strong>Site Address:</strong> {pm?.address || proj.name || 'Not Provided'}</p>
                                        <p className="text-slate-700"><strong>Client Phone:</strong> {pm?.phone || 'Not Provided'}</p>
                                        <p className="text-slate-700"><strong>Client Email:</strong> {pm?.email || 'Not Provided'}</p>
                                    </div>
                                )}

                                {viewAppointmentDetails.workers && (
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Planning / Notes</span>
                                        <p className="text-slate-600 bg-amber-50/30 border border-amber-100 p-2.5 rounded-xl whitespace-pre-wrap">{viewAppointmentDetails.workers}</p>
                                    </div>
                                )}

                                <div className="flex flex-col gap-2 pt-4 border-t border-slate-100">
                                    {proj && (
                                        <button 
                                            onClick={() => {
                                                handleSelectProject(proj);
                                                setViewAppointmentDetails(null);
                                            }}
                                            className="w-full bg-[#0a192f] hover:bg-slate-800 text-white py-2.5 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <FileText className="w-4 h-4" /> Open Project Details
                                        </button>
                                    )}
                                    <div className="flex justify-between gap-3 mt-1">
                                        <button 
                                            type="button" 
                                            onClick={() => setViewAppointmentDetails(null)} 
                                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold flex-1"
                                        >
                                            Close
                                        </button>
                                        {onDeleteAssignment && (
                                            <button 
                                                type="button" 
                                                onClick={async () => {
                                                    if (confirm("Are you sure you want to cancel and delete this appointment?")) {
                                                        await onDeleteAssignment(viewAppointmentDetails.id);
                                                        setViewAppointmentDetails(null);
                                                        alert("Appointment deleted successfully.");
                                                    }
                                                }} 
                                                className="bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 px-4 py-2 rounded-xl font-bold"
                                            >
                                                Cancel Appointment
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── EDIT LEAD DIALOG / MODAL ── */}
            {editLeadModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-[#0a192f] text-white p-5 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="font-black text-sm uppercase tracking-wide">Edit Lead Details</h3>
                            <button onClick={() => setEditLeadModal(false)} className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        
                        <form onSubmit={handleUpdateLead} className="p-5 overflow-y-auto space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="text-slate-500 font-bold block">Customer Name *</label>
                                <input 
                                    type="text" 
                                    value={editLeadForm.customerName}
                                    onChange={(e) => setEditLeadForm(prev => ({ ...prev, customerName: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                    placeholder="Full name"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-slate-500 font-bold block">Phone Number</label>
                                    <input 
                                        type="tel" 
                                        value={editLeadForm.phone}
                                        onChange={(e) => setEditLeadForm(prev => ({ ...prev, phone: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                        placeholder="Phone"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-slate-500 font-bold block">Email Address</label>
                                    <input 
                                        type="email" 
                                        value={editLeadForm.email}
                                        onChange={(e) => setEditLeadForm(prev => ({ ...prev, email: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                        placeholder="Email"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-500 font-bold block">Project Site Address *</label>
                                <input 
                                    type="text" 
                                    value={editLeadForm.address}
                                    onChange={(e) => setEditLeadForm(prev => ({ ...prev, address: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                    placeholder="Address"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-slate-500 font-bold block">Project Type</label>
                                    <select 
                                        value={editLeadForm.projectType}
                                        onChange={(e) => setEditLeadForm(prev => ({ ...prev, projectType: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700"
                                    >
                                        {projectTypesList.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-slate-500 font-bold block">Lead Source</label>
                                    <input 
                                        type="text" 
                                        value={editLeadForm.leadSource}
                                        onChange={(e) => setEditLeadForm(prev => ({ ...prev, leadSource: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700"
                                        placeholder="Referral, Google..." 
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-500 font-bold block">Assigned Representative</label>
                                <input 
                                    type="text" 
                                    value={editLeadForm.assignedEmployee}
                                    onChange={(e) => setEditLeadForm(prev => ({ ...prev, assignedEmployee: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700"
                                    placeholder="Employee name" 
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-500 font-bold block">Project Description</label>
                                <textarea 
                                    rows={2}
                                    value={editLeadForm.description}
                                    onChange={(e) => setEditLeadForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 resize-none" 
                                    placeholder="Details about the construction layout..."
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-500 font-bold block">Notes / Private comments</label>
                                <textarea 
                                    rows={2}
                                    value={editLeadForm.notes}
                                    onChange={(e) => setEditLeadForm(prev => ({ ...prev, notes: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 resize-none" 
                                    placeholder="Any private comments or initial lead notes..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setEditLeadModal(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold">Cancel</button>
                                <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 px-5 py-2 rounded-xl font-black uppercase tracking-wider shadow">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── NEW LEAD DIALOG / MODAL ── */}
            {newLeadModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-[#0a192f] text-white p-5 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="font-black text-sm uppercase tracking-wide">Add New Project Lead</h3>
                            <button onClick={() => setNewLeadModal(false)} className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        
                        <form onSubmit={handleCreateLead} className="p-5 overflow-y-auto space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="text-slate-500 font-bold block">Customer Name *</label>
                                <input 
                                    type="text" 
                                    value={newLeadForm.customerName}
                                    onChange={(e) => setNewLeadForm(prev => ({ ...prev, customerName: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                    placeholder="Full name"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-slate-500 font-bold block">Phone Number</label>
                                    <input 
                                        type="tel" 
                                        value={newLeadForm.phone}
                                        onChange={(e) => setNewLeadForm(prev => ({ ...prev, phone: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                        placeholder="Phone"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-slate-500 font-bold block">Email Address</label>
                                    <input 
                                        type="email" 
                                        value={newLeadForm.email}
                                        onChange={(e) => setNewLeadForm(prev => ({ ...prev, email: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                        placeholder="Email"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-500 font-bold block">Project Site Address *</label>
                                <input 
                                    type="text" 
                                    value={newLeadForm.address}
                                    onChange={(e) => setNewLeadForm(prev => ({ ...prev, address: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                    placeholder="Address"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-slate-500 font-bold block">Project Type</label>
                                    <select 
                                        value={showCustomTypeInput ? 'ADD_CUSTOM' : newLeadForm.projectType}
                                        onChange={(e) => {
                                            if (e.target.value === 'ADD_CUSTOM') {
                                                setShowCustomTypeInput(true);
                                            } else {
                                                setShowCustomTypeInput(false);
                                                setNewLeadForm(prev => ({ ...prev, projectType: e.target.value }));
                                            }
                                        }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700"
                                    >
                                        {projectTypesList.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                        <option value="ADD_CUSTOM">+ Add Custom Type...</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-slate-500 font-bold block">Lead Source</label>
                                    <input 
                                        type="text" 
                                        value={newLeadForm.leadSource}
                                        onChange={(e) => setNewLeadForm(prev => ({ ...prev, leadSource: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700"
                                        placeholder="Referral, Google..." 
                                    />
                                </div>
                            </div>

                            {showCustomTypeInput && (
                                <div className="space-y-1">
                                    <label className="text-slate-500 font-bold block">Custom Project Type Name</label>
                                    <input 
                                        type="text" 
                                        value={customTypeVal}
                                        onChange={(e) => setCustomTypeVal(e.target.value)}
                                        className="w-full bg-slate-50 border border-cyan-400 rounded-xl p-2.5 outline-none font-bold text-slate-700"
                                        placeholder="Enter custom project type (e.g. Floating Pier)"
                                        required
                                    />
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-slate-500 font-bold block">Assigned Representative</label>
                                <input 
                                    type="text" 
                                    value={newLeadForm.assignedEmployee}
                                    onChange={(e) => setNewLeadForm(prev => ({ ...prev, assignedEmployee: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700"
                                    placeholder="Employee name" 
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-500 font-bold block">Project Description</label>
                                <textarea 
                                    value={newLeadForm.description}
                                    onChange={(e) => setNewLeadForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 h-16" 
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-500 font-bold block">Notes / Private Comments</label>
                                <textarea 
                                    value={newLeadForm.notes}
                                    onChange={(e) => setNewLeadForm(prev => ({ ...prev, notes: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 h-16" 
                                    placeholder="Any private comments or initial lead notes..."
                                />
                            </div>

                            <div className="flex gap-3 justify-end pt-3">
                                <button 
                                    type="button" 
                                    disabled={isCreatingLead}
                                    onClick={() => setNewLeadModal(false)} 
                                    className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 px-4 py-2 rounded-xl font-bold"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isCreatingLead}
                                    className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 px-5 py-2 rounded-xl font-black uppercase tracking-wider shadow flex items-center gap-2"
                                >
                                    {isCreatingLead ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Creating Lead...</span>
                                        </>
                                    ) : (
                                        <span>Create Lead</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── SITE VISIT DRAG SCHEDULING MODAL ── */}
            {siteVisitDragModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-left">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
                        <div className="bg-[#0a192f] text-white p-5 border-b border-slate-800 flex justify-between items-center">
                            <div>
                                <span className="bg-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-cyan-500/20">
                                    Schedule Site Visit
                                </span>
                                <h3 className="font-black text-sm uppercase tracking-wide mt-1">Schedule Visit: {draggedProject?.client}</h3>
                            </div>
                            <button 
                                onClick={() => {
                                    setSiteVisitDragModal(false);
                                    setDraggedProject(null);
                                }} 
                                className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleConfirmSiteVisitDrag} className="p-5 space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="text-slate-500 font-bold block">Visit Date (End Date) *</label>
                                <input 
                                    type="date" 
                                    value={dragVisitForm.date}
                                    onChange={(e) => setDragVisitForm(prev => ({ ...prev, date: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-500 font-bold block">Assigned Representative / Inspector *</label>
                                <input 
                                    type="text" 
                                    value={dragVisitForm.employee}
                                    onChange={(e) => setDragVisitForm(prev => ({ ...prev, employee: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700" 
                                    placeholder="Employee name"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-slate-500 font-bold block">Special Visit Notes</label>
                                <textarea 
                                    value={dragVisitForm.notes}
                                    onChange={(e) => setDragVisitForm(prev => ({ ...prev, notes: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 h-16" 
                                    placeholder="Any notes for the visit..."
                                />
                            </div>

                            <div className="flex gap-3 justify-end pt-3">
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setSiteVisitDragModal(false);
                                        setDraggedProject(null);
                                    }} 
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold"
                                >
                                    Cancel Move
                                </button>
                                <button 
                                    type="submit" 
                                    className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 px-5 py-2 rounded-xl font-black uppercase tracking-wider shadow"
                                >
                                    Confirm & Schedule
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
