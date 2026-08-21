import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Search, Download, CheckCircle, XCircle } from 'lucide-react';
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

const INDUSTRY_MAP: Record<string, string> = {
  MANUFACTURING: '制造业',
  RETAIL: '零售与电商',
  HEALTHCARE: '医疗健康',
  FINANCE: '金融与信托',
  IT: '信息技术',
  OTHER: '其他行业'
};

const getLevelBadge = (level?: string) => {
  switch (level) {
    case 'VIP':
      return <Badge variant="purple">VIP 级</Badge>;
    case 'A':
      return <Badge variant="info">A 级</Badge>;
    case 'B':
      return <Badge variant="warning">B 级</Badge>;
    case 'C':
      return <Badge variant="secondary">C 级</Badge>;
    default:
      return <Badge variant="outline">{level || '标准'}</Badge>;
  }
};

const getRiskBadge = (risk?: string) => {
  switch (risk) {
    case 'HIGH':
      return <Badge variant="destructive">高风险</Badge>;
    case 'MEDIUM':
      return <Badge variant="warning">中风险</Badge>;
    case 'LOW':
      return <Badge variant="success">低风险</Badge>;
    default:
      return <Badge variant="outline">正常</Badge>;
  }
};

const getStageLabel = (stage: string) => {
  const map: Record<string, string> = {
    INITIAL_CONTACT: '初步接触',
    NEEDS_CONFIRM: '需求确认',
    PROPOSAL: '方案报价',
    NEGOTIATION: '商务谈判',
    CONTRACT: '合同签订',
    WON: '赢单',
    LOST: '输单'
  };
  return map[stage] || stage;
};

