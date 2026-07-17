"use client";

import { useMemo, useState } from "react";
import { useFieldArray, useForm, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2, Boxes, Cable, Sofa, Hammer, Truck, Layers,
  BadgePlus, RotateCcw, ChevronDown, Plus, Trash2, BookOpen, MapPin, Calculator,
} from "lucide-react";
import { formSchema, type FormValues } from "./types";
import {
  makeDefaults, REF_DOORS, REF_WINDOWS, REF_FURNITURE, REF_PLUMBING,
  REF_APPLIANCES, REF_CITIES, REF_SP_PRICES, type RefItem,
} from "./reference";
import { computeAll, type SectionTotals } from "./calc";

/* ---------------- helpers ---------------- */

const fmt = new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rub = (v: number) => `${fmt.format(v)} ₽`;

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-right text-sm tabular-nums " +
  "text-slate-800 shadow-inner outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 " +
  "placeholder:text-slate-300";

/* ---------------- small UI blocks ---------------- */

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 ${className}`}>
      {children}
    </section>
  );
}

function SectionHeader({ icon: Icon, code, title }: { icon: React.ElementType; code: string; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500">{code}</p>
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      </div>
    </div>
  );
}

function TotalRow({ l, v, strong = false }: { l: string; v: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-semibold text-slate-900" : "text-slate-500"}`}>
      <span>{l}</span>
      <span className="tabular-nums">{rub(v)}</span>
    </div>
  );
}

function TotalsFooter({ t }: { t: SectionTotals }) {
  return (
    <div className="mt-4 space-y-1 rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-slate-100">
      <TotalRow l="Себестоимость" v={t.cost} />
      {t.applyProfit && <TotalRow l="Прибыль (20%)" v={t.profit} />}
      <TotalRow l="Итого без НДС" v={t.beforeVat} />
      <TotalRow l="НДС (22%)" v={t.vat} />
      <div className="border-t border-slate-200 pt-1">
        <TotalRow l="Итого с НДС" v={t.total} strong />
      </div>
    </div>
  );
}

/* ---------------- generic items table ---------------- */

