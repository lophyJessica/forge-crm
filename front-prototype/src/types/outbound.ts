export type WaveStatus = 'DRAFT' | 'PICKING' | 'PICKED' | 'CHECKED' | 'SHIPPED' | 'VOIDED';

export interface WaveItem {
  productCode: string;
  productName: string;
  productSpec: string;
  unit: string;
  recommendLocation: string; // 推荐货位
  qtyRequired: number;       // 应拣数量
  qtyPicked: number;         // 实拣数量
  qtyChecked: number;        // 实出数量(复核用)
  status: 'PENDING' | 'PICKED';
}

export interface WaveOrder {
  id: string; // WAVEYYYYMMDD-XXXX
  waveType: 'SYSTEM' | 'MANUAL';
  carrier: string;
  route: string;
  status: WaveStatus;
  remark?: string;
  orderIds: string[]; // 合并的销售订单 SO 编号列表
  items: WaveItem[];
  pickerId?: string; // 拣货员
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
}

export interface PackageRecord {
  id: string; // PKGYYYYMMDD-XXXXXX (6位序号)
  waveId: string;
  weight: number;
  trackingNumber: string;
  status: 'PACKED' | 'SHIPPED';
  createdAt: string;
}

// 模拟销售订单 SO 的类型，用于波次勾选
export interface SalesOrderItem {
  productCode: string;
  productName: string;
  productSpec: string;
  unit: string;
  quantity: number;
}

export interface SalesOrder {
  id: string; // SOYYYYMMDD-XXXX
  customerName: string;
  orderDate: string;
  status: 'PENDING_OUTBOUND' | 'SHIPPED';
  carrier: string;
  route: string;
  items: SalesOrderItem[];
  itemCount: number;
  totalQuantity: number;
}
