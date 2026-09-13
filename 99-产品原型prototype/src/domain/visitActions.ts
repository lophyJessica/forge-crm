import { db } from '../db';
import { canCancelCheckedInVisit, shanghaiNow } from './businessRules';

export type VisitActionResult = { ok: true; message: string } | { ok: false; message: string };

export async function checkInVisit(visitId: string): Promise<VisitActionResult> {
  return db.transaction('rw', db.visits, async () => {
    const visit = await db.visits.get(visitId);
    if (!visit) return { ok: false, message: '拜访计划不存在' };
    if (visit.status !== 'PLANNED') return { ok: false, message: '仅已计划拜访可签到' };

    const nowStr = shanghaiNow();
    const isOnsite = visit.visitMethod === '上门';
    const checkedInAddress = isOnsite
      ? `Mock 定位：${visit.address || '未维护计划地址'}`
      : `${visit.visitMethod}沟通签到（无需定位）`;

    await db.visits.update(visitId, {
      status: 'CHECKED_IN',
      executionResult: 'IN_PROGRESS',
      executionException: 'NONE',
      checkedInAt: nowStr,
      checkedInAddress,
      locationSource: isOnsite ? 'MOCK' : 'NONE',
      locationReliability: isOnsite ? 'MOCK' : 'UNAVAILABLE',
      authorizationResult: isOnsite ? 'MOCKED' : 'NOT_REQUESTED',
      version: (visit.version || 0) + 1,
      updatedAt: nowStr,
    });
    return {
      ok: true,
      message: isOnsite ? '签到成功；本次位置为明确标识的 Mock 数据' : `${visit.visitMethod}签到成功，未请求定位权限`,
    };
  });
}

export async function cancelVisit(visitId: string, actorRole: string, reason: string): Promise<VisitActionResult> {
  const normalizedReason = reason.trim();
  if (normalizedReason.length < 10) return { ok: false, message: '取消原因至少填写10个字' };

  return db.transaction('rw', db.visits, async () => {
    const visit = await db.visits.get(visitId);
    if (!visit) return { ok: false, message: '拜访计划不存在' };
    if (!['PLANNED', 'CHECKED_IN'].includes(visit.status)) return { ok: false, message: '当前状态不可取消' };
    if (visit.status === 'CHECKED_IN' && !canCancelCheckedInVisit(actorRole)) {
      return { ok: false, message: '已签到拜访仅主管或管理员可取消，签到事实将保留' };
    }

    await db.visits.update(visitId, {
      status: 'CANCELLED',
      cancelReason: normalizedReason,
      version: (visit.version || 0) + 1,
      updatedAt: shanghaiNow(),
    });
    return { ok: true, message: '拜访计划已取消，既有签到事实已保留' };
  });
}
