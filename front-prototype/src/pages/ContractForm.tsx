import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { db } from '../db';
import { ChevronLeft, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ContractForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  // 表单字段状态
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [oppId, setOppId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // 1. 动态加载可签约商机
  const [availableOpps, setAvailableOpps] = useState<{ id: string; title: string; customerId: string; customerName: string; amount?: number }[]>([]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    db.opportunities.toArray().then(allOpps => {
      db.contracts.toArray().then(allContracts => {
        const boundOppIds = allContracts
          .filter(c => c.status !== 'VOIDED' && c.id !== id)
          .map(c => c.oppId);

        const filtered = allOpps.filter(opp => 
          opp.status === 'CONTRACT' && !boundOppIds.includes(opp.id)
        );
        setAvailableOpps(filtered);
      });
    });
  }, [id]);

  // 2. 加载已有数据 (编辑态)
  useEffect(() => {
    if (isEdit && id) {
      db.contracts.get(id).then(ct => {
        if (ct) {
          setTitle(ct.title);
          setAmount(String(ct.amount));
          setOppId(ct.oppId);
          setCustomerId(ct.customerId);
          setCustomerName(ct.customerName);

          if (ct.status !== 'DRAFT') {
            showToast('该合同已提交签署，处于只读状态', 'error');
            navigate('/contracts');
          }
        }
      });
    } else {
      const stateOppId = (location.state as any)?.defaultOppId;
      const stateCustId = (location.state as any)?.defaultCustomerId;
      if (stateOppId && stateCustId) {
        setOppId(stateOppId);
        setCustomerId(stateCustId);
        db.opportunities.get(stateOppId).then(opp => {
          if (opp) {
            setCustomerName(opp.customerName);
            setAmount(opp.amount ? String(opp.amount) : '');
            setTitle(`${opp.customerName} - ${opp.title}销售合同`);
          }
        });
      }
    }
  }, [isEdit, id, location.state, navigate]);

  const handleOppChange = (selectedId: string) => {
    setOppId(selectedId);
    const opp = availableOpps.find(o => o.id === selectedId);
    if (opp) {
      setCustomerId(opp.customerId);
      setCustomerName(opp.customerName);
      setAmount(opp.amount ? String(opp.amount) : '');
      setTitle(`${opp.customerName} - ${opp.title}销售合同`);
    } else {
      setCustomerId('');
      setCustomerName('');
      setTitle('');
    }
  };

  const generateContractId = async () => {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await db.contracts.count();
    const indexStr = String(count + 1).padStart(4, '0');
    return `CT${todayStr}-${indexStr}`;
  };

  // 保存或提交
  const handleSave = async (submitToSign: boolean) => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = '请输入合同名称';
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) newErrors.amount = '请输入合法金额';
    if (!oppId) newErrors.oppId = '请选择可签约的关联商机';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('请完善合同表单必填信息', 'error');
      return;
    }

    setLoading(true);
    try {
      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const contractAmount = Number(amount);
      const opp = availableOpps.find(o => o.id === oppId) || { title: '' };

      if (isEdit && id) {
        await db.contracts.update(id, {
          title,
          amount: contractAmount,
          oppId,
          oppTitle: opp.title,
          customerId,
          customerName,
          status: submitToSign ? 'PENDING_SIGN' : 'DRAFT',
          updatedAt: nowStr
        });
      } else {
        const newId = await generateContractId();
        await db.contracts.add({
          id: newId,
          title,
          amount: contractAmount,
          oppId,
          oppTitle: opp.title,
          customerId,
          customerName,
          status: submitToSign ? 'PENDING_SIGN' : 'DRAFT',
          createdAt: nowStr,
          createdBy: '张三'
        });

        await db.opportunities.update(oppId, {
          contractNo: newId,
          updatedAt: nowStr
        });
      }

      showToast(submitToSign ? '合同提交签署成功，已通知各方' : '合同草稿保存成功');
      setTimeout(() => navigate('/contracts'), 800);
    } catch (err) {
      showToast('数据库写入失败，请重试', 'error');
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

      {/* 顶部面包屑与导航 */}
      <div className="flex items-center gap-3">
        <Button 
          variant="outline"
          size="icon"
          onClick={() => navigate('/contracts')}
          className="h-8 w-8"
        >
          <ChevronLeft size={16} />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-slate-900">{isEdit ? '编辑合同' : '新建签署合同'}</h1>
          <p className="text-xs text-slate-500">商机推进到 CONTRACT 阶段启动的电子归结契约</p>
        </div>
      </div>

      {/* 主表单卡片 */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-sm font-semibold">合同基本信息</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* 关联商机 */}
          <div>
            <Label className="block mb-2">
              关联商机 <span className="text-red-500">*</span>
            </Label>
            {isEdit ? (
              <Input 
                value={availableOpps.find(o => o.id === oppId)?.title || oppId}
                disabled
                className="bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            ) : (
              <select
                value={oppId}
                onChange={(e) => handleOppChange(e.target.value)}
                className={`w-full h-9 px-3 text-xs bg-white border rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  errors.oppId ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'
                }`}
              >
                <option value="">-- 选择待签商机 (仅列出处于 CONTRACT 阶段的商机) --</option>
                {availableOpps.map(opp => (
                  <option key={opp.id} value={opp.id}>[{opp.id}] {opp.title}</option>
                ))}
              </select>
            )}
            {errors.oppId && <p className="text-[11px] text-red-500 block mt-1">{errors.oppId}</p>}
          </div>

          {/* 关联客户 */}
          <div>
            <Label className="block mb-2">关联客户</Label>
            <Input 
              value={customerName ? `[${customerId}] ${customerName}` : '（选择商机后自动继承带出）'}
              disabled
              className="bg-slate-50 text-slate-500 cursor-not-allowed"
            />
            <p className="text-[11px] text-slate-400 mt-1 italic">💡 客户快照从所选商机中自动继承只读，CRM 确保合同与商机客户主体一致（SSOT）。</p>
          </div>

          {/* 合同名称 */}
          <div>
            <Label htmlFor="title" className="block mb-2">
              合同名称 <span className="text-red-500">*</span>
            </Label>
            <Input 
              id="title"
              placeholder="请输入合同官方合同文件全称..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-[11px] text-red-500 block mt-1">{errors.title}</p>}
          </div>

          {/* 合同金额 */}
          <div>
            <Label htmlFor="amount" className="block mb-2">
              合同最终签约金额 (元) <span className="text-red-500">*</span>
            </Label>
            <Input 
              id="amount"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`font-mono ${errors.amount ? 'border-red-500' : ''}`}
            />
            {errors.amount && <p className="text-[11px] text-red-500 block mt-1">{errors.amount}</p>}
          </div>
        </CardContent>
      </Card>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 py-3.5 px-6 shadow-sm flex justify-end gap-2 lg:pl-[220px]">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/contracts')}
        >
          返回列表
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => handleSave(false)}
        >
          保存为草稿
        </Button>

        <Button
          size="sm"
          disabled={loading}
          onClick={() => handleSave(true)}
        >
          提交并发起签署
        </Button>
      </div>
    </div>
  );
}
