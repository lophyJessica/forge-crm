import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { db } from '../db';
import { ChevronLeft, CheckCircle, XCircle } from 'lucide-react';

interface EntityOption {
  id: string;
  name: string;
}

export default function VisitForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  // 表单字段
  const [title, setTitle] = useState('');
  const [associationType, setAssociationType] = useState<'LEAD' | 'OPPORTUNITY' | 'CUSTOMER'>('LEAD');
  const [associationId, setAssociationId] = useState('');
  const [visitMethod, setVisitMethod] = useState<'上门' | '电话' | '视频'>('上门');
  const [planTime, setPlanTime] = useState('');
  const [address, setAddress] = useState('');

  const [loading, setLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false); // 外部跳转带入上下文锁定
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // 关联对象选项列表
  const [options, setOptions] = useState<EntityOption[]>([]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. 根据当前选择的关联对象类型，动态获取对应的实体候选列表
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        if (associationType === 'LEAD') {
          const list = await db.leads.filter(l => l.status !== 'CONVERTED' && l.status !== 'ABANDONED').toArray();
          setOptions(list.map(l => ({ id: l.id, name: `[线索] ${l.company} (${l.contact || '无联系人'})` })));
        } else if (associationType === 'OPPORTUNITY') {
          const list = await db.opportunities.filter(o => o.status !== 'WON' && o.status !== 'LOST').toArray();
          setOptions(list.map(o => ({ id: o.id, name: `[商机] ${o.title} (${o.customerName})` })));
        } else if (associationType === 'CUSTOMER') {
          const list = await db.customers.toArray();
          setOptions(list.map(c => ({ id: c.id, name: `[客户] ${c.name}` })));
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchOptions();
  }, [associationType]);

  // 2. 初始化加载
  useEffect(() => {
    if (isEdit && id) {
      db.visits.get(id).then(v => {
        if (v) {
          setTitle(v.title);
          setAssociationType(v.associationType);
          setAssociationId(v.associationId);
          setVisitMethod(v.visitMethod);
          // datetime-local input 格式需要 YYYY-MM-DDTHH:mm
          setPlanTime(v.planTime.replace(' ', 'T'));
          setAddress(v.address || '');

          if (v.status !== 'PLANNED') {
            showToast('该拜访已启动或取消，不可编辑', 'error');
            navigate('/visits');
          }
        }
      });
    } else {
      // 新建态：尝试从路由跳转 State 获取上下文锁定参数 (P2-4 规则)
      const defaultType = (location.state as any)?.defaultAssocType;
      const defaultId = (location.state as any)?.defaultAssocId;
      if (defaultType && defaultId) {
        setAssociationType(defaultType);
        setAssociationId(defaultId);
        setIsLocked(true); // 锁定控件

        // 自动拉取名称带入默认标题
        if (defaultType === 'LEAD') {
          db.leads.get(defaultId).then(l => {
            if (l) setTitle(`${l.company} - 业务需求确认拜访`);
          });
        } else if (defaultType === 'OPPORTUNITY') {
          db.opportunities.get(defaultId).then(opp => {
            if (opp) setTitle(`${opp.title} - 商机方案沟通会`);
          });
        } else if (defaultType === 'CUSTOMER') {
          db.customers.get(defaultId).then(c => {
            if (c) setTitle(`${c.name} - 定期客情维护拜访`);
          });
        }
      }
    }
  }, [isEdit, id, location.state]);

  const generateVisitId = async () => {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const count = await db.visits.count();
    const indexStr = String(count + 1).padStart(4, '0');
    return `VS${todayStr}-${indexStr}`;
  };

  // 3. 提交保存
  const handleSave = async () => {
    // 校验
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = '请输入拜访标题';
    if (!associationId) newErrors.associationId = '请选择要关联的具体对象';
    if (!planTime) newErrors.planTime = '请选择计划拜访时间';
    if (visitMethod === '上门' && !address.trim()) newErrors.address = '上门拜访必须填写拜访地址';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('表单有必填项未完善', 'error');
      return;
    }

    setLoading(true);
    try {
      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
      // 转回 YYYY-MM-DD HH:mm 存储
      const formattedPlanTime = planTime.replace('T', ' ');

      // 提取关联名称
      let associationName = '';
      if (associationType === 'LEAD') {
        const lead = await db.leads.get(associationId);
        associationName = lead?.company || '';
      } else if (associationType === 'OPPORTUNITY') {
        const opp = await db.opportunities.get(associationId);
        associationName = opp?.title || '';
      } else if (associationType === 'CUSTOMER') {
        const cust = await db.customers.get(associationId);
        associationName = cust?.name || '';
      }

      if (isEdit && id) {
        // 编辑模式更新
        await db.visits.update(id, {
          title,
          associationType,
          associationId,
          associationName,
          visitMethod,
          planTime: formattedPlanTime,
          address,
          updatedAt: nowStr
        });
      } else {
        // 新建模式写入
        const newId = await generateVisitId();
        await db.visits.add({
          id: newId,
          title,
          associationType,
          associationId,
          associationName,
          visitMethod,
          planTime: formattedPlanTime,
          address,
          status: 'PLANNED',
          createdAt: nowStr,
          createdBy: '张三'
        });
      }

      showToast('拜访计划保存成功');
      setTimeout(() => navigate('/visits'), 800);
    } catch (err) {
      showToast('数据库操作失败，请重试', 'error');
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

      {/* 导航标题 */}
      <div className="flex items-center gap-3">
        <button 
          type="button" 
          onClick={() => navigate('/visits')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-650 bg-white hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex flex-col">
          <h1 className="text-lg font-black text-slate-800">{isEdit ? '编辑计划' : '制定拜访计划'}</h1>
          <p className="text-[10px] text-slate-400">安排与客户、线索方的面对面或视频/电话沟通议程</p>
        </div>
      </div>

      {/* 表单卡片 */}
      <div className="forge-card space-y-4">
        
        {/* 关联类型 (Locked if context provided) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-850">关联对象类型 <span className="text-red-500">*</span></label>
            <select
              value={associationType}
              disabled={isLocked || isEdit}
              onChange={(e) => {
                setAssociationType(e.target.value as any);
                setAssociationId('');
              }}
              className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded text-slate-650 focus:outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-450"
            >
              <option value="LEAD">线索</option>
              <option value="OPPORTUNITY">商机</option>
              <option value="CUSTOMER">正式客户</option>
            </select>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-850">选择具体关联目标 <span className="text-red-500">*</span></label>
            <select
              value={associationId}
              disabled={isLocked || isEdit}
              onChange={(e) => setAssociationId(e.target.value)}
              className={`w-full h-9 px-3 text-xs bg-white border rounded text-slate-650 focus:outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-450 ${
                errors.associationId ? 'border-red-500' : 'border-slate-200'
              }`}
            >
              <option value="">-- 请选择 --</option>
              {options.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>
            {errors.associationId && <p className="text-[10px] text-red-500 font-bold">{errors.associationId}</p>}
          </div>
        </div>

        {/* 拜访标题 */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-850">拜访计划主题 <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            placeholder="例如: 强盛科技二期恒温库播种墙现场演示方案沟通会"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full h-9 px-3 text-xs bg-white border rounded text-slate-800 focus:outline-none focus:border-blue-500 ${
              errors.title ? 'border-red-500' : 'border-slate-200'
            }`}
          />
          {errors.title && <p className="text-[10px] text-red-500 font-bold">{errors.title}</p>}
        </div>

        {/* 拜访方式 & 时间 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-850">拜访沟通方式 <span className="text-red-500">*</span></label>
            <select
              value={visitMethod}
              onChange={(e) => setVisitMethod(e.target.value as any)}
              className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded text-slate-650 focus:outline-none focus:border-blue-500"
            >
              <option value="上门">🚶 上门拜访</option>
              <option value="电话">📞 电话回访</option>
              <option value="视频">💻 视频会议</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-850">计划拜访时间 <span className="text-red-500">*</span></label>
            <input 
              type="datetime-local" 
              value={planTime}
              onChange={(e) => setPlanTime(e.target.value)}
              className={`w-full h-9 px-3 text-xs bg-white border rounded text-slate-800 focus:outline-none focus:border-blue-500 ${
                errors.planTime ? 'border-red-500' : 'border-slate-200'
              }`}
            />
            {errors.planTime && <p className="text-[10px] text-red-500 font-bold">{errors.planTime}</p>}
          </div>
        </div>

        {/* 拜访地址 (上门时必填) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-850">拜访地址 {visitMethod === '上门' && <span className="text-red-500">*</span>}</label>
          <input 
            type="text" 
            placeholder={visitMethod === '上门' ? '请输入客户公司现场具体门牌号及楼层地址...' : '视频会议房间链接或电话号码(选填)...'}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={`w-full h-9 px-3 text-xs bg-white border rounded text-slate-800 focus:outline-none focus:border-blue-500 ${
              errors.address ? 'border-red-500' : 'border-slate-200'
            }`}
          />
          {errors.address && <p className="text-[10px] text-red-500 font-bold">{errors.address}</p>}
        </div>

      </div>

      {/* 底部操作固定栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-45 bg-white border-t border-slate-200 py-3.5 px-6 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] flex justify-end gap-2 lg:pl-[220px]">
        <button
          type="button"
          onClick={() => navigate('/visits')}
          className="px-5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-md transition-colors"
        >
          返回列表
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={handleSave}
          className="px-5 py-2 text-xs font-bold text-white bg-[#1677ff] hover:bg-blue-500 rounded-md transition-colors shadow-sm animate-pulse-once"
        >
          保存计划
        </button>
      </div>
    </div>
  );
}
