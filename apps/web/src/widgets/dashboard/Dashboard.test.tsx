import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { jsonResponse, makeOrgFixture } from '@/test/fixtures';
import { setMediaMatches } from '@/test/media';
import { renderWithProviders } from '@/test/render';

import { Dashboard } from './Dashboard';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Dashboard', () => {
  it('показывает загрузку, затем дерево с раскрытым вторым уровнем', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(makeOrgFixture())));
    renderWithProviders(<Dashboard />);

    expect(screen.getByRole('status')).toHaveTextContent('Загружаем');

    const tree = await screen.findByRole('tree');
    expect(within(tree).getByText('Дивизион А')).toBeInTheDocument();
    expect(within(tree).getByText('Отдел А1')).toBeInTheDocument();
    // третий уровень по умолчанию свёрнут
    expect(within(tree).queryByText('Команда А1-1')).not.toBeInTheDocument();
  });

  it('раскрывает и сворачивает ветку по кнопке', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(makeOrgFixture())));
    renderWithProviders(<Dashboard />);
    const user = userEvent.setup();

    const tree = await screen.findByRole('tree');
    await user.click(screen.getByRole('button', { name: 'Развернуть «Отдел А1»' }));
    expect(within(tree).getByText('Команда А1-1')).toBeInTheDocument();
    expect(within(tree).getByText('Команда А1-2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Свернуть «Отдел А1»' }));
    expect(within(tree).queryByText('Команда А1-1')).not.toBeInTheDocument();
  });

  it('показывает численность и индикатор эффективности у каждого узла', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(makeOrgFixture())));
    renderWithProviders(<Dashboard />);
    const tree = await screen.findByRole('tree');

    const item = within(tree)
      .getAllByRole('treeitem')
      .find((el) => el.getAttribute('data-node-id') === 'dep-a2');
    expect(item).toBeDefined();
    expect(within(item!).getByTitle('Численность подразделения')).toHaveTextContent('1');
    expect(within(item!).getByTitle(/Эффективность: 40/)).toBeInTheDocument();
  });

  it('пустой ответ → состояние «Данных пока нет»', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([])));
    renderWithProviders(<Dashboard />);
    expect(await screen.findByText('Данных пока нет')).toBeInTheDocument();
  });

  it('ошибка сервера → состояние ошибки с кнопкой «Повторить»', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'Имитация сбоя' }, { status: 500 }))
      .mockResolvedValue(jsonResponse(makeOrgFixture()));
    vi.stubGlobal('fetch', fetchMock);
    renderWithProviders(<Dashboard />);
    const user = userEvent.setup();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Сервер вернул ошибку 500');

    await user.click(within(alert).getByRole('button', { name: 'Повторить' }));
    expect(await screen.findByRole('tree')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('невалидный ответ → ошибка схемы, данные не показываются', async () => {
    const broken = makeOrgFixture().map((node, index) =>
      index === 0 ? { ...node, performance: 250 } : node,
    );
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(broken)));
    renderWithProviders(<Dashboard />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Некорректный ответ сервера');
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
  });

  it('структурно некорректные данные (сирота) → ошибка структуры', async () => {
    const orphan = [
      ...makeOrgFixture(),
      { ...makeOrgFixture()[0]!, id: 'ghost-child', parentId: 'ghost' },
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(orphan)));
    renderWithProviders(<Dashboard />);
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Некорректная структура данных'),
    );
  });

  it('split-view: клик по строке таблицы выделяет узел в дереве и раскрывает его предков', async () => {
    setMediaMatches(true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(makeOrgFixture())));
    renderWithProviders(<Dashboard />);
    const user = userEvent.setup();

    const tree = await screen.findByRole('tree');
    const grid = screen.getByRole('grid');
    // переключателя на широком экране нет
    expect(screen.queryByRole('group', { name: 'Режим просмотра' })).not.toBeInTheDocument();
    expect(within(tree).queryByText('Команда Б1-1')).not.toBeInTheDocument();

    await user.click(within(grid).getByText('Команда Б1-1'));

    const item = within(tree)
      .getAllByRole('treeitem')
      .find((el) => el.getAttribute('data-node-id') === 'team-b1-1');
    expect(item).toBeDefined();
    expect(item).toHaveAttribute('aria-selected', 'true');
    expect(within(grid).getByText('Команда Б1-1').closest('tr')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('узкий экран: переключатель «Дерево / Таблица», выбор строки возвращает к дереву', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(makeOrgFixture())));
    renderWithProviders(<Dashboard />);
    const user = userEvent.setup();

    await screen.findByRole('tree');
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Таблица' }));
    expect(screen.getByRole('grid')).toBeInTheDocument();
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();

    await user.click(within(screen.getByRole('grid')).getByText('Отдел Б1'));
    const tree = screen.getByRole('tree');
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    expect(within(tree).getByText('Отдел Б1').closest('[role="treeitem"]')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
