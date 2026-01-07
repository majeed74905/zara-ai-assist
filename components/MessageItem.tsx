
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Role, Message } from '../types';
import { Bot, User, FileText, ExternalLink, Volume2, Square, Copy, Check, Pencil, Download, WifiOff, Workflow, FileDown, AlertTriangle, Loader2 } from 'lucide-react';
import mermaid from 'mermaid';
import { useTheme } from '../theme/ThemeContext';

interface MessageItemProps {
  message: Message;
  onEdit?: (message: Message) => void;
}

/**
 * Sanitizes AI-generated Mermaid code to prevent parse errors.
 */
const sanitizeMermaid = (code: string): string => {
  let sanitized = code.trim();
  
  // 1. Fix unquoted labels on arrows that start with numbers (causes 'got 1' errors)
  // e.g., -- 1. Step --> becomes -- "1. Step" -->
  sanitized = sanitized.replace(/--\s*([^"\s][^->\n]*?)\s*-->/g, '-- "$1" -->');
  
  // 2. Fix double brackets which AI often uses for "important" nodes but is invalid in most Mermaid types
  // e.g., node[[Text]] becomes node[Text]
  sanitized = sanitized.replace(/\[\[(.*?)\]\]/g, '["$1"]');
  
  // 3. Ensure node labels with special characters are quoted
  // e.g., A[Text (Part 1)] becomes A["Text (Part 1)"]
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
    
    // Configure mermaid - Loose security to allow initialization headers for backgrounds
    mermaid.initialize({ 
        startOnLoad: false, 
        theme: 'base', // Default to base to allow AI-provided themeVariables to work
        securityLevel: 'loose',
        fontFamily: 'sans-serif',
        themeVariables: {
          background: '#ffffff', // Explicitly white background as requested
          primaryColor: '#f8fafc',
          primaryTextColor: '#0f172a',
          primaryBorderColor: '#cbd5e1',
          lineColor: '#64748b'
        },
        flowchart: {
            htmlLabels: true,
            curve: 'basis',
            useMaxWidth: true
        }
    });
    
    const renderDiagram = async () => {
      const sanitizedCode = sanitizeMermaid(code);
      if (!sanitizedCode) return;
      
      setIsRendering(true);
      setError(null);
      const currentId = ++renderId.current;
      
      try {
        const id = `mermaid-svg-${crypto.randomUUID().replace(/-/g, '')}`;
        const { svg: renderedSvg } = await mermaid.render(id, sanitizedCode);
        
        if (currentId === renderId.current) {
          setSvg(renderedSvg);
          setIsRendering(false);
        }
      } catch (err) {
        if (currentId === renderId.current) {
          console.error('Mermaid render error:', err);
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
      // Create clone to avoid modifying the UI element
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      
      // Crucial: Inline common styles to ensure export works without global CSS
      clonedSvg.setAttribute('style', 'background-color: #ffffff; font-family: sans-serif;');
      
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      const scale = 2; // Reduced scale slightly for better compatibility
      const bcr = svgElement.getBoundingClientRect();
      const width = bcr.width || 800;
      const height = bcr.height || 600;
      
      canvas.width = width * scale;
      canvas.height = height * scale;

      // Use Base64 instead of Blob URL to avoid some cross-origin security quirks in specific browsers
      const base64Svg = btoa(unescape(encodeURIComponent(svgData)));
      const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;

      img.crossOrigin = "anonymous"; // Prevent tainting
      img.onload = () => {
        if (!ctx) return;
        // Always export with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);
        
        try {
          const pngUrl = canvas.toDataURL('image/png', 1.0);
          const downloadLink = document.createElement('a');
          downloadLink.href = pngUrl;
          downloadLink.download = `zara-diagram-${Date.now()}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        } catch (e) {
          console.error("Canvas export failed:", e);
          alert("Could not export as image due to browser security restrictions. Please try copying the code instead.");
        }
        setIsExporting(false);
      };
      
      img.onerror = () => {
        console.error("Image loading failed for canvas draw");
        setIsExporting(false);
      };

      img.src = dataUrl;
    } catch (err) {
      console.error("Export failed", err);
      setIsExporting(false);
    }
  };

  return (
    <div className="my-4 overflow-hidden rounded-xl bg-white border border-border shadow-lg animate-scale-in">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
                <Workflow className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Logic Visualization</span>
            </div>
            <div className="flex items-center gap-2">
                {isRendering && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
                <button 
                  onClick={handleDownload}
                  disabled={isExporting || isRendering || !!error}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                  title="Download HD Image"
                >
                  {isExporting ? "EXPORTING..." : <><Download className="w-3 h-3" /> DOWNLOAD HD</>}
                </button>
            </div>
        </div>
        
        <div className="p-4 flex justify-center overflow-x-auto custom-scrollbar min-h-[100px] bg-white">
            {error ? (
                <div className="flex flex-col items-center gap-3 p-6 text-center max-w-md">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-900 mb-1">Diagram Syntax Error</p>
                        <p className="text-xs text-slate-500 line-clamp-3 font-mono bg-slate-100 p-2 rounded">{error}</p>
                    </div>
                    <button 
                        onClick={() => navigator.clipboard.writeText(code)}
                        className="text-[10px] font-bold text-indigo-600 hover:underline uppercase"
                    >
                        Copy Raw Code to Fix
                    </button>
                </div>
            ) : isRendering ? (
                <div className="flex flex-col items-center justify-center py-8 opacity-20">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Architecting...</span>
                </div>
            ) : (
                <div 
                    ref={containerRef}
                    className="w-full flex justify-center bg-white"
                    dangerouslySetInnerHTML={{ __html: svg }} 
                />
            )}
        </div>
    </div>
  );
};

// Custom Code Block Component
const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  
  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    if (match[1] === 'mermaid') {
        return <MermaidDiagram code={String(children).replace(/\n$/, '')} />;
    }

    return (
      <div className="relative group my-4 rounded-lg overflow-hidden border border-white/10 bg-[#1e1e1e] animate-scale-in">
        <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-white/5">
           <span className="text-xs text-gray-400 font-mono">{match[1]}</span>
           <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
             {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
             {copied ? 'Copied' : 'Copy code'}
           </button>
        </div>
        <pre className="!m-0 !p-4 !bg-transparent overflow-x-auto">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  }
  return <code className={`${className} bg-primary/10 text-primary px-1.5 py-0.5 rounded text-sm`} {...props}>{children}</code>;
};

export const MessageItem: React.FC<MessageItemProps> = ({ message, onEdit }) => {
  const isUser = message.role === Role.USER;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSpeaking]);

  const handleSpeak = () => {
    // Cancel any current speech
    window.speechSynthesis.cancel();

    // Simple markdown stripping for better speech
    const cleanText = message.text
      .replace(/[*_#`]/g, '') // Remove basic markdown symbols
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with just text
      .replace(/\[.*?\]/g, ''); // Remove tone tags like [Softly], [Laughs]

    const newUtterance = new SpeechSynthesisUtterance(cleanText);
    
    // Attempt to select a better voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) 
                        || voices.find(v => v.lang.startsWith('en'));
    if (preferredVoice) newUtterance.voice = preferredVoice;

    newUtterance.rate = speed;
    
    newUtterance.onend = () => {
      setIsSpeaking(false);
      setUtterance(null);
    };

    newUtterance.onerror = () => {
      setIsSpeaking(false);
      setUtterance(null);
    };

    setUtterance(newUtterance);
    setIsSpeaking(true);
    window.speechSynthesis.speak(newUtterance);
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setUtterance(null);
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2, 0.75];
    const nextIndex = (speeds.indexOf(speed) + 1) % speeds.length;
    const newSpeed = speeds[nextIndex];
    setSpeed(newSpeed);
    
    // If currently speaking, we need to restart to apply speed change in most browsers
    if (isSpeaking && utterance) {
       window.speechSynthesis.cancel();
       const newUtt = new SpeechSynthesisUtterance(utterance.text);
       newUtt.voice = utterance.voice;
       newUtt.rate = newSpeed;
       newUtt.onend = () => { setIsSpeaking(false); setUtterance(null); };
       setUtterance(newUtt);
       window.speechSynthesis.speak(newUtt);
    }
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group animate-slide-up`}>
      <div className={`flex max-w-[95%] md:max-w-[80%] gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border border-border ${isUser ? 'bg-surfaceHighlight' : message.isOffline ? 'bg-orange-500/10 border-orange-500/30' : 'bg-transparent'} transition-transform duration-300 hover:scale-110`}>
          {isUser ? (
            <User className="w-5 h-5 text-text" />
          ) : (
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm ${message.isOffline ? 'bg-orange-500' : 'bg-gradient-to-br from-primary to-accent'}`}>
                {message.isOffline ? <WifiOff className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-white" />}
            </div>
          )}
        </div>

        {/* Content Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full min-w-0`}>
          
          {/* Metadata/Name */}
          <span className="text-xs text-text-sub mb-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            {isUser ? 'You' : 'Zara AI'}
            {!isUser && message.isOffline && (
                <span className="text-[10px] bg-orange-500/10 text-orange-500 px-1.5 rounded">OFFLINE</span>
            )}
          </span>

          {/* Attachments Display */}
          {message.attachments && message.attachments.length > 0 && (
            <div className={`flex flex-wrap gap-2 mb-2 ${isUser ? 'justify-end' : 'justify-start'} animate-scale-in`}>
              {message.attachments.map((att) => {
                const isImage = att.mimeType.startsWith('image/');
                const isPdf = att.mimeType === 'application/pdf';
                const isText = att.mimeType.startsWith('text/') || 
                               att.mimeType === 'application/json' || 
                               ['.ts', '.tsx', '.js', '.jsx', '.py', '.md', '.txt'].some(ext => att.file.name.endsWith(ext));

                return (
                  <div 
                    key={att.id} 
                    className={`relative group overflow-hidden rounded-xl border border-border bg-surfaceHighlight/30 transition-all hover:border-primary/30 ${
                      isPdf || isText ? 'w-full max-w-2xl' : ''
                    }`}
                  >
                    {/* Header (for PDF and Text) */}
                    {(isPdf || isText) && (
                      <div className="flex items-center justify-between p-3 border-b border-border bg-surfaceHighlight/50">
                         <div className="flex items-center gap-2.5 overflow-hidden px-1">
                            {isPdf ? <div className="p-1.5 bg-red-500/10 rounded-lg"><FileText className="w-4 h-4 text-red-500" /></div> : <div className="p-1.5 bg-blue-500/10 rounded-lg"><FileText className="w-4 h-4 text-blue-500" /></div>}
                            <div className="flex flex-col truncate">
                              <span className="text-[12px] font-bold text-text truncate">
                                {att.file.name}
                              </span>
                              <span className="text-[9px] text-text-sub uppercase tracking-wider font-bold">
                                {isPdf ? 'PDF Document' : 'Text File'}
                              </span>
                            </div>
                         </div>
                         <div className="flex items-center gap-1">
                            <a 
                              href={att.previewUrl} 
                              download={att.file.name} 
                              className="p-2 hover:bg-surface rounded-xl text-text-sub hover:text-text transition-all bg-surface/40 border border-transparent hover:border-border" 
                              title="Download File"
                            >
                               <FileDown className="w-4 h-4" />
                            </a>
                         </div>
                      </div>
                    )}

                    {/* Content Preview */}
                    {isImage ? (
                      <img src={att.previewUrl} alt="attachment" className="h-32 w-auto object-cover transition-transform hover:scale-105" />
                    ) : isText ? (
                      <div className="p-3 bg-black/40 font-mono text-[10px] text-text-sub leading-relaxed max-h-40 overflow-y-auto custom-scrollbar select-all">
                         {(() => {
                            try {
                              const decoded = atob(att.base64);
                              return decoded.length > 2000 ? decoded.substring(0, 2000) + '...' : decoded;
                            } catch(e) {
                              return 'Error previewing text content.';
                            }
                         })()}
                      </div>
                    ) : isPdf ? (
                       <div className="w-full h-[500px] bg-white overflow-hidden border-t border-border relative">
                          <object
                            data={att.previewUrl}
                            type="application/pdf"
                            className="w-full h-full block"
                          >
                            <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-surfaceHighlight/10">
                               <FileText className="w-16 h-16 text-text-sub/20 mb-4" />
                               <p className="text-sm font-medium text-text-sub mb-4">Preview not available in this browser.</p>
                               <a 
                                 href={att.previewUrl} 
                                 target="_blank" 
                                 rel="noopener noreferrer"
                                 className="px-6 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                               >
                                 Open in New Tab
                               </a>
                            </div>
                          </object>
                       </div>
                    ) : (
                      // Fallback for unknown files
                      <div className="h-16 w-32 flex flex-col items-center justify-center p-2">
                        <FileText className="w-6 h-6 text-text-sub mb-1" />
                        <span className="text-[9px] text-text-sub truncate w-full text-center">
                          {att.file.name}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-end gap-2 max-w-full">
             {/* Edit Button (User only) */}
             {isUser && onEdit && (
               <button 
                 onClick={() => onEdit(message)}
                 className="p-1.5 text-text-sub hover:text-text bg-surfaceHighlight hover:bg-surface border border-transparent hover:border-border rounded-full opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                 title="Edit message"
               >
                 <Pencil className="w-3.5 h-3.5" />
               </button>
             )}

            {/* Text Content */}
            <div
              className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm overflow-hidden transition-all hover:shadow-md ${
                isUser
                  ? 'bg-surfaceHighlight text-text rounded-tr-sm border border-white/5'
                  : message.isOffline
                    ? 'bg-orange-500/5 text-text-sub w-full markdown-body border border-orange-500/10'
                    : 'bg-transparent text-text-sub w-full markdown-body'
              }`}
            >
              {isUser ? (
                <div className="whitespace-pre-wrap">{message.text}</div>
              ) : (
                 <div className="relative">
                   <ReactMarkdown 
                     components={{
                       code: CodeBlock
                     }}
                   >
                     {message.text}
                   </ReactMarkdown>
                   {/* Streaming Cursor */}
                   {message.isStreaming && (
                     <span className="inline-block w-2.5 h-2.5 rounded-full bg-text-sub ml-1 animate-pulse align-baseline" />
                   )}
                 </div>
              )}
              
              {message.isError && (
                 <p className="text-red-400 text-sm mt-2 animate-pulse">Error sending message.</p>
              )}
            </div>
          </div>

          {/* Sources / Grounding */}
          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="mt-2 ml-1 mb-2 animate-slide-up delay-100">
              <div className="flex wrap gap-2">
                {message.sources.map((source, idx) => (
                  <a 
                    key={idx}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-surfaceHighlight border border-border hover:bg-surface hover:border-primary/50 text-text-sub hover:text-primary px-3 py-1.5 rounded-full text-xs transition-all max-w-[240px] hover:scale-105"
                    title={source.title}
                  >
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{source.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* TTS Controls */}
          {!isUser && !message.isError && (
            <div className="mt-1 ml-1 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {isSpeaking ? (
                <div className="flex items-center gap-2 bg-surfaceHighlight border border-border rounded-full px-2 py-1 animate-fade-in">
                  <button 
                    onClick={handleStop}
                    className="p-1.5 rounded-full hover:bg-surface text-primary transition-colors"
                    title="Stop reading"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>
                  <div className="w-px h-3 bg-border" />
                  <button 
                    onClick={cycleSpeed}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-surface text-[10px] font-medium text-text-sub transition-colors min-w-[32px] justify-center"
                    title="Change speed"
                  >
                    {speed}x
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleSpeak}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-text-sub hover:text-text hover:bg-surfaceHighlight transition-colors"
                  title="Read aloud"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Read</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
