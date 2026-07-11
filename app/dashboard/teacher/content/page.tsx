'use client';

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Upload, 
  FileText, 
  Check, 
  Camera, 
  ChevronRight,
  Sparkles,
  Search,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import { useRouter } from 'next/navigation';

type ContentScreen = 'dashboard' | 'create_challenge' | 'wizard_tutorial' | 'wizard_practice' | 'wizard_activity';

interface ModuleCard {
  id: string;
  title: string;
  imgUrl: string;
  accentColor: string;
}

export default function ContentManagementPage() {
  const router = useRouter();

  // Navigation & UI States
  const [screen, setScreen] = useState<ContentScreen>('dashboard');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  
  // Form Field Binder Hooks
  const [challengeData, setFormData] = useState({
    date: '', timeStart: '', timeFinish: '', searchStudent: '',
    task1: '', task2: '', task3: '', task4: '', task5: ''
  });
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [tutorialTitle, setTutorialTitle] = useState('');
  const [selectedQuizType, setSelectedQuizType] = useState<string>('Multiple Choice');

  // Sliders for Step 2 Practice Bounds Telemetry
  const [sliders, setSliders] = useState({
    rotate: 85,
    tilt: 72,
    switchHands: 50,
    distance: 64
  });

  const studentRegistry = useMemo(() => [
    { id: 'john', name: 'John Doe' },
    { id: 'junard', name: 'Junard Do' },
    { id: 'maria', name: 'Maria Santos' }
  ], []);

  const filteredStudents = useMemo(() => {
    if (!challengeData.searchStudent) return studentRegistry;
    return studentRegistry.filter(s => 
      s.name.toLowerCase().includes(challengeData.searchStudent.toLowerCase())
    );
  }, [challengeData.searchStudent, studentRegistry]);

  const [modules, setModules] = useState<ModuleCard[]>([
    { id: 'alpha', title: 'Alphabets', imgUrl: '/images/alphabets.png', accentColor: 'border-[#F2B33D]' },
    { id: 'num', title: 'Numbers', imgUrl: '/images/numbers.png', accentColor: 'border-[#F2B33D]' },
    { id: 'phrases', title: 'Common Words/Phrases', imgUrl: '/images/phrases.png', accentColor: 'border-[#F2B33D]' },
    { id: 'civic', title: 'Civic Observance', imgUrl: '/images/civic.png', accentColor: 'border-[#F2B33D]' },
  ]);

  const filteredModules = useMemo(() => {
    return modules.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery, modules]);

  const toggleStudentCheck = (id: string) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllStudents = () => {
    if (selectedStudents.length === studentRegistry.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(studentRegistry.map(s => s.id));
    }
  };

  const handleEditModule = (title: string) => {
    setTutorialTitle(title);
    setScreen('wizard_tutorial');
  };

  const executeDeleteModule = () => {
    if (deleteTargetId) {
      setModules(prev => prev.filter(m => m.id !== deleteTargetId));
      setDeleteTargetId(null);
    }
  };

  const handleDeployModule = () => {
    if (!tutorialTitle) {
      alert("Please provide a valid module title before deployment.");
      return;
    }
    const newId = `mod_${Date.now()}`;
    const newModule: ModuleCard = {
      id: newId,
      title: tutorialTitle,
      imgUrl: '/images/alphabets.png', 
      accentColor: 'border-[#F2B33D]'
    };
    setModules(prev => [...prev, newModule]);
    alert(`Module "${tutorialTitle}" deployed successfully!`);
    setTutorialTitle('');
    setUploadedFile(null);
    setScreen('dashboard');
  };

  // Drag and Drop Logic Handling
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      setUploadedFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full flex flex-col p-1 font-sans antialiased text-[#521903] selection:bg-[#F2B33D]/30 h-[calc(100vh-50px)] overflow-hidden">
      
      {/* ========================================================================= */}
      {/* SCREEN 1: CONTENT DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {screen === 'dashboard' && (
        <div className="w-full flex flex-col gap-4 overflow-hidden animate-fadeIn">
          {/* HEADER BAR */}
          <div className="w-full bg-white rounded-[24px] border border-[#F5E6C4] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm flex-shrink-0">
            <div className="space-y-0.5">
              <h2 className="text-xl font-black uppercase tracking-widest text-[#521903]">Daily Challenges</h2>
              <p className="text-xs font-bold text-slate-400">Manage interactive modules and challenge paths.</p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex items-center flex-1 md:w-64">
                <Search className="h-4 w-4 absolute left-3.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search content modules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-[#F5E6C4] rounded-full text-xs bg-[#F5E6C4]/10 focus:outline-none focus:bg-white font-bold text-[#521903]"
                />
              </div>
              <button 
                onClick={() => setScreen('create_challenge')}
                className="inline-flex items-center gap-2 bg-[#F2B33D] hover:bg-[#D99A26] text-white font-black px-5 py-2.5 rounded-full text-xs uppercase tracking-wider shadow-sm active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                New Challenge
              </button>

              {/* MESSAGE ICON REDIRECT ROUTED PERFECTLY INTO /feedback PATH TO MATCH LOCAL COHORT */}
              <button 
                onClick={() => router.push('/dashboard/teacher/feedback')}
                className="p-2.5 bg-white border-2 border-slate-100 hover:border-[#521903] rounded-full text-[#521903] shadow-sm hover:shadow transition-all duration-150 active:scale-90 cursor-pointer"
                title="Navigate to Admin Feedback Hub"
              >
                <MessageSquare className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* DASHBOARD MODULE GRID */}
          <div className="w-full h-[440px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 items-stretch overflow-hidden flex-shrink-0">
            {filteredModules.map((mod) => (
              <div 
                key={mod.id} 
                className="bg-white rounded-[28px] border border-slate-100 shadow-sm flex flex-col justify-between items-center text-center p-5 hover:-translate-y-0.5 transition-all relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#F2B33D]" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 mt-1">{mod.title}</h3>
                
                <div className="flex items-center justify-center h-44 w-full py-2 select-none">
                  <img src={mod.imgUrl} alt={mod.title} className="max-h-full max-w-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                </div>

                <div className="flex items-center gap-2 w-full justify-center pt-3 border-t border-slate-50 z-10">
                  <button 
                    onClick={() => handleEditModule(mod.title)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white border-2 border-[#521903]/10 hover:border-[#521903] text-[#521903] font-black py-2 rounded-full text-[10px] uppercase tracking-wider hover:bg-[#521903] hover:text-white active:scale-[0.96] transition-all cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button 
                    onClick={() => setDeleteTargetId(mod.id)}
                    className="p-2 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 rounded-full active:scale-[0.96] transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            <div 
              onClick={() => { setTutorialTitle(''); setUploadedFile(null); setScreen('wizard_tutorial'); }}
              className="bg-[#FFFDF5] border-2 border-dashed border-amber-200 hover:border-[#F2B33D] rounded-[28px] flex flex-col items-center justify-center text-center cursor-pointer group p-5 transition-all"
            >
              <div className="h-11 w-12 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100 text-amber-500">
                <Plus className="h-5 w-5 stroke-[3]" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3 group-hover:text-[#521903]">Add Content Module</span>
            </div>
          </div>
        </div>
      )}

      {/* ================= SCREEN 2: DAILY CHALLENGES FORM ================= */}
      {screen === 'create_challenge' && (
        <div className="w-full flex-1 flex flex-col gap-4 overflow-hidden animate-fadeIn">
          <div className="w-full bg-[#F2B33D] text-white p-4 rounded-xl flex items-center gap-3 shadow-sm flex-shrink-0">
            <button onClick={() => setScreen('dashboard')} className="p-2 bg-white/20 hover:bg-white text-white hover:text-[#521903] rounded-xl transition-colors cursor-pointer"><ArrowLeft className="h-4 w-4 stroke-[3]" /></button>
            <h2 className="text-base font-black uppercase tracking-wider">Configure Daily Challenge Path</h2>
          </div>

          <div className="w-full flex-1 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[460px]">
            <div className="space-y-4 text-xs font-black">
              <div className="space-y-1">
                <label className="text-slate-400 uppercase tracking-wide block">Challenge Deployment Date</label>
                <div className="relative flex items-center">
                  <Calendar className="h-4 w-4 absolute left-4 text-slate-400" />
                  <input type="date" value={challengeData.date} onChange={(e) => setFormData({...challengeData, date: e.target.value})} className="w-full px-4 py-2.5 pl-12 border-2 border-[#F5E6C4]/40 bg-[#F5E6C4]/10 rounded-xl focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 uppercase tracking-wide block">Time Start</label>
                  <div className="relative flex items-center">
                    <Clock className="h-4 w-4 absolute left-4 text-slate-400" />
                    <input type="time" value={challengeData.timeStart} onChange={(e) => setFormData({...challengeData, timeStart: e.target.value})} className="w-full px-4 py-2.5 pl-12 border-2 border-[#F5E6C4]/40 bg-[#F5E6C4]/10 rounded-xl focus:outline-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 uppercase tracking-wide block">Time Finish</label>
                  <div className="relative flex items-center">
                    <Clock className="h-4 w-4 absolute left-4 text-slate-400" />
                    <input type="time" value={challengeData.timeFinish} onChange={(e) => setFormData({...challengeData, timeFinish: e.target.value})} className="w-full px-4 py-2.5 pl-12 border-2 border-[#F5E6C4]/40 bg-[#F5E6C4]/10 rounded-xl focus:outline-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-slate-400 uppercase tracking-wide">
                  <span>Student Target Allocation</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-500 font-extrabold">
                    <input type="checkbox" className="rounded text-[#F2B33D]" checked={selectedStudents.length === studentRegistry.length} onChange={toggleSelectAllStudents} />
                    Select All
                  </label>
                </div>
                <input type="text" placeholder="Filter student list..." value={challengeData.searchStudent} onChange={(e) => setFormData({...challengeData, searchStudent: e.target.value})} className="w-full px-4 py-2 border-2 border-[#F5E6C4]/40 bg-[#F5E6C4]/10 rounded-xl focus:outline-none text-slate-700" />
                <div className="border border-slate-100 rounded-xl max-h-[110px] overflow-y-auto divide-y bg-white p-1">
                  {filteredStudents.map(student => (
                    <div key={student.id} onClick={() => toggleStudentCheck(student.id)} className="p-2 flex items-center justify-between hover:bg-[#F2B33D]/5 cursor-pointer rounded-lg">
                      <span className="font-bold text-slate-700 text-xs">{student.name}</span>
                      <input type="checkbox" checked={selectedStudents.includes(student.id)} className="rounded text-amber-500 h-3.5 w-3.5" readOnly />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs font-black">
              <label className="text-slate-400 uppercase tracking-wide block">Challenges Tasks List</label>
              {['task1', 'task2', 'task3', 'task4', 'task5'].map((taskKey, index) => (
                <div key={taskKey} className="relative flex items-center">
                  <input type="text" placeholder={`Task ${index + 1} specification...`} value={(challengeData as any)[taskKey]} onChange={(e) => setFormData({...challengeData, [taskKey]: e.target.value})} className="w-full px-4 py-2.5 border-2 border-[#F5E6C4]/40 bg-[#F5E6C4]/10 rounded-xl focus:outline-none pr-12" />
                  <Plus className="h-4 w-4 absolute right-4 text-slate-400" />
                </div>
              ))}
            </div>

            <div className="md:col-span-2 pt-4 border-t border-slate-100 flex items-center justify-center gap-4 w-full flex-shrink-0">
              <button onClick={() => setScreen('dashboard')} className="bg-white border-2 border-slate-200 text-slate-600 font-black px-6 py-2 rounded-xl text-xs uppercase tracking-widest cursor-pointer">Cancel</button>
              <button onClick={() => { alert("Challenges deployed."); setScreen('dashboard'); }} className="bg-[#2563EB] hover:bg-blue-700 text-white font-black px-6 py-2 rounded-xl text-xs uppercase tracking-widest cursor-pointer">Confirm & Deploy</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SCREEN 3: WIZARD STEP 1 ================= */}
      {screen === 'wizard_tutorial' && (
        <div className="w-full flex-1 flex flex-col gap-4 animate-fadeIn max-h-[480px] my-auto justify-start overflow-hidden">
          <div className="w-full bg-[#F2B33D] text-white p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm flex-shrink-0">
            <div className="flex items-center gap-2">
              <button onClick={() => setScreen('dashboard')} className="p-2 bg-white/20 hover:bg-white text-white hover:text-[#521903] rounded-xl transition-colors cursor-pointer"><ArrowLeft className="h-4 w-4 stroke-[3]" /></button>
              <h2 className="text-sm font-black uppercase tracking-wider font-serif">New Module Wizard Framework</h2>
            </div>
            
            <div className="flex items-center gap-2 text-[10px] font-black bg-black/10 px-3.5 py-1.5 rounded-xl select-none border border-black/5">
              <span className="text-white underline underline-offset-4 flex items-center gap-1"><Sparkles className="h-3 w-3 text-yellow-200" /> 1. Tutorial Base</span>
              <ChevronRight className="h-3 w-3 opacity-40" /> <span className="opacity-60">2. Practice Bounds</span>
              <ChevronRight className="h-3 w-3 opacity-40" /> <span className="opacity-60">3. Activity Setup</span>
            </div>
          </div>

          <div className="w-full bg-white rounded-3xl border border-slate-150 p-6 flex flex-col justify-between shadow-sm space-y-4 overflow-hidden">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase tracking-widest text-[10px] font-black block">Tutorial Module Title</label>
                <input type="text" placeholder="Enter title (e.g., Numbers)" value={tutorialTitle} onChange={(e) => setTutorialTitle(e.target.value)} className="w-full px-4 py-2.5 border-2 border-slate-200 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#F2B33D]/30 text-slate-800 font-bold text-xs" />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase tracking-widest text-[10px] font-black block">Staged Media Stream Asset</label>
                <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center p-6 h-[170px] transition-all duration-150 ${isDragging ? 'border-[#F2B33D] bg-[#FFFBEB] scale-[1.005]' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                  <Upload className="h-7 w-7 mb-2 text-slate-400" />
                  {uploadedFile ? (
                    <div className="space-y-0.5">
                      <p className="font-black text-emerald-600 flex items-center justify-center gap-1 text-xs"><Check className="h-3.5 w-3.5 stroke-[3]" /> Asset Uploaded</p>
                      <p className="text-[10px] text-slate-400 font-semibold max-w-sm truncate mx-auto">{uploadedFile.name}</p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <p className="font-black text-slate-700 text-xs">Choose a file or drag & drop it here</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">JPEG, PNG, PDF, and MP4 formats, up to 50MB</p>
                    </div>
                  )}
                  <label className="mt-3.5 inline-flex items-center justify-center bg-white border-2 border-[#521903]/10 hover:border-[#521903] text-[#521903] font-black px-4 py-2 rounded-xl text-[10px] uppercase tracking-wider active:scale-[0.96] transition-all cursor-pointer shadow-sm">
                    Browse File
                    <input type="file" className="hidden" accept=".jpeg,.png,.jpg,.mp4,.pdf" onChange={(e) => { if(e.target.files?.[0]) setUploadedFile(e.target.files[0]); }} />
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-3.5 border-t border-slate-100 flex justify-end w-full flex-shrink-0">
              <button onClick={() => setScreen('wizard_practice')} className="inline-flex items-center gap-1.5 bg-[#2563EB] hover:bg-blue-700 text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-widest shadow-sm active:scale-[0.97] transition-all cursor-pointer">
                Proceed to Practice
                <ChevronRight className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 4: WIZARD STEP 2 ================= */}
      {screen === 'wizard_practice' && (
        <div className="w-full flex-1 flex flex-col gap-4 animate-fadeIn max-h-[480px] my-auto justify-start overflow-hidden">
          <div className="w-full bg-[#F2B33D] text-white p-4 rounded-2xl flex items-center justify-between gap-3 shadow-sm flex-shrink-0">
            <div className="flex items-center gap-2">
              <button onClick={() => setScreen('wizard_tutorial')} className="p-2 bg-white/20 hover:bg-white text-white hover:text-[#521903] rounded-xl transition-colors cursor-pointer"><ArrowLeft className="h-4 w-4 stroke-[3]" /></button>
              <h2 className="text-sm font-black uppercase tracking-wider">Configure Practice Matrix</h2>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black bg-black/10 px-3.5 py-1.5 rounded-xl select-none border border-black/5">
              <span>1. Tutorial Base</span> <ChevronRight className="h-3 w-3 opacity-40" />
              <span className="text-white underline underline-offset-4 flex items-center gap-1"><Sparkles className="h-3 w-3 text-yellow-200" /> 2. Practice Bounds</span> <ChevronRight className="h-3 w-3 opacity-40" />
              <span className="opacity-60">3. Activity Setup</span>
            </div>
          </div>

          <div className="w-full bg-white rounded-3xl border border-slate-150 p-6 grid grid-cols-1 md:grid-cols-2 gap-6 shadow-sm overflow-hidden">
            <div className="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-center p-4 h-[200px] text-slate-400 space-y-1 shadow-inner">
              <Camera className="h-6 w-6 stroke-[1.5]" />
              <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400/80">Telemetry Preview Capture Staged</span>
            </div>

            <div className="space-y-3 flex flex-col justify-center">
              <label className="text-slate-500 uppercase block text-[10px] tracking-widest font-black">FSL Recognition Tolerance Parameter Bounds</label>
              {[
                { name: 'Rotate Horizontally', key: 'rotate' },
                { name: 'Tilt Vertically', key: 'tilt' },
                { name: 'Switch Hands', key: 'switchHands' },
                { name: 'Vary Distance', key: 'distance' }
              ].map((slider) => (
                <div key={slider.key} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-black text-slate-700">
                    <span>{slider.name}</span>
                    <span className="text-[#F2B33D]">{(sliders as any)[slider.key]}%</span>
                  </div>
                  <input type="range" min="10" max="100" value={(sliders as any)[slider.key]} onChange={(e) => setSliders({...sliders, [slider.key]: parseInt(e.target.value)})} className="w-full accent-[#F2B33D] bg-slate-100 h-1.5 rounded-lg cursor-pointer" />
                </div>
              ))}
            </div>

            <div className="md:col-span-2 pt-3.5 border-t border-slate-100 flex justify-between items-center w-full flex-shrink-0">
              <button onClick={() => setScreen('wizard_tutorial')} className="bg-white border-2 border-slate-200 text-slate-600 font-black px-5 py-2 rounded-xl text-xs uppercase tracking-wider cursor-pointer">Back</button>
              <button onClick={() => setScreen('wizard_activity')} className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-sm cursor-pointer">
                Proceed to Activities Setup
                <ChevronRight className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 5: WIZARD STEP 3 ================= */}
      {screen === 'wizard_activity' && (
        <div className="w-full flex-1 flex flex-col gap-4 animate-fadeIn max-h-[480px] my-auto justify-start overflow-hidden">
          <div className="w-full bg-[#F2B33D] text-white p-4 rounded-2xl border border-amber-400/20 shadow-sm flex items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button onClick={() => setScreen('wizard_practice')} className="p-2 bg-white/20 hover:bg-white text-white hover:text-[#521903] rounded-xl transition-colors cursor-pointer"><ArrowLeft className="h-4 w-4 stroke-[3]" /></button>
              <h2 className="text-sm font-black uppercase tracking-wider">Configure Activity Tasks</h2>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black bg-black/10 px-3.5 py-1.5 rounded-xl select-none border border-black/5">
              <span>1. Tutorial Base</span> <ChevronRight className="h-3 w-3 opacity-40" />
              <span>2. Practice Bounds</span> <ChevronRight className="h-3 w-3 opacity-40" />
              <span className="text-white underline underline-offset-4 flex items-center gap-1"><Sparkles className="h-3 w-3 text-yellow-200" /> 3. Activity Setup</span>
            </div>
          </div>

          <div className="w-full bg-white rounded-3xl border border-slate-150 p-6 flex flex-col justify-between shadow-sm space-y-4 overflow-hidden">
            <div className="space-y-3 w-full overflow-y-auto max-h-[220px] pr-1">
              <label className="text-slate-500 uppercase block text-[10px] tracking-widest font-black">Select Interactive Activity Quiz Methods</label>
              {['Picture Exchange Communication System (PECS)', 'True/False Statements', 'Matching Type', 'Multiple Choice', 'Completion'].map((quizType) => {
                const isSelected = selectedQuizType === quizType;
                return (
                  <div key={quizType} onClick={() => setSelectedQuizType(quizType)} className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between shadow-sm ${isSelected ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-100 bg-slate-50'}`}>
                    <span className="text-xs font-black tracking-tight">{quizType}</span>
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white'}`}>
                      {isSelected && <Check className="h-2 w-2 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3.5 border-t border-slate-100 flex items-center justify-center gap-4 w-full flex-shrink-0">
              <button onClick={() => setScreen('wizard_practice')} className="bg-white border-2 border-slate-200 text-slate-600 font-black px-6 py-2 rounded-xl text-xs uppercase tracking-widest cursor-pointer">Save Draft</button>
              <button onClick={handleDeployModule} className="bg-[#52B788] hover:bg-emerald-600 text-white font-black px-6 py-2 rounded-xl text-xs uppercase tracking-widest shadow-md cursor-pointer">Confirm & Deploy Module</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-5 w-full max-w-sm rounded-[24px] shadow-2xl text-center space-y-3 border border-slate-100">
            <div className="h-10 w-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto"><AlertTriangle className="h-5 w-5" /></div>
            <div>
              <h3 className="text-sm font-black text-slate-800">Confirm Content Purge</h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-1">Are you sure you want to drop this target lesson matrix completely?</p>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button onClick={() => setDeleteTargetId(null)} className="flex-1 bg-slate-50 border py-2 rounded-xl text-xs font-black cursor-pointer">Cancel</button>
              <button onClick={executeDeleteModule} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2 rounded-xl text-xs font-black cursor-pointer">Purge Record</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}