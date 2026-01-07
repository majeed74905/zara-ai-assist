import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Code, Play, Smartphone, Monitor, Globe, Download, Terminal, 
  Activity, Save, FolderOpen, Plus, Trash2, ArrowLeft, 
  FileCode, FileJson, FileType, RefreshCw, Layout, Cpu, 
  X, Check, Send, Sparkles, Files, MessageSquare, ExternalLink, Maximize2, FlaskConical, ShieldCheck, AlertCircle, ClipboardList,
  Loader2, Columns2, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendAppBuilderStream, generateAppReliabilityReport } from '../services/gemini';
import { Message, Role, Attachment, GeneratedFile, VFS, AppProject } from '../types';
import ReactMarkdown from 'react-markdown';

declare const JSZip: any;

const STORAGE_KEY = 'zara_vfs_projects';

export const AppBuilderMode: React.FC = () => {
  const [view, setView] = useState<'projects' | 'workspace'>('projects');
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'files'>('chat');
  const [stageView, setStageView] = useState<'preview' | 'code' | 'test' | 'split'>('split');
  
  const [projects, setProjects] = useState<AppProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [vfs, setVfs] = useState<VFS>({});
  const [debouncedVfs, setDebouncedVfs] = useState<VFS>({});
  const [activeFilePath, setActiveFilePath] = useState<string>('App.tsx');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isBuilding, setIsBuilding] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [testReport, setTestReport] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>(['> Workspace initialized. Ready to build.']);
  const [iframeKey, setIframeKey] = useState(0);
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [deployToast, setDeployToast] = useState<{show: boolean, url?: string}>({show: false});

  // Track initialization status
  const [isInitialized, setIsInitialized] = useState(false);

  // 1. Initial Load from Storage
  useEffect(() => {
    const loadData = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setProjects(parsed);
          }
        } catch (e) {
          setLogs(prev => [...prev, "> System: Corrupt data found. Initializing fresh."]);
        }
      }
      setIsInitialized(true);
    };
    loadData();
  }, []);

  // 2. Automated Background Sync
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects, isInitialized]);

  // Debounce VFS for preview
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedVfs(vfs);
    }, 400);
    return () => clearTimeout(timer);
  }, [vfs]);

  const createNewProject = () => {
    const newProj: AppProject = {
      id: crypto.randomUUID(),
      name: `New App ${projects.length + 1}`,
      vfs: {
        'App.tsx': `import React from 'react';\nimport { User, Heart } from 'lucide-react';\n\nexport default function App() {\n  const [count, setCount] = React.useState(0);\n\n  return (\n    <div className="flex items-center justify-center h-screen bg-gray-900 text-white p-4">\n      <div className="text-center p-12 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] shadow-2xl transition-all hover:border-blue-500/30">\n        <div className="relative w-24 h-24 mx-auto mb-8">\n          <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse" />\n          <User className="w-full h-full text-blue-500 relative z-10" />\n        </div>\n        \n        <h1 className="text-5xl font-black mb-4 tracking-tighter bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">\n          Zara Studio\n        </h1>\n        <p className="text-gray-400 mb-8 max-w-xs mx-auto">Live preview is active. Change the code and see it update instantly.</p>\n        \n        <button \n          onClick={() => setCount(c => c + 1)}\n          className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95"\n        >\n          <Heart className={count > 0 ? "fill-white" : ""} />\n          Likes: {count}\n        </button>\n      </div>\n    </div>\n  );\n}`,
        'styles.css': '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap");\nbody { margin: 0; font-family: "Inter", sans-serif; }'
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setProjects(prev => [newProj, ...prev]);
    loadProject(newProj);
  };

  const loadProject = (proj: AppProject) => {
    setActiveProjectId(proj.id);
    setVfs(proj.vfs);
    setMessages([]);
    setLogs([`> Loaded project: ${proj.name}`]);
    setTestReport(null);
    setView('workspace');
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const target = projects.find(p => p.id === id);
    if (!target) return;

    if (window.confirm(`Are you sure you want to permanently delete this project?`)) {
      setProjects(prev => prev.filter(p => p.id !== id));
      if (id === activeProjectId) {
         setActiveProjectId(null);
         setVfs({});
         setView('projects');
      }
      setLogs(prev => [...prev, `> System: Purged ${target.name}.`]);
    }
  };

  const runReliabilityScan = async () => {
    setIsAnalyzing(true);
    setStageView('test');
    setLogs(prev => [...prev, `> Audit: Initiating Reliability Scan...`]);
    try {
      const report = await generateAppReliabilityReport(vfs);
      setTestReport(report);
      setLogs(prev => [...prev, `> Audit: Report Generated.`]);
    } catch (e: any) {
      setLogs(prev => [...prev, `> Error: Scan failed. ${e.message}`]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = (content: string) => {
    const updatedVfs = { ...vfs, [activeFilePath]: content };
    setVfs(updatedVfs);
    if (activeProjectId) {
      setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, vfs: updatedVfs, updatedAt: Date.now() } : p));
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isBuilding) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: Role.USER, text: inputText, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsBuilding(true);
    const botMsgId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: botMsgId, role: Role.MODEL, text: '', timestamp: Date.now(), isStreaming: true }]);

    try {
      let fullText = '';
      const fileContext = Object.entries(vfs).map(([path, content]) => `<file path="${path}">${content}</file>`).join('\n');
      let promptToSend = userMsg.text;
      if (messages.length > 0) { promptToSend += `\n\nCurrent VFS State:\n${fileContext}`; }
      
      const { text: generatedText } = await sendAppBuilderStream(messages, promptToSend, [], (partial) => {
        fullText = partial;
        setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: partial } : m));
      });

      const tagPattern = /<file\s+path=["']([^"']+)["'][^>]*>([\s\S]*?)<\/file>/g;
      let match;
      const updates: VFS = { ...vfs };
      let updatedCount = 0;
      while ((match = tagPattern.exec(generatedText)) !== null) {
        const path = match[1];
        let content = match[2].trim();
        content = content.replace(/^```[a-z]*\n/i, '').replace(/\n```$/g, '');
        updates[path] = content;
        updatedCount++;
      }

      if (updatedCount > 0) {
        setVfs(updates);
        setLogs(prev => [...prev, `> Architect: Synchronized ${updatedCount} files.`]);
        setIframeKey(k => k + 1);
        if (activeProjectId) {
          setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, vfs: updates, updatedAt: Date.now() } : p));
        }
      }
      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, isStreaming: false } : m));
    } catch (e: any) {
      setLogs(prev => [...prev, `> Error: ${e.message}`]);
    } finally {
      setIsBuilding(false);
    }
  };

  const previewSource = useMemo(() => {
    const html = debouncedVfs['index.html'] || `<div id="root"></div>`;
    const css = debouncedVfs['styles.css'] || '';
    const entryFile = 'App.tsx';
    const scriptFiles = Object.keys(debouncedVfs).filter(f => /\.(js|jsx|ts|tsx)$/.test(f) && f !== entryFile);
    let bundledJs = '';
    
    const processCode = (code: string) => {
      return code
        .replace(/import\s+[\s\S]*?from\s+['"].*?['"];?/g, '')
        .replace(/import\s+['"].*?['"];?/g, '')
        .replace(/export\s+default\s+function\s+(\w+)/, 'function $1')
        .replace(/export\s+default\s+function\s*\(/, 'function App(')
        .replace(/export\s+default\s+(\w+)/, '')
        .replace(/export\s+const\s+(\w+)/, 'const $1')
        .replace(/export\s+class\s+(\w+)/, 'class $1')
        .replace(/export\s+\{.*?\};?/g, '');
    };

    scriptFiles.forEach(filename => { bundledJs += `\n/* --- ${filename} --- */\n${processCode(debouncedVfs[filename])}\n`; });
    if (debouncedVfs[entryFile]) { bundledJs += `\n/* --- ${entryFile} --- */\n${processCode(debouncedVfs[entryFile])}\n`; }
    
    return `<!DOCTYPE html><html><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script><script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script><script src="https://unpkg.com/@babel/standalone/babel.min.js"></script><script src="https://cdn.tailwindcss.com"></script><script src="https://unpkg.com/lucide@latest"></script><style>${css} body { background-color: #111827; color: #fff; margin: 0; }</style><script>window.process = { env: { NODE_ENV: 'development' } }; window.onerror = function(msg, url, line) { window.parent.postMessage({type: 'ERROR', log: msg + ' (Line ' + line + ')'}, '*'); }; console.log = function(...args) { window.parent.postMessage({type: 'LOG', log: args.join(' ')}, '*'); };</script></head><body>${html}<script type="text/babel">const { useState, useEffect, useRef, useMemo, useCallback, useReducer, useContext, createContext } = React; const LucideIcons = window.lucide ? window.lucide.icons : {}; const createIconComponent = (iconName, iconNode) => { return (props) => { const ref = React.useRef(null); React.useEffect(() => { if (ref.current && iconNode && iconNode.toSvg) { const svgString = iconNode.toSvg({ ...props, class: '' }); ref.current.innerHTML = svgString; const svg = ref.current.querySelector('svg'); if (svg) { if (props.className) { const existingClass = svg.getAttribute('class') || ''; svg.setAttribute('class', existingClass + ' ' + props.className); } if (props.style) { Object.assign(svg.style, props.style); } if (props.onClick) { svg.onclick = props.onClick; } } } }, [props]); return <span ref={ref} className="lucide-icon-wrapper" style={{ display: 'inline-flex', ...props.wrapperStyle }} />; }; };  Object.keys(LucideIcons).forEach(key => { if (LucideIcons[key]) { try { const descriptor = Object.getOwnPropertyDescriptor(window, key); if (!descriptor || descriptor.writable || typeof descriptor.set === 'function') { window[key] = createIconComponent(key, LucideIcons[key]); } } catch(e) {} } }); window.React = React; window.ReactDOM = ReactDOM; try { ${bundledJs} const rootEl = document.getElementById('root'); if (rootEl) { const root = ReactDOM.createRoot(rootEl); if (typeof App !== 'undefined') { root.render(<App />); } } } catch (err) { console.error("Preview Render Error:", err); }</script></body></html>`;
  }, [debouncedVfs, activeProjectId, iframeKey]);

  const downloadZip = () => {
    if (typeof JSZip === 'undefined') return;
    const zip = new JSZip();
    Object.entries(vfs).forEach(([path, content]) => zip.file(path, content));
    zip.generateAsync({type:"blob"}).then((blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zara-app-${Date.now()}.zip`;
      a.click();
    });
  };

  const simulateDeploy = () => {
    setDeployToast({show: true});
    setTimeout(() => {
      const blob = new Blob([previewSource], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setDeployToast({show: true, url: url});
    }, 1500);
  };

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data && (e.data.type === 'LOG' || e.data.type === 'ERROR')) {
        setLogs(prev => [...prev, `> [Preview] ${e.data.log}`].slice(-50));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  if (view === 'projects') {
    return (
      <div className="h-screen bg-studio-bg text-text p-6 md:p-10 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">Zara Architect</h1>
              <p className="text-text-sub">Professional AI App Builder & IDE</p>
            </div>
            <button onClick={createNewProject} className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-primary/20">+ Create Project</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(p => (
              <div key={p.id} onClick={() => loadProject(p)} className="bg-studio-panel border border-studio-border p-6 rounded-2xl hover:border-primary/50 transition-all cursor-pointer group relative">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4 shadow-sm"><Layout className="w-6 h-6" /></div>
                <h3 className="font-bold text-lg mb-1">{p.name}</h3>
                <p className="text-[10px] text-text-sub uppercase font-bold tracking-widest mb-4">Last modified: {new Date(p.updatedAt).toLocaleDateString()}</p>
                <div className="flex gap-2"><span className="text-[10px] bg-studio-bg border border-studio-border px-2 py-0.5 rounded font-black text-text-sub inline-flex items-center gap-1"><FileCode className="w-3 h-3" /> {Object.keys(p.vfs).length} Files</span></div>
                
                {/* Red Trash Icon for deletion - Matches video flow */}
                <button 
                  onClick={(e) => deleteProject(p.id, e)} 
                  className="absolute top-4 right-4 p-2.5 text-text-sub hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                  title="Delete Project"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
            {projects.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-studio-border rounded-[2.5rem] opacity-30">
                 <FolderOpen className="w-16 h-16 mx-auto mb-4" />
                 <p className="text-lg font-bold">No projects found.</p>
                 <p className="text-sm">Start your first AI-generated application.</p>
                 <button onClick={createNewProject} className="mt-6 text-primary font-bold hover:underline">Create New Project</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const PreviewComponent = () => (
    <div className={`transition-all duration-500 bg-white shadow-2xl overflow-hidden relative ${deviceMode === 'mobile' ? 'w-[375px] h-[667px] rounded-[40px] border-[12px] border-[#1a1a1a]' : 'w-full h-full rounded-2xl border border-studio-border'}`}>
      <iframe key={`${iframeKey}-${activeProjectId}`} srcDoc={previewSource} className="w-full h-full bg-white" sandbox="allow-scripts allow-modals allow-same-origin allow-forms" />
    </div>
  );

  const EditorComponent = () => (
    <div className="h-full flex flex-col relative">
      <div className="flex items-center justify-between px-4 py-2 border-b border-studio-border bg-black/20">
         <span className="text-[10px] font-black text-text-sub uppercase tracking-widest">{activeFilePath}</span>
      </div>
      <textarea 
        value={vfs[activeFilePath] || ''} 
        onChange={(e) => handleFileChange(e.target.value)}
        className="flex-1 bg-studio-bg p-8 font-mono text-[13px] leading-relaxed resize-none focus:outline-none text-text custom-scrollbar" 
        spellCheck={false}
      />
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-studio-bg text-text overflow-hidden font-sans">
      <header className="h-14 border-b border-studio-border flex items-center justify-between px-4 bg-studio-panel flex-shrink-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('projects')} className="p-2 hover:bg-studio-bg rounded-lg transition-colors text-text-sub"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20"><Cpu className="w-5 h-5 text-white" /></div>
             <div>
               <h2 className="font-bold text-sm leading-tight">{projects.find(p => p.id === activeProjectId)?.name}</h2>
               <p className="text-[9px] text-text-sub uppercase font-black tracking-widest">v1.0.2 • Zara Architect</p>
             </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex bg-studio-bg p-1 rounded-lg border border-studio-border mr-2">
              <button onClick={() => setDeviceMode('desktop')} className={`p-1.5 rounded-md transition-all ${deviceMode === 'desktop' ? 'bg-studio-panel text-primary shadow-sm' : 'text-text-sub'}`}><Monitor className="w-4 h-4" /></button>
              <button onClick={() => setDeviceMode('mobile')} className={`p-1.5 rounded-md transition-all ${deviceMode === 'mobile' ? 'bg-studio-panel text-primary shadow-sm' : 'text-text-sub'}`}><Smartphone className="w-4 h-4" /></button>
           </div>
           <button onClick={() => setIframeKey(k => k + 1)} className="p-2 text-text-sub hover:text-text" title="Hard Reload Preview"><RefreshCw className="w-4 h-4" /></button>
           <button onClick={downloadZip} className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-studio-panel border border-studio-border rounded-lg hover:border-primary transition-all"><Download className="w-4 h-4" /> Export ZIP</button>
           <button onClick={simulateDeploy} className="flex items-center gap-2 px-6 py-2 text-xs font-black bg-primary hover:bg-primary-dark text-white rounded-lg transition-all shadow-lg shadow-primary/20"><Globe className="w-4 h-4" /> Deploy</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[380px] border-r border-studio-border flex flex-col bg-studio-panel flex-shrink-0">
          <div className="flex border-b border-studio-border">
            <button onClick={() => setSidebarTab('chat')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${sidebarTab === 'chat' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-text-sub hover:bg-studio-bg'}`}><MessageSquare className="w-4 h-4" /> AI Instructions</button>
            <button onClick={() => setSidebarTab('files')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${sidebarTab === 'files' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-text-sub hover:bg-studio-bg'}`}><Files className="w-4 h-4" /> Project Files</button>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            {sidebarTab === 'chat' ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {messages.map(m => (
                    <div key={m.id} className={`flex ${m.role === Role.USER ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[90%] rounded-2xl p-4 text-sm leading-relaxed ${m.role === Role.USER ? 'bg-primary text-white' : 'bg-studio-bg border border-studio-border text-text shadow-sm'}`}>{m.text.split('<file')[0]}</div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-studio-border bg-studio-panel">
                  <div className="relative group">
                    <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder="Explain changes..." className="w-full bg-studio-bg border border-studio-border rounded-2xl p-4 pr-14 text-sm focus:outline-none focus:border-primary transition-all resize-none h-24 custom-scrollbar" />
                    <button onClick={handleSendMessage} disabled={!inputText.trim() || isBuilding} className="absolute right-3 bottom-3 p-3 rounded-xl bg-primary text-white disabled:opacity-20 hover:scale-105 active:scale-95 transition-all">{isBuilding ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden p-2 space-y-1 custom-scrollbar">
                {Object.keys(vfs).map(path => (
                  <button key={path} onClick={() => { setActiveFilePath(path); setStageView('code'); }} className={`w-full text-left px-4 py-2 rounded-lg text-xs flex items-center gap-3 transition-colors ${activeFilePath === path ? 'bg-primary/10 text-primary font-bold' : 'text-text-sub hover:bg-studio-bg'}`}>{path.endsWith('.tsx') ? <FileCode className="w-4 h-4 text-blue-400" /> : <FileJson className="w-4 h-4 text-yellow-400" />}<span className="truncate">{path}</span></button>
                ))}
              </div>
            )}
          </div>
          <div className="h-40 border-t border-studio-border bg-black/40 flex flex-col overflow-hidden flex-shrink-0">
             <div className="px-4 py-2 border-b border-studio-border flex items-center justify-between bg-white/5"><div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase text-text-sub tracking-widest"><Terminal className="w-3 h-3" /> Terminal Output</div><div className="flex gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /><div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse [animation-delay:200ms]" /></div></div>
             <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-1 custom-scrollbar">
                {logs.map((log, i) => <div key={i} className="flex gap-3 text-text-sub"><span className="opacity-20">{new Date().toLocaleTimeString([], { hour12: false })}</span><span>{log}</span></div>)}
             </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col bg-studio-bg relative overflow-hidden">
          <div className="h-12 border-b border-studio-border flex items-center px-4 justify-between bg-studio-panel/50 backdrop-blur flex-shrink-0">
             <div className="flex items-center gap-1">
                <button onClick={() => setStageView('preview')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${stageView === 'preview' ? 'bg-primary text-white shadow-lg' : 'text-text-sub hover:text-text'}`}>Live Preview</button>
                <button onClick={() => setStageView('code')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${stageView === 'code' ? 'bg-primary text-white shadow-lg' : 'text-text-sub hover:text-text'}`}>Source Editor</button>
                <button onClick={() => setStageView('split')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${stageView === 'split' ? 'bg-primary text-white shadow-lg' : 'text-text-sub hover:text-text'}`}><Columns2 className="w-3.5 h-3.5" /> Split View</button>
                <button onClick={() => setStageView('test')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${stageView === 'test' ? 'bg-emerald-500 text-white shadow-lg' : 'text-text-sub hover:text-text'}`}>Test Lab</button>
             </div>
             <button onClick={runReliabilityScan} className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all">
                <ShieldCheck className="w-3.5 h-3.5" /> RunLog
             </button>
          </div>

          <div className="flex-1 relative bg-black/20 overflow-hidden">
             <AnimatePresence mode="wait">
                {stageView === 'preview' ? (
                   <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex items-center justify-center p-8 bg-[#09090b]">
                      <PreviewComponent />
                   </motion.div>
                ) : stageView === 'code' ? (
                   <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                      <EditorComponent />
                   </motion.div>
                ) : stageView === 'split' ? (
                   <motion.div key="split" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex divide-x divide-studio-border">
                      <div className="flex-1 h-full overflow-hidden bg-studio-bg">
                         <EditorComponent />
                      </div>
                      <div className="flex-1 h-full overflow-hidden bg-black/40 flex items-center justify-center p-6">
                         <PreviewComponent />
                      </div>
                   </motion.div>
                ) : (
                   <motion.div key="test" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full flex flex-col p-8 custom-scrollbar overflow-y-auto">
                      <div className="max-w-4xl mx-auto w-full space-y-6">
                         <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl">
                            <div className="flex items-center gap-4">
                               <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400 shadow-xl shadow-emerald-500/10"><ShieldCheck className="w-8 h-8" /></div>
                               <div>
                                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Project Integrity Scan</h3>
                                  <p className="text-sm text-emerald-400/80 font-medium">Analyzing architecture for reliability and error resilience.</p>
                               </div>
                            </div>
                            <button onClick={runReliabilityScan} disabled={isAnalyzing} className="px-6 py-2.5 bg-emerald-500 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-emerald-400 transition-all disabled:opacity-50">
                               {isAnalyzing ? "Scanning..." : "Re-Analyze App"}
                            </button>
                         </div>

                         {isAnalyzing ? (
                            <div className="py-20 text-center animate-pulse">
                               <Loader2 className="w-12 h-12 mx-auto mb-4 text-emerald-500 animate-spin" />
                               <p className="text-text-sub font-mono uppercase tracking-widest text-xs">Deep Architecture Evaluation In Progress...</p>
                            </div>
                         ) : testReport ? (
                            <div className="glass-panel p-10 rounded-[2.5rem] border-white/5 markdown-body shadow-2xl">
                               <ReactMarkdown>{testReport}</ReactMarkdown>
                            </div>
                         ) : (
                            <div className="py-20 text-center glass-panel border-dashed border-2 border-white/10 rounded-[3rem] bg-white/5">
                               <ClipboardList className="w-16 h-16 mx-auto mb-4 opacity-20 text-emerald-500" />
                               <h4 className="text-lg font-bold text-text-sub">Analysis Engine Standby</h4>
                               <p className="text-sm text-text-sub/60 max-w-xs mx-auto mt-2">Generate integration tests and reliability reports to ensure your app is production-ready.</p>
                               <button onClick={runReliabilityScan} className="mt-8 px-10 py-4 bg-emerald-500 text-black font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform">Initialize Test Lab</button>
                            </div>
                         )}
                      </div>
                   </motion.div>
                )}
             </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};