export type FontOption = {
  id: string;
  label: string;
  sub: string;
  css: string;
};

export const FONTS: FontOption[] = [
  { id: "mashanzheng", label: "行楷 Ma Shan Zheng", sub: "flowing running script", css: "'Ma Shan Zheng', serif" },
  { id: "zhimangxing", label: "草书 Zhi Mang Xing", sub: "wild cursive", css: "'Zhi Mang Xing', serif" },
  { id: "longcang", label: "行草 Long Cang", sub: "loose brush hand", css: "'Long Cang', serif" },
  { id: "notoserifsc", label: "楷体 Noto Serif SC", sub: "classical regular script", css: "'Noto Serif SC', serif" },
  { id: "zcool", label: "宋刻 ZCOOL XiaoWei", sub: "carved song style", css: "'ZCOOL XiaoWei', serif" },
  { id: "cormorant", label: "Cormorant", sub: "latin didone serif", css: "'Cormorant Garamond', serif" },
  { id: "dancing", label: "Dancing Script", sub: "latin cursive hand", css: "'Dancing Script', cursive" },
];

export const PRESETS: { label: string; text: string; note: string }[] = [
  { label: "静夜思", text: "床前明月光\n疑是地上霜", note: "李白 · Li Bai" },
  { label: "登鹳雀楼", text: "白日依山尽\n黄河入海流", note: "王之涣 · Wang Zhihuan" },
  { label: "兰亭序", text: "永和九年\n岁在癸丑", note: "王羲之 · Wang Xizhi" },
  { label: "Slow down", text: "slow\ndown", note: "latin practice" },
  { label: "Keep going", text: "keep\ngoing", note: "latin practice" },
];

export const INKS: { label: string; value: string }[] = [
  { label: "Ink black", value: "#1b1a17" },
  { label: "Cinnabar", value: "#b4432c" },
  { label: "Indigo", value: "#2f4858" },
  { label: "Moss", value: "#5c6f4a" },
  { label: "Gold ochre", value: "#a97e35" },
  { label: "Plum", value: "#6b3f5e" },
];

export const PAPERS: { label: string; value: string; grid: string }[] = [
  { label: "Rice paper", value: "#f4efe4", grid: "#c9bda3" },
  { label: "Cream", value: "#faf7f0", grid: "#d8cfbd" },
  { label: "Slate", value: "#23272b", grid: "#4a5158" },
];
