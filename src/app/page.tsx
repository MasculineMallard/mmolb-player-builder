import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">⚾ MMOLB Player Builder</h1>
        <p className="text-muted-foreground text-lg">
          Plan your Season 11 player progression
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/pitcher"
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          Pitcher Builder
        </Link>
        <Link
          href="/batter"
          className="flex items-center justify-center gap-2 rounded-lg bg-secondary px-6 py-3 text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors border border-border"
        >
          Batter Builder
        </Link>
      </div>
    </div>
  );
}
