export type BrushId = "ink" | "watercolor" | "oil" | "pencil" | "line";

export type Point = { x: number; y: number; p: number; t: number };

export type Stroke = {
  brush: BrushId;
  color: string;
  size: number;
  points: Point[];
};

export const BRUSHES: { id: BrushId; label: string; hint: string }[] = [
  { id: "ink", label: "Ink Brush", hint: "毛笔 · tapered, pressure aware" },
  { id: "watercolor", label: "Watercolor", hint: "soft translucent bleed" },
  { id: "oil", label: "Oil Paint", hint: "thick bristled impasto" },
  { id: "pencil", label: "Pencil", hint: "grainy graphite" },
  { id: "line", label: "Fine Line", hint: "even technical pen" },
];

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const v =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgba(hex: string, a: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Width factor from speed + pressure, giving calligraphic taper. */
function dynamicWidth(brush: BrushId, size: number, a: Point, b: Point) {
  const d = dist(a, b);
  const dt = Math.max(1, b.t - a.t);
  const speed = Math.min(3, d / dt / 0.6);
  const pressure = b.p > 0 ? b.p : 0.5;
  switch (brush) {
    case "ink":
      return size * (0.25 + pressure * 1.15) * (1 - speed * 0.22);
    case "watercolor":
      return size * (1.1 + pressure * 0.7);
    case "oil":
      return size * (0.8 + pressure * 0.6);
    case "pencil":
      return size * (0.35 + pressure * 0.5);
    default:
      return size * 0.5;
  }
}

/** Draws one segment of a stroke. Called incrementally while drawing and on replay. */
export function drawSegment(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  a: Point,
  b: Point,
  seed: number,
) {
  const { brush, color, size } = stroke;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (brush === "line") {
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(0.6, size * 0.22);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (brush === "pencil") {
    const w = dynamicWidth(brush, size, a, b);
    const steps = Math.max(2, Math.ceil(dist(a, b) / 1.2));
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      const n = 6;
      for (let k = 0; k < n; k++) {
        const ang = ((seed * (k + 3) * 97.13 + i * 31.7) % 360) * (Math.PI / 180);
        const r = ((seed * (k + 7) * 53.7 + i * 17.3) % 100) / 100;
        ctx.fillStyle = rgba(color, 0.06 + r * 0.08);
        ctx.beginPath();
        ctx.arc(x + Math.cos(ang) * r * w * 0.6, y + Math.sin(ang) * r * w * 0.6, 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    return;
  }

  if (brush === "watercolor") {
    const w = dynamicWidth(brush, size, a, b);
    for (let layer = 0; layer < 3; layer++) {
      const spread = 1 + layer * 0.55;
      ctx.strokeStyle = rgba(color, 0.05 + 0.03 * (2 - layer));
      ctx.lineWidth = w * spread;
      ctx.beginPath();
      const jitter = ((seed % 13) - 6) * 0.12 * layer;
      ctx.moveTo(a.x + jitter, a.y - jitter);
      ctx.lineTo(b.x + jitter, b.y - jitter);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (brush === "oil") {
    const w = dynamicWidth(brush, size, a, b);
    const bristles = 9;
    const ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
    for (let i = 0; i < bristles; i++) {
      const off = (i / (bristles - 1) - 0.5) * w;
      const shade = 0.35 + ((seed * (i + 2) * 41.3) % 100) / 220;
      ctx.strokeStyle = rgba(color, shade);
      ctx.lineWidth = Math.max(0.8, w / bristles) * 1.15;
      ctx.beginPath();
      ctx.moveTo(a.x + Math.cos(ang) * off, a.y + Math.sin(ang) * off);
      ctx.lineTo(b.x + Math.cos(ang) * off, b.y + Math.sin(ang) * off);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // ink
  const w = Math.max(0.6, dynamicWidth("ink", size, a, b));
  ctx.strokeStyle = rgba(color, 0.92);
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  // faint bleed halo
  ctx.strokeStyle = rgba(color, 0.06);
  ctx.lineWidth = w * 1.8;
  ctx.stroke();
  ctx.restore();
}

export function replay(ctx: CanvasRenderingContext2D, strokes: Stroke[]) {
  strokes.forEach((s, si) => {
    for (let i = 1; i < s.points.length; i++) {
      drawSegment(ctx, s, s.points[i - 1], s.points[i], si * 7 + i);
    }
  });
}
