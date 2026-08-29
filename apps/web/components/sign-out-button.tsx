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
      className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
    >
      Sign out
    </button>
  );
}
