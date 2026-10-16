export type GameStatus =
  | "SCHEDULED"
  | "WARMUP"
  | "IN_PROGRESS"
  | "DELAYED"
  | "FINISHED"
  | "POSTPONED";

export interface TeamSummary {
  id: number;
  code: string;
  shortName: string;
  name: string;
  nick: string;
  logoUrl: string;
  color: string;
  wins: number;
  losses: number;
}

export interface ScheduleGame {
  id: string;
  date: string; // YYYY-MM-DD
  startsAt: string; // ISO
  time: string; // e.g. "7:00 PM"
  status: GameStatus;
  statusLabel?: string;
  inning: string; // e.g. "Alta 7°" or "Final"
  isTopInning?: boolean;
  currentInning?: number;
  balls?: number;
  strikes?: number;
  outs?: number;
  runners?: {
    first?: boolean;
    second?: boolean;
    third?: boolean;
  };
  awayTeam: TeamSummary;
  homeTeam: TeamSummary;
  awayScore: number;
  homeScore: number;
  awayHits: number;
  homeHits: number;
  awayErrors: number;
  homeErrors: number;
  venue: string;
  venueCity: string;
  tv?: string;
  tvChannels?: string[];
  decisions?: {
    winner?: string;
    loser?: string;
    save?: string;
  };
  probablePitchers?: {
    away?: string;
    home?: string;
  };
}

export interface PitchPoint {
  n: number; // pitch number in at-bat
  k: "b" | "s" | "x"; // ball, strike, in play
  d: string; // description in Spanish
  ty?: string; // pitch type e.g. Recta 4-costuras, Slider
  sp?: number; // speed mph
  x?: number; // plate coordinate x
  y?: number; // plate coordinate y
  zt?: number; // strikezone top
  zb?: number; // strikezone bottom
}

export interface FieldDefender {
  pos: "P" | "C" | "1B" | "2B" | "3B" | "SS" | "LF" | "CF" | "RF";
  id: number;
  name: string;
}

export interface RunnerInfo {
  id: number;
  name: string;
}

export interface HitSprayPoint {
  x: number;
  y: number;
  inning: number;
  side: "away" | "home";
  eventType: string;
  batterName: string;
  text: string;
}

export interface PlayByPlayItem {
  i: number;
  inning: number;
  top: boolean;
  complete: boolean;
  scoring: boolean;
  event: string;
  eventType: string;
  text: string;
  rbi: number;
  away: number;
  home: number;
  balls: number;
  strikes: number;
  outs: number;
  batter: { id: number; name: string };
  pitcher: { id: number; name: string };
  hand?: string;
  pitches: PitchPoint[];
  actions: string[];
}

export interface BattingBoxRow {
  id: number;
  name: string;
  pos: string;
  order: number;
  starter: boolean;
  ab: number;
  r: number;
  h: number;
  d: number;
  t: number;
  hr: number;
  rbi: number;
  bb: number;
  so: number;
  sb: number;
  avg: string;
  ops: string;
}

export interface PitchingBoxRow {
  id: number;
  name: string;
  tag?: string; // G, P, S, H
  ip: string;
  h: number;
  r: number;
  er: number;
  bb: number;
  k: number;
  hr: number;
  pitches: number;
  strikes: number;
  era: string;
  w?: number;
  l?: number;
  sv?: number;
}

export interface TeamBoxScore {
  batting: {
    rows: BattingBoxRow[];
    totals: { ab: number; r: number; h: number; rbi: number; bb: number; so: number; hr: number };
  };
  pitching: {
    rows: PitchingBoxRow[];
    totals: { ip: string; h: number; r: number; er: number; bb: number; k: number; pitches: number };
  };
  notes: {
    batting: { label: string; value: string }[];
    fielding: { label: string; value: string }[];
  };
}

export interface LineupPlayer {
  id: number;
  order: number;
  name: string;
  position: string;
  side: string;
  avg: string;
  ops: string;
  homeRuns: number;
}

export interface GamedayData {
  id: string;
  rev: string;
  date: string;
  dateLabel: string;
  startsAt: string;
  time: string;
  status: GameStatus;
  statusLabel?: string;
  venue: string;
  venueCity: string;
  venueLines?: string;
  tv?: string;
  tvChannels?: string[];
  viewers: number;
  awayTeam: TeamSummary;
  homeTeam: TeamSummary;
  awayScore: number;
  homeScore: number;
  awayHits: number;
  homeHits: number;
  awayErrors: number;
  homeErrors: number;
  lob: { away: number; home: number };
  inningState?: {
    inning: number;
    top: boolean;
    balls: number;
    strikes: number;
    outs: number;
  };
  box: {
    innings: number[];
    away: (number | null)[];
    home: (number | null)[];
  };
  decisions?: {
    winner?: string;
    loser?: string;
    save?: string;
  };
  awayPitcher?: string;
  awayPitcherId?: number;
  awayPitcherHand?: string;
  homePitcher?: string;
  homePitcherId?: number;
  homePitcherHand?: string;
  field?: {
    top: boolean;
    batSide: "L" | "R";
    batter?: RunnerInfo;
    onDeck?: RunnerInfo;
    inHole?: RunnerInfo;
    runners: {
      first?: RunnerInfo;
      second?: RunnerInfo;
      third?: RunnerInfo;
    };
    defense: FieldDefender[];
  };
  matchup?: {
    balls: number;
    strikes: number;
    outs: number;
    pitcher: {
      id: number;
      name: string;
      hand: string;
      ip: string;
      pitches: number;
      strikes: number;
      k: number;
      bb: number;
      er: number;
      era: string;
    };
    batter: {
      id: number;
      name: string;
      order?: number;
      pos: string;
      side: string;
      today: string;
      avg: string;
      ops: string;
      hr: number;
      rbi: number;
    };
    pitches: PitchPoint[];
  };
  hits: HitSprayPoint[];
  feed: PlayByPlayItem[];
  boxscore: {
    away: TeamBoxScore;
    home: TeamBoxScore;
  };
  lineups: {
    away: LineupPlayer[];
    home: LineupPlayer[];
  };
  info: {
    capacity?: number;
    surface?: string;
    duration?: string;
    attendance?: string;
    weather?: {
      condition?: string;
      temp?: string;
      wind?: string;
    };
    officials: { role: string; name: string }[];
  };
}

export interface StandingRow {
  team: TeamSummary;
  gamesPlayed: number;
  wins: number;
  losses: number;
  pct: string;
  gamesBehind: string;
  streak: string;
  homeRecord: string;
  awayRecord: string;
  lastTen: string;
  runsScored: number;
  runsAllowed: number;
  runDiff: number;
}

export interface LeaderEntry {
  id: number;
  name: string;
  team: string;
  teamName: string;
  teamLogo: string;
  position: string;
  photo: string;
  value: string;
}

export interface LeaderCategory {
  key: string;
  label: string;
  players: LeaderEntry[];
}

export interface RosterPlayer {
  id: number;
  name: string;
  number: string;
  position: string;
  positionName: string;
  batSide: string;
  throwSide: string;
  height: string;
  weight: string;
  birthDate: string;
  photo: string;
}
