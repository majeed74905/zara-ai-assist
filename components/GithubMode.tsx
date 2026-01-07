
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Github, Search, BookOpen, Code, Loader2, GitBranch, FileText, Database, Layers, Workflow, Copy, Check, Sparkles, AlertCircle, Download, File, Folder, X, Filter, AlertTriangle } from 'lucide-react';
import { analyzeGithubRepo } from '../services/gemini';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';
import { useTheme } from '../theme/ThemeContext';

/**
 * Sanitizes AI-generated Mermaid code to prevent parse errors.
 */
const sanitizeMermaid = (code: string): string => {
  let sanitized = code.trim();
  
  // 1. Fix unquoted labels on arrows that start with numbers (common hallucination)
  sanitized = sanitized.replace(/--\s*([^"\s][^->\n]*?)\s*-->/g, '-- "$1" -->');
  
  // 2. Fix double brackets
  sanitized = sanitized.replace(/\[\[(.*?)\]\]/g, '["$1"]');
  
  // 3. Ensure node labels with special characters are quoted
  sanitized = sanitized.replace(/(\w+)\[(.*?)\]/g, (match, id, label) => {
    if (!label.startsWith('"')) return `${id}["${label}"]`;
    return match;
  });

  return sanitized;
};

// --- Mermaid Component for Architectural Visualization ---
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
    
    // Configure mermaid - Removed "Inter" to prevent canvas export SecurityError
    mermaid.initialize({ 
        startOnLoad: false, 
        theme: isDark ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'sans-serif'
    });
    
    const renderDiagram = async () => {
      const sanitizedCode = sanitizeMermaid(code);
      if (!sanitizedCode) return;
      
      setIsRendering(true);
      setError(null);
      const currentId = ++renderId.current;
      
      try {
        const id = `mermaid-github-${crypto.randomUUID().replace(/-/g, '')}`;
        const { svg: renderedSvg } = await mermaid.render(id, sanitizedCode);
        
        if (currentId === renderId.current) {
          setSvg(renderedSvg);
          setIsRendering(false);
        }
      } catch (err) {
        if (currentId === renderId.current) {
          setError((err as any).message || 'Syntax Error');
          setIsRendering(false);
        }
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
        } catch (e) {
          console.error("Blueprint export failed:", e);
          alert("Export failed due to browser security restrictions.");
        }
        setIsExporting(false);
      };
      img.src = dataUrl;
    } catch (err) {
      console.error("Export failed", err);
      setIsExporting(false);
    }
  };

  return (
    <div className="my-8 overflow-hidden rounded-2xl bg-surfaceHighlight/50 border border-white/10 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3 bg-surfaceHighlight border-b border-white/5">
            <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${error ? 'bg-red-500' : 'bg-indigo-500 animate-pulse'}`} />
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">System Architecture Blueprint</span>
            </div>
            <button 
              onClick={handleDownload}
              disabled={isExporting || isRendering || !!error}
              className="flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-black text-indigo-400 hover:bg-indigo-500/10 transition-all border border-indigo-500/20 disabled:opacity-50 tracking-widest"
            >
              {isExporting ? "EXPORTING..." : <><Download className="w-3 h-3" /> EXPORT HD PNG</>}
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
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Deconstructing Logic...</span>
                </div>
            ) : (
                <div 
                  ref={containerRef}
                  className="w-full flex justify-center"
                  dangerouslySetInnerHTML={{ __html: svg }} 
                />
            )}
        </div>
    </div>
  );
};

// --- Custom Code Block for Repo Structure & Snippets ---
const MarkdownCodeBlock = ({ inline, className, children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const content = String(children).replace(/\n$/, '');
  
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    if (match[1] === 'mermaid') {
        return <MermaidDiagram code={content} />;
    }

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
        <pre className="!m-0 !p-6 !bg-transparent overflow-x-auto text-[13px] leading-relaxed font-mono custom-scrollbar">
          <code className={className} {...props}>{children}</code>
        </pre>
      </div>
    );
  }
  return <code className={`${className} bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs font-bold`} {...props}>{children}</code>;
};

interface RepoFile {
  path: string;
  type: 'blob' | 'tree';
}

export const GithubMode: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [analysisMode, setAnalysisMode] = useState<'overview' | 'implementation'>('overview');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // File Explorer State
  const [fileList, setFileList] = useState<RepoFile[]>([]);
  const [fileSearch, setFileSearch] = useState('');

  // Helper to fetch file structure from GitHub API
  const fetchGithubStructure = async (url: string): Promise<RepoFile[] | null> => {
     try {
        const cleanUrl = url.trim().replace(/\/$/, '');
        const match = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (!match) return null;
        
        const owner = match[1];
        let repo = match[2];
        if (repo.endsWith('.git')) repo = repo.slice(0, -4);

        const fetchBranch = async (branch: string): Promise<RepoFile[] | null> => {
           const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
           const response = await fetch(apiUrl);
           if (!response.ok) return null;
           const data = await response.json();
           if (!data.tree) return null;
           return data.tree.map((f: any) => ({ path: f.path, type: f.type }));
        };

        let structure = await fetchBranch('main');
        if (!structure) structure = await fetchBranch('master');
        
        return structure;
     } catch (e) {
        console.warn("GitHub API fetch failed:", e);
        return null;
     }
  };

  const handleAnalyze = async () => {
    if (!repoUrl) return;
    setIsLoading(true);
    setIsFetching(true);
    setError(null);
    setResult('');
    setFileList([]);
    
    try {
      const structure = await fetchGithubStructure(repoUrl);
      if (structure) {
         setFileList(structure);
      }
      setIsFetching(false);
      
      const manifestString = structure 
        ? structure.map(f => `${f.type === 'tree' ? '📁' : '📄'} ${f.path}`).slice(0, 300).join('\n')
        : undefined;

      const content = await analyzeGithubRepo(repoUrl, analysisMode, manifestString);
      setResult(content);
    } catch (e: any) {
      setError(e.message);
      setResult(`Analysis Failed: ${e.message}`);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  };

  const filteredFiles = useMemo(() => {
    if (!fileSearch) return fileList;
    const term = fileSearch.toLowerCase();
    return fileList.filter(f => f.path.toLowerCase().includes(term));
  }, [fileList, fileSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAnalyze();
  };

  return (
    <div className="h-full flex flex-col max-w-[1400px] mx-auto p-4 md:p-8 animate-fade-in">
      <div className="mb-10">
        <h2 className="text-4xl font-black bg-gradient-to-r from-white via-primary to-accent bg-clip-text text-transparent mb-3 tracking-tight flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-white text-black shadow-xl shadow-white/10">
             <Github className="w-8 h-8" />
          </div>
          GitHub Architect
        </h2>
        <p className="text-text-sub font-medium text-lg">Reverse engineer public repositories into real-time architectural DNA.</p>
      </div>

      <div className="flex flex-col gap-6 h-full min-h-0">
        
        {/* Search Bar & Controls */}
        <div className="glass-panel p-6 rounded-[2rem] flex flex-col md:flex-row gap-4 items-end md:items-center shadow-2xl border-white/5 relative overflow-hidden flex-shrink-0">
           <div className="absolute top-0 right-0 p-20 bg-primary/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
           
           <div className="flex-1 w-full relative z-10">
              <label className="text-[10px] font-black text-text-sub uppercase mb-2 block tracking-[0.2em] opacity-60 px-1">Repo URL</label>
              <div className="relative group">
                 <Search className="absolute left-4 top-4 w-5 h-5 text-text-sub group-focus-within:text-white transition-colors" />
                 <input 
                   value={repoUrl}
                   onChange={(e) => setRepoUrl(e.target.value)}
                   onKeyDown={handleKeyDown}
                   placeholder="https://github.com/owner/repo"
                   className="w-full bg-background border border-border rounded-2xl pl-12 pr-4 py-4 text-sm focus:border-primary/50 focus:outline-none transition-all font-mono shadow-inner group-hover:border-white/10"
                 />
              </div>
           </div>
           
           <div className="flex bg-surfaceHighlight p-1 rounded-2xl w-full md:w-auto border border-white/5 relative z-10">
              <button 
                onClick={() => setAnalysisMode('overview')}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 tracking-widest ${analysisMode === 'overview' ? 'bg-background shadow-xl text-white border border-white/10' : 'text-text-sub hover:text-text'}`}
              >
                 <BookOpen className="w-4 h-4" /> OVERVIEW
              </button>
              <button 
                onClick={() => setAnalysisMode('implementation')}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 tracking-widest ${analysisMode === 'implementation' ? 'bg-background shadow-xl text-white border border-white/10' : 'text-text-sub hover:text-text'}`}
              >
                 <Code className="w-4 h-4" /> GUIDE
              </button>
           </div>

           <button 
             onClick={handleAnalyze}
             disabled={isLoading || !repoUrl}
             className="w-full md:w-auto bg-primary hover:bg-primary-dark text-white px-10 py-4 rounded-2xl font-black transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-2xl shadow-primary/20 active:scale-95 relative z-10"
           >
             {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <GitBranch className="w-5 h-5" />}
             ANALYZE
           </button>
        </div>

        {/* Dual Layout Output Area */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          
          {/* Left: AI Analysis Output */}
          <div className="flex-1 glass-panel rounded-[2rem] p-6 md:p-10 overflow-y-auto border border-white/5 relative custom-scrollbar bg-black/20">
             {isLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/40 backdrop-blur-xl rounded-[2rem] z-20 overflow-hidden">
                   <div className="relative mb-10">
                      <div className="w-24 h-24 border-2 border-primary/20 rounded-full animate-ping absolute inset-0" />
                      <div className="w-24 h-24 border-b-2 border-primary rounded-full animate-spin relative z-10" />
                      <Sparkles className="w-10 h-10 text-primary absolute inset-0 m-auto animate-pulse" />
                   </div>
                   <div className="text-center space-y-4 max-w-md px-6">
                      <p className="text-2xl font-black text-white tracking-tight uppercase italic">
                         {isFetching ? "Crawling GitHub API" : "Deconstructing Project"}
                      </p>
                      <div className="flex items-center justify-center gap-2 text-primary font-mono text-[10px] tracking-[0.3em] font-black">
                         <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                         <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                         <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                         <span className="ml-2 uppercase">{isFetching ? "Building Manifest" : "Real-time Synthesis"}</span>
                      </div>
                   </div>
                </div>
             ) : null}

             {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 animate-fade-in">
                   <AlertCircle className="w-5 h-5 flex-shrink-0" />
                   <p className="text-sm font-bold">Live Fetch Failed: {error}. Using general model knowledge.</p>
                </div>
             )}

             {result ? (
                <div className="markdown-body prose prose-invert max-w-none animate-fade-in">
                   <ReactMarkdown components={{ code: MarkdownCodeBlock }}>{result}</ReactMarkdown>
                </div>
             ) : (
                <div className="h-full flex flex-col items-center justify-center text-text-sub/20">
                   <div className="w-20 h-20 bg-surfaceHighlight rounded-3xl flex items-center justify-center mb-6">
                      <Layers className="w-10 h-10 opacity-50" />
                   </div>
                   <p className="text-lg font-medium">Architectural Analysis Blueprint</p>
                   <p className="text-sm mt-2">Enter a URL to generate deconstruction reports.</p>
                </div>
             )}
          </div>

          {/* Right: Interactive File Explorer */}
          {(fileList.length > 0 || isLoading) && (
            <div className="w-full lg:w-[350px] glass-panel rounded-[2rem] border border-white/5 bg-black/30 flex flex-col overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-white/5 bg-white/5 flex flex-col gap-4 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-text uppercase tracking-[0.2em] flex items-center gap-2">
                    <Layers className="w-3 h-3 text-primary" /> Repository Manifest
                  </h3>
                  <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full">{fileList.length} Nodes</span>
                </div>
                
                <div className="relative group">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-sub group-focus-within:text-white transition-colors" />
                  <input 
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    placeholder="Search files..."
                    className="w-full bg-background/50 border border-border rounded-xl pl-9 pr-8 py-2 text-xs text-text focus:border-primary/50 focus:outline-none transition-all placeholder:text-[10px] placeholder:uppercase placeholder:tracking-widest"
                  />
                  {fileSearch && (
                    <button 
                      onClick={() => setFileSearch('')}
                      className="absolute right-3 top-2.5 text-text-sub hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                {filteredFiles.length > 0 ? (
                  <div className="space-y-1">
                    {filteredFiles.map((file, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-all group cursor-default"
                      >
                        {file.type === 'tree' ? (
                          <Folder className="w-3.5 h-3.5 text-blue-400 fill-blue-400/10" />
                        ) : (
                          <File className="w-3.5 h-3.5 text-gray-400" />
                        )}
                        <span className="text-xs text-text-sub group-hover:text-white font-mono truncate">
                          {file.path.split('/').pop()}
                        </span>
                        <div className="flex-1" />
                        <span className="text-[8px] text-text-sub opacity-0 group-hover:opacity-40 transition-opacity font-mono uppercase">
                          {file.path.split('.').pop()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 text-center px-6">
                    <Filter className="w-8 h-8 mb-4" />
                    <p className="text-[10px] uppercase font-black tracking-widest">No nodes match your filter</p>
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-surfaceHighlight/30 border-t border-white/5 text-[9px] text-text-sub font-mono uppercase flex justify-between tracking-widest">
                 <span>Source: LIVE API</span>
                 <span className="text-primary animate-pulse">V3.1 ENGINE</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
