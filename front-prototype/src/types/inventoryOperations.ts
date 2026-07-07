export type InventoryCheckStatus = 'DRAFT' | 'COUNTING' | 'COMPLETED' | 'VOIDED';
export type InventoryCheckType = 'VISIBLE' | 'BLIND';

export interface InventoryCheckItem {
  id: string;
  productCode: string;
  productName: string;
  productSpec: string;
  unit: string;
  systemQty: number;
  countedQty: number;
}

export interface InventoryCheckOrder {
  id: string;
  warehouseCode: string;
  warehouseName: string;
  status: InventoryCheckStatus;
  checkType: InventoryCheckType;
  itemCount: number;
  checker: string;
  remark?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
  items: InventoryCheckItem[];
}

export type TransferStatus = 'DRAFT' | 'OUTBOUND' | 'INBOUND' | 'COMPLETED' | 'VOIDED';

export interface TransferItem {
  id: string;
  productCode: string;
  productName: string;
  productSpec: string;
  unit: string;
  availableQty: number;
  transferQty: number;
  inboundQty?: number;
}

export interface TransferOrder {
  id: string;
  outWarehouseCode: string;
  outWarehouseName: string;
  inWarehouseCode: string;
  inWarehouseName: string;
  status: TransferStatus;
  itemCount: number;
  remark?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
  items: TransferItem[];
}

export const INVENTORY_CHECK_STATUS_LABELS: Record<InventoryCheckStatus, string> = {
  DRAFT: '草稿',
  COUNTING: '盘点中',
  COMPLETED: '已完成',
  VOIDED: '已作废',
};

export const INVENTORY_CHECK_TYPE_LABELS: Record<InventoryCheckType, string> = {
  VISIBLE: '明盘',
  BLIND: '盲盘',
};

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  DRAFT: '草稿',
  OUTBOUND: '已出库',
  INBOUND: '已入库',
  COMPLETED: '已完成',
  VOIDED: '已作废',
};
