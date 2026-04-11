import { useState, useRef, useEffect } from 'react';
import { Loader2, Send, Sparkles, Bot, User, Wand2 } from 'lucide-react';
import { chatRefine, saveChatMessage, loadChatMessages, type ChatMessage } from '../../lib/api';
import type { TestCase } from './TestCaseTable';

interface AiChatPanelProps {
  testCases: TestCase[];
  testCaseId: string;     // Supabase row ID for persistence
  userId: string;
  onTestCasesUpdated: (testCases: TestCase[], version: number) => void;
}

interface DisplayMessage extends ChatMessage {
  timestamp?: string;
  version?: number;
}

const QUICK_ACTIONS = [
  { label: '🎯 Edge Cases', instruction: 'Add edge cases with boundary values, extreme inputs, empty inputs, and null cases' },
  { label: '❌ Negative Tests', instruction: 'Add negative testing scenarios with invalid inputs and error handling' },
  { label: '📈 More Coverage', instruction: 'Improve test coverage by identifying and adding missing logical scenarios' },
  { label: '🤖 Automation-Ready', instruction: 'Make all steps precise, deterministic, and automation-ready with clear selectors' },
  { label: '📋 BDD Format', instruction: 'Convert all test cases into Given-When-Then BDD format' },
];

export function AiChatPanel({ testCases, testCaseId, userId, onTestCasesUpdated }: AiChatPanelProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load persisted chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const history = await loadChatMessages(testCaseId);
        if (history.length > 0) {
          setMessages(history);
          const maxVersion = Math.max(...history.map((m: any) => m.version || 1));
          setVersion(maxVersion);
        }
      } catch (err) {
        console.warn('Failed to load chat history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };
    loadHistory();
  }, [testCaseId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (directInstruction?: string) => {
    const userMessage = directInstruction || input.trim();
    if (!userMessage || loading) return;

    const newVersion = version + 1;
    const userMsg: DisplayMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
      version: newVersion
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    // Persist user message
    saveChatMessage(testCaseId, userId, 'user', userMessage, newVersion);

    try {
      // Send only role+content for the API
      const apiMessages = updatedMessages.map(m => ({ role: m.role, content: m.content }));
      const result = await chatRefine(apiMessages, testCases, testCaseId);

      const assistantMsg: DisplayMessage = {
        role: 'assistant',
        content: result.assistantMessage,
        timestamp: new Date().toISOString(),
        version: newVersion
      };

      setMessages(prev => [...prev, assistantMsg]);
      setVersion(newVersion);

      // Persist assistant message
      saveChatMessage(testCaseId, userId, 'assistant', result.assistantMessage, newVersion);

      // Update parent with new test cases
      onTestCasesUpdated(result.testCases, newVersion);
    } catch (err: any) {
      const errorMsg: DisplayMessage = {
        role: 'assistant',
        content: `⚠️ Error: ${err.message || 'Failed to process your request. Please try again.'}`,
        timestamp: new Date().toISOString(),
        version: newVersion
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-card/30 border-l border-border/50">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-sm">AI Test Case Assistant</h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              v{version} · {testCases.length} cases
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {/* Welcome message */}
        {messages.length === 0 && !loadingHistory && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Wand2 className="w-7 h-7 text-primary" />
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-lg">Refine Your Test Cases</h4>
              <p className="text-muted-foreground text-sm max-w-[280px] leading-relaxed">
                Ask me to add edge cases, improve coverage, convert formats, or any custom refinement.
              </p>
            </div>
            {/* Quick actions */}
            <div className="flex flex-wrap justify-center gap-2 max-w-[320px]">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleSend(action.instruction)}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-[11px] font-medium transition-all border border-border/50 hover:border-primary/30 disabled:opacity-50"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {loadingHistory && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Chat Messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div className={`max-w-[85%] flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-1 ${
                msg.role === 'user' ? 'bg-primary/20' : 'bg-muted'
              }`}>
                {msg.role === 'user' 
                  ? <User className="w-3.5 h-3.5 text-primary" />
                  : <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                }
              </div>
              {/* Bubble */}
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary/15 text-foreground border border-primary/20 rounded-tr-md'
                  : 'bg-muted/60 text-foreground border border-border/50 rounded-tl-md'
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.version && msg.version > 1 && msg.role === 'assistant' && (
                  <span className="block mt-2 text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
                    Updated to v{msg.version}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {loading && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-1">
                <Sparkles className="w-3.5 h-3.5 text-muted-foreground animate-pulse" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-muted/60 border border-border/50">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">AI is thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick actions bar (shown after first message) */}
      {messages.length > 0 && !loading && (
        <div className="px-4 py-2 border-t border-border/30 flex gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => handleSend(action.instruction)}
              disabled={loading}
              className="px-2.5 py-1 rounded-md bg-muted/50 hover:bg-muted text-[10px] font-medium transition-all border border-border/30 hover:border-primary/20 whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-border/50 bg-card/50 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI to modify test cases..."
            rows={1}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none transition-all text-sm text-foreground placeholder:text-muted-foreground/50 resize-none min-h-[44px] max-h-[120px] disabled:opacity-50"
            style={{ height: 'auto', overflow: 'hidden' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-all disabled:opacity-50 shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
