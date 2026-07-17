import type { FormValues } from "./types";

/* =============== СПРАВОЧНИКИ (из листов «Наполнение», «Двери Окна», «Доставка») =============== */

export interface RefItem { name: string; price: number }
export interface RefCity { name: string; tent: number | null; tral: number | null }

export const REF_DOORS: RefItem[] = [
  { name: "Дверь металлическая утепленная 900×2000", price: 35000 },
  { name: "Одностворчатая, витражное остекление, ручка+замок 1000×2000", price: 45000 },
  { name: "МДФ с ПВХ пленкой влагостойкая 900×2000", price: 30000 },
  { name: "Противопожарная дверь", price: 30000 },
  { name: "ПВХ дверь", price: 30000 },
  { name: "Двупольная утепленная металлическая дверь", price: 85000 },
  { name: "Однопольная утепленная металлическая дверь", price: 60000 },
];

export const REF_WINDOWS: RefItem[] = [
  { name: "Окно ПВХ 1600×1200 мм", price: 40000 },
  { name: "Витражное окно 1000×2000 глухое, двухкамерное", price: 75000 },
  { name: "Окно 1600×1500 (для документов 800×500h)", price: 80000 },
  { name: "Окно ПВХ 600×700 мм", price: 150000 },
  { name: "Окно ПВХ 500×500 мм", price: 25000 },
];

export const REF_FURNITURE: RefItem[] = [
  { name: "Стол офисный прямой 1200 мм", price: 11000 },
  { name: "Стол офисный прямой 800 мм", price: 7000 },
  { name: "Стол обеденный 1400×700 мм", price: 15000 },
  { name: "Кресло Metta BK-8 Ch", price: 12000 },
  { name: "Табурет для кухни", price: 2500 },
  { name: "Стул Iso Black усиленный", price: 3000 },
  { name: "Тумба", price: 10000 },
  { name: "Конференц-стол на 20 человек", price: 160000 },
  { name: "Шкаф (стеллаж) офисный", price: 15000 },
  { name: "Стул Самба черный усиленный", price: 8000 },
  { name: "Шкаф для одежды, 2 деления, 800 мм", price: 21000 },
  { name: "Шкаф сушильный для одежды, 800 мм", price: 15000 },
  { name: "Шкафчик для одежды металлический", price: 20000 },
  { name: "Кресло офисное", price: 15000 },
  { name: "Вешалка напольная на 5 персон", price: 4000 },
  { name: "Вешалка настенная на 5 крючков", price: 1000 },
  { name: "Кровать одноярусная Кадис 960×1980×800", price: 11000 },
  { name: "Кровать двухъярусная Севилья-2 960×1980×1630", price: 18000 },
  { name: "Жалюзи на окно 1200×1200 мм", price: 1500 },
  { name: "Матрас", price: 7000 },
  { name: "Подушка", price: 1000 },
];

export const REF_PLUMBING: RefItem[] = [
  { name: "Раковина на пьедестале (смеситель, подводка)", price: 35000 },
  { name: "Перегородки для унитаза (ЛДСП)", price: 37000 },
  { name: "Унитаз (гофра, подводка)", price: 30000 },
  { name: "Септик", price: 1000000 },
  { name: "ELECTROLUX EWH 30 Centurio IQ 3.0 Silver", price: 32000 },
  { name: "Бойлер на 80 л", price: 25000 },
  { name: "Сушилка для рук", price: 7000 },
  { name: "Бак для воды 1000 л", price: 100000 },
  { name: "Разъем ГМ для заправки баков", price: 7000 },
  { name: "Поддон душевой", price: 65000 },
  { name: "Ведро 20 л", price: 300 },
];

