import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { baseDataApi } from '../api/baseData';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { WarehouseType, WAREHOUSE_TYPE_LABELS } from '../types/baseData';
import { ArrowLeft, Save } from 'lucide-react';

export default function WarehouseForm() {
  const navigate = useNavigate();
  const { code } = useParams();
  const isEdit = !!code;

  const [form, setForm] = useState({
    code: '',
    name: '',
    type: 'BRANCH' as WarehouseType,
    manager: '',
    address: '',
    remark: '',
  });
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    const loadData = async () => {
      if (!code) return;
      setLoading(true);
      const data = await baseDataApi.getWarehouseByCode(code);
      if (!data) {
        alert('仓库档案不存在');
        navigate('/base/warehouses');
        return;
      }
      setForm({
        code: data.code,
        name: data.name,
        type: data.type,
        manager: data.manager,
        address: data.address,
        remark: data.remark || '',
      });
      setLoading(false);
    };
    loadData();
  }, [code]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await baseDataApi.saveWarehouse({
        originalCode: code,
        ...form,
      });
      alert(isEdit ? '仓库档案已保存' : '仓库档案已新增');
      navigate('/base/warehouses');
    } catch (err: any) {
      alert(err.message || '保存失败');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500 font-medium">正在加载仓库档案...</div>;
  }

  return (
    <div className="space-y-4 max-w-3xl text-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/base/warehouses')}
          className="p-1.5 rounded-md hover:bg-slate-100 border border-slate-200 bg-white text-slate-600 cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{isEdit ? `编辑仓库 ${code}` : '新增仓库'}</h1>
          <p className="text-xs text-slate-500 mt-1">仓库编码为主数据唯一标识，保存后不可修改</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">仓库编码</label>
            <Input
              value={form.code}
              disabled={isEdit}
              onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
              placeholder="例：WH007"
              className="h-9 font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">仓库名称</label>
            <Input
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="输入仓库名称"
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">负责人</label>
            <Input
              value={form.manager}
              onChange={e => setForm(prev => ({ ...prev, manager: e.target.value }))}
              placeholder="输入负责人姓名"
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">仓库类型</label>
            <select
              value={form.type}
              onChange={e => setForm(prev => ({ ...prev, type: e.target.value as WarehouseType }))}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {Object.entries(WAREHOUSE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="font-semibold text-slate-500">仓库地址</label>
            <Input
              value={form.address}
              onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
              placeholder="输入物理库房详细地址"
              className="h-9"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="font-semibold text-slate-500">备注</label>
            <Input
              value={form.remark}
              onChange={e => setForm(prev => ({ ...prev, remark: e.target.value }))}
              placeholder="输入备注信息"
              className="h-9"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate('/base/warehouses')}>取消</Button>
          <Button type="submit" size="sm" className="flex items-center gap-1.5 bg-primary text-white hover:bg-primary-hover font-bold">
            <Save size={14} />
            <span>保存</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
