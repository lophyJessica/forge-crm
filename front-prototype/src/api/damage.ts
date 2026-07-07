import { db } from '../db';
import { InventoryStock } from '../types/inventory';
import { DamageItem, DamageOrder, DamageReason, DamageStatus } from '../types/damage';

const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

async function generateOrderNumber(prefix: 'BL', tableName: 'damage_orders') {
  const today = new Date();
  const yyyymmdd = today.getFullYear() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0');

  const count = await db.table(tableName)
    .where('id')
    .startsWith(`${prefix}${yyyymmdd}`)
    .count();

  return `${prefix}${yyyymmdd}-${String(count + 1).padStart(4, '0')}`;
}

async function generateFLNumber(): Promise<string> {
  const today = new Date();
  const yyyymmdd = today.getFullYear() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0');

  const count = await db.inventory_flows
    .where('id')
    .startsWith(`FL${yyyymmdd}`)
    .count();

  return `FL${yyyymmdd}-${String(count + 1).padStart(8, '0')}`;
}

async function getWarehouseName(code: string) {
  const warehouse = await db.warehouses.get(code);
  if (!warehouse) throw new Error('未找到仓库档案');
  return warehouse.name;
}

async function getStockByWarehouseProduct(warehouseCode: string, productCode: string) {
  return await db.inventory_stocks
    .where('[warehouseCode+productCode]')
    .equals([warehouseCode, productCode])
    .first();
}

