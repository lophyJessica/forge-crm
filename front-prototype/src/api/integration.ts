import Dexie, { type Table } from 'dexie';
import { db } from '../db';
import type { InboundOrder } from '../types/inbound';
import type { PurchaseOrderSync } from '../types/integration';

class IntegrationDb extends Dexie {
  integration_outbox!: Table<PurchaseOrderSync, string>;
  integration_inbox!: Table<PurchaseOrderSync, string>;

  constructor() {
    super('qs_erp_wms_integration_db');
    this.version(1).stores({
      integration_outbox: 'poId, status, syncTime',
      integration_inbox: 'poId, status, syncTime',
    });
  }
}

export const integrationDb = new IntegrationDb();

function now() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function toLocalPurchaseOrder(sync: PurchaseOrderSync) {
  return {
    id: sync.poId,
    supplierCode: sync.supplier.code,
    supplierName: sync.supplier.name,
    warehouseCode: sync.warehouse.code,
    warehouseName: sync.warehouse.name,
    orderDate: sync.syncTime.split(' ')[0],
    status: sync.status === 'FULL_RECEIVED'
      ? 'COMPLETED'
      : sync.status === 'PARTIAL_RECEIVED'
        ? 'PARTIAL_STOCK_IN'
        : 'PENDING_STOCK_IN',
    items: sync.items.map(item => ({
      id: item.id,
      productCode: item.productCode,
      productName: item.productName,
      productBarcode: item.productBarcode || '',
      productSpec: item.productSpec,
      unit: item.unit,
      quantity: item.quantity,
      receivedQuantity: item.receivedQuantity || 0,
      pendingQuantity: item.pendingQuantity,
      price: 0,
      amount: 0,
      remark: '',
    })),
  };
}

export const integrationApi = {
  async syncOutboxToInbox(): Promise<void> {
    const outboxRows = await integrationDb.integration_outbox.toArray();
    for (const row of outboxRows) {
      const existing = await integrationDb.integration_inbox.get(row.poId);
      if (!existing) {
        await integrationDb.integration_inbox.put({
          ...row,
          status: 'DISPATCHED',
          sourceSystem: 'ERP',
          targetSystem: 'WMS',
          syncTime: row.syncTime || now(),
        });
      }
    }
  },

  async getInboundPurchaseOrders(): Promise<PurchaseOrderSync[]> {
    await this.syncOutboxToInbox();
    const rows = await integrationDb.integration_inbox.toArray();
    return rows
      .filter(row => row.status === 'DISPATCHED' || row.status === 'PARTIAL_RECEIVED')
      .sort((a, b) => b.syncTime.localeCompare(a.syncTime));
  },

  async ensureLocalPurchaseOrder(poId: string): Promise<void> {
    await this.syncOutboxToInbox();
    const sync = await integrationDb.integration_inbox.get(poId);
    if (!sync) return;

    const localPo = toLocalPurchaseOrder(sync);
    const existing = await db.purchase_orders.get(poId);
    if (existing) {
      await db.purchase_orders.update(poId, localPo);
    } else {
      await db.purchase_orders.put(localPo);
    }
  },

  async applyInboundReceipt(order: InboundOrder, operator: string): Promise<void> {
    await this.syncOutboxToInbox();
    const sync = await integrationDb.integration_inbox.get(order.purchaseOrderId);
    if (!sync) return;

    const appliedIds = sync.appliedReceiptIds || [];
    if (appliedIds.includes(order.id)) return;

    const updatedItems = sync.items.map(item => {
      const inboundItem = order.items.find(row => row.id === item.id || row.productCode === item.productCode);
      const receivedQty = inboundItem ? Number(inboundItem.receivedQuantity || 0) : 0;
      const nextReceived = Math.min(item.quantity, (item.receivedQuantity || 0) + receivedQty);
      return {
        ...item,
        receivedQuantity: nextReceived,
        pendingQuantity: Math.max(0, item.quantity - nextReceived),
      };
    });

    const hasAnyReceived = updatedItems.some(item => item.receivedQuantity > 0);
    const allCompleted = updatedItems.every(item => item.pendingQuantity === 0);

    await integrationDb.integration_inbox.put({
      ...sync,
      items: updatedItems,
      status: allCompleted ? 'FULL_RECEIVED' : hasAnyReceived ? 'PARTIAL_RECEIVED' : 'DISPATCHED',
      syncTime: now(),
      sourceSystem: 'WMS',
      targetSystem: 'ERP',
      lastReceiptId: order.id,
      appliedReceiptIds: [...appliedIds, order.id],
    });

    await db.purchase_orders.update(order.purchaseOrderId, toLocalPurchaseOrder({
      ...sync,
      items: updatedItems,
      status: allCompleted ? 'FULL_RECEIVED' : hasAnyReceived ? 'PARTIAL_RECEIVED' : 'DISPATCHED',
      syncTime: now(),
    }));
  },
};
