import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { BarChart3, TrendingUp, Users, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Dashboard() {
  const leads = useLiveQuery(() => db.leads.toArray()) || [];
  const opportunities = useLiveQuery(() => db.opportunities.toArray()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLeadsCount = leads.filter(l => l.createdAt.startsWith(todayStr)).length;
  const activeOppsCount = opportunities.filter(o => o.status !== 'WON' && o.status !== 'LOST').length;
  const customerCount = customers.length;
  
  const predictedSales = opportunities
    .filter(o => o.status !== 'WON' && o.status !== 'LOST')
    .reduce((sum, o) => sum + ((o.amount || 0) * (o.score || 0) / 100), 0);

  const stats = [
    { label: '今日新增线索', value: String(todayLeadsCount), change: '+12%', icon: Users, iconBg: 'bg-blue-50 text-blue-600 border border-blue-100' },
    { label: '活跃商机总数', value: String(activeOppsCount), change: '+5%', icon: TrendingUp, iconBg: 'bg-amber-50 text-amber-600 border border-amber-100' },
    { label: '正式客户总数', value: String(customerCount), change: '+8%', icon: BarChart3, iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100' },
    { label: '预测销售额 (CNY)', value: `￥${predictedSales.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`, change: '+15%', icon: Wallet, iconBg: 'bg-violet-50 text-violet-600 border border-violet-100' },
  ];

  return (
    <div className="space-y-6">
      {/* 头部欢迎 */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">控制台首页</h1>
        <p className="text-xs text-slate-500">欢迎回来，以下是 Forge CRM 系统的实时运行指标与 AI 评分状态摘要。</p>
      </div>

      {/* 指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="transition-all hover:border-slate-300">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-slate-500 block">{stat.label}</span>
                  <div className="flex items-baseline gap-2">
                    <strong className="text-2xl font-bold text-slate-900 font-mono tracking-tight">{stat.value}</strong>
                    <span className="text-[11px] font-semibold text-emerald-600">{stat.change}</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${stat.iconBg}`}>
                  <Icon size={20} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 大盘图表与系统动态 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">商机成交预测趋势</CardTitle>
              <CardDescription>按月份统计商机平均预测赢单率</CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] text-slate-500">AI 预测引擎</Badge>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-60 flex items-end justify-between gap-4 px-2">
              {[45, 62, 53, 85, 74, 95].map((val, idx) => {
                const months = ['二月', '三月', '四月', '五月', '六月', '七月'];
                return (
                  <div key={idx} className="flex-1 flex flex-col justify-end items-center gap-2 h-full">
                    <span className="text-[11px] font-mono font-medium text-slate-600">{val}%</span>
                    <div className="w-full bg-slate-100 rounded-t-md overflow-hidden flex items-end h-44">
                      <div 
                        className="w-full bg-blue-600 rounded-t-md hover:bg-blue-500 transition-all duration-300"
                        style={{ height: `${(val / 100) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{months[idx]}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">最近 AI 分配动态</CardTitle>
              <CardDescription>系统全自动流转事件日志</CardDescription>
            </div>
            <Badge variant="secondary" className="text-[10px]">实时</Badge>
          </CardHeader>
          <CardContent className="pt-4 divide-y divide-slate-100">
            {[
              { time: '10:05', text: '高分线索 #1024 自动转入培育池', score: '88分', status: '已跟进' },
              { time: '09:50', text: '客户「强盛科技」触发流失预警', score: '35分', status: '待审核' },
              { time: '09:12', text: '新商机「ERP集成采购」预测成交率上升', score: '92分', status: '已同步' }
            ].map((item, idx) => (
              <div key={idx} className="py-3 flex justify-between items-start text-xs gap-3">
                <div className="space-y-1">
                  <div className="text-slate-800 font-medium">{item.text}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{item.time} · 评分: {item.score}</div>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px] text-slate-600 font-normal">
                  {item.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
