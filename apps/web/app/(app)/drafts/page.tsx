import { currentUser } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";

export const dynamic = "force-dynamic";

export default async function DraftsPage() {
  const user = await currentUser();

  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Drafts</h1>
        <SignOutButton />
      </div>

      <p className="mt-6 text-neutral-600">
        Signed in as {user?.email}
        {user?.role === "admin" && " · admin"}
      </p>

      <div className="mt-10 rounded-lg border border-dashed border-neutral-300 p-10 text-center">
        <p className="text-neutral-500">No drafts yet.</p>
        <a
          href="/drafts/new"
          className="mt-4 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          New draft
        </a>
      </div>

      {user?.role === "admin" && (
        <p className="mt-8 text-sm">
          <a href="/admin/requests" className="underline underline-offset-4">
            Review access requests
          </a>
        </p>
      )}
    </main>
  );
}
