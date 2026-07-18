import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { db, type Opportunity, type OpportunityItem } from '../db';
import { ChevronLeft, CheckCircle, XCircle } from 'lucide-react';

const CURRENT_USER = '张三';

// 模拟 ERP 商品数据列表
const ERP_PRODUCTS = [
  { code: 'SKU001', name: 'Forge WMS 标准版', price: 50000 },
  { code: 'SKU002', name: 'Forge ERP 标准版', price: 80000 },
];

// 模拟 CRM 正式客户列表
const CRM_CUSTOMERS = [
  { id: 'C001', name: '强盛科技有限公司', industry: 'IT' },
  { id: 'C002', name: '瑞丰生鲜连锁超市', industry: 'RETAIL' },
  { id: 'C003', name: '万达商贸进出口公司', industry: 'RETAIL' },
  { id: 'C004', name: '安泰医疗器械有限公司', industry: 'HEALTHCARE' },
  { id: 'C005', name: '远东重工制造集团', industry: 'MANUFACTURING' }
];

export default function OppForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  // 表单字段状态
  const [title, setTitle] = useState('');
  const [customerId, setCustomerId] = useState('C001');
  const [amount, setAmount] = useState('');
  const [dealDate, setDealDate] = useState('');
  const [desc, setDesc] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. 编辑模式加载数据
  useEffect(() => {
    if (isEdit && id) {
      db.opportunities.get(id).then(opp => {
        if (opp) {
          setTitle(opp.title);
          setCustomerId(opp.customerId);
          setAmount(opp.amount ? String(opp.amount) : '');
          setDealDate(opp.dealDate || '');
          setDesc(opp.desc || '');
          
          if (opp.items) {
            setSelectedProducts(opp.items.map(x => x.productCode));
          }

          // 仅 INITIAL_CONTACT 和 NEEDS_CONFIRM 阶段可编辑。PROPOSAL 及以上阶段只读
          if (!['INITIAL_CONTACT', 'NEEDS_CONFIRM'].includes(opp.status)) {
            setIsReadOnly(true);
            showToast('该商机已推进到报价或更高阶段，目前处于只读只看模式', 'error');
          }
        }
      });
    } else {
      // 新建模式，读取 state 中的默认客户
      const defaultCustId = (location.state as any)?.defaultCustomerId;
      if (defaultCustId) {
        setCustomerId(defaultCustId);
      }
    }
  }, [isEdit, id, location.state]);

  const generateOpportunityId = async () => {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const count = await db.opportunities.count();
    const indexStr = String(count + 1).padStart(4, '0');
    return `OPP${todayStr}-${indexStr}`;
  };

  // 商品多选处理
  const handleProductToggle = (code: string) => {
    if (isReadOnly) return;
    setSelectedProducts(prev => 
      prev.includes(code) ? prev.filter(x => x !== code) : [...prev, code]
    );
  };

  // 2. 保存表单
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    // 必填性校验
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = '请输入商机名称';
    if (!customerId) newErrors.customerId = '请选择关联客户';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('请完善必填信息', 'error');
      return;
    }

    setLoading(true);
    try {
      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const selectedCust = CRM_CUSTOMERS.find(c => c.id === customerId);
      
      // 构建商品明细
      const itemsPayload: OpportunityItem[] = selectedProducts.map(code => {
        const prod = ERP_PRODUCTS.find(p => p.code === code);
        return {
          productCode: code,
          productName: prod?.name || '',
          price: prod?.price || 0,
          quantity: 1 // 默认数量 1
        };
      });

      // 动态 AI 概率计算
      let score = 35; // 默认分
      if (itemsPayload.length > 0) score += 20;
      if (amount && parseFloat(amount) > 0) score += 15;
      if (selectedCust?.industry === 'IT') score += 15;
      score = Math.min(95, score);

      let targetId = id;
      let status: any = 'INITIAL_CONTACT';

      if (isEdit && id) {
        const exist = await db.opportunities.get(id);
        if (exist) {
          status = exist.status;
        }
      } else {
        targetId = await generateOpportunityId();
      }

      const oppData: Opportunity = {
        id: targetId!,
        title: title.trim(),
        customerId,
        customerName: selectedCust?.name || '',
        amount: amount ? parseFloat(amount) : undefined,
        dealDate: dealDate || undefined,
        desc: desc.trim() || undefined,
        score,
        status,
        createdAt: isEdit ? nowStr : nowStr, // 简易时间
        createdBy: CURRENT_USER,
        items: itemsPayload.length > 0 ? itemsPayload : undefined
      };

      await db.opportunities.put(oppData);
      
      // 写入跟进日志
      await db.opportunity_follow_ups.add({
        oppId: targetId!,
        time: nowStr,
        operator: CURRENT_USER,
        type: '电话',
        content: isEdit 
          ? `销售修改了商机草案基本信息。重新评估 AI 成交概率：${score}%`
          : `销售创建了新商机。初始评估 AI 成交概率：${score}%`
      });

      showToast('商机信息已成功保存');
      setTimeout(() => navigate('/opportunities'), 1500);
    } catch (err) {
      console.error(err);
      showToast('商机保存失败，请检查输入后重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* 顶部 Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg bg-white border border-slate-200 animate-slide-in text-xs font-bold text-slate-800">
          {toastMessage.type === 'success' ? <CheckCircle size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 头部导航 */}
      <div className="flex items-center gap-3">
        <button 
          type="button" 
          onClick={() => navigate('/opportunities')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex flex-col">
          <h1 className="text-lg font-black text-slate-800">
            {isReadOnly ? '查看商机' : isEdit ? '编辑商机' : '创建新商机'}
          </h1>
          <p className="text-[10px] text-slate-400">
            {isReadOnly ? '商机已进入方案报价或更高阶段，处于只读状态' : '关联销售客户，并在需求确认阶段补齐关联商品明细'}
          </p>
        </div>
      </div>

      {/* 表单卡片 */}
      <form onSubmit={handleSave} className="forge-card grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="md:col-span-4 border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold text-slate-850">基本信息</h3>
        </div>

        {/* 字段 1：商机名称 */}
        <div className="md:col-span-2">
          <label htmlFor="title" className="block text-xs font-bold text-slate-600 mb-1.5">
            商机名称 <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            maxLength={100}
            disabled={isReadOnly || loading}
            placeholder="如：强盛科技WMS升级采购二期"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
            }}
            className={`w-full h-9 px-3 text-xs bg-white border rounded-md text-slate-800 placeholder-slate-400 focus:outline-none ${
              errors.title ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
            }`}
          />
          {errors.title && <span className="text-[10px] text-red-500 block mt-1">{errors.title}</span>}
        </div>

        {/* 字段 2：关联客户 */}
        <div className="md:col-span-2">
          <label htmlFor="customer" className="block text-xs font-bold text-slate-600 mb-1.5">
            关联客户 <span className="text-red-500">*</span>
          </label>
          <select
            id="customer"
            disabled={isReadOnly || loading}
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              if (errors.customerId) setErrors(prev => ({ ...prev, customerId: '' }));
            }}
            className={`w-full h-9 px-3 text-xs bg-white border rounded-md text-slate-700 focus:outline-none ${
              errors.customerId ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
            }`}
          >
            {CRM_CUSTOMERS.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.customerId && <span className="text-[10px] text-red-500 block mt-1">{errors.customerId}</span>}
        </div>

        {/* 字段 3：预计金额 */}
        <div>
          <label htmlFor="amount" className="block text-xs font-bold text-slate-600 mb-1.5">
            预计金额 (¥) <span className="text-slate-400 text-[10px] font-normal">(推进至NEGOTIATION时必填)</span>
          </label>
          <input
            id="amount"
            type="number"
            step="0.01"
            disabled={isReadOnly || loading}
            placeholder="请输入预计成交金额(元)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 字段 4：预计成交日期 */}
        <div>
          <label htmlFor="dealDate" className="block text-xs font-bold text-slate-600 mb-1.5">预计成交日期</label>
          <input
            id="dealDate"
            type="date"
            disabled={isReadOnly || loading}
            value={dealDate}
            onChange={(e) => setDealDate(e.target.value)}
            className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 字段 5：关联商品 */}
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-600 mb-1.5">
            关联商品 <span className="text-slate-400 text-[10px] font-normal">(推进至PROPOSAL时必填)</span>
          </label>
          <div className="flex gap-4 items-center h-9">
            {ERP_PRODUCTS.map(prod => {
              const checked = selectedProducts.includes(prod.code);
              return (
                <label key={prod.code} className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    disabled={isReadOnly || loading}
                    checked={checked}
                    onChange={() => handleProductToggle(prod.code)}
                    className="rounded border-slate-200 focus:ring-0"
                  />
                  <span>{prod.name} (¥{prod.price.toLocaleString()})</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* 字段 6：需求描述 */}
        <div className="md:col-span-4">
          <label htmlFor="desc" className="block text-xs font-bold text-slate-600 mb-1.5">
            需求描述 <span className="text-slate-400 text-[10px] font-normal">(推进至NEEDS_CONFIRM时必填)</span>
          </label>
          <textarea
            id="desc"
            maxLength={1000}
            disabled={isReadOnly || loading}
            rows={4}
            placeholder="请输入细致的客户系统功能诉求、集成细节..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full p-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </form>

      {/* 固定底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 py-3.5 px-6 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] flex justify-end gap-2 lg:pl-[220px]">
        <button
          type="button"
          onClick={() => navigate('/opportunities')}
          className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-md transition-colors"
        >
          返回列表
        </button>
        {!isReadOnly && (
          <button
            type="button"
            disabled={loading}
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold text-white bg-[#1677ff] hover:bg-blue-500 rounded-md transition-colors shadow-sm"
          >
            保存商机
          </button>
        )}
      </div>
    </div>
  );
}
