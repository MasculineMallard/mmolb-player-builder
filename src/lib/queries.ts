import pool from "./db";
import type {
  PlayerData,
  PlayerSearchResult,
  TeamSearchResult,
  RosterPlayer,
  PitchData,
} from "./types";

const SLOT_TO_POSITION: Record<string, string> = {
  catcher: "C",
  firstbase: "1B",
  secondbase: "2B",
  thirdbase: "3B",
  shortstop: "SS",
  leftfield: "LF",
  centerfield: "CF",
  rightfield: "RF",
  designatedhitter: "DH",
  startingpitcher: "SP",
  startingpitcher1: "SP",
  startingpitcher2: "SP",
  startingpitcher3: "SP",
  startingpitcher4: "SP",
  startingpitcher5: "SP",
  reliefpitcher: "RP",
  reliefpitcher1: "RP",
  reliefpitcher2: "RP",
  reliefpitcher3: "RP",
  closer: "CL",
  pitcher: "P",
  bench: "Bench",
  benchbatter: "Bench",
  benchbatter1: "Bench",
  benchbatter2: "Bench",
  benchbatter3: "Bench",
  benchpitcher: "Bench",
  benchpitcher1: "Bench",
  benchpitcher2: "Bench",
  benchpitcher3: "Bench",
};

function slotToPosition(slot: string | null): string | null {
  if (!slot) return null;
  const key = slot.toLowerCase();
  return SLOT_TO_POSITION[key] ?? key.toUpperCase();
}

export async function searchPlayers(
  nameQuery: string,
  limit = 10
): Promise<PlayerSearchResult[]> {
  const parts = nameQuery.trim().toLowerCase().split(/\s+/);

  let rows;
  if (parts.length >= 2) {
    const word1 = `${parts[0]}%`;
    const word2 = `${parts.slice(1).join(" ")}%`;
    const { rows: r } = await pool.query(
      `SELECT
         tpv.mmolb_player_id,
         tpv.first_name,
         tpv.last_name,
         pv.level,
         tv.name as team_name,
         tv.emoji as team_emoji
       FROM data.team_player_versions tpv
       JOIN data.player_versions pv ON tpv.mmolb_player_id = pv.mmolb_player_id
         AND pv.valid_until IS NULL
       JOIN data.team_versions tv ON tpv.mmolb_team_id = tv.mmolb_team_id
         AND tv.valid_until IS NULL
       WHERE tpv.valid_until IS NULL
         AND (
           (LOWER(tpv.first_name) LIKE $1 AND LOWER(tpv.last_name) LIKE $2)
           OR
           (LOWER(tpv.last_name) LIKE $1 AND LOWER(tpv.first_name) LIKE $2)
         )
       ORDER BY pv.level DESC
       LIMIT $3`,
      [word1, word2, limit]
    );
    rows = r;
  } else {
    const pattern = `${parts[0]}%`;
    const { rows: r } = await pool.query(
      `SELECT
         tpv.mmolb_player_id,
         tpv.first_name,
         tpv.last_name,
         pv.level,
         tv.name as team_name,
         tv.emoji as team_emoji
       FROM data.team_player_versions tpv
       JOIN data.player_versions pv ON tpv.mmolb_player_id = pv.mmolb_player_id
         AND pv.valid_until IS NULL
       JOIN data.team_versions tv ON tpv.mmolb_team_id = tv.mmolb_team_id
         AND tv.valid_until IS NULL
       WHERE tpv.valid_until IS NULL
         AND (LOWER(tpv.first_name) LIKE $1 OR LOWER(tpv.last_name) LIKE $1)
       ORDER BY pv.level DESC
       LIMIT $2`,
      [pattern, limit]
    );
    rows = r;
  }

  return rows.map((row: Record<string, unknown>) => ({
    mmolbPlayerId: row.mmolb_player_id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    name: `${row.first_name} ${row.last_name}`,
    level: (row.level as number) || 1,
    teamName: row.team_name as string | null,
    teamEmoji: row.team_emoji as string | null,
  }));
}

