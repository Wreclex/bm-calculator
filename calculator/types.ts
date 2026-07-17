import { z } from "zod";

/* ---------- Domain types ---------- */

export interface LineItem {
  id: string;
  name: string;
  unit: string;
  qty: number | null;
  price: number | null;
  frame?: boolean;        // подпадает под коэф. толщины рамы
  buildingOnly?: boolean; // учитывается только при «Признак продукции = Здание»
  category?: string;      // для Раздела II
}

export interface EngItem {
  id: string;
  name: string;
  rate: number | null; // тариф руб/м²
  coef: number | null; // К-соотношения: пусто/0 ⇒ система НЕ участвует в расчете
}

export interface Params {
  frameCoef: number | null;
  matPriceCoef: number | null;
  totalArea: number | null;
  footprintArea: number | null;
  containersQty: number | null;
  containersArea: number | null;
  buildingWidth: number | null;
  buildingLength: number | null;
  floorHeight: number | null;
  spHeight: number | null;
  spWidth: number | null;
  productType: "building" | "none";
  /* --- v4: расширенные параметры --- */
  spThickness: number | null;        // толщина сэндвич-панели, мм (80/100/150/200)
  construction: "light" | "standard" | "reinforced"; // конструктив → пресет коэф. толщины рамы
  italianSystem: boolean;            // итальянская система (справочно, уходит в сводку и ИИ)
  floors: number | null;             // количество этажей
}

export interface FormValues {
  params: Params;
  materialsConst: LineItem[];
  materialsVar: LineItem[];
  engineering: EngItem[];
  equipment: LineItem[];
  assembly: LineItem[];
  transport: LineItem[];
  works: LineItem[];
  services: LineItem[];
}

/* ---------- Zod schema ----------
   Пустой input (valueAsNumber ⇒ NaN) допустим: правило «пустая ячейка ⇒ 0».
   Отрицательные значения запрещены.
   Без .optional(): входной тип должен совпадать с FormValues (number | null),
   иначе zodResolver не совместим с useForm<FormValues> по типам. */

const num = z
  .union([z.number().min(0, "Значение не может быть отрицательным"), z.nan(), z.null()])
  .transform((v) => (v === null || v === undefined || Number.isNaN(v) ? null : v));

const lineItem = z.object({
  id: z.string(),
  name: z.string().min(1),
  unit: z.string(),
  qty: num,
  price: num,
  frame: z.boolean().optional(),
  buildingOnly: z.boolean().optional(),
  category: z.string().optional(),
});

const engItem = z.object({
  id: z.string(),
  name: z.string(),
  rate: num,
  coef: num,
});

export const formSchema = z.object({
  params: z.object({
    frameCoef: num,
    matPriceCoef: num,
    totalArea: num,
    footprintArea: num,
    containersQty: num,
    containersArea: num,
    buildingWidth: num,
    buildingLength: num,
    floorHeight: num,
    spHeight: num,
    spWidth: num,
    productType: z.enum(["building", "none"]),
    spThickness: num,
    construction: z.enum(["light", "standard", "reinforced"]),
    italianSystem: z.boolean(),
    floors: num,
  }),
  materialsConst: z.array(lineItem),
  materialsVar: z.array(lineItem),
  engineering: z.array(engItem),
  equipment: z.array(lineItem),
  assembly: z.array(lineItem),
  transport: z.array(lineItem),
  works: z.array(lineItem),
  services: z.array(lineItem),
});
