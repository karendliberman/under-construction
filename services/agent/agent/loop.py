"""The job loop.

PHASE 0.6 — this claims `pipe_checks` rows rather than `generations`, to prove
the path end to end before any feature depends on it. The claim query below is
the one the real worker uses; only the table name changes when §4 lands.

Polling rather than LISTEN/NOTIFY: polling has no interaction with connection
pooling and no caveats, and for a job that takes minutes, three seconds of
latency is invisible.
"""

import socket
import time

from . import budget, db

POLL_SECONDS = 3
STALE_AFTER = "5 minutes"

# FOR UPDATE SKIP LOCKED is the standard Postgres job-queue idiom: two workers
# running this concurrently never claim the same row, so adding a second worker
# later is a scaling change, not a redesign.
CLAIM = """
  update pipe_checks
     set status = 'running', claimed_at = now()
   where id = (
     select id from pipe_checks
      where status = 'queued'
      order by created_at
      for update skip locked
      limit 1
   )
  returning *;
"""

COMPLETE = """
  update pipe_checks
     set status = 'complete', reply = %s, worker_host = %s, completed_at = now()
   where id = %s;
"""

# So a crashed worker doesn't strand jobs forever (backlog 3.10).
SWEEP = f"""
  update pipe_checks
     set status = 'failed', reply = 'stale: worker died mid-job'
   where status = 'running' and claimed_at < now() - interval '{STALE_AFTER}';
"""


def claim_one(conn):
    with conn.cursor() as cur:
        cur.execute(CLAIM)
        row = cur.fetchone()
    conn.commit()
    return row


def sweep_stale(conn):
    with conn.cursor() as cur:
        cur.execute(SWEEP)
        swept = cur.rowcount
    conn.commit()
    if swept:
        print(f"swept {swept} stale job(s)", flush=True)


def handle(conn, job):
    """Phase 0's 'work': write back proof that the worker saw the row."""
    reply = f"worker saw: {job['note']}"
    with conn.cursor() as cur:
        cur.execute(COMPLETE, (reply, socket.gethostname(), job["id"]))
    conn.commit()
    print(f"completed {job['id']}", flush=True)


# When the spend cap is hit, back off hard rather than re-asking every three
# seconds. Nothing will change until someone raises the cap or the window rolls.
CAPPED_BACKOFF_SECONDS = 60


def main():
    print("worker: starting", flush=True)

    # Read the caps once at boot so a misconfigured value crashes here, loudly,
    # rather than at the first job. Failing to start is the safe direction: a
    # worker that cannot parse its cap must not run uncapped.
    print(
        "worker: spend caps "
        f"${budget.per_generation_cap()} per generation, "
        f"${budget.window_cap()} per {budget.window_days()} days",
        flush=True,
    )

    conn = db.connect()
    print("worker: connected to database", flush=True)

    while True:
        try:
            # The gate goes BEFORE the claim, so a job stays queued rather than
            # being claimed and failed. Phase 0.6's `pipe_checks` costs nothing
            # to run, and guarding it anyway is deliberate: the control is
            # exercised in production before the day it has to work.
            try:
                budget.check_window(conn)
            except budget.SpendCapExceeded as capped:
                print(f"worker: not claiming - {capped}", flush=True)
                conn.rollback()
                time.sleep(CAPPED_BACKOFF_SECONDS)
                continue

            job = claim_one(conn)
            if job is None:
                sweep_stale(conn)
                time.sleep(POLL_SECONDS)
                continue
            print(f"claimed {job['id']}", flush=True)
            handle(conn, job)
        except Exception as exc:  # keep the loop alive; a dead worker is worse
            print(f"worker error: {exc!r}", flush=True)
            conn.rollback()
            time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
