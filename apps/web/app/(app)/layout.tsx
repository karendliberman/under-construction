import { SignedInShell } from "@/components/signed-in-shell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SignedInShell>{children}</SignedInShell>;
}
