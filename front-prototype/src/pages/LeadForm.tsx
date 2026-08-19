import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, type Lead } from '../db';
import { ChevronLeft, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  CURRENT_USER,
  calculateLeadScore,
  getLeadRouting,
  isValidEmail,
  isValidPhone,
  normalizeEmail,
  normalizePhone,
  shanghaiNow,
  shanghaiToday,
} from '@/domain/businessRules';

export default function LeadForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  // 表单字段状态
  const [source, setSource] = useState('ONLINE');
  const [company, setCompany] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [position, setPosition] = useState('');
  const [industry, setIndustry] = useState('IT');
  const [regionProvince, setRegionProvince] = useState('');
  const [regionCity, setRegionCity] = useState('');
  const [remark, setRemark] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 加载已有数据
  useEffect(() => {
    if (isEdit && id) {
      db.leads.get(id).then(lead => {
        if (lead) {
          setSource(lead.source);
          setCompany(lead.company);
          setContact(lead.contact || '');
          setPhone(lead.phone || '');
          setEmail(lead.email || '');
          setPosition(lead.position || '');
          setIndustry(lead.industry || 'IT');
          
          if (lead.region) {
            const parts = lead.region.split('-');
            setRegionProvince(parts[0] || '');
            setRegionCity(parts[1] || '');
          }
          setRemark(lead.remark || '');

          if (lead.status !== 'DRAFT') {
            setIsReadOnly(true);
            showToast('该线索已提交，目前处于只读状态', 'error');
          }
        }
      });
    }
  }, [isEdit, id]);

  // 唯一性校验
  const checkUniqueness = async (currentId?: string): Promise<{ phoneConflict: string | null; emailConflict: string | null }> => {
    const leads = await db.leads.toArray();
    const normalizedPhone = normalizePhone(phone);
    const normalizedEmail = normalizeEmail(email);
    const existPhone = normalizedPhone
      ? leads.find(item => item.id !== currentId && normalizePhone(item.phone || '') === normalizedPhone)
      : undefined;
    const existEmail = normalizedEmail
      ? leads.find(item => item.id !== currentId && normalizeEmail(item.email || '') === normalizedEmail)
      : undefined;

    return {
      phoneConflict: existPhone ? `该手机号已存在线索 ${existPhone.id} (${existPhone.company})` : null,
      emailConflict: existEmail ? `该邮箱已存在线索 ${existEmail.id} (${existEmail.company})` : null,
    };
  };

  const generateLeadId = async () => {
    const todayStr = shanghaiToday().replace(/-/g, '');
    const prefix = `LEAD${todayStr}-`;
    const ids = await db.leads.filter(item => item.id.startsWith(prefix)).primaryKeys();
    const nextIndex = ids.reduce((max, key) => {
      const suffix = Number(String(key).slice(prefix.length));
      return Number.isFinite(suffix) ? Math.max(max, suffix) : max;
    }, 0) + 1;
    const indexStr = String(nextIndex).padStart(4, '0');
    return `LEAD${todayStr}-${indexStr}`;
  };

  const validateContacts = () => {
    const nextErrors: Record<string, string> = {};
    if (phone.trim() && !isValidPhone(phone)) nextErrors.phone = '请输入11位中国大陆手机号';
    if (email.trim() && !isValidEmail(email)) nextErrors.email = '请输入有效邮箱地址';
    return nextErrors;
  };

  // 保存草稿
  const handleSaveDraft = async () => {
    if (isReadOnly) return;
    const contactErrors = validateContacts();
    if (Object.keys(contactErrors).length > 0) {
      setErrors(contactErrors);
      showToast('联系人格式不正确，请检查后再保存', 'error');
      return;
    }
    setLoading(true);
    try {
      const { phoneConflict, emailConflict } = await checkUniqueness(id);
      if (phoneConflict || emailConflict) {
        showToast(phoneConflict || emailConflict || '联系人信息重复', 'error');
        return;
      }

      const nowStr = shanghaiNow();
      const region = regionProvince && regionCity ? `${regionProvince}-${regionCity}` : '';
      const existing = id ? await db.leads.get(id) : undefined;
      const targetId = id || await generateLeadId();

      const leadData: Lead = {
        id: targetId,
        source,
        company,
        contact: contact.trim() || undefined,
        phone: phone.trim() ? normalizePhone(phone) : undefined,
        email: email.trim() ? normalizeEmail(email) : undefined,
        position: position.trim() || undefined,
        industry,
        region: region || undefined,
        remark: remark.trim() || undefined,
        score: 0,
        status: 'DRAFT',
        createdAt: existing?.createdAt || nowStr,
        createdBy: existing?.createdBy || CURRENT_USER.name,
        version: (existing?.version || 0) + 1,
      };

      await db.leads.put(leadData);
      showToast('草稿已成功保存');
      setTimeout(() => navigate('/leads'), 1500);
    } catch (err) {
      console.error(err);
      showToast('草稿保存失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 提交并算分
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    const newErrors: Record<string, string> = {};
    if (!company.trim()) newErrors.company = '请输入公司名称';
    if (!source) newErrors.source = '请选择线索来源';
    
    if (!phone.trim() && !email.trim()) {
      newErrors.phone = '手机号和邮箱至少填写一个';
      newErrors.email = '手机号和邮箱至少填写一个';
    }
    Object.assign(newErrors, validateContacts());

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('请完善必填信息', 'error');
      const firstKey = Object.keys(newErrors)[0];
      const element = document.getElementById(firstKey);
      element?.focus();
      return;
    }

    setLoading(true);
    try {
      const { phoneConflict, emailConflict } = await checkUniqueness(id);
      if (phoneConflict || emailConflict) {
        const errorText = phoneConflict || emailConflict;
        showToast(errorText!, 'error');
        setLoading(false);
        return;
      }

      const nowStr = shanghaiNow();
      const region = regionProvince && regionCity ? `${regionProvince}-${regionCity}` : '';
      const existing = id ? await db.leads.get(id) : undefined;
      const targetId = id || await generateLeadId();
      const createdAt = existing?.createdAt || nowStr;
      const score = calculateLeadScore(
        { source, industry, createdAt, followedAt: existing?.followedAt },
        { responseHours: 0.5, historicalConversionRate: 0.5, lastActivityAt: nowStr },
      );
      const routing = getLeadRouting(score);

      const leadData: Lead = {
        id: targetId,
        source,
        company,
        contact: contact.trim() || undefined,
        phone: phone.trim() ? normalizePhone(phone) : undefined,
        email: email.trim() ? normalizeEmail(email) : undefined,
        position: position.trim() || undefined,
        industry,
        region: region || undefined,
        remark: remark.trim() || undefined,
        score,
        status: routing.status,
        owner: routing.owner,
        assignedAt: routing.status === 'ASSIGNED' ? nowStr : undefined,
        poolType: routing.poolType,
        createdAt,
        createdBy: existing?.createdBy || CURRENT_USER.name,
        version: (existing?.version || 0) + 1,
      };

      await db.leads.put(leadData);
      
      if (routing.status === 'ASSIGNED') {
        await db.follow_up_records.add({
          leadId: targetId!,
          time: nowStr,
          operator: 'AI 自动引擎',
          type: '邮件',
          content: `AI 评分完成：${score}分（≥80分触发自动派单）。已自动将该线索分配给最优销售 ${CURRENT_USER.name}。`
        });
      }

      const routingLabel = routing.status === 'ASSIGNED'
        ? '已自动分单'
        : routing.poolType === 'NURTURE_POOL' ? '已进入培育池' : '已进入待分配池';
      showToast(`线索已成功提交，AI 评分：${score}分，${routingLabel}`);
      setTimeout(() => navigate(`/leads/${targetId}`), 2000);
    } catch (err) {
      console.error(err);
      showToast('线索提交失败，请重试', 'error');
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
      <div className="flex items-center gap-3" data-anno="lead-form-page-header">
        <Button 
          variant="outline"
          size="icon"
          onClick={() => navigate('/leads')}
          className="h-8 w-8"
        >
          <ChevronLeft size={16} />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-slate-900">
            {isReadOnly ? '查看线索' : isEdit ? '编辑草稿线索' : '创建新线索'}
          </h1>
          <p className="text-xs text-slate-500">
            {isReadOnly ? '非草稿态的线索仅限只读展示' : '填写公司和联系人资料，邮箱和手机二选一'}
          </p>
        </div>
      </div>

      {/* 表单卡片 */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-sm font-semibold">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-5" data-anno="lead-form-validation">
            {/* 字段 1：线索来源 */}
            <div data-anno="lead-form-source-field">
              <Label htmlFor="source" className="block mb-2">
                线索来源 <span className="text-red-500">*</span>
              </Label>
              <select
                id="source"
                disabled={isReadOnly || loading}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className={`w-full h-9 px-3 text-xs bg-white border rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  errors.source ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'
                }`}
              >
                <option value="ONLINE">官网</option>
                <option value="ACTIVITY">线下活动</option>
                <option value="EXHIBITION">展会</option>
                <option value="REFERRAL">转介绍</option>
                <option value="IMPORT">批量导入</option>
                <option value="OTHER">其他</option>
              </select>
              {errors.source && <span className="text-[11px] text-red-500 block mt-1">{errors.source}</span>}
            </div>

            {/* 字段 2：公司名称 */}
            <div className="md:col-span-2" data-anno="lead-form-company-field">
              <Label htmlFor="company" className="block mb-2">
                公司名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="company"
                type="text"
                maxLength={100}
                disabled={isReadOnly || loading}
                placeholder="请输入公司名称，上限100字符"
                value={company}
                onChange={(e) => {
                  setCompany(e.target.value);
                  if (errors.company) setErrors(prev => ({ ...prev, company: '' }));
                }}
                className={errors.company ? 'border-red-500' : ''}
              />
              {errors.company && <span className="text-[11px] text-red-500 block mt-1">{errors.company}</span>}
            </div>

            {/* 字段 3：联系人 */}
            <div>
              <Label htmlFor="contact" className="block mb-2">联系人</Label>
              <Input
                id="contact"
                type="text"
                maxLength={50}
                disabled={isReadOnly || loading}
                placeholder="请输入联系人姓名"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>

            {/* 字段 4：手机号 */}
            <div data-anno="lead-form-contact-fields">
              <Label htmlFor="phone" className="block mb-2">
                手机号 <span className="text-slate-400 font-normal">(手机/邮箱选填其一)</span>
              </Label>
              <Input
                id="phone"
                type="text"
                maxLength={11}
                disabled={isReadOnly || loading}
                placeholder="请输入 11 位手机号"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, ''));
                  if (errors.phone) setErrors(prev => ({ ...prev, phone: '', email: '' }));
                }}
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && <span className="text-[11px] text-red-500 block mt-1">{errors.phone}</span>}
            </div>

            {/* 字段 5：邮箱 */}
            <div>
              <Label htmlFor="email" className="block mb-2">
                邮箱 <span className="text-slate-400 font-normal">(手机/邮箱选填其一)</span>
              </Label>
              <Input
                id="email"
                type="text"
                disabled={isReadOnly || loading}
                placeholder="请输入工作电子邮箱"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, phone: '', email: '' }));
                }}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <span className="text-[11px] text-red-500 block mt-1">{errors.email}</span>}
            </div>

            {/* 字段 6：职位 */}
            <div data-anno="lead-form-profile-fields">
              <Label htmlFor="position" className="block mb-2">职位</Label>
              <Input
                id="position"
                type="text"
                maxLength={50}
                disabled={isReadOnly || loading}
                placeholder="如：技术总监、采购经理"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </div>

            {/* 字段 7：所属行业 */}
            <div>
              <Label htmlFor="industry" className="block mb-2">所属行业</Label>
              <select
                id="industry"
                disabled={isReadOnly || loading}
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="MANUFACTURING">制造业</option>
                <option value="RETAIL">零售</option>
                <option value="HEALTHCARE">医疗</option>
                <option value="FINANCE">金融</option>
                <option value="IT">信息技术</option>
                <option value="OTHER">其他</option>
              </select>
            </div>

            {/* 字段 8：地区级联 */}
            <div className="md:col-span-2">
              <Label className="block mb-2">所在地区</Label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  disabled={isReadOnly || loading}
                  value={regionProvince}
                  onChange={(e) => {
                    setRegionProvince(e.target.value);
                    setRegionCity('');
                  }}
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">选择省份</option>
                  <option value="北京市">北京市</option>
                  <option value="上海市">上海市</option>
                  <option value="广东省">广东省</option>
                  <option value="江苏省">江苏省</option>
                  <option value="四川省">四川省</option>
                </select>
                <select
                  disabled={isReadOnly || !regionProvince || loading}
                  value={regionCity}
                  onChange={(e) => setRegionCity(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">选择城市</option>
                  {regionProvince === '北京市' && <option value="东城区">东城区</option>}
                  {regionProvince === '北京市' && <option value="朝阳区">朝阳区</option>}
                  {regionProvince === '上海市' && <option value="徐汇区">徐汇区</option>}
                  {regionProvince === '上海市' && <option value="张江区">张江区</option>}
                  {regionProvince === '广东省' && <option value="广州市">广州市</option>}
                  {regionProvince === '广东省' && <option value="深圳市">深圳市</option>}
                  {regionProvince === '江苏省' && <option value="南京市">南京市</option>}
                  {regionProvince === '江苏省' && <option value="苏州市">苏州市</option>}
                  {regionProvince === '四川省' && <option value="成都市">成都市</option>}
                </select>
              </div>
            </div>

            {/* 字段 9：线索备注 */}
            <div className="md:col-span-4" data-anno="lead-form-remark-field">
              <Label htmlFor="remark" className="block mb-2">备注信息</Label>
              <Textarea
                id="remark"
                maxLength={500}
                disabled={isReadOnly || loading}
                rows={4}
                placeholder="请输入备注，上限 500 字符"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
              />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 固定底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 py-3.5 px-6 shadow-sm flex justify-end gap-2 lg:pl-[220px]">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/leads')}
        >
          返回列表
        </Button>
        
        {!isReadOnly && (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={handleSaveDraft}
              data-anno="lead-form-save-draft"
            >
              保存草稿
            </Button>
            <Button
              size="sm"
              disabled={loading}
              onClick={handleSubmit}
              data-anno="lead-form-submit"
            >
              提交
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
