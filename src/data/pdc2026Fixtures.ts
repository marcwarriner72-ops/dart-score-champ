// Local master schedule for official PDC fixtures. Edit this list to add more.
export type OfficialFixture = {
  playerA: string;
  playerB: string;
  tournament: string;
  starts_at: string;
  format?: "legs" | "sets";
  country?: string;
};

export const pdcOfficialFixtures: OfficialFixture[] = [
  { playerA: "Luke Littler", playerB: "Luke Humphries", tournament: "PDC Premier League", starts_at: "2026-05-14T19:15:00Z" },
  { playerA: "Michael van Gerwen", playerB: "Michael Smith", tournament: "PDC Premier League", starts_at: "2026-05-14T19:45:00Z" },
  { playerA: "Rob Cross", playerB: "Gerwyn Price", tournament: "PDC Premier League", starts_at: "2026-05-14T20:15:00Z" },
  { playerA: "Nathan Aspinall", playerB: "Peter Wright", tournament: "PDC Premier League", starts_at: "2026-05-14T20:45:00Z" },
];
