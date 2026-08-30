# S15 archetype weight re-derivation (PR-B) — PROPOSAL, pending Drake approval

Full re-derivation of all 24 archetype `stat_weights` (12 batter + 12 pitcher) for S15.
**Nothing is applied to the JSONs yet** — per locked decision #3 (weight numbers get Drake's
approval before they're written). Structure is unchanged: 3 priority stats @ 0.12 + 3 secondary
@ 0.08. Only WHICH stats change (and pitcher `dump_stats`).

## Sources
- Pitcher build matrix: `mmolb/reference/s15/S15_sheets_screenshot.png` (extracted below; pixel-sampled).
- S15 regression tiers (PR-A) + patch-note directions (`mmolb` skill `s15-patch-notes.md`).

## Extracted pitcher build matrix (4 strategies)
| Strategy | MAIN attrs | Secondary | Dump |
|---|---|---|---|
| Strike in-zone | Deception, Accuracy, Rotation, Presence | Velocity, Guts, Stamina | Control, Stuff, Intuition, Persuasion |
| Strike out-of-zone | Velocity, Presence | Deception, Guts, Stamina | Accuracy, Stuff, Intuition (Control/Rotation "eq") |
| Bad-hit in-zone | Accuracy, Presence, Stuff | Guts, Stamina | Control, Rotation, Intuition, Persuasion |
| Bad-hit out-of-zone | Control, Presence, Stuff | Guts, Stamina | Accuracy, Rotation, Intuition |

Universal signals: **Presence MAIN in all 4**; **Intuition + Defiance always dump**; Guts/Stamina
always secondary ("CL doesn't need guts/stamina/defiance"). Pitch types: Strike = KnuckleCurve /
Sweeper / Curveball (in-zone) + Splitter / Slider (out-of-zone); Bad-hit = Splitter / KnuckleCurve /
Sinker; Cutter is never MAIN.

## Derivation principles
1. **Identity is preserved.** Each archetype keeps its defining stat in priority (Control Artist keeps
   control, Power Pitcher keeps velocity) — the matrix informs the OTHER two slots, it doesn't rename builds.
2. **Presence up** into priority/secondary for every pitcher (matrix's clearest S15 signal).
3. **Intuition + Defiance → dump** for every pitcher. Guts/Stamina secondary for stamina-dependent
   builds (SP/workhorse), dumped for short-relief/CL.
4. **Batters:** cunning (S15 T3) leaves priority; discipline/insight (S15 T1) enter where the build is
   OBP/contact-oriented; intimidation (now T2) softens but stays where it's the archetype identity.
5. Regression tiers govern the RATING (PR-A); these weights govern build FIT. Where the matrix and
   regression differ (Presence vs co-equal T1), the matrix wins for FIT since it is the S15 build guide.

---

## PITCHERS (current → proposed). ✎ = changed slot.

| Archetype | Priority (0.12) | Secondary (0.08) | dump_stats | Change reason |
|---|---|---|---|---|
| power_pitcher | velocity, rotation, **presence✎** | **control✎**, stuff, stamina | accuracy, intuition, defiance | +presence (matrix); control→sec |
| control_artist | control, accuracy, **presence✎** | rotation, **guts✎**, **stamina✎** | persuasion, stuff, intuition | +presence; persuasion→dump |
| groundball_machine | stuff, accuracy, presence | **control✎**, guts, **stamina✎** | velocity, deception, intuition | matrix bad-hit-in match; velocity→dump |
| deception_master | deception, rotation, **presence✎** | **control✎**, velocity, guts | accuracy, stuff, intuition | +presence; control→sec; intuition→dump |
| workhorse | **presence✎**, control, stamina | guts, rotation, velocity | accuracy, deception, defiance | +presence to priority; keep stamina identity |
| damage_control | control, stuff, presence | accuracy, velocity, guts | deception, intuition, defiance | already matrix bad-hit; deception→dump |
| chase_specialist | persuasion, control, **presence✎** | guts, rotation, stuff | accuracy, deception, intuition | +presence (out-of-zone); |
| elite_reliever | velocity, stuff, **presence✎** | deception, control, rotation | stamina, guts, intuition | +presence; stamina/guts dumped (short relief) |
| breaking_ball_specialist | rotation, control, presence | deception, stuff, guts | accuracy, persuasion, intuition | already presence; accuracy→dump |
| knuckleball_artist | stuff, rotation, deception | **presence✎**, control, guts | velocity, persuasion, intuition | +presence to secondary |
| guts_monster | guts, rotation, **presence✎** | velocity, control, stamina | accuracy, deception, intuition | +presence; keep guts identity |
| fastball_command | velocity, control, **presence✎** | accuracy, rotation, guts | deception, defiance, intuition | +presence; accuracy→sec |

`recommended_pitches` stay as-is (already S15-consistent with the pitch matrix); flag if you want those re-derived too.

## BATTERS (current → proposed). ✎ = changed slot.

| Archetype | Priority (0.12) | Secondary (0.08) | Change reason |
|---|---|---|---|
| power_slugger | muscle, lift, **contact✎** | **intimidation✎**, discipline, aiming | intimidation (now T2) → sec; contact → priority |
| contact_hitter | contact, aiming, **discipline✎** | insight, muscle, performance | discipline (now T1) → priority; muscle → sec |
| obp_machine | discipline, **insight✎**, **contact✎** | cunning, intimidation, vision | insight (T1) in; cunning (T3) → sec; contact in for on-base |
| base_stealer | stealth, greed, **speed✎** | cunning, contact, performance | cunning (T3) → sec; speed → priority |
| line_drive_hitter | aiming, contact, insight | muscle, speed, performance | **no change** — already ideal S15 (aiming+insight T1) |
| at_bat_grinder | **discipline✎**, determination, contact | insight, vision, **cunning✎→wisdom out** | discipline (T1) → priority; drop wisdom for insight |
| balanced_hitter | contact, discipline, muscle | aiming, **insight✎**, vision | +insight (T1) replacing speed |
| clutch_performer | performance, contact, muscle | aiming, insight, **discipline✎** | +discipline (T1) replacing speed |
| insight_speedster | insight, speed, aiming | contact, performance, stealth | **no change** — already ideal S15 (insight T1) |
| intimidator | intimidation, muscle, contact | discipline, lift, determination | **kept** — identity is intimidation (now T2, weaker build; flag) |
| vision_specialist | vision, contact, aiming | discipline, insight, muscle | **no change** — already carries discipline/insight |
| fly_ball_hitter | lift, muscle, contact | **discipline✎**, selflessness, vision | intimidation (T2) → discipline (T1) in secondary |

## Notes / flags for your call
- **Presence-everywhere** is the biggest pitcher change (10 of 12 gain it). If you think the community
  sheet over-weights presence, say so and I'll pull it back toward the co-equal-T1 regression view.
- **intimidator** (batter) is built on a now-weaker stat (intimidation T2). Options: keep as-is (a
  niche build), or re-theme toward discipline/muscle. Left as-is pending your call.
- Batter archetypes using off-tier stats (stealth, greed for base_stealer) are unchanged — those are
  baserunning stats, not in the rating tiers, and stay as build inputs.
