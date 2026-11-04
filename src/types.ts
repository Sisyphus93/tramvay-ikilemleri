/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TrackEntityType =
  | 'people'
  | 'streamer'
  | 'moderator'
  | 'gamer'
  | 'cat'
  | 'pc'
  | 'steam'
  | 'doner'
  | 'taxi'
  | 'marti'
  | 'harddrive'
  | 'student'
  | 'yourself'
  | 'teammate'
  | 'richman'
  | 'futurepeople'
  | 'npc'
  | 'code'
  | 'savings'
  | 'painting'
  | 'sleepers'
  | 'bestfriend'
  | 'glasses'
  | 'cousins'
  | 'baby'
  | 'elderly'
  | 'clone'
  | 'mysterybox'
  | 'robot'
  | 'emptytrolley'
  | 'prank'
  | 'enemy'
  | 'lifespan'
  | 'hype'
  | 'gugu'
  | 'ibo'
  | 'samet'
  | 'mete'
  | 'kegri'
  | 'katmanmasa'
  | 'reddit'
  | 'kick'
  | 'food'
  | 'canolar'
  | 'sponsor'
  | 'discord';

export interface TrackTarget {
  label: string;
  count: number;
  entityType: TrackEntityType;
  description: string;
  isHuman: boolean;
  monetaryValueTL?: number;
}

/** Mood decides which sting resolves a verdict (see data/dilemmas.ts). */
export type DilemmaMood = 'relief' | 'dread' | 'absurd';

export interface Dilemma {
  id: number;
  conceptualChoice?: boolean;
  /** Verdict sting: relief = low stakes or a good outcome is plausible,
   *  dread = real human deaths, absurd = ridiculous objects or scenarios. */
  mood?: DilemmaMood;
  /** Only a few of the most ridiculous dilemmas get the comic crash. */
  comic?: boolean;
  title: string;
  question: string;
  straightTrack: TrackTarget;
  divertedTrack: TrackTarget;
  straightActionLabel: string;
  divertedActionLabel: string;
  straightCommentary: string;
  divertedCommentary: string;
  chatReaction: string;
  twitchEmote: string;
}

export type Decision = 'straight' | 'diverted';

export interface PlayerHistoryEntry {
  dilemmaId: number;
  decision: Decision;
  leverPulled: boolean;
  victimsLabel: string;
  humanDeaths: number;
  materialDamageTL: number;
}
