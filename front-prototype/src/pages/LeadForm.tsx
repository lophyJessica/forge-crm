import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, type Lead } from '../db';
import { ChevronLeft, CheckCircle, XCircle } from 'lucide-react';

const CURRENT_USER = '张三';

// 计算 AI 评分函数 (依据 06-AI评分模型规则.md 逻辑还原)
const calculateAiScore = (lead: Partial<Lead>): number => {
  let score = 0;

  // 1. 来源评分 (15%)
  if (lead.source === 'ONLINE' || lead.source === 'REFERRAL') score += 15;
  else if (lead.source === 'ACTIVITY' || lead.source === 'EXHIBITION') score += 10;
  else score += 5;

  // 2. 行业匹配 (20%)
  if (lead.industry === 'IT' || lead.industry === 'FINANCE') score += 20;
  else if (lead.industry === 'MANUFACTURING') score += 15;
  else if (lead.industry === 'RETAIL') score += 10;
  else score += 5;

  // 3. 职位评分 (结合职位文本特征)
  const pos = (lead.position || '').toLowerCase();
  if (pos.includes('总') || pos.includes('ceo') || pos.includes('director') || pos.includes('主管')) {
    score += 20;
  } else if (pos.trim() !== '') {
    score += 12;
  } else {
    score += 5;
  }

  // 4. 地区匹配 (省市信息)
  const reg = lead.region || '';
  if (reg.includes('北京') || reg.includes('上海') || reg.includes('浙江') || reg.includes('广东')) {
    score += 20;
  } else if (reg.trim() !== '') {
    score += 12;
  } else {
    score += 5;
  }

  // 5. 响应速度与活跃度随机合成因子
  const responseFactor = Math.floor(Math.random() * 11) + 15; // 15-25 分
  score += responseFactor;

  return Math.min(100, score);
};

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

  // 1. 如果是编辑模式，加载已有数据
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

          // 只允许 DRAFT 态进行编辑，其余状态进入只读模式
          if (lead.status !== 'DRAFT') {
            setIsReadOnly(true);
            showToast('该线索已提交，目前处于只读状态', 'error');
          }
        }
      });
    }
  }, [isEdit, id]);

  // 2. 唯一性去重校验
  const checkUniqueness = async (currentId?: string): Promise<{ phoneConflict: string | null; emailConflict: string | null }> => {
    let phoneConflict: string | null = null;
    let emailConflict: string | null = null;

    if (phone.trim()) {
      const existPhone = await db.leads
        .filter(l => l.phone === phone && l.id !== currentId)
        .first();
      if (existPhone) {
        phoneConflict = `该手机号已存在线索 ${existPhone.id} (${existPhone.company})`;
      }
    }

    if (email.trim()) {
      const existEmail = await db.leads
        .filter(l => l.email === email && l.id !== currentId)
        .first();
      if (existEmail) {
        emailConflict = `该邮箱已存在线索 ${existEmail.id} (${existEmail.company})`;
      }
    }

    return { phoneConflict, emailConflict };
  };

  // 生成 ID
  const generateLeadId = async () => {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const count = await db.leads.count();
    const indexStr = String(count + 1).padStart(4, '0');
    return `LEAD${todayStr}-${indexStr}`;
  };

  // 3. 保存草稿
  const handleSaveDraft = async () => {
    setLoading(true);
    try {
      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const region = regionProvince && regionCity ? `${regionProvince}-${regionCity}` : '';
      
      let targetId = id;
      if (!isEdit) {
        targetId = await generateLeadId();
      }

      const leadData: Lead = {
        id: targetId!,
        source,
        company,
        contact: contact.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        position: position.trim() || undefined,
        industry,
        region: region || undefined,
        remark: remark.trim() || undefined,
        score: 0, // 草稿评分设为 0
        status: 'DRAFT',
        createdAt: isEdit ? nowStr : nowStr, // 简易处理时间
        createdBy: CURRENT_USER
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

  // 4. 提交并算分
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    // 前端严格校验
    const newErrors: Record<string, string> = {};
    if (!company.trim()) newErrors.company = '请输入公司名称';
    if (!source) newErrors.source = '请选择线索来源';
    
    // 手机和邮箱至少填一个
    if (!phone.trim() && !email.trim()) {
      newErrors.phone = '手机号和邮箱至少填写一个';
      newErrors.email = '手机号和邮箱至少填写一个';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('请完善必填信息', 'error');
      // 聚焦到第一个错误控件
      const firstKey = Object.keys(newErrors)[0];
      const element = document.getElementById(firstKey);
      element?.focus();
      return;
    }

    setLoading(true);
    try {
      // 唯一性去重
      const { phoneConflict, emailConflict } = await checkUniqueness(id);
      if (phoneConflict || emailConflict) {
        const errorText = phoneConflict || emailConflict;
        showToast(errorText!, 'error');
        setLoading(false);
        return;
      }

      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const region = regionProvince && regionCity ? `${regionProvince}-${regionCity}` : '';

      let targetId = id;
      if (!isEdit) {
        targetId = await generateLeadId();
      }

      // 计算 AI 评分
      const leadPayload: Partial<Lead> = {
        source,
        company,
        position,
        industry,
        region
      };
      const score = calculateAiScore(leadPayload);

      // AI分配规则：评分 >= 80 自动分配张三，否则待分配
      const status = score >= 80 ? 'ASSIGNED' : 'PENDING_ASSIGN';
      const owner = score >= 80 ? CURRENT_USER : undefined;
      const assignedAt = score >= 80 ? nowStr : undefined;

      const leadData: Lead = {
        id: targetId!,
        source,
        company,
        contact: contact.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        position: position.trim() || undefined,
        industry,
        region: region || undefined,
        remark: remark.trim() || undefined,
        score,
        status,
        owner,
        assignedAt,
        createdAt: nowStr,
        createdBy: CURRENT_USER
      };

      await db.leads.put(leadData);
      
      // 若自动分配，添加第一条系统跟进记录
      if (status === 'ASSIGNED') {
        await db.follow_up_records.add({
          leadId: targetId!,
          time: nowStr,
          operator: 'AI 自动引擎',
          type: '邮件',
          content: `AI 评分完成：${score}分（≥80分触发自动派单）。已自动将该线索分配给最优销售 ${CURRENT_USER}。`
        });
      }

      showToast(`线索已成功提交，AI 评分：${score}分，状态：${status === 'ASSIGNED' ? '已自动分单' : '待分配'}`);
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
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg bg-white border border-slate-200 animate-slide-in text-xs font-bold text-slate-800">
          {toastMessage.type === 'success' ? <CheckCircle size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 头部导航 */}
      <div className="flex items-center gap-3">
        <button 
          type="button" 
          onClick={() => navigate('/leads')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex flex-col">
          <h1 className="text-lg font-black text-slate-800">
            {isReadOnly ? '查看线索' : isEdit ? '编辑草稿线索' : '创建新线索'}
          </h1>
          <p className="text-[10px] text-slate-400">
            {isReadOnly ? '非草稿态的线索仅限只读展示' : '填写公司和联系人资料，邮箱和手机二选一'}
          </p>
        </div>
      </div>

      {/* 表单卡片 */}
      <form onSubmit={handleSubmit} className="forge-card grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="md:col-span-4 border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold text-slate-850">基本信息</h3>
        </div>

        {/* 字段 1：线索来源 */}
        <div>
          <label htmlFor="source" className="block text-xs font-bold text-slate-600 mb-1.5">
            线索来源 <span className="text-red-500">*</span>
          </label>
          <select
            id="source"
            disabled={isReadOnly || loading}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className={`w-full h-9 px-3 text-xs bg-white border rounded-md text-slate-700 focus:outline-none ${
              errors.source ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
            }`}
          >
            <option value="ONLINE">官网</option>
            <option value="ACTIVITY">线下活动</option>
            <option value="EXHIBITION">展会</option>
            <option value="REFERRAL">转介绍</option>
            <option value="IMPORT">批量导入</option>
            <option value="OTHER">其他</option>
          </select>
          {errors.source && <span className="text-[10px] text-red-500 block mt-1">{errors.source}</span>}
        </div>

        {/* 字段 2：公司名称 */}
        <div className="md:col-span-2">
          <label htmlFor="company" className="block text-xs font-bold text-slate-600 mb-1.5">
            公司名称 <span className="text-red-500">*</span>
          </label>
          <input
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
            className={`w-full h-9 px-3 text-xs bg-white border rounded-md text-slate-800 placeholder-slate-400 focus:outline-none ${
              errors.company ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
            }`}
          />
          {errors.company && <span className="text-[10px] text-red-500 block mt-1">{errors.company}</span>}
        </div>

        {/* 字段 3：联系人 */}
        <div>
          <label htmlFor="contact" className="block text-xs font-bold text-slate-600 mb-1.5">联系人</label>
          <input
            id="contact"
            type="text"
            maxLength={50}
            disabled={isReadOnly || loading}
            placeholder="请输入联系人姓名"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 字段 4：手机号 */}
        <div>
          <label htmlFor="phone" className="block text-xs font-bold text-slate-600 mb-1.5">
            手机号 <span className="text-slate-400 text-[10px] font-normal">(手机/邮箱选填其一)</span>
          </label>
          <input
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
            className={`w-full h-9 px-3 text-xs bg-white border rounded-md text-slate-800 placeholder-slate-400 focus:outline-none ${
              errors.phone ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
            }`}
          />
          {errors.phone && <span className="text-[10px] text-red-500 block mt-1">{errors.phone}</span>}
        </div>

        {/* 字段 5：邮箱 */}
        <div>
          <label htmlFor="email" className="block text-xs font-bold text-slate-600 mb-1.5">
            邮箱 <span className="text-slate-400 text-[10px] font-normal">(手机/邮箱选填其一)</span>
          </label>
          <input
            id="email"
            type="text"
            disabled={isReadOnly || loading}
            placeholder="请输入工作电子邮箱"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors(prev => ({ ...prev, phone: '', email: '' }));
            }}
            className={`w-full h-9 px-3 text-xs bg-white border rounded-md text-slate-800 placeholder-slate-400 focus:outline-none ${
              errors.email ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
            }`}
          />
          {errors.email && <span className="text-[10px] text-red-500 block mt-1">{errors.email}</span>}
        </div>

        {/* 字段 6：职位 */}
        <div>
          <label htmlFor="position" className="block text-xs font-bold text-slate-600 mb-1.5">职位</label>
          <input
            id="position"
            type="text"
            maxLength={50}
            disabled={isReadOnly || loading}
            placeholder="如：技术总监、采购经理"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 字段 7：所属行业 */}
        <div>
          <label htmlFor="industry" className="block text-xs font-bold text-slate-600 mb-1.5">所属行业</label>
          <select
            id="industry"
            disabled={isReadOnly || loading}
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="MANUFACTURING">制造业</option>
            <option value="RETAIL">零售</option>
            <option value="HEALTHCARE">医疗</option>
            <option value="FINANCE">金融</option>
            <option value="IT">信息技术</option>
            <option value="OTHER">其他</option>
          </select>
        </div>

        {/* 字段 8：地区级联选择化身 (两个并列下拉菜单) */}
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-600 mb-1.5">所在地区</label>
          <div className="grid grid-cols-2 gap-2">
            <select
              disabled={isReadOnly || loading}
              value={regionProvince}
              onChange={(e) => {
                setRegionProvince(e.target.value);
                setRegionCity('');
              }}
              className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-blue-500"
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
              className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-blue-500"
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
        <div className="md:col-span-4">
          <label htmlFor="remark" className="block text-xs font-bold text-slate-600 mb-1.5">备注信息</label>
          <textarea
            id="remark"
            maxLength={500}
            disabled={isReadOnly || loading}
            rows={4}
            placeholder="请输入备注，上限 500 字符"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="w-full p-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </form>

      {/* 固定底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 py-3.5 px-6 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] flex justify-end gap-2 lg:pl-[220px]">
        <button
          type="button"
          onClick={() => navigate('/leads')}
          className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-md transition-colors"
        >
          返回列表
        </button>
        
        {/* 如果是非草稿态只读模式，不渲染以下操作按钮 */}
        {!isReadOnly && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={handleSaveDraft}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
            >
              保存草稿
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="px-5 py-2 text-xs font-bold text-white bg-[#1677ff] hover:bg-blue-500 rounded-md transition-colors shadow-sm"
            >
              提交
            </button>
          </>
        )}
      </div>
    </div>
  );
}
