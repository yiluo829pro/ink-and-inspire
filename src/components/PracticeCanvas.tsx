import { useCallback, useEffect, useRef } from "react";
import { drawSegment, replay, type BrushId, type Point, type Stroke } from "@/lib/brushes";

type Props = {
  text: string;
  fontCss: string;
  ghostOpacity: number;
  showGrid: boolean;
  paper: string;
  gridColor: string;
  brush: BrushId;
  color: string;
  size: number;
  strokes: Stroke[];
  onStrokesChange: (s: Stroke[]) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
};

export function PracticeCanvas({
  text,
  fontCss,
  ghostOpacity,
  showGrid,
  paper,
  gridColor,
  brush,
  color,
  size,
  strokes,
  onStrokesChange,
  canvasRef,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const current = useRef<Stroke | null>(null);
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // paper
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, w, h);

    const lines = text.split("\n").filter((l) => l.length > 0);
    const rows = Math.max(1, lines.length);
    const cols = Math.max(1, ...lines.map((l) => [...l].length));
    const cell = Math.min(w / cols, h / rows);
    const originX = (w - cell * cols) / 2;
    const originY = (h - cell * rows) / 2;

    if (showGrid) {
      ctx.save();
      ctx.strokeStyle = gridColor;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = originX + c * cell;
          const y = originY + r * cell;
          ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
          ctx.save();
          ctx.globalAlpha = 0.3;
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + cell, y + cell);
          ctx.moveTo(x + cell, y);
          ctx.lineTo(x, y + cell);
          ctx.moveTo(x + cell / 2, y);
          ctx.lineTo(x + cell / 2, y + cell);
          ctx.moveTo(x, y + cell / 2);
          ctx.lineTo(x + cell, y + cell / 2);
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();
    }

    // ghost template glyphs
    if (ghostOpacity > 0.01 && lines.length) {
      ctx.save();
      ctx.globalAlpha = ghostOpacity;
      ctx.fillStyle = gridColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${Math.floor(cell * 0.76)}px ${fontCss}`;
      lines.forEach((line, r) => {
        const chars = [...line];
        chars.forEach((ch, c) => {
          ctx.fillText(ch, originX + c * cell + cell / 2, originY + r * cell + cell / 2 + cell * 0.02);
        });
      });
      ctx.restore();
    }

    replay(ctx, strokesRef.current);
  }, [text, fontCss, ghostOpacity, showGrid, paper, gridColor, canvasRef]);

  useEffect(() => {
    paint();
    const ro = new ResizeObserver(() => paint());
    if (wrapRef.current) ro.observe(wrapRef.current);
    const t = setTimeout(paint, 400); // after webfonts settle
    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, [paint]);

  const pos = (e: React.PointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      p: e.pressure && e.pressure > 0 ? e.pressure : 0.5,
      t: performance.now(),
    };
  };

  const onDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    current.current = { brush, color, size, points: [pos(e)] };
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current || !current.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pts = current.current.points;
    const prev = pts[pts.length - 1]!;
    const next = pos(e);
    if (Math.hypot(next.x - prev.x, next.y - prev.y) < 0.8) return;
    pts.push(next);
    drawSegment(ctx, current.current, prev, next, pts.length);
  };

  const onUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const s = current.current;
    current.current = null;
    if (s && s.points.length > 1) onStrokesChange([...strokesRef.current, s]);
  };

  return (
    <div ref={wrapRef} className="relative aspect-[4/3] w-full overflow-hidden rounded-xl2 shadow-paper">
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none select-none"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onPointerCancel={onUp}
      />
    </div>
  );
}
