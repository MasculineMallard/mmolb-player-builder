import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <h2 className="text-lg font-bold text-foreground">Page not found</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        That page doesn&apos;t exist. Try the player builder, the shop planner, or
        the roster evaluator.
      </p>
      <Link
        href="/"
        className="px-3 py-1.5 rounded-md border border-border text-sm text-foreground hover:bg-secondary/40 transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}
