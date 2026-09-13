import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../db';
import { ChevronLeft, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { shanghaiMonth, shanghaiNow } from '@/domain/businessRules';

const salesOptions = [
  { name: '张三', id: 'S001' },
  { name: '李四', id: 'S002' },
  { name: '王五', id: 'S003' }
];

export default function TargetForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  // 表单字段
  const [salesName, setSalesName] = useState('张三');
  const [month, setMonth] = useState(shanghaiMonth());
  const [leadTarget, setLeadTarget] = useState('');
  const [oppTarget, setOppTarget] = useState('');
  const [amountTarget, setAmountTarget] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (!id) return;
    db.targets.get(id).then(target => {
      if (!target) return;
      if (target.month < shanghaiMonth() || target.status !== 'ACTIVE' || !['NOT_STARTED', undefined].includes(target.settlementStatus)) {
        showToast('仅进行中且尚未结算的目标可调整', 'error');
        navigate('/targets');
        return;
      }
      setSalesName(target.salesName);
      setMonth(target.month);
      setLeadTarget(String(target.leadTarget));
      setOppTarget(String(target.oppTarget));
      setAmountTarget(String(target.amountTarget));
    });
  }, [id, navigate]);

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    if (!month) newErrors.month = '请选择目标月份';
    
    const leadNum = Number(leadTarget);
    if (leadTarget === '' || isNaN(leadNum) || leadNum < 0 || leadNum > 999999 || !Number.isInteger(leadNum)) {
      newErrors.leadTarget = '请输入0-999999之间的整数';
    }

    const oppNum = Number(oppTarget);
    if (oppTarget === '' || isNaN(oppNum) || oppNum < 0 || oppNum > 999999 || !Number.isInteger(oppNum)) {
      newErrors.oppTarget = '请输入0-999999之间的整数';
    }

    const amtNum = Number(amountTarget);
    if (amountTarget === '' || !/^\d+(\.\d{1,2})?$/.test(amountTarget) || isNaN(amtNum) || amtNum < 0 || amtNum > 1_000_000_000_000) {
      newErrors.amountTarget = '请输入0-1万亿元、最多两位小数的普通数字';
    }
    if (isEdit && adjustmentReason.trim().length < 10) newErrors.adjustmentReason = '调整原因至少填写10个字';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('表单有必填项未通过校验', 'error');
      return;
    }

    setLoading(true);
    try {
      const cleanMonth = month.replace('-', '');
      const salesId = salesOptions.find(o => o.name === salesName)?.id || 'S999';
      const targetId = `TGT${cleanMonth}-${salesId}`;

      const existing = await db.targets.get(id || targetId);
      if (!isEdit && existing) {
        showToast('该销售代表在当前月份的业绩目标已设定，请勿重复创建！', 'error');
        setLoading(false);
        return;
      }

      const nowStr = shanghaiNow();

      if (isEdit && existing) {
        await db.targets.update(existing.id, {
          leadTarget: leadNum,
          oppTarget: oppNum,
          amountTarget: amtNum,
          adjustmentCount: (existing.adjustmentCount || 0) + 1,
          lastAdjustmentReason: adjustmentReason.trim(),
          version: (existing.version || 0) + 1,
          updatedAt: nowStr,
        });
        showToast('业绩目标已调整并记录原因');
      } else {
        await db.targets.add({
          id: targetId,
          salesId,
          salesName,
          month,
          leadTarget: leadNum,
          oppTarget: oppNum,
          amountTarget: amtNum,
          status: 'ACTIVE',
          settlementStatus: 'NOT_STARTED',
          version: 1,
          adjustmentCount: 0,
          createdAt: nowStr,
          createdBy: '系统主管',
        });
        showToast('业绩目标设定成功！');
      }
      setTimeout(() => navigate('/targets'), 800);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '保存失败，请刷新重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-2xl mx-auto">
      {/* 顶部 Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800">
          {toastMessage.type === 'success' ? <CheckCircle size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 导航标题 */}
      <div className="flex items-center gap-3" data-anno="target-form-page-header">
        <Button 
          variant="outline"
          size="icon"
          onClick={() => navigate('/targets')}
          className="h-8 w-8"
        >
          <ChevronLeft size={16} />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-slate-900">{isEdit ? '调整业绩目标' : '设定业绩目标'}</h1>
          <p className="text-xs text-slate-500">赢单金额仅按 CRM WON 口径；数量与金额目标允许设置为0</p>
        </div>
      </div>

      {/* 表单卡片 */}
      <Card data-anno="target-form-basic">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-sm font-semibold">业绩目标指标设定</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* 销售代表 & 目标月份 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="block mb-2">
                销售代表 <span className="text-red-500">*</span>
              </Label>
              <select
                value={salesName}
                disabled={isEdit}
                onChange={(e) => setSalesName(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {salesOptions.map(opt => (
                  <option key={opt.id} value={opt.name}>{opt.name} ({opt.id})</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="month" className="block mb-2">
                目标考核月份 <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="month"
                type="month"
                value={month}
                disabled={isEdit}
                onChange={(e) => setMonth(e.target.value)}
                className={errors.month ? 'border-red-500' : ''}
              />
              {errors.month && <p className="text-[11px] text-red-500 block mt-1">{errors.month}</p>}
            </div>
          </div>

          {/* 考核线索数 */}
          <div>
            <Label htmlFor="leadTarget" className="block mb-2">
              转化线索目标数量 (个) <span className="text-red-500">*</span>
            </Label>
            <Input 
              id="leadTarget"
              type="number" 
              min="0"
              max="999999"
              placeholder="请输入线索转化目标 KPI 额度"
              value={leadTarget}
              onChange={(e) => setLeadTarget(e.target.value)}
              className={errors.leadTarget ? 'border-red-500' : ''}
            />
            {errors.leadTarget && <p className="text-[11px] text-red-500 block mt-1">{errors.leadTarget}</p>}
          </div>

          {/* 考核商机数 */}
          <div>
            <Label htmlFor="oppTarget" className="block mb-2">
              新增商机目标数量 (个) <span className="text-red-500">*</span>
            </Label>
            <Input 
              id="oppTarget"
              type="number" 
              min="0"
              max="999999"
              placeholder="请输入新增商机目标 KPI 额度"
              value={oppTarget}
              onChange={(e) => setOppTarget(e.target.value)}
              className={errors.oppTarget ? 'border-red-500' : ''}
            />
            {errors.oppTarget && <p className="text-[11px] text-red-500 block mt-1">{errors.oppTarget}</p>}
          </div>

          {/* 考核赢单金额 */}
          <div>
            <Label htmlFor="amountTarget" className="block mb-2">
              最终赢单金额目标 (元) <span className="text-red-500">*</span>
            </Label>
            <Input 
              id="amountTarget"
              type="text" 
              inputMode="decimal"
              placeholder="请输入赢单目标金额"
              value={amountTarget}
              onChange={(e) => setAmountTarget(e.target.value)}
              className={`font-mono ${errors.amountTarget ? 'border-red-500' : ''}`}
            />
            {errors.amountTarget && <p className="text-[11px] text-red-500 block mt-1">{errors.amountTarget}</p>}
          </div>

          {isEdit && (
            <div>
              <Label htmlFor="adjustmentReason" className="block mb-2">调整原因 <span className="text-red-500">*</span></Label>
              <Textarea
                id="adjustmentReason"
                rows={3}
                value={adjustmentReason}
                onChange={(event) => setAdjustmentReason(event.target.value)}
                placeholder="请输入至少10个字的调整原因，防止移动目标线"
                className={errors.adjustmentReason ? 'border-red-500' : ''}
              />
              {errors.adjustmentReason && <p className="text-[11px] text-red-500 mt-1">{errors.adjustmentReason}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 底部操作 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 py-3.5 px-6 shadow-sm flex justify-end gap-2 lg:pl-[220px]" data-anno="target-form-footer">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/targets')}
        >
          返回列表
        </Button>

        <Button
          size="sm"
          disabled={loading}
          onClick={handleSave}
        >
          {isEdit ? '确认调整' : '保存目标'}
        </Button>
      </div>
    </div>
  );
}
