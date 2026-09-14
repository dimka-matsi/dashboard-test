import { describe, expect, it } from 'vitest';

import { makeNode, makeOrgFixture } from '@/test/fixtures';

import { ancestorsOf, buildOrgTree, OrgTreeError } from './build-org-tree';

describe('buildOrgTree', () => {
  const tree = buildOrgTree(makeOrgFixture());

  it('индексирует узлы и сортирует корни и детей по имени', () => {
    expect(tree.nodes.size).toBe(9);
    expect(tree.roots).toEqual(['div-a', 'div-b']);
    expect(tree.children.get('div-a')).toEqual(['dep-a1', 'dep-a2']);
    expect(tree.children.get('dep-a1')).toEqual(['team-a1-1', 'team-a1-2']);
    expect(tree.children.has('team-a1-1')).toBe(false);
  });

  it('считает глубину и максимальный уровень', () => {
    expect(tree.depth.get('div-a')).toBe(1);
    expect(tree.depth.get('dep-a1')).toBe(2);
    expect(tree.depth.get('team-a1-2')).toBe(3);
    expect(tree.maxDepth).toBe(3);
  });

  it('обход в глубину даёт естественный порядок таблицы', () => {
    expect(tree.order).toEqual([
      'div-a',
      'dep-a1',
      'team-a1-1',
      'team-a1-2',
      'dep-a2',
      'team-a2-1',
      'div-b',
      'dep-b1',
      'team-b1-1',
    ]);
  });

  it('ancestorsOf возвращает цепочку до корня', () => {
    expect(ancestorsOf(tree, 'team-a1-2')).toEqual(['dep-a1', 'div-a']);
    expect(ancestorsOf(tree, 'div-a')).toEqual([]);
  });

  it('пустой массив даёт пустое дерево', () => {
    const empty = buildOrgTree([]);
    expect(empty.nodes.size).toBe(0);
    expect(empty.roots).toEqual([]);
    expect(empty.maxDepth).toBe(0);
  });

  it('сортировка учитывает русскую локаль и числа', () => {
    const sorted = buildOrgTree([
      makeNode({ id: 'c', name: 'Команда 10' }),
      makeNode({ id: 'a', name: 'команда 2' }),
      makeNode({ id: 'b', name: 'Ёлки' }),
      makeNode({ id: 'd', name: 'Альфа' }),
    ]);
    expect(sorted.roots.map((id) => sorted.nodes.get(id)?.name)).toEqual([
      'Альфа',
      'Ёлки',
      'команда 2',
      'Команда 10',
    ]);
  });

  describe('целостность', () => {
    it('дубль id', () => {
      expect(() => buildOrgTree([makeNode({ id: 'x' }), makeNode({ id: 'x' })])).toThrowError(
        expect.objectContaining({ code: 'duplicate-id', nodeId: 'x' }),
      );
    });

    it('ссылка на несуществующего родителя', () => {
      expect(() => buildOrgTree([makeNode({ id: 'x', parentId: 'ghost' })])).toThrowError(
        expect.objectContaining({ code: 'missing-parent', nodeId: 'x' }),
      );
    });

    it('самоссылка', () => {
      expect(() => buildOrgTree([makeNode({ id: 'x', parentId: 'x' })])).toThrowError(
        expect.objectContaining({ code: 'self-parent' }),
      );
    });

    it('цикл без корня', () => {
      const cyclic = [
        makeNode({ id: 'root' }),
        makeNode({ id: 'a', parentId: 'b' }),
        makeNode({ id: 'b', parentId: 'a' }),
      ];
      expect(() => buildOrgTree(cyclic)).toThrowError(OrgTreeError);
      expect(() => buildOrgTree(cyclic)).toThrowError(expect.objectContaining({ code: 'cycle' }));
    });
  });
});
