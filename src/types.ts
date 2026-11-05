/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TrackEntityType =
  | 'people'
  | 'streamer'
  | 'moderator'
  | 'cat'
  | 'pc'
  | 'steam'
  | 'taxi'
  | 'marti'
  | 'harddrive'
  | 'student'
  | 'yourself'
  | 'teammate'
  | 'futurepeople'
  | 'savings'
  | 'painting'
  | 'sleepers'
  | 'bestfriend'
  | 'glasses'
  | 'baby'
  | 'elderly'
  | 'clone'
  | 'mysterybox'
  | 'robot'
  | 'emptytrolley'
  | 'enemy'
  | 'hype';

export interface TrackTarget {
  label: string;
  count: number;
  entityType: TrackEntityType;
  description: string;
  isHuman: boolean;
  monetaryValueTL?: number;
}

export interface Dilemma {
  id: number;
  conceptualChoice?: boolean;
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
