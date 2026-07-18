import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { db } from '../db';
import { ChevronLeft, CheckCircle, XCircle } from 'lucide-react';

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

  // 1. 动态加载可签约商机 (处于 CONTRACT 阶段且没有绑定合同的，或者当前正在编辑的关联商机)
  const [availableOpps, setAvailableOpps] = useState<{ id: string; title: string; customerId: string; customerName: string; amount?: number }[]>([]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    // 拉取可以关联的商机列表
    db.opportunities.toArray().then(allOpps => {
      // 找出阶段为 CONTRACT 且没有合同编号的（或者是当前正在编辑的合同商机）
      db.contracts.toArray().then(allContracts => {
        const boundOppIds = allContracts
          .filter(c => c.status !== 'VOIDED' && c.id !== id) // 排除已作废的和当前的
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

          // 仅 DRAFT 态允许编辑，其余只读
          if (ct.status !== 'DRAFT') {
            showToast('该合同已提交签署，处于只读状态', 'error');
            navigate('/contracts');
          }
        }
      });
    } else {
      // 新建态，尝试从 route state 继承商机上下文
      const stateOppId = (location.state as any)?.defaultOppId;
      const stateCustId = (location.state as any)?.defaultCustomerId;
      if (stateOppId && stateCustId) {
        setOppId(stateOppId);
        setCustomerId(stateCustId);
        // 根据商机加载客户名和商机预计金额
        db.opportunities.get(stateOppId).then(opp => {
          if (opp) {
            setCustomerName(opp.customerName);
            setAmount(opp.amount ? String(opp.amount) : '');
            setTitle(`${opp.customerName} - ${opp.title}销售合同`);
          }
        });
      }
    }
  }, [isEdit, id, location.state]);

  // 3. 当销售在下拉列表中主动选择商机时，自动联动带出关联客户及默认合同名称
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
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const count = await db.contracts.count();
    const indexStr = String(count + 1).padStart(4, '0');
    return `CT${todayStr}-${indexStr}`;
  };

  // 4. 提交或保存
  const handleSave = async (submitToSign: boolean) => {
    // 校验必填
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
        // 编辑模式更新
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
        // 新建模式写入
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

        // 联动回写商机的合同编号 (CONTRACT阶段)
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
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg bg-white border border-slate-200 animate-slide-in text-xs font-bold text-slate-800">
          {toastMessage.type === 'success' ? <CheckCircle size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 顶部面包屑与导航 */}
      <div className="flex items-center gap-3">
        <button 
          type="button" 
          onClick={() => navigate('/contracts')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-650 bg-white hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex flex-col">
          <h1 className="text-lg font-black text-slate-800">{isEdit ? '编辑合同' : '新建签署合同'}</h1>
          <p className="text-[10px] text-slate-400">商机推进到 CONTRACT 阶段启动的电子归结契约</p>
        </div>
      </div>

      {/* 主表单 */}
      <form onSubmit={(e) => e.preventDefault()} className="forge-card space-y-4">
        
        {/* 关联商机 (仅新建状态可选) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-850">关联商机 <span className="text-red-500">*</span></label>
          {isEdit ? (
            <input 
              type="text" 
              value={availableOpps.find(o => o.id === oppId)?.title || oppId}
              disabled
              className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded text-slate-450 cursor-not-allowed"
            />
          ) : (
            <select
              value={oppId}
              onChange={(e) => handleOppChange(e.target.value)}
              className={`w-full h-9 px-3 text-xs bg-white border rounded text-slate-650 focus:outline-none focus:border-blue-500 ${
                errors.oppId ? 'border-red-500' : 'border-slate-200'
              }`}
            >
              <option value="">-- 选择待签商机 (仅列出处于 CONTRACT 阶段的商机) --</option>
              {availableOpps.map(opp => (
                <option key={opp.id} value={opp.id}>[{opp.id}] {opp.title}</option>
              ))}
            </select>
          )}
          {errors.oppId && <p className="text-[10px] text-red-500 font-bold">{errors.oppId}</p>}
        </div>

        {/* 关联客户 (只读继承) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-850">关联客户</label>
          <input 
            type="text" 
            value={customerName ? `[${customerId}] ${customerName}` : '（选择商机后自动继承带出）'}
            disabled
            className="w-full h-9 px-3 text-xs bg-slate-100 border border-slate-200 rounded text-slate-500 cursor-not-allowed font-medium"
          />
          <p className="text-[10px] text-slate-400 italic">💡 客户快照从所选商机中自动继承只读，CRM 确保合同与商机客户主体一致（SSOT）。</p>
        </div>

        {/* 合同名称 */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-850">合同名称 <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            placeholder="请输入合同官方合同文件全称..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full h-9 px-3 text-xs bg-white border rounded text-slate-800 focus:outline-none focus:border-blue-500 ${
              errors.title ? 'border-red-500' : 'border-slate-200'
            }`}
          />
          {errors.title && <p className="text-[10px] text-red-500 font-bold">{errors.title}</p>}
        </div>

        {/* 合同金额 */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-850">合同最终签约金额 (元) <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`w-full h-9 px-3 text-xs bg-white border rounded text-slate-800 font-mono focus:outline-none focus:border-blue-500 ${
              errors.amount ? 'border-red-500' : 'border-slate-200'
            }`}
          />
          {errors.amount && <p className="text-[10px] text-red-500 font-bold">{errors.amount}</p>}
        </div>

      </form>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-45 bg-white border-t border-slate-200 py-3.5 px-6 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] flex justify-end gap-2 lg:pl-[220px]">
        <button
          type="button"
          onClick={() => navigate('/contracts')}
          className="px-5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-md transition-colors"
        >
          返回列表
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => handleSave(false)}
          className="px-5 py-2 text-xs font-semibold text-slate-650 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors"
        >
          保存为草稿
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => handleSave(true)}
          className="px-5 py-2 text-xs font-bold text-white bg-[#1677ff] hover:bg-blue-500 rounded-md transition-colors shadow-sm"
        >
          提交并发起签署
        </button>
      </div>
    </div>
  );
}
