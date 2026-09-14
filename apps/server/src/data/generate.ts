import type { OrgNode } from '@staff-pulse/contracts';

import { ORG_STRUCTURE } from './org-structure';
import { createPrng } from './prng';

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

const pad2 = (n: number): string => String(n).padStart(2, '0');
const roundTo = (value: number, step: number): number => Math.round(value / step) * step;

/**
 * Генерирует плоский список узлов орг-структуры.
 * Одинаковые seed и now дают байт-в-байт одинаковый результат.
 */
export function generateOrgNodes(seed: number, now: number = Date.now()): OrgNode[] {
  const rnd = createPrng(seed);
  const nodes: OrgNode[] = [];
  const recentStamp = (): string =>
    new Date(now - rnd.int(0, 72) * HOUR_MS - rnd.int(0, 59) * MINUTE_MS).toISOString();

  ORG_STRUCTURE.forEach((division, di) => {
    const divisionId = `div-${pad2(di + 1)}`;
    nodes.push({
      id: divisionId,
      name: division.name,
      parentId: null,
      headcount: rnd.int(3, 10),
      budget: roundTo(rnd.int(8_000_000, 40_000_000), 10_000),
      performance: rnd.int(45, 95),
      updatedAt: recentStamp(),
    });

    division.departments.forEach((department, pi) => {
      const departmentId = `dep-${pad2(di + 1)}-${pad2(pi + 1)}`;
      nodes.push({
        id: departmentId,
        name: department.name,
        parentId: divisionId,
        headcount: rnd.int(2, 6),
        budget: roundTo(rnd.int(3_000_000, 12_000_000), 10_000),
        performance: rnd.int(40, 97),
        updatedAt: recentStamp(),
      });

      department.teams.forEach((teamName, ti) => {
        const headcount = rnd.int(4, 18);
        nodes.push({
          id: `team-${pad2(di + 1)}-${pad2(pi + 1)}-${pad2(ti + 1)}`,
          name: teamName,
          parentId: departmentId,
          headcount,
          budget: roundTo(headcount * rnd.int(1_200_000, 2_400_000), 10_000),
          performance: rnd.int(35, 98),
          updatedAt: recentStamp(),
        });
      });
    });
  });

  return nodes;
}
