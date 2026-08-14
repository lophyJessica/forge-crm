import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Lead } from '../db';
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const CURRENT_USER = '张三';

const SOURCE_MAP: Record<string, string> = {
  ONLINE: '线上申请',
  ACTIVITY: '市场活动',
  EXHIBITION: '展会渠道',
  REFERRAL: '客户转介绍',
  IMPORT: '批量导入',
  OTHER: '其他渠道'
};

const INDUSTRY_MAP: Record<string, string> = {
  MANUFACTURING: '制造业',
  RETAIL: '零售与电商',
  HEALTHCARE: '医疗健康',
  FINANCE: '金融与信托',
  IT: '信息技术',
  OTHER: '其他行业'
};

const getScoreBadge = (score: number) => {
  if (score >= 70) return <Badge variant="success" className="font-mono">{score}分</Badge>;
  if (score >= 40) return <Badge variant="warning" className="font-mono">{score}分</Badge>;
  return <Badge variant="destructive" className="font-mono">{score}分</Badge>;
};

export default function LeadPool() {
  const navigate = useNavigate();

  // 查询筛选状态
  const [keyword, setKeyword] = useState('');
  const [source, setSource] = useState('');
  const [industry, setIndustry] = useState('');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [poolType, setPoolType] = useState('');

  // Toast 状态
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. 获取所有线索
  const leads = useLiveQuery(() => db.leads.toArray()) || [];

  // 自动回收超48小时未跟进的已分配线索
  useEffect(() => {
    if (leads.length === 0) return;

    const checkTimeoutLeads = async () => {
      const assigned = leads.filter(l => l.status === 'ASSIGNED' && l.assignedAt);
      if (assigned.length === 0) return;

      const now = new Date().getTime();
      const timeoutIds: string[] = [];

      for (const lead of assigned) {
        const assignedTime = new Date(lead.assignedAt!).getTime();
        const diffHours = (now - assignedTime) / (1000 * 60 * 60);
        if (diffHours > 48) {
          const followCount = await db.follow_up_records.where('leadId').equals(lead.id).count();
          if (followCount === 0) {
            timeoutIds.push(lead.id);
          }
        }
      }

      if (timeoutIds.length > 0) {
        await db.transaction('rw', db.leads, async () => {
          for (const id of timeoutIds) {
            await db.leads.update(id, {
              status: 'PENDING_ASSIGN',
              owner: undefined,
              assignedAt: undefined
            });
          }
        });
        showToast('系统已自动将分配超48h且未跟进的线索退回待分配池', 'success');
      }
    };

    checkTimeoutLeads();
  }, [leads]);

  // 判断是否已被释放满7天
  const isAbandonedAndReleased = (lead: Lead) => {
    if (lead.status !== 'ABANDONED') return false;
    const timeStr = lead.abandonedAt || lead.followedAt;
    if (!timeStr) return false;
    const abandonedTime = new Date(timeStr).getTime();
    const now = new Date().getTime();
    const diffDays = (now - abandonedTime) / (1000 * 60 * 60 * 24);
    return diffDays >= 7;
  };

  // 2. 筛选在公海里的线索
  const poolLeads = leads.filter(lead => {
    const isNew = lead.status === 'PENDING_ASSIGN';
    const isReleased = isAbandonedAndReleased(lead);
    const isOwnerAbandon = lead.status === 'ABANDONED' && lead.owner === CURRENT_USER;
    
    if (!isNew && !isReleased && !isOwnerAbandon) return false;

    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      const matchComp = lead.company.toLowerCase().includes(kw);
      const matchPhone = lead.phone ? lead.phone.includes(kw) : false;
      const matchId = lead.id.toLowerCase().includes(kw);
      if (!matchComp && !matchPhone && !matchId) return false;
    }

    if (source && lead.source !== source) return false;
    if (industry && lead.industry !== industry) return false;

    if (minScore && lead.score < parseInt(minScore)) return false;
    if (maxScore && lead.score > parseInt(maxScore)) return false;

    if (poolType) {
      if (poolType === 'NEW' && !isNew) return false;
      if (poolType === 'RELEASED' && !isReleased) return false;
    }

    return true;
  }).map(lead => {
    const isNew = lead.status === 'PENDING_ASSIGN';
    return {
      ...lead,
      poolType: isNew ? 'NEW' : 'RELEASED',
      poolTime: isNew ? lead.createdAt : (lead.abandonedAt || lead.followedAt || lead.createdAt)
    };
  }).sort((a, b) => b.score - a.score);

  // 3. 认领交互
  const handleClaim = async (leadId: string) => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    try {
      let isOwnerAbandon = false;
      await db.transaction('rw', db.leads, db.follow_up_records, async () => {
        const lead = await db.leads.get(leadId);
        isOwnerAbandon = !!(lead && lead.status === 'ABANDONED' && lead.owner === CURRENT_USER);

        await db.leads.update(leadId, {
          status: 'ASSIGNED',
          owner: CURRENT_USER,
          assignedAt: nowStr
        });

        await db.follow_up_records.add({
          leadId,
          time: nowStr,
          operator: CURRENT_USER,
          type: '系统记录',
          content: isOwnerAbandon 
            ? `销售 [${CURRENT_USER}] 撤销了放弃，重新恢复跟进该线索。`
            : `销售 [${CURRENT_USER}] 从公海主动认领了该线索。`
        });
      });

      showToast(isOwnerAbandon ? '撤销放弃成功，线索已恢复' : '线索已认领，请及时跟进', 'success');
    } catch (err) {
      console.error(err);
      showToast('认领失败，请重试', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* 顶部 Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800">
          {toastMessage.type === 'success' ? <CheckCircle size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 顶部标题栏 */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-slate-900">线索公海</h1>
          <p className="text-xs text-slate-500">展示所有等待分配的新线索或被放弃流失的呆滞线索，销售可主动认领直接跟进。</p>
        </div>
      </div>

      {/* 查询检索栏 */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="relative md:col-span-2">
            <Input
              placeholder="搜索公司名称/线索编号/手机号..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="pl-8 text-xs h-9"
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          </div>
          
          <div>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">线索来源(全部)</option>
              {Object.entries(SOURCE_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">所属行业(全部)</option>
              {Object.entries(INDUSTRY_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={poolType}
              onChange={(e) => setPoolType(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">入池类型(全部)</option>
              <option value="NEW">新线索</option>
              <option value="RELEASED">已释放</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Input
                type="number"
                placeholder="最小分"
                min="0"
                max="100"
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                className="text-xs h-9"
              />
              <span className="text-slate-400 text-xs">-</span>
              <Input
                type="number"
                placeholder="最大分"
                min="0"
                max="100"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setKeyword('');
                setSource('');
                setIndustry('');
                setPoolType('');
                setMinScore('');
                setMaxScore('');
              }}
              className="shrink-0 text-xs"
            >
              重置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 公海表格区 */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">线索编号</TableHead>
              <TableHead className="w-[180px]">公司名称</TableHead>
              <TableHead className="w-[100px]">线索来源</TableHead>
              <TableHead className="w-[120px]">所属行业</TableHead>
              <TableHead className="w-[80px]">AI评分</TableHead>
              <TableHead className="w-[100px]">入池类型</TableHead>
              <TableHead className="w-[160px]">入池时间</TableHead>
              <TableHead>放弃原因</TableHead>
              <TableHead className="text-right w-[100px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {poolLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-slate-400">
                  公海暂无符合筛选要求的线索
                </TableCell>
              </TableRow>
            ) : (
              poolLeads.map(lead => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <span 
                      className="font-mono font-medium text-blue-600 cursor-pointer hover:underline"
                      onClick={() => navigate(`/leads/${lead.id}`)}
                    >
                      {lead.id}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">{lead.company}</TableCell>
                  <TableCell className="text-slate-600">{SOURCE_MAP[lead.source] || lead.source}</TableCell>
                  <TableCell className="text-slate-600">{INDUSTRY_MAP[lead.industry || ''] || lead.industry || '—'}</TableCell>
                  <TableCell>{getScoreBadge(lead.score)}</TableCell>
                  <TableCell>
                    {lead.poolType === 'NEW' ? (
                      <Badge variant="info">新线索</Badge>
                    ) : (
                      <Badge variant="secondary">已释放</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-slate-500 text-[11px]">{lead.poolTime}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-slate-500" title={lead.abandonedReason}>
                    {lead.poolType === 'RELEASED' ? lead.abandonedReason : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => handleClaim(lead.id)}
                      className={`h-7 px-2.5 text-xs ${
                        lead.owner === CURRENT_USER && lead.status === 'ABANDONED'
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      <UserCheck size={12} className="mr-1" />
                      <span>{lead.owner === CURRENT_USER && lead.status === 'ABANDONED' ? '撤销放弃' : '认领'}</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
