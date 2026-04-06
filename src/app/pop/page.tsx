import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center gap-8 p-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-1 mb-1">
          <Image
            src="/pop-can.png"
            alt="POP soda can"
            width={40}
            height={40}
            className="drop-shadow-[0_0_16px_rgba(168,85,247,0.3)]"
            priority
          />
          <h1 className="text-4xl font-bold">POP</h1>
        </div>
        <p className="text-sm text-muted-foreground uppercase tracking-[0.2em]">
          Player Optimization Planner
        </p>
      </div>

      <p className="text-muted-foreground text-sm text-center max-w-md">
        Plan your MMOLB Season 11 builds. Import players, optimize stat allocation,
        evaluate rosters, and figure out who to mulch.
      </p>

      <div className="flex gap-3">
        <Link
          href="/pop/pitcher"
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-primary-foreground font-medium hover:bg-primary/90 transition-colors text-sm"
        >
          🎯 Pitcher Planner
        </Link>
        <Link
          href="/pop/batter"
          className="flex items-center justify-center gap-2 rounded-lg bg-secondary px-5 py-2.5 text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors border border-border text-sm"
        >
          💪 Batter Builder
        </Link>
        <Link
          href="/pop/mulch"
          className="flex items-center justify-center gap-2 rounded-lg bg-secondary px-5 py-2.5 text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors border border-border text-sm"
        >
          ⚾ Mulch-o-Meter
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 max-w-3xl w-full text-sm">
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl mb-2">📊</div>
          <div className="font-medium mb-1">Stat Targets</div>
          <div className="text-sm text-muted-foreground">
            See which stats to invest in and track your progress.
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl mb-2">🔮</div>
          <div className="font-medium mb-1">Boon Planning</div>
          <div className="text-sm text-muted-foreground">
            Boon recommendations for levels 10, 20, and 30.
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl mb-2">🎯</div>
          <div className="font-medium mb-1">Pitch Arsenal</div>
          <div className="text-sm text-muted-foreground">
            Optimize your pitch selection based on your build.
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl mb-2">⚾</div>
          <div className="font-medium mb-1">Mulch-o-Meter</div>
          <div className="text-sm text-muted-foreground">
            Evaluate your full roster for mulch, hold, or keep.
          </div>
        </div>
      </div>
    </div>
  );
}