export const damageApi = {
  async getDamageSeedItems(warehouseCode: string): Promise<DamageItem[]> {
    const stocks = await db.inventory_stocks.where('warehouseCode').equals(warehouseCode).toArray();
    return stocks
      .filter(stock => stock.qtyTotal > 0)
      .sort((a, b) => a.productCode.localeCompare(b.productCode))
      .map((stock, index) => ({
        id: String(index + 1),
        productCode: stock.productCode,
        productName: stock.productName,
        productSpec: stock.productSpec,
        unit: stock.unit,
        currentQty: stock.qtyTotal,
        damageQty: 1,
      }));
  },

  async getDamages(filters: {
    id?: string;
    warehouseCode?: string;
    reason?: DamageReason | 'ALL';
    status?: DamageStatus | 'ALL';
    createdAtStart?: string;
    createdAtEnd?: string;
  }): Promise<DamageOrder[]> {
    let list = await db.damage_orders.toArray();

    if (filters.id) {
      list = list.filter(item => item.id.includes(filters.id!));
    }
    if (filters.warehouseCode) {
      list = list.filter(item => item.warehouseCode === filters.warehouseCode);
    }
    if (filters.reason && filters.reason !== 'ALL') {
      list = list.filter(item => item.reason === filters.reason);
    }
    if (filters.status && filters.status !== 'ALL') {
      list = list.filter(item => item.status === filters.status);
    }
    if (filters.createdAtStart) {
      list = list.filter(item => item.createdAt.split(' ')[0] >= filters.createdAtStart!);
    }
    if (filters.createdAtEnd) {
      list = list.filter(item => item.createdAt.split(' ')[0] <= filters.createdAtEnd!);
    }

    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getDamageById(id: string): Promise<DamageOrder | undefined> {
    return await db.damage_orders.get(id);
  },

  async assertDamageDraft(data: { warehouseCode: string; reason: DamageReason; items: DamageItem[] }) {
    if (!data.warehouseCode) throw new Error('请选择报损仓库');
    if (!data.reason) throw new Error('请选择报损原因');
    if (data.items.length === 0) throw new Error('请至少添加一行报损商品');

    const seen = new Set<string>();
    for (const item of data.items) {
      const qty = Number(item.damageQty || 0);
      if (!item.productCode) throw new Error('商品明细存在未选择商品的行');
      if (seen.has(item.productCode)) throw new Error(`商品 [${item.productCode}] 不可重复添加`);
      seen.add(item.productCode);
      if (qty <= 0) throw new Error(`商品 [${item.productCode}] 报损数量必须大于 0`);

      const stock = await getStockByWarehouseProduct(data.warehouseCode, item.productCode);
      const currentQty = stock?.qtyTotal || 0;
      if (qty > currentQty) {
        throw new Error(`商品 [${item.productCode}] 报损数量不能大于当前现存量 (${currentQty})`);
      }
      item.currentQty = currentQty;
    }
  },

  async createDamageDraft(data: {
    warehouseCode: string;
    reason: DamageReason;
    remark?: string;
    items: DamageItem[];
  }, operator: string): Promise<string> {
    await this.assertDamageDraft(data);

    const damageId = await generateOrderNumber('BL', 'damage_orders');
    const warehouseName = await getWarehouseName(data.warehouseCode);
    const nowStr = now();
    const items = data.items.map((item, index) => ({
      ...item,
      id: item.id || String(index + 1),
      damageQty: Number(item.damageQty || 0),
    }));

    await db.damage_orders.add({
      id: damageId,
      warehouseCode: data.warehouseCode,
      warehouseName,
      reason: data.reason,
      status: 'DRAFT',
      itemCount: items.length,
      totalQty: items.reduce((sum, item) => sum + item.damageQty, 0),
      remark: data.remark || '',
      createdAt: nowStr,
      createdBy: operator,
      items,
    });

    return damageId;
  },

  async confirmDamage(id: string, operator: string) {
    const order = await db.damage_orders.get(id);
    if (!order) throw new Error('报损单不存在');
    if (order.status !== 'DRAFT') throw new Error('只有草稿态报损单可以确认报损');

    await this.assertDamageDraft({
      warehouseCode: order.warehouseCode,
      reason: order.reason,
      items: order.items,
    });

    const nowStr = now();
    await db.transaction('rw', [db.damage_orders, db.inventory_stocks, db.inventory_flows], async () => {
      for (const item of order.items) {
        const stock: InventoryStock | undefined = await getStockByWarehouseProduct(order.warehouseCode, item.productCode);
        if (!stock) throw new Error(`报损仓缺少商品 [${item.productCode}] 库存`);

        const damageQty = Number(item.damageQty || 0);
        const nextAvailable = stock.qtyAvailable - damageQty;
        const nextTotal = stock.qtyTotal - damageQty;

        await db.inventory_stocks.update(stock.id!, {
          qtyAvailable: nextAvailable,
          qtyTotal: nextTotal,
          lastModified: nowStr,
        });

        await db.inventory_flows.add({
          id: await generateFLNumber(),
          timestamp: nowStr,
          warehouseCode: order.warehouseCode,
          warehouseName: order.warehouseName,
          productCode: item.productCode,
          productName: item.productName,
          productSpec: item.productSpec,
          unit: item.unit,
          flowType: '报损',
          qtyChange: -damageQty,
          qtyAfter: nextTotal,
          sourceOrderId: order.id,
          operator,
        });
      }

      await db.damage_orders.update(id, {
        status: 'CONFIRMED',
        totalQty: order.items.reduce((sum, item) => sum + Number(item.damageQty || 0), 0),
        updatedAt: nowStr,
        updatedBy: operator,
      });
    });
  },

  async createAndConfirmDamage(data: {
    warehouseCode: string;
    reason: DamageReason;
    remark?: string;
    items: DamageItem[];
  }, operator: string): Promise<string> {
    const id = await this.createDamageDraft(data, operator);
    await this.confirmDamage(id, operator);
    return id;
  },

  async voidDamage(id: string, operator: string) {
    const order = await db.damage_orders.get(id);
    if (!order) throw new Error('报损单不存在');
    if (order.status !== 'DRAFT') throw new Error('只有草稿态报损单可以作废');

    await db.damage_orders.update(id, {
      status: 'VOIDED',
      updatedAt: now(),
      updatedBy: operator,
    });
  },
};
