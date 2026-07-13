import Dexie, { type Table } from 'dexie';
import { Product, Supplier, Warehouse, Zone } from '../types/baseData';
import { InboundOrder, PutawayRecord } from '../types/inbound';
import { WaveOrder, PackageRecord, SalesOrder } from '../types/outbound';
import { InventoryStock, InventoryFlow, LocationArchive } from '../types/inventory';
import { InventoryCheckOrder, TransferOrder } from '../types/inventoryOperations';
import { DamageOrder } from '../types/damage';

const DEFAULT_WAREHOUSES: Warehouse[] = [
  { code: 'WH001', name: '北京主仓', type: 'MAIN', manager: '张强', address: '北京市通州区物流园1号库', remark: '华北区域核心收发仓', status: 'ENABLED', createdAt: '2026-07-01 09:00:00' },
  { code: 'WH002', name: '上海分仓', type: 'BRANCH', manager: '李敏', address: '上海市嘉定区胜辛南路88号', remark: '华东订单履约仓', status: 'ENABLED', createdAt: '2026-07-01 09:05:00' },
  { code: 'WH003', name: '广州越秀仓', type: 'BRANCH', manager: '陈立', address: '广州市越秀区环市中路仓储中心', remark: '华南补货与退货处理仓', status: 'ENABLED', createdAt: '2026-07-01 09:10:00' },
  { code: 'WH004', name: '成都温江仓', type: 'BRANCH', manager: '周琴', address: '成都市温江区科兴路168号', remark: '西南区域配送仓', status: 'ENABLED', createdAt: '2026-07-01 09:15:00' },
  { code: 'WH005', name: '北京朝阳门店仓', type: 'STORE', manager: '王磊', address: '北京市朝阳区建国路门店后仓', remark: '门店自提与临时备货仓', status: 'DISABLED', createdAt: '2026-07-01 09:20:00' },
  { code: 'WH006', name: '武汉汉阳仓', type: 'BRANCH', manager: '刘洋', address: '武汉市汉阳区四新物流园6号库', remark: '华中区域中转与备货仓', status: 'ENABLED', createdAt: '2026-07-01 09:25:00' },
];

const DEFAULT_ZONES: Zone[] = [
  { code: 'Z-REC-01', name: '北京主仓收货区', warehouseCode: 'WH001', warehouseName: '北京主仓', type: 'RECEIVING', status: 'ENABLED', createdAt: '2026-07-01 09:30:00' },
  { code: 'Z-STO-01', name: '北京主仓存储区', warehouseCode: 'WH001', warehouseName: '北京主仓', type: 'STORAGE', status: 'ENABLED', createdAt: '2026-07-01 09:31:00' },
  { code: 'Z-PIC-01', name: '北京主仓拣货区', warehouseCode: 'WH001', warehouseName: '北京主仓', type: 'PICKING', status: 'ENABLED', createdAt: '2026-07-01 09:32:00' },
  { code: 'Z-RET-02', name: '上海分仓退货区', warehouseCode: 'WH002', warehouseName: '上海分仓', type: 'RETURN', status: 'ENABLED', createdAt: '2026-07-01 09:33:00' },
  { code: 'Z-SHP-03', name: '广州越秀发货区', warehouseCode: 'WH003', warehouseName: '广州越秀仓', type: 'SHIPPING', status: 'ENABLED', createdAt: '2026-07-01 09:34:00' },
  { code: 'Z-STO-04', name: '成都温江存储区', warehouseCode: 'WH004', warehouseName: '成都温江仓', type: 'STORAGE', status: 'DISABLED', createdAt: '2026-07-01 09:35:00' },
];

const DEFAULT_LOCATIONS: LocationArchive[] = [
  { code: 'LOC-A01', warehouseCode: 'WH001', warehouseName: '北京主仓', zoneCode: 'Z-STO-01', zoneName: '北京主仓存储区', barcode: 'BC-WH001-A01', status: 'ENABLED', createdAt: '2026-07-01 10:00:00' },
  { code: 'LOC-A02', warehouseCode: 'WH001', warehouseName: '北京主仓', zoneCode: 'Z-STO-01', zoneName: '北京主仓存储区', barcode: 'BC-WH001-A02', status: 'ENABLED', createdAt: '2026-07-01 10:01:00' },
  { code: 'LOC-P01', warehouseCode: 'WH001', warehouseName: '北京主仓', zoneCode: 'Z-PIC-01', zoneName: '北京主仓拣货区', barcode: 'BC-WH001-P01', status: 'ENABLED', createdAt: '2026-07-01 10:02:00' },
  { code: 'LOC-R01', warehouseCode: 'WH002', warehouseName: '上海分仓', zoneCode: 'Z-RET-02', zoneName: '上海分仓退货区', barcode: 'BC-WH002-R01', status: 'ENABLED', createdAt: '2026-07-01 10:03:00' },
  { code: 'LOC-S01', warehouseCode: 'WH003', warehouseName: '广州越秀仓', zoneCode: 'Z-SHP-03', zoneName: '广州越秀发货区', barcode: 'BC-WH003-S01', status: 'ENABLED', createdAt: '2026-07-01 10:04:00' },
  { code: 'LOC-C01', warehouseCode: 'WH004', warehouseName: '成都温江仓', zoneCode: 'Z-STO-04', zoneName: '成都温江存储区', barcode: 'BC-WH004-C01', status: 'DISABLED', createdAt: '2026-07-01 10:05:00' },
];

const DEFAULT_INVENTORY_CHECKS: InventoryCheckOrder[] = [
  {
    id: 'CK20260701-0001',
    warehouseCode: 'WH001',
    warehouseName: '北京主仓',
    status: 'COMPLETED',
    checkType: 'VISIBLE',
    itemCount: 2,
    checker: '仓管员李强',
    remark: '月初办公用品抽盘，已提交差异报告',
    createdAt: '2026-07-01 09:20:00',
    createdBy: 'WmsScheduler',
    updatedAt: '2026-07-01 11:10:00',
    updatedBy: '仓管员李强',
    items: [
      { id: '1', productCode: 'SKU001', productName: '双鸭牌标准型回形针', productSpec: '100枚/盒', unit: '盒', systemQty: 160, countedQty: 162 },
      { id: '2', productCode: 'SKU002', productName: '晨光按动式中性笔黑色', productSpec: '0.5mm', unit: '支', systemQty: 30, countedQty: 28 },
    ],
  },
  {
    id: 'CK20260702-0001',
    warehouseCode: 'WH002',
    warehouseName: '上海分仓',
    status: 'COUNTING',
    checkType: 'BLIND',
    itemCount: 2,
    checker: '仓管员王芳',
    remark: '电子器材区盲盘中',
    createdAt: '2026-07-02 14:00:00',
    createdBy: 'WmsScheduler',
    updatedAt: '2026-07-02 14:30:00',
    updatedBy: '仓管员王芳',
    items: [
      { id: '1', productCode: 'SKU003', productName: '强盛定制纯木浆A4复印纸', productSpec: '80g 500张/包', unit: '包', systemQty: 15, countedQty: 0 },
      { id: '2', productCode: 'SKU004', productName: '得力多功能计算器', productSpec: '十二位液晶大屏', unit: '台', systemQty: 100, countedQty: 0 },
    ],
  },
  {
    id: 'CK20260703-0001',
    warehouseCode: 'WH003',
    warehouseName: '广州越秀仓',
    status: 'DRAFT',
    checkType: 'VISIBLE',
    itemCount: 1,
    checker: '现场组长赵勇',
    remark: '门店补货区临时盘点草稿',
    createdAt: '2026-07-03 10:00:00',
    createdBy: 'WmsScheduler',
    items: [
      { id: '1', productCode: 'SKU005', productName: '白雪直液式走珠笔红色', productSpec: '0.5mm', unit: '支', systemQty: 0, countedQty: 0 },
    ],
  },
  {
    id: 'CK20260704-0001',
    warehouseCode: 'WH004',
    warehouseName: '成都温江仓',
    status: 'VOIDED',
    checkType: 'BLIND',
    itemCount: 1,
    checker: '仓管员李强',
    remark: '盘点范围选择错误，已作废',
    createdAt: '2026-07-04 15:30:00',
    createdBy: 'WmsScheduler',
    updatedAt: '2026-07-04 16:00:00',
    updatedBy: 'WmsScheduler',
    items: [
      { id: '1', productCode: 'SKU006', productName: '金士顿64GB高速U盘', productSpec: 'USB 3.2 金属机身', unit: '个', systemQty: 5, countedQty: 0 },
    ],
  },
  {
    id: 'CK20260705-0001',
    warehouseCode: 'WH001',
    warehouseName: '北京主仓',
    status: 'DRAFT',
    checkType: 'BLIND',
    itemCount: 2,
    checker: '仓管员王芳',
    remark: '高价值耗材复盘草稿',
    createdAt: '2026-07-05 09:40:00',
    createdBy: 'WmsScheduler',
    items: [
      { id: '1', productCode: 'SKU007', productName: '公牛插线板3米5位插孔', productSpec: '全长3米 带独立开关', unit: '个', systemQty: 270, countedQty: 0 },
      { id: '2', productCode: 'SKU001', productName: '双鸭牌标准型回形针', productSpec: '100枚/盒', unit: '盒', systemQty: 160, countedQty: 0 },
    ],
  },
  {
    id: 'CK20260706-0001',
    warehouseCode: 'WH002',
    warehouseName: '上海分仓',
    status: 'COMPLETED',
    checkType: 'VISIBLE',
    itemCount: 2,
    checker: '现场组长赵勇',
    remark: '低库存商品复核完成',
    createdAt: '2026-07-06 08:50:00',
    createdBy: 'WmsScheduler',
    updatedAt: '2026-07-06 10:20:00',
    updatedBy: '现场组长赵勇',
    items: [
      { id: '1', productCode: 'SKU001', productName: '双鸭牌标准型回形针', productSpec: '100枚/盒', unit: '盒', systemQty: 0, countedQty: 0 },
      { id: '2', productCode: 'SKU003', productName: '强盛定制纯木浆A4复印纸', productSpec: '80g 500张/包', unit: '包', systemQty: 15, countedQty: 14 },
    ],
  },
];