export const REF_APPLIANCES: RefItem[] = [
  { name: "Электроводонагреватель", price: 30000 },
  { name: "Микроволновая печь LG MS2042DY", price: 30000 },
  { name: "Холодильник однокамерный", price: 25000 },
  { name: "Холодильник двухкамерный", price: 40000 },
  { name: "Кулер VATTEN VO4WKB с холодильником", price: 25000 },
  { name: "Принтер", price: 35000 },
  { name: "МФУ", price: 45000 },
  { name: "Компьютер (моноблок)", price: 50000 },
  { name: "Стиральная машина", price: 40000 },
  { name: "Промышленная стиральная машина", price: 500000 },
  { name: "Промышленная сушильная машина", price: 235000 },
  { name: "Утюг", price: 6000 },
  { name: "ППКУ охранно-пожарный R3-Рубеж-2ОП", price: 60000 },
  { name: "Извещатель пожарный ручной ИПР 513-11-А-R3", price: 1500 },
  { name: "Извещатель дымовой ИП 212-64-R3 W1.02", price: 1300 },
  { name: "Табло «ВЫХОД»", price: 1400 },
  { name: "Сплит-система 9000 BTU", price: 80000 },
  { name: "Зеркало", price: 15000 },
  { name: "Усилитель сотовой связи и интернета", price: 32000 },
  { name: "Тепловая завеса", price: 25000 },
  { name: "Роутер Keenetic Giga KN-1012", price: 80000 },
];

export const REF_CITIES: RefCity[] = [
  { name: "Нижний Новгород", tent: 75000, tral: 160000 },
  { name: "с. Катмыш (Мамадышский р-н)", tent: 40000, tral: 80000 },
  { name: "Екатеринбург", tent: 100000, tral: 220000 },
  { name: "Тюмень", tent: 130000, tral: 250000 },
  { name: "Самара", tent: 65000, tral: 100000 },
  { name: "Казань", tent: 45000, tral: 75000 },
  { name: "Москва", tent: null, tral: 200000 },
  { name: "Менделеевск", tent: 27000, tral: 40000 },
  { name: "Воронеж", tent: null, tral: 180000 },
  { name: "Первоуральск", tent: null, tral: 130000 },
  { name: "Набережные Челны", tent: null, tral: 40000 },
  { name: "Новошахтинск (Ростовская обл.)", tent: 200000, tral: null },
  { name: "Кингисепп", tent: 190000, tral: 300000 },
  { name: "Северск", tent: 270000, tral: 390000 },
  { name: "Альметьевск", tent: 35000, tral: 45000 },
  { name: "Барнаул", tent: null, tral: 390000 },
  { name: "Архангельск", tent: 350000, tral: 700000 },
  { name: "Санкт-Петербург", tent: 190000, tral: 300000 },
  { name: "Владимир", tent: null, tral: 150000 },
  { name: "д. Мистолово (Лен. обл.)", tent: 150000, tral: null },
  { name: "с. Нижняя Павловка (Оренбургская обл.)", tent: 80000, tral: 130000 },
  { name: "Хайбуллинский р-н (Башкортостан)", tent: 150000, tral: null },
  { name: "Краснодар", tent: 280000, tral: 370000 },
];

/* Справочно: цена сэндвич-панели по толщине, руб/м² */
export const REF_SP_PRICES = [
  { th: 60, price: 2096 }, { th: 80, price: 2179 }, { th: 100, price: 2304 },
  { th: 120, price: 2433 }, { th: 150, price: 2690 }, { th: 200, price: 3070 },
  { th: 250, price: 3532 },
];

/* =============== DEFAULT FORM VALUES (пример из файла — Заказ №154) =============== */

const A = 103.27755;   // общая площадь здания, м²
const CA = 152.2998;   // площадь контейнеров, м²

