import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildOrgModel } from '@/entities/org/model/org-model';
import { makeOrgFixture } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';

import { AnalyticsTablePanel } from './AnalyticsTablePanel';

const model = buildOrgModel(makeOrgFixture());
const noop = () => undefined;
const NO_FLASHES = new Map();

function bodyRowNames(): string[] {
  const grid = screen.getByRole('grid');
  const [, body] = grid.querySelectorAll('tbody');
  const tbody = body ?? grid.querySelector('tbody')!;
  return [...tbody.querySelectorAll('tr[data-node-id]')].map(
    (tr) => tr.querySelector('td')?.textContent ?? '',
  );
}

describe('AnalyticsTablePanel', () => {
  it('показывает пять столбцов и агрегаты в русском формате', () => {
    renderWithProviders(
      <AnalyticsTablePanel model={model} flashes={NO_FLASHES} selectedId={null} onSelect={noop} />,
    );

    const headers = screen.getAllByRole('columnheader').map((th) => th.textContent?.trim());
    expect(headers).toEqual([
      'Подразделение',
      'Уровень',
      'Всего сотрудников',
      'Бюджет суммарный',
      'Средняя эффективность',
    ]);

    const divisionRow = screen.getByText('Дивизион А').closest('tr')!;
    const cells = within(divisionRow).getAllByRole('gridcell');
    expect(cells[1]).toHaveTextContent('1Дивизион');
    expect(cells[2]).toHaveTextContent('31');
    expect(cells[3]?.textContent?.replace(/\p{Zs}/gu, ' ')).toBe('24 700 000 руб.');
    expect(cells[4]).toHaveTextContent('67,6');
    expect(screen.getByText(/показано 9 из 9/)).toBeInTheDocument();
  });

  it('клик по заголовку сортирует по возрастанию, двойной клик — в обратную сторону', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <AnalyticsTablePanel model={model} flashes={NO_FLASHES} selectedId={null} onSelect={noop} />,
    );
    const header = screen.getByRole('button', { name: /Всего сотрудников/ });

    await user.click(header);
    expect(header.closest('th')).toHaveAttribute('aria-sort', 'ascending');
    // минимальная суммарная численность — у Команды А1-2 (5 человек)
    expect(bodyRowNames()[0]).toBe('Команда А1-2');
    expect(bodyRowNames().at(-1)).toBe('Дивизион А');

    // повторный клик по тому же столбцу ничего не меняет
    await user.click(header);
    expect(header.closest('th')).toHaveAttribute('aria-sort', 'ascending');

    await user.dblClick(header);
    expect(header.closest('th')).toHaveAttribute('aria-sort', 'descending');
    expect(bodyRowNames()[0]).toBe('Дивизион А');

    await user.click(screen.getByRole('button', { name: 'Сбросить сортировку' }));
    expect(header.closest('th')).toHaveAttribute('aria-sort', 'none');
    expect(bodyRowNames()[0]).toBe('Дивизион А');
    expect(bodyRowNames()[1]).toBe('Отдел А1');
  });

  it('клик по другому столбцу переключает сортировку на него', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <AnalyticsTablePanel model={model} flashes={NO_FLASHES} selectedId={null} onSelect={noop} />,
    );
    await user.click(screen.getByRole('button', { name: /Бюджет суммарный/ }));
    await user.click(screen.getByRole('button', { name: /Уровень/ }));
    expect(screen.getByRole('columnheader', { name: /Уровень/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    expect(screen.getByRole('columnheader', { name: /Бюджет/ })).toHaveAttribute(
      'aria-sort',
      'none',
    );
  });

  it('клик по строке вызывает onSelect с id узла', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderWithProviders(
      <AnalyticsTablePanel
        model={model}
        flashes={NO_FLASHES}
        selectedId={null}
        onSelect={onSelect}
      />,
    );
    await user.click(screen.getByText('Команда А1-2'));
    expect(onSelect).toHaveBeenCalledWith('team-a1-2');
  });

  it('выделенная строка помечена aria-selected', () => {
    renderWithProviders(
      <AnalyticsTablePanel
        model={model}
        flashes={NO_FLASHES}
        selectedId="dep-b1"
        onSelect={noop}
      />,
    );
    expect(screen.getByText('Отдел Б1').closest('tr')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Отдел А1').closest('tr')).toHaveAttribute('aria-selected', 'false');
  });
});

