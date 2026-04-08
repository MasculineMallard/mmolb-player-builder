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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
        <Link
          href="/pitcher"
          className="group flex flex-col items-center gap-3 rounded-xl bg-card border-2 border-border px-6 py-6 hover:border-primary hover:bg-card/80 transition-all active:scale-95 cursor-pointer"
        >
          <span className="text-3xl">🎯</span>
          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">Pitcher Planner</span>
          <span className="text-xs text-muted-foreground text-center">Optimize pitching builds and pitch arsenals</span>
        </Link>
        <Link
          href="/batter"
          className="group flex flex-col items-center gap-3 rounded-xl bg-card border-2 border-border px-6 py-6 hover:border-primary hover:bg-card/80 transition-all active:scale-95 cursor-pointer"
        >
          <span className="text-3xl">💪</span>
          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">Batter Builder</span>
          <span className="text-xs text-muted-foreground text-center">Plan batting stat allocation and boon choices</span>
        </Link>
        <Link
          href="/mulch"
          className="group flex flex-col items-center gap-3 rounded-xl bg-card border-2 border-border px-6 py-6 hover:border-primary hover:bg-card/80 transition-all active:scale-95 cursor-pointer"
        >
          <span className="text-3xl">⚾</span>
          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">Mulch-o-Meter</span>
          <span className="text-xs text-muted-foreground text-center">Evaluate your roster: mulch, hold, or keep</span>
        </Link>
      </div>
    </div>
  );
}
