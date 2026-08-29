import { RequestAccessForm } from "./_components/request-access-form";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-4xl font-semibold tracking-tight">Under Construction</h1>

      <p className="mt-6 text-lg text-neutral-700">
        Drafting software for litigators. Pick a cause of action and a
        jurisdiction, enter the facts of your matter, and get a first draft of a
        motion to dismiss — written against a playbook for that specific
        combination, not a general-purpose chatbot.
      </p>

      <p className="mt-4 text-neutral-600">
        Every draft is a starting point that you check, not a filing. Citations
        are not verified.
      </p>

      <hr className="my-10 border-neutral-200" />

      <h2 className="text-xl font-semibold">Request access</h2>
      <p className="mt-2 mb-6 text-sm text-neutral-600">
        Accounts are approved by hand while we are small.
      </p>

      <RequestAccessForm />
    </main>
  );
}
