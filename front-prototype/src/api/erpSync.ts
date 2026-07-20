import Dexie, { type Table } from 'dexie';

export interface ErpCustomer {
  id: string;
  code: string;
  name: string;
  contact: string;
  phone: string;
  priceLevel: '一级' | '二级' | '三级';
  creditLimit: number;
  paymentPeriod: number;
  status: 'active' | 'inactive';
  remark?: string;
}

class ErpDb extends Dexie {
  customers!: Table<ErpCustomer, string>;

  constructor() {
    // Must stay aligned with forge-erp/front-prototype/src/db/index.ts.
    super('qs_inventory_db');

    this.version(1).stores({
      purchaseOrders: 'id',
      stockInRecords: 'id,purchaseOrderId,status,stockInDate',
      purchaseOrderStockInRecords: 'id,purchaseOrderId',
      purchaseReturns: 'id,sourceStockInId,status,returnDate',
      returnOutbounds: 'id,sourceReturnId,status,outboundDate',
      suppliers: 'id,code,status',
      customers: 'id,code,status',
      products: 'id,code,status',
      warehouses: 'id,code,status',
      inventoryFlows: 'id,sourceId,warehouseCode,productCode,changeType,createdAt',
      instantStocks: 'id,warehouseCode,productCode,batchNo',
      accountsPayable: 'id,stockInId,status,createdAt'
    });

    this.version(2).stores({
      purchaseOrders: 'id',
      stockInRecords: 'id,purchaseOrderId,status,stockInDate',
      purchaseOrderStockInRecords: 'id,purchaseOrderId',
      purchaseReturns: 'id,sourceStockInId,status,returnDate',
      returnOutbounds: 'id,sourceReturnId,status,outboundDate',
      salesOrders: 'id,status,customerCode,orderDate',
      salesOutbounds: 'id,salesOrderId,status,outboundDate',
      suppliers: 'id,code,status',
      customers: 'id,code,status',
      products: 'id,code,status',
      warehouses: 'id,code,status',
      inventoryFlows: 'id,sourceId,warehouseCode,productCode,changeType,createdAt',
      instantStocks: 'id,warehouseCode,productCode,batchNo',
      accountsPayable: 'id,stockInId,status,createdAt',
      accountsReceivable: 'id,salesOutboundId,status,createdAt'
    });

    this.version(3).stores({
      purchaseOrders: 'id',
      stockInRecords: 'id,purchaseOrderId,status,stockInDate',
      purchaseOrderStockInRecords: 'id,purchaseOrderId',
      purchaseReturns: 'id,sourceStockInId,status,returnDate',
      returnOutbounds: 'id,sourceReturnId,status,outboundDate',
      salesOrders: 'id,status,customerCode,orderDate',
      salesOutbounds: 'id,salesOrderId,status,outboundDate',
      retailOrders: 'id,cashierName,paymentMethod,checkoutAt',
      suppliers: 'id,code,status',
      customers: 'id,code,status',
      products: 'id,code,status',
      warehouses: 'id,code,status',
      inventoryFlows: 'id,sourceId,warehouseCode,productCode,changeType,createdAt',
      instantStocks: 'id,warehouseCode,productCode,batchNo',
      accountsPayable: 'id,stockInId,status,createdAt',
      accountsReceivable: 'id,salesOutboundId,retailOrderId,status,createdAt'
    });

    this.version(4).stores({
      purchaseOrders: 'id',
      stockInRecords: 'id,purchaseOrderId,status,stockInDate',
      purchaseOrderStockInRecords: 'id,purchaseOrderId',
      purchaseReturns: 'id,sourceStockInId,status,returnDate',
      returnOutbounds: 'id,sourceReturnId,status,outboundDate',
      salesOrders: 'id,status,customerCode,orderDate',
      salesOutbounds: 'id,salesOrderId,status,outboundDate',
      retailOrders: 'id,cashierName,paymentMethod,checkoutAt',
      suppliers: 'id,code,status',
      customers: 'id,code,status',
      products: 'id,code,status',
      warehouses: 'id,code,status',
      inventoryFlows: 'id,sourceId,warehouseCode,productCode,changeType,createdAt',
      instantStocks: 'id,warehouseCode,productCode,batchNo',
      accountsPayable: 'id,stockInId,sourceNo,supplierCode,status,createdAt',
      accountsReceivable: 'id,salesOutboundId,retailOrderId,sourceNo,customerCode,status,createdAt',
      receiptRecords: 'id,customerCode,sourceNo,receiptDate',
      paymentRecords: 'id,supplierCode,sourceNo,paymentDate'
    });

    this.version(5).stores({
      purchaseOrders: 'id',
      stockInRecords: 'id,purchaseOrderId,status,stockInDate',
      purchaseOrderStockInRecords: 'id,purchaseOrderId',
      purchaseReturns: 'id,sourceStockInId,status,returnDate',
      returnOutbounds: 'id,sourceReturnId,status,outboundDate',
      salesOrders: 'id,status,customerCode,orderDate',
      salesOutbounds: 'id,salesOrderId,status,outboundDate',
      salesReturns: 'id,sourceOutboundId,status,returnDate',
      retailOrders: 'id,cashierName,paymentMethod,checkoutAt',
      retailReturns: 'id,sourceRetailOrderId,returnDate',
      suppliers: 'id,code,status',
      customers: 'id,code,status',
      products: 'id,code,status',
      warehouses: 'id,code,status',
      inventoryFlows: 'id,sourceId,warehouseCode,productCode,changeType,createdAt',
      instantStocks: 'id,warehouseCode,productCode,batchNo',
      accountsPayable: 'id,stockInId,sourceNo,supplierCode,status,createdAt',
      accountsReceivable: 'id,salesOutboundId,retailOrderId,sourceNo,customerCode,status,createdAt',
      receiptRecords: 'id,customerCode,sourceNo,receiptDate',
      paymentRecords: 'id,supplierCode,sourceNo,paymentDate'
    });

    this.version(6).stores({
      purchaseOrders: 'id',
      stockInRecords: 'id,purchaseOrderId,status,stockInDate',
      purchaseOrderStockInRecords: 'id,purchaseOrderId',
      purchaseReturns: 'id,sourceStockInId,status,returnDate',
      returnOutbounds: 'id,sourceReturnId,status,outboundDate',
      salesOrders: 'id,status,customerCode,orderDate',
      salesOutbounds: 'id,salesOrderId,status,outboundDate',
      salesReturns: 'id,sourceOutboundId,status,returnDate',
      retailOrders: 'id,cashierName,paymentMethod,checkoutAt',
      retailReturns: 'id,sourceRetailOrderId,returnDate',
      suppliers: 'id,code,status',
      customers: 'id,code,status',
      products: 'id,code,status',
      warehouses: 'id,code,status',
      inventoryFlows: 'id,sourceId,warehouseCode,productCode,changeType,createdAt',
      instantStocks: 'id,warehouseCode,productCode,batchNo',
      accountsPayable: 'id,stockInId,sourceNo,supplierCode,status,createdAt',
      accountsReceivable: 'id,salesOutboundId,retailOrderId,sourceNo,customerCode,status,createdAt',
      receiptRecords: 'id,customerCode,sourceNo,receiptDate',
      paymentRecords: 'id,supplierCode,sourceNo,paymentDate',
      rfqs: 'id,status,deadline,createdAt'
    });
  }
}

const erpDb = new ErpDb();

/**
 * 辅助读取 ERP 的客户列表
 */
export async function getErpCustomers() {
  return erpDb.customers.toArray();
}

/**
 * 往 ERP customers 写入新客户记录
 */
export async function addCustomerToErp(customer: ErpCustomer) {
  return erpDb.customers.add(customer);
}

export { erpDb };
