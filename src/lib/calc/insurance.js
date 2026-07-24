/* Insurance claim timeline sequencer — ported from belle-realty-pwa @ 19f7c06
   (insurance.service.ts, Playbook §12). The claim clock starts at the date of
   loss: mitigate now, notice the carrier promptly (default 30d), sworn proof
   of loss (default 60d), suit inside the contractual limitation period
   (default 24 months). Pure; all date math in UTC to avoid timezone drift;
   month addition clamps end-of-month overflow (Jan 31 + 1mo → Feb 28/29). */

const round0 = n => Math.round(n);

function parseIsoDateUTC(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`dateOfLoss must be an ISO date string 'YYYY-MM-DD', got: ${value}`);
  }
  const [year, month, day] = value.split("-").map(v => parseInt(v, 10));
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    throw new Error(`dateOfLoss is not a valid calendar date: ${value}`);
  }
  return d;
}

function formatIsoDateUTC(d) {
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
}

function addDaysUTC(d, days) {
  const result = new Date(d.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/* "X months from the date of loss" lands on the last valid day of the target
   month, never spilling into the next — how limitation periods are read. */
function addMonthsUTC(d, months) {
  const result = new Date(d.getTime());
  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDay));
  return result;
}

const daysBetweenUTC = (a, b) => round0((b.getTime() - a.getTime()) / 86400000);

/* input: { dateOfLoss, promptNoticeDays?, proofOfLossDays?, suitLimitationMonths?, mitigationImmediate? } */
export function sequenceClaim(input) {
  const {
    dateOfLoss,
    promptNoticeDays = 30,
    proofOfLossDays = 60,
    suitLimitationMonths = 24,
    mitigationImmediate = true,
  } = input || {};

  if (promptNoticeDays < 0) throw new Error("promptNoticeDays must not be negative");
  if (proofOfLossDays < 0) throw new Error("proofOfLossDays must not be negative");
  if (suitLimitationMonths < 0) throw new Error("suitLimitationMonths must not be negative");

  const lossDate = parseIsoDateUTC(dateOfLoss);
  const noticeDate = addDaysUTC(lossDate, promptNoticeDays);
  const proofDate = addDaysUTC(lossDate, proofOfLossDays);
  const suitDate = addMonthsUTC(lossDate, suitLimitationMonths);

  const steps = [
    {
      order: 1,
      title: "Mitigate & document",
      deadlineDate: formatIsoDateUTC(lossDate),
      daysFromLoss: 0,
      detail: "Protect the property from further loss now; document everything.",
    },
    {
      order: 2,
      title: "Prompt notice to carrier",
      deadlineDate: formatIsoDateUTC(noticeDate),
      daysFromLoss: daysBetweenUTC(lossDate, noticeDate),
      detail:
        `Give the carrier prompt written notice of the loss no later than ${promptNoticeDays} ` +
        "day(s) after the date of loss. Delay in notice is one of the most common grounds " +
        "carriers use to deny or delay a claim.",
    },
    {
      order: 3,
      title: "Proof of loss",
      deadlineDate: formatIsoDateUTC(proofDate),
      daysFromLoss: daysBetweenUTC(lossDate, proofDate),
      detail:
        "Submit the sworn proof of loss, with supporting documentation and estimates, within " +
        `${proofOfLossDays} day(s) of the date of loss.`,
    },
    {
      order: 4,
      title: "Suit limitation / contractual limitation period",
      deadlineDate: formatIsoDateUTC(suitDate),
      daysFromLoss: daysBetweenUTC(lossDate, suitDate),
      detail:
        `The hard outer deadline to file suit against the carrier is ${suitLimitationMonths} ` +
        "month(s) after the date of loss. Missing this deadline generally bars the claim " +
        "entirely, regardless of the merits.",
    },
  ];

  if (!mitigationImmediate) {
    steps[0].detail +=
      " Mitigation was NOT immediate — delayed mitigation can be used by the carrier to " +
      "reduce or deny recoverable damages.";
  }

  const upcoming = steps.slice(1).sort((a, b) => a.daysFromLoss - b.daysFromLoss);
  const nextTwo = upcoming.slice(0, 2);
  const summary =
    `The two most urgent upcoming deadlines are: ${nextTwo[0].title} (${nextTwo[0].deadlineDate}, ` +
    `${nextTwo[0].daysFromLoss} days from loss) and ${nextTwo[1].title} (${nextTwo[1].deadlineDate}, ` +
    `${nextTwo[1].daysFromLoss} days from loss).`;

  const methodology =
    "The claim clock starts at the date of loss. Notice now, proof of loss inside sixty days, " +
    "suit inside two years. " +
    `Date of loss: ${dateOfLoss}. Mitigate and document immediately (day 0). Notice to the ` +
    `carrier is due by ${formatIsoDateUTC(noticeDate)} (+${promptNoticeDays} days). Proof of ` +
    `loss is due by ${formatIsoDateUTC(proofDate)} (+${proofOfLossDays} days). The contractual ` +
    `suit limitation runs on ${formatIsoDateUTC(suitDate)} (+${suitLimitationMonths} months) — ` +
    "filing suit after that date is generally barred regardless of the merits of the claim. " +
    summary;

  return { dateOfLoss, steps, summary, methodology };
}
