import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Opportunity, type OpportunityItem } from '../db';
import { getAvailableErpProducts, type ErpProductSnapshot } from '@/api/erpCatalog';
import { ChevronLeft, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CURRENT_USER, calculateOpportunityScore, shanghaiNow, shanghaiToday } from '@/domain/businessRules';

export default function OppForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  // 表单字段状态
  const [title, setTitle] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [dealDate, setDealDate] = useState('');
  const [desc, setDesc] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const [erpProducts, setErpProducts] = useState<ErpProductSnapshot[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const customers = useLiveQuery(
    () => db.customers.filter(item => item.lifecycleStatus === 'ACTIVE' && item.syncStatus === 'AVAILABLE').toArray(),
    [],
  ) || [];

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    getAvailableErpProducts().then(setErpProducts);
  }, []);

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
            setProductQuantities(Object.fromEntries(opp.items.map(item => [item.productCode, item.quantity])));
          }

          if (!['INITIAL_CONTACT', 'NEEDS_CONFIRM'].includes(opp.status)) {
            setIsReadOnly(true);
            showToast('该商机已推进到报价或更高阶段，目前处于只读只看模式', 'error');
          }
        }
      });
    } else {
      const defaultCustId = (location.state as any)?.defaultCustomerId;
      if (defaultCustId) {
        setCustomerId(defaultCustId);
      }
    }
  }, [isEdit, id, location.state]);

  const generateOpportunityId = async () => {
    const todayStr = shanghaiToday().replace(/-/g, '');
    const prefix = `OPP${todayStr}-`;
    const ids = await db.opportunities.filter(item => item.id.startsWith(prefix)).primaryKeys();
    const nextIndex = ids.reduce((max, key) => {
      const suffix = Number(String(key).slice(prefix.length));
      return Number.isFinite(suffix) ? Math.max(max, suffix) : max;
    }, 0) + 1;
    const indexStr = String(nextIndex).padStart(4, '0');
    return `OPP${todayStr}-${indexStr}`;
  };

  const handleProductToggle = (code: string) => {
    if (isReadOnly) return;
    setSelectedProducts(prev => 
      prev.includes(code) ? prev.filter(x => x !== code) : [...prev, code]
    );
    setProductQuantities(prev => ({ ...prev, [code]: prev[code] || 1 }));
  };

  // 保存表单
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = '请输入商机名称';
    if (!customerId) newErrors.customerId = '请选择关联客户';
    if (amount && (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0)) newErrors.amount = '预计金额须大于0且最多两位小数';
    if (dealDate && dealDate < shanghaiToday()) newErrors.dealDate = '预计成交日期不能早于今天';
    if (selectedProducts.some(code => !productQuantities[code] || productQuantities[code] <= 0)) newErrors.products = '商品数量必须大于0';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('请完善必填信息', 'error');
      return;
    }

    setLoading(true);
    try {
      const nowStr = shanghaiNow();
      const selectedCust = await db.customers.get(customerId);
      if (!selectedCust || selectedCust.lifecycleStatus !== 'ACTIVE' || selectedCust.syncStatus !== 'AVAILABLE') {
        throw new Error('关联客户已停用或快照不可用，禁止创建/修改商机');
      }
      
      const itemsPayload: OpportunityItem[] = selectedProducts.map(code => {
        const prod = erpProducts.find(p => p.code === code);
        return {
          erpProductId: prod?.erpProductId,
          productCode: code,
          productName: prod?.name || '',
          price: prod?.price || 0,
          quantity: productQuantities[code] || 1,
          priceVersion: prod?.priceVersion,
        };
      });

      const existing = id ? await db.opportunities.get(id) : undefined;
      const targetId = id || await generateOpportunityId();
      const status = existing?.status || 'INITIAL_CONTACT';
      const followUpCount = existing ? await db.opportunity_follow_ups.where('oppId').equals(existing.id).count() : 0;
      const score = calculateOpportunityScore({
        customerLevel: selectedCust.level,
        customerRisk: selectedCust.riskLevel,
        followUpCount,
        items: itemsPayload,
        status,
      });

      const oppData: Opportunity = {
        id: targetId,
        title: title.trim(),
        customerId,
        erpCustomerId: selectedCust.erpCustomerId,
        customerName: selectedCust.name,
        amount: amount ? parseFloat(amount) : undefined,
        dealDate: dealDate || undefined,
        desc: desc.trim() || undefined,
        score,
        status,
        createdAt: existing?.createdAt || nowStr,
        createdBy: existing?.createdBy || CURRENT_USER.name,
        createdById: existing?.createdById || CURRENT_USER.id,
        updatedAt: nowStr,
        version: (existing?.version || 0) + 1,
        items: itemsPayload.length > 0 ? itemsPayload : undefined,
      };

      await db.transaction('rw', db.opportunities, db.opportunity_follow_ups, async () => {
        await db.opportunities.put(oppData);
        await db.opportunity_follow_ups.add({
          oppId: targetId,
          time: nowStr,
          operator: CURRENT_USER.name,
          type: '系统记录',
          content: isEdit
            ? `销售修改了商机基本信息。规则引擎重新评估成交概率：${score}%`
            : `销售创建了新商机。规则引擎初始评估成交概率：${score}%`,
        });
      });

      showToast('商机信息已成功保存');
      setTimeout(() => navigate(`/opportunities/${targetId}`), 1200);
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : '商机保存失败，请检查输入后重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* 顶部 Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800">
          {toastMessage.type === 'success' ? <CheckCircle size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 头部导航 */}
      <div className="flex items-center gap-3" data-anno="opportunity-form-page-header">
        <Button 
          variant="outline"
          size="icon"
          onClick={() => navigate('/opportunities')}
          className="h-8 w-8"
        >
          <ChevronLeft size={16} />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-slate-900">
            {isReadOnly ? '查看商机' : isEdit ? '编辑商机' : '创建新商机'}
          </h1>
          <p className="text-xs text-slate-500">
            {isReadOnly ? '商机已进入方案报价或更高阶段，处于只读状态' : '关联销售客户，并在需求确认阶段补齐关联商品明细'}
          </p>
        </div>
      </div>

      {/* 表单卡片 */}
      <Card data-anno="opportunity-form-basic">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-sm font-semibold">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-4 gap-5" data-anno="opportunity-form-validation">
            {/* 字段 1：商机名称 */}
            <div className="md:col-span-2">
              <Label htmlFor="title" className="block mb-2">
                商机名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                type="text"
                maxLength={100}
                disabled={isReadOnly || loading}
                placeholder="如：ForgeWMS升级采购二期"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
                }}
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && <span className="text-[11px] text-red-500 block mt-1">{errors.title}</span>}
            </div>

            {/* 字段 2：关联客户 */}
            <div className="md:col-span-2">
              <Label htmlFor="customer" className="block mb-2">
                关联客户 <span className="text-red-500">*</span>
              </Label>
              <select
                id="customer"
                disabled={isReadOnly || loading}
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  if (errors.customerId) setErrors(prev => ({ ...prev, customerId: '' }));
                }}
                className={`w-full h-9 px-3 text-xs bg-white border rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  errors.customerId ? 'border-red-500' : 'border-slate-200'
                }`}
              >
                <option value="">-- 选择可用 CRM 客户快照 --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.customerId && <span className="text-[11px] text-red-500 block mt-1">{errors.customerId}</span>}
            </div>

            {/* 字段 3：预计金额 */}
            <div>
              <Label htmlFor="amount" className="block mb-2">
                预计金额 (¥) <span className="text-slate-400 font-normal text-[11px]">(推进至谈判时必填)</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                disabled={isReadOnly || loading}
                placeholder="请输入预计成交金额(元)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={errors.amount ? 'border-red-500' : ''}
              />
              {errors.amount && <span className="text-[11px] text-red-500 block mt-1">{errors.amount}</span>}
            </div>

            {/* 字段 4：预计成交日期 */}
            <div>
              <Label htmlFor="dealDate" className="block mb-2">预计成交日期</Label>
              <Input
                id="dealDate"
                type="date"
                disabled={isReadOnly || loading}
                value={dealDate}
                onChange={(e) => setDealDate(e.target.value)}
                className={errors.dealDate ? 'border-red-500' : ''}
              />
              {errors.dealDate && <span className="text-[11px] text-red-500 block mt-1">{errors.dealDate}</span>}
            </div>

            {/* 字段 5：关联商品 */}
            <div className="md:col-span-2">
              <Label className="block mb-2">
                关联商品 <span className="text-slate-400 font-normal text-[11px]">(推进至报价时必填)</span>
              </Label>
              <div className="space-y-2">
                {erpProducts.map(prod => {
                  const checked = selectedProducts.includes(prod.code);
                  return (
                    <div key={prod.code} className="flex items-center justify-between gap-3 rounded border border-slate-200 px-3 py-2">
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          disabled={isReadOnly || loading}
                          checked={checked}
                          onChange={() => handleProductToggle(prod.code)}
                          className="rounded border-slate-300"
                        />
                        <span>{prod.name} · {prod.code} · ¥{prod.price.toLocaleString()} · {prod.priceVersion}</span>
                      </label>
                      {checked && (
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={productQuantities[prod.code] || 1}
                          onChange={(event) => setProductQuantities(prev => ({ ...prev, [prod.code]: Number(event.target.value) }))}
                          disabled={isReadOnly || loading}
                          className="h-8 w-24 font-mono"
                          aria-label={`${prod.name}数量`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              {errors.products && <span className="text-[11px] text-red-500 block mt-1">{errors.products}</span>}
              <p className="text-[11px] text-slate-400 mt-1">商品来自 ERP Mock 适配层，保存稳定商品 ID 与价格版本；CRM 不维护商品主数据。</p>
            </div>

            {/* 字段 6：需求描述 */}
            <div className="md:col-span-4">
              <Label htmlFor="desc" className="block mb-2">
                需求描述 <span className="text-slate-400 font-normal text-[11px]">(推进至需求确认时必填)</span>
              </Label>
              <Textarea
                id="desc"
                maxLength={1000}
                disabled={isReadOnly || loading}
                rows={4}
                placeholder="请输入细致的客户系统功能诉求、集成细节..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 固定底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 py-3.5 px-6 shadow-sm flex justify-end gap-2 lg:pl-[220px]" data-anno="opportunity-form-submit-bar">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/opportunities')}
        >
          返回列表
        </Button>
        {!isReadOnly && (
          <Button
            data-anno="opportunity-form-save-action"
            size="sm"
            disabled={loading}
            onClick={handleSave}
          >
            保存商机
          </Button>
        )}
      </div>
    </div>
  );
}
