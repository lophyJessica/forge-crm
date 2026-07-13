export type DamageStatus = 'DRAFT' | 'PENDING_REVIEW' | 'CONFIRMED' | 'VOIDED' | 'REJECTED';
export type DamageReason = 'TRANSFER_LOSS' | 'DAMAGED' | 'EXPIRED' | 'SHORTAGE';

export interface DamageItem {
  id: string;
  productCode: string;
  productName: string;
  productSpec: string;
  unit: string;
  currentQty: number;
  damageQty: number;
  sourceLineId?: string;
}

export interface DamageOrder {
  id: string;
  warehouseCode: string;
  warehouseName: string;
  reason: DamageReason;
  status: DamageStatus;
  itemCount: number;
  totalQty: number;
  remark?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
  sourceType?: 'MANUAL' | 'TRANSFER_DIFF';
  sourceTransferNo?: string;
  writeOffFlowNos?: string[];
  rejectedReason?: string;
  items: DamageItem[];
}

export const DAMAGE_STATUS_LABELS: Record<DamageStatus, string> = {
  DRAFT: '草稿',
  PENDING_REVIEW: '待审核',
  CONFIRMED: '已确认',
  VOIDED: '已作废',
  REJECTED: '已驳回',
};

export const DAMAGE_REASON_LABELS: Record<DamageReason, string> = {
  TRANSFER_LOSS: '调拨损耗',
  DAMAGED: '损坏',
  EXPIRED: '过期',
  SHORTAGE: '短少',
};
