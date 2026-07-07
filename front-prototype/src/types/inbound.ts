export type InboundStatus = 'DRAFT' | 'RECEIVED' | 'PUTAWAY' | 'VOIDED';

export interface InboundItem {
  id: string;
  productCode: string;
  productName: string;
  productBarcode: string;
  productSpec: string;
  unit: string;
  purchaseQuantity: number;      // 采购数量 (PO)
  pendingQuantity: number;       // PO 未收货数量
  receivedQuantity: number;      // 实收数量 (RCV)
  putawayQuantity: number;       // 上架数量 (PUT)
  locationCode?: string;         // 上架所选货位
  remark: string;
}

export interface PutawayItemRecord {
  productCode: string;
  productName: string;
  productSpec: string;
  unit: string;
  locationCode: string;
  quantity: number;
}

export interface PutawayRecord {
  id: string; // PUTYYYYMMDD-XXXX
  putawayDate: string;
  operator: string;
  items: PutawayItemRecord[];
}

export interface InboundOrder {
  id: string; // RCVYYYYMMDD-XXXX
  purchaseOrderId: string;
  supplierCode: string;
  supplierName: string;
  warehouseCode: string;
  warehouseName: string;
  receiveDate: string;
  status: InboundStatus;
  remark?: string;
  
  // 汇总字段
  itemCount: number;
  totalQuantity: number;
  totalReceivedQuantity: number;
  
  // 系统字段
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  
  // 明细
  items: InboundItem[];
  
  // 上架单记录
  putawayRecords?: PutawayRecord[];
}
