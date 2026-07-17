import type { EngItem, FormValues, LineItem } from "./types";

export const PROFIT_RATE = 0.2;
export const VAT_RATE = 0.22;

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : 0; // пусто / null / NaN / 0 / отрицательное ⇒ 0
};

/** СТРОГОЕ ПРАВИЛО: если кол-во ИЛИ цена пусты/0 — позиция НЕ участвует в расчете. */
export function lineSum(it: LineItem, matCoef = 1, frameCoef = 1): number {
  const qty = n(it.qty);
  const price = n(it.price);
  if (!qty || !price) return 0;
  return qty * price * matCoef * (it.frame ? frameCoef : 1);
}

/** Доп. инженерные сети: Площадь × Тариф × Коэффициент. Пустой коэффициент ⇒ система исключена. */
export function engSum(it: EngItem, area: number): number {
  const rate = n(it.rate);
  const coef = n(it.coef);
  if (!area || !rate || !coef) return 0;
  return area * rate * coef;
}

export interface SectionTotals {
  cost: number;      // Себестоимость
  profit: number;    // Прибыль 20%
  beforeVat: number; // Итого без НДС
  vat: number;       // НДС 22%
  total: number;     // Итого с НДС
  applyProfit: boolean;
}

export function sectionTotals(cost: number, applyProfit: boolean): SectionTotals {
  const profit = applyProfit ? cost * PROFIT_RATE : 0;
  const beforeVat = cost + profit;
  const vat = beforeVat * VAT_RATE;
  return { cost, profit, beforeVat, vat, total: beforeVat + vat, applyProfit };
}

export interface CalcResult {
  blocks: {
    materials: SectionTotals;
    engineering: SectionTotals;
    equipment: SectionTotals;
    assembly: SectionTotals;
    transport: SectionTotals;
    works: SectionTotals;
    services: SectionTotals;
  };
  rowSums: Record<string, number>; // id → сумма строки (для отображения в таблицах)
  grand: SectionTotals & { perM2: number; perModule: number };
}

/* Как в исходном Excel: разделы III, IV и VI идут без 20% наценки.
   Поставьте true, если наценка нужна во всех разделах. */
const PROFIT_FLAGS = {
  materials: true, engineering: true, equipment: true,
  assembly: false, transport: false, works: true, services: false,
} as const;

export function computeAll(v: FormValues): CalcResult {
  const matCoef = n(v.params.matPriceCoef) || 1;
  const frameCoef = n(v.params.frameCoef) || 1;
  const building = v.params.productType === "building";
  const area = n(v.params.totalArea);

  const rowSums: Record<string, number> = {};

  const sumSection = (items: LineItem[], useMatCoef = false) =>
    items.reduce((acc, it) => {
      const s =
        it.buildingOnly && !building
          ? 0
          : lineSum(it, useMatCoef ? matCoef : 1, useMatCoef ? frameCoef : 1);
      rowSums[it.id] = s;
      return acc + s;
    }, 0);

  const materialsCost =
    sumSection(v.materialsConst, true) + sumSection(v.materialsVar, true);

  const engineeringCost = v.engineering.reduce((acc, it) => {
    const s = engSum(it, area);
    rowSums[it.id] = s;
    return acc + s;
  }, 0);

  const blocks = {
    materials: sectionTotals(materialsCost, PROFIT_FLAGS.materials),
    engineering: sectionTotals(engineeringCost, PROFIT_FLAGS.engineering),
    equipment: sectionTotals(sumSection(v.equipment), PROFIT_FLAGS.equipment),
    assembly: sectionTotals(sumSection(v.assembly), PROFIT_FLAGS.assembly),
    transport: sectionTotals(sumSection(v.transport), PROFIT_FLAGS.transport),
    works: sectionTotals(sumSection(v.works), PROFIT_FLAGS.works),
    services: sectionTotals(sumSection(v.services), PROFIT_FLAGS.services),
  };

  const list = Object.values(blocks);
  const grandCost = list.reduce((a, b) => a + b.cost, 0);
  const grandProfit = list.reduce((a, b) => a + b.profit, 0);
  const grandBeforeVat = list.reduce((a, b) => a + b.beforeVat, 0);
  const grandVat = list.reduce((a, b) => a + b.vat, 0);
  const grandTotal = list.reduce((a, b) => a + b.total, 0);
  const modules = n(v.params.containersQty);

  return {
    blocks,
    rowSums,
    grand: {
      cost: grandCost, profit: grandProfit, beforeVat: grandBeforeVat,
      vat: grandVat, total: grandTotal, applyProfit: true,
      perM2: area ? grandTotal / area : 0,
      perModule: modules ? grandTotal / modules : 0,
    },
  };
}
