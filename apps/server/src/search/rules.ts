import type { SearchFilter, SortColumn } from '@staff-pulse/contracts';

/**
 * Детерминированный разбор запроса на естественном языке (русский и английский) в фильтр.
 * Работает без внешних сервисов и служит запасным путём, когда языковая модель недоступна.
 * Распознаёт уровни, метрики с порогами и диапазонами, предка («в дивизионе …»), сортировку,
 * «топ N»; остаток запроса становится подстрокой для поиска по названию.
 *
 * Границы слов заданы через `(?<!\p{L})`, а не `\b`: в JS `\b` учитывает только ASCII-буквы.
 */

type Metric = 'headcount' | 'budget' | 'performance';

const METRIC_TO_COLUMN: Record<Metric, SortColumn> = {
  headcount: 'totalHeadcount',
  budget: 'totalBudget',
  performance: 'avgPerformance',
};

const LEVEL_WORDS: [RegExp, number][] = [
  [/(?<!\p{L})(?:дивизион|division)\p{L}*/giu, 1],
  [/(?<!\p{L})(?:отдел|department|dept)\p{L}*/giu, 2],
  [/(?<!\p{L})(?:команд|team)\p{L}*/giu, 3],
];

const METRIC_WORDS: [RegExp, Metric][] = [
  [
    /(?<!\p{L})(?:эффективност|производительност|performance|kpi|перформанс)\p{L}*/giu,
    'performance',
  ],
  [
    /(?<!\p{L})(?:численност|сотрудник|человек|людей|люди|штат|headcount|people|employees|staff)\p{L}*/giu,
    'headcount',
  ],
  [/(?<!\p{L})(?:бюджет|budget|расход|затрат|spend)\p{L}*/giu, 'budget'],
];

const UNIT_METRIC: [RegExp, Metric][] = [
  [/^(?:%|процент\p{L}*|percent)$/iu, 'performance'],
  [/^(?:человек|чел\.?|сотрудник\p{L}*|людей|people|employees)$/iu, 'headcount'],
  [/^(?:руб\p{L}*\.?|₽|rub|млн|миллион\p{L}*|тыс\p{L}*\.?|k|к|m)$/iu, 'budget'],
];

const MULTIPLIERS: [RegExp, number][] = [
  [/^(?:млн|миллион\p{L}*|m)$/iu, 1_000_000],
  [/^(?:тыс\p{L}*\.?|k|к)$/iu, 1_000],
];

const NUMBER = String.raw`(\d+(?:[.,]\d+)?)\s*(%|процент\p{L}*|percent|человек|чел\.?|сотрудник\p{L}*|людей|people|employees|руб\p{L}*\.?|₽|rub|млн|миллион\p{L}*|тыс\p{L}*\.?|k|к|m)?(?!\p{L})`;

const RANGE_RE = new RegExp(
  String.raw`(?<!\p{L})(?:от|между|between|from)\s*${NUMBER}\s*(?:до|и|and|to|-|–)\s*${NUMBER}`,
  'giu',
);
const MAX_RE = new RegExp(
  String.raw`(?<!\p{L})(?:ниже|меньше|менее|не\s+больше|не\s+более|до|максимум|under|below|less\s+than|at\s+most|<=|≤|<)\s*${NUMBER}`,
  'giu',
);
const MIN_RE = new RegExp(
  String.raw`(?<!\p{L})(?:выше|больше|более|не\s+меньше|не\s+менее|от|свыше|минимум|over|above|more\s+than|at\s+least|>=|≥|>)\s*${NUMBER}`,
  'giu',
);
const TOP_RE =
  /(?<!\p{L})(?:топ|top)[-\s]?(\d+)|(?<!\p{L})(?:первые|first)\s+(\d+)|(?<!\d)(\d+)\s+(?:самых|лучших|худших|крупнейших|best|worst|largest)/giu;

const DESC_WORDS =
  /(?<!\p{L})(?:самые\s+больш\p{L}*|больши\p{L}*|лучш\p{L}*|сильн\p{L}*|крупн\p{L}*|по\s+убыванию|максимальн\p{L}*|наибольш\p{L}*|best|highest|largest|biggest|descending)/giu;
const ASC_WORDS =
  /(?<!\p{L})(?:самые\s+маленьк\p{L}*|маленьк\p{L}*|меньши\p{L}*|худш\p{L}*|слаб\p{L}*|мельч\p{L}*|по\s+возрастанию|минимальн\p{L}*|наименьш\p{L}*|worst|lowest|smallest|ascending)/giu;

