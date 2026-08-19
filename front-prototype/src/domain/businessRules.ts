import type { Lead, Opportunity, OpportunityItem } from '../db';

export const CURRENT_USER = { id: 'S001', name: '张三', role: 'SALES' as const };

const SOURCE_SCORE: Record<string, number> = {
  ONLINE: 15,
  REFERRAL: 12,
  ACTIVITY: 10,
  EXHIBITION: 8,
  IMPORT: 5,
  OTHER: 5
};

const TARGET_INDUSTRIES = new Set(['IT', 'MANUFACTURING']);
const RELATED_INDUSTRIES = new Set(['RETAIL', 'HEALTHCARE', 'FINANCE']);

const parseBusinessDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date;
};

export const shanghaiNow = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' });
export const shanghaiToday = () => shanghaiNow().slice(0, 10);
export const shanghaiMonth = () => shanghaiNow().slice(0, 7);

export const normalizePhone = (value: string) => value.replace(/\D/g, '');
export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const isValidPhone = (value: string) => /^1\d{10}$/.test(normalizePhone(value));
export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));

export function calculateLeadScore(
  lead: Pick<Lead, 'source' | 'industry' | 'createdAt' | 'followedAt'>,
  options: { responseHours?: number; historicalConversionRate?: number; lastActivityAt?: string } = {}
) {
  const sourceScore = SOURCE_SCORE[lead.source] ?? 5;
  const industryScore = TARGET_INDUSTRIES.has(lead.industry || '')
    ? 20
    : RELATED_INDUSTRIES.has(lead.industry || '')
      ? 12
      : 5;

  let responseHours = options.responseHours;
  if (responseHours === undefined) {
    const createdAt = parseBusinessDate(lead.createdAt);
    const followedAt = parseBusinessDate(lead.followedAt);
    responseHours = createdAt && followedAt ? (followedAt.getTime() - createdAt.getTime()) / 3_600_000 : 24;
  }
  const responseScore = responseHours < 1 ? 25 : responseHours < 4 ? 20 : responseHours < 24 ? 12 : 5;

  const historicalRate = Math.min(1, Math.max(0, options.historicalConversionRate ?? 0.5));
  const historyScore = Math.round(historicalRate * 25);

  const activityAt = parseBusinessDate(options.lastActivityAt || lead.followedAt || lead.createdAt);
  const ageDays = activityAt ? (Date.now() - activityAt.getTime()) / 86_400_000 : Number.POSITIVE_INFINITY;
  const activityScore = ageDays <= 7 ? 15 : ageDays <= 30 ? 8 : 3;

  return Math.min(100, sourceScore + industryScore + responseScore + historyScore + activityScore);
}

export function getLeadRouting(score: number) {
  if (score >= 80) {
    return { status: 'ASSIGNED' as const, owner: CURRENT_USER.name, poolType: undefined };
  }
  if (score >= 50) {
    return { status: 'PENDING_ASSIGN' as const, owner: undefined, poolType: 'ASSIGN_POOL' as const };
  }
  return { status: 'PENDING_ASSIGN' as const, owner: undefined, poolType: 'NURTURE_POOL' as const };
}

export function getPublicPoolEligibility(lead: Lead, actorName: string, now = new Date()) {
  if (lead.status === 'PENDING_ASSIGN') {
    const visible = (lead.poolType || 'ASSIGN_POOL') === 'ASSIGN_POOL';
    return { visible, claimable: visible, reason: visible ? '' : '培育池线索不可认领' };
  }

  if (lead.status !== 'ABANDONED' || (lead.voidType && lead.voidType !== 'VOLUNTARY_ABANDON')) {
    return { visible: false, claimable: false, reason: '该记录不属于可认领公海' };
  }

  const isOriginalOwner = lead.owner === actorName;
  const abandonedAt = parseBusinessDate(lead.abandonedAt || lead.followedAt);
  const protectedUntil = abandonedAt ? new Date(abandonedAt.getTime() + 7 * 24 * 60 * 60 * 1000) : null;
  const inProtection = Boolean(isOriginalOwner && protectedUntil && now < protectedUntil);

  return {
    visible: true,
    claimable: !inProtection,
    reason: inProtection ? `原负责人保护期至 ${protectedUntil?.toLocaleString('zh-CN', { hour12: false })}` : '',
    protectedUntil
  };
}

const STAGE_SCORE: Record<Opportunity['status'], number> = {
  INITIAL_CONTACT: 2,
  NEEDS_CONFIRM: 5,
  PROPOSAL: 8,
  NEGOTIATION: 12,
  CONTRACT: 15,
  WON: 15,
  LOST: 0
};

export function calculateOpportunityScore(input: {
  customerLevel?: string;
  customerRisk?: string;
  followUpCount: number;
  items?: OpportunityItem[];
  status: Opportunity['status'];
}) {
  const profileScore = input.customerLevel === 'VIP' ? 25 : input.customerLevel === 'A' ? 22 : input.customerLevel === 'B' ? 17 : 12;
  const riskScore = input.customerRisk === 'HIGH' ? 3 : input.customerRisk === 'MEDIUM' ? 9 : 15;
  const followUpScore = Math.min(25, input.followUpCount * 5);
  const itemScore = Math.min(20, (input.items?.length || 0) * 7 + (input.items?.some(item => item.quantity > 1) ? 3 : 0));
  return Math.min(100, profileScore + riskScore + followUpScore + itemScore + STAGE_SCORE[input.status]);
}

export const canCancelCheckedInVisit = (role: string) => role === 'SUPERVISOR' || role === 'ADMIN';
