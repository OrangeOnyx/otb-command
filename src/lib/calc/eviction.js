/* Louisiana eviction sequencer — ported from belle-realty-pwa @ 19f7c06
   (eviction.service.ts). Emits the ordered CCP 4701→4733 procedural steps,
   timing, and the traps that void a Louisiana eviction (waiver-of-notice,
   acceptance of rent after notice, bankruptcy stay, no self-help). Never
   legal advice — defers substantive judgment to counsel. Pure. */

export function sequenceEviction(input) {
  const {
    ground, waiverOfNotice = false, acceptedRentAfterNotice = false,
    daysDelinquent, monthlyRent, commercial = true,
  } = input;

  if (!["monetary", "non_monetary", "holdover", "bankruptcy"].includes(ground))
    throw new Error("ground must be monetary | non_monetary | holdover | bankruptcy");

  const steps = [];
  const warnings = [];

  // Bankruptcy short-circuits everything: the automatic stay applies.
  if (ground === "bankruptcy") {
    warnings.push({
      code: "BANKRUPTCY_STAY", severity: "blocker",
      message: "Tenant bankruptcy triggers the automatic stay (11 U.S.C. § 362). Do NOT proceed with eviction. File a motion for relief from stay through bankruptcy counsel before any state-court action. Continuing the eviction without relief risks sanctions.",
    });
    return {
      ground, commercial, steps, warnings, estimatedDaysToJudgment: 0, holdoverMonthlyRent: null,
      summary: "Eviction is stayed by the tenant's bankruptcy filing. Seek relief from the automatic stay through counsel before taking any further step.",
    };
  }

  let order = 1;
  const noticeDays = 5; // CCP 4701 default: 5 calendar days

  if (waiverOfNotice) {
    warnings.push({
      code: "WAIVER_OF_NOTICE", severity: "info",
      message: "Lease waives Notice to Vacate (permitted for commercial leases under CCP 4701). You may skip the notice period and file the Rule for Possession immediately — confirm the waiver language with counsel before relying on it.",
    });
  } else {
    steps.push({
      order: order++, article: "CCP 4701", title: "Serve Notice to Vacate",
      detail: ground === "monetary"
        ? "Serve written Notice to Vacate for non-payment. Deliver personally, post on the premises, or mail per the statute. This starts the clock — do NOT accept rent after this."
        : "Serve written Notice to Vacate stating the ground. Deliver personally, post, or mail.",
      timing: noticeDays + " calendar days to vacate",
    });
  }

  if (ground === "monetary" && typeof daysDelinquent === "number" && daysDelinquent > 0) {
    warnings.push({
      code: "DELINQUENCY_OF_RECORD", severity: "info",
      message: `Tenant is ${daysDelinquent} day(s) delinquent. Document the ledger and the demand before filing so the Rule for Possession rests on a clean payment record.`,
    });
  }

  if (acceptedRentAfterNotice) {
    warnings.push({
      code: "ACCEPTANCE_OF_RENT", severity: "blocker",
      message: "You accepted rent AFTER serving the Notice to Vacate. In Louisiana this generally reinstates the lease and voids the notice. Do NOT proceed. Re-serve a fresh Notice to Vacate and accept no further payments before consulting counsel.",
    });
  }

  steps.push({
    order: order++, article: "CCP 4731", title: "File Rule for Possession",
    detail: "If the tenant has not vacated after the notice period (or immediately, if notice is waived), file a Rule to Show Cause Why Possession Should Not Be Granted in the parish court / justice of the peace with jurisdiction. The court sets a hearing.",
    timing: "Hearing set 3+ days after service of the Rule",
  });
  steps.push({
    order: order++, article: "CCP 4732", title: "Trial of the Rule",
    detail: "At the hearing the court hears the Rule. If the landlord prevails, the court renders a judgment of eviction ordering the tenant to deliver possession, typically within 24 hours.",
    timing: "Judgment within ~24 hours of trial",
  });
  steps.push({
    order: order++, article: "CCP 4733", title: "Warrant for Possession",
    detail: "If the tenant still does not vacate, request a warrant directing the Sheriff (or constable) to remove the tenant and deliver possession to the landlord. The SHERIFF executes the warrant — never change locks or remove the tenant yourself.",
    timing: "Issued after the 24-hour delivery window lapses",
  });

  warnings.push({
    code: "NO_SELF_HELP", severity: "caution",
    message: "Louisiana prohibits self-help eviction. Do not change locks, shut off utilities, or remove the tenant's property. Only the Sheriff, acting on the CCP 4733 warrant, may remove a tenant.",
  });

  let holdoverMonthlyRent = null;
  if (ground === "holdover" && typeof monthlyRent === "number") {
    holdoverMonthlyRent = Math.round(monthlyRent * 2 * 100) / 100; // 200% per OTB lease template §20.01
  }

  const noticeContribution = waiverOfNotice ? 0 : noticeDays;
  const estimatedDaysToJudgment = noticeContribution + 3 + 1 + 1;

  const blocked = warnings.some(w => w.severity === "blocker");
  const summary = blocked
    ? "Eviction cannot proceed as-is — resolve the flagged blocker before filing."
    : waiverOfNotice
      ? "File Rule for Eviction tomorrow under 4731. Trial in seven days, judgment within 24 hours."
      : `Serve Notice to Vacate under 4701 (${noticeDays} days), then file the Rule under 4731. Trial within days; judgment within 24 hours; Sheriff executes the 4733 warrant.`;

  return { ground, commercial, steps, warnings, estimatedDaysToJudgment, holdoverMonthlyRent, summary };
}
