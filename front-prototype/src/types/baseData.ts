export type BaseDataStatus = 'ENABLED' | 'DISABLED';

export type WarehouseType = 'MAIN' | 'BRANCH' | 'STORE';

export type ZoneType = 'RECEIVING' | 'STORAGE' | 'PICKING' | 'RETURN' | 'SHIPPING';

export interface Supplier {
  code: string;
  name: string;
}

export interface Product {
  code: string;
  name: string;
  barcode: string;
  spec: string;
  unit: string;
  defaultPurchasePrice: number;
}

export interface Warehouse {
  code: string;
  name: string;
  type: WarehouseType;
  manager: string;
  address: string;
  remark?: string;
  status: BaseDataStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface Zone {
  code: string;
  name: string;
  warehouseCode: string;
  warehouseName: string;
  type: ZoneType;
  status: BaseDataStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface LocationArchive {
  code: string;
  warehouseCode: string;
  warehouseName: string;
  zoneCode: string;
  zoneName: string;
  barcode: string;
  status: BaseDataStatus;
  createdAt?: string;
  updatedAt?: string;
}

export const WAREHOUSE_TYPE_LABELS: Record<WarehouseType, string> = {
  MAIN: '主仓',
  BRANCH: '分仓',
  STORE: '门店',
};

export const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  RECEIVING: '收货',
  STORAGE: '存储',
  PICKING: '拣货',
  RETURN: '退货',
  SHIPPING: '发货',
};

export const BASE_STATUS_LABELS: Record<BaseDataStatus, string> = {
  ENABLED: '启用',
  DISABLED: '停用',
};
