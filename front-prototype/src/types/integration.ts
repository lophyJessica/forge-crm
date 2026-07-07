export type PurchaseOrderSyncStatus = 'PENDING_DISPATCH' | 'DISPATCHED' | 'PARTIAL_RECEIVED' | 'FULL_RECEIVED';

export interface PurchaseOrderSyncItem {
  id: string;
  productCode: string;
  productName: string;
  productBarcode?: string;
  productSpec: string;
  unit: string;
  quantity: number;
  receivedQuantity: number;
  pendingQuantity: number;
}

export interface PurchaseOrderSync {
  poId: string;
  supplier: {
    code: string;
    name: string;
  };
  warehouse: {
    code: string;
    name: string;
  };
  items: PurchaseOrderSyncItem[];
  status: PurchaseOrderSyncStatus;
  syncTime: string;
  sourceSystem?: 'ERP' | 'WMS';
  targetSystem?: 'ERP' | 'WMS';
  lastReceiptId?: string;
  appliedReceiptIds?: string[];
}