export default function CustomersList() {
  const navigate = useNavigate();

  // 查询筛选状态
  const [keyword, setKeyword] = useState('');
  const [industry, setIndustry] = useState('');
  const [level, setLevel] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [lifecycleStatus, setLifecycleStatus] = useState('');
  const [syncStatus, setSyncStatus] = useState('');

  // 分页状态
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, industry, level, riskLevel, lifecycleStatus, syncStatus]);
  
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 实时拉取多表数据用于聚合计算
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const opportunities = useLiveQuery(() => db.opportunities.toArray()) || [];
  const leads = useLiveQuery(() => db.leads.toArray()) || [];
  const leadFollowUps = useLiveQuery(() => db.follow_up_records.toArray()) || [];
  const oppFollowUps = useLiveQuery(() => db.opportunity_follow_ups.toArray()) || [];

  // 多表聚合计算客户扩展字段
  const enrichedCustomers = customers.map(cust => {
    const associatedOpps = opportunities.filter(o =>
      o.customerId === cust.id || Boolean(cust.erpCustomerId && o.erpCustomerId === cust.erpCustomerId)
    );
    
    let latestOppStage = '—';
    if (associatedOpps.length > 0) {
      const sortedOpps = [...associatedOpps].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      latestOppStage = getStageLabel(sortedOpps[0].status);
    }

    const matchingLeads = leads.filter(l => l.convertedToCustomerId === cust.id);
    
    const currentLeadFollowTimes = leadFollowUps
      .filter(f => matchingLeads.some(l => l.id === f.leadId))
      .map(f => f.time);

    const currentOppFollowTimes = oppFollowUps
      .filter(f => associatedOpps.some(o => o.id === f.oppId))
      .map(f => f.time);

    const allFollowTimes = [...currentLeadFollowTimes, ...currentOppFollowTimes].sort((a, b) => b.localeCompare(a));
    const latestFollowTime = allFollowTimes.length > 0 ? allFollowTimes[0] : cust.createdAt;

    return {
      ...cust,
      oppCount: associatedOpps.length,
      latestOppStage,
      latestFollowTime
    };
  });

  // 内存过滤与排序
  const filteredCustomers = enrichedCustomers.filter(cust => {
    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      const matchName = cust.name.toLowerCase().includes(kw);
      const matchContact = (cust.contact || '').toLowerCase().includes(kw);
      const matchPhone = (cust.phone || '').includes(kw);
      const matchId = `${cust.id} ${cust.erpCustomerId || ''}`.toLowerCase().includes(kw);
      if (!matchName && !matchContact && !matchPhone && !matchId) return false;
    }

    if (industry && cust.industry !== industry) return false;
    if (level && cust.level !== level) return false;
    if (riskLevel && cust.riskLevel !== riskLevel) return false;
    if (lifecycleStatus && (cust.lifecycleStatus || 'ACTIVE') !== lifecycleStatus) return false;
    if (syncStatus && (cust.syncStatus || 'AVAILABLE') !== syncStatus) return false;

    return true;
  }).sort((a, b) => (b.latestFollowTime || '').localeCompare(a.latestFollowTime || ''));

  // 分页计算
  const totalCount = filteredCustomers.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const pagedCustomers = filteredCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExport = () => {
    showToast('客户快照列表导出成功，文件正在下载...', 'success');
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

      {/* 头部标题区 */}
      <div className="flex justify-between items-center" data-anno="customers-list-page-header">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-slate-900">客户管理</h1>
          <p className="text-xs text-slate-500">同步展示 ERP 客户正式建档快照，汇聚线索、商机、发货订单与流失风险监控。</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download size={14} className="mr-1" />
            <span>导出客户</span>
          </Button>
        </div>
      </div>

      {/* 筛选过滤区 */}
      <Card data-anno="customers-list-filter-bar">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="relative md:col-span-2">
            <Input 
              placeholder="搜索客户名称、联系人、手机号、编码..." 
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="pl-8 text-xs h-9"
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
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
              value={level} 
              onChange={(e) => setLevel(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">客户等级(全部)</option>
              <option value="VIP">VIP 级</option>
              <option value="A">A 级</option>
              <option value="B">B 级</option>
              <option value="C">C 级</option>
            </select>
          </div>

          <div className="flex gap-2 items-center">
            <select 
              value={riskLevel} 
              onChange={(e) => setRiskLevel(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">流失风险(全部)</option>
              <option value="HIGH">高风险</option>
              <option value="MEDIUM">中等风险</option>
              <option value="LOW">低风险</option>
            </select>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                setKeyword('');
                setIndustry('');
                setLevel('');
                setRiskLevel('');
                setLifecycleStatus('');
                setSyncStatus('');
              }}
              className="shrink-0 text-xs"
            >
              重置
            </Button>
          </div>
          <div>
            <select value={lifecycleStatus} onChange={(event) => setLifecycleStatus(event.target.value)} className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500" aria-label="客户生命周期">
              <option value="">生命周期(全部)</option>
              <option value="ACTIVE">可用</option>
              <option value="DISABLED">已停用</option>
              <option value="MERGED">已合并</option>
            </select>
          </div>
          <div>
            <select value={syncStatus} onChange={(event) => setSyncStatus(event.target.value)} className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500" aria-label="客户同步状态">
              <option value="">同步状态(全部)</option>
              <option value="AVAILABLE">可用</option>
              <option value="PENDING_RECEIVE">待接收</option>
              <option value="VALIDATING">校验中</option>
              <option value="SYNC_FAILED">同步失败</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 客户表格 */}
      <Card className="overflow-hidden" data-anno="customers-list-table-fields">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">客户编号 (CRM)</TableHead>
              <TableHead className="w-[200px]">公司名称</TableHead>
              <TableHead className="w-[100px]">首要联系人</TableHead>
              <TableHead className="w-[120px]">所属行业</TableHead>
              <TableHead className="w-[100px]">客户等级</TableHead>
              <TableHead className="w-[100px]">生命周期</TableHead>
              <TableHead className="w-[100px]">同步状态</TableHead>
              <TableHead className="w-[100px]">关联商机数</TableHead>
              <TableHead className="w-[120px]">最近商机阶段</TableHead>
              <TableHead className="w-[100px]" data-anno="customers-list-risk-display">AI流失风险</TableHead>
              <TableHead className="w-[160px]">最近跟进时间</TableHead>
              <TableHead className="text-right w-[80px]" data-anno="customers-list-row-operations">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {totalCount === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-10 text-slate-400">
                  未检索到符合条件的客户档案
                </TableCell>
              </TableRow>
            ) : (
              pagedCustomers.map(cust => {
                const custId = cust.id;
                return (
                  <TableRow key={custId}>
                    <TableCell className="font-mono text-slate-500 font-medium">
                      <span className="block">{custId}</span>
                      <span className="block text-[10px] text-slate-400">ERP: {cust.erpCustomerId || '待同步'}</span>
                    </TableCell>
                    <TableCell>
                      <span 
                        className="font-medium text-blue-600 cursor-pointer hover:underline"
                        onClick={() => navigate(`/customers/${custId}`)}
                      >
                        {cust.name}
                      </span>
                      <Badge variant={cust.lifecycleStatus === 'DISABLED' ? 'destructive' : 'success'} className="ml-2 text-[10px]">
                        {cust.lifecycleStatus === 'DISABLED' ? '已停用' : '可用'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-700">{cust.contact || '—'}</TableCell>
                    <TableCell className="text-slate-600">{INDUSTRY_MAP[cust.industry] || cust.industry || '—'}</TableCell>
                    <TableCell>{getLevelBadge(cust.level)}</TableCell>
                    <TableCell>
                      <Badge variant={(cust.lifecycleStatus || 'ACTIVE') === 'ACTIVE' ? 'success' : 'secondary'}>
                        {(cust.lifecycleStatus || 'ACTIVE') === 'ACTIVE' ? '可用' : (cust.lifecycleStatus === 'DISABLED' ? '已停用' : '已合并')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={(cust.syncStatus || 'AVAILABLE') === 'AVAILABLE' ? 'success' : ((cust.syncStatus || '') === 'SYNC_FAILED' ? 'destructive' : 'warning')}>
                        {(cust.syncStatus || 'AVAILABLE') === 'AVAILABLE' ? '可用' : (cust.syncStatus === 'SYNC_FAILED' ? '同步失败' : (cust.syncStatus === 'VALIDATING' ? '校验中' : '待接收'))}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono font-medium text-slate-800">{cust.oppCount} 个</TableCell>
                    <TableCell className="text-slate-700">{cust.latestOppStage}</TableCell>
                    <TableCell>{getRiskBadge(cust.riskLevel)}</TableCell>
                    <TableCell className="font-mono text-slate-500 text-[11px]">{cust.latestFollowTime}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/customers/${custId}`)}
                        className="h-7 px-2 text-xs text-blue-600"
                      >
                        查看
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* 分页 */}
        <div className="flex justify-between items-center px-4 py-3 border-t border-slate-100 text-xs text-slate-500" data-anno="customers-list-pagination">
          <div className="flex items-center gap-3">
            <span>共 {totalCount} 条记录</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setCurrentPage(1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="h-8 px-2 text-xs bg-white border border-slate-200 rounded text-slate-700 focus:outline-none"
            >
              <option value={20}>20 条/页</option>
              <option value={50}>50 条/页</option>
              <option value={100}>100 条/页</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                if (currentPage > 1) {
                  setCurrentPage(prev => prev - 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              disabled={currentPage === 1}
              className="h-8 px-3 text-xs"
            >
              上一页
            </Button>
            <span className="font-mono text-slate-600">{currentPage} / {totalPages}</span>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                if (currentPage < totalPages) {
                  setCurrentPage(prev => prev + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              disabled={currentPage === totalPages}
              className="h-8 px-3 text-xs"
            >
              下一页
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
