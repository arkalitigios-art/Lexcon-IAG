import type { ProcessDetail } from '@/modules/processes/process-queries';

export type MarketStudyRevisionDirectives = {
  sourcesAsTable: boolean;
};

/**
 * Converts review instructions with an unambiguous presentation request into
 * deterministic document directives. The instruction remains in the audit
 * trail; no factual source data is inferred or changed.
 */
export function marketStudyRevisionDirectives(process: ProcessDetail): MarketStudyRevisionDirectives {
  const instructions = process.actions
    .filter((action) => action.action === 'MARKET_STUDY_CORRECTIONS_REQUESTED')
    .map((action) => action.note ?? '')
    .join(' ');
  return {
    sourcesAsTable: /\btabla\b/i.test(instructions) && /\bcotizaci(?:o|ó)n(?:es)?\b/i.test(instructions),
  };
}