function ItemsTable({
  name, items, register, rowSums, building, onRemove,
}: {
  name: string;
  items: FormValues["assembly"];
  register: UseFormRegister<FormValues>;
  rowSums: Record<string, number>;
  building?: boolean;
  onRemove?: (index: number) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
            <th className="pb-2 pr-2 font-medium">Наименование</th>
            <th className="pb-2 pr-2 font-medium">Ед.</th>
            <th className="w-28 pb-2 pr-2 text-right font-medium">Кол-во</th>
            <th className="w-32 pb-2 pr-2 text-right font-medium">Цена, ₽</th>
            <th className="w-36 pb-2 text-right font-medium">Сумма, ₽</th>
            {onRemove && <th className="w-8 pb-2" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((it, i) => {
            const excluded = it.buildingOnly && !building;
            const sum = rowSums[it.id] ?? 0;
            return (
              <tr key={it.id} className={excluded ? "opacity-40" : sum === 0 ? "text-slate-400" : ""}>
                <td className="py-1.5 pr-2 text-slate-700">
                  {it.name}
                  {it.buildingOnly && (
                    <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 ring-1 ring-amber-200">
                      только «Здание»
                    </span>
                  )}
                </td>
                <td className="py-1.5 pr-2 text-slate-400">{it.unit}</td>
                <td className="py-1.5 pr-2">
                  <input type="number" step="0.01" min="0" placeholder="—" className={inputCls}
                    {...register(`${name}.${i}.qty` as never, { valueAsNumber: true })} />
                </td>
                <td className="py-1.5 pr-2">
                  <input type="number" step="0.01" min="0" placeholder="—" className={inputCls}
                    {...register(`${name}.${i}.price` as never, { valueAsNumber: true })} />
                </td>
                <td className={`py-1.5 text-right tabular-nums ${sum ? "font-medium text-slate-800" : ""}`}>
                  {sum ? fmt.format(sum) : "0,00"}
                </td>
                {onRemove && (
                  <td className="py-1.5 pl-1">
                    <button type="button" onClick={() => onRemove(i)}
                      className="rounded p-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                      aria-label="Удалить строку">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- reference panel ---------------- */

function RefList({ items, onPick }: { items: RefItem[]; onPick: (it: RefItem) => void }) {
  return (
    <ul className="grid gap-1 sm:grid-cols-2">
      {items.map((it) => (
        <li key={it.name}>
          <button type="button" onClick={() => onPick(it)}
            className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-600 ring-1 ring-transparent transition hover:bg-indigo-50 hover:text-indigo-700 hover:ring-indigo-100">
            <span className="flex items-center gap-2">
              <Plus className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
              {it.name}
            </span>
            <span className="whitespace-nowrap tabular-nums text-slate-400">{fmt.format(it.price)} ₽</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ================================================================== */

export default function CalculatorApp() {
  const defaults = useMemo(makeDefaults, []);
  const {
    register, control, watch, reset, setValue, getValues,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaults,
    mode: "onChange",
  });

  const equipmentArray = useFieldArray({ control, name: "equipment" });

  const values = watch(); // реактивный пересчет: uncontrolled-инпуты + один O(n)-проход
  const result = useMemo(() => computeAll(values), [JSON.stringify(values)]); // eslint-disable-line react-hooks/exhaustive-deps

  const [refOpen, setRefOpen] = useState(false);
  const [refTab, setRefTab] = useState<"doors" | "windows" | "furniture" | "plumbing" | "appliances" | "cities">("doors");
  const building = values.params.productType === "building";

  /* --- reference actions --- */
  const addEquipment = (it: RefItem, category: string) =>
    equipmentArray.append({ id: `eq-${Date.now()}`, name: it.name, unit: "шт", qty: 1, price: it.price, category });

  const pickMaterialRow = (rowId: "doors" | "windows", it: RefItem) => {
    const idx = getValues("materialsVar").findIndex((r) => r.id === rowId);
    if (idx < 0) return;
    const qty = Number(getValues(`materialsVar.${idx}.qty`)) || 0;
    setValue(`materialsVar.${idx}.price`, it.price, { shouldDirty: true });
    setValue(`materialsVar.${idx}.qty`, qty + 1, { shouldDirty: true });
  };

  const pickCity = (city: (typeof REF_CITIES)[number]) => {
    const t = getValues("transport");
    const truck = t.findIndex((r) => r.id === "truck");
    const tral = t.findIndex((r) => r.id === "tral");
    if (city.tent != null && truck >= 0) setValue(`transport.${truck}.price`, city.tent, { shouldDirty: true });
    if (city.tral != null && tral >= 0) setValue(`transport.${tral}.price`, city.tral, { shouldDirty: true });
  };

  const paramField = (label: string, name: keyof FormValues["params"], step = "0.01", accent = false) => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      <input type="number" step={step} min="0" placeholder="—"
        className={`${inputCls} ${accent ? "border-indigo-200 bg-indigo-50/40" : ""}`}
        {...register(`params.${name}` as never, { valueAsNumber: true })} />
    </label>
  );

  const B = result.blocks;

  return (
    <div className="min-h-screen bg-slate-50 pb-16 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow">
              <Calculator className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-base font-semibold leading-tight">Калькулятор себестоимости блок-модулей</h1>
              <p className="text-xs text-slate-500">Модульные здания · расчет в реальном времени</p>
            </div>
          </div>
          <button type="button" onClick={() => reset(makeDefaults())}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600">
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {paramField("Коэф. толщины рамы", "frameCoef", "0.01", true)}
              {paramField("Коэф. цены материалов", "matPriceCoef", "0.01", true)}
              {paramField("Общая площадь здания, м²", "totalArea")}
              {paramField("Площадь застройки, м²", "footprintArea")}
              {paramField("Кол-во контейнеров, шт", "containersQty", "1")}
              {paramField("Площадь контейнеров, м²", "containersArea")}
              {paramField("Ширина здания, м", "buildingWidth")}
              {paramField("Длина здания, м", "buildingLength")}
              {paramField("Высота этажа, м", "floorHeight")}
              {paramField("Высота СП, м", "spHeight")}
              {paramField("Ширина СП, м", "spWidth")}
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">Признак продукции</span>
                <select {...register("params.productType")}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-[7px] text-sm shadow-inner outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                  <option value="building">Здание</option>
                  <option value="none">— (пусто)</option>
                </select>
              </label>
            </div>
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-100">
              Если ячейка «Кол-во» или «Цена» пустая либо равна 0 — позиция <b>не участвует</b> в расчете стоимости.
              Значение коэффициента «1» принимает полную стоимость м²; ниже/выше «1» — уменьшает/увеличивает её.
            </p>
          </Card>

          {/* Раздел I */}
          <Card>
            <SectionHeader icon={Boxes} code="Раздел I" title="Материалы" />
            <h3 className="mb-2 text-sm font-semibold text-slate-500">1. Материалы для контейнеров постоянные</h3>
            <ItemsTable name="materialsConst" items={values.materialsConst} register={register}
              rowSums={result.rowSums} building={building} />
            <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-500">2. Материалы переменные</h3>
            <ItemsTable name="materialsVar" items={values.materialsVar} register={register}
              rowSums={result.rowSums} building={building} />
            <TotalsFooter t={B.materials} />
          </Card>

          {/* Раздел I доп: инженерные сети */}
          <Card>
            <SectionHeader icon={Cable} code="Раздел I · Дополнительно" title="Дополнительные инженерные сети" />
            <p className="mb-3 text-xs text-slate-400">
              Стоимость = Общая площадь ({fmt.format(Number(values.params.totalArea) || 0)} м²) × Тариф × Коэффициент.
              Пустой или нулевой коэффициент исключает систему из расчета.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="pb-2 pr-2 font-medium">Система</th>
                    <th className="w-32 pb-2 pr-2 text-right font-medium">Тариф, ₽/м²</th>
                    <th className="w-28 pb-2 pr-2 text-right font-medium">Коэф.</th>
                    <th className="w-36 pb-2 text-right font-medium">Сумма, ₽</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {values.engineering.map((it, i) => {
                    const sum = result.rowSums[it.id] ?? 0;
                    return (
                      <tr key={it.id} className={sum === 0 ? "text-slate-400" : ""}>
                        <td className="py-1.5 pr-2 text-slate-700">{it.name}</td>
                        <td className="py-1.5 pr-2">
                          <input type="number" step="0.01" min="0" placeholder="—" className={inputCls}
                            {...register(`engineering.${i}.rate`, { valueAsNumber: true })} />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input type="number" step="0.01" min="0" placeholder="—" className={inputCls}
                            {...register(`engineering.${i}.coef`, { valueAsNumber: true })} />
                        </td>
                        <td className={`py-1.5 text-right tabular-nums ${sum ? "font-medium text-slate-800" : ""}`}>
                          {fmt.format(sum)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <TotalsFooter t={B.engineering} />
          </Card>

          {/* Раздел II */}
          <Card>
            <SectionHeader icon={Sofa} code="Раздел II" title="Наполнение комплектующими" />
            <ItemsTable name="equipment" items={values.equipment} register={register}
              rowSums={result.rowSums} onRemove={(i) => equipmentArray.remove(i)} />
            <button type="button"
              onClick={() => equipmentArray.append({ id: `eq-${Date.now()}`, name: "Новая позиция", unit: "шт", qty: null, price: null, category: "Нестандартные комплектующие" })}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-indigo-300 px-3 py-1.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50">
              <Plus className="h-4 w-4" /> Добавить строку
            </button>
            <p className="mt-2 text-xs text-slate-400">
              Позиции удобно добавлять из «Справочных данных» внизу страницы (сантехника, мебель, техника).
            </p>
            <TotalsFooter t={B.equipment} />
          </Card>

          {/* Раздел III */}
          <Card>
            <SectionHeader icon={Hammer} code="Раздел III" title="Сборка модульного здания" />
            <ItemsTable name="assembly" items={values.assembly} register={register} rowSums={result.rowSums} />
            <TotalsFooter t={B.assembly} />
          </Card>

          {/* Раздел IV */}
          <Card>
            <SectionHeader icon={Truck} code="Раздел IV" title="Транспортные услуги (доставка)" />
            <ItemsTable name="transport" items={values.transport} register={register} rowSums={result.rowSums} />
            <p className="mt-2 text-xs text-slate-400">
              Выберите город в «Справочных данных» — цены фуры и трала подставятся автоматически.
              Ориентир загрузки фуры: СП 80 мм — 240 шт, 100 мм — 200 шт, 150 мм — 120 шт, 200 мм — 40 шт; 16 рам; 600 стоек. 1 трал = 6 блок-модулей.
            </p>
            <TotalsFooter t={B.transport} />
          </Card>

          {/* Раздел V */}
          <Card>
            <SectionHeader icon={Layers} code="Раздел V" title="Дополнительные работы (фундамент)" />
            <ItemsTable name="works" items={values.works} register={register} rowSums={result.rowSums} />
            <TotalsFooter t={B.works} />
          </Card>

          {/* Раздел VI */}
          <Card>
            <SectionHeader icon={BadgePlus} code="Раздел VI" title="Дополнительные услуги" />
            <ItemsTable name="services" items={values.services} register={register} rowSums={result.rowSums} />
            <TotalsFooter t={B.services} />
          </Card>

          {/* Справочные данные */}
          <Card>
            <button type="button" onClick={() => setRefOpen((o) => !o)}
              className="flex w-full items-center justify-between">
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <BookOpen className="h-5 w-5" />
                </span>
                <span className="text-base font-semibold text-slate-800">Справочные данные</span>
              </span>
              <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${refOpen ? "rotate-180" : ""}`} />
            </button>

            {refOpen && (
              <div className="mt-4">
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {([
                    ["doors", "Двери"], ["windows", "Окна"], ["furniture", "Мебель"],
                    ["plumbing", "Сантехника"], ["appliances", "Техника"], ["cities", "Доставка (города)"],
                  ] as const).map(([k, label]) => (
                    <button key={k} type="button" onClick={() => setRefTab(k)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        refTab === k ? "bg-indigo-600 text-white shadow" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>

                {refTab === "doors" && (
                  <>
                    <p className="mb-2 text-xs text-slate-400">Клик — подставит цену в строку «Двери» (Раздел I) и увеличит количество на 1.</p>
                    <RefList items={REF_DOORS} onPick={(it) => pickMaterialRow("doors", it)} />
                  </>
                )}
                {refTab === "windows" && (
                  <>
                    <p className="mb-2 text-xs text-slate-400">Клик — подставит цену в строку «Окна» (Раздел I) и увеличит количество на 1.</p>
                    <RefList items={REF_WINDOWS} onPick={(it) => pickMaterialRow("windows", it)} />
                    <div className="mt-4 text-xs text-slate-400">
                      Справочно, цена СП по толщине (₽/м²):{" "}
                      {REF_SP_PRICES.map((p) => `${p.th} мм — ${p.price}`).join(" · ")}
                    </div>
                  </>
                )}
                {refTab === "furniture" && <RefList items={REF_FURNITURE} onPick={(it) => addEquipment(it, "Мебель")} />}
                {refTab === "plumbing" && <RefList items={REF_PLUMBING} onPick={(it) => addEquipment(it, "Сантехника")} />}
                {refTab === "appliances" && <RefList items={REF_APPLIANCES} onPick={(it) => addEquipment(it, "Техника")} />}
                {refTab === "cities" && (
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {REF_CITIES.map((c) => (
                      <li key={c.name}>
                        <button type="button" onClick={() => pickCity(c)}
                          className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700">
                          <span className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-indigo-400" /> {c.name}
                          </span>
                          <span className="whitespace-nowrap text-xs tabular-nums text-slate-400">
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
          <div className="rounded-xl bg-slate-900 p-5 text-white shadow-lg ring-1 ring-slate-800">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">Итог по проекту</p>
            <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">{rub(result.grand.total)}</p>
            <p className="text-xs text-slate-400">Итого с НДС по всем разделам</p>

            <dl className="mt-4 space-y-2 border-t border-slate-700/60 pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-slate-400">Себестоимость</dt><dd className="tabular-nums">{rub(result.grand.cost)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Прибыль (20%)</dt><dd className="tabular-nums text-emerald-300">{rub(result.grand.profit)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Итого без НДС</dt><dd className="tabular-nums">{rub(result.grand.beforeVat)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">НДС (22%)</dt><dd className="tabular-nums text-amber-300">{rub(result.grand.vat)}</dd></div>
            </dl>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-700/60 pt-4 text-center">
              <div className="rounded-lg bg-slate-800/70 p-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">за м²</p>
                <p className="text-sm font-semibold tabular-nums">{rub(result.grand.perM2)}</p>
              </div>
              <div className="rounded-lg bg-slate-800/70 p-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">за блок-модуль</p>
                <p className="text-sm font-semibold tabular-nums">{rub(result.grand.perModule)}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">По разделам (с НДС)</p>
            <ul className="space-y-1.5 text-sm">
              {([
                ["I. Материалы", B.materials], ["I доп. Инженерные сети", B.engineering],
                ["II. Наполнение", B.equipment], ["III. Сборка", B.assembly],
                ["IV. Доставка", B.transport], ["V. Доп. работы", B.works], ["VI. Доп. услуги", B.services],
              ] as const).map(([label, t]) => (
                <li key={label} className="flex items-center justify-between gap-2">
                  <span className={t.total ? "text-slate-600" : "text-slate-300"}>{label}</span>
                  <span className={`tabular-nums ${t.total ? "font-medium text-slate-800" : "text-slate-300"}`}>
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
