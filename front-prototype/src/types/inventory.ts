export type { LocationArchive, Product, Supplier, Warehouse } from './baseData';

export interface InventoryStock {
  id?: number;
  warehouseCode: string;
  warehouseName: string;
  productCode: string;
  productName: string;
  productSpec: string;
  unit: string;
  batchNo: string;
  qtyAvailable: number; // 可用量
  qtyAllocated: number; // 占用量
  qtyFrozen: number;    // 冻结量
  qtyOnWay: number;     // 在途量
  qtyPendingWriteOff?: number; // 调拨短收差异待核销量
  qtyTotal: number;     // 现存量 (可用 + 占用 + 冻结) (注：在途为非现存部分)
  safetyStock: number;  // 安全库存
  lastModified: string; // 最近变动时间
  zoneCode?: string;
  locationCode?: string;
  recentFlowId?: string;
}

export type FlowType = '采购入库' | '上架确认' | '销售出库' | '零售出库' | '调拨入库' | '调拨出库' | '盘盈' | '盘亏' | '报损' | '冻结' | '解冻';

export interface InventoryFlow {
  id: string; // FLYYYYMMDD-XXXXXXXX (8位序号)
  timestamp: string;
  warehouseCode: string;
  warehouseName: string;
  productCode: string;
  productName: string;
  productSpec: string;
  unit: string;
  flowType: FlowType;
  qtyChange: number; // 变动数量 (带正负)
  qtyAfter: number;  // 变动后现存
  sourceOrderId: string; // 来源单号
  operator: string;
}
