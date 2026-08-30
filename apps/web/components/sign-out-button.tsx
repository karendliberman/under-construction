"use client";

import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
      className="font-mono text-[10.5px] tracking-[0.14em] text-[rgba(246,243,238,.6)] uppercase transition-colors hover:text-[var(--apricot)]"
    >
      Sign out
    </button>
  );
}
