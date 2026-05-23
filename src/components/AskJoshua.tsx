import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "What are you building now?",
  "Tell me about OnTrack",
  "Why WashU?",
  "What's your favorite project?",
];

export default function AskJoshua() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setError(null);

    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const msg = await res.text();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: msg || "Something went wrong." },
        ]);
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (!last || last.role !== "assistant") return prev;
          return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
        });
      }
    } catch (err) {
      if ((err as { name?: string }).name !== "AbortError") {
        setError("Connection interrupted.");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close Ask Joshua assistant" : "Open Ask Joshua assistant"}
        onClick={() => setOpen((prev) => !prev)}
        className={`fixed bottom-6 right-6 z-[9998] flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-violet-600 via-violet-500 to-cyan-400 text-[10px] font-semibold uppercase tracking-[0.3em] shadow-[0_15px_40px_rgba(79,41,219,0.45)]`}
        data-cursor-hover
      >
        {!open ? <MessageCircle className="w-7 h-7" strokeWidth={2} /> : "×"}
      </button>

      {open ? (
        <div
          className="fixed z-[9997] inset-6 sm:inset-auto sm:right-20 sm:w-[440px] sm:h-[640px] sm:bottom-24 flex flex-col rounded-3xl overflow-hidden glass-strong border border-white/10 backdrop-blur-2xl"
          aria-live="polite"
        >
          <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.55em] text-slate-500">portfolio agent</p>
              <p className="text-3xl font-bold text-white">Ask Joshua</p>
              <p className="text-xs mt-2 text-slate-400">AI trained on Joshua&apos;s narrative — clarify when asked directly.</p>
            </div>
            <button
              type="button"
              aria-label="Close panel"
              onClick={() => setOpen(false)}
              className="text-sm text-slate-400 hover:text-white"
              data-cursor-hover
            >
              ESC
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 px-5 py-4">
            {messages.length === 0 ? (
              <p className="text-sm text-slate-500">
                Tap a starter below or describe what you&apos;re curious about — this routes through the same Anthropic
                powered endpoint as production.
              </p>
            ) : (
              messages.map((message, index) => (
                <Bubble
                  key={`${message.role}-${index}`}
                  {...message}
                  streaming={
                    streaming && index === messages.length - 1 && message.role === "assistant"
                  }
                />
              ))
            )}
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
          </div>

          {messages.length === 0 ? (
            <div className="flex flex-wrap gap-2 px-5 py-3 border-t border-white/10 bg-black/20">
              {STARTERS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  className="rounded-full border border-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-300 hover:border-primary/70 hover:text-white transition-colors disabled:opacity-40"
                  disabled={streaming}
                  data-cursor-hover
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}

          <form
            className="border-t border-white/10 px-5 py-3 flex items-center gap-3 bg-black/30"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              send(input);
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask anything grounded in Joshua's public work…"
              disabled={streaming}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className="rounded-2xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-white hover:border-primary hover:text-white/90 disabled:opacity-30"
              data-cursor-hover
            >
              {streaming ? "…" : "Send"}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}

function Bubble({
  role,
  content,
  streaming,
}: Msg & { streaming?: boolean }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
          isUser ? "border-violet-400/70 bg-gradient-to-br from-violet-600 to-violet-500 text-white" : "border-white/10 bg-white/5 text-slate-200"
        }`}
      >
        {content.trim().length === 0 && streaming ? (
          <span className="inline-flex gap-1">
            {[0, 1, 2].map((idx) => (
              <span
                key={idx}
                className="h-1.5 w-1.5 rounded-full bg-white/70 animate-pulse"
                style={{ animationDelay: `${idx * 0.15}s` }}
              />
            ))}
          </span>
        ) : (
          <>
            <span>{content}</span>
            {streaming ? <span className="ml-1 inline-block h-4 w-px bg-cyan-300 animate-pulse align-middle" /> : null}
          </>
        )}
      </div>
    </div>
  );
}
