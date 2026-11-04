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

export interface Dilemma {
  id: number;
  conceptualChoice?: boolean;
  mood?: 'relief' | 'dread' | 'absurd';
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
