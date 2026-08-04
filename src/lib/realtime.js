/* Realtime fold-in (Phase B-5): one channel per property on the 7 typed layer
   tables. A remote change marks the table dirty and debounces a per-table
   re-pull — rows are small, and wholesale re-pull dodges incremental-fold
   bugs while covering DELETE uniformly. Guards:
     (1) own-origin events are skipped (REPLICA IDENTITY FULL puts `origin`
         on old rows, so deletes are covered too);
     (2) a table the caller reports busy (locally-pending or failed-push ops)
         defers its re-pull until the queue settles, so an echo can never
         clobber unpushed local edits.
   Channel drop → resubscribe + re-pull all tables (missed-window repair). */
import { sb, propertyContext, fetchLayerRows } from "./remote.js";
import { LAYER_DEFS } from "./layers.js";
import { hydrateLayer } from "../store.js";

const TABLES = [...new Set(LAYER_DEFS.map(d => d.table))];

export async function startRealtime({ syncQueue, origin, busy }) {
  if (!sb) return;
  const isBusy = busy || (table => syncQueue.pendingFor(table));
  const ctx = await propertyContext();
  const timers = {};

  const repull = async table => {
    if (isBusy(table)) { // local edits in flight — retry shortly
      clearTimeout(timers[table]);
      timers[table] = setTimeout(() => repull(table), 1000);
      return;
    }
    try {
      const rows = await fetchLayerRows(table);
      for (const d of LAYER_DEFS.filter(x => x.table === table)) {
        const mine = rows.filter(r => d.ownsRow(r));
        syncQueue.prime(d, mine);
        hydrateLayer(d.key, d.fromRows(mine));
      }
    } catch (e) { console.warn("realtime re-pull:", table, e.message); }
  };
  const schedule = table => {
    clearTimeout(timers[table]);
    timers[table] = setTimeout(() => repull(table), 250);
  };

  const subscribe = () => {
    const ch = sb.channel("layers:" + ctx.property_id);
    for (const table of TABLES) {
      ch.on("postgres_changes",
        { event: "*", schema: "public", table, filter: "property_id=eq." + ctx.property_id },
        payload => {
          const o = payload.new?.origin ?? payload.old?.origin;
          if (o && o === origin) return; // own echo
          schedule(table);
        });
    }
    ch.subscribe(status => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        setTimeout(() => { sb.removeChannel(ch); subscribe(); TABLES.forEach(schedule); }, 3000);
      }
    });
  };
  subscribe();
}