describe('фильтр по названию', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('применяется с дебаунсом 250 мс', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(
      <AnalyticsTablePanel model={model} flashes={NO_FLASHES} selectedId={null} onSelect={noop} />,
    );

    await user.type(screen.getByRole('searchbox', { name: /Фильтр по названию/ }), 'команда');
    // сразу после ввода фильтр ещё не применён
    expect(bodyRowNames()).toHaveLength(9);

    await act(async () => {
      vi.advanceTimersByTime(260);
    });
    expect(bodyRowNames()).toEqual([
      'Команда А1-1',
      'Команда А1-2',
      'Команда А2-1',
      'Команда Б1-1',
    ]);
    expect(screen.getByText(/показано 4 из 9/)).toBeInTheDocument();
  });

  it('пустой результат показывает подсказку с запросом', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(
      <AnalyticsTablePanel model={model} flashes={NO_FLASHES} selectedId={null} onSelect={noop} />,
    );
    await user.type(screen.getByRole('searchbox'), 'xyz');
    await act(async () => {
      vi.advanceTimersByTime(260);
    });
    expect(screen.getByText('Ничего не найдено по запросу «xyz»')).toBeInTheDocument();
  });
});

describe('клавиатурная навигация (WAI-ARIA grid)', () => {
  function cellOf(name: string, col: number): HTMLElement {
    const row = screen.getByText(name).closest('tr')!;
    return row.querySelectorAll('td')[col] as HTMLElement;
  }

  it('стрелки, Home/End, Ctrl+Home/End, Enter; единственная ячейка в tab-порядке', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderWithProviders(
      <AnalyticsTablePanel
        model={model}
        flashes={NO_FLASHES}
        selectedId={null}
        onSelect={onSelect}
      />,
    );

    expect(cellOf('Дивизион А', 0)).toHaveAttribute('tabindex', '0');
    expect(cellOf('Отдел А1', 0)).toHaveAttribute('tabindex', '-1');

    act(() => cellOf('Дивизион А', 0).focus());
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(cellOf('Отдел А1', 0));
    expect(cellOf('Отдел А1', 0)).toHaveAttribute('tabindex', '0');
    expect(cellOf('Дивизион А', 0)).toHaveAttribute('tabindex', '-1');

    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(cellOf('Отдел А1', 1));
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(cellOf('Отдел А1', 4));
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(cellOf('Отдел А1', 4));
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(cellOf('Отдел А1', 0));

    await user.keyboard('{Control>}{End}{/Control}');
    expect(document.activeElement).toBe(cellOf('Команда Б1-1', 4));
    await user.keyboard('{Control>}{Home}{/Control}');
    expect(document.activeElement).toBe(cellOf('Дивизион А', 0));
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(cellOf('Дивизион А', 0));

    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith('dep-a1');
  });

  it('фокус привязан к строке и переживает пересортировку', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <AnalyticsTablePanel model={model} flashes={NO_FLASHES} selectedId={null} onSelect={noop} />,
    );
    act(() => cellOf('Дивизион А', 0).focus());
    await user.keyboard('{ArrowDown}{ArrowDown}'); // Команда А1-1
    expect(cellOf('Команда А1-1', 0)).toHaveAttribute('tabindex', '0');

    await user.click(screen.getByRole('button', { name: /Бюджет суммарный/ }));
    expect(cellOf('Команда А1-1', 0)).toHaveAttribute('tabindex', '0');
    expect(cellOf('Дивизион А', 0)).toHaveAttribute('tabindex', '-1');
  });
});