const DEFAULT_TRANSFERS: TransferOrder[] = [
  {
    id: 'TR20260701-0001',
    outWarehouseCode: 'WH001',
    outWarehouseName: '北京主仓',
    inWarehouseCode: 'WH002',
    inWarehouseName: '上海分仓',
    status: 'COMPLETED',
    itemCount: 2,
    remark: '华东补货调拨已完成',
    createdAt: '2026-07-01 08:40:00',
    createdBy: 'WmsScheduler',
    updatedAt: '2026-07-01 17:30:00',
    updatedBy: '仓管员王芳',
    items: [
      { id: '1', productCode: 'SKU001', productName: '双鸭牌标准型回形针', productSpec: '100枚/盒', unit: '盒', availableQty: 160, transferQty: 20, inboundQty: 20 },
      { id: '2', productCode: 'SKU002', productName: '晨光按动式中性笔黑色', productSpec: '0.5mm', unit: '支', availableQty: 30, transferQty: 10, inboundQty: 10 },
    ],
  },
  {
    id: 'TR20260702-0001',
    outWarehouseCode: 'WH002',
    outWarehouseName: '上海分仓',
    inWarehouseCode: 'WH004',
    inWarehouseName: '成都温江仓',
    status: 'OUTBOUND',
    itemCount: 1,
    remark: '成都数码备货，调出仓已确认出库',
    createdAt: '2026-07-02 11:00:00',
    createdBy: 'WmsScheduler',
    updatedAt: '2026-07-02 13:00:00',
    updatedBy: '仓管员王芳',
    items: [
      { id: '1', productCode: 'SKU004', productName: '得力多功能计算器', productSpec: '十二位液晶大屏', unit: '台', availableQty: 100, transferQty: 12, inboundQty: 0 },
    ],
  },
  {
    id: 'TR20260703-0001',
    outWarehouseCode: 'WH001',
    outWarehouseName: '北京主仓',
    inWarehouseCode: 'WH003',
    inWarehouseName: '广州越秀仓',
    status: 'DRAFT',
    itemCount: 2,
    remark: '华南促销备货草稿',
    createdAt: '2026-07-03 09:15:00',
    createdBy: 'WmsScheduler',
    items: [
      { id: '1', productCode: 'SKU007', productName: '公牛插线板3米5位插孔', productSpec: '全长3米 带独立开关', unit: '个', availableQty: 270, transferQty: 30, inboundQty: 0 },
      { id: '2', productCode: 'SKU001', productName: '双鸭牌标准型回形针', productSpec: '100枚/盒', unit: '盒', availableQty: 160, transferQty: 40, inboundQty: 0 },
    ],
  },
  {
    id: 'TR20260704-0001',
    outWarehouseCode: 'WH002',
    outWarehouseName: '上海分仓',
    inWarehouseCode: 'WH001',
    inWarehouseName: '北京主仓',
    status: 'INBOUND',
    itemCount: 1,
    remark: '调入仓已清点，等待归档确认',
    createdAt: '2026-07-04 10:30:00',
    createdBy: 'WmsScheduler',
    updatedAt: '2026-07-04 18:00:00',
    updatedBy: '仓管员李强',
    items: [
      { id: '1', productCode: 'SKU003', productName: '强盛定制纯木浆A4复印纸', productSpec: '80g 500张/包', unit: '包', availableQty: 15, transferQty: 6, inboundQty: 6 },
    ],
  },
  {
    id: 'TR20260705-0001',
    outWarehouseCode: 'WH004',
    outWarehouseName: '成都温江仓',
    inWarehouseCode: 'WH002',
    inWarehouseName: '上海分仓',
    status: 'VOIDED',
    itemCount: 1,
    remark: '调出仓库存不足，已作废',
    createdAt: '2026-07-05 14:45:00',
    createdBy: 'WmsScheduler',
    updatedAt: '2026-07-05 15:00:00',
    updatedBy: 'WmsScheduler',
    items: [
      { id: '1', productCode: 'SKU006', productName: '金士顿64GB高速U盘', productSpec: 'USB 3.2 金属机身', unit: '个', availableQty: 5, transferQty: 8, inboundQty: 0 },
    ],
  },
  {
    id: 'TR20260706-0001',
    outWarehouseCode: 'WH001',
    outWarehouseName: '北京主仓',
    inWarehouseCode: 'WH004',
    inWarehouseName: '成都温江仓',
    status: 'DRAFT',
    itemCount: 1,
    remark: '西南门店常规补货',
    createdAt: '2026-07-06 09:50:00',
    createdBy: 'WmsScheduler',
    items: [
      { id: '1', productCode: 'SKU002', productName: '晨光按动式中性笔黑色', productSpec: '0.5mm', unit: '支', availableQty: 30, transferQty: 15, inboundQty: 0 },
    ],
  },
];

