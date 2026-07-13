import { db } from '../db';
import { InventoryStock, InventoryFlow } from '../types/inventory';

export const inventoryApi = {
  // 获取即时库存列表
  async getStocks(filters: {
    warehouseCode?: string;
    productCodeOrName?: string;
    batchNo?: string;
    hideZero?: boolean; // 默认 false
    zoneCode?: string;
    locationCode?: string;
  }): Promise<InventoryStock[]> {
    let list = await db.inventory_stocks.toArray();

    // 过滤仓库
    if (filters.warehouseCode) {
      list = list.filter(item => item.warehouseCode === filters.warehouseCode);
    }
    // 过滤库区
    if (filters.zoneCode) {
      list = list.filter(item => (item as any).zoneCode === filters.zoneCode);
    }
    // 过滤货位
    if (filters.locationCode) {
      list = list.filter(item => (item as any).locationCode === filters.locationCode);
    }
    // 过滤商品 (编码或名称)
    if (filters.productCodeOrName) {
      const q = filters.productCodeOrName.trim().toLowerCase();
      list = list.filter(item => 
        item.productCode.toLowerCase().includes(q) || 
        item.productName.toLowerCase().includes(q)
      );
    }
    // 过滤批次号
    if (filters.batchNo) {
      list = list.filter(item => item.batchNo.includes(filters.batchNo!));
    }
    // 零库存过滤 (现存量 <= 0)
    if (filters.hideZero) {
      list = list.filter(item => item.qtyTotal > 0);
    }

    // 异步拉取最近的 FL 流水记录填充 recentFlowId，并关联库区和货位名称
    const stocksWithFlow = await Promise.all(list.map(async (item) => {
      const flows = await db.inventory_flows
        .where('productCode')
        .equals(item.productCode)
        .toArray();
      const matchFlows = flows
        .filter(f => f.warehouseCode === item.warehouseCode)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      
      let zoneName = '';
      if (item.zoneCode) {
        const zone = await db.zones.get(item.zoneCode);
        zoneName = zone ? zone.name : '';
      }

      let locationName = '';
      if (item.locationCode) {
        const loc = await db.locations.get(item.locationCode);
        locationName = loc ? loc.code : '';
      }

      return {
        ...item,
        recentFlowId: matchFlows[0]?.id || '-',
        zoneName,
        locationName
      };
    }));

    // 排序
    return stocksWithFlow.sort((a, b) => a.productCode.localeCompare(b.productCode));
  },

  // 获取收发流水
  async getFlows(filters: {
    warehouseCode?: string;
    productCodeOrName?: string;
    flowType?: string;
    flowDirection?: 'IN' | 'OUT' | 'ALL';
    dateStart?: string;
    dateEnd?: string;
    sourceOrderId?: string;
  }): Promise<InventoryFlow[]> {
    
    // 日期校验：日期筛选跨度 <= 365 天
    if (filters.dateStart && filters.dateEnd) {
      const start = new Date(filters.dateStart);
      const end = new Date(filters.dateEnd);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 365) {
        throw new Error('查询日期的范围跨度不能超过 365 天！');
      }
    }

    let list = await db.inventory_flows.toArray();

    if (filters.warehouseCode) {
      list = list.filter(f => f.warehouseCode === filters.warehouseCode);
    }
    if (filters.productCodeOrName) {
      const q = filters.productCodeOrName.trim().toLowerCase();
      list = list.filter(f => 
        f.productCode.toLowerCase().includes(q) || 
        f.productName.toLowerCase().includes(q)
      );
    }
    if (filters.flowType) {
      list = list.filter(f => f.flowType === filters.flowType);
    }
    if (filters.flowDirection && filters.flowDirection !== 'ALL') {
      if (filters.flowDirection === 'IN') {
        list = list.filter(f => f.qtyChange > 0);
      } else {
        list = list.filter(f => f.qtyChange < 0);
      }
    }
    if (filters.dateStart) {
      list = list.filter(f => f.timestamp.split(' ')[0] >= filters.dateStart!);
    }
    if (filters.dateEnd) {
      list = list.filter(f => f.timestamp.split(' ')[0] <= filters.dateEnd!);
    }
    if (filters.sourceOrderId) {
      list = list.filter(f => f.sourceOrderId.includes(filters.sourceOrderId!));
    }

    // 默认按发生时间降序
    return list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
};
