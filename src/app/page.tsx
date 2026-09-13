import Link from "next/link";
import Image from "next/image";
import { BASE_PATH } from "@/lib/constants";

const HOME_TOOLS = [
  { href: "/preseason", emoji: "📋", label: "Perfunctory Preseason Plotter", description: "Plan your pitching staff, batting order, and defensive alignment" },
  { href: "/mulch", emoji: "⚾", label: "Mulch-o-Meter", description: "Evaluate your roster: mulch, hold, or keep" },
  { href: "/pitcher", emoji: "🎯", label: "Perfect Pitcher Planner", description: "Optimize pitching builds and pitch arsenals" },
  { href: "/batter", emoji: "💪", label: "Better Batter Builder", description: "Plan batting stat allocation and boon choices" },
  { href: "/shop", emoji: "🧵", label: "Super Slugger Sartoria", description: "Build your ideal batter items to fill stat gaps" },
  { href: "/pitcher-shop", emoji: "🎩", label: "Heroic Hurler Haberdashery", description: "Build your ideal pitcher items to fill stat gaps" },
] as const;

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center gap-8 p-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-1 mb-1">
          <Image
            src={`${BASE_PATH}/pop-can.png`}
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
        Plan your MMOLB builds. Import players, optimize stat allocation,
        evaluate rosters, and figure out who to mulch.
      </p>

      <div className="grid w-full max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {HOME_TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-border bg-card px-5 py-5 text-center transition-all hover:border-primary hover:bg-card/80 active:scale-95"
          >
            <span className="text-3xl" aria-hidden="true">{tool.emoji}</span>
            <span className="font-semibold text-foreground transition-colors group-hover:text-primary">{tool.label}</span>
            <span className="text-xs text-muted-foreground">{tool.description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