const DEFAULT_DAMAGES: DamageOrder[] = [
  {
    id: 'BL20260701-0001',
    warehouseCode: 'WH001',
    warehouseName: '北京主仓',
    reason: 'DAMAGED',
    status: 'CONFIRMED',
    itemCount: 2,
    totalQty: 5,
    remark: '收货暂存区外箱破损，确认按坏货报损',
    createdAt: '2026-07-01 10:20:00',
    createdBy: '仓管员李强',
    updatedAt: '2026-07-01 10:45:00',
    updatedBy: '仓管员李强',
    items: [
      { id: '1', productCode: 'SKU001', productName: '双鸭牌标准型回形针', productSpec: '100枚/盒', unit: '盒', currentQty: 160, damageQty: 3 },
      { id: '2', productCode: 'SKU002', productName: '晨光按动式中性笔黑色', productSpec: '0.5mm', unit: '支', currentQty: 30, damageQty: 2 },
    ],
  },
  {
    id: 'BL20260702-0001',
    warehouseCode: 'WH002',
    warehouseName: '上海分仓',
    reason: 'TRANSFER_LOSS',
    status: 'DRAFT',
    itemCount: 1,
    totalQty: 2,
    remark: '调拨交接差异，等待主管确认',
    createdAt: '2026-07-02 11:30:00',
    createdBy: '仓管员王芳',
    items: [
      { id: '1', productCode: 'SKU003', productName: '强盛定制纯木浆A4复印纸', productSpec: '80g 500张/包', unit: '包', currentQty: 15, damageQty: 2 },
    ],
  },
  {
    id: 'BL20260702-0002',
    warehouseCode: 'WH004',
    warehouseName: '成都温江仓',
    reason: 'SHORTAGE',
    status: 'VOIDED',
    itemCount: 1,
    totalQty: 1,
    remark: '复核后定位为盘点录入错误，单据作废',
    createdAt: '2026-07-02 15:10:00',
    createdBy: '现场组长赵勇',
    updatedAt: '2026-07-02 15:35:00',
    updatedBy: 'WmsScheduler',
    items: [
      { id: '1', productCode: 'SKU006', productName: '金士顿64GB高速U盘', productSpec: 'USB 3.2 金属机身', unit: '个', currentQty: 5, damageQty: 1 },
    ],
  },
  {
    id: 'BL20260703-0001',
    warehouseCode: 'WH002',
    warehouseName: '上海分仓',
    reason: 'EXPIRED',
    status: 'CONFIRMED',
    itemCount: 1,
    totalQty: 4,
    remark: '仓内耗材超过有效期，确认下架报损',
    createdAt: '2026-07-03 09:40:00',
    createdBy: '质检员周敏',
    updatedAt: '2026-07-03 10:00:00',
    updatedBy: '质检员周敏',
    items: [
      { id: '1', productCode: 'SKU003', productName: '强盛定制纯木浆A4复印纸', productSpec: '80g 500张/包', unit: '包', currentQty: 15, damageQty: 4 },
    ],
  },
  {
    id: 'BL20260704-0001',
    warehouseCode: 'WH002',
    warehouseName: '上海分仓',
    reason: 'DAMAGED',
    status: 'DRAFT',
    itemCount: 1,
    totalQty: 6,
    remark: '门店退回商品外观损坏待确认',
    createdAt: '2026-07-04 13:25:00',
    createdBy: '仓管员陈洁',
    items: [
      { id: '1', productCode: 'SKU004', productName: '得力多功能计算器', productSpec: '十二位液晶大屏', unit: '台', currentQty: 100, damageQty: 6 },
    ],
  },
  {
    id: 'BL20260705-0001',
    warehouseCode: 'WH001',
    warehouseName: '北京主仓',
    reason: 'SHORTAGE',
    status: 'CONFIRMED',
    itemCount: 2,
    totalQty: 8,
    remark: '拣货复核发现短少，已按异常报损归档',
    createdAt: '2026-07-05 16:10:00',
    createdBy: '仓管员李强',
    updatedAt: '2026-07-05 16:35:00',
    updatedBy: 'WmsOperator01',
    items: [
      { id: '1', productCode: 'SKU001', productName: '双鸭牌标准型回形针', productSpec: '100枚/盒', unit: '盒', currentQty: 160, damageQty: 5 },
      { id: '2', productCode: 'SKU007', productName: '公牛插线板3米5位插孔', productSpec: '全长3米 带独立开关', unit: '个', currentQty: 270, damageQty: 3 },
    ],
  },
  {
    id: 'BL20260706-0001',
    warehouseCode: 'WH006',
    warehouseName: '武汉汉阳仓',
    reason: 'TRANSFER_LOSS',
    status: 'DRAFT',
    itemCount: 1,
    totalQty: 2,
    remark: '跨仓调拨到货外箱开裂，等待交接复核',
    createdAt: '2026-07-06 09:15:00',
    createdBy: '仓管员刘洋',
    items: [
      { id: '1', productCode: 'SKU004', productName: '得力多功能计算器', productSpec: '十二位液晶大屏', unit: '台', currentQty: 36, damageQty: 2 },
    ],
  },
  {
    id: 'BL20260706-0002',
    warehouseCode: 'WH002',
    warehouseName: '上海分仓',
    reason: 'EXPIRED',
    status: 'CONFIRMED',
    itemCount: 1,
    totalQty: 1,
    remark: '临期耗材抽检不合格，直接确认报损',
    createdAt: '2026-07-06 10:30:00',
    createdBy: '质检员周敏',
    updatedAt: '2026-07-06 10:42:00',
    updatedBy: '质检员周敏',
    items: [
      { id: '1', productCode: 'SKU001', productName: '双鸭牌标准型回形针', productSpec: '100枚/盒', unit: '盒', currentQty: 12, damageQty: 1 },
    ],
  },
];

// --- 定义 Dexie 数据库 ---
export class WmsDatabase extends Dexie {
  suppliers!: Table<Supplier, string>;
  warehouses!: Table<Warehouse, string>;
  products!: Table<Product & { safetyStock: number }, string>;
  zones!: Table<Zone, string>;
  locations!: Table<LocationArchive, string>;
  
  purchase_orders!: Table<any, string>;
  sales_orders!: Table<SalesOrder, string>;
  
  inbound_orders!: Table<InboundOrder, string>;
  wave_orders!: Table<WaveOrder, string>;
  pkg_records!: Table<PackageRecord, string>;
  inventory_checks!: Table<InventoryCheckOrder, string>;
  transfer_orders!: Table<TransferOrder, string>;
  damage_orders!: Table<DamageOrder, string>;
  
  inventory_stocks!: Table<InventoryStock, number>; // 使用自增 id
  inventory_flows!: Table<InventoryFlow, string>;

