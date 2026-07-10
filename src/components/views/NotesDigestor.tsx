import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload, FileText, Sparkles, MessageCircle, BookOpen,
  ChevronRight, ChevronLeft, Trash2, RotateCcw, Send,
  CheckCircle2, AlertCircle, Loader2, X, Plus, Eye,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Note {
  id: string;
  title: string;
  original_filename: string | null;
  raw_text: string | null;
  summary: string | null;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  created_at: string;
}

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

type Panel = 'notes' | 'chat' | 'flashcards' | 'text';

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notes-digestor`;

async function callEdge(action: string, body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(EDGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action, ...body }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Request failed');
  }
  return res.json();
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NotesDigestor() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [panel, setPanel] = useState<Panel>('chat');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [question, setQuestion] = useState('');
  const [uploading, setUploading] = useState(false);
  const [generatingCards, setGeneratingCards] = useState(false);
  const [asking, setAsking] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchNotes = useCallback(async () => {
    const { data } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setNotes(data as Note[]);
  }, []);

  const fetchMessages = useCallback(async (noteId: string) => {
    const { data } = await supabase
      .from('note_messages')
      .select('*')
      .eq('note_id', noteId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data as Message[]);
  }, []);

  const fetchFlashcards = useCallback(async (noteId: string) => {
    const { data } = await supabase
      .from('flashcards')
      .select('*')
      .eq('note_id', noteId)
      .order('created_at', { ascending: true });
    if (data) setFlashcards(data as Flashcard[]);
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  useEffect(() => {
    if (!selectedNote) return;
    fetchMessages(selectedNote.id);
    fetchFlashcards(selectedNote.id);
  }, [selectedNote, fetchMessages, fetchFlashcards]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const processFile = async (file: File) => {
    setUploadError(null);
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
    if (!allowed.includes(file.type)) {
      setUploadError('Please upload an image file (JPG, PNG, WebP, GIF, BMP).');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('File too large. Maximum size is 20 MB.');
      return;
    }

    setUploading(true);
    try {
      // Create a placeholder note row
      const { data: noteRow, error: insertErr } = await supabase
        .from('notes')
        .insert({ title: file.name.replace(/\.[^.]+$/, ''), original_filename: file.name, status: 'uploading' })
        .select()
        .single();
      if (insertErr || !noteRow) throw new Error(insertErr?.message ?? 'Failed to create note');

      await fetchNotes();
      setSelectedNote(noteRow as Note);
      setPanel('chat');

      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      // Send to edge function for OCR
      const result = await callEdge('ocr', {
        note_id: noteRow.id,
        image_base64: base64,
        mime_type: file.type,
      });

      // Refresh note
      const { data: updated } = await supabase.from('notes').select('*').eq('id', noteRow.id).maybeSingle();
      if (updated) {
        setSelectedNote(updated as Note);
        setNotes(prev => prev.map(n => n.id === updated.id ? updated as Note : n));
      }

      if (result.error) throw new Error(result.error);
    } catch (e) {
      setUploadError(String(e));
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !selectedNote || asking) return;
    const q = question.trim();
    setQuestion('');
    setAsking(true);

    // Optimistic user message
    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, { id: tempId, role: 'user', content: q, created_at: new Date().toISOString() }]);

    try {
      const result = await callEdge('ask', { note_id: selectedNote.id, question: q });
      if (result.error) throw new Error(result.error);
      // Reload messages from DB for accurate IDs
      await fetchMessages(selectedNote.id);
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setUploadError(String(e));
    } finally {
      setAsking(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!selectedNote || generatingCards) return;
    setGeneratingCards(true);
    setPanel('flashcards');
    setCardIndex(0);
    setCardFlipped(false);
    try {
      const result = await callEdge('flashcards', { note_id: selectedNote.id, count: 12 });
      if (result.error) throw new Error(result.error);
      await fetchFlashcards(selectedNote.id);
    } catch (e) {
      setUploadError(String(e));
    } finally {
      setGeneratingCards(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    await supabase.from('notes').delete().eq('id', noteId);
    if (selectedNote?.id === noteId) { setSelectedNote(null); setMessages([]); setFlashcards([]); }
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const selectNote = (note: Note) => {
    setSelectedNote(note);
    setPanel('chat');
    setCardIndex(0);
    setCardFlipped(false);
    setUploadError(null);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 border-r border-surface-800 flex flex-col bg-surface-950">
        <div className="p-4 border-b border-surface-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-surface-100 text-base">Notes</h2>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Upload
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
          <p className="text-xs text-surface-500">Upload photos of your handwritten or printed notes</p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mx-3 my-2 border-2 border-dashed rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all ${
            isDragging ? 'border-brand-400 bg-brand-500/10' : 'border-surface-700 hover:border-surface-600 hover:bg-surface-800/40'
          }`}
        >
          <Upload className={`w-5 h-5 ${isDragging ? 'text-brand-400' : 'text-surface-500'}`} />
          <span className="text-xs text-surface-500 text-center">Drag & drop image here</span>
        </div>

        {uploadError && (
          <div className="mx-3 mb-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-rose-300">{uploadError}</span>
            <button onClick={() => setUploadError(null)} className="ml-auto text-rose-500 hover:text-rose-300">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {notes.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 text-surface-700 mx-auto mb-2" />
              <p className="text-xs text-surface-600">No notes yet</p>
            </div>
          ) : (
            notes.map(note => (
              <div
                key={note.id}
                onClick={() => selectNote(note)}
                className={`group flex items-start gap-2.5 p-3 rounded-xl cursor-pointer transition-all ${
                  selectedNote?.id === note.id
                    ? 'bg-brand-500/15 border border-brand-500/25'
                    : 'hover:bg-surface-800/60 border border-transparent'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {note.status === 'processing' || note.status === 'uploading' ? (
                    <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                  ) : note.status === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-brand-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-surface-100 truncate">{note.title}</div>
                  <div className="text-xs text-surface-500 mt-0.5 truncate">
                    {note.original_filename ?? 'Note'}
                  </div>
                  <div className="text-xs text-surface-600 mt-0.5 capitalize">{note.status}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                  className="opacity-0 group-hover:opacity-100 text-surface-600 hover:text-rose-400 transition-all p-0.5 flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!selectedNote ? (
          <EmptyWelcome onUpload={() => fileInputRef.current?.click()} uploading={uploading} />
        ) : (
          <>
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-surface-800 bg-surface-950/80 backdrop-blur-sm flex-shrink-0">
              <div className="min-w-0 flex-1">
                <h3 className="font-display font-semibold text-surface-100 truncate">{selectedNote.title}</h3>
                {selectedNote.summary && (
                  <p className="text-xs text-surface-400 mt-0.5 line-clamp-1">{selectedNote.summary}</p>
                )}
              </div>
              <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                {(['chat', 'flashcards', 'text'] as Panel[]).map(p => {
                  const icons = { chat: MessageCircle, flashcards: BookOpen, text: Eye };
                  const labels = { chat: 'Ask AI', flashcards: 'Flashcards', text: 'Raw Text' };
                  const Icon = icons[p as keyof typeof icons];
                  return (
                    <button
                      key={p}
                      onClick={() => setPanel(p)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        panel === p ? 'bg-surface-700 text-surface-100' : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {labels[p as keyof typeof labels]}
                    </button>
                  );
                })}
                {selectedNote.status === 'ready' && (
                  <button
                    onClick={handleGenerateFlashcards}
                    disabled={generatingCards}
                    className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5 ml-2"
                  >
                    {generatingCards ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    Generate Flashcards
                  </button>
                )}
              </div>
            </div>

            {/* Processing state */}
            {(selectedNote.status === 'processing' || selectedNote.status === 'uploading') && (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-surface-100 mb-1">Reading your notes...</h4>
                    <p className="text-sm text-surface-400">AI is extracting and analyzing the text. This takes 10-30 seconds.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error state */}
            {selectedNote.status === 'error' && (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-rose-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-surface-100 mb-1">Processing failed</h4>
                    <p className="text-sm text-surface-400">Something went wrong. Try uploading the image again.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Ready panels */}
            {selectedNote.status === 'ready' && (
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Chat panel */}
                {panel === 'chat' && (
                  <ChatPanel
                    messages={messages}
                    question={question}
                    setQuestion={setQuestion}
                    asking={asking}
                    onSubmit={handleAsk}
                    chatEndRef={chatEndRef}
                    noteTitle={selectedNote.title}
                  />
                )}

                {/* Flashcards panel */}
                {panel === 'flashcards' && (
                  <FlashcardsPanel
                    flashcards={flashcards}
                    cardIndex={cardIndex}
                    setCardIndex={setCardIndex}
                    cardFlipped={cardFlipped}
                    setCardFlipped={setCardFlipped}
                    generating={generatingCards}
                    onGenerate={handleGenerateFlashcards}
                  />
                )}

                {/* Raw text panel */}
                {panel === 'text' && (
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-3xl mx-auto">
                      <h4 className="text-sm font-semibold text-surface-400 mb-3 uppercase tracking-wide">Extracted Text</h4>
                      <div className="glass-card p-5 whitespace-pre-wrap text-sm text-surface-200 leading-relaxed font-mono">
                        {selectedNote.raw_text || 'No text extracted.'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────

function ChatPanel({
  messages, question, setQuestion, asking, onSubmit, chatEndRef, noteTitle,
}: {
  messages: Message[];
  question: string;
  setQuestion: (v: string) => void;
  asking: boolean;
  onSubmit: (e: React.FormEvent) => void;
  chatEndRef: React.RefObject<HTMLDivElement>;
  noteTitle: string;
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-12">
            <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <MessageCircle className="w-7 h-7 text-brand-400" />
            </div>
            <div>
              <h4 className="font-semibold text-surface-100 mb-1">Ask anything about "{noteTitle}"</h4>
              <p className="text-sm text-surface-400">The AI has read your notes and is ready to answer questions, explain concepts, or quiz you.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 w-full max-w-md">
              {[
                'Summarize the main points',
                'What are the key concepts?',
                'Quiz me on this material',
                'Explain the most important idea',
              ].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => setQuestion(prompt)}
                  className="text-left p-3 rounded-xl bg-surface-800/60 border border-surface-700 hover:border-surface-600 text-sm text-surface-300 hover:text-surface-100 transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-brand-500 text-white rounded-br-sm'
                : 'bg-surface-800 border border-surface-700 text-surface-100 rounded-bl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {asking && (
          <div className="flex justify-start">
            <div className="bg-surface-800 border border-surface-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
              <span className="text-sm text-surface-400">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={onSubmit} className="flex gap-3 p-4 border-t border-surface-800 flex-shrink-0">
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Ask a question about your notes..."
          className="input-field flex-1"
          disabled={asking}
        />
        <button
          type="submit"
          disabled={!question.trim() || asking}
          className="btn-primary flex items-center gap-2 px-4 flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

// ─── Flashcards Panel ─────────────────────────────────────────────────────────

function FlashcardsPanel({
  flashcards, cardIndex, setCardIndex, cardFlipped, setCardFlipped, generating, onGenerate,
}: {
  flashcards: Flashcard[];
  cardIndex: number;
  setCardIndex: (i: number) => void;
  cardFlipped: boolean;
  setCardFlipped: (v: boolean) => void;
  generating: boolean;
  onGenerate: () => void;
}) {
  if (generating) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-brand-400 animate-spin" />
          <p className="text-surface-400 text-sm">Generating flashcards...</p>
        </div>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-surface-800 border border-surface-700 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-surface-500" />
          </div>
          <div>
            <h4 className="font-semibold text-surface-100 mb-1">No flashcards yet</h4>
            <p className="text-sm text-surface-400 mb-4">Generate AI flashcards from your notes to start studying.</p>
            <button onClick={onGenerate} className="btn-primary flex items-center gap-2 mx-auto">
              <Sparkles className="w-4 h-4" /> Generate Flashcards
            </button>
          </div>
        </div>
      </div>
    );
  }

  const card = flashcards[cardIndex];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
      {/* Progress */}
      <div className="flex items-center gap-3 w-full max-w-lg">
        <span className="text-xs text-surface-500">{cardIndex + 1} / {flashcards.length}</span>
        <div className="flex-1 h-1.5 bg-surface-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-300"
            style={{ width: `${((cardIndex + 1) / flashcards.length) * 100}%` }}
          />
        </div>
        <button onClick={onGenerate} className="text-xs text-surface-500 hover:text-surface-300 flex items-center gap-1 transition-colors">
          <RotateCcw className="w-3 h-3" /> Regenerate
        </button>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-lg cursor-pointer select-none"
        onClick={() => setCardFlipped(!cardFlipped)}
        style={{ perspective: '1000px' }}
      >
        <div
          className="relative transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            height: '220px',
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-2xl border border-surface-700 bg-surface-800 flex flex-col items-center justify-center p-8 text-center"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-4">Question</div>
            <p className="text-surface-100 font-medium text-lg leading-snug">{card.front}</p>
            <div className="mt-6 text-xs text-surface-600">Click to reveal answer</div>
          </div>
          {/* Back */}
          <div
            className="absolute inset-0 rounded-2xl border border-brand-500/30 bg-brand-500/10 flex flex-col items-center justify-center p-8 text-center"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-4">Answer</div>
            <p className="text-surface-100 text-base leading-relaxed">{card.back}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => { setCardIndex(Math.max(0, cardIndex - 1)); setCardFlipped(false); }}
          disabled={cardIndex === 0}
          className="btn-ghost flex items-center gap-1.5 text-sm disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>
        <button
          onClick={() => setCardFlipped(!cardFlipped)}
          className="btn-secondary text-sm px-5"
        >
          {cardFlipped ? 'Show Question' : 'Show Answer'}
        </button>
        <button
          onClick={() => { setCardIndex(Math.min(flashcards.length - 1, cardIndex + 1)); setCardFlipped(false); }}
          disabled={cardIndex === flashcards.length - 1}
          className="btn-ghost flex items-center gap-1.5 text-sm disabled:opacity-30"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Dot indicators */}
      <div className="flex gap-1.5 flex-wrap justify-center max-w-xs">
        {flashcards.map((_, i) => (
          <button
            key={i}
            onClick={() => { setCardIndex(i); setCardFlipped(false); }}
            className={`w-2 h-2 rounded-full transition-all ${i === cardIndex ? 'bg-brand-400 w-4' : 'bg-surface-700 hover:bg-surface-500'}`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Welcome Screen ───────────────────────────────────────────────────────────

function EmptyWelcome({ onUpload, uploading }: { onUpload: () => void; uploading: boolean }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto">
          <FileText className="w-10 h-10 text-brand-400" />
        </div>
        <div>
          <h3 className="font-display font-bold text-surface-100 text-2xl mb-2">Notes Digestor</h3>
          <p className="text-surface-400 text-sm leading-relaxed">
            Upload a photo of your handwritten or printed notes. The AI will read them, let you ask questions, and generate study flashcards.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: Upload, label: 'Upload photo', desc: 'JPG, PNG, WebP' },
            { icon: MessageCircle, label: 'Ask questions', desc: 'AI answers from your notes' },
            { icon: BookOpen, label: 'Flashcards', desc: 'Auto-generated for you' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="p-3 rounded-xl bg-surface-800/40 border border-surface-800">
              <Icon className="w-5 h-5 text-brand-400 mx-auto mb-2" />
              <div className="text-xs font-semibold text-surface-200">{label}</div>
              <div className="text-xs text-surface-500 mt-0.5">{desc}</div>
            </div>
          ))}
        </div>
        <button onClick={onUpload} disabled={uploading} className="btn-primary flex items-center gap-2 mx-auto text-sm">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Upload Notes
        </button>
      </div>
    </div>
  );
}
