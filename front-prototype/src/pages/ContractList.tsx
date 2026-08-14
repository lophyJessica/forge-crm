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
  const [activeTab, setActiveTab] = useState<'ALL' | 'DRAFT' | 'PENDING' | 'SIGNED'>('ALL');
  const [keyword, setKeyword] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // 作废弹窗状态
  const [voidContractId, setVoidContractId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 2. 实时从数据库加载合同
  const contracts = useLiveQuery(() => db.contracts.toArray()) || [];

  // 3. 联动重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, keyword]);

  // 4. 内存过滤与排序
  const filteredContracts = contracts.filter(ct => {
    if (activeTab === 'DRAFT' && ct.status !== 'DRAFT') return false;
    if (activeTab === 'PENDING' && ct.status !== 'PENDING_SIGN') return false;
    if (activeTab === 'SIGNED' && ct.status !== 'SIGNED' && ct.status !== 'ARCHIVED') return false;

    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      const matchId = ct.id.toLowerCase().includes(kw);
      const matchTitle = ct.title.toLowerCase().includes(kw);
      const matchCustomer = ct.customerName.toLowerCase().includes(kw);
      const matchOpp = ct.oppTitle?.toLowerCase().includes(kw);
      if (!matchId && !matchTitle && !matchCustomer && !matchOpp) return false;
    }

    return true;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const totalCount = filteredContracts.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const pagedContracts = filteredContracts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 5. 核心行内操作
  const handleSubmitSign = async (id: string) => {
    await db.contracts.update(id, {
      status: 'PENDING_SIGN',
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
    });
    showToast('合同已提交签署，已成功通知签约各方！');
  };

  const handleSign = async (id: string) => {
    const contract = await db.contracts.get(id);
    if (!contract) return;

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const todayYmd = nowStr.slice(0, 10);

    await db.transaction('rw', db.contracts, db.opportunities, db.erp_orders, db.opportunity_follow_ups, async () => {
      await db.contracts.update(id, {
        status: 'SIGNED',
        signedDate: todayYmd,
        updatedAt: nowStr
      });

      if (contract.oppId) {
        await db.opportunities.update(contract.oppId, {
          status: 'WON',
          contractNo: contract.id,
          wonAt: nowStr,
          amount: contract.amount,
          updatedAt: nowStr
        });

        await db.opportunity_follow_ups.add({
          oppId: contract.oppId,
          time: nowStr,
          operator: contract.createdBy || '系统',
          type: '系统',
          content: `【合同回写】关联电子签署合同 [${contract.id}] 已签署通过。商机自动推进至 [赢单] 阶段，最终成交金额定格为 ${formatCurrency(contract.amount)}，并下推 ERP 销售订单。`
        });

        const orderId = `ORD${todayYmd.replace(/-/g, '')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
        await db.erp_orders.add({
          id: orderId,
          customerId: contract.customerId,
          amount: contract.amount,
          date: todayYmd,
          status: 'PENDING_DELIVERY'
        });
      }
    });

    showToast('合同签署成功！已联动触发商机赢单并同步下推 ERP 生成销售发货单。');
  };

  const handleArchive = async (id: string) => {
    await db.contracts.update(id, {
      status: 'ARCHIVED',
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
    });
    showToast('合同已成功归档并归档封存。');
  };

  const handleVoid = async () => {
    if (!voidContractId || !voidReason.trim()) return;
    const contract = await db.contracts.get(voidContractId);
    if (!contract) return;

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

    await db.transaction('rw', db.contracts, db.opportunities, db.opportunity_follow_ups, async () => {
      await db.contracts.update(voidContractId, {
        status: 'VOIDED',
        voidReason: voidReason,
        updatedAt: nowStr
      });

      if (contract.oppId) {
        await db.opportunities.update(contract.oppId, {
          status: 'NEGOTIATION',
          contractNo: undefined,
          updatedAt: nowStr
        });

        await db.opportunity_follow_ups.add({
          oppId: contract.oppId,
          time: nowStr,
          operator: '系统',
          type: '系统',
          content: `【合同作废】关联合同 [${contract.id}] 已被作废（作废原因：${voidReason}），解除 1:1 互锁，商机重置回退至 [商务谈判] 阶段，允许重新发起合同签订。`
        });
      }
    });

    setVoidContractId(null);
    setVoidReason('');
    showToast('合同已作废，关联商机已自动退回至商务谈判阶段并解除互锁。');
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
          <p className="text-xs text-slate-500">管理商机成交归结的电子签署文件，签署完成自动触发商机赢单并下推 ERP，作废可解锁商机退回谈判。</p>
        </div>
        <Button 
          size="sm"
          onClick={() => navigate('/contracts/new')}
        >
          <Plus size={14} className="mr-1" />
          <span>新建合同</span>
        </Button>
      </div>

      {/* 4 个业务核心 Tab */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          {[
            { key: 'ALL', label: '全部合同', count: contracts.length },
            { key: 'DRAFT', label: '草稿', count: contracts.filter(c => c.status === 'DRAFT').length },
            { key: 'PENDING', label: '待签署', count: contracts.filter(c => c.status === 'PENDING_SIGN').length },
            { key: 'SIGNED', label: '已签署/归档', count: contracts.filter(c => ['SIGNED', 'ARCHIVED'].includes(c.status)).length }
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
      <Card>
        <CardContent className="p-4 flex gap-3 items-center">
          <div className="relative flex-1">
            <Input 
              placeholder="搜索合同名称、编号、关联客户、关联商机..." 
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="pl-8 text-xs h-9"
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          </div>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setKeyword('')}
            className="text-xs"
          >
            重置
          </Button>
        </CardContent>
      </Card>

      {/* 合同表格 */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">合同编号</TableHead>
              <TableHead className="w-[200px]">合同名称</TableHead>
              <TableHead className="w-[160px]">关联客户</TableHead>
              <TableHead className="w-[120px]">合同金额</TableHead>
              <TableHead className="w-[100px]">合同状态</TableHead>
              <TableHead className="w-[140px]">签署日期</TableHead>
              <TableHead className="text-right w-[200px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {totalCount === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-slate-400">
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
                  <TableCell className="font-mono text-slate-500">{ct.signedDate || '—'}</TableCell>
                  <TableCell className="text-right space-x-1.5">
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
                          签署完成
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
                        onClick={() => handleArchive(ct.id)}
                        className="h-7 px-2 text-xs text-purple-600 font-medium"
                      >
                        合同归档
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* 分页 */}
        <div className="flex justify-between items-center px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
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
      <Dialog open={!!voidContractId} onOpenChange={(open) => !open && setVoidContractId(null)}>
        <DialogContent className="max-w-sm">
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
              disabled={!voidReason.trim()}
              onClick={handleVoid}
            >
              确认作废
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