  constructor() {
    super('WmsDatabase');
    this.version(1).stores({
      suppliers: 'code, name',
      warehouses: 'code, name',
      products: 'code, name, barcode, spec, unit',
      locations: 'code, name',
      
      purchase_orders: 'id, supplierCode, warehouseCode, status',
      sales_orders: 'id, customerName, status, carrier, route',
      
      inbound_orders: 'id, purchaseOrderId, supplierCode, warehouseCode, status, receiveDate',
      wave_orders: 'id, status, carrier, route, createdAt',
      pkg_records: 'id, waveId, trackingNumber',
      
      inventory_stocks: '++id, warehouseCode, productCode, [warehouseCode+productCode]',
      inventory_flows: 'id, timestamp, warehouseCode, productCode, flowType, sourceOrderId'
    });

    this.version(2).stores({
      suppliers: 'code, name',
      warehouses: 'code, name, type, status',
      products: 'code, name, barcode, spec, unit',
      zones: 'code, warehouseCode, type, status',
      locations: 'code, warehouseCode, zoneCode, barcode, status',
      
      purchase_orders: 'id, supplierCode, warehouseCode, status',
      sales_orders: 'id, customerName, status, carrier, route',
      
      inbound_orders: 'id, purchaseOrderId, supplierCode, warehouseCode, status, receiveDate',
      wave_orders: 'id, status, carrier, route, createdAt',
      pkg_records: 'id, waveId, trackingNumber',
      
      inventory_stocks: '++id, warehouseCode, productCode, [warehouseCode+productCode]',
      inventory_flows: 'id, timestamp, warehouseCode, productCode, flowType, sourceOrderId'
    }).upgrade(async tx => {
      const warehouseTable = tx.table('warehouses');
      await warehouseTable.toCollection().modify((warehouse: Partial<Warehouse>) => {
        const defaults = DEFAULT_WAREHOUSES.find(item => item.code === warehouse.code);
        warehouse.type = warehouse.type || defaults?.type || 'BRANCH';
        warehouse.manager = warehouse.manager || defaults?.manager || 'WmsScheduler';
        warehouse.address = warehouse.address || defaults?.address || '未维护';
        warehouse.status = warehouse.status || 'ENABLED';
        warehouse.createdAt = warehouse.createdAt || defaults?.createdAt || '2026-07-01 09:00:00';
      });

      const locationTable = tx.table('locations');
      await locationTable.toCollection().modify((location: Partial<LocationArchive> & { name?: string }) => {
        const defaults = DEFAULT_LOCATIONS.find(item => item.code === location.code);
        location.warehouseCode = location.warehouseCode || defaults?.warehouseCode || 'WH001';
        location.warehouseName = location.warehouseName || defaults?.warehouseName || '北京主仓';
        location.zoneCode = location.zoneCode || defaults?.zoneCode || 'Z-STO-01';
        location.zoneName = location.zoneName || defaults?.zoneName || location.name || '北京主仓存储区';
        location.barcode = location.barcode || defaults?.barcode || location.code || '';
        location.status = location.status || 'ENABLED';
        location.createdAt = location.createdAt || defaults?.createdAt || '2026-07-01 10:00:00';
      });
    });

    this.version(3).stores({
      suppliers: 'code, name',
      warehouses: 'code, name, type, status',
      products: 'code, name, barcode, spec, unit',
      zones: 'code, warehouseCode, type, status',
      locations: 'code, warehouseCode, zoneCode, barcode, status',
      
      purchase_orders: 'id, supplierCode, warehouseCode, status',
      sales_orders: 'id, customerName, status, carrier, route',
      
      inbound_orders: 'id, purchaseOrderId, supplierCode, warehouseCode, status, receiveDate',
      wave_orders: 'id, status, carrier, route, createdAt',
      pkg_records: 'id, waveId, trackingNumber',
      inventory_checks: 'id, warehouseCode, status, checkType, createdAt',
      transfer_orders: 'id, outWarehouseCode, inWarehouseCode, status, createdAt',
      
      inventory_stocks: '++id, warehouseCode, productCode, [warehouseCode+productCode]',
      inventory_flows: 'id, timestamp, warehouseCode, productCode, flowType, sourceOrderId'
    });

    this.version(4).stores({
      suppliers: 'code, name',
      warehouses: 'code, name, type, status',
      products: 'code, name, barcode, spec, unit',
      zones: 'code, warehouseCode, type, status',
      locations: 'code, warehouseCode, zoneCode, barcode, status',
      
      purchase_orders: 'id, supplierCode, warehouseCode, status',
      sales_orders: 'id, customerName, status, carrier, route',
      
      inbound_orders: 'id, purchaseOrderId, supplierCode, warehouseCode, status, receiveDate',
      wave_orders: 'id, status, carrier, route, createdAt',
      pkg_records: 'id, waveId, trackingNumber',
      inventory_checks: 'id, warehouseCode, status, checkType, createdAt',
      transfer_orders: 'id, outWarehouseCode, inWarehouseCode, status, createdAt',
      damage_orders: 'id, warehouseCode, reason, status, createdAt',
      
      inventory_stocks: '++id, warehouseCode, productCode, [warehouseCode+productCode]',
      inventory_flows: 'id, timestamp, warehouseCode, productCode, flowType, sourceOrderId'
    });
  }
}

export const db = new WmsDatabase();

async function putMissingBaseData() {
  for (const warehouse of DEFAULT_WAREHOUSES) {
    const existing = await db.warehouses.get(warehouse.code);
    if (!existing) {
      await db.warehouses.put(warehouse);
    } else {
      const patch: Partial<Warehouse> = {};
      if (!existing.type) patch.type = warehouse.type;
      if (!existing.manager) patch.manager = warehouse.manager;
      if (!existing.address) patch.address = warehouse.address;
      if (!existing.status) patch.status = warehouse.status;
      if (!existing.createdAt) patch.createdAt = warehouse.createdAt;
      if (Object.keys(patch).length > 0) {
        await db.warehouses.update(warehouse.code, patch);
      }
    }
  }

  for (const zone of DEFAULT_ZONES) {
    const existing = await db.zones.get(zone.code);
    if (!existing) {
      await db.zones.put(zone);
    }
  }

  for (const location of DEFAULT_LOCATIONS) {
    const existing = await db.locations.get(location.code);
    if (!existing) {
      await db.locations.put(location);
    } else {
      const patch: Partial<LocationArchive> = {};
      if (!existing.warehouseCode) patch.warehouseCode = location.warehouseCode;
      if (!existing.warehouseName) patch.warehouseName = location.warehouseName;
      if (!existing.zoneCode) patch.zoneCode = location.zoneCode;
      if (!existing.zoneName) patch.zoneName = location.zoneName;
      if (!existing.barcode) patch.barcode = location.barcode;
      if (!existing.status) patch.status = location.status;
      if (!existing.createdAt) patch.createdAt = location.createdAt;
      if (Object.keys(patch).length > 0) {
        await db.locations.update(location.code, patch);
      }
    }
  }
}

async function putMissingInventoryOperations() {
  for (const check of DEFAULT_INVENTORY_CHECKS) {
    const existing = await db.inventory_checks.get(check.id);
    if (!existing) {
      await db.inventory_checks.put(check);
    }
  }

  for (const transfer of DEFAULT_TRANSFERS) {
    const existing = await db.transfer_orders.get(transfer.id);
    if (!existing) {
      await db.transfer_orders.put(transfer);
    }
  }

  for (const damage of DEFAULT_DAMAGES) {
    const existing = await db.damage_orders.get(damage.id);
    if (!existing) {
      await db.damage_orders.put(damage);
    }
  }
}

