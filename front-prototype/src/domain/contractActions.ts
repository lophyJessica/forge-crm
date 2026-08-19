import { db, type Contract } from '../db';
import { shanghaiNow, shanghaiToday } from './businessRules';

export type ContractActionResult = { ok: true; message: string } | { ok: false; message: string };

const nextVersion = (contract: Contract) => (contract.version || 0) + 1;

export async function submitContractForSigning(contractId: string): Promise<ContractActionResult> {
  return db.transaction('rw', db.contracts, async () => {
    const contract = await db.contracts.get(contractId);
    if (!contract) return { ok: false, message: '合同不存在或已被移除' };
    if (contract.status === 'PENDING_SIGN' && contract.signingRequestId) {
      return { ok: true, message: '合同已提交签署，请勿重复操作' };
    }
    if (contract.status !== 'DRAFT') return { ok: false, message: '仅草稿合同可提交签署' };
    if (!contract.title.trim() || !contract.oppId || !contract.customerId || contract.amount <= 0) {
      return { ok: false, message: '合同信息不完整，无法提交签署' };
    }

    const version = nextVersion(contract);
    await db.contracts.update(contractId, {
      status: 'PENDING_SIGN',
      signingRequestId: `SIGN-REQ-${contract.id}-V${version}`,
      opportunitySyncStatus: 'NOT_TRIGGERED',
      erpOrderSyncStatus: 'NOT_TRIGGERED',
      performanceSyncStatus: 'NOT_TRIGGERED',
      version,
      updatedAt: shanghaiNow()
    });
    return { ok: true, message: '合同已提交签署，等待外部签署结果' };
  });
}

export async function receiveMockSignedEvent(contractId: string): Promise<ContractActionResult> {
  const contract = await db.contracts.get(contractId);
  if (!contract) return { ok: false, message: '合同不存在' };
  if (contract.status === 'SIGNED' && contract.signEventId) {
    return { ok: true, message: '该签署事件已处理，未重复推进商机' };
  }
  if (contract.status !== 'PENDING_SIGN' || !contract.signingRequestId) {
    return { ok: false, message: '合同未处于合法待签署状态' };
  }

  const now = shanghaiNow();
  const version = nextVersion(contract);
  const eventId = `SIGN-EVT-${contract.id}-V${version}`;

  await db.contracts.update(contractId, {
    status: 'SIGNED',
    signedDate: shanghaiToday(),
    signedAt: now,
    signReceivedAt: now,
    signEventId: eventId,
    signSource: 'MOCK_SIGN_SERVICE',
    opportunitySyncStatus: 'PROCESSING',
    erpOrderSyncStatus: 'NOT_TRIGGERED',
    performanceSyncStatus: 'NOT_TRIGGERED',
    version,
    updatedAt: now
  });

  try {
    await db.transaction('rw', db.opportunities, db.opportunity_follow_ups, async () => {
      const opportunity = await db.opportunities.get(contract.oppId);
      if (!opportunity || opportunity.contractNo !== contract.id || opportunity.status !== 'CONTRACT') {
        throw new Error('关联商机状态或合同绑定已变化');
      }
      await db.opportunities.update(contract.oppId, {
        status: 'WON',
        score: 100,
        wonAt: now,
        amount: contract.amount,
        version: (opportunity.version || 0) + 1,
        updatedAt: now
      });
      await db.opportunity_follow_ups.add({
        oppId: contract.oppId,
        time: now,
        operator: '签署事件服务',
        type: '系统',
        content: `【签署事件 ${eventId}】合同 ${contract.id} 验签通过，商机自动进入赢单。ERP 串联尚未接入，本次未生成 ERP 订单。`
      });
    });
    await db.contracts.update(contractId, {
      opportunitySyncStatus: 'SUCCESS',
      erpOrderSyncStatus: 'NOT_TRIGGERED',
      performanceSyncStatus: 'NOT_TRIGGERED',
      syncError: 'ERP 串联尚未接入，未生成订单或业绩同步结果',
      updatedAt: shanghaiNow()
    });
    return { ok: true, message: '签署事件已验收，商机已赢单；ERP 串联未接入，未生成订单' };
  } catch (error) {
    const message = error instanceof Error ? error.message : '商机联动失败';
    await db.contracts.update(contractId, {
      opportunitySyncStatus: 'FAILED',
      syncError: message,
      updatedAt: shanghaiNow()
    });
    return { ok: false, message: `签署事实已保留，${message}` };
  }
}

export async function voidContract(contractId: string, reason: string): Promise<ContractActionResult> {
  const normalizedReason = reason.trim();
  if (normalizedReason.length < 10) return { ok: false, message: '作废原因至少填写 10 个字' };
  const contract = await db.contracts.get(contractId);
  if (!contract) return { ok: false, message: '合同不存在' };
  if (!['DRAFT', 'PENDING_SIGN'].includes(contract.status)) return { ok: false, message: '已签署或已归档合同不可作废' };

  const now = shanghaiNow();
  await db.contracts.update(contractId, {
    status: 'VOIDED',
    voidReason: normalizedReason,
    opportunitySyncStatus: 'PROCESSING',
    version: nextVersion(contract),
    updatedAt: now
  });

  try {
    await db.transaction('rw', db.opportunities, db.opportunity_follow_ups, async () => {
      const opportunity = await db.opportunities.get(contract.oppId);
      if (opportunity?.contractNo === contract.id && opportunity.status === 'CONTRACT') {
        await db.opportunities.update(contract.oppId, {
          status: 'NEGOTIATION',
          contractNo: undefined,
          version: (opportunity.version || 0) + 1,
          updatedAt: now
        });
        await db.opportunity_follow_ups.add({
          oppId: contract.oppId,
          time: now,
          operator: '系统',
          type: '系统',
          content: `【合同作废】合同 ${contract.id} 已作废并解除绑定，商机回退商务谈判。原因：${normalizedReason}`
        });
      }
    });
    await db.contracts.update(contractId, { opportunitySyncStatus: 'SUCCESS', updatedAt: shanghaiNow() });
    return { ok: true, message: '合同已作废，关联商机已回退商务谈判' };
  } catch (error) {
    const message = error instanceof Error ? error.message : '商机回退失败';
    await db.contracts.update(contractId, { opportunitySyncStatus: 'FAILED', syncError: message, updatedAt: shanghaiNow() });
    return { ok: false, message: `合同已作废，商机回退待补偿：${message}` };
  }
}

export async function archiveContract(contractId: string, actor: string, reason: string): Promise<ContractActionResult> {
  const contract = await db.contracts.get(contractId);
  if (!contract) return { ok: false, message: '合同不存在' };
  if (contract.status !== 'SIGNED') return { ok: false, message: '仅已签署合同可归档' };
  if (contract.opportunitySyncStatus !== 'SUCCESS' || contract.erpOrderSyncStatus !== 'SUCCESS') {
    return { ok: false, message: '商机或 ERP 订单联动尚未成功，当前不可归档' };
  }
  if (!reason.trim()) return { ok: false, message: '请填写归档原因' };
  await db.contracts.update(contractId, {
    status: 'ARCHIVED',
    archivedAt: shanghaiNow(),
    archivedBy: actor,
    archiveReason: reason.trim(),
    version: nextVersion(contract),
    updatedAt: shanghaiNow()
  });
  return { ok: true, message: '合同已归档' };
}
