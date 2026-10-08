import { randomUUID } from 'node:crypto';
import { getSqlite } from '@/platform/database/client';
import type { CurrentUser } from '@/platform/auth/current-user';
import { assertCanManageQuotes } from './market-quote-management';

export type MarketStudyProfile = {
  objectDescription: string;
  unspscCodes: string;
  demandAnalysis: string;
  supplyAnalysis: string;
  taxBasis: string;
};

export function getMarketStudyProfile(processId: string): MarketStudyProfile {
  const row = getSqlite().prepare(`SELECT object_description AS objectDescription, unspsc_codes AS unspscCodes,
    demand_analysis AS demandAnalysis, supply_analysis AS supplyAnalysis, tax_basis AS taxBasis
    FROM market_study_profiles WHERE process_id = ?`).get(processId) as MarketStudyProfile | undefined;
  return row ?? { objectDescription: '', unspscCodes: '', demandAnalysis: '', supplyAnalysis: '', taxBasis: '' };
}

export function saveMarketStudyProfile(user: CurrentUser, processId: string, input: MarketStudyProfile): void {
  assertCanManageQuotes(user, processId);
  const clean = (value: string) => value.trim().slice(0, 8000);
  const now = new Date().toISOString();
  getSqlite().prepare(`INSERT INTO market_study_profiles (process_id, object_description, unspsc_codes, demand_analysis, supply_analysis, tax_basis, updated_by_user_id, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(process_id) DO UPDATE SET object_description = excluded.object_description, unspsc_codes = excluded.unspsc_codes,
      demand_analysis = excluded.demand_analysis, supply_analysis = excluded.supply_analysis, tax_basis = excluded.tax_basis,
      updated_by_user_id = excluded.updated_by_user_id, updated_at = excluded.updated_at`)
    .run(processId, clean(input.objectDescription), clean(input.unspscCodes), clean(input.demandAnalysis), clean(input.supplyAnalysis), clean(input.taxBasis), user.id, now);
  getSqlite().prepare('INSERT INTO audit_events (id, process_id, actor_user_id, action, target_type, target_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(randomUUID(), processId, user.id, 'MARKET_STUDY_PROFILE_UPDATED', 'process', processId, now);
}