// --- 初始种子数据填充函数 ---
export async function seedDatabase() {
  await putMissingBaseData();
  await putMissingInventoryOperations();

  // 检查是否已有数据，若有则不进行初始化，避免覆盖用户交互产生的数据
  const count = await db.products.count();
  if (count > 0) return;

  console.log('正在初始化 WMS IndexedDB 种子数据...');

  // 1. 供应商
  await db.suppliers.bulkPut([
    { code: 'VEND001', name: '北京强盛贸易有限公司' },
    { code: 'VEND002', name: '上海腾飞电子器材厂' },
    { code: 'VEND003', name: '广州力行包装材料公司' },
    { code: 'VEND004', name: '深圳佳美百货批发部' },
    { code: 'VEND005', name: '杭州中盛机械设备有限公司' },
  ]);

  // 2. 仓库 / 库区
  await db.warehouses.bulkPut(DEFAULT_WAREHOUSES);
  await db.zones.bulkPut(DEFAULT_ZONES);

  // 3. 商品（加安全库存参数）
  await db.products.bulkPut([
    { code: 'SKU001', name: '双鸭牌标准型回形针', barcode: '6901234567890', spec: '100枚/盒', unit: '盒', defaultPurchasePrice: 2.5, safetyStock: 50 },
    { code: 'SKU002', name: '晨光按动式中性笔黑色', barcode: '6902345678901', spec: '0.5mm', unit: '支', defaultPurchasePrice: 1.8, safetyStock: 30 },
    { code: 'SKU003', name: '强盛定制纯木浆A4复印纸', barcode: '6903456789012', spec: '80g 500张/包', unit: '包', defaultPurchasePrice: 16.5, safetyStock: 20 },
    { code: 'SKU004', name: '得力多功能计算器', barcode: '6904567890234', spec: '十二位液晶大屏', unit: '台', defaultPurchasePrice: 32.0, safetyStock: 10 },
    { code: 'SKU005', name: '白雪直液式走珠笔红色', barcode: '6905678901235', spec: '0.5mm', unit: '支', defaultPurchasePrice: 1.5, safetyStock: 40 },
    { code: 'SKU006', name: '金士顿64GB高速U盘', barcode: '6906789012346', spec: 'USB 3.2 金属机身', unit: '个', defaultPurchasePrice: 45.0, safetyStock: 15 },
    { code: 'SKU007', name: '公牛插线板3米5位插孔', barcode: '6907890123457', spec: '全长3米 带独立开关', unit: '个', defaultPurchasePrice: 28.5, safetyStock: 25 },
  ]);

  // 4. 货位列表
  await db.locations.bulkPut(DEFAULT_LOCATIONS);

  // 5. 采购订单 (模拟已下发状态)
  await db.purchase_orders.bulkPut([
    {
      id: 'PO20260706-0001',
      supplierCode: 'VEND001',
      supplierName: '北京强盛贸易有限公司',
      warehouseCode: 'WH001',
      warehouseName: '北京主仓',
      orderDate: '2026-07-06',
      status: 'PENDING_STOCK_IN',
      items: [
        { id: '1', productCode: 'SKU001', productName: '双鸭牌标准型回形针', productBarcode: '6901234567890', productSpec: '100枚/盒', unit: '盒', quantity: 100, receivedQuantity: 0, pendingQuantity: 100, price: 2.5, amount: 250, remark: '' },
        { id: '2', productCode: 'SKU002', productName: '晨光按动式中性笔黑色', productBarcode: '6902345678901', productSpec: '0.5mm', unit: '支', quantity: 200, receivedQuantity: 0, pendingQuantity: 200, price: 1.8, amount: 360, remark: '' }
      ]
    },
    {
      id: 'PO20260706-0002',
      supplierCode: 'VEND002',
      supplierName: '上海腾飞电子器材厂',
      warehouseCode: 'WH002',
      warehouseName: '上海分仓',
      orderDate: '2026-07-06',
      status: 'PARTIAL_STOCK_IN',
      items: [
        { id: '1', productCode: 'SKU003', productName: '强盛定制纯木浆A4复印纸', productBarcode: '6903456789012', productSpec: '80g 500张/包', unit: '包', quantity: 50, receivedQuantity: 30, pendingQuantity: 20, price: 16.5, amount: 825, remark: '' },
        { id: '2', productCode: 'SKU004', productName: '得力多功能计算器', productBarcode: '6904567890234', productSpec: '十二位液晶大屏', unit: '台', quantity: 20, receivedQuantity: 10, pendingQuantity: 10, price: 32.0, amount: 640, remark: '' }
      ]
    },
    {
      id: 'PO20260706-0003',
      supplierCode: 'VEND003',
      supplierName: '广州力行包装材料公司',
      warehouseCode: 'WH003',
      warehouseName: '广州越秀仓',
      orderDate: '2026-07-06',
      status: 'PENDING_STOCK_IN',
      items: [
        { id: '1', productCode: 'SKU005', productName: '白雪直液式走珠笔红色', productBarcode: '6905678901235', productSpec: '0.5mm', unit: '支', quantity: 300, receivedQuantity: 0, pendingQuantity: 300, price: 1.5, amount: 450, remark: '' }
      ]
    }
  ]);

  // 6. 销售订单 (出库合并用)
  await db.sales_orders.bulkPut([
    {
      id: 'SO20260706-0001',
      customerName: '北京博瑞百货超市',
      orderDate: '2026-07-06',
      status: 'PENDING_OUTBOUND',
      carrier: '顺丰速运',
      route: '北京同城华东线',
      itemCount: 2,
      totalQuantity: 80,
      items: [
        { productCode: 'SKU001', productName: '双鸭牌标准型回形针', productSpec: '100枚/盒', unit: '盒', quantity: 50 },
        { productCode: 'SKU002', productName: '晨光按动式中性笔黑色', productSpec: '0.5mm', unit: '支', quantity: 30 }
      ]
    },
    {
      id: 'SO20260706-0002',
      customerName: '上海华联商厦',
      orderDate: '2026-07-06',
      status: 'PENDING_OUTBOUND',
      carrier: '顺丰速运',
      route: '北京同城华东线',
      itemCount: 1,
      totalQuantity: 20,
      items: [
        { productCode: 'SKU001', productName: '双鸭牌标准型回形针', productSpec: '100枚/盒', unit: '盒', quantity: 20 }
      ]
    },
    {
      id: 'SO20260706-0003',
      customerName: '广州好又多连锁店',
      orderDate: '2026-07-06',
      status: 'PENDING_OUTBOUND',
      carrier: '京东快递',
      route: '广州同城华南线',
      itemCount: 2,
      totalQuantity: 15,
      items: [
        { productCode: 'SKU003', productName: '强盛定制纯木浆A4复印纸', productSpec: '80g 500张/包', unit: '包', quantity: 10 },
        { productCode: 'SKU004', productName: '得力多功能计算器', productSpec: '十二位液晶大屏', unit: '台', quantity: 5 }
      ]
    },
    {
      id: 'SO20260706-0004',
      customerName: '天津小白楼商超',
      orderDate: '2026-07-06',
      status: 'PENDING_OUTBOUND',
      carrier: '顺丰速运',
      route: '北京同城华东线',
      itemCount: 1,
      totalQuantity: 10,
      items: [
        { productCode: 'SKU004', productName: '得力多功能计算器', productSpec: '十二位液晶大屏', unit: '台', quantity: 10 }
      ]
    },
    {
      id: 'SO20260706-0005',
      customerName: '成都红旗连锁',
      orderDate: '2026-07-06',
      status: 'PENDING_OUTBOUND',
      carrier: '中通快递',
      route: '成都同城华西线',
      itemCount: 1,
      totalQuantity: 15,
      items: [
        { productCode: 'SKU006', productName: '金士顿64GB高速U盘', productSpec: 'USB 3.2 金属机身', unit: '个', quantity: 15 }
      ]
    }
  ]);

  // 7. 即时库存 Mock (≥8条，含正常、预警、零/负库存)
  await db.inventory_stocks.bulkPut([
    { warehouseCode: 'WH001', warehouseName: '北京主仓', productCode: 'SKU001', productName: '双鸭牌标准型回形针', productSpec: '100枚/盒', unit: '盒', batchNo: '20260701', qtyAvailable: 120, qtyAllocated: 30, qtyFrozen: 10, qtyOnWay: 0, qtyTotal: 160, safetyStock: 50, lastModified: '2026-07-06 10:00:00' },
    { warehouseCode: 'WH001', warehouseName: '北京主仓', productCode: 'SKU002', productName: '晨光按动式中性笔黑色', productSpec: '0.5mm', unit: '支', batchNo: '20260701', qtyAvailable: 10, qtyAllocated: 15, qtyFrozen: 5, qtyOnWay: 0, qtyTotal: 30, safetyStock: 30, lastModified: '2026-07-06 10:15:00' }, // 预警 (可用10 < 安全30)
    { warehouseCode: 'WH002', warehouseName: '上海分仓', productCode: 'SKU003', productName: '强盛定制纯木浆A4复印纸', productSpec: '80g 500张/包', unit: '包', batchNo: '20260702', qtyAvailable: 8, qtyAllocated: 2, qtyFrozen: 5, qtyOnWay: 10, qtyTotal: 15, safetyStock: 20, lastModified: '2026-07-06 11:00:00' }, // 预警 & 在途
    { warehouseCode: 'WH002', warehouseName: '上海分仓', productCode: 'SKU004', productName: '得力多功能计算器', productSpec: '十二位液晶大屏', unit: '台', batchNo: '20260702', qtyAvailable: 100, qtyAllocated: 0, qtyFrozen: 0, qtyOnWay: 0, qtyTotal: 100, safetyStock: 10, lastModified: '2026-07-06 09:30:00' },
    { warehouseCode: 'WH003', warehouseName: '广州越秀仓', productCode: 'SKU005', productName: '白雪直液式走珠笔红色', productSpec: '0.5mm', unit: '支', batchNo: '20260703', qtyAvailable: 0, qtyAllocated: 0, qtyFrozen: 0, qtyOnWay: 50, qtyTotal: 0, safetyStock: 40, lastModified: '2026-07-05 15:00:00' }, // 零现存 & 仅在途
    { warehouseCode: 'WH004', warehouseName: '成都温江仓', productCode: 'SKU006', productName: '金士顿64GB高速U盘', productSpec: 'USB 3.2 金属机身', unit: '个', batchNo: '20260704', qtyAvailable: -5, qtyAllocated: 10, qtyFrozen: 0, qtyOnWay: 0, qtyTotal: 5, safetyStock: 20, lastModified: '2026-07-06 12:00:00' }, // 负可用 (现存5, 占用10, 可用-5)
    { warehouseCode: 'WH001', warehouseName: '北京主仓', productCode: 'SKU007', productName: '公牛插线板3米5位插孔', productSpec: '全长3米 带独立开关', unit: '个', batchNo: '20260701', qtyAvailable: 200, qtyAllocated: 50, qtyFrozen: 20, qtyOnWay: 0, qtyTotal: 270, safetyStock: 25, lastModified: '2026-07-06 08:00:00' },
    { warehouseCode: 'WH002', warehouseName: '上海分仓', productCode: 'SKU001', productName: '双鸭牌标准型回形针', productSpec: '100枚/盒', unit: '盒', batchNo: '20260702', qtyAvailable: 0, qtyAllocated: 0, qtyFrozen: 0, qtyOnWay: 0, qtyTotal: 0, safetyStock: 50, lastModified: '2026-07-04 10:00:00' }, // 零库存
    { warehouseCode: 'WH006', warehouseName: '武汉汉阳仓', productCode: 'SKU004', productName: '得力多功能计算器', productSpec: '十二位液晶大屏', unit: '台', batchNo: '20260705', qtyAvailable: 30, qtyAllocated: 6, qtyFrozen: 0, qtyOnWay: 0, qtyTotal: 36, safetyStock: 10, lastModified: '2026-07-06 09:00:00' },
  ]);

  // 8. 收货单 RCV (≥8条，覆盖 Draft、Received、Putaway、Voided)
  await db.inbound_orders.bulkPut([
    {
      id: 'RCV20260701-0001',
      purchaseOrderId: 'PO20260615-0001',
      supplierCode: 'VEND001',
      supplierName: '北京强盛贸易有限公司',
      warehouseCode: 'WH001',
      warehouseName: '北京主仓',
      receiveDate: '2026-07-01',
      status: 'COMPLETED',
      remark: '首期采购完美收货上架',
      itemCount: 2,
      totalQuantity: 150,
      totalReceivedQuantity: 150,
      createdBy: 'WmsOperator01',
      createdAt: '2026-07-01 14:00:00',
      items: [
        { id: '1', productCode: 'SKU001', productName: '双鸭牌标准型回形针', productBarcode: '6901234567890', productSpec: '100枚/盒', unit: '盒', purchaseQuantity: 100, pendingQuantity: 0, receivedQuantity: 100, putawayQuantity: 100, locationCode: 'LOC-A01', remark: '' },
        { id: '2', productCode: 'SKU003', productName: '强盛定制纯木浆A4复印纸', productBarcode: '6903456789012', productSpec: '80g 500张/包', unit: '包', purchaseQuantity: 50, pendingQuantity: 0, receivedQuantity: 50, putawayQuantity: 50, locationCode: 'LOC-B01', remark: '' }
      ],
      putawayRecords: [
        { id: 'PUT20260701-0001', putawayDate: '2026-07-01 16:30:00', operator: 'WmsOperator01', items: [
          { productCode: 'SKU001', productName: '双鸭牌标准型回形针', productSpec: '100枚/盒', unit: '盒', locationCode: 'LOC-A01', quantity: 100 },
          { productCode: 'SKU003', productName: '强盛定制纯木浆A4复印纸', productSpec: '80g 500张/包', unit: '包', locationCode: 'LOC-B01', quantity: 50 }
        ]}
      ]
    },
    {
      id: 'RCV20260702-0001',
      purchaseOrderId: 'PO20260620-0001',
      supplierCode: 'VEND002',
      supplierName: '上海腾飞电子器材厂',
      warehouseCode: 'WH002',
      warehouseName: '上海分仓',
      receiveDate: '2026-07-02',
      status: 'COMPLETED',
      remark: '部分采购订单首批到货',
      itemCount: 2,
      totalQuantity: 30,
      totalReceivedQuantity: 20,
      createdBy: 'WmsOperator01',
      createdAt: '2026-07-02 11:20:00',
      items: [
        { id: '1', productCode: 'SKU006', productName: '金士顿64GB高速U盘', productBarcode: '6906789012346', productSpec: 'USB 3.2 金属机身', unit: '个', purchaseQuantity: 20, pendingQuantity: 5, receivedQuantity: 15, putawayQuantity: 15, locationCode: 'LOC-C01', remark: '' },
        { id: '2', productCode: 'SKU007', productName: '公牛插线板3米5位插孔', productBarcode: '6907890123457', productSpec: '全长3米 带独立开关', unit: '个', purchaseQuantity: 10, pendingQuantity: 5, receivedQuantity: 5, putawayQuantity: 5, locationCode: 'LOC-D01', remark: '' }
      ],
      putawayRecords: [
        { id: 'PUT20260702-0001', putawayDate: '2026-07-02 14:00:00', operator: 'WmsOperator01', items: [
          { productCode: 'SKU006', productName: '金士顿64GB高速U盘', productSpec: 'USB 3.2 金属机身', unit: '个', locationCode: 'LOC-C01', quantity: 15 },
          { productCode: 'SKU007', productName: '公牛插线板3米5位插孔', productSpec: '全长3米 带独立开关', unit: '个', locationCode: 'LOC-D01', quantity: 5 }
        ]}
      ]
    },
    {
      id: 'RCV20260703-0001',
      purchaseOrderId: 'PO20260706-0002',
      supplierCode: 'VEND002',
      supplierName: '上海腾飞电子器材厂',
      warehouseCode: 'WH002',
      warehouseName: '上海分仓',
      receiveDate: '2026-07-03',
      status: 'QC_PENDING',
      remark: '已清点收货，等待上架中',
      itemCount: 2,
      totalQuantity: 30,
      totalReceivedQuantity: 30,
      createdBy: 'WmsOperator02',
      createdAt: '2026-07-03 09:10:00',
      items: [
        { id: '1', productCode: 'SKU003', productName: '强盛定制纯木浆A4复印纸', productBarcode: '6903456789012', productSpec: '80g 500张/包', unit: '包', purchaseQuantity: 20, pendingQuantity: 20, receivedQuantity: 20, putawayQuantity: 0, remark: '' },
        { id: '2', productCode: 'SKU004', productName: '得力多功能计算器', productBarcode: '6904567890234', productSpec: '十二位液晶大屏', unit: '台', purchaseQuantity: 10, pendingQuantity: 10, receivedQuantity: 10, putawayQuantity: 0, remark: '' }
      ]
    },
    {
      id: 'RCV20260704-0001',
      purchaseOrderId: 'PO20260706-0001',
      supplierCode: 'VEND001',
      supplierName: '北京强盛贸易有限公司',
      warehouseCode: 'WH001',
      warehouseName: '北京主仓',
      receiveDate: '2026-07-04',
      status: 'RECEIVING',
      remark: '正在清点的草稿单',
      itemCount: 2,
      totalQuantity: 300,
      totalReceivedQuantity: 300,
      createdBy: 'WmsOperator01',
      createdAt: '2026-07-04 15:30:00',
      items: [
        { id: '1', productCode: 'SKU001', productName: '双鸭牌标准型回形针', productBarcode: '6901234567890', productSpec: '100枚/盒', unit: '盒', purchaseQuantity: 100, pendingQuantity: 100, receivedQuantity: 100, putawayQuantity: 0, remark: '' },
        { id: '2', productCode: 'SKU002', productName: '晨光按动式中性笔黑色', productBarcode: '6902345678901', productSpec: '0.5mm', unit: '支', purchaseQuantity: 200, pendingQuantity: 200, receivedQuantity: 200, putawayQuantity: 0, remark: '' }
      ]
    },
    {
      id: 'RCV20260704-0002',
      purchaseOrderId: 'PO20260706-0001',
      supplierCode: 'VEND001',
      supplierName: '北京强盛贸易有限公司',
      warehouseCode: 'WH001',
      warehouseName: '北京主仓',
      receiveDate: '2026-07-04',
      status: 'VOIDED',
      remark: '录入错误，已作废作废',
      itemCount: 1,
      totalQuantity: 100,
      totalReceivedQuantity: 0,
      createdBy: 'WmsOperator01',
      createdAt: '2026-07-04 10:00:00',
      items: [
        { id: '1', productCode: 'SKU001', productName: '双鸭牌标准型回形针', productBarcode: '6901234567890', productSpec: '100枚/盒', unit: '盒', purchaseQuantity: 100, pendingQuantity: 100, receivedQuantity: 0, putawayQuantity: 0, remark: '打错数量' }
      ]
    },
    {
      id: 'RCV20260705-0001',
      purchaseOrderId: 'PO20260706-0003',
      supplierCode: 'VEND003',
      supplierName: '广州力行包装材料公司',
      warehouseCode: 'WH003',
      warehouseName: '广州越秀仓',
      receiveDate: '2026-07-05',
      status: 'RECEIVING',
      remark: '只录入了部分数量的草稿',
      itemCount: 1,
      totalQuantity: 300,
      totalReceivedQuantity: 150,
      createdBy: 'WmsOperator02',
      createdAt: '2026-07-05 13:45:00',
      items: [
        { id: '1', productCode: 'SKU005', productName: '白雪直液式走珠笔红色', productBarcode: '6905678901235', productSpec: '0.5mm', unit: '支', purchaseQuantity: 300, pendingQuantity: 300, receivedQuantity: 150, putawayQuantity: 0, remark: '分批清点' }
      ]
    },
    {
      id: 'RCV20260705-0002',
      purchaseOrderId: 'PO20260706-0003',
      supplierCode: 'VEND003',
      supplierName: '广州力行包装材料公司',
      warehouseCode: 'WH003',
      warehouseName: '广州越秀仓',
      receiveDate: '2026-07-05',
      status: 'QC_PENDING',
      remark: '广州仓今日红笔大批收货',
      itemCount: 1,
      totalQuantity: 300,
      totalReceivedQuantity: 300,
      createdBy: 'WmsOperator02',
      createdAt: '2026-07-05 16:00:00',
      items: [
        { id: '1', productCode: 'SKU005', productName: '白雪直液式走珠笔红色', productBarcode: '6905678901235', productSpec: '0.5mm', unit: '支', purchaseQuantity: 300, pendingQuantity: 300, receivedQuantity: 300, putawayQuantity: 0, remark: '' }
      ]
    },
    {
      id: 'RCV20260706-0001',
      purchaseOrderId: 'PO20260706-0002',
      supplierCode: 'VEND002',
      supplierName: '上海腾飞电子器材厂',
      warehouseCode: 'WH002',
      warehouseName: '上海分仓',
      receiveDate: '2026-07-06',
      status: 'COMPLETED',
      remark: '完成了PO第二批收货上架',
      itemCount: 2,
      totalQuantity: 30,
      totalReceivedQuantity: 30,
      createdBy: 'WmsOperator01',
      createdAt: '2026-07-06 09:00:00',
      items: [
        { id: '1', productCode: 'SKU003', productName: '强盛定制纯木浆A4复印纸', productBarcode: '6903456789012', productSpec: '80g 500张/包', unit: '包', purchaseQuantity: 20, pendingQuantity: 0, receivedQuantity: 20, putawayQuantity: 20, locationCode: 'LOC-B02', remark: '' },
        { id: '2', productCode: 'SKU004', productName: '得力多功能计算器', productBarcode: '6904567890234', productSpec: '十二位液晶大屏', unit: '台', purchaseQuantity: 10, pendingQuantity: 0, receivedQuantity: 10, putawayQuantity: 10, locationCode: 'LOC-C02', remark: '' }
      ],
      putawayRecords: [
        { id: 'PUT20260706-0001', putawayDate: '2026-07-06 10:15:00', operator: 'WmsOperator01', items: [
          { productCode: 'SKU003', productName: '强盛定制纯木浆A4复印纸', productSpec: '80g 500张/包', unit: '包', locationCode: 'LOC-B02', quantity: 20 },
          { productCode: 'SKU004', productName: '得力多功能计算器', productSpec: '十二位液晶大屏', unit: '台', locationCode: 'LOC-C02', quantity: 10 }
        ]}
      ]
    }
  ]);

  // 9. 出库波次单 WAVE (≥8条，覆盖 Draft、Picking、Picked、Checked、Shipped, Voided)
  await db.wave_orders.bulkPut([
    {
      id: 'WAVE20260701-0001',
      waveType: 'SYSTEM',
      carrier: '顺丰速运',
      route: '北京同城华东线',
      status: 'SHIPPED',
      remark: '华东线早班出库',
      orderIds: ['SO20260706-0001', 'SO20260706-0002'],
      items: [
        { productCode: 'SKU001', productName: '双鸭牌标准型回形针', productSpec: '100枚/盒', unit: '盒', recommendLocation: 'LOC-A01', qtyRequired: 70, qtyPicked: 70, qtyChecked: 70, status: 'PICKED' },
        { productCode: 'SKU002', productName: '晨光按动式中性笔黑色', productSpec: '0.5mm', unit: '支', recommendLocation: 'LOC-A02', qtyRequired: 30, qtyPicked: 30, qtyChecked: 30, status: 'PICKED' }
      ],
      pickerId: 'Picker01',
      createdAt: '2026-07-01 08:30:00',
      createdBy: 'WmsScheduler'
    },
    {
      id: 'WAVE20260702-0001',
      waveType: 'MANUAL',
      carrier: '京东快递',
      route: '广州同城华南线',
      status: 'CHECKED',
      remark: '广州数码专件波次',
      orderIds: ['SO20260706-0003'],
      items: [
        { productCode: 'SKU003', productName: '强盛定制纯木浆A4复印纸', productSpec: '80g 500张/包', unit: '包', recommendLocation: 'LOC-B01', qtyRequired: 10, qtyPicked: 10, qtyChecked: 10, status: 'PICKED' },
        { productCode: 'SKU004', productName: '得力多功能计算器', productSpec: '十二位液晶大屏', unit: '台', recommendLocation: 'LOC-B02', qtyRequired: 5, qtyPicked: 5, qtyChecked: 5, status: 'PICKED' }
      ],
      pickerId: 'Picker02',
      createdAt: '2026-07-02 10:00:00',
      createdBy: 'WmsScheduler'
    },
    {
      id: 'WAVE20260703-0001',
      waveType: 'SYSTEM',
      carrier: '顺丰速运',
      route: '北京同城华东线',
      status: 'PICKED',
      remark: '顺丰加急件',
      orderIds: ['SO20260706-0004'],
      items: [
        { productCode: 'SKU004', productName: '得力多功能计算器', productSpec: '十二位液晶大屏', unit: '台', recommendLocation: 'LOC-B02', qtyRequired: 10, qtyPicked: 10, qtyChecked: 0, status: 'PICKED' }
      ],
      pickerId: 'Picker01',
      createdAt: '2026-07-03 14:00:00',
      createdBy: 'WmsScheduler'
    },
    {
      id: 'WAVE20260704-0001',
      waveType: 'SYSTEM',
      carrier: '顺丰速运',
      route: '北京同城华东线',
      status: 'PICKING',
      remark: '北京库拣货中',
      orderIds: ['SO20260706-0001'],
      items: [
        { productCode: 'SKU001', productName: '双鸭牌标准型回形针', productSpec: '100枚/盒', unit: '盒', recommendLocation: 'LOC-A01', qtyRequired: 50, qtyPicked: 30, qtyChecked: 0, status: 'PENDING' },
        { productCode: 'SKU002', productName: '晨光按动式中性笔黑色', productSpec: '0.5mm', unit: '支', recommendLocation: 'LOC-A02', qtyRequired: 30, qtyPicked: 0, qtyChecked: 0, status: 'PENDING' }
      ],
      pickerId: 'Picker01',
      createdAt: '2026-07-04 09:30:00',
      createdBy: 'WmsScheduler'
    },
    {
      id: 'WAVE20260705-0001',
      waveType: 'MANUAL',
      carrier: '中通快递',
      route: '成都同城华西线',
      status: 'DRAFT',
      remark: '等待分配拣货员的草稿',
      orderIds: ['SO20260706-0005'],
      items: [
        { productCode: 'SKU006', productName: '金士顿64GB高速U盘', productSpec: 'USB 3.2 金属机身', unit: '个', recommendLocation: 'LOC-C01', qtyRequired: 15, qtyPicked: 0, qtyChecked: 0, status: 'PENDING' }
      ],
      createdAt: '2026-07-05 11:00:00',
      createdBy: 'Admin'
    },
    {
      id: 'WAVE20260705-0002',
      waveType: 'SYSTEM',
      carrier: '顺丰速运',
      route: '北京同城华东线',
      status: 'VOIDED',
      remark: '客户取消订单，作废此波次',
      orderIds: ['SO20260706-0002'],
      items: [
        { productCode: 'SKU001', productName: '双鸭牌标准型回形针', productSpec: '100枚/盒', unit: '盒', recommendLocation: 'LOC-A01', qtyRequired: 20, qtyPicked: 0, qtyChecked: 0, status: 'PENDING' }
      ],
      createdAt: '2026-07-05 13:00:00',
      createdBy: 'WmsScheduler'
    },
    {
      id: 'WAVE20260706-0001',
      waveType: 'MANUAL',
      carrier: '京东快递',
      route: '广州同城华南线',
      status: 'DRAFT',
      remark: '新创建的手动波次',
      orderIds: ['SO20260706-0003'],
      items: [
        { productCode: 'SKU003', productName: '强盛定制纯木浆A4复印纸', productSpec: '80g 500张/包', unit: '包', recommendLocation: 'LOC-B01', qtyRequired: 10, qtyPicked: 0, qtyChecked: 0, status: 'PENDING' },
        { productCode: 'SKU004', productName: '得力多功能计算器', productSpec: '十二位液晶大屏', unit: '台', recommendLocation: 'LOC-B02', qtyRequired: 5, qtyPicked: 0, qtyChecked: 0, status: 'PENDING' }
      ],
      createdAt: '2026-07-06 09:30:00',
      createdBy: 'Admin'
    },
    {
      id: 'WAVE20260706-0002',
      waveType: 'SYSTEM',
      carrier: '顺丰速运',
      route: '北京同城华东线',
      status: 'PICKING',
      remark: '正在分配拣货员中',
      orderIds: ['SO20260706-0004'],
      items: [
        { productCode: 'SKU004', productName: '得力多功能计算器', productSpec: '十二位液晶大屏', unit: '台', recommendLocation: 'LOC-B02', qtyRequired: 10, qtyPicked: 0, qtyChecked: 0, status: 'PENDING' }
      ],
      pickerId: 'Picker02',
      createdAt: '2026-07-06 11:00:00',
      createdBy: 'WmsScheduler'
    }
  ]);

  // 10. 包裹记录
  await db.pkg_records.bulkPut([
    { id: 'PKG20260701-000001', waveId: 'WAVE20260701-0001', weight: 1.25, trackingNumber: 'SF1234567890', status: 'SHIPPED', createdAt: '2026-07-01 10:00:00' },
    { id: 'PKG20260701-000002', waveId: 'WAVE20260701-0001', weight: 0.85, trackingNumber: 'SF1234567891', status: 'SHIPPED', createdAt: '2026-07-01 10:05:00' }
  ]);

  // 11. 库存流水 FL (≥10条，覆盖采购入库/销售出库/零售/调拨/报损)
  await db.inventory_flows.bulkPut([
    { id: 'FL20260701-00000001', timestamp: '2026-07-01 10:00:00', warehouseCode: 'WH001', warehouseName: '北京主仓', productCode: 'SKU001', productName: '双鸭牌标准型回形针', productSpec: '100枚/盒', unit: '盒', flowType: '采购入库', qtyChange: 100, qtyAfter: 100, sourceOrderId: 'RCV20260701-0001', operator: 'WmsOperator01' },
    { id: 'FL20260701-00000002', timestamp: '2026-07-01 10:15:00', warehouseCode: 'WH001', warehouseName: '北京主仓', productCode: 'SKU003', productName: '强盛定制纯木浆A4复印纸', productSpec: '80g 500张/包', unit: '包', flowType: '采购入库', qtyChange: 50, qtyAfter: 50, sourceOrderId: 'RCV20260701-0001', operator: 'WmsOperator01' },
    { id: 'FL20260701-00000003', timestamp: '2026-07-01 11:30:00', warehouseCode: 'WH001', warehouseName: '北京主仓', productCode: 'SKU001', productName: '双鸭牌标准型回形针', productSpec: '100枚/盒', unit: '盒', flowType: '销售出库', qtyChange: -70, qtyAfter: 30, sourceOrderId: 'WAVE20260701-0001', operator: 'Picker01' },
    { id: 'FL20260702-00000001', timestamp: '2026-07-02 14:00:00', warehouseCode: 'WH002', warehouseName: '上海分仓', productCode: 'SKU006', productName: '金士顿64GB高速U盘', productSpec: 'USB 3.2 金属机身', unit: '个', flowType: '采购入库', qtyChange: 15, qtyAfter: 15, sourceOrderId: 'RCV20260702-0001', operator: 'WmsOperator01' },
    { id: 'FL20260702-00000002', timestamp: '2026-07-02 14:05:00', warehouseCode: 'WH002', warehouseName: '上海分仓', productCode: 'SKU007', productName: '公牛插线板3米5位插孔', productSpec: '全长3米 带独立开关', unit: '个', flowType: '采购入库', qtyChange: 5, qtyAfter: 5, sourceOrderId: 'RCV20260702-0001', operator: 'WmsOperator01' },
    { id: 'FL20260703-00000001', timestamp: '2026-07-03 09:30:00', warehouseCode: 'WH001', warehouseName: '北京主仓', productCode: 'SKU002', productName: '晨光按动式中性笔黑色', productSpec: '0.5mm', unit: '支', flowType: '零售出库', qtyChange: -20, qtyAfter: 30, sourceOrderId: 'RET20260703-0001', operator: 'Admin' },
    { id: 'FL20260704-00000001', timestamp: '2026-07-04 11:00:00', warehouseCode: 'WH001', warehouseName: '北京主仓', productCode: 'SKU001', productName: '双鸭牌标准型回形针', productSpec: '100枚/盒', unit: '盒', flowType: '调拨出库', qtyChange: -10, qtyAfter: 20, sourceOrderId: 'TR20260704-0001', operator: 'Admin' },
    { id: 'FL20260704-00000002', timestamp: '2026-07-04 15:45:00', warehouseCode: 'WH002', warehouseName: '上海分仓', productCode: 'SKU001', productName: '双鸭牌标准型回形针', productSpec: '100枚/盒', unit: '盒', flowType: '调拨入库', qtyChange: 10, qtyAfter: 10, sourceOrderId: 'TR20260704-0001', operator: 'Admin' },
    { id: 'FL20260705-00000001', timestamp: '2026-07-05 14:00:00', warehouseCode: 'WH001', warehouseName: '北京主仓', productCode: 'SKU003', productName: '强盛定制纯木浆A4复印纸', productSpec: '80g 500张/包', unit: '包', flowType: '报损', qtyChange: -5, qtyAfter: 45, sourceOrderId: 'BL20260705-0001', operator: 'Admin' },
    { id: 'FL20260705-00000002', timestamp: '2026-07-05 16:30:00', warehouseCode: 'WH001', warehouseName: '北京主仓', productCode: 'SKU001', productName: '双鸭牌标准型回形针', productSpec: '100枚/盒', unit: '盒', flowType: '盘盈', qtyChange: 5, qtyAfter: 25, sourceOrderId: 'CK20260705-0001', operator: 'Admin' },
    { id: 'FL20260706-00000001', timestamp: '2026-07-06 10:30:00', warehouseCode: 'WH002', warehouseName: '上海分仓', productCode: 'SKU003', productName: '强盛定制纯木浆A4复印纸', productSpec: '80g 500张/包', unit: '包', flowType: '上架确认', qtyChange: 20, qtyAfter: 35, sourceOrderId: 'RCV20260706-0001', operator: 'WmsOperator01' },
    { id: 'FL20260706-00000002', timestamp: '2026-07-06 10:30:00', warehouseCode: 'WH002', warehouseName: '上海分仓', productCode: 'SKU004', productName: '得力多功能计算器', productSpec: '十二位液晶大屏', unit: '台', flowType: '上架确认', qtyChange: 10, qtyAfter: 110, sourceOrderId: 'RCV20260706-0001', operator: 'WmsOperator01' }
  ]);

  console.log('IndexedDB 种子数据初始化成功！');
}
