import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { NavLinks } from "@/components/builder/NavLinks";

export default function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1">
      <header className="border-b border-border bg-card">
        <div className="px-4 sm:px-6 lg:px-8 flex items-center h-11 gap-6">
          <Link href="/pop" className="font-bold text-lg flex items-center gap-0.5">
            <Image src="/pop-can.png" alt="POP" width={20} height={28} />
            POP
          </Link>
          <NavLinks />
          <div className="ml-auto flex items-center gap-3">
            <div id="share-slot" className="flex items-center gap-2" />
            <span className="text-sm text-muted-foreground">Season 11</span>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-2">
        <Suspense>{children}</Suspense>
      </main>
    </div>
  );
}
