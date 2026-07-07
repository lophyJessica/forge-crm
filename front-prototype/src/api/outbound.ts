import { db } from '../db';
import { WaveOrder, WaveItem, PackageRecord, SalesOrder } from '../types/outbound';
import { InventoryStock, InventoryFlow } from '../types/inventory';

// 生成 WAVE 单号
export async function generateWAVENumber(): Promise<string> {
  const today = new Date();
  const yyyymmdd = today.getFullYear() + 
    String(today.getMonth() + 1).padStart(2, '0') + 
    String(today.getDate()).padStart(2, '0');
  
  const count = await db.wave_orders
    .where('id')
    .startsWith(`WAVE${yyyymmdd}`)
    .count();
  
  const seq = String(count + 1).padStart(4, '0');
  return `WAVE${yyyymmdd}-${seq}`;
}

// 生成 PKG 单号 (6位序号)
export async function generatePKGNumber(): Promise<string> {
  const today = new Date();
  const yyyymmdd = today.getFullYear() + 
    String(today.getMonth() + 1).padStart(2, '0') + 
    String(today.getDate()).padStart(2, '0');
  
  const count = await db.pkg_records
    .where('id')
    .startsWith(`PKG${yyyymmdd}`)
    .count();
  
  const seq = String(count + 1).padStart(6, '0');
  return `PKG${yyyymmdd}-${seq}`;
}

// 生成 DSH 交运单号
export async function generateDSHNumber(): Promise<string> {
  const today = new Date();
  const yyyymmdd = today.getFullYear() + 
    String(today.getMonth() + 1).padStart(2, '0') + 
    String(today.getDate()).padStart(2, '0');
  
  // 借用流水表中的 DSH 变动记录计数
  const count = await db.inventory_flows
    .where('sourceOrderId')
    .startsWith('DSH')
    .count();
    
  const seq = String(count + 1).padStart(4, '0');
  return `DSH${yyyymmdd}-${seq}`;
}

// 生成 FL 流水号
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

