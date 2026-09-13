import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { db } from '../db';
import { ChevronLeft, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CURRENT_USER, shanghaiNow, shanghaiToday } from '@/domain/businessRules';

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
  const [planEndTime, setPlanEndTime] = useState('');
  const [address, setAddress] = useState('');

  const [loading, setLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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
          const list = await db.customers.filter(c => c.lifecycleStatus === 'ACTIVE' && c.syncStatus === 'AVAILABLE').toArray();
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
          setPlanTime(v.planTime.replace(' ', 'T'));
          setPlanEndTime(v.planEndTime?.replace(' ', 'T') || '');
          setAddress(v.address || '');

          if (v.status !== 'PLANNED') {
            showToast('该拜访已启动或取消，不可编辑', 'error');
            navigate('/visits');
          }
        }
      });
    } else {
      const defaultType = (location.state as any)?.defaultAssocType;
      const defaultId = (location.state as any)?.defaultAssocId;
      if (defaultType && defaultId) {
        setAssociationType(defaultType);
        setAssociationId(defaultId);
        setIsLocked(true);

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
  }, [isEdit, id, location.state, navigate]);

  const generateVisitId = async () => {
    const todayStr = shanghaiToday().replace(/-/g, '');
    const prefix = `VS${todayStr}-`;
    const ids = await db.visits.filter(item => item.id.startsWith(prefix)).primaryKeys();
    const nextIndex = ids.reduce((max, key) => {
      const suffix = Number(String(key).slice(prefix.length));
      return Number.isFinite(suffix) ? Math.max(max, suffix) : max;
    }, 0) + 1;
    const indexStr = String(nextIndex).padStart(4, '0');
    return `VS${todayStr}-${indexStr}`;
  };

  // 3. 提交保存
  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = '请输入拜访标题';
    if (!associationId) newErrors.associationId = '请选择要关联的具体对象';
    if (!planTime) newErrors.planTime = '请选择计划拜访时间';
    if (!planEndTime) newErrors.planEndTime = '请选择计划结束时间';
    if (planTime && planEndTime && planEndTime <= planTime) newErrors.planEndTime = '计划结束时间必须晚于开始时间';
    if (visitMethod === '上门' && !address.trim()) newErrors.address = '上门拜访必须填写拜访地址';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('表单有必填项未完善', 'error');
      return;
    }

    setLoading(true);
    try {
      const nowStr = shanghaiNow();
      const formattedPlanTime = planTime.replace('T', ' ');
      const formattedPlanEndTime = planEndTime.replace('T', ' ');

      let associationName = '';
      if (associationType === 'LEAD') {
        const lead = await db.leads.get(associationId);
        associationName = lead?.company || '';
      } else if (associationType === 'OPPORTUNITY') {
        const opp = await db.opportunities.get(associationId);
        associationName = opp?.title || '';
      } else if (associationType === 'CUSTOMER') {
        const cust = await db.customers.get(associationId);
        if (!cust || cust.lifecycleStatus !== 'ACTIVE' || cust.syncStatus !== 'AVAILABLE') {
          throw new Error('关联客户已停用或快照不可用，禁止新建拜访');
        }
        associationName = cust?.name || '';
      }

      if (isEdit && id) {
        const current = await db.visits.get(id);
        if (!current || current.status !== 'PLANNED') throw new Error('仅已计划状态可编辑');
        await db.visits.update(id, {
          title,
          associationType,
          associationId,
          associationName,
          visitMethod,
          planTime: formattedPlanTime,
          planEndTime: formattedPlanEndTime,
          assigneeId: current.assigneeId || CURRENT_USER.id,
          assigneeName: current.assigneeName || CURRENT_USER.name,
          address: address.trim() || undefined,
          version: (current.version || 0) + 1,
          updatedAt: nowStr,
        });
      } else {
        const newId = await generateVisitId();
        await db.visits.add({
          id: newId,
          title,
          associationType,
          associationId,
          associationName,
          visitMethod,
          planTime: formattedPlanTime,
          planEndTime: formattedPlanEndTime,
          assigneeId: CURRENT_USER.id,
          assigneeName: CURRENT_USER.name,
          address: address.trim() || undefined,
          status: 'PLANNED',
          executionResult: 'NOT_STARTED',
          executionException: 'NONE',
          locationSource: 'NONE',
          locationReliability: 'UNAVAILABLE',
          authorizationResult: 'NOT_REQUESTED',
          version: 1,
          createdAt: nowStr,
          createdBy: CURRENT_USER.name,
        });
      }

      showToast('拜访计划保存成功');
      setTimeout(() => navigate('/visits'), 800);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '数据库操作失败，请重试', 'error');
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
      <div className="flex items-center gap-3" data-anno="visit-form-page-header">
        <Button 
          variant="outline"
          size="icon"
          onClick={() => navigate('/visits')}
          className="h-8 w-8"
        >
          <ChevronLeft size={16} />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-slate-900">{isEdit ? '编辑计划' : '制定拜访计划'}</h1>
          <p className="text-xs text-slate-500">安排与客户、线索方的面对面或视频/电话沟通议程</p>
        </div>
      </div>

      {/* 表单卡片 */}
      <Card data-anno="visit-form-basic">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-sm font-semibold">拜访计划详情</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* 关联类型 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="block mb-2">
                关联对象类型 <span className="text-red-500">*</span>
              </Label>
              <select
                value={associationType}
                disabled={isLocked || isEdit}
                onChange={(e) => {
                  setAssociationType(e.target.value as any);
                  setAssociationId('');
                }}
                className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="LEAD">线索</option>
                <option value="OPPORTUNITY">商机</option>
                <option value="CUSTOMER">正式客户</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <Label className="block mb-2">
                选择具体关联目标 <span className="text-red-500">*</span>
              </Label>
              <select
                value={associationId}
                disabled={isLocked || isEdit}
                onChange={(e) => setAssociationId(e.target.value)}
                className={`w-full h-9 px-3 text-xs bg-white border rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 ${
                  errors.associationId ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'
                }`}
              >
                <option value="">-- 请选择 --</option>
                {options.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
              {errors.associationId && <p className="text-[11px] text-red-500 block mt-1">{errors.associationId}</p>}
            </div>
          </div>

          {/* 拜访标题 */}
          <div>
            <Label htmlFor="title" className="block mb-2">
              拜访计划主题 <span className="text-red-500">*</span>
            </Label>
            <Input 
              id="title"
              placeholder="例如: 华东智能仓储方案现场演示与商务沟通会"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-[11px] text-red-500 block mt-1">{errors.title}</p>}
          </div>

          {/* 拜访方式 & 时间 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="block mb-2">
                拜访沟通方式 <span className="text-red-500">*</span>
              </Label>
              <select
                value={visitMethod}
                onChange={(e) => setVisitMethod(e.target.value as any)}
                className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="上门">🚶 上门拜访</option>
                <option value="电话">📞 电话回访</option>
                <option value="视频">💻 视频会议</option>
              </select>
            </div>

            <div>
              <Label htmlFor="planTime" className="block mb-2">
                计划拜访时间 <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="planTime"
                type="datetime-local" 
                value={planTime}
                onChange={(e) => setPlanTime(e.target.value)}
                className={errors.planTime ? 'border-red-500' : ''}
              />
              {errors.planTime && <p className="text-[11px] text-red-500 block mt-1">{errors.planTime}</p>}
            </div>

            <div>
              <Label htmlFor="planEndTime" className="block mb-2">
                计划结束时间 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="planEndTime"
                type="datetime-local"
                value={planEndTime}
                onChange={(event) => setPlanEndTime(event.target.value)}
                className={errors.planEndTime ? 'border-red-500' : ''}
              />
              {errors.planEndTime && <p className="text-[11px] text-red-500 block mt-1">{errors.planEndTime}</p>}
            </div>

            <div>
              <Label className="block mb-2">负责人</Label>
              <Input value={`${CURRENT_USER.name}（${CURRENT_USER.id}）`} disabled className="bg-slate-50" />
            </div>
          </div>

          {/* 拜访地址 */}
          <div>
            <Label htmlFor="address" className="block mb-2">
              拜访地址 {visitMethod === '上门' && <span className="text-red-500">*</span>}
            </Label>
            <Input 
              id="address"
              placeholder={visitMethod === '上门' ? '请输入客户公司现场具体门牌号及楼层地址...' : '视频会议房间链接或电话号码(选填)...'}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={errors.address ? 'border-red-500' : ''}
            />
            {errors.address && <p className="text-[11px] text-red-500 block mt-1">{errors.address}</p>}
          </div>
        </CardContent>
      </Card>

      {/* 底部操作固定栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 py-3.5 px-6 shadow-sm flex justify-end gap-2 lg:pl-[220px]" data-anno="visit-form-footer">
        <Button
          data-anno="visit-form-save-action"
          variant="outline"
          size="sm"
          onClick={() => navigate('/visits')}
        >
          返回列表
        </Button>

        <Button
          size="sm"
          disabled={loading}
          onClick={handleSave}
        >
          保存计划
        </Button>
      </div>
    </div>
  );
}
