/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Dilemma } from '../types.ts';
import { ORIGINAL_DILEMMAS } from './originalDilemmas.ts';
import { BONUS_DILEMMAS } from './bonusDilemmas.ts';

/** 20 klasik ikilem, ardından 7 bonus ikilem. */
export const DILEMMAS: Dilemma[] = [
  ...ORIGINAL_DILEMMAS,
  ...BONUS_DILEMMAS.map((d, index) => ({
    ...d,
    id: ORIGINAL_DILEMMAS.length + index + 1,
    title: d.title.replace(/^\d+\./, `${ORIGINAL_DILEMMAS.length + index + 1}.`),
  })),
];