const WITHIN_RE =
  /(?<!\p{L})(?:внутри|в\s+составе|в|из|inside|within|in)\s+(?:дивизион\p{L}*|отдел\p{L}*|команд\p{L}*|division|department|team)?\s*[«"']?([\p{L}\p{N}][\p{L}\p{N}\s\-/&.]*?)[»"']?(?=\s+(?:с|со|где|у|чьи|и|которых|with|where|which|and|эффективност|численност|бюджет|сотрудник|человек|больше|меньше|выше|ниже|от|до|не|топ)\p{L}*(?!\p{L})|\s*[,;]|\s*$)/iu;

const STOP_WORDS = new Set([
  'с',
  'со',
  'и',
  'в',
  'во',
  'на',
  'по',
  'у',
  'из',
  'где',
  'которых',
  'которые',
  'чьи',
  'чем',
  'не',
  'все',
  'всех',
  'покажи',
  'показать',
  'найди',
  'найти',
  'выведи',
  'вывести',
  'список',
  'только',
  'нужны',
  'нужно',
  'дай',
  'хочу',
  'мне',
  'а',
  'самые',
  'the',
  'a',
  'an',
  'show',
  'find',
  'list',
  'all',
  'me',
  'with',
  'of',
  'and',
  'that',
  'have',
  'having',
  'where',
  'which',
  'in',
]);

const stripQuotes = (value: string): string => value.replace(/^[«"'\s]+|[»"'\s]+$/g, '');
const withGlobal = (re: RegExp): RegExp =>
  new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);

function parseNumber(raw: string, unit: string | undefined): number {
  let value = Number(raw.replace(',', '.'));
  if (unit) {
    for (const [re, mult] of MULTIPLIERS) if (re.test(unit)) value *= mult;
  }
  return value;
}

function unitMetric(unit: string | undefined): Metric | null {
  if (!unit) return null;
  for (const [re, metric] of UNIT_METRIC) if (re.test(unit)) return metric;
  return null;
}

interface MetricMention {
  metric: Metric;
  index: number;
}

function nearestMetric(mentions: MetricMention[], index: number): Metric | null {
  let best: MetricMention | null = null;
  for (const mention of mentions) {
    if (!best || Math.abs(mention.index - index) < Math.abs(best.index - index)) best = mention;
  }
  return best?.metric ?? null;
}

export function normalizeSearchQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru').replace(/ё/g, 'е');
}

/** Возвращает фильтр или null, если в запросе не найдено ни одного распознаваемого условия. */
export function parseWithRules(query: string): SearchFilter | null {
  const text = normalizeSearchQuery(query);
  if (text === '') return null;

  const filter: SearchFilter = {};
  let recognized = false;
  // Всё распознанное вычёркивается из leftover; остаток — подстрока названия.
  let leftover = text;
  const consume = (re: RegExp): void => {
    leftover = leftover.replace(withGlobal(re), ' ');
  };

  // 1. Предок: «в дивизионе Платформа», «внутри отдела продаж». Раньше уровней, чтобы слово
  //    «дивизионе» из этой фразы не стало условием на уровень.
  let levelSource = text;
  const withinMatch = WITHIN_RE.exec(text);
  if (withinMatch?.[1]) {
    const name = stripQuotes(withinMatch[1]);
    const firstWord = name.split(' ')[0] ?? '';
    if (name.length >= 2 && !STOP_WORDS.has(firstWord)) {
      filter.within = name;
      recognized = true;
      levelSource = text.replace(withinMatch[0], ' ');
      leftover = leftover.replace(withinMatch[0], ' ');
    }
  }

  // 2. Уровни
  const levels: number[] = [];
  for (const [re, level] of LEVEL_WORDS) {
    if (levelSource.search(re) >= 0) {
      levels.push(level);
      recognized = true;
    }
    consume(re);
  }
  if (levels.length > 0) filter.levels = levels.sort((a, b) => a - b);

  // 3. Метрики: упоминания, диапазоны, пороги
  const mentions: MetricMention[] = [];
  for (const [re, metric] of METRIC_WORDS) {
    for (const match of text.matchAll(re)) mentions.push({ metric, index: match.index });
    consume(re);
  }
  const ranges: Partial<Record<Metric, { min?: number; max?: number }>> = {};
  const assign = (metric: Metric, patch: { min?: number; max?: number }): void => {
    ranges[metric] = { ...ranges[metric], ...patch };
    recognized = true;
  };

  for (const match of text.matchAll(RANGE_RE)) {
    const [, fromRaw, fromUnit, toRaw, toUnit] = match;
    const metric = unitMetric(toUnit ?? fromUnit) ?? nearestMetric(mentions, match.index);
    if (!metric || fromRaw === undefined || toRaw === undefined) continue;
    assign(metric, {
      min: parseNumber(fromRaw, fromUnit ?? toUnit),
      max: parseNumber(toRaw, toUnit ?? fromUnit),
    });
  }
  consume(RANGE_RE);
  const withoutRanges = text.replace(RANGE_RE, ' ');
  for (const [re, key] of [
    [MAX_RE, 'max'],
    [MIN_RE, 'min'],
  ] as const) {
    for (const match of withoutRanges.matchAll(re)) {
      const [, raw, unit] = match;
      const metric = unitMetric(unit) ?? nearestMetric(mentions, match.index);
      if (!metric || raw === undefined) continue;
      assign(metric, { [key]: parseNumber(raw, unit) });
    }
    consume(re);
  }
  if (ranges.headcount) filter.headcount = ranges.headcount;
  if (ranges.budget) filter.budget = ranges.budget;
  if (ranges.performance) filter.performance = ranges.performance;

  // 4. «топ N» / направление сортировки
  const top = withGlobal(TOP_RE).exec(text);
  const limit = top ? Number(top[1] ?? top[2] ?? top[3]) : null;
  const desc = text.search(DESC_WORDS) >= 0;
  const asc = text.search(ASC_WORDS) >= 0;
  if (limit || desc || asc) {
    const metric = mentions[0]?.metric ?? 'performance';
    filter.sort = { column: METRIC_TO_COLUMN[metric], direction: asc && !desc ? 'asc' : 'desc' };
    recognized = true;
    if (limit && limit > 0) filter.limit = Math.min(limit, 1000);
  }
  consume(TOP_RE);
  consume(DESC_WORDS);
  consume(ASC_WORDS);

  // 5. Остаток — подстрока названия
  const words = leftover
    .replace(/[«»"',:;()]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 2 && !STOP_WORDS.has(word) && !/^[\d<>=≤≥%]/.test(word));
  if (words.length > 0 && recognized) filter.text = words.join(' ');

  return recognized ? filter : null;
}
