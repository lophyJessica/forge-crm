import { db } from '../db';
import { InventoryStock } from '../types/inventory';
import {
  InventoryCheckItem,
  InventoryCheckOrder,
  InventoryCheckStatus,
  InventoryCheckType,
  TransferItem,
  TransferOrder,
  TransferStatus,
} from '../types/inventoryOperations';

const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

async function generateOrderNumber(prefix: 'CK' | 'TR', tableName: 'inventory_checks' | 'transfer_orders') {
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

export const inventoryOperationsApi = {
  async getCheckSeedItems(warehouseCode: string): Promise<InventoryCheckItem[]> {
    const stocks = await db.inventory_stocks.where('warehouseCode').equals(warehouseCode).toArray();
    return stocks
      .sort((a, b) => a.productCode.localeCompare(b.productCode))
      .map((stock, index) => ({
        id: String(index + 1),
        productCode: stock.productCode,
        productName: stock.productName,
        productSpec: stock.productSpec,
        unit: stock.unit,
        systemQty: stock.qtyTotal,
        countedQty: 0,
      }));
  },

  async getInventoryChecks(filters: {
    id?: string;
    warehouseCode?: string;
    status?: InventoryCheckStatus | 'ALL';
    createdAtStart?: string;
    createdAtEnd?: string;
  }): Promise<InventoryCheckOrder[]> {
    let list = await db.inventory_checks.toArray();

    if (filters.id) {
      list = list.filter(item => item.id.includes(filters.id!));
    }
    if (filters.warehouseCode) {
      list = list.filter(item => item.warehouseCode === filters.warehouseCode);
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

  async getInventoryCheckById(id: string): Promise<InventoryCheckOrder | undefined> {
    return await db.inventory_checks.get(id);
  },

  async createInventoryCheckDraft(data: {
    warehouseCode: string;
    checkType: InventoryCheckType;
    checker: string;
    remark?: string;
    items: InventoryCheckItem[];
  }, operator: string): Promise<string> {
    if (!data.warehouseCode) throw new Error('请选择盘点仓库');
    if (data.items.length === 0) throw new Error('盘点仓库下暂无可盘点库存');

    const checkId = await generateOrderNumber('CK', 'inventory_checks');
    const warehouseName = await getWarehouseName(data.warehouseCode);
    const nowStr = now();

    await db.inventory_checks.add({
      id: checkId,
      warehouseCode: data.warehouseCode,
      warehouseName,
      status: 'DRAFT',
      checkType: data.checkType,
      itemCount: data.items.length,
      checker: data.checker,
      remark: data.remark || '',
      createdAt: nowStr,
      createdBy: operator,
      items: data.items.map((item, index) => ({
        ...item,
        id: item.id || String(index + 1),
        countedQty: Number(item.countedQty || 0),
      })),
    });

    return checkId;
  },

  async saveInventoryCheckDraft(id: string, data: {
    warehouseCode: string;
    checkType: InventoryCheckType;
    checker: string;
    remark?: string;
    items: InventoryCheckItem[];
  }, operator: string) {
    const order = await db.inventory_checks.get(id);
    if (!order) throw new Error('盘点单不存在');
    if (order.status !== 'DRAFT' && order.status !== 'COUNTING') throw new Error('只有草稿或盘点中单据可保存');

    const warehouseName = await getWarehouseName(data.warehouseCode);
    const nowStr = now();

    await db.inventory_checks.update(id, {
      warehouseCode: data.warehouseCode,
      warehouseName,
      checkType: data.checkType,
      checker: data.checker,
      remark: data.remark || '',
      itemCount: data.items.length,
      items: data.items.map(item => ({ ...item, countedQty: Number(item.countedQty || 0) })),
      updatedAt: nowStr,
      updatedBy: operator,
    });
  },

  async startInventoryCheck(id: string, operator: string) {
    const order = await db.inventory_checks.get(id);
    if (!order) throw new Error('盘点单不存在');
    if (order.status !== 'DRAFT') throw new Error('只有草稿态盘点单可以开始盘点');

    await db.inventory_checks.update(id, {
      status: 'COUNTING',
      updatedAt: now(),
      updatedBy: operator,
    });
  },

  async voidInventoryCheck(id: string, operator: string) {
    const order = await db.inventory_checks.get(id);
    if (!order) throw new Error('盘点单不存在');
    if (order.status !== 'DRAFT') throw new Error('只有草稿态盘点单可以作废');

    await db.inventory_checks.update(id, {
      status: 'VOIDED',
      updatedAt: now(),
      updatedBy: operator,
    });
  },

  async submitInventoryDifference(id: string, items: InventoryCheckItem[], remark: string, operator: string) {
    const order = await db.inventory_checks.get(id);
    if (!order) throw new Error('盘点单不存在');
    if (order.status !== 'DRAFT' && order.status !== 'COUNTING') throw new Error('只有草稿或盘点中单据可提交差异报告');

    for (const item of items) {
      if (Number(item.countedQty) < 0) {
        throw new Error(`商品 [${item.productCode}] 实盘数量不能小于 0`);
      }
    }

    const nowStr = now();
    await db.transaction('rw', [db.inventory_checks, db.inventory_stocks, db.inventory_flows], async () => {
      for (const item of items) {
        const countedQty = Number(item.countedQty || 0);
        const diff = countedQty - item.systemQty;
        if (diff === 0) continue;

        const stock = await getStockByWarehouseProduct(order.warehouseCode, item.productCode);
        if (!stock) continue;

        const nextAvailable = stock.qtyAvailable + diff;
        const nextTotal = nextAvailable + (stock.qtyAllocated || 0) + (stock.qtyFrozen || 0);

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
          flowType: diff > 0 ? '盘盈' : '盘亏',
          qtyChange: diff,
          qtyAfter: nextTotal,
          sourceOrderId: order.id,
          operator,
        });
      }

      await db.inventory_checks.update(id, {
        status: 'COMPLETED',
        remark,
        items: items.map(item => ({ ...item, countedQty: Number(item.countedQty || 0) })),
        updatedAt: nowStr,
        updatedBy: operator,
      });
    });
  },

  async getTransferSeedItems(outWarehouseCode: string): Promise<TransferItem[]> {
    const stocks = await db.inventory_stocks.where('warehouseCode').equals(outWarehouseCode).toArray();
    return stocks
      .filter(stock => stock.qtyTotal > 0)
      .sort((a, b) => a.productCode.localeCompare(b.productCode))
      .map((stock, index) => ({
        id: String(index + 1),
        productCode: stock.productCode,
        productName: stock.productName,
        productSpec: stock.productSpec,
        unit: stock.unit,
        availableQty: stock.qtyTotal,
        transferQty: 1,
        inboundQty: 0,
      }));
  },

  async getTransfers(filters: {
    id?: string;
    outWarehouseCode?: string;
    inWarehouseCode?: string;
    status?: TransferStatus | 'ALL';
    createdAtStart?: string;
    createdAtEnd?: string;
  }): Promise<TransferOrder[]> {
    let list = await db.transfer_orders.toArray();

    if (filters.id) {
      list = list.filter(item => item.id.includes(filters.id!));
    }
    if (filters.outWarehouseCode) {
      list = list.filter(item => item.outWarehouseCode === filters.outWarehouseCode);
    }
    if (filters.inWarehouseCode) {
      list = list.filter(item => item.inWarehouseCode === filters.inWarehouseCode);
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

  async getTransferById(id: string): Promise<TransferOrder | undefined> {
    return await db.transfer_orders.get(id);
  },

  async createTransferDraft(data: {
    outWarehouseCode: string;
    inWarehouseCode: string;
    remark?: string;
    items: TransferItem[];
  }, operator: string): Promise<string> {
    await this.assertTransferDraft(data);

    const transferId = await generateOrderNumber('TR', 'transfer_orders');
    const nowStr = now();
    const outWarehouseName = await getWarehouseName(data.outWarehouseCode);
    const inWarehouseName = await getWarehouseName(data.inWarehouseCode);

    await db.transfer_orders.add({
      id: transferId,
      outWarehouseCode: data.outWarehouseCode,
      outWarehouseName,
      inWarehouseCode: data.inWarehouseCode,
      inWarehouseName,
      status: 'DRAFT',
      itemCount: data.items.length,
      remark: data.remark || '',
      createdAt: nowStr,
      createdBy: operator,
      items: data.items.map((item, index) => ({
        ...item,
        id: item.id || String(index + 1),
        transferQty: Number(item.transferQty || 0),
        inboundQty: item.inboundQty || 0,
      })),
    });

    return transferId;
  },

  async saveTransferDraft(id: string, data: {
    outWarehouseCode: string;
    inWarehouseCode: string;
    remark?: string;
    items: TransferItem[];
  }, operator: string) {
    const order = await db.transfer_orders.get(id);
    if (!order) throw new Error('调拨单不存在');
    if (order.status !== 'DRAFT') throw new Error('只有草稿态调拨单可以编辑');

    await this.assertTransferDraft(data);

    await db.transfer_orders.update(id, {
      outWarehouseCode: data.outWarehouseCode,
      outWarehouseName: await getWarehouseName(data.outWarehouseCode),
      inWarehouseCode: data.inWarehouseCode,
      inWarehouseName: await getWarehouseName(data.inWarehouseCode),
      remark: data.remark || '',
      itemCount: data.items.length,
      items: data.items.map(item => ({ ...item, transferQty: Number(item.transferQty || 0) })),
      updatedAt: now(),
      updatedBy: operator,
    });
  },

  async saveTransferInboundQty(id: string, items: TransferItem[], operator: string) {
    const order = await db.transfer_orders.get(id);
    if (!order) throw new Error('调拨单不存在');
    if (order.status !== 'OUTBOUND') throw new Error('只有出库在途调拨单可以修改实收数量');

    for (const item of items) {
      const inQty = Number(item.inboundQty);
      if (isNaN(inQty) || inQty < 0) throw new Error(`商品 [${item.productCode}] 的实收数量必须大于等于 0`);
      if (inQty > item.transferQty) throw new Error(`商品 [${item.productCode}] 的实收数量不能大于调拨出库数量 (${item.transferQty})`);
    }

    await db.transfer_orders.update(id, {
      items: items.map(item => ({ 
        ...item, 
        inboundQty: Number(item.inboundQty) 
      })),
      updatedAt: now(),
      updatedBy: operator,
    });
  },

  async assertTransferDraft(data: { outWarehouseCode: string; inWarehouseCode: string; items: TransferItem[] }) {
    if (!data.outWarehouseCode) throw new Error('请选择调出仓库');
    if (!data.inWarehouseCode) throw new Error('请选择调入仓库');
    if (data.outWarehouseCode === data.inWarehouseCode) throw new Error('调出仓库与调入仓库不能相同');
    if (data.items.length === 0) throw new Error('请至少添加一行调拨商品');

    const seen = new Set<string>();
    for (const item of data.items) {
      const qty = Number(item.transferQty || 0);
      if (!item.productCode) throw new Error('商品明细存在未选择商品的行');
      if (seen.has(item.productCode)) throw new Error(`商品 [${item.productCode}] 不可重复添加`);
      seen.add(item.productCode);
      if (qty <= 0) throw new Error(`商品 [${item.productCode}] 调拨数量必须大于 0`);

      const stock = await getStockByWarehouseProduct(data.outWarehouseCode, item.productCode);
      const currentTotal = stock?.qtyTotal || 0;
      if (qty > currentTotal) {
        throw new Error(`商品 [${item.productCode}] 调拨数量不能大于当前现存量 (${currentTotal})`);
      }
      item.availableQty = currentTotal;
    }
  },

  async confirmTransferOutbound(id: string, operator: string) {
    const order = await db.transfer_orders.get(id);
    if (!order) throw new Error('调拨单不存在');
    if (order.status !== 'DRAFT') throw new Error('只有草稿态调拨单可以确认出库');

    await this.assertTransferDraft({
      outWarehouseCode: order.outWarehouseCode,
      inWarehouseCode: order.inWarehouseCode,
      items: order.items,
    });

    const nowStr = now();
    await db.transaction('rw', [db.transfer_orders, db.inventory_stocks, db.inventory_flows], async () => {
      for (const item of order.items) {
        const stock = await getStockByWarehouseProduct(order.outWarehouseCode, item.productCode);
        if (!stock) throw new Error(`调出仓缺少商品 [${item.productCode}] 库存`);

        const transferQty = Number(item.transferQty || 0);
        const nextAvailable = stock.qtyAvailable - transferQty;
        const nextOnWay = (stock.qtyOnWay || 0) + transferQty;
        const nextTotal = nextAvailable + (stock.qtyAllocated || 0) + (stock.qtyFrozen || 0);

        await db.inventory_stocks.update(stock.id!, {
          qtyAvailable: nextAvailable,
          qtyOnWay: nextOnWay,
          qtyTotal: nextTotal,
          lastModified: nowStr,
        });

        await db.inventory_flows.add({
          id: await generateFLNumber(),
          timestamp: nowStr,
          warehouseCode: order.outWarehouseCode,
          warehouseName: order.outWarehouseName,
          productCode: item.productCode,
          productName: item.productName,
          productSpec: item.productSpec,
          unit: item.unit,
          flowType: '调拨出库',
          qtyChange: -transferQty,
          qtyAfter: nextTotal,
          sourceOrderId: order.id,
          operator,
        });
      }

      await db.transfer_orders.update(id, {
        status: 'OUTBOUND',
        updatedAt: nowStr,
        updatedBy: operator,
      });
    });
  },

  async confirmTransferInbound(id: string, operator: string) {
    const order = await db.transfer_orders.get(id);
    if (!order) throw new Error('调拨单不存在');
    if (order.status !== 'OUTBOUND') throw new Error('只有已出库调拨单可以确认入库');

    const nowStr = now();
    await db.transaction('rw', [db.transfer_orders, db.inventory_stocks, db.inventory_flows], async () => {
      for (const item of order.items) {
        const inboundQty = Number(item.inboundQty || item.transferQty || 0);
        const outStock = await getStockByWarehouseProduct(order.outWarehouseCode, item.productCode);
        if (outStock) {
          await db.inventory_stocks.update(outStock.id!, {
            qtyOnWay: Math.max(0, (outStock.qtyOnWay || 0) - inboundQty),
            lastModified: nowStr,
          });
        }

        let inStock: InventoryStock | undefined = await getStockByWarehouseProduct(order.inWarehouseCode, item.productCode);
        if (inStock) {
          const nextAvailable = inStock.qtyAvailable + inboundQty;
          const nextTotal = nextAvailable + (inStock.qtyAllocated || 0) + (inStock.qtyFrozen || 0);
          await db.inventory_stocks.update(inStock.id!, {
            qtyAvailable: nextAvailable,
            qtyTotal: nextTotal,
            lastModified: nowStr,
          });
          inStock = { ...inStock, qtyTotal: nextTotal };
        } else {
          await db.inventory_stocks.add({
            warehouseCode: order.inWarehouseCode,
            warehouseName: order.inWarehouseName,
            productCode: item.productCode,
            productName: item.productName,
            productSpec: item.productSpec,
            unit: item.unit,
            batchNo: new Date().toISOString().split('T')[0].replace(/-/g, ''),
            qtyAvailable: inboundQty,
            qtyAllocated: 0,
            qtyFrozen: 0,
            qtyOnWay: 0,
            qtyTotal: inboundQty,
            safetyStock: 20,
            lastModified: nowStr,
          });
          inStock = { qtyTotal: inboundQty } as InventoryStock;
        }

        await db.inventory_flows.add({
          id: await generateFLNumber(),
          timestamp: nowStr,
          warehouseCode: order.inWarehouseCode,
          warehouseName: order.inWarehouseName,
          productCode: item.productCode,
          productName: item.productName,
          productSpec: item.productSpec,
          unit: item.unit,
          flowType: '调拨入库',
          qtyChange: inboundQty,
          qtyAfter: inStock.qtyTotal,
          sourceOrderId: order.id,
          operator,
        });
      }

      await db.transfer_orders.update(id, {
        status: 'COMPLETED',
        items: order.items.map(item => ({ ...item, inboundQty: Number(item.inboundQty || item.transferQty || 0) })),
        updatedAt: nowStr,
        updatedBy: operator,
      });
    });
  },

  async voidTransfer(id: string, operator: string) {
    const order = await db.transfer_orders.get(id);
    if (!order) throw new Error('调拨单不存在');
    if (order.status !== 'DRAFT') throw new Error('只有草稿态调拨单可以作废');

    await db.transfer_orders.update(id, {
      status: 'VOIDED',
      updatedAt: now(),
      updatedBy: operator,
    });
  },
};