export async function getPlayerFull(
  mmolbPlayerId: string
): Promise<PlayerData | null> {
  const { rows } = await pool.query(
    `WITH player_info AS (
       SELECT
         pv.first_name,
         pv.last_name,
         pv.level,
         t.name as team_name,
         t.emoji as team_emoji,
         s.name as position_slot
       FROM data.player_versions pv
       LEFT JOIN data.team_versions t ON pv.mmolb_team_id = t.mmolb_team_id
         AND t.valid_until IS NULL
       LEFT JOIN taxa.slot s ON pv.slot = s.id
       WHERE pv.mmolb_player_id = $1
         AND pv.valid_until IS NULL
       ORDER BY pv.valid_from DESC
       LIMIT 1
     ),
     player_stats AS (
       SELECT
         a.name as attr_name,
         prav.base_total
       FROM data.player_report_attribute_versions prav
       JOIN taxa.attribute a ON prav.attribute = a.id
       WHERE prav.mmolb_player_id = $1
         AND prav.valid_until IS NULL
     ),
     player_boons AS (
       SELECT
         m.name as boon_name,
         pmv.modification_type
       FROM data.player_modification_versions pmv
       JOIN data.modifications m ON pmv.modification_id = m.id
       WHERE pmv.mmolb_player_id = $1
         AND pmv.valid_until IS NULL
     ),
     player_pitches AS (
       SELECT
         pt.name as pitch_name,
         pptv.frequency
       FROM data.player_pitch_type_versions pptv
       JOIN taxa.pitch_type pt ON pptv.pitch_type = pt.id
       WHERE pptv.mmolb_player_id = $1
         AND pptv.valid_until IS NULL
     )
     SELECT 'info' as data_type, pi.first_name as col1, pi.last_name as col2,
            pi.level::text as col3, pi.team_name as col4, pi.team_emoji as col5,
            pi.position_slot as col6
     FROM player_info pi
     UNION ALL
     SELECT 'stat', ps.attr_name, ps.base_total::text, NULL, NULL, NULL, NULL
     FROM player_stats ps
     UNION ALL
     SELECT 'boon', pb.boon_name, pb.modification_type::text, NULL, NULL, NULL, NULL
     FROM player_boons pb
     UNION ALL
     SELECT 'pitch', pp.pitch_name, pp.frequency::text, NULL, NULL, NULL, NULL
     FROM player_pitches pp`,
    [mmolbPlayerId]
  );

  let firstName: string | null = null;
  let lastName: string | null = null;
  let level = 1;
  let teamName: string | null = null;
  let teamEmoji: string | null = null;
  let positionSlot: string | null = null;
  const stats: Record<string, number> = {};
  const lesserBoons: string[] = [];
  const greaterBoons: string[] = [];
  const pitches: PitchData[] = [];

  for (const row of rows) {
    switch (row.data_type) {
      case "info":
        firstName = row.col1;
        lastName = row.col2;
        level = row.col3 ? parseInt(row.col3) : 1;
        teamName = row.col4;
        teamEmoji = row.col5;
        positionSlot = row.col6;
        break;
      case "stat": {
        const attrName = (row.col1 as string)?.toLowerCase() ?? "";
        const baseTotal = row.col2 ? parseFloat(row.col2) : 0;
        stats[attrName] = Math.round(baseTotal * 100);
        break;
      }
      case "boon": {
        const modType = row.col2 ? parseInt(row.col2) : 0;
        if (modType === 2) greaterBoons.push(row.col1);
        else if (modType === 1) lesserBoons.push(row.col1);
        break;
      }
      case "pitch": {
        const frequency = row.col2 ? parseFloat(row.col2) : 0;
        pitches.push({ name: row.col1, frequency });
        break;
      }
    }
  }

  if (!firstName) return null;

  pitches.sort((a, b) => b.frequency - a.frequency);

  return {
    name: `${firstName} ${lastName}`,
    firstName,
    lastName: lastName!,
    level,
    teamName,
    teamEmoji,
    position: slotToPosition(positionSlot),
    stats,
    lesserBoons,
    greaterBoons,
    mmolbPlayerId,
    pitches,
  };
}

export async function searchTeams(
  query: string,
  limit = 20
): Promise<TeamSearchResult[]> {
  const pattern = `%${query.trim().toLowerCase()}%`;
  const { rows } = await pool.query(
    `SELECT DISTINCT
       tv.mmolb_team_id,
       tv.name,
       tv.emoji,
       tv.location
     FROM data.team_versions tv
     WHERE tv.valid_until IS NULL
       AND (LOWER(tv.name) LIKE $1 OR LOWER(tv.location) LIKE $1)
     ORDER BY tv.name
     LIMIT $2`,
    [pattern, limit]
  );

  return rows.map((row: Record<string, unknown>) => ({
    mmolbTeamId: row.mmolb_team_id as string,
    name: row.name as string,
    emoji: row.emoji as string | null,
    location: row.location as string | null,
  }));
}

export async function getTeamRoster(
  mmolbTeamId: string
): Promise<RosterPlayer[]> {
  const { rows } = await pool.query(
    `SELECT
       pv.mmolb_player_id,
       pv.first_name,
       pv.last_name,
       pv.level,
       COALESCE(ts.name, s.name) as slot_name,
       CASE WHEN tpv.mmolb_player_id IS NOT NULL THEN false ELSE true END as is_bench
     FROM data.player_versions pv
     LEFT JOIN data.team_player_versions tpv
       ON pv.mmolb_player_id = tpv.mmolb_player_id
       AND tpv.mmolb_team_id = $1
       AND tpv.valid_until IS NULL
     LEFT JOIN taxa.slot ts ON tpv.slot = ts.id
     LEFT JOIN taxa.slot s ON pv.slot = s.id
     WHERE pv.valid_until IS NULL
       AND pv.mmolb_team_id = $1
       AND pv.level IS NOT NULL
     ORDER BY
       CASE WHEN tpv.mmolb_player_id IS NOT NULL THEN 0 ELSE 1 END,
       COALESCE(ts.name, s.name),
       pv.level DESC`,
    [mmolbTeamId]
  );

  const POSITION_ORDER: Record<string, number> = {
    SP: 0, RP: 1, CL: 2,
    C: 3, "1B": 4, "2B": 5, "3B": 6, SS: 7,
    LF: 8, CF: 9, RF: 10, DH: 11,
    P: 12, Bench: 99,
  };

  const roster: RosterPlayer[] = rows.map((row: Record<string, unknown>) => ({
    mmolbPlayerId: row.mmolb_player_id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    name: `${row.first_name} ${row.last_name}`,
    level: (row.level as number) || 1,
    slot: row.slot_name as string | null,
    position: slotToPosition(row.slot_name as string | null) ?? "",
    isBench: row.is_bench as boolean,
  }));

  roster.sort((a, b) => {
    if (a.isBench !== b.isBench) return a.isBench ? 1 : -1;
    const posA = POSITION_ORDER[a.position] ?? 50;
    const posB = POSITION_ORDER[b.position] ?? 50;
    if (posA !== posB) return posA - posB;
    return b.level - a.level;
  });

  return roster;
}
