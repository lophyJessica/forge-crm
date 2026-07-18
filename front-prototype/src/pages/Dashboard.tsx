import { BarChart3, TrendingUp, Users, Wallet } from 'lucide-react';

export default function Dashboard() {
  const stats = [
    { label: '今日新增线索', value: '42', change: '+12%', icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: '活跃商机总数', value: '18', change: '+5%', icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
    { label: '正式客户总数', value: '128', change: '+8%', icon: BarChart3, color: 'text-emerald-600 bg-emerald-50' },
    { label: '预测销售额 (CNY)', value: '￥240,000', change: '+15%', icon: Wallet, color: 'text-violet-600 bg-violet-50' },
  ];

  return (
    <div className="space-y-6">
      {/* 头部欢迎 */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-slate-800">控制台首页</h1>
        <p className="text-xs text-slate-500">欢迎回来，以下是 Forge CRM 系统的实时运行指标与 AI 评分状态摘要。</p>
      </div>

      {/* 指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="forge-card flex items-center justify-between p-5">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-500 block">{stat.label}</span>
                <div className="flex items-baseline gap-2">
                  <strong className="text-2xl font-bold text-slate-800 font-mono">{stat.value}</strong>
                  <span className="text-[10px] font-bold text-emerald-600">{stat.change}</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 大盘图表与系统动态占位 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="forge-card lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-850">商机成交预测趋势</h3>
            <span className="text-[10px] text-slate-400 font-mono">数据来源于 AI 预测引擎</span>
          </div>
          <div className="h-64 flex items-end justify-between gap-4 pt-4 px-2">
            {[45, 62, 53, 85, 74, 95].map((val, idx) => {
              const months = ['二月', '三月', '四月', '五月', '六月', '七月'];
              return (
                <div key={idx} className="flex-1 flex flex-col justify-end items-center gap-2 h-full">
                  <span className="text-[10px] font-mono text-slate-500">{val}%</span>
                  <div className="w-full bg-slate-100 rounded-t-md overflow-hidden flex items-end">
                    <div 
                      className="w-full bg-[#1677ff] rounded-t-md hover:bg-blue-500 transition-all duration-300"
                      style={{ height: `${val * 1.8}px` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">{months[idx]}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="forge-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-850">最近AI分配动态</h3>
            <span className="text-[10px] text-slate-400 font-mono">实时通知</span>
          </div>
          <div className="divide-y divide-slate-100">
            {[
              { time: '10:05', text: '高分线索 #1024 自动转入培育池', score: '88分', status: '已跟进' },
              { time: '09:50', text: '客户「强盛科技」触发流失橙色预警', score: '35分', status: '待审核' },
              { time: '09:12', text: '新商机「ERP集成采购」预测成交率上升', score: '92分', status: '已同步' }
            ].map((item, idx) => (
              <div key={idx} className="py-3 flex justify-between items-start text-xs gap-3">
                <div className="space-y-1">
                  <div className="text-slate-700 font-medium">{item.text}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{item.time} · 评分: {item.score}</div>
                </div>
                <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
