import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Search, Plus, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CURRENT_USER } from '@/domain/businessRules';
import { archiveContract, receiveMockSignedEvent, submitContractForSigning, voidContract } from '@/domain/contractActions';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'DRAFT':
      return <Badge variant="secondary">草稿</Badge>;
    case 'PENDING_SIGN':
      return <Badge variant="info">待签署</Badge>;
    case 'SIGNED':
      return <Badge variant="success">已签署</Badge>;
    case 'ARCHIVED':
      return <Badge variant="purple">已归档</Badge>;
    case 'VOIDED':
      return <Badge variant="destructive">已作废</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const formatCurrency = (val: number) => {
  return '¥' + val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function ContractList() {
  const navigate = useNavigate();

  // 1. 查询条件与过滤状态
  const [activeTab, setActiveTab] = useState<'ALL' | 'DRAFT' | 'PENDING' | 'SIGNED' | 'VOIDED'>('ALL');
  const [keyword, setKeyword] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // 作废弹窗状态
  const [voidContractId, setVoidContractId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [archiveContractId, setArchiveContractId] = useState<string | null>(null);
  const [archiveReason, setArchiveReason] = useState('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 2. 实时从数据库加载合同
  const contracts = useLiveQuery(() => db.contracts.toArray()) || [];

  // 3. 联动重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, keyword, dateFrom, dateTo]);

  // 4. 内存过滤与排序
  const filteredContracts = contracts.filter(ct => {
    if (activeTab === 'DRAFT' && ct.status !== 'DRAFT') return false;
    if (activeTab === 'PENDING' && ct.status !== 'PENDING_SIGN') return false;
    if (activeTab === 'SIGNED' && ct.status !== 'SIGNED' && ct.status !== 'ARCHIVED') return false;
    if (activeTab === 'VOIDED' && ct.status !== 'VOIDED') return false;

    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      const matchId = ct.id.toLowerCase().includes(kw);
      const matchTitle = ct.title.toLowerCase().includes(kw);
      const matchCustomer = ct.customerName.toLowerCase().includes(kw);
      const matchOpp = ct.oppTitle?.toLowerCase().includes(kw);
      if (!matchId && !matchTitle && !matchCustomer && !matchOpp) return false;
    }

    const effectiveDate = (ct.signedDate || ct.createdAt).slice(0, 10);
    if (dateFrom && effectiveDate < dateFrom) return false;
    if (dateTo && effectiveDate > dateTo) return false;

    return true;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const totalCount = filteredContracts.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const pagedContracts = filteredContracts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 5. 核心行内操作
  const handleSubmitSign = async (id: string) => {
    if (!window.confirm('确认合同信息完整，并提交外部签署流程？')) return;
    const result = await submitContractForSigning(id);
    showToast(result.message, result.ok ? 'success' : 'error');
  };

  const handleSign = async (id: string) => {
    if (!window.confirm('仅用于 Demo：确认模拟接收一条“已验签”的外部签署完成事件？')) return;
    const result = await receiveMockSignedEvent(id);
    showToast(result.message, result.ok ? 'success' : 'error');
  };

  const handleArchive = async () => {
    if (!archiveContractId) return;
    const result = await archiveContract(archiveContractId, CURRENT_USER.name, archiveReason);
    showToast(result.message, result.ok ? 'success' : 'error');
    if (result.ok) {
      setArchiveContractId(null);
      setArchiveReason('');
    }
  };

  const handleVoid = async () => {
    if (!voidContractId || !voidReason.trim()) return;
    const result = await voidContract(voidContractId, voidReason);
    showToast(result.message, result.ok ? 'success' : 'error');
    if (result.ok) {
      setVoidContractId(null);
      setVoidReason('');
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

      {/* 头部标题区 */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-slate-900">合同管理</h1>
          <p className="text-xs text-slate-500">签署事件可触发商机赢单；ERP 订单串联尚未接入时仅展示未触发状态，不生成本地伪订单。</p>
        </div>
        <Button 
          data-anno="contract-list-create-tool"
          size="sm"
          onClick={() => navigate('/contracts/new')}
        >
          <Plus size={14} className="mr-1" />
          <span>新建合同</span>
        </Button>
      </div>

      {/* 4 个业务核心 Tab */}
      <div className="border-b border-slate-200" data-anno="contract-list-status-tabs">
        <div className="flex gap-6">
          {[
            { key: 'ALL', label: '全部合同', count: contracts.length },
            { key: 'DRAFT', label: '草稿', count: contracts.filter(c => c.status === 'DRAFT').length },
            { key: 'PENDING', label: '待签署', count: contracts.filter(c => c.status === 'PENDING_SIGN').length },
            { key: 'SIGNED', label: '已签署/归档', count: contracts.filter(c => ['SIGNED', 'ARCHIVED'].includes(c.status)).length },
            { key: 'VOIDED', label: '已作废', count: contracts.filter(c => c.status === 'VOIDED').length }
          ].map(tab => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as any)}
                className={`pb-2.5 text-xs font-semibold transition-all relative cursor-pointer flex items-center gap-1.5 ${
                  active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <Badge variant={active ? 'default' : 'secondary'} className="h-4 px-1.5 text-[10px] font-mono">
                  {tab.count}
                </Badge>
                {active && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 筛选过滤区 */}
      <Card data-anno="contract-list-filter-bar">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
          <div className="relative flex-1">
            <Input 
              placeholder="搜索合同名称、编号、关联客户、关联商机..." 
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="pl-8 text-xs h-9"
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          </div>
          <div className="flex items-center gap-2">
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="text-xs h-9" aria-label="合同开始日期" />
            <span className="text-slate-400 text-xs">至</span>
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="text-xs h-9" aria-label="合同结束日期" />
          </div>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => {
              setKeyword('');
              setDateFrom('');
              setDateTo('');
            }}
            className="text-xs"
          >
            重置
          </Button>
        </CardContent>
      </Card>

      {/* 合同表格 */}
      <Card className="overflow-hidden" data-anno="contract-list-table-fields">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">合同编号</TableHead>
              <TableHead className="w-[200px]">合同名称</TableHead>
              <TableHead className="w-[160px]">关联客户</TableHead>
              <TableHead className="w-[120px]">合同金额</TableHead>
              <TableHead className="w-[100px]">合同状态</TableHead>
              <TableHead className="w-[150px]">联动状态</TableHead>
              <TableHead className="w-[140px]">签署日期</TableHead>
              <TableHead className="text-right w-[200px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {totalCount === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-slate-400">
                  未检索到符合条件的合同记录
                </TableCell>
              </TableRow>
            ) : (
              pagedContracts.map(ct => (
                <TableRow key={ct.id}>
                  <TableCell>
                    <span 
                      className="font-mono font-medium text-blue-600 cursor-pointer hover:underline"
                      onClick={() => navigate(`/contracts/${ct.id}`)}
                    >
                      {ct.id}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">{ct.title}</TableCell>
                  <TableCell className="text-slate-700">{ct.customerName}</TableCell>
                  <TableCell className="font-mono font-medium text-slate-800">{formatCurrency(ct.amount)}</TableCell>
                  <TableCell>{getStatusBadge(ct.status)}</TableCell>
                  <TableCell className="text-[11px] text-slate-500">
                    商机：{ct.opportunitySyncStatus === 'SUCCESS' ? '已完成' : '未触发'} · ERP：{ct.erpOrderSyncStatus === 'SUCCESS' ? '已完成' : '未触发'}
                  </TableCell>
                  <TableCell className="font-mono text-slate-500">{ct.signedDate || '—'}</TableCell>
                  <TableCell className="text-right space-x-1.5" data-anno="contract-list-row-operations">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/contracts/${ct.id}`)}
                      className="h-7 px-2 text-xs"
                    >
                      查看
                    </Button>

                    {ct.status === 'DRAFT' && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/contracts/${ct.id}/edit`)}
                          className="h-7 px-2 text-xs text-blue-600"
                        >
                          编辑
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSubmitSign(ct.id)}
                          className="h-7 px-2 text-xs text-indigo-600 font-medium"
                        >
                          提交签署
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setVoidContractId(ct.id)}
                          className="h-7 px-2 text-xs text-red-600"
                        >
                          作废
                        </Button>
                      </>
                    )}

                    {ct.status === 'PENDING_SIGN' && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSign(ct.id)}
                          className="h-7 px-2 text-xs text-emerald-600 font-medium"
                        >
                          模拟接收签署完成事件
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setVoidContractId(ct.id)}
                          className="h-7 px-2 text-xs text-red-600"
                        >
                          作废
                        </Button>
                      </>
                    )}

                    {ct.status === 'SIGNED' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setArchiveContractId(ct.id)}
                        className="h-7 px-2 text-xs text-purple-600 font-medium"
                      >
                        申请归档
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* 分页 */}
        <div className="flex justify-between items-center px-4 py-3 border-t border-slate-100 text-xs text-slate-500" data-anno="contract-list-pagination">
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

      {/* 作废原因确认 Dialog */}
      <Dialog open={!!voidContractId} onOpenChange={(open) => {
        if (!open) {
          setVoidContractId(null);
          setVoidReason('');
        }
      }}>
        <DialogContent className="max-w-sm" data-anno="contract-list-void-dialog">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-red-600">
              <AlertTriangle size={18} />
              <span>作废合同确认</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <p className="text-xs text-slate-500">
              请填写作废原因，此操作将解除商机强绑定并回退商机到商务谈判阶段：
            </p>
            <Textarea
              rows={3}
              placeholder="请输入详细的合同作废原因..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />
            <p className="text-[11px] text-slate-400">至少10个字，已输入 {voidReason.trim().length}/10 字</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                setVoidContractId(null);
                setVoidReason('');
              }}
            >
              取消
            </Button>
            <Button 
              variant="destructive"
              size="sm"
              disabled={voidReason.trim().length < 10}
              onClick={handleVoid}
            >
              确认作废
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 归档前置条件确认 Dialog */}
      <Dialog open={!!archiveContractId} onOpenChange={(open) => {
        if (!open) {
          setArchiveContractId(null);
          setArchiveReason('');
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">申请合同归档</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">只有商机联动和 ERP 订单联动均成功后才能归档。当前 ERP 串联未接入的合同会被规则阻断。</p>
          <Textarea
            rows={3}
            placeholder="请输入归档原因"
            value={archiveReason}
            onChange={(event) => setArchiveReason(event.target.value)}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setArchiveContractId(null)}>取消</Button>
            <Button size="sm" disabled={!archiveReason.trim()} onClick={handleArchive}>校验并归档</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