export const outboundApi = {
  // 获取波次列表
  async getWaves(filters: {
    id?: string;
    carrier?: string;
    route?: string;
    status?: string;
    createdAtStart?: string;
    createdAtEnd?: string;
  }) {
    let list = await db.wave_orders.toArray();

    if (filters.id) {
      list = list.filter(w => w.id.includes(filters.id!));
    }
    if (filters.carrier) {
      list = list.filter(w => w.carrier === filters.carrier);
    }
    if (filters.route) {
      list = list.filter(w => w.route.includes(filters.route!));
    }
    if (filters.status && filters.status !== 'ALL') {
      list = list.filter(w => w.status === filters.status);
    }
    if (filters.createdAtStart) {
      list = list.filter(w => w.createdAt >= filters.createdAtStart!);
    }
    if (filters.createdAtEnd) {
      list = list.filter(w => w.createdAt <= filters.createdAtEnd!);
    }

    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  // 获取单个波次
  async getWaveById(id: string): Promise<WaveOrder | undefined> {
    return await db.wave_orders.get(id);
  },

  // 获取待出库的销售订单 (SO) 供波次合并使用
  async getPendingSalesOrders(carrier?: string, route?: string) {
    let list = await db.sales_orders.where('status').equals('PENDING_OUTBOUND').toArray();
    if (carrier) {
      list = list.filter(so => so.carrier === carrier);
    }
    if (route) {
      list = list.filter(so => so.route === route);
    }
    return list;
  },

  // 生成波次单
  async createWave(data: {
    waveType: 'SYSTEM' | 'MANUAL';
    carrier: string;
    route: string;
    remark?: string;
    orderIds: string[];
  }, operator: string): Promise<string> {
    
    // R01：单波次上限 50 单
    if (data.orderIds.length > 50) {
      throw new Error('超出单波次合并上限（最大支持 50 单），请分批合并！');
    }
    if (data.orderIds.length === 0) {
      throw new Error('请至少勾选一个待出库销售订单');
    }

    const waveId = await generateWAVENumber();
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // 聚合勾选销售订单的商品明细
    const aggItemsMap: Record<string, {
      productName: string;
      productSpec: string;
      unit: string;
      qtyRequired: number;
    }> = {};

    for (const soId of data.orderIds) {
      const so = await db.sales_orders.get(soId);
      if (!so) continue;

      for (const item of so.items) {
        if (!aggItemsMap[item.productCode]) {
          aggItemsMap[item.productCode] = {
            productName: item.productName,
            productSpec: item.productSpec,
            unit: item.unit,
            qtyRequired: 0
          };
        }
        aggItemsMap[item.productCode].qtyRequired += item.quantity;
      }
    }

    // 推荐货位匹配 (根据货位模拟从A01到B02循环分配)
    const waveItems: WaveItem[] = Object.entries(aggItemsMap).map(([pCode, info], index) => {
      const locList = ['LOC-A01', 'LOC-A02', 'LOC-B01', 'LOC-B02', 'LOC-C01', 'LOC-C02'];
      const recommendLocation = locList[index % locList.length];
      return {
        productCode: pCode,
        productName: info.productName,
        productSpec: info.productSpec,
        unit: info.unit,
        recommendLocation,
        qtyRequired: info.qtyRequired,
        qtyPicked: 0,
        qtyChecked: 0,
        status: 'PENDING'
      };
    });

    const newWave: WaveOrder = {
      id: waveId,
      waveType: data.waveType,
      carrier: data.carrier,
      route: data.route,
      status: 'DRAFT',
      remark: data.remark || '',
      orderIds: data.orderIds,
      items: waveItems,
      createdAt: nowStr,
      createdBy: operator
    };

    await db.wave_orders.add(newWave);
    return waveId;
  },

  // 编辑保存波次
  async saveWaveDraft(id: string, updatedItems: WaveItem[], remark: string) {
    const wave = await db.wave_orders.get(id);
    if (!wave) throw new Error('波次单不存在');
    if (wave.status !== 'DRAFT') throw new Error('只有草稿态波次可以编辑');

    await db.wave_orders.update(id, {
      items: updatedItems,
      remark,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
    });
  },

  // 分配拣货员 -> 状态转为拣货中 PICKING
  async assignPicker(id: string, pickerId: string) {
    const wave = await db.wave_orders.get(id);
    if (!wave) throw new Error('波次单不存在');
    if (wave.status !== 'DRAFT') throw new Error('只有草稿态波次可以分配拣货员');

    await db.wave_orders.update(id, {
      pickerId,
      status: 'PICKING',
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
    });
  },

  // 确认拣货 (PDA 拣货模拟页) -> 实拣不能大于应拣，全部拣完转已拣货
  async confirmPicking(id: string, pickingQuantities: { productCode: string; qty: number }[]) {
    const wave = await db.wave_orders.get(id);
    if (!wave) throw new Error('波次单不存在');
    if (wave.status !== 'PICKING') throw new Error('非拣货中状态波次无法执行拣货确认');

    const updatedItems = wave.items.map(item => {
      const match = pickingQuantities.find(pq => pq.productCode === item.productCode);
      if (match) {
        // R05：拣货超量拦截
        if (match.qty > item.qtyRequired) {
          throw new Error(`商品 [${item.productCode}] 实拣量 (${match.qty}) 不能大于应拣量 (${item.qtyRequired})`);
        }
        return {
          ...item,
          qtyPicked: match.qty,
          status: 'PICKED' as const
        };
      }
      return item;
    });

    const isAllPicked = updatedItems.every(i => i.qtyPicked >= i.qtyRequired);

    await db.wave_orders.update(id, {
      items: updatedItems,
      status: isAllPicked ? 'PICKED' : 'PICKING',
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
    });
  },

  // 复核确认 (扫描包裹号 + 逐件扫描复核)
  async confirmChecking(id: string, checkQuantities: { productCode: string; qty: number }[]) {
    const wave = await db.wave_orders.get(id);
    if (!wave) throw new Error('波次单不存在');
    if (wave.status !== 'PICKED') throw new Error('只有已拣货待复核的波次可以进行复核');

    const updatedItems = wave.items.map(item => {
      const match = checkQuantities.find(cq => cq.productCode === item.productCode);
      if (match) {
        // 复核校验：数量不匹配
        if (match.qty !== item.qtyPicked) {
          throw new Error(`商品 [${item.productCode}] 复核数量 (${match.qty}) 与实拣数量 (${item.qtyPicked}) 不匹配！`);
        }
        return {
          ...item,
          qtyChecked: match.qty
        };
      }
      return item;
    });

    const isAllChecked = updatedItems.every(i => i.qtyChecked === i.qtyRequired);
    if (!isAllChecked) {
      throw new Error('商品复核数未达到应出数量，请确认！');
    }

    await db.wave_orders.update(id, {
      items: updatedItems,
      status: 'CHECKED',
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
    });
  },

  // 包装完成 (保存包裹列表)
  async completePacking(waveId: string, packages: { weight: number; trackingNumber: string }[]) {
    const wave = await db.wave_orders.get(waveId);
    if (!wave) throw new Error('波次单不存在');
    if (wave.status !== 'CHECKED') throw new Error('只有已复核的波次单可以包装');

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await db.transaction('rw', [db.wave_orders, db.pkg_records], async () => {
      // 1. 删除旧的包裹（如果有）
      const oldPkgs = await db.pkg_records.where('waveId').equals(waveId).toArray();
      for (const op of oldPkgs) {
        await db.pkg_records.delete(op.id);
      }

      // 2. 插入新包裹记录
      for (const p of packages) {
        const pkgId = await generatePKGNumber();
        await db.pkg_records.add({
          id: pkgId,
          waveId: waveId,
          weight: Number(p.weight),
          trackingNumber: p.trackingNumber,
          status: 'PACKED',
          createdAt: nowStr
        });
      }

      // 3. 更新波次单状态 -> 这里保持为已复核或流转到可以进行交运确认
      // 在 PackageForm 描述中：“全部包装完成→波次→已交运前期的待交运状态”（我们在下一环节通过 ShipForm “确认交运” 变为最终的 SHIPPED 并扣减库存）
      // 故此处我们依然把状态改为 CHECKED 状态内部的一个标记，或者把状态变更为待交运（为对齐PRD，我们保持 CHECKED，只是标记已包装；
      // 或者直接更新状态为 SHIPPED？但 SHIP 还有一个确认交运操作，所以包装完成把状态改为 CHECKED 的特殊子状态，或者直接把波次更新为已复核且已保存包裹。）
      // 这里为了让流转更清楚，包装完成后将状态变更为 CHECKED (且允许进入 SHIPPING)。
      // 我们可以让前端页面在 CHECKED 且有包裹的情况下允许跳转至 Shipping 页。
    });
  },

  // 获取波次包裹
  async getPackagesByWaveId(waveId: string): Promise<PackageRecord[]> {
    return await db.pkg_records.where('waveId').equals(waveId).toArray();
  },

  // 确认交运 -> 物理扣减库存 (扣除占用) + 生成 FL 流水 + 生成交运单 DSH + 回写 SO 为 SHIPPED
  async confirmShipping(waveId: string, operator: string) {
    const wave = await db.wave_orders.get(waveId);
    if (!wave) throw new Error('波次单不存在');
    
    // 我们允许从已复核 (CHECKED) 流转至交运状态
    if (wave.status !== 'CHECKED') {
      throw new Error('只有已复核包装完毕的波次可以确认交运');
    }

    const dshId = await generateDSHNumber();
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await db.transaction('rw', [
      db.wave_orders,
      db.sales_orders,
      db.inventory_stocks,
      db.inventory_flows,
      db.pkg_records
    ], async () => {
      // 1. 物理扣减库存的占用量qtyAllocated与总现存量qtyTotal
      for (const item of wave.items) {
        // 由于波次单可能聚合了来自不同仓库的订单，但在原型中我们假设都在波次默认发货仓（例如北京主仓 WH001 或者上海分仓 WH002，我们根据订单信息来判断）
        // 我们可以找这个波次中关联销售订单的第一笔的仓库。
        // 原型简化：我们直接对波次商品推荐货位所在仓库（LOC-A01 属 WH001，LOC-B01 属 WH002）进行扣减
        const isWh002 = item.recommendLocation.startsWith('LOC-B') || item.recommendLocation.startsWith('LOC-C');
        const whCode = isWh002 ? 'WH002' : 'WH001';

        let stock = await db.inventory_stocks
          .where('[warehouseCode+productCode]')
          .equals([whCode, item.productCode])
          .first();

        if (stock) {
          const newAllocated = Math.max(0, (stock.qtyAllocated || 0) - item.qtyChecked);
          const newTotal = stock.qtyAvailable + newAllocated + (stock.qtyFrozen || 0);

          await db.inventory_stocks.update(stock.id!, {
            qtyAllocated: newAllocated,
            qtyTotal: newTotal,
            lastModified: nowStr
          });

          // 生成交运 FL 流水
          const flId = await generateFLNumber();
          await db.inventory_flows.add({
            id: flId,
            timestamp: nowStr,
            warehouseCode: stock.warehouseCode,
            warehouseName: stock.warehouseName,
            productCode: item.productCode,
            productName: stock.productName,
            productSpec: stock.productSpec,
            unit: stock.unit,
            flowType: '销售出库',
            qtyChange: -item.qtyChecked,
            qtyAfter: newTotal,
            sourceOrderId: dshId,
            operator: operator
          });
        }
      }

      // 2. 更新关联销售订单 SO 状态为 SHIPPED
      for (const soId of wave.orderIds) {
        await db.sales_orders.update(soId, {
          status: 'SHIPPED'
        });
      }

      // 3. 更新波次状态为已交运 SHIPPED
      await db.wave_orders.update(waveId, {
        status: 'SHIPPED',
        updatedAt: nowStr
      });

      // 4. 更新包裹状态为已交运
      const pkgs = await db.pkg_records.where('waveId').equals(waveId).toArray();
      for (const p of pkgs) {
        await db.pkg_records.update(p.id, {
          status: 'SHIPPED'
        });
      }
    });
  },

  // 作废波次 (仅草稿)
  async voidWave(id: string, operator: string) {
    const wave = await db.wave_orders.get(id);
    if (!wave) throw new Error('波次单不存在');
    if (wave.status !== 'DRAFT') throw new Error('只有草稿态波次可以作废');

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    await db.wave_orders.update(id, {
      status: 'VOIDED',
      updatedAt: nowStr
    });
  }
};
