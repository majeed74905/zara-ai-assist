
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Github, Search, BookOpen, Code, Loader2, GitBranch, FileText, Database, Layers, Workflow, Copy, Check, Sparkles, AlertCircle, Download, File, Folder, X, Filter, AlertTriangle, Mic, Play, Pause, Volume2, Radio, MessageSquare, Send, Bot, User as UserIcon } from 'lucide-react';
import { analyzeGithubRepo, generateSpeech, sendGithubChatStream } from '../services/gemini';
import { base64ToUint8Array, decodeAudioData } from '../utils/audioUtils';
import { Message, Role } from '../types';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';
import { useTheme } from '../theme/ThemeContext';

/**
 * Sanitizes AI-generated Mermaid code to prevent parse errors.
 */
const sanitizeMermaid = (code: string): string => {
  let sanitized = code.trim();
  sanitized = sanitized.replace(/--\s*([^"\s][^->\n]*?)\s*-->/g, '-- "$1" -->');
  sanitized = sanitized.replace(/\[\[(.*?)\]\]/g, '["$1"]');
  sanitized = sanitized.replace(/(\w+)\[(.*?)\]/g, (match, id, label) => {
    if (!label.startsWith('"')) return `${id}["${label}"]`;
    return match;
  });
  return sanitized;
};

const MermaidDiagram = ({ code }: { code: string }) => {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { currentThemeName } = useTheme();
  const renderId = useRef(0);

  useEffect(() => {
    const isDark = !['light', 'glass', 'pastel'].includes(currentThemeName);
    mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default', securityLevel: 'loose', fontFamily: 'sans-serif' });
    const renderDiagram = async () => {
      const sanitizedCode = sanitizeMermaid(code);
      if (!sanitizedCode) return;
      setIsRendering(true);
      setError(null);
      const currentId = ++renderId.current;
      try {
        const id = `mermaid-github-${crypto.randomUUID().replace(/-/g, '')}`;
        const { svg: renderedSvg } = await mermaid.render(id, sanitizedCode);
        if (currentId === renderId.current) { setSvg(renderedSvg); setIsRendering(false); }
      } catch (err) {
        if (currentId === renderId.current) { setError((err as any).message || 'Syntax Error'); setIsRendering(false); }
      }
    };
    renderDiagram();
  }, [code, currentThemeName]);

  const handleDownload = async () => {
    if (!containerRef.current) return;
    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;
    setIsExporting(true);
    try {
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      clonedSvg.setAttribute('style', 'background-color: transparent; font-family: sans-serif;');
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const scale = 2;
      const bcr = svgElement.getBoundingClientRect();
      const width = bcr.width || 1200;
      const height = bcr.height || 800;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const base64Svg = btoa(unescape(encodeURIComponent(svgData)));
      const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (!ctx) return;
        const isDark = !['light', 'glass', 'pastel'].includes(currentThemeName);
        ctx.fillStyle = isDark ? '#09090b' : '#ffffff'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);
        try {
          const pngUrl = canvas.toDataURL('image/png', 1.0);
          const downloadLink = document.createElement('a');
          downloadLink.href = pngUrl;
          downloadLink.download = `architecture-${Date.now()}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        } catch (e) { alert("Export failed due to browser security restrictions."); }
        setIsExporting(false);
      };
      img.src = dataUrl;
    } catch (err) { setIsExporting(false); }
  };

  return (
    <div className="my-8 overflow-hidden rounded-2xl bg-surfaceHighlight/50 border border-white/10 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3 bg-surfaceHighlight border-b border-white/5">
            <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${error ? 'bg-red-500' : 'bg-indigo-500 animate-pulse'}`} />
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Architectural Blueprint</span>
            </div>
            <button onClick={handleDownload} disabled={isExporting || isRendering || !!error} className="flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-black text-indigo-400 hover:bg-indigo-500/10 transition-all border border-indigo-500/20 disabled:opacity-50 tracking-widest">
              {isExporting ? "EXPORTING..." : <><Download className="w-3 h-3" /> EXPORT PNG</>}
            </button>
        </div>
        <div className="p-8 flex justify-center overflow-x-auto custom-scrollbar min-h-[150px]">
            {error ? (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 rounded-xl border border-red-500/20 text-red-500">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="text-xs font-mono">{error}</span>
                </div>
            ) : isRendering ? (
                <div className="flex items-center gap-3 py-10 opacity-40">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Deconstructing...</span>
                </div>
            ) : (
                <div ref={containerRef} className="w-full flex justify-center" dangerouslySetInnerHTML={{ __html: svg }} />
            )}
        </div>
    </div>
  );
};

const MarkdownCodeBlock = ({ inline, className, children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const content = String(children).replace(/\n$/, '');
  const handleCopy = () => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  if (!inline && match) {
    if (match[1] === 'mermaid') return <MermaidDiagram code={content} />;
    return (
      <div className="relative group my-6 rounded-xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-2.5 bg-surfaceHighlight border-b border-white/5">
           <div className="flex items-center gap-2">
              <Code className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] text-text-sub font-black uppercase tracking-wider">{match[1]}</span>
           </div>
           <button onClick={handleCopy} className="flex items-center gap-1.5 text-[10px] font-bold text-text-sub hover:text-white transition-colors">
             {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
             {copied ? 'COPIED' : 'COPY'}
           </button>
        </div>
        <pre className="!m-0 !p-6 !bg-transparent overflow-x-auto text-[13px] leading-relaxed font-mono custom-scrollbar"><code className={className} {...props}>{children}</code></pre>
      </div>
    );
  }
  return <code className={`${className} bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs font-bold`} {...props}>{children}</code>;
};

const PodcastPlayer = ({ script }: { script: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const handlePlay = async () => {
    if (isPlaying) {
      if (audioSourceRef.current) { audioSourceRef.current.stop(); audioSourceRef.current = null; }
      setIsPlaying(false);
      return;
    }
    setIsLoading(true);
    try {
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const base64Audio = await generateSpeech(script, 'Kore');
      const audioBytes = base64ToUint8Array(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current, 24000, 1);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
      audioSourceRef.current = source;
      setIsPlaying(true);
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-3xl p-6 my-8 animate-fade-in relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-10"><Radio className="w-24 h-24 text-indigo-400" /></div>
      <div className="relative z-10 flex items-center gap-6">
        <button onClick={handlePlay} disabled={isLoading} className="w-20 h-20 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center shadow-2xl shadow-indigo-500/40 transition-all hover:scale-110 active:scale-95 disabled:opacity-50">
           {isLoading ? <Loader2 className="w-10 h-10 animate-spin" /> : isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-2" />}
        </button>
        <div>
           <h3 className="text-xl font-black text-white italic tracking-tight mb-1">DEEP DIVE: ARCHITECTURAL REVIEW</h3>
           <p className="text-sm text-indigo-200/70 mb-4 font-medium tracking-wide">Alex & Sam analyze the technical DNA of this project.</p>
           <div className="flex gap-2">
              <span className="px-2 py-1 rounded bg-indigo-500/20 text-[10px] font-black text-indigo-300 uppercase tracking-widest border border-indigo-500/30">Podcast Active</span>
              <span className="px-2 py-1 rounded bg-purple-500/20 text-[10px] font-black text-purple-300 uppercase tracking-widest border border-purple-500/30">AI Narrated</span>
           </div>
        </div>
      </div>
      <div className="mt-8 bg-black/40 rounded-2xl p-6 border border-white/5 max-h-60 overflow-y-auto custom-scrollbar text-sm leading-relaxed text-indigo-100/80 italic font-medium">
         <ReactMarkdown>{script}</ReactMarkdown>
      </div>
    </div>
  );
};

interface RepoFile { path: string; type: 'blob' | 'tree'; }

export const GithubMode: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileList, setFileList] = useState<RepoFile[]>([]);
  const [fileSearch, setFileSearch] = useState('');

  // Chat State
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchGithubStructure = async (url: string): Promise<RepoFile[] | null> => {
     try {
        const cleanUrl = url.trim().replace(/\/$/, '');
        const match = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (!match) return null;
        const owner = match[1]; let repo = match[2];
        if (repo.endsWith('.git')) repo = repo.slice(0, -4);
        const fetchBranch = async (branch: string): Promise<RepoFile[] | null> => {
           const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
           const response = await fetch(apiUrl);
           if (!response.ok) return null;
           const data = await response.json();
           return data.tree?.map((f: any) => ({ path: f.path, type: f.type })) || null;
        };
        let structure = await fetchBranch('main') || await fetchBranch('master');
        return structure;
     } catch (e) { return null; }
  };

  const handleAnalyze = async () => {
    if (!repoUrl) return;
    setIsLoading(true); setIsFetching(true); setError(null); setResult(''); setFileList([]); setChatMessages([]);
    try {
      const structure = await fetchGithubStructure(repoUrl);
      if (structure) setFileList(structure);
      setIsFetching(false);
      const manifestString = structure ? structure.map(f => `${f.type === 'tree' ? '📁' : '📄'} ${f.path}`).slice(0, 300).join('\n') : undefined;
      const content = await analyzeGithubRepo(repoUrl, 'overview', manifestString);
      setResult(content);
      
      // Start initial chat message
      setChatMessages([{
         id: crypto.randomUUID(),
         role: Role.MODEL,
         text: "Analysis complete! I've deconstructed the codebase into documentation, architecture, and a podcast overview. Do you have any specific doubts or questions about these files?",
         timestamp: Date.now()
      }]);
    } catch (e: any) { setError(e.message); setResult(`Analysis Failed: ${e.message}`); }
    finally { setIsLoading(false); setIsFetching(false); }
  };

  const handleSendChat = async () => {
     if (!chatInput.trim() || isChatting) return;
     const userMsg: Message = { id: crypto.randomUUID(), role: Role.USER, text: chatInput, timestamp: Date.now() };
     const newHistory = [...chatMessages, userMsg];
     setChatMessages(newHistory);
     setChatInput('');
     setIsChatting(true);

     const botMsgId = crypto.randomUUID();
     setChatMessages(prev => [...prev, { id: botMsgId, role: Role.MODEL, text: '', timestamp: Date.now(), isStreaming: true }]);

     try {
        const manifest = fileList.map(f => `${f.type === 'tree' ? '📁' : '📄'} ${f.path}`).slice(0, 500).join('\n');
        await sendGithubChatStream(repoUrl, manifest, newHistory, userMsg.text, (partial) => {
           setChatMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: partial } : m));
        });
        setChatMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, isStreaming: false } : m));
     } catch (e: any) {
        setChatMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: `Error: ${e.message}`, isError: true, isStreaming: false } : m));
     } finally {
        setIsChatting(false);
     }
  };

  useEffect(() => {
     chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const filteredFiles = useMemo(() => {
    if (!fileSearch) return fileList;
    const term = fileSearch.toLowerCase();
    return fileList.filter(f => f.path.toLowerCase().includes(term));
  }, [fileList, fileSearch]);

  const outputs = useMemo(() => {
    if (!result) return null;
    const docPart = result.split('### OUTPUT 2')[0] || '';
    const flowPartMatch = result.match(/```mermaid[\s\S]*?```/);
    const flowPart = flowPartMatch ? flowPartMatch[0] : '';
    const scriptPart = result.split('### OUTPUT 3')[1] || '';
    return { docPart, flowPart, scriptPart };
  }, [result]);

  return (
    <div className="h-full flex flex-col max-w-[1400px] mx-auto p-4 md:p-8 animate-fade-in overflow-y-auto custom-scrollbar">
      <div className="mb-12">
        <h2 className="text-5xl font-black bg-gradient-to-r from-white via-indigo-400 to-primary bg-clip-text text-transparent mb-4 tracking-tighter flex items-center gap-5">
          <div className="p-4 rounded-3xl bg-white text-black shadow-2xl shadow-white/10 rotate-3"><Github className="w-10 h-10" /></div>
          GitHub Architect
        </h2>
        <p className="text-text-sub font-medium text-xl max-w-2xl">Deconstruct complex codebases into blueprints, docs, and AI podcasts.</p>
      </div>

      <div className="flex flex-col gap-8 h-full min-h-0">
        <div className="glass-panel p-8 rounded-[2.5rem] flex flex-col md:flex-row gap-6 items-end md:items-center shadow-2xl border-white/5 relative overflow-hidden bg-white/5 backdrop-blur-xl">
           <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
           <div className="flex-1 w-full relative z-10">
              <label className="text-[10px] font-black text-indigo-400 uppercase mb-3 block tracking-[0.3em] px-2">REPOSITORY URL</label>
              <div className="relative group">
                 <Search className="absolute left-5 top-5 w-6 h-6 text-text-sub group-focus-within:text-white transition-colors" />
                 <input 
                   value={repoUrl} 
                   onChange={(e) => setRepoUrl(e.target.value)} 
                   onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()} 
                   placeholder="https://github.com/owner/repo" 
                   className="w-full bg-background/50 border border-white/10 rounded-[2rem] pl-16 pr-6 py-5 text-lg focus:border-indigo-500/50 focus:outline-none transition-all font-mono shadow-inner group-hover:border-white/20 text-text" 
                 />
              </div>
           </div>
           <button onClick={handleAnalyze} disabled={isLoading || !repoUrl} className="w-full md:w-auto bg-indigo-500 hover:bg-indigo-400 text-white px-12 py-5 rounded-[2rem] font-black text-lg transition-all disabled:opacity-50 flex items-center justify-center gap-4 shadow-2xl shadow-indigo-500/30 active:scale-95 relative z-10">
             {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <GitBranch className="w-6 h-6" />}
             ANALYZE
           </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0 pb-12">
          <div className="flex-1 space-y-8">
             {isLoading && (
                <div className="glass-panel rounded-[2.5rem] p-20 flex flex-col items-center justify-center bg-black/40 border-white/5 animate-pulse">
                   <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-6" />
                   <p className="text-xl font-black text-white uppercase tracking-widest italic">Architecting Logic...</p>
                </div>
             )}

             {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500"><AlertCircle className="w-5 h-5" /><p className="text-sm font-bold">{error}</p></div>}

             {outputs && !isLoading && (
                <div className="animate-fade-in space-y-12">
                   {outputs.scriptPart && <PodcastPlayer script={outputs.scriptPart} />}
                   <div className="glass-panel rounded-[2.5rem] p-10 border border-white/5 bg-black/20 markdown-body prose prose-invert max-w-none">
                      <ReactMarkdown components={{ code: MarkdownCodeBlock }}>{outputs.docPart}</ReactMarkdown>
                   </div>

                   {/* Chat Section */}
                   <div className="glass-panel rounded-[2.5rem] p-8 border border-indigo-500/30 bg-indigo-500/5 shadow-xl animate-slide-up">
                      <h3 className="text-xl font-black text-indigo-400 mb-6 flex items-center gap-3">
                         <MessageSquare className="w-6 h-6" />
                         CLEAR YOUR DOUBTS
                      </h3>
                      <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar p-4 bg-black/40 rounded-2xl mb-6">
                         {chatMessages.map((msg, i) => (
                            <div key={i} className={`flex gap-4 ${msg.role === Role.USER ? 'flex-row-reverse' : ''}`}>
                               <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${msg.role === Role.USER ? 'bg-primary' : 'bg-indigo-500/20 text-indigo-400'}`}>
                                  {msg.role === Role.USER ? <UserIcon className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                               </div>
                               <div className={`p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed ${msg.role === Role.USER ? 'bg-primary text-white rounded-tr-sm' : 'bg-surfaceHighlight text-text-sub rounded-tl-sm'}`}>
                                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                                  {msg.isStreaming && <span className="inline-block w-2 h-2 rounded-full bg-indigo-400 ml-1 animate-pulse" />}
                               </div>
                            </div>
                         ))}
                         <div ref={chatEndRef} />
                      </div>
                      <div className="relative group">
                         <input 
                           value={chatInput} 
                           onChange={e => setChatInput(e.target.value)}
                           onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                           placeholder="Ask about specific files, logic, or tech choices..." 
                           className="w-full bg-background/50 border border-white/10 rounded-2xl pl-6 pr-16 py-4 focus:border-indigo-500 focus:outline-none transition-all text-sm group-hover:border-white/20 text-text"
                         />
                         <button 
                           onClick={handleSendChat}
                           disabled={isChatting || !chatInput.trim()}
                           className="absolute right-2 top-2 p-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-400 transition-all disabled:opacity-50 active:scale-95"
                         >
                            {isChatting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                         </button>
                      </div>
                   </div>
                </div>
             )}

             {!result && !isLoading && (
                <div className="h-96 flex flex-col items-center justify-center text-text-sub/20 glass-panel rounded-[2.5rem] border-dashed border-2 border-white/5">
                   <Layers className="w-20 h-20 mb-6 opacity-30" />
                   <p className="text-xl font-black uppercase tracking-[0.2em]">Blueprint Standby</p>
                </div>
             )}
          </div>

          {(fileList.length > 0 || isLoading) && (
            <div className="w-full lg:w-[400px] glass-panel rounded-[2.5rem] border border-white/5 bg-white/5 flex flex-col overflow-hidden h-fit sticky top-0">
              <div className="p-8 border-b border-white/5 bg-white/5 flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em] flex items-center gap-3"><Layers className="w-4 h-4" /> REPOSITORY NODES</h3>
                  <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20">{fileList.length} Files</span>
                </div>
                <div className="relative group">
                  <Search className="absolute left-4 top-3 w-4 h-4 text-text-sub group-focus-within:text-white transition-colors" />
                  <input 
                    value={fileSearch} 
                    onChange={(e) => setFileSearch(e.target.value)} 
                    placeholder="SEARCH NODES..." 
                    className="w-full bg-background/50 border border-white/10 rounded-xl pl-11 pr-8 py-3 text-xs text-text focus:border-indigo-500/50 focus:outline-none transition-all placeholder:text-[9px] placeholder:font-black placeholder:tracking-widest" 
                  />
                </div>
              </div>
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar p-6">
                <div className="space-y-1.5">
                  {filteredFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-4 px-4 py-2.5 rounded-xl hover:bg-white/5 transition-all group cursor-default border border-transparent hover:border-white/5">
                      {file.type === 'tree' ? <Folder className="w-4 h-4 text-indigo-400 fill-indigo-400/10" /> : <File className="w-4 h-4 text-gray-500" />}
                      <span className="text-[13px] text-text-sub group-hover:text-white font-mono truncate">{file.path.split('/').pop()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-indigo-500/5 border-t border-white/5 text-[10px] text-indigo-400 font-mono font-black uppercase flex justify-center tracking-widest animate-pulse">ANALYSIS ENGINE V3.0 PRO</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
