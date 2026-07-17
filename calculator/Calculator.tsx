"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2, Boxes, Cable, Sofa, Hammer, Truck, Layers,
  BadgePlus, RotateCcw, ChevronDown, Plus, Trash2, BookOpen, MapPin, Calculator,
} from "lucide-react";
import { formSchema, type EngItem, type FormValues, type LineItem, type Params } from "./types";
import {
  makeDefaults, REF_DOORS, REF_WINDOWS, REF_FURNITURE, REF_PLUMBING,
  REF_APPLIANCES, REF_CITIES, REF_SP_PRICES, type RefItem,
} from "./reference";
import { computeAll, type SectionTotals } from "./calc";

/* ---------------- helpers ---------------- */

const fmt = new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rub = (v: number) => `${fmt.format(v)} ₽`;

const inputCls =
  "w-full rounded-lg border border-sand-dark bg-white px-2.5 py-1.5 text-right text-sm tabular-nums " +
  "text-cocoa shadow-[inset_0_1px_2px_rgba(61,47,38,0.05)] outline-none transition " +
  "focus:border-terra focus:ring-2 focus:ring-terra/15 placeholder:text-taupe/50";

/* ---------------- small UI blocks ---------------- */

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-sand bg-white p-5 sm:p-6 shadow-[0_1px_2px_rgba(61,47,38,0.05),0_10px_28px_-14px_rgba(61,47,38,0.14)] ${className}`}
    >
      {children}
    </section>
  );
}

function SectionHeader({ icon: Icon, code, title }: { icon: React.ElementType; code: string; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-terra-50 text-terra ring-1 ring-terra-100">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-terra">{code}</p>
        <h2 className="text-lg font-semibold leading-snug text-cocoa">{title}</h2>
      </div>
    </div>
  );
}

/* Итоги раздела — визуально выделенная «плашка».
   memo: примитивные пропсы ⇒ перерендер только при изменении чисел этого раздела. */
const TotalsFooter = memo(function TotalsFooter({ cost, profit, beforeVat, vat, total, applyProfit }: SectionTotals) {
  return (
    <div className="mt-4 space-y-1 rounded-xl border border-terra-100 bg-gradient-to-br from-terra-50 to-parchment px-4 py-3 text-sm">
      <div className="flex justify-between text-cocoa-soft">
        <span>Себестоимость</span>
        <span className="tabular-nums">{rub(cost)}</span>
      </div>
      {applyProfit && (
        <div className="flex justify-between text-cocoa-soft">
          <span>Прибыль (20%)</span>
          <span className="tabular-nums">{rub(profit)}</span>
        </div>
      )}
      <div className="flex justify-between text-cocoa-soft">
        <span>Итого без НДС</span>
        <span className="tabular-nums">{rub(beforeVat)}</span>
      </div>
      <div className="flex justify-between text-cocoa-soft">
        <span>НДС (22%)</span>
        <span className="tabular-nums">{rub(vat)}</span>
      </div>
      <div className="mt-1 flex items-baseline justify-between border-t border-terra-100 pt-2">
        <span className="font-semibold text-cocoa">Итого с НДС</span>
        <span className="text-base font-bold tabular-nums text-terra-dark">{rub(total)}</span>
      </div>
    </div>
  );
});

/* ---------------- generic items table ---------------- */

type RemoveFn = (index: number) => void;

/* Строка таблицы позиций. memo работает благодаря стабильным ссылкам RHF:
   объект строки мутируется на месте (identity сохраняется), register стабилен,
   sum — примитив. Редактируемая строка перерендеривается (новый sum),
   остальные ~150 строк — нет. */
const ItemRow = memo(function ItemRow({
  name, index, item, sum, register, building, onRemove,
}: {
  name: string;
  index: number;
  item: LineItem;
  sum: number;
  register: UseFormRegister<FormValues>;
  building?: boolean;
  onRemove?: RemoveFn;
}) {
  const excluded = item.buildingOnly && !building;
  return (
    <tr className={excluded ? "opacity-40" : sum === 0 ? "text-taupe" : "text-cocoa"}>
      <td>
        {item.name}
        {item.buildingOnly && (
          <span className="ml-2 whitespace-nowrap rounded-md bg-[#FBF3E2] px-1.5 py-0.5 text-[10px] font-medium text-[#A8702A] ring-1 ring-[#F0E2C0]">
            только «Здание»
          </span>
        )}
      </td>
      <td className="text-taupe">{item.unit}</td>
      <td className="w-28">
        <input type="number" step="0.01" min="0" placeholder="—" className={inputCls}
          {...register(`${name}.${index}.qty` as never, { valueAsNumber: true })} />
      </td>
      <td className="w-32">
        <input type="number" step="0.01" min="0" placeholder="—" className={inputCls}
          {...register(`${name}.${index}.price` as never, { valueAsNumber: true })} />
      </td>
      <td className={`w-36 text-right tabular-nums ${sum ? "font-medium text-cocoa" : ""}`}>
        {sum ? fmt.format(sum) : "0,00"}
      </td>
      {onRemove && (
        <td className="w-9 pl-1">
          <button type="button" onClick={() => onRemove(index)}
            className="rounded-lg p-1.5 text-taupe/60 transition hover:bg-[#FBEBE4] hover:text-[#B3402A]"
            aria-label="Удалить строку">
            <Trash2 className="h-4 w-4" />
          </button>
        </td>
      )}
    </tr>
  );
});

function ItemsTable({
  name, items, register, rowSums, building, onRemove,
}: {
  name: string;
  items: FormValues["assembly"];
  register: UseFormRegister<FormValues>;
  rowSums: Record<string, number>;
  building?: boolean;
  onRemove?: RemoveFn;
}) {
  return (
    <div className="bm-table-wrap">
      <table className="bm-table min-w-[600px]">
        <thead>
          <tr>
            <th>Наименование</th>
            <th>Ед.</th>
            <th className="bm-num">Кол-во</th>
            <th className="bm-num">Цена, ₽</th>
            <th className="bm-num">Сумма, ₽</th>
            {onRemove && <th className="w-9" />}
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <ItemRow key={it.id} name={name} index={i} item={it} sum={rowSums[it.id] ?? 0}
              register={register} building={building} onRemove={onRemove} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* Строка инженерных сетей (тариф × коэффициент × площадь). */
const EngRow = memo(function EngRow({
  index, item, sum, register,
}: {
  index: number;
  item: EngItem;
  sum: number;
  register: UseFormRegister<FormValues>;
}) {
  return (
    <tr className={sum === 0 ? "text-taupe" : "text-cocoa"}>
      <td>{item.name}</td>
      <td className="w-32">
        <input type="number" step="0.01" min="0" placeholder="—" className={inputCls}
          {...register(`engineering.${index}.rate`, { valueAsNumber: true })} />
      </td>
      <td className="w-28">
        <input type="number" step="0.01" min="0" placeholder="—" className={inputCls}
          {...register(`engineering.${index}.coef`, { valueAsNumber: true })} />
      </td>
      <td className={`w-36 text-right tabular-nums ${sum ? "font-medium text-cocoa" : ""}`}>
        {fmt.format(sum)}
      </td>
    </tr>
  );
});

/* Поле параметра в «Исходных данных». memo: строковые пропсы + стабильный register. */
const ParamField = memo(function ParamField({
  label, name, step = "0.01", accent = false, register,
}: {
  label: string;
  name: keyof Params;
  step?: string;
  accent?: boolean;
  register: UseFormRegister<FormValues>;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-taupe">{label}</span>
      <input type="number" step={step} min="0" placeholder="—"
        className={`${inputCls} ${accent ? "border-terra/40 bg-terra-50/60" : ""}`}
        {...register(`params.${name}` as never, { valueAsNumber: true })} />
    </label>
  );
});

/* ---------------- reference panel ---------------- */

const RefList = memo(function RefList({ items, onPick }: { items: RefItem[]; onPick: (it: RefItem) => void }) {
  return (
    <ul className="grid gap-1 sm:grid-cols-2">
      {items.map((it) => (
        <li key={it.name}>
          <button type="button" onClick={() => onPick(it)}
            className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-cocoa-soft ring-1 ring-transparent transition hover:bg-terra-50 hover:text-terra-dark hover:ring-terra-100">
            <span className="flex items-center gap-2">
              <Plus className="h-3.5 w-3.5 shrink-0 text-terra" />
              {it.name}
            </span>
            <span className="whitespace-nowrap tabular-nums text-taupe">{fmt.format(it.price)} ₽</span>
          </button>
        </li>
      ))}
    </ul>
  );
});

/* ================================================================== */

export default function CalculatorApp() {
  const defaults = useMemo(() => makeDefaults(), []);
  const {
    register, control, reset, setValue, getValues,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaults,
    mode: "onChange",
  });

  // append/remove у RHF стабильны между рендерами (useCallback внутри useFieldArray).
  const { append: appendEquipment, remove: removeEquipment } = useFieldArray({ control, name: "equipment" });

  // useWatch — каноничная подписка на всю форму (реактивный пересчет,
  // uncontrolled-инпуты + один O(n)-проход). Не помечается react-hooks-линтером
  // как несовместимая API, в отличие от watch(). Каст к FormValues безопасен:
  // defaultValues покрывают все поля, на форме только мутации листовых чисел.
  const values = useWatch({ control }) as FormValues;
  // computeAll — дешёвый O(n) (~150 строк простой арифметики). useMemo здесь бесполезен:
  // watch() каждый рендер отдаёт новый (shallow) объект, а JSON.stringify(values) из старого
  // кода сериализовал всю форму на КАЖДОМ рендере — это и было узким местом. Убрано.
  const result = computeAll(values);

  const [refOpen, setRefOpen] = useState(false);
  const [refTab, setRefTab] = useState<"doors" | "windows" | "furniture" | "plumbing" | "appliances" | "cities">("doors");
  const building = values.params.productType === "building";

  /* --- reference actions --- */
  const addEquipment = useCallback(
    (it: RefItem, category: string) =>
      appendEquipment({ id: `eq-${Date.now()}`, name: it.name, unit: "шт", qty: 1, price: it.price, category }),
    [appendEquipment],
  );

  const addCustomEquipment = useCallback(
    () =>
      appendEquipment({ id: `eq-${Date.now()}`, name: "Новая позиция", unit: "шт", qty: null, price: null, category: "Нестандартные комплектующие" }),
    [appendEquipment],
  );

  const pickMaterialRow = useCallback(
    (rowId: "doors" | "windows", it: RefItem) => {
      const idx = getValues("materialsVar").findIndex((r) => r.id === rowId);
      if (idx < 0) return;
      const qty = Number(getValues(`materialsVar.${idx}.qty`)) || 0;
      setValue(`materialsVar.${idx}.price`, it.price, { shouldDirty: true });
      setValue(`materialsVar.${idx}.qty`, qty + 1, { shouldDirty: true });
    },
    [getValues, setValue],
  );

  const pickCity = useCallback(
    (city: (typeof REF_CITIES)[number]) => {
      const t = getValues("transport");
      const truck = t.findIndex((r) => r.id === "truck");
      const tral = t.findIndex((r) => r.id === "tral");
      if (city.tent != null && truck >= 0) setValue(`transport.${truck}.price`, city.tent, { shouldDirty: true });
      if (city.tral != null && tral >= 0) setValue(`transport.${tral}.price`, city.tral, { shouldDirty: true });
    },
    [getValues, setValue],
  );

  const pickDoor = useCallback((it: RefItem) => pickMaterialRow("doors", it), [pickMaterialRow]);
  const pickWindow = useCallback((it: RefItem) => pickMaterialRow("windows", it), [pickMaterialRow]);
  const addFurniture = useCallback((it: RefItem) => addEquipment(it, "Мебель"), [addEquipment]);
  const addPlumbing = useCallback((it: RefItem) => addEquipment(it, "Сантехника"), [addEquipment]);
  const addAppliance = useCallback((it: RefItem) => addEquipment(it, "Техника"), [addEquipment]);

  const resetAll = useCallback(() => reset(makeDefaults()), [reset]);
  const toggleRef = useCallback(() => setRefOpen((o) => !o), []);

  const B = result.blocks;

  return (
    <div className="min-h-screen bg-cream pb-16 text-cocoa">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-sand bg-parchment/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-terra-soft to-terra-dark text-white shadow-[0_4px_12px_rgba(194,112,61,0.35)]">
              <Calculator className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-base font-semibold leading-tight text-cocoa sm:text-lg">Калькулятор себестоимости блок-модулей</h1>
              <p className="hidden text-xs text-taupe sm:block">Модульные здания · расчет в реальном времени</p>
            </div>
          </div>
          <button type="button" onClick={resetAll}
            className="inline-flex items-center gap-2 rounded-lg border border-sand-dark bg-white px-3 py-2 text-sm font-medium text-cocoa-soft shadow-sm transition hover:border-terra/40 hover:bg-terra-50 hover:text-terra-dark">
            <RotateCcw className="h-4 w-4" /> Сбросить
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 pt-6 sm:px-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ============ LEFT: forms ============ */}
        <div className="min-w-0 space-y-6">

          {/* Исходные данные */}
          <Card>
            <SectionHeader icon={Building2} code="Параметры" title="Исходные данные" />
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
              <ParamField label="Коэф. толщины рамы" name="frameCoef" accent register={register} />
              <ParamField label="Коэф. цены материалов" name="matPriceCoef" accent register={register} />
              <ParamField label="Общая площадь здания, м²" name="totalArea" register={register} />
              <ParamField label="Площадь застройки, м²" name="footprintArea" register={register} />
              <ParamField label="Кол-во контейнеров, шт" name="containersQty" step="1" register={register} />
              <ParamField label="Площадь контейнеров, м²" name="containersArea" register={register} />
              <ParamField label="Ширина здания, м" name="buildingWidth" register={register} />
              <ParamField label="Длина здания, м" name="buildingLength" register={register} />
              <ParamField label="Высота этажа, м" name="floorHeight" register={register} />
              <ParamField label="Высота СП, м" name="spHeight" register={register} />
              <ParamField label="Ширина СП, м" name="spWidth" register={register} />
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-taupe">Признак продукции</span>
                <select {...register("params.productType")}
                  className="w-full rounded-lg border border-sand-dark bg-white px-2.5 py-[7px] text-sm text-cocoa shadow-[inset_0_1px_2px_rgba(61,47,38,0.05)] outline-none transition focus:border-terra focus:ring-2 focus:ring-terra/15">
                  <option value="building">Здание</option>
                  <option value="none">— (пусто)</option>
                </select>
              </label>
            </div>
            <p className="mt-4 rounded-xl bg-terra-50 px-3.5 py-2.5 text-xs leading-relaxed text-terra-dark ring-1 ring-terra-100">
              Если ячейка «Кол-во» или «Цена» пустая либо равна 0 — позиция <b>не участвует</b> в расчете стоимости.
              Значение коэффициента «1» принимает полную стоимость м²; ниже/выше «1» — уменьшает/увеличивает её.
            </p>
          </Card>

          {/* Раздел I */}
          <Card>
            <SectionHeader icon={Boxes} code="Раздел I" title="Материалы" />
            <h3 className="mb-2.5 text-sm font-semibold text-cocoa-soft">1. Материалы для контейнеров постоянные</h3>
            <ItemsTable name="materialsConst" items={values.materialsConst} register={register}
              rowSums={result.rowSums} building={building} />
            <h3 className="mb-2.5 mt-6 text-sm font-semibold text-cocoa-soft">2. Материалы переменные</h3>
            <ItemsTable name="materialsVar" items={values.materialsVar} register={register}
              rowSums={result.rowSums} building={building} />
            <TotalsFooter {...B.materials} />
          </Card>

          {/* Раздел I доп: инженерные сети */}
          <Card>
            <SectionHeader icon={Cable} code="Раздел I · Дополнительно" title="Дополнительные инженерные сети" />
            <p className="mb-3 text-xs text-taupe">
              Стоимость = Общая площадь ({fmt.format(Number(values.params.totalArea) || 0)} м²) × Тариф × Коэффициент.
              Пустой или нулевой коэффициент исключает систему из расчета.
            </p>
            <div className="bm-table-wrap">
              <table className="bm-table min-w-[560px]">
                <thead>
                  <tr>
                    <th>Система</th>
                    <th className="bm-num">Тариф, ₽/м²</th>
                    <th className="bm-num">Коэф.</th>
                    <th className="bm-num">Сумма, ₽</th>
                  </tr>
                </thead>
                <tbody>
                  {values.engineering.map((it, i) => (
                    <EngRow key={it.id} index={i} item={it} sum={result.rowSums[it.id] ?? 0} register={register} />
                  ))}
                </tbody>
              </table>
            </div>
            <TotalsFooter {...B.engineering} />
          </Card>

          {/* Раздел II */}
          <Card>
            <SectionHeader icon={Sofa} code="Раздел II" title="Наполнение комплектующими" />
            <ItemsTable name="equipment" items={values.equipment} register={register}
              rowSums={result.rowSums} onRemove={removeEquipment} />
            <button type="button" onClick={addCustomEquipment}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-terra/40 px-3.5 py-2 text-sm font-medium text-terra transition hover:bg-terra-50">
              <Plus className="h-4 w-4" /> Добавить строку
            </button>
            <p className="mt-2 text-xs text-taupe">
              Позиции удобно добавлять из «Справочных данных» внизу страницы (сантехника, мебель, техника).
            </p>
            <TotalsFooter {...B.equipment} />
          </Card>

          {/* Раздел III */}
          <Card>
            <SectionHeader icon={Hammer} code="Раздел III" title="Сборка модульного здания" />
            <ItemsTable name="assembly" items={values.assembly} register={register} rowSums={result.rowSums} />
            <TotalsFooter {...B.assembly} />
          </Card>

          {/* Раздел IV */}
          <Card>
            <SectionHeader icon={Truck} code="Раздел IV" title="Транспортные услуги (доставка)" />
            <ItemsTable name="transport" items={values.transport} register={register} rowSums={result.rowSums} />
            <p className="mt-2 text-xs leading-relaxed text-taupe">
              Выберите город в «Справочных данных» — цены фуры и трала подставятся автоматически.
              Ориентир загрузки фуры: СП 80 мм — 240 шт, 100 мм — 200 шт, 150 мм — 120 шт, 200 мм — 40 шт; 16 рам; 600 стоек. 1 трал = 6 блок-модулей.
            </p>
            <TotalsFooter {...B.transport} />
          </Card>

          {/* Раздел V */}
          <Card>
            <SectionHeader icon={Layers} code="Раздел V" title="Дополнительные работы (фундамент)" />
            <ItemsTable name="works" items={values.works} register={register} rowSums={result.rowSums} />
            <TotalsFooter {...B.works} />
          </Card>

          {/* Раздел VI */}
          <Card>
            <SectionHeader icon={BadgePlus} code="Раздел VI" title="Дополнительные услуги" />
            <ItemsTable name="services" items={values.services} register={register} rowSums={result.rowSums} />
            <TotalsFooter {...B.services} />
          </Card>

          {/* Справочные данные */}
          <Card>
            <button type="button" onClick={toggleRef}
              className="flex w-full items-center justify-between">
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-terra-50 text-terra ring-1 ring-terra-100">
                  <BookOpen className="h-5 w-5" />
                </span>
                <span className="text-lg font-semibold text-cocoa">Справочные данные</span>
              </span>
              <ChevronDown className={`h-5 w-5 text-taupe transition-transform ${refOpen ? "rotate-180" : ""}`} />
            </button>

            {refOpen && (
              <div className="mt-4">
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {([
                    ["doors", "Двери"], ["windows", "Окна"], ["furniture", "Мебель"],
                    ["plumbing", "Сантехника"], ["appliances", "Техника"], ["cities", "Доставка (города)"],
                  ] as const).map(([k, label]) => (
                    <button key={k} type="button" onClick={() => setRefTab(k)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                        refTab === k ? "bg-terra text-white shadow-[0_2px_8px_rgba(194,112,61,0.35)]" : "bg-terra-50/70 text-cocoa-soft hover:bg-terra-100"
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>

                {refTab === "doors" && (
                  <>
                    <p className="mb-2 text-xs text-taupe">Клик — подставит цену в строку «Двери» (Раздел I) и увеличит количество на 1.</p>
                    <RefList items={REF_DOORS} onPick={pickDoor} />
                  </>
                )}
                {refTab === "windows" && (
                  <>
                    <p className="mb-2 text-xs text-taupe">Клик — подставит цену в строку «Окна» (Раздел I) и увеличит количество на 1.</p>
                    <RefList items={REF_WINDOWS} onPick={pickWindow} />
                    <div className="mt-4 text-xs text-taupe">
                      Справочно, цена СП по толщине (₽/м²):{" "}
                      {REF_SP_PRICES.map((p) => `${p.th} мм — ${p.price}`).join(" · ")}
                    </div>
                  </>
                )}
                {refTab === "furniture" && <RefList items={REF_FURNITURE} onPick={addFurniture} />}
                {refTab === "plumbing" && <RefList items={REF_PLUMBING} onPick={addPlumbing} />}
                {refTab === "appliances" && <RefList items={REF_APPLIANCES} onPick={addAppliance} />}
                {refTab === "cities" && (
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {REF_CITIES.map((c) => (
                      <li key={c.name}>
                        <button type="button" onClick={() => pickCity(c)}
                          className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-cocoa-soft transition hover:bg-terra-50 hover:text-terra-dark">
                          <span className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-terra" /> {c.name}
                          </span>
                          <span className="whitespace-nowrap text-xs tabular-nums text-taupe">
                            {c.tent ? `тент ${fmt.format(c.tent)}` : ""}{c.tent && c.tral ? " · " : ""}
                            {c.tral ? `трал ${fmt.format(c.tral)}` : ""}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* ============ RIGHT: sticky summary ============ */}
        <aside className="xl:sticky xl:top-20 xl:h-fit">
          <div className="rounded-2xl bg-gradient-to-br from-[#463528] via-cocoa to-[#2E211A] p-5 text-white shadow-[0_16px_36px_-14px_rgba(61,47,38,0.55)] ring-1 ring-[#5A4636]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-terra-soft">Итог по проекту</p>
            <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">{rub(result.grand.total)}</p>
            <p className="text-xs text-white/45">Итого с НДС по всем разделам</p>

            <dl className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-white/55">Себестоимость</dt><dd className="tabular-nums">{rub(result.grand.cost)}</dd></div>
              <div className="flex justify-between"><dt className="text-white/55">Прибыль (20%)</dt><dd className="tabular-nums text-[#F2C79B]">{rub(result.grand.profit)}</dd></div>
              <div className="flex justify-between"><dt className="text-white/55">Итого без НДС</dt><dd className="tabular-nums">{rub(result.grand.beforeVat)}</dd></div>
              <div className="flex justify-between"><dt className="text-white/55">НДС (22%)</dt><dd className="tabular-nums text-[#F2C79B]">{rub(result.grand.vat)}</dd></div>
            </dl>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-4 text-center">
              <div className="rounded-xl bg-white/[0.07] p-2.5 ring-1 ring-white/10">
                <p className="text-[10px] uppercase tracking-wide text-white/50">за м²</p>
                <p className="text-sm font-semibold tabular-nums">{rub(result.grand.perM2)}</p>
              </div>
              <div className="rounded-xl bg-white/[0.07] p-2.5 ring-1 ring-white/10">
                <p className="text-[10px] uppercase tracking-wide text-white/50">за блок-модуль</p>
                <p className="text-sm font-semibold tabular-nums">{rub(result.grand.perModule)}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-sand bg-white p-4 shadow-[0_1px_2px_rgba(61,47,38,0.05),0_10px_28px_-14px_rgba(61,47,38,0.14)]">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-taupe">По разделам (с НДС)</p>
            <ul className="space-y-1.5 text-sm">
              {([
                ["I. Материалы", B.materials], ["I доп. Инженерные сети", B.engineering],
                ["II. Наполнение", B.equipment], ["III. Сборка", B.assembly],
                ["IV. Доставка", B.transport], ["V. Доп. работы", B.works], ["VI. Доп. услуги", B.services],
              ] as const).map(([label, t]) => (
                <li key={label} className="flex items-center justify-between gap-2">
                  <span className={t.total ? "text-cocoa-soft" : "text-taupe/60"}>{label}</span>
                  <span className={`tabular-nums ${t.total ? "font-medium text-cocoa" : "text-taupe/60"}`}>
                    {rub(t.total)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}
