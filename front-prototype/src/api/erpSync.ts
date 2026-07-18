import Dexie from 'dexie';

const erpDb = new Dexie('forge_erp_db');

/**
 * 辅助读取 ERP 的客户列表
 */
export async function getErpCustomers() {
  if (!erpDb.isOpen()) {
    await erpDb.open();
  }
  return await erpDb.table('customers').toArray();
}

/**
 * 往 erp_db.customers 写入新客户记录
 */
export async function addCustomerToErp(c: any) {
  if (!erpDb.isOpen()) {
    await erpDb.open();
  }
  return await erpDb.table('customers').add(c);
}

export { erpDb };