export const makeDefaults = (): FormValues => ({
  params: {
    frameCoef: 1, matPriceCoef: 1,
    totalArea: A, footprintArea: A,
    containersQty: 9, containersArea: CA,
    buildingWidth: 6.015, buildingLength: 17.17, floorHeight: 2.92,
    spHeight: 2.59, spWidth: 1.19,
    productType: "building",
  },
  materialsConst: [
    { id: "frameTop", name: "Рама верхняя с наполнением", unit: "м²", qty: CA, price: 4900, frame: true },
    { id: "frameMid", name: "Рама межэтажная с наполнением", unit: "м²", qty: null, price: 10595, frame: true },
    { id: "frameBot", name: "Рама нижняя с наполнением", unit: "м²", qty: CA, price: 7200, frame: true },
    { id: "stands", name: "Стойки (4 шт) Б-309", unit: "к-т", qty: 9, price: 17850 },
    { id: "mountEl", name: "Материалы на монтаж / электрика", unit: "м²", qty: CA, price: 1298 },
    { id: "aux", name: "Вспомогательные материалы, расходный инструмент, технол. перевозки", unit: "шт", qty: 9, price: 6000 },
  ],
  materialsVar: [
    { id: "spOut", name: "Сэндвич-панель наружная", unit: "м²", qty: 120.0983, price: 2995.2 },
    { id: "spIn", name: "Сэндвич-панель внутренняя", unit: "м²", qty: 61.642, price: 3682.51 },
    { id: "spRails", name: "Направляющие сэндвича", unit: "шт", qty: 45, price: 1000 },
    { id: "stairsOut", name: "Лестницы наружные", unit: "шт", qty: null, price: 567357.06 },
    { id: "stairsIn", name: "Лестницы внутренние", unit: "шт", qty: null, price: 169112.2 },
    { id: "entrance", name: "Входная группа", unit: "шт", qty: null, price: 342337.39 },
    { id: "ramp", name: "Пандус", unit: "шт", qty: null, price: null },
    { id: "roof", name: "Крыша", unit: "м²", qty: A, price: 4770.42 },
    { id: "snow", name: "Снегозадержание", unit: "м", qty: 34.34, price: 1000 },
    { id: "gutter", name: "Водосточная система", unit: "м", qty: 34.34, price: 1000 },
    { id: "gutterHeat", name: "Обогрев водосточной системы", unit: "м", qty: 34.34, price: null },
    { id: "vk", name: "Водоснабжение / канализация (ВК)", unit: "м²", qty: A, price: 1300 },
    { id: "heating", name: "Отопление водяное", unit: "м²", qty: CA, price: null },
    { id: "convectors", name: "Электрические конвекторы", unit: "шт", qty: null, price: 12000 },
    { id: "doors", name: "Двери", unit: "шт", qty: 3, price: 35000 },
    { id: "windows", name: "Окна", unit: "шт", qty: 3, price: 25000 },
    { id: "floorLin", name: "Пол: полукоммерческий линолеум", unit: "м²", qty: A, price: 940 },
    { id: "floorRif", name: "Пол: рифленый лист", unit: "м²", qty: null, price: 4500 },
    { id: "floorTile", name: "Пол: керамическая плитка", unit: "м²", qty: null, price: 4000 },
    { id: "ceilArm", name: "Потолок: Армстронг", unit: "м²", qty: null, price: 1300 },
    { id: "ceilSml", name: "Потолок: СМЛ", unit: "м²", qty: null, price: null },
    { id: "wallSml", name: "Отделка стен внутренняя: СМЛ", unit: "м²", qty: 181.7403, price: null },
    { id: "facade", name: "Вентилируемый фасад из металлокассет", unit: "м²", qty: 135.4004, price: null },
    { id: "wallPvh", name: "Отделка стен внутренняя: ПВХ", unit: "м²", qty: null, price: 410 },
    { id: "attic", name: "Аттика", unit: "пог. м", qty: 46.37, price: 1369.71, buildingOnly: true },
    { id: "bridge", name: "Бриджфитинг, элементы крепления, угловой конус", unit: "шт БК", qty: 9, price: 1295.2, buildingOnly: true },
    { id: "facadeExtra", name: "Доборные элементы фасада", unit: "м²", qty: A, price: 326.87, buildingOnly: true },
  ],
  engineering: [
    { id: "elExtra", name: "Электрика дополнительно", rate: 2287.5, coef: 1 },
    { id: "elOutLight", name: "Электрика доп.: освещение внешнее", rate: 457.5, coef: 1 },
    { id: "elSockets", name: "Электрика доп.: розетки", rate: 305, coef: 1 },
    { id: "automation", name: "Система автоматизации", rate: 305, coef: 1 },
    { id: "lighting", name: "Освещение", rate: 245, coef: 0.8 },
    { id: "vent", name: "Вентиляция (осевой вентилятор / приточный клапан), к-т", rate: 1700, coef: 1 },
    { id: "cond", name: "Кондиционирование", rate: 1700, coef: 1 },
    { id: "fireDet", name: "Автономный пожарный извещатель", rate: 212, coef: 1 },
    { id: "alarm", name: "Охранная сигнализация", rate: 1000, coef: 1 },
    { id: "skud", name: "Слаботочка: СКУД", rate: 1000, coef: 1 },
    { id: "cctv", name: "Слаботочка: видеонаблюдение", rate: 1000, coef: 1 },
    { id: "inet", name: "Слаботочка: интернет", rate: 1000, coef: 1 },
  ],
  equipment: [
    { id: "eq1", name: "Раковина на пьедестале (смеситель, подводка)", unit: "шт", qty: 6, price: 35000, category: "Сантехника" },
    { id: "eq2", name: "Поддон душевой", unit: "шт", qty: 8, price: 65000, category: "Сантехника" },
  ],
  assembly: [
    { id: "asmFactory", name: "Сборка БК на заводе", unit: "шт", qty: 9, price: 10000 },
    { id: "asmSite", name: "Сборка БК на объекте", unit: "шт", qty: 9, price: 40000 },
    { id: "asmBuild", name: "Сборка здания из БК на объекте", unit: "шт", qty: 9, price: 14000 },
    { id: "machinery", name: "Услуги спецтехники", unit: "маш-час", qty: 1000, price: 4508.2 },
    { id: "genWorks", name: "Общестроительные работы", unit: "м²", qty: A, price: 5000 },
    { id: "instEs", name: "Монтаж инженерных систем (ЭС)", unit: "м²", qty: A, price: 3100 },
    { id: "instVk", name: "Монтаж инженерных систем (ВК)", unit: "м²", qty: A, price: 4100 },
    { id: "instVent", name: "Монтаж доп. инженерных систем (Вент)", unit: "м²", qty: null, price: null },
    { id: "tripStay", name: "Командировочные: проживание", unit: "сут", qty: 20, price: 33000 },
    { id: "tripFood", name: "Командировочные: питание", unit: "чел-дн", qty: 1000, price: 700 },
    { id: "tripTickets", name: "Командировочные: авиа / ж-д билеты", unit: "шт", qty: 20, price: 40000 },
  ],
  transport: [
    { id: "cover", name: "Чехол", unit: "шт", qty: null, price: 35000 },
    { id: "truck", name: "Фура (тент)", unit: "рейс", qty: 2, price: 135000 },
    { id: "tral", name: "Трал (готовый блок-модуль)", unit: "рейс", qty: null, price: null },
  ],
  works: [
    { id: "piles", name: "Фундамент: свайный", unit: "шт", qty: null, price: null },
    { id: "plates", name: "Фундамент: дорожные плиты", unit: "м²", qty: A, price: null },
    { id: "strip", name: "Фундамент: ленточный", unit: "м²", qty: A, price: null },
    { id: "solid", name: "Фундамент: цельнозаливной", unit: "м²", qty: A, price: null },
  ],
  services: [
    { id: "chief", name: "Шеф-монтажные работы", unit: "усл.", qty: null, price: null },
    { id: "commissioning", name: "Пуско-наладочные работы", unit: "м²", qty: A, price: 1350 },
    { id: "design", name: "Проектирование", unit: "м²", qty: A, price: 1350 },
    { id: "representation", name: "Представительские расходы", unit: "усл.", qty: null, price: null },
  ],
});
