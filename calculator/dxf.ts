/* calculator/dxf.ts — минимальный парсер ASCII-DXF для извлечения
   размерных подписей и габаритов геометрии. DXF — текстовый формат:
   пары строк «код группы» / «значение». Нам нужны:
   - TEXT/MTEXT (код 1) — подписи размеров («6000», «3000», «СП 100»…)
   - LINE (10,20 — 11,21), LWPOLYLINE (пары 10/20), CIRCLE (10,20,40) — габариты. */

export interface DxfExtract {
  texts: string[];      // уникальные текстовые подписи (до 120 шт.)
  numbers: number[];    // числа, извлечённые из подписей (по убыванию, до 60 шт.)
  bboxMm: { w: number; h: number } | null; // габаритный прямоугольник геометрии (в единицах файла, обычно мм)
}

const num = (s: string): number | null => {
  const v = Number(s.trim().replace(",", "."));
  return Number.isFinite(v) ? v : null;
};

export function parseDxf(content: string): DxfExtract {
  const lines = content.split(/\r\n|\r|\n/);
  const texts = new Set<string>();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasGeom = false;

  const pt = (x: number, y: number) => {
    hasGeom = true;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };

  // Идём парами (код, значение)
  let pendingX: number | null = null;
  let pendingY: number | null = null;
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = lines[i].trim();
    const value = lines[i + 1];

    if (code === "1" || code === "3") {
      // текстовое значение (1 — основная строка TEXT/MTEXT, 3 — доп. строки MTEXT)
      const t = value.replace(/\\[A-Za-z][^;]*;?/g, " ").replace(/[{}]/g, "").trim();
      if (t && t.length <= 120) texts.add(t);
      continue;
    }
    if (code === "10" || code === "11" || code === "12" || code === "13") {
      pendingX = num(value);
      continue;
    }
    if (code === "20" || code === "21" || code === "22" || code === "23") {
      pendingY = num(value);
      if (pendingX !== null && pendingY !== null) pt(pendingX, pendingY);
      pendingX = null;
      pendingY = null;
      continue;
    }
    if (code === "40") {
      // радиус CIRCLE/ARC — расширяем bbox от центра (центр придёт парой 10/20 до этого)
      const r = num(value);
      if (r !== null && r > 0 && minX !== Infinity) {
        pt(minX - r, minY - r);
        pt(maxX + r, maxY + r);
      }
      continue;
    }
  }

  // Числа из текстовых подписей: «6000», «3 000», «6,0», «СП 100»…
  const numbers: number[] = [];
  for (const t of texts) {
    for (const m of t.matchAll(/-?\d[\d\s\u00A0]*[.,]?\d*/g)) {
      const v = num(m[0].replace(/[\s\u00A0]/g, ""));
      if (v !== null && v > 0 && v < 1e9) numbers.push(v);
    }
  }
  numbers.sort((a, b) => b - a);

  return {
    texts: [...texts].slice(0, 120),
    numbers: numbers.slice(0, 60),
    bboxMm: hasGeom ? { w: maxX - minX, h: maxY - minY } : null,
  };
}
