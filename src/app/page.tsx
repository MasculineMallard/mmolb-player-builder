import Link from "next/link";

export default function ComingSoon() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e17]">
      <div className="text-center px-8">
        <h1 className="text-5xl font-bold tracking-tight text-white mb-2">
          DrakeForge
        </h1>
        <p className="text-lg text-slate-400 mb-8">Coming soon.</p>
        <Link
          href="/pop"
          className="inline-block px-8 py-3 bg-[#00e5ff] text-[#0a0e17] rounded-lg font-semibold text-base hover:opacity-85 transition-opacity"
        >
          POP: Player Optimization Planner
        </Link>
      </div>
    </div>
  );
}
