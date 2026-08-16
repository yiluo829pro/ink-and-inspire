import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { PracticeCanvas } from "@/components/PracticeCanvas";
import { BRUSHES, type BrushId, type Stroke } from "@/lib/brushes";
import { extractTextFromImage } from "@/lib/ocr.functions";
import { FONTS, INKS, PAPERS, PRESETS } from "@/lib/templates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inkwell — Calligraphy & Drawing Practice Pad" },
      {
        name: "description",
        content:
          "A calm pocket practice pad: snap a slogan, trace poems in classical calligraphy fonts character by character, or free-draw with ink, watercolor, oil and pencil brushes.",
      },
      { property: "og:title", content: "Inkwell — Calligraphy & Drawing Practice Pad" },
      {
        property: "og:description",
        content:
          "Snap a photo of a slogan, pull its words onto the pad, and practice the whole sentence or one character at a time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

async function fileToDataUrl(file: File, max = 1400): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function Index() {
  const [text, setText] = useState("床前明月光\n疑是地上霜");
  const [mode, setMode] = useState<"sentence" | "char">("sentence");
  const [charIdx, setCharIdx] = useState(0);
  const [fontId, setFontId] = useState(FONTS[0]!.id);
  const [brush, setBrush] = useState<BrushId>("ink");
  const [color, setColor] = useState(INKS[0]!.value);
  const [paperIdx, setPaperIdx] = useState(0);
  const [size, setSize] = useState(16);
  const [ghost, setGhost] = useState(0.28);
  const [grid, setGrid] = useState(true);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const readPhoto = useServerFn(extractTextFromImage);

  const font = FONTS.find((f) => f.id === fontId)!;
  const paper = PAPERS[paperIdx]!;

  const chars = useMemo(() => [...text].filter((c) => c.trim().length > 0), [text]);
  const activeChar = chars[Math.min(charIdx, Math.max(0, chars.length - 1))] ?? "";
  const practiceText = mode === "char" ? activeChar : text;

  const setTarget = (next: string) => {
    setText(next);
    setCharIdx(0);
    setStrokes([]);
  };

  const gotoChar = (i: number) => {
    if (!chars.length) return;
    setCharIdx((i + chars.length) % chars.length);
    setStrokes([]);
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await readPhoto({ data: { imageDataUrl: dataUrl } });
      if (!res.text) setError("No readable text found in that photo — try a closer, sharper shot.");
      else setTarget(res.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong reading the photo.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const download = () => {
    const url = canvasRef.current?.toDataURL("image/png");
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = "inkwell-practice.png";
    a.click();
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.4em] text-accent">练字 · practice</p>
            <h1 className="mt-2 font-display text-5xl font-light leading-none tracking-tight sm:text-6xl">
              Inkwell
            </h1>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            A quiet pad for your spare minutes. Snap a slogan, trace a poem, or simply move a brush
            across paper.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-4">
            <PracticeCanvas
              text={practiceText}
              fontCss={font.css}
              ghostOpacity={ghost}
              showGrid={grid}
              paper={paper.value}
              gridColor={paper.grid}
              brush={brush}
              color={color}
              size={size}
              strokes={strokes}
              onStrokesChange={setStrokes}
              canvasRef={canvasRef}
            />
            {mode === "char" && chars.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => gotoChar(charIdx - 1)}
                  className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.16em] transition-colors hover:bg-secondary"
                >
                  Prev
                </button>
                <div className="flex flex-wrap gap-1">
                  {chars.map((c, i) => (
                    <button
                      key={`${c}-${i}`}
                      onClick={() => gotoChar(i)}
                      style={{ fontFamily: font.css }}
                      className={cn(
                        "h-8 w-8 rounded-md border text-sm transition-colors",
                        i === charIdx
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border hover:bg-secondary",
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => gotoChar(charIdx + 1)}
                  className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.16em] transition-colors hover:bg-secondary"
                >
                  Next
                </button>
                <span className="text-xs text-muted-foreground">
                  {charIdx + 1} / {chars.length}
                </span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setStrokes((s) => s.slice(0, -1))}
                className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.16em] transition-colors hover:bg-secondary"
              >
                Undo
              </button>
              <button
                onClick={() => setStrokes([])}
                className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.16em] transition-colors hover:bg-secondary"
              >
                Clear
              </button>
              <button
                onClick={download}
                className="rounded-full bg-primary px-4 py-2 text-xs uppercase tracking-[0.16em] text-primary-foreground transition-opacity hover:opacity-90"
              >
                Save image
              </button>
              <span className="ml-auto text-xs text-muted-foreground">
                {strokes.length} strokes · pressure-sensitive with a stylus
              </span>
            </div>
          </div>

          <aside className="space-y-8">
            <Panel title="Photo">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => void onPhoto(e.target.files?.[0])}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="w-full rounded-lg border border-dashed border-border px-3 py-4 text-sm transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
              >
                {busy ? "Reading the photo…" : "Snap or upload a slogan"}
              </button>
              <p className="text-xs leading-relaxed text-muted-foreground">
                We read the words out of your photo and load them onto the pad.
              </p>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </Panel>

            <Panel title="Practice mode">
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    ["sentence", "Whole sentence"],
                    ["char", "One character"],
                  ] as const
                ).map(([m, label]) => (
                  <button
                    key={m}
                    onClick={() => {
                      setMode(m);
                      setStrokes([]);
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs transition-colors",
                      mode === m
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border hover:bg-secondary",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Text">
              <textarea
                value={text}
                onChange={(e) => setTarget(e.target.value)}
                rows={3}
                spellCheck={false}
                className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm leading-relaxed outline-none focus:border-accent"
                placeholder="Type a poem or slogan — one line per row"
              />
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setTarget(p.text)}
                    title={p.note}
                    className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Hand">
              <div className="space-y-1">
                {FONTS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFontId(f.id)}
                    className={cn(
                      "flex w-full items-baseline justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                      f.id === fontId ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
                    )}
                  >
                    <span className="text-sm" style={{ fontFamily: f.css }}>
                      {f.label}
                    </span>
                    <span
                      className={cn(
                        "text-[0.62rem] uppercase tracking-widest",
                        f.id === fontId ? "opacity-70" : "text-muted-foreground",
                      )}
                    >
                      {f.sub.split(" ")[0]}
                    </span>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Brush">
              <div className="grid grid-cols-2 gap-1.5">
                {BRUSHES.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBrush(b.id)}
                    title={b.hint}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs transition-colors",
                      b.id === brush
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border hover:bg-secondary",
                    )}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              <label className="block space-y-1 pt-1 text-xs text-muted-foreground">
                <span>Brush size · {size}</span>
                <input
                  type="range"
                  min={4}
                  max={48}
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="w-full accent-[var(--accent)]"
                />
              </label>
            </Panel>

            <Panel title="Ink & paper">
              <div className="flex flex-wrap gap-2">
                {INKS.map((i) => (
                  <button
                    key={i.value}
                    onClick={() => setColor(i.value)}
                    title={i.label}
                    aria-label={i.label}
                    className={cn(
                      "h-7 w-7 rounded-full transition-transform",
                      color === i.value
                        ? "scale-110 ring-2 ring-accent ring-offset-2 ring-offset-background"
                        : "hover:scale-105",
                    )}
                    style={{ backgroundColor: i.value }}
                  />
                ))}
              </div>
              <div className="flex gap-1.5">
                {PAPERS.map((p, idx) => (
                  <button
                    key={p.label}
                    onClick={() => setPaperIdx(idx)}
                    className={cn(
                      "flex-1 rounded-lg border px-2 py-2 text-[0.68rem] transition-colors",
                      idx === paperIdx ? "border-accent" : "border-border hover:bg-secondary",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Guides">
              <label className="block space-y-1 text-xs text-muted-foreground">
                <span>Template opacity · {Math.round(ghost * 100)}%</span>
                <input
                  type="range"
                  min={0}
                  max={70}
                  value={Math.round(ghost * 100)}
                  onChange={(e) => setGhost(Number(e.target.value) / 100)}
                  className="w-full accent-[var(--accent)]"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={grid}
                  onChange={(e) => setGrid(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                Show 米字格 practice grid
              </label>
            </Panel>
          </aside>
        </div>

        <footer className="mt-14 border-t border-border pt-5 text-xs text-muted-foreground">
          Tip: drop template opacity to 0 for a blank page and just draw.
        </footer>
      </div>
    </main>
  );
}
