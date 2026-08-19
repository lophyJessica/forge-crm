import { db, type Contract } from '../db';
import { calculateOpportunityScore, shanghaiNow, shanghaiToday } from './businessRules';

async function generateContractId() {
  const prefix = `CT${shanghaiToday().replace(/-/g, '')}-`;
  const ids = await db.contracts.filter(item => item.id.startsWith(prefix)).primaryKeys();
  const nextIndex = ids.reduce((max, key) => {
    const suffix = Number(String(key).slice(prefix.length));
    return Number.isFinite(suffix) ? Math.max(max, suffix) : max;
  }, 0) + 1;
  return `${prefix}${String(nextIndex).padStart(4, '0')}`;
}

export async function createContractFromOpportunity(oppId: string, actorName: string) {
  const current = await db.opportunities.get(oppId);
  if (!current) throw new Error('商机不存在或已被移除');
  if (current.status !== 'NEGOTIATION') throw new Error('只有商务谈判阶段可以创建合同');
  if (!current.amount || current.amount <= 0) throw new Error('请先维护有效的预计金额');
  if (!current.customerId) throw new Error('请先关联有效客户');

  const existing = await db.contracts.where('oppId').equals(oppId).filter(item => item.status !== 'VOIDED').first();
  if (existing) {
    throw new Error(`该商机已关联合同 ${existing.id}，不可重复创建`);
  }

  const [contractId, customer, followUpCount] = await Promise.all([
    generateContractId(),
    db.customers.get(current.customerId),
    db.opportunity_follow_ups.where('oppId').equals(oppId).count(),
  ]);
  const nowStr = shanghaiNow();
  if (!customer || customer.lifecycleStatus === 'DISABLED' || customer.syncStatus !== 'AVAILABLE') {
    throw new Error('关联客户不是可用 CRM 快照，不能创建新合同');
  }
  const contract: Contract = {
    id: contractId,
    title: `${current.title}合同`,
    customerId: current.customerId,
    customerName: current.customerName,
    oppId: current.id,
    oppTitle: current.title,
    amount: current.amount,
    currency: 'CNY',
    taxIncluded: true,
    taxRate: 6,
    status: 'DRAFT',
    opportunitySyncStatus: 'NOT_TRIGGERED',
    erpOrderSyncStatus: 'NOT_TRIGGERED',
    performanceSyncStatus: 'NOT_TRIGGERED',
    version: 1,
    createdAt: nowStr,
    createdBy: actorName,
    updatedAt: nowStr,
  };

  await db.transaction('rw', db.contracts, db.opportunities, db.opportunity_follow_ups, async () => {
    const latest = await db.opportunities.get(oppId);
    if (!latest || latest.status !== 'NEGOTIATION' || latest.version !== current.version) {
      throw new Error('商机已被其他操作更新，请刷新后重试');
    }
    await db.contracts.add(contract);
    await db.opportunities.update(oppId, {
      status: 'CONTRACT',
      contractNo: contractId,
      score: calculateOpportunityScore({
        customerLevel: customer?.level,
        customerRisk: customer?.riskLevel,
        followUpCount,
        items: current.items,
        status: 'CONTRACT',
      }),
      updatedAt: nowStr,
      version: (current.version || 0) + 1,
    });
    await db.opportunity_follow_ups.add({
      oppId,
      time: nowStr,
      operator: actorName,
      type: '系统记录',
      content: `已创建并绑定合同 ${contractId}，商机进入“合同签订”阶段；合同仍为草稿，尚未形成签署或 ERP 订单事实。`,
    });
  });

  return contract;
}
