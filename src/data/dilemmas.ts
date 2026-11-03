/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Dilemma } from '../types.ts';
import { ORIGINAL_DILEMMAS } from './originalDilemmas.ts';
import { BONUS_DILEMMAS } from './bonusDilemmas.ts';

/**
 * Toplam 30 İkilem:
 * - 1-16: Neal.fun Orijinal Seviyeleri (Türkçe Felsefi Uyarlama)
 * - 17-30: Türk İnternet, Yayıncı ve Oyun Kültürü Özel Bonusları (14 Bölüm)
 */
export const DILEMMAS: Dilemma[] = [
  ...ORIGINAL_DILEMMAS,
  ...BONUS_DILEMMAS,
];
