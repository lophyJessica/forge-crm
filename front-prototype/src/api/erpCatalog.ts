export interface ErpProductSnapshot {
  erpProductId: string;
  code: string;
  name: string;
  price: number;
  priceVersion: string;
  status: 'AVAILABLE' | 'DISABLED';
}

const MOCK_ERP_PRODUCTS: ErpProductSnapshot[] = [
  { erpProductId: 'ERP-P001', code: 'SKU001', name: 'Forge WMS 标准版', price: 50000, priceVersion: 'PV20260801', status: 'AVAILABLE' },
  { erpProductId: 'ERP-P002', code: 'SKU002', name: 'Forge ERP 标准版', price: 80000, priceVersion: 'PV20260801', status: 'AVAILABLE' },
];

// Demo 暂无真实 ERP API；统一从该适配层返回带稳定 ID 和价格版本的 Mock 快照。
export async function getAvailableErpProducts() {
  return MOCK_ERP_PRODUCTS.filter(item => item.status === 'AVAILABLE');
}
