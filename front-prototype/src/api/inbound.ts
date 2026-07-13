import { db } from '../db';
import { InboundOrder, InboundItem, PutawayRecord } from '../types/inbound';
import { InventoryStock, InventoryFlow } from '../types/inventory';
import { integrationApi } from './integration';

// 生成 RCV 收货单号 helper
export async function generateRCVNumber(): Promise<string> {
  const today = new Date();
  const yyyymmdd = today.getFullYear() + 
    String(today.getMonth() + 1).padStart(2, '0') + 
    String(today.getDate()).padStart(2, '0');
  
  // 查询今天以该前缀开头的最大序号
  const count = await db.inbound_orders
    .where('id')
    .startsWith(`RCV${yyyymmdd}`)
    .count();
  
  const seq = String(count + 1).padStart(4, '0');
  return `RCV${yyyymmdd}-${seq}`;
}

// 生成 PUT 上架单号 helper
export async function generatePUTNumber(): Promise<string> {
  const today = new Date();
  const yyyymmdd = today.getFullYear() + 
    String(today.getMonth() + 1).padStart(2, '0') + 
    String(today.getDate()).padStart(2, '0');
  
  // 用流水号生成计数器
  const count = await db.inventory_flows
    .where('sourceOrderId')
    .startsWith('PUT')
    .count();
    
  const seq = String(count + 1).padStart(4, '0');
  return `PUT${yyyymmdd}-${seq}`;
}

// 生成 FL 流水号 helper
export async function generateFLNumber(): Promise<string> {
  const today = new Date();
  const yyyymmdd = today.getFullYear() + 
    String(today.getMonth() + 1).padStart(2, '0') + 
    String(today.getDate()).padStart(2, '0');
  
  const count = await db.inventory_flows
    .where('id')
    .startsWith(`FL${yyyymmdd}`)
    .count();
  
  const seq = String(count + 1).padStart(8, '0');
  return `FL${yyyymmdd}-${seq}`;
}

