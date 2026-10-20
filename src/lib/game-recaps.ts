import type { ScheduleGame, StandingRow } from "@/lib/types";

export type RecapSide = {
  code: string;
  name: string;
  nick: string;
  logo: string;
  score: number;
  hits: number;
  errors: number;
};

export type RecapStanding = {
  name: string;
  place: number;
  wins: number;
  losses: number;
  behind: string;
  leading: boolean;
};

export type GameRecap = {
  id: string;
  date: string;
  dateLabel: string;
  headline: string;
  scoreLine: string;
  paragraphs: string[];
  winnerName: string;
  loserName: string;
  venue: string;
  away: RecapSide;
  home: RecapSide;
  winnerSide: "away" | "home";
  marginLabel: string;
  winnerPitcher?: string;
  loserPitcher?: string;
  savePitcher?: string;
  winnerStanding: RecapStanding | null;
  loserStanding: RecapStanding | null;
};

function ordinal(place: number): string {
  return `${place}°`;
}

function rankedStandings(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort((a, b) => {
    const pctDiff = (Number(b.pct) || 0) - (Number(a.pct) || 0);
    if (pctDiff !== 0) return pctDiff;
    return b.wins - a.wins;
  });
}

function placeOf(rows: StandingRow[], code: string): { row: StandingRow; place: number } | null {
  const index = rows.findIndex((row) => row.team.code === code);
  if (index === -1) return null;
  return { row: rows[index], place: index + 1 };
}

function isLeading(place: number, behind: string): boolean {
  return place === 1 || behind === "0" || behind === "0.0" || behind === "-" || behind === "—";
}

function toStanding(found: { row: StandingRow; place: number } | null): RecapStanding | null {
  if (!found) return null;
  const behind = found.row.gamesBehind || "—";
  return {
    name: found.row.team.nick || found.row.team.name,
    place: found.place,
    wins: found.row.wins,
    losses: found.row.losses,
    behind,
    leading: isLeading(found.place, behind),
  };
}

function standingSentence(found: RecapStanding | null): string {
  if (!found) return "";
  const leader = found.leading ? "y lideran la tabla" : `a ${found.behind} juegos del primero`;
  return `${found.name} queda ${found.wins}-${found.losses}, en el ${ordinal(found.place)} lugar, ${leader}.`;
}

export function formatRecapDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year || 2026, (month || 1) - 1, day || 1));
  const label = new Intl.DateTimeFormat("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function buildGameRecaps(games: ScheduleGame[], standings: StandingRow[]): GameRecap[] {
  const table = rankedStandings(standings);
  return games
    .filter((game) => game.status === "FINISHED")
    .sort((a, b) => b.date.localeCompare(a.date) || b.startsAt.localeCompare(a.startsAt))
    .map((game) => {
      const awayWon = game.awayScore > game.homeScore;
      const winner = awayWon ? game.awayTeam : game.homeTeam;
      const loser = awayWon ? game.homeTeam : game.awayTeam;
      const winnerScore = awayWon ? game.awayScore : game.homeScore;
      const loserScore = awayWon ? game.homeScore : game.awayScore;
      const margin = winnerScore - loserScore;
      const marginText = margin === 1 ? "por una carrera" : `por ${margin} carreras`;
      const where = awayWon
        ? `de visita ante ${game.homeTeam.name}`
        : `en casa ante ${game.awayTeam.name}`;
      const place = [game.venue, game.venueCity].filter(Boolean).join(", ");

      const lines = [
        `${winner.name} venció ${winnerScore}-${loserScore} a ${loser.nick} ${where}${place ? `, en ${place}` : ""}. El juego se definió ${marginText}.`,
      ];

      const hits = `Hits: ${game.awayTeam.nick} ${game.awayHits}, ${game.homeTeam.nick} ${game.homeHits}. Errores: ${game.awayErrors}-${game.homeErrors}.`;
      lines.push(hits);

      const decisions = game.decisions;
      if (decisions?.winner || decisions?.loser || decisions?.save) {
        const parts = [
          decisions.winner ? `la victoria fue para ${decisions.winner}` : "",
          decisions.loser ? `la derrota para ${decisions.loser}` : "",
          decisions.save ? `el salvado para ${decisions.save}` : "",
        ].filter(Boolean);
        const sentence = parts.join(", ").replace(/, ([^,]+)$/, " y $1");
        lines.push(`${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`);
      }

      const winnerStanding = toStanding(placeOf(table, winner.code));
      const loserStanding = toStanding(placeOf(table, loser.code));
      const standingLine = [standingSentence(winnerStanding), standingSentence(loserStanding)]
        .filter(Boolean)
        .join(" ");
      if (standingLine) lines.push(standingLine);

      const side = (team: ScheduleGame["awayTeam"], score: number, hits: number, errors: number): RecapSide => ({
        code: team.code,
        name: team.name,
        nick: team.nick,
        logo: team.logoUrl,
        score,
        hits,
        errors,
      });

      return {
        id: game.id,
        date: game.date,
        dateLabel: formatRecapDate(game.date),
        headline: `${winner.nick} venció ${winnerScore}-${loserScore} a ${loser.nick}`,
        scoreLine: `${game.awayTeam.nick} ${game.awayScore} · ${game.homeTeam.nick} ${game.homeScore}`,
        paragraphs: lines,
        winnerName: winner.name,
        loserName: loser.name,
        venue: place,
        away: side(game.awayTeam, game.awayScore, game.awayHits, game.awayErrors),
        home: side(game.homeTeam, game.homeScore, game.homeHits, game.homeErrors),
        winnerSide: awayWon ? "away" : "home",
        marginLabel: marginText,
        winnerPitcher: game.decisions?.winner,
        loserPitcher: game.decisions?.loser,
        savePitcher: game.decisions?.save,
        winnerStanding,
        loserStanding,
      };
    });
}
