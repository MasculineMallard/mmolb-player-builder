"use client";

import { usePlayerStore } from "@/store/player-store";

interface EmptyStateProps {
  playerType: "pitcher" | "batter";
}

export function EmptyState({ playerType }: EmptyStateProps) {
  const recentPlayers = usePlayerStore((s) => s.recentPlayers);
  const { importPlayer, loading } = usePlayerStore();
  const hasRecent = recentPlayers.length > 0;

  return (
    <div className="bg-card border border-border rounded-lg p-8">
      <div className="max-w-lg mx-auto text-center">
        <div className="text-4xl mb-4">
          {playerType === "pitcher" ? "🎯" : "💪"}
        </div>
        <h2 className="text-xl font-bold mb-2">
          {playerType === "pitcher" ? "Pitcher" : "Batter"} Builder
        </h2>
        <p className="text-muted-foreground mb-6">
          Plan your Season 11 level-up path. Import a player to see stat
          recommendations, boon timelines, and archetype optimization.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left mb-6">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-sm font-medium mb-1">Pick an archetype</div>
            <div className="text-sm text-muted-foreground">
              See which stats to prioritize and how to spend your +50 per level.
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-sm font-medium mb-1">Plan your boons</div>
            <div className="text-sm text-muted-foreground">
              Get recommendations for each Lesser Boon slot at levels 10, 20, 30.
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-sm font-medium mb-1">What-if mode</div>
            <div className="text-sm text-muted-foreground">
              Simulate stat allocations before committing. Compare players side by side.
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {hasRecent
            ? "Pick a recent player from the sidebar, or search for a new one."
            : "Search for a player by name or browse a team roster in the sidebar."}
        </p>

        {hasRecent && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {recentPlayers.slice(0, 3).map((p) => (
              <button
                key={p.mmolbPlayerId}
                onClick={() => importPlayer(p.mmolbPlayerId)}
                disabled={loading}
                className="text-sm bg-secondary border border-border px-3 py-1.5 rounded-md hover:bg-secondary/80 transition-colors disabled:opacity-50"
              >
                {p.teamEmoji && <span className="mr-1">{p.teamEmoji}</span>}
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