export const inboundApi = {
  // 获取列表 (支持常用筛选条件)
  async getInbounds(filters: {
    id?: string;
    purchaseOrderId?: string;
    supplierCode?: string;
    warehouseCode?: string;
    status?: string;
    receiveDateStart?: string;
    receiveDateEnd?: string;
    updatedDateStart?: string;
    updatedDateEnd?: string;
    productCode?: string;
  }) {
    let list = await db.inbound_orders.toArray();

    // 过滤
    if (filters.id) {
      list = list.filter(item => item.id.includes(filters.id!));
    }
    if (filters.purchaseOrderId) {
      list = list.filter(item => item.purchaseOrderId.includes(filters.purchaseOrderId!));
    }
    if (filters.supplierCode) {
      list = list.filter(item => item.supplierCode === filters.supplierCode);
    }
    if (filters.warehouseCode) {
      list = list.filter(item => item.warehouseCode === filters.warehouseCode);
    }
    if (filters.status && filters.status !== 'ALL') {
      list = list.filter(item => item.status === filters.status);
    }
    if (filters.productCode) {
      list = list.filter(item => item.items.some(i => i.productCode.includes(filters.productCode!) || i.productName.includes(filters.productCode!)));
    }
    if (filters.receiveDateStart) {
      list = list.filter(item => item.receiveDate >= filters.receiveDateStart!);
    }
    if (filters.receiveDateEnd) {
      list = list.filter(item => item.receiveDate <= filters.receiveDateEnd!);
    }
    if (filters.updatedDateStart) {
      list = list.filter(item => {
        const date = item.updatedAt || item.createdAt;
        return date.split(' ')[0] >= filters.updatedDateStart!;
      });
    }
    if (filters.updatedDateEnd) {
      list = list.filter(item => {
        const date = item.updatedAt || item.createdAt;
        return date.split(' ')[0] <= filters.updatedDateEnd!;
      });
    }

    // 按创建日期降序排列
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  // 详情
  async getInboundById(id: string): Promise<InboundOrder | undefined> {
    return await db.inbound_orders.get(id);
  },

  // 从 PO 采购单下推创建草稿收货单
  async createInboundFromPO(poId: string, operator: string): Promise<string> {
    await integrationApi.ensureLocalPurchaseOrder(poId);
    const po = await db.purchase_orders.get(poId);
    if (!po) throw new Error('未找到该采购订单');

    const warehouse = await db.warehouses.get(po.warehouseCode);
    if (!warehouse || warehouse.status !== 'ENABLED') {
      throw new Error('采购订单所属仓库不存在或已停用，不可创建收货单');
    }
    
    // 检查是否已经是已入库状态
    if (po.status === 'COMPLETED') {
      throw new Error('该采购订单已完全入库，不可重复下推');
    }

    // 检查是否存在对应的未完成收货单，避免重复收货
    const existingDrafts = await db.inbound_orders
      .where('purchaseOrderId')
      .equals(poId)
      .toArray();
    const hasUnfinished = existingDrafts.some(r => r.status === 'DRAFT' || r.status === 'RECEIVING' || r.status === 'QC_PENDING' || r.status === 'PUTAWAY_PENDING' || r.status === 'EXCEPTION');
    if (hasUnfinished) {
      throw new Error('该采购订单存在未完成的收货任务，请先处理已有收货单');
    }

    const rcvId = await generateRCVNumber();
    const todayStr = new Date().toISOString().split('T')[0];
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const items: InboundItem[] = po.items.map((pi: any) => {
      // 未收货数量 = 采购数量 - 已收货数量
      const pendingQty = Math.max(0, pi.quantity - (pi.receivedQuantity || 0));
      return {
        id: pi.id,
        productCode: pi.productCode,
        productName: pi.productName,
        productBarcode: pi.productBarcode,
        productSpec: pi.productSpec,
        unit: pi.unit,
        purchaseQuantity: pi.quantity,
        pendingQuantity: pendingQty,
        receivedQuantity: pendingQty, // 默认实收等于未收货数
        putawayQuantity: 0,
        remark: ''
      };
    });

    const newOrder: InboundOrder = {
      id: rcvId,
      purchaseOrderId: po.id,
      supplierCode: po.supplierCode,
      supplierName: po.supplierName,
      warehouseCode: po.warehouseCode,
      warehouseName: po.warehouseName,
      receiveDate: todayStr,
      status: 'DRAFT',
      remark: '采购下推生成',
      itemCount: items.length,
      totalQuantity: items.reduce((sum, it) => sum + it.purchaseQuantity, 0),
      totalReceivedQuantity: items.reduce((sum, it) => sum + it.receivedQuantity, 0),
      createdBy: operator,
      createdAt: nowStr,
      items: items,
      putawayRecords: []
    };

    await db.inbound_orders.add(newOrder);
    return rcvId;
  },

  // 保存草稿
  async saveInboundDraft(id: string, updatedItems: InboundItem[], remark: string, operator: string) {
    const order = await db.inbound_orders.get(id);
    if (!order) throw new Error('收货单不存在');
    if (order.status !== 'DRAFT' && order.status !== 'RECEIVING') throw new Error('非草稿状态收货单无法编辑');

    // 强控校验：实收数量 ≤ PO未收货数量
    for (const item of updatedItems) {
      if (item.receivedQuantity > item.pendingQuantity) {
        throw new Error(`商品 [${item.productCode}] 实收数量不能大于未收货数 (${item.pendingQuantity})`);
      }
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const totalRecv = updatedItems.reduce((sum, it) => sum + Number(it.receivedQuantity), 0);
    const nextStatus = totalRecv > 0 ? 'RECEIVING' : 'DRAFT';
    
    await db.inbound_orders.update(id, {
      status: nextStatus,
      items: updatedItems,
      remark: remark,
      totalReceivedQuantity: totalRecv,
      updatedBy: operator,
      updatedAt: nowStr
    });
  },

  // 确认收货 (流转到已收货, 进入质检) -> 库存转入冻结
  async confirmInboundReceipt(id: string, operator: string) {
    const order = await db.inbound_orders.get(id);
    if (!order) throw new Error('收货单不存在');
    if (order.status !== 'DRAFT' && order.status !== 'RECEIVING') throw new Error('只有待收货或收货中状态能确认收货');

    // 强控校验：实收数量 ≤ PO未收货数量
    for (const item of order.items) {
      if (item.receivedQuantity > item.pendingQuantity) {
        throw new Error(`商品 [${item.productCode}] 实收数量不能大于未收货数 (${item.pendingQuantity})`);
      }
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // 执行数据库事务：1. 更新收货单状态；2. 增加即时库存冻结量及现存量
    await db.transaction('rw', [db.inbound_orders, db.inventory_stocks, db.inventory_flows], async () => {
      // 更新状态为 QC_PENDING
      await db.inbound_orders.update(id, {
        status: 'QC_PENDING',
        updatedBy: operator,
        updatedAt: nowStr
      });

      // 累加冻结量与现存量
      for (const item of order.items) {
        if (item.receivedQuantity <= 0) continue;

        // 查找或创建该仓库下该商品的库存记录
        let stock = await db.inventory_stocks
          .where('[warehouseCode+productCode]')
          .equals([order.warehouseCode, item.productCode])
          .first();

        const todayBatch = new Date().toISOString().split('T')[0].replace(/-/g, '').substring(2, 8); // 批次号 YYMMDD

        if (stock) {
          const qtyAllocated = stock.qtyAllocated || 0;
          const qtyFrozen = stock.qtyFrozen || 0;
          
          const newFrozen = qtyFrozen + item.receivedQuantity;
          const newTotal = stock.qtyAvailable + qtyAllocated + newFrozen;

          await db.inventory_stocks.update(stock.id!, {
            qtyFrozen: newFrozen,
            qtyTotal: newTotal,
            lastModified: nowStr
          });
        } else {
          // 创建新库存记录 (可用量为0，冻结量为收货量)
          await db.inventory_stocks.add({
            warehouseCode: order.warehouseCode,
            warehouseName: order.warehouseName,
            productCode: item.productCode,
            productName: item.productName,
            productSpec: item.productSpec,
            unit: item.unit,
            batchNo: todayBatch,
            qtyAvailable: 0,
            qtyAllocated: 0,
            qtyFrozen: item.receivedQuantity,
            qtyOnWay: 0,
            qtyTotal: item.receivedQuantity,
            safetyStock: 30, // 默认商品安全库存
            lastModified: nowStr
          });
        }

        // 生成收货冻结流水
        const flId = await generateFLNumber();
        await db.inventory_flows.add({
          id: flId,
          timestamp: nowStr,
          warehouseCode: order.warehouseCode,
          warehouseName: order.warehouseName,
          productCode: item.productCode,
          productName: item.productName,
          productSpec: item.productSpec,
          unit: item.unit,
          flowType: '采购入库', // 状态还是采购入库，但由于未上架暂存冻结库
          qtyChange: item.receivedQuantity,
          qtyAfter: (stock ? stock.qtyTotal : 0) + item.receivedQuantity,
          sourceOrderId: order.id,
          operator: operator
        });
      }
    });

    await integrationApi.applyInboundReceipt({
      ...order,
      status: 'QC_PENDING',
      updatedBy: operator,
      updatedAt: nowStr
    }, operator);
  },

  // 质检通过/质检退货 (简化：合格直接走上架，不合格质检不通过生成报损/退货)
  async handleQualityCheck(id: string, isPassed: boolean, operator: string) {
    const order = await db.inbound_orders.get(id);
    if (!order) throw new Error('收货单不存在');
    if (order.status !== 'QC_PENDING') throw new Error('只有待质检单据能进行质检判定');

    if (isPassed) {
      // 质检通过，状态转为 PUTAWAY_PENDING (待上架)
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await db.inbound_orders.update(id, {
        status: 'PUTAWAY_PENDING',
        updatedBy: operator,
        updatedAt: nowStr
      });
      return;
    } else {
      // 质检不通过：扣减冻结库存，生成退货报损，单据转为 EXCEPTION (异常)
      await db.transaction('rw', [db.inbound_orders, db.inventory_stocks, db.inventory_flows], async () => {
        const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
        
        // 状态转为 EXCEPTION
        await db.inbound_orders.update(id, {
          status: 'EXCEPTION',
          remark: (order.remark || '') + ' | 质检判定不合格，转为异常等待退货',
          updatedBy: operator,
          updatedAt: nowStr
        });

        // 扣减之前确认收货时加上的冻结量与现存
        for (const item of order.items) {
          if (item.receivedQuantity <= 0) continue;

          let stock = await db.inventory_stocks
            .where('[warehouseCode+productCode]')
            .equals([order.warehouseCode, item.productCode])
            .first();

          if (stock) {
            const newFrozen = Math.max(0, (stock.qtyFrozen || 0) - item.receivedQuantity);
            const newTotal = stock.qtyAvailable + (stock.qtyAllocated || 0) + newFrozen;

            await db.inventory_stocks.update(stock.id!, {
              qtyFrozen: newFrozen,
              qtyTotal: newTotal,
              lastModified: nowStr
            });

            // 产生退回负流水
            const flId = await generateFLNumber();
            await db.inventory_flows.add({
              id: flId,
              timestamp: nowStr,
              warehouseCode: order.warehouseCode,
              warehouseName: order.warehouseName,
              productCode: item.productCode,
              productName: item.productName,
              productSpec: item.productSpec,
              unit: item.unit,
              flowType: '盘亏', // 代表质检不合格退货调出
              qtyChange: -item.receivedQuantity,
              qtyAfter: newTotal,
              sourceOrderId: order.id,
              operator: operator
            });
          }
        }
      });
    }
  },

  // 确认上架 (PDA 扫描操作) -> 冻结库存转为可用，回写上游采购数量
  async putawayConfirm(id: string, putawayItems: { productCode: string; locationCode: string; qty: number }[], operator: string) {
    const order = await db.inbound_orders.get(id);
    if (!order) throw new Error('收货单不存在');
    if (order.status !== 'PUTAWAY_PENDING') throw new Error('只有待上架的单子能执行上架');

    const putId = await generatePUTNumber();
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await db.transaction('rw', [
      db.inbound_orders,
      db.purchase_orders,
      db.inventory_stocks,
      db.inventory_flows
    ], async () => {
      // 1. 创建上架单记录并存入收货单中
      const newRecord: PutawayRecord = {
        id: putId,
        putawayDate: nowStr,
        operator: operator,
        items: putawayItems.map(pi => {
          const matchedItem = order.items.find(i => i.productCode === pi.productCode);
          return {
            productCode: pi.productCode,
            productName: matchedItem?.productName || '',
            productSpec: matchedItem?.productSpec || '',
            unit: matchedItem?.unit || '',
            locationCode: pi.locationCode,
            quantity: pi.qty
          };
        })
      };

      const updatedPutawayRecords = [...(order.putawayRecords || []), newRecord];

      // 更新收货单中商品的上架数量与上架货位
      const updatedItems = order.items.map(item => {
        const putInfo = putawayItems.find(pi => pi.productCode === item.productCode);
        if (putInfo) {
          return {
            ...item,
            putawayQuantity: item.putawayQuantity + putInfo.qty,
            locationCode: putInfo.locationCode
          };
        }
        return item;
      });

      // 检查是否已全部上架
      const isAllPutaway = updatedItems.every(i => i.putawayQuantity >= i.receivedQuantity);

      await db.inbound_orders.update(id, {
        status: isAllPutaway ? 'COMPLETED' : 'PUTAWAY_PENDING',
        items: updatedItems,
        putawayRecords: updatedPutawayRecords,
        updatedBy: operator,
        updatedAt: nowStr
      });

      // 2. 更新库存（从冻结转为可用）
      for (const pi of putawayItems) {
        let stock = await db.inventory_stocks
          .where('[warehouseCode+productCode]')
          .equals([order.warehouseCode, pi.productCode])
          .first();

        if (stock) {
          const newFrozen = Math.max(0, (stock.qtyFrozen || 0) - pi.qty);
          const newAvailable = stock.qtyAvailable + pi.qty;
          const newTotal = newAvailable + (stock.qtyAllocated || 0) + newFrozen;

          const loc = await db.locations.get(pi.locationCode);
          const zoneCode = loc ? loc.zoneCode : undefined;

          await db.inventory_stocks.update(stock.id!, {
            qtyFrozen: newFrozen,
            qtyAvailable: newAvailable,
            qtyTotal: newTotal,
            zoneCode: zoneCode || stock.zoneCode,
            locationCode: pi.locationCode || stock.locationCode,
            lastModified: nowStr
          });

          // 生成上架确认流水 FL
          const flId = await generateFLNumber();
          await db.inventory_flows.add({
            id: flId,
            timestamp: nowStr,
            warehouseCode: order.warehouseCode,
            warehouseName: order.warehouseName,
            productCode: pi.productCode,
            productName: stock.productName,
            productSpec: stock.productSpec,
            unit: stock.unit,
            flowType: '上架确认',
            qtyChange: pi.qty,
            qtyAfter: newTotal,
            sourceOrderId: putId,
            operator: operator
          });
        }
      }

      // 3. 回写采购订单已收货数
      const po = await db.purchase_orders.get(order.purchaseOrderId);
      if (po) {
        let allCompleted = true;
        const updatedPoItems = po.items.map((piItem: any) => {
          const matchedRcvItem = updatedItems.find(ri => ri.productCode === piItem.productCode);
          if (matchedRcvItem) {
            const totalRecv = (piItem.receivedQuantity || 0) + matchedRcvItem.receivedQuantity;
            const newPending = Math.max(0, piItem.quantity - totalRecv);
            if (newPending > 0) {
              allCompleted = false;
            }
            return {
              ...piItem,
              receivedQuantity: totalRecv,
              pendingQuantity: newPending
            };
          }
          if (piItem.pendingQuantity > 0) {
            allCompleted = false;
          }
          return piItem;
        });

        // 检查是部分入库还是已完成
        const anyReceived = updatedPoItems.some((item: any) => (item.receivedQuantity || 0) > 0);
        let nextPoStatus = po.status;
        if (allCompleted) {
          nextPoStatus = 'COMPLETED';
        } else if (anyReceived) {
          nextPoStatus = 'PARTIAL_STOCK_IN';
        }

        await db.purchase_orders.update(po.id, {
          status: nextPoStatus,
          items: updatedPoItems
        });
      }
    });
  },

  // 作废
  async voidInbound(id: string, reason: string, operator: string) {
    const order = await db.inbound_orders.get(id);
    if (!order) throw new Error('收货单不存在');
    if (order.status !== 'DRAFT' && order.status !== 'RECEIVING') throw new Error('只有待收货或收货中可以作废');

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    await db.inbound_orders.update(id, {
      status: 'VOIDED',
      remark: (order.remark || '') + ` | 作废原因: ${reason}`,
      updatedBy: operator,
      updatedAt: nowStr
    });
  },

  // 删除
  async deleteInbound(id: string) {
    const order = await db.inbound_orders.get(id);
    if (!order) throw new Error('收货单不存在');
    if (order.status !== 'DRAFT' && order.status !== 'RECEIVING') throw new Error('只有草稿状态可删除');
    
    await db.inbound_orders.delete(id);
  }
};
