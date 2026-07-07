import { db } from '../db';
import {
  BaseDataStatus,
  LocationArchive,
  Warehouse,
  WarehouseType,
  Zone,
  ZoneType,
} from '../types/baseData';

const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

const normalizeKeyword = (value?: string) => value?.trim().toLowerCase();

export const baseDataApi = {
  async getWarehouses(filters: {
    keyword?: string;
    type?: WarehouseType | '';
    status?: BaseDataStatus | 'ALL';
    activeOnly?: boolean;
  } = {}): Promise<Warehouse[]> {
    let list = await db.warehouses.toArray();
    const keyword = normalizeKeyword(filters.keyword);

    if (keyword) {
      list = list.filter(item =>
        item.code.toLowerCase().includes(keyword) ||
        item.name.toLowerCase().includes(keyword) ||
        item.manager.toLowerCase().includes(keyword)
      );
    }
    if (filters.type) {
      list = list.filter(item => item.type === filters.type);
    }
    if (filters.activeOnly) {
      list = list.filter(item => item.status === 'ENABLED');
    } else if (filters.status && filters.status !== 'ALL') {
      list = list.filter(item => item.status === filters.status);
    }

    return list.sort((a, b) => a.code.localeCompare(b.code));
  },

  async getWarehouseByCode(code: string): Promise<Warehouse | undefined> {
    return db.warehouses.get(code);
  },

  async saveWarehouse(payload: {
    originalCode?: string;
    code: string;
    name: string;
    type: WarehouseType;
    manager: string;
    address: string;
    remark?: string;
  }) {
    const code = payload.code.trim().toUpperCase();
    if (!code) throw new Error('仓库编码不能为空');
    if (!payload.name.trim()) throw new Error('仓库名称不能为空');

    if (payload.originalCode && payload.originalCode !== code) {
      throw new Error('仓库编码为主数据唯一标识，编辑时不允许变更');
    }

    const existing = await db.warehouses.get(code);
    const timestamp = now();
    if (!payload.originalCode && existing) {
      throw new Error('仓库编码已存在，请更换编码');
    }

    const data: Warehouse = {
      code,
      name: payload.name.trim(),
      type: payload.type,
      manager: payload.manager.trim(),
      address: payload.address.trim(),
      remark: payload.remark?.trim(),
      status: existing?.status || 'ENABLED',
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp,
    };

    await db.warehouses.put(data);
  },

  async setWarehouseStatus(code: string, status: BaseDataStatus) {
    const warehouse = await db.warehouses.get(code);
    if (!warehouse) throw new Error('仓库档案不存在');
    await db.warehouses.update(code, { status, updatedAt: now() });
  },

  async getZones(filters: {
    keyword?: string;
    warehouseCode?: string;
    type?: ZoneType | '';
    status?: BaseDataStatus | 'ALL';
    activeOnly?: boolean;
  } = {}): Promise<Zone[]> {
    let list = await db.zones.toArray();
    const keyword = normalizeKeyword(filters.keyword);

    if (keyword) {
      list = list.filter(item =>
        item.code.toLowerCase().includes(keyword) ||
        item.name.toLowerCase().includes(keyword) ||
        item.warehouseName.toLowerCase().includes(keyword)
      );
    }
    if (filters.warehouseCode) {
      list = list.filter(item => item.warehouseCode === filters.warehouseCode);
    }
    if (filters.type) {
      list = list.filter(item => item.type === filters.type);
    }
    if (filters.activeOnly) {
      const activeWarehouses = await db.warehouses.where('status').equals('ENABLED').toArray();
      const activeWarehouseCodes = new Set(activeWarehouses.map(item => item.code));
      list = list.filter(item =>
        item.status === 'ENABLED' &&
        activeWarehouseCodes.has(item.warehouseCode)
      );
    } else if (filters.status && filters.status !== 'ALL') {
      list = list.filter(item => item.status === filters.status);
    }

    return list.sort((a, b) => a.code.localeCompare(b.code));
  },

  async getZoneByCode(code: string): Promise<Zone | undefined> {
    return db.zones.get(code);
  },

  async saveZone(payload: {
    originalCode?: string;
    code: string;
    name: string;
    warehouseCode: string;
    type: ZoneType;
  }) {
    const code = payload.code.trim().toUpperCase();
    if (!code) throw new Error('库区编码不能为空');
    if (!payload.name.trim()) throw new Error('库区名称不能为空');
    if (!payload.warehouseCode) throw new Error('所属仓库不能为空');

    if (payload.originalCode && payload.originalCode !== code) {
      throw new Error('库区编码为主数据唯一标识，编辑时不允许变更');
    }

    const warehouse = await db.warehouses.get(payload.warehouseCode);
    if (!warehouse || warehouse.status !== 'ENABLED') {
      throw new Error('所属仓库不存在或已停用');
    }

    const existing = await db.zones.get(code);
    const timestamp = now();
    if (!payload.originalCode && existing) {
      throw new Error('库区编码已存在，请更换编码');
    }

    const data: Zone = {
      code,
      name: payload.name.trim(),
      warehouseCode: warehouse.code,
      warehouseName: warehouse.name,
      type: payload.type,
      status: existing?.status || 'ENABLED',
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp,
    };

    await db.zones.put(data);
  },

  async setZoneStatus(code: string, status: BaseDataStatus) {
    const zone = await db.zones.get(code);
    if (!zone) throw new Error('库区档案不存在');
    await db.zones.update(code, { status, updatedAt: now() });
  },

  async getLocations(filters: {
    keyword?: string;
    warehouseCode?: string;
    zoneCode?: string;
    status?: BaseDataStatus | 'ALL';
    activeOnly?: boolean;
  } = {}): Promise<LocationArchive[]> {
    let list = await db.locations.toArray();
    const keyword = normalizeKeyword(filters.keyword);

    if (keyword) {
      list = list.filter(item =>
        item.code.toLowerCase().includes(keyword) ||
        item.barcode.toLowerCase().includes(keyword) ||
        item.warehouseName.toLowerCase().includes(keyword) ||
        item.zoneName.toLowerCase().includes(keyword)
      );
    }
    if (filters.warehouseCode) {
      list = list.filter(item => item.warehouseCode === filters.warehouseCode);
    }
    if (filters.zoneCode) {
      list = list.filter(item => item.zoneCode === filters.zoneCode);
    }
    if (filters.activeOnly) {
      const [activeWarehouses, activeZones] = await Promise.all([
        db.warehouses.where('status').equals('ENABLED').toArray(),
        db.zones.where('status').equals('ENABLED').toArray(),
      ]);
      const activeWarehouseCodes = new Set(activeWarehouses.map(item => item.code));
      const activeZoneCodes = new Set(activeZones.map(item => item.code));
      list = list.filter(item =>
        item.status === 'ENABLED' &&
        activeWarehouseCodes.has(item.warehouseCode) &&
        activeZoneCodes.has(item.zoneCode)
      );
    } else if (filters.status && filters.status !== 'ALL') {
      list = list.filter(item => item.status === filters.status);
    }

    return list.sort((a, b) => a.code.localeCompare(b.code));
  },

  async getLocationByCode(code: string): Promise<LocationArchive | undefined> {
    return db.locations.get(code);
  },

  async saveLocation(payload: {
    originalCode?: string;
    code: string;
    warehouseCode: string;
    zoneCode: string;
    barcode: string;
  }) {
    const code = payload.code.trim().toUpperCase();
    if (!code) throw new Error('货位编码不能为空');
    if (!payload.warehouseCode) throw new Error('所属仓库不能为空');
    if (!payload.zoneCode) throw new Error('所属库区不能为空');

    if (payload.originalCode && payload.originalCode !== code) {
      throw new Error('货位编码为主数据唯一标识，编辑时不允许变更');
    }

    const warehouse = await db.warehouses.get(payload.warehouseCode);
    if (!warehouse || warehouse.status !== 'ENABLED') {
      throw new Error('所属仓库不存在或已停用');
    }

    const zone = await db.zones.get(payload.zoneCode);
    if (!zone || zone.status !== 'ENABLED' || zone.warehouseCode !== warehouse.code) {
      throw new Error('所属库区不存在、已停用或与仓库不匹配');
    }

    const existing = await db.locations.get(code);
    const timestamp = now();
    if (!payload.originalCode && existing) {
      throw new Error('货位编码已存在，请更换编码');
    }

    const data: LocationArchive = {
      code,
      warehouseCode: warehouse.code,
      warehouseName: warehouse.name,
      zoneCode: zone.code,
      zoneName: zone.name,
      barcode: payload.barcode.trim() || code,
      status: existing?.status || 'ENABLED',
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp,
    };

    await db.locations.put(data);
  },

  async setLocationStatus(code: string, status: BaseDataStatus) {
    const location = await db.locations.get(code);
    if (!location) throw new Error('货位档案不存在');
    await db.locations.update(code, { status, updatedAt: now() });
  },
};
