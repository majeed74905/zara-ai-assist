
import React, { useState } from 'react';
import { MessageSquare, GraduationCap, Code2, Layout, Settings, Sparkles, Radio, Plus, Trash2, MessageCircle, Sun, Moon, Edit2, Check, X, Image as ImageIcon, ClipboardCheck, BarChart3, Calendar, PenTool, Info, Hammer, Heart, Brain, Zap, FolderOpen, Lightbulb, RotateCw, Github } from 'lucide-react';
import { ViewMode, ChatSession } from '../types';
import { useTheme } from '../theme/ThemeContext';

interface SidebarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onDeleteSession: (id: string) => void;
  onOpenFeedback: () => void;
}

const NavItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: React.ElementType, 
  label: string, 
  active: boolean, 
  onClick: () => void 
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-gradient-to-r from-primary/20 to-blue-500/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]' 
        : 'text-text-sub hover:text-text hover:bg-surfaceHighlight/50'
    }`}
  >
    <Icon className={`w-5 h-5 ${active ? 'text-primary' : ''}`} />
    <span className="font-medium text-sm">{label}</span>
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onViewChange, 
  isOpen, 
  onClose, 
  sessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
  onOpenFeedback
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const { currentThemeName, setTheme } = useTheme();

  const toggleSimpleTheme = () => {
    const isLightAligned = ['light', 'glass', 'pastel'].includes(currentThemeName);
    setTheme(isLightAligned ? 'dark' : 'light');
  };

  const startEdit = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
    setDeletingId(null);
  };

  const saveEdit = (e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    if (editingId && editTitle.trim()) {
      onRenameSession(editingId, editTitle.trim());
      setEditingId(null);
    }
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const startDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    setEditingId(null);
  };

  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteSession(id);
    setDeletingId(null);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(null);
  };

  return (
    <>
      <div 
        className={`${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed md:relative z-[60] w-[280px] h-full bg-gradient-to-b from-surface/95 via-surface/90 to-primary/10 backdrop-blur-xl border-r border-white/10 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 overflow-hidden shadow-2xl md:shadow-none`}
      >
        <div className="p-6 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2 mb-6">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
               <Sparkles className="w-5 h-5 text-white fill-white" />
             </div>
             <div>
               <h1 className="font-bold text-lg tracking-tight text-text">Zara AI</h1>
               <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold ml-1">PRO</span>
             </div>
          </div>

          <button 
            onClick={onNewChat}
            className="w-full bg-gradient-to-r from-primary to-accent text-white rounded-xl p-3 flex items-center justify-center gap-2 font-medium shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all mb-4 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-6 scrollbar-hide">
          <div className="space-y-1">
            <p className="px-2 text-[10px] font-bold text-text-sub/40 uppercase tracking-widest mb-2">Core</p>
            <NavItem icon={MessageSquare} label="Chat" active={currentView === 'chat'} onClick={() => onViewChange('chat')} />
            
            <p className="px-2 text-[10px] font-bold text-text-sub/40 uppercase tracking-widest mt-6 mb-2">Studio</p>
            <NavItem icon={Radio} label="Live" active={currentView === 'live'} onClick={() => onViewChange('live')} />
            <NavItem icon={ImageIcon} label="Image" active={currentView === 'workspace'} onClick={() => onViewChange('workspace')} />

            <p className="px-2 text-[10px] font-bold text-text-sub/40 uppercase tracking-widest mt-6 mb-2">Academic & Dev</p>
            <NavItem icon={GraduationCap} label="Tutor" active={currentView === 'student'} onClick={() => onViewChange('student')} />
            <NavItem icon={ClipboardCheck} label="Exam Prep" active={currentView === 'exam'} onClick={() => onViewChange('exam')} />
            <NavItem icon={Code2} label="Code" active={currentView === 'code'} onClick={() => onViewChange('code')} />
            <NavItem icon={Hammer} label="App Builder" active={currentView === 'builder'} onClick={() => onViewChange('builder')} />
            <NavItem icon={Github} label="GitHub Analyzer" active={currentView === 'github'} onClick={() => onViewChange('github')} />
          </div>

          {sessions.length > 0 && (
            <div className="pt-2">
              <p className="px-2 text-[10px] font-bold text-text-sub/40 uppercase tracking-widest mb-2">Recent Chats</p>
              <div className="space-y-1">
                {sessions.map((session) => (
                  <div 
                    key={session.id}
                    className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                      activeSessionId === session.id
                        ? 'bg-gradient-to-r from-surfaceHighlight to-transparent text-text border-l-2 border-primary'
                        : 'text-text-sub hover:text-text hover:bg-surfaceHighlight/50'
                    }`}
                    onClick={() => onSelectSession(session.id)}
                  >
                    {editingId === session.id ? (
                       <div className="flex-1 flex items-center gap-1 min-w-0 bg-surfaceHighlight p-1 rounded-md" onClick={e => e.stopPropagation()}>
                         <input
                           autoFocus
                           type="text"
                           value={editTitle}
                           onChange={(e) => setEditTitle(e.target.value)}
                           onKeyDown={(e) => {
                             if (e.key === 'Enter') saveEdit(e);
                             if (e.key === 'Escape') cancelEdit(e as any);
                           }}
                           className="flex-1 bg-background border border-primary/50 rounded px-2 py-1 text-sm text-text focus:outline-none min-w-0"
                           onClick={e => e.stopPropagation()}
                         />
                         <button onClick={saveEdit} className="p-1 text-green-500 hover:bg-green-500/10 rounded"><Check className="w-3.5 h-3.5" /></button>
                         <button onClick={cancelEdit} className="p-1 text-red-500 hover:bg-red-500/10 rounded"><X className="w-3.5 h-3.5" /></button>
                       </div>
                    ) : deletingId === session.id ? (
                       <div className="flex-1 flex items-center justify-between gap-2 bg-red-500/10 p-1 rounded-md border border-red-500/20">
                         <span className="text-sm font-medium text-red-500 truncate pl-2">Delete?</span>
                         <div className="flex items-center gap-1">
                            <button onClick={(e) => confirmDelete(session.id, e)} className="p-1 text-red-500 hover:bg-red-500/20 rounded"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={cancelDelete} className="p-1 text-text-sub hover:bg-surface/50 rounded"><X className="w-3.5 h-3.5" /></button>
                         </div>
                       </div>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm truncate pr-14">{session.title}</span>
                        <div className={`absolute right-2 flex items-center bg-surfaceHighlight/90 backdrop-blur-md rounded-lg shadow-sm border border-white/5 transition-all duration-200 ${
                          activeSessionId === session.id 
                            ? 'opacity-100 translate-x-0' 
                            : 'opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'
                        }`}>
                          <button
                            onClick={(e) => startEdit(session, e)}
                            className="p-1.5 text-text-sub hover:text-primary transition-colors border-r border-white/5"
                            title="Rename"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => startDelete(session.id, e)}
                            className="p-1.5 text-text-sub hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 p-4 border-t border-border space-y-2 bg-background/50 backdrop-blur">
          <div className="grid grid-cols-2 gap-2">
              <button onClick={toggleSimpleTheme} className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl transition-all text-text-sub hover:bg-surfaceHighlight/50">
                 {['light', 'glass', 'pastel'].includes(currentThemeName) ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button onClick={() => onViewChange('settings')} className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl transition-all ${currentView === 'settings' ? 'bg-primary/10 text-primary' : 'text-text-sub hover:bg-surfaceHighlight/50'}`}>
                  <Settings className="w-5 h-5" />
              </button>
          </div>
          <div className="flex items-center justify-between pt-1">
             <button onClick={onOpenFeedback} className="text-[10px] text-text-sub hover:text-primary w-full text-center">
                Send Feedback
             </button>
          </div>
        </div>
      </div>
      
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 md:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
        />
      )}
    </>
  );
};
