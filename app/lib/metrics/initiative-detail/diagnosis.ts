/**
 * @file AI Diagnosis text generation. In production this would call an
 *       LLM (Claude / GPT) with a structured prompt summarising the
 *       initiative's scores + gaps and ask for a 1–2 sentence narrative.
 *
 *       The stub here is a templated rule-based fallback so the screen
 *       still has copy when the LLM is unavailable. Wire `generateDiagnosis`
 *       to the LLM call when ready; keep the rule-based version as the
 *       fallback path on errors / timeouts.
 */

import type { JiraIssue } from "../../jira/types";
import type { SdDocument } from "../../external/sd-registry";

/** Inputs available to the diagnosis generator. */
export type DiagnosisInputs = {
  initiative: JiraIssue;
  alignmentPct: number;
  sd: SdDocument | null;
  /** Total count of epics under this initiative. */
  epicCount: number;
};

/**
 * Generate the diagnosis paragraph. Always returns a string (never
 * throws). When the LLM call fails or returns empty, falls back to
 * the rule-based template.
 */
export async function generateDiagnosis(input: DiagnosisInputs): Promise<string> {
  // TODO: real implementation calls the LLM here. Sketch:
  //   const llm = new Anthropic({ ... });
  //   const res = await llm.messages.create({ model, system, messages: [...] });
  //   return res.content[0].text || templateDiagnosis(input);
  return templateDiagnosis(input);
}

/** Rule-based fallback. Picks the most prominent symptom and explains it. */
function templateDiagnosis(input: DiagnosisInputs): string {
  const { initiative, alignmentPct, sd, epicCount } = input;
  const priority = initiative.customFields.cioPriority ?? 0;

  if (priority >= 80 && (!sd || sd.status === "None")) {
    return (
      `Initiative is high-priority but lacks an approved solution design. ` +
      `Source systems for ${shortName(initiative)} remain unmapped, creating ` +
      `sequencing risk for downstream AI work.`
    );
  }
  if (alignmentPct < 30 && epicCount > 0) {
    return (
      `Strategy alignment is critical (${alignmentPct}%). The current epic mix ` +
      `does not invest in the capabilities this initiative's strategy expects.`
    );
  }
  if (epicCount === 0) {
    return `No epics are tagged to this initiative. Confirm scope before continuing planning.`;
  }
  if (sd?.status === "Stale") {
    return (
      `Solution design is stale; last review was ${sd.lastReview}. ` +
      `Re-review is recommended before the next planning cycle.`
    );
  }
  return (
    `Initiative is on track. Alignment at ${alignmentPct}% with ${epicCount} epics in scope.`
  );
}

function shortName(init: JiraIssue): string {
  return init.summary.split(" ").slice(0, 3).join(" ");
}
