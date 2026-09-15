import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { jsonResponse, makeOrgFixture } from '@/test/fixtures';
import { setMediaMatches } from '@/test/media';
import { MockWebSocket } from '@/test/mock-socket';
import { renderWithProviders } from '@/test/render';

import { Dashboard } from './Dashboard';

afterEach(() => {
  vi.unstubAllGlobals();
});

/** id узлов, доступных в дереве (свёрнутые ветки скрыты через aria-hidden/inert и не считаются). */
function visibleNodeIds(tree: HTMLElement): string[] {
  return within(tree)
    .getAllByRole('treeitem')
    .map((el) => el.getAttribute('data-node-id') ?? '');
}

describe('Dashboard', () => {
  it('показывает загрузку, затем дерево с раскрытым вторым уровнем', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(makeOrgFixture())));
    renderWithProviders(<Dashboard />);

    expect(screen.getByText('Загружаем орг-структуру…')).toBeInTheDocument();

    const tree = await screen.findByRole('tree');
    expect(within(tree).getByText('Дивизион А')).toBeInTheDocument();
    expect(within(tree).getByText('Отдел А1')).toBeInTheDocument();
    // третий уровень по умолчанию свёрнут: узлы есть в DOM для анимации, но скрыты (inert/aria-hidden)
    expect(visibleNodeIds(tree)).toContain('dep-a1');
    expect(visibleNodeIds(tree)).not.toContain('team-a1-1');
  });

  it('раскрывает и сворачивает ветку по кнопке', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(makeOrgFixture())));
    renderWithProviders(<Dashboard />);
    const user = userEvent.setup();

    const tree = await screen.findByRole('tree');
    await user.click(screen.getByRole('button', { name: 'Развернуть «Отдел А1»' }));
    expect(visibleNodeIds(tree)).toEqual(expect.arrayContaining(['team-a1-1', 'team-a1-2']));

    await user.click(screen.getByRole('button', { name: 'Свернуть «Отдел А1»' }));
    expect(visibleNodeIds(tree)).not.toContain('team-a1-1');
    expect(within(tree).getByText('Команда А1-1').closest('[data-collapsible]')).toHaveAttribute(
      'data-open',
      'false',
    );
  });

  it('показывает численность и индикатор эффективности у каждого узла', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(makeOrgFixture())));
    renderWithProviders(<Dashboard />);
    const tree = await screen.findByRole('tree');

    const item = within(tree)
      .getAllByRole('treeitem')
      .find((el) => el.getAttribute('data-node-id') === 'dep-a2');
    expect(item).toBeDefined();
    // первая строка внутри элемента — сам узел; ниже в DOM лежат его (скрытые) потомки
    expect(within(item!).getAllByTitle('Численность подразделения')[0]).toHaveTextContent('1');
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
    // на широком экране по умолчанию обе панели рядом
    expect(screen.getByRole('button', { name: 'Вместе' })).toHaveAttribute('aria-pressed', 'true');
    expect(visibleNodeIds(tree)).not.toContain('team-b1-1');

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

  it('узкий экран: режим «Вместе» недоступен, выбор строки возвращает к дереву', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(makeOrgFixture())));
    renderWithProviders(<Dashboard />);
    const user = userEvent.setup();

    await screen.findByRole('tree');
    expect(screen.getByRole('button', { name: 'Вместе' })).toBeDisabled();
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

  it('показывает сводные плитки и график по дивизионам', async () => {
    setMediaMatches(true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(makeOrgFixture())));
    renderWithProviders(<Dashboard />);
    await screen.findByRole('tree');

    expect(document.querySelector('[data-kpi="headcount"]')).toHaveTextContent('41');
    expect(document.querySelector('[data-kpi="units"]')).toHaveTextContent('9');
    expect(document.querySelector('[data-kpi="units"]')).toHaveTextContent(
      '2 дивизиона · 3 отдела · 4 команды',
    );
    const chart = screen.getByRole('region', { name: 'Средняя эффективность по дивизионам' });
    expect(within(chart).getByLabelText(/Дивизион Б: 62,0/)).toBeInTheDocument();
  });

  it('поиск подсвечивает найденные узлы в дереве и приглушает остальные', async () => {
    setMediaMatches(true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(makeOrgFixture())));
    renderWithProviders(<Dashboard />);
    const user = userEvent.setup();
    const tree = await screen.findByRole('tree');

    await user.type(screen.getByRole('searchbox'), 'б1');
    await waitFor(() =>
      expect(tree.querySelector('[data-node-id="dep-b1"] [data-match="true"]')).not.toBeNull(),
    );
    expect(tree.querySelector('[data-node-id="div-a"] [data-dim="true"]')).not.toBeNull();
    // предки найденной команды раскрываются в эффекте следующим рендером — ждём
    await waitFor(() => expect(visibleNodeIds(tree)).toContain('team-b1-1'));
  });

  describe('live-обновления', () => {
    const versioned = (version: string) =>
      jsonResponse(makeOrgFixture(), {
        headers: {
          'Content-Type': 'application/json',
          'X-Org-Version': version,
          'X-Server-Id': 'srv',
        },
      });
    const AT = '2026-09-14T12:00:00.000Z';

    async function connect(fetchMock: ReturnType<typeof vi.fn>) {
      vi.stubGlobal('fetch', fetchMock);
      setMediaMatches(true);
      renderWithProviders(<Dashboard />);
      await screen.findByRole('tree');
      const socket = MockWebSocket.last();
      act(() => {
        socket.open();
        socket.message({ type: 'hello', serverId: 'srv', seq: 3, heartbeatMs: 10_000 });
      });
      return socket;
    }

    it('патч применяется без рефетча: меняются ячейки узла и предков, изменённые подсвечены', async () => {
      const fetchMock = vi.fn().mockResolvedValue(versioned('3'));
      const socket = await connect(fetchMock);
      expect(screen.getByText('Онлайн')).toBeInTheDocument();

      act(() => {
        socket.message({
          type: 'patch',
          seq: 4,
          changes: [{ id: 'team-a1-1', fields: { headcount: 12 }, updatedAt: AT }],
        });
      });

      const grid = screen.getByRole('grid');
      const teamCells = within(within(grid).getByText('Команда А1-1').closest('tr')!).getAllByRole(
        'gridcell',
      );
      expect(teamCells[2]).toHaveTextContent('12');
      expect(teamCells[2]!.querySelector('[data-flash-at]')).not.toBeNull();

      const divisionCells = within(
        within(grid).getByText('Дивизион А').closest('tr')!,
      ).getAllByRole('gridcell');
      expect(divisionCells[2]).toHaveTextContent('33');
      expect(divisionCells[2]!.querySelector('[data-flash-at]')).not.toBeNull();
      // бюджет не менялся — без подсветки
      expect(divisionCells[3]!.querySelector('[data-flash-at]')).toBeNull();

      // в дереве численность тоже обновилась
      const tree = screen.getByRole('tree');
      const item = tree.querySelector('[data-node-id="team-a1-1"]')!;
      expect(
        within(item as HTMLElement).getAllByTitle('Численность подразделения')[0],
      ).toHaveTextContent('12');

      // и сводная плитка: 41 + 2, с подсветкой
      const headcountTile = document.querySelector('[data-kpi="headcount"]')!;
      expect(headcountTile).toHaveTextContent('43');
      expect(headcountTile.querySelector('[data-flash-at]')).not.toBeNull();

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('разрыв нумерации патчей приводит к перезапросу снимка', async () => {
      const fetchMock = vi.fn().mockResolvedValue(versioned('3'));
      const socket = await connect(fetchMock);
      act(() => {
        socket.message({ type: 'patch', seq: 7, changes: [] });
      });
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    });

    it('обрыв соединения показывает переподключение и кнопку', async () => {
      const socket = await connect(vi.fn().mockResolvedValue(versioned('3')));
      act(() => socket.serverClose(1006, 'network'));
      expect(screen.getByText(/Переподключение/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Подключиться' })).toBeInTheDocument();
    });
  });
});
