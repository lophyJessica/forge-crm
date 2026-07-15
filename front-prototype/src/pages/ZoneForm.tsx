import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { baseDataApi } from '../api/baseData';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Warehouse, ZoneType, ZONE_TYPE_LABELS } from '../types/baseData';
import PageHeader from '../components/shared/PageHeader';
import { Save } from 'lucide-react';

export default function ZoneForm() {
  const navigate = useNavigate();
  const { code } = useParams();
  const isEdit = !!code;

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [form, setForm] = useState({
    code: '',
    name: '',
    warehouseCode: '',
    type: 'STORAGE' as ZoneType,
  });
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    baseDataApi.getWarehouses({ activeOnly: true }).then(setWarehouses);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!code) return;
      setLoading(true);
      const data = await baseDataApi.getZoneByCode(code);
      if (!data) {
        alert('库区档案不存在');
        navigate('/base/zones');
        return;
      }
      setForm({
        code: data.code,
        name: data.name,
        warehouseCode: data.warehouseCode,
        type: data.type,
      });
      setLoading(false);
    };
    loadData();
  }, [code]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await baseDataApi.saveZone({
        originalCode: code,
        ...form,
      });
      alert(isEdit ? '库区档案已保存' : '库区档案已新增');
      navigate('/base/zones');
    } catch (err: any) {
      alert(err.message || '保存失败');
    }
  };

  if (loading) {
    return <div className="forge-state-panel">正在加载库区档案...</div>;
  }

  return (
    <div className="space-y-4 max-w-3xl text-xs">
      <PageHeader
        onBack={() => navigate('/base/zones')}
        title={isEdit ? `编辑库区 ${code}` : '新增库区'}
        description="库区必须归属一个启用仓库"
      />

      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">编码</label>
            <Input
              value={form.code}
              disabled={isEdit}
              onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
              placeholder="例：Z-STO-06"
              className="h-9 font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">名称</label>
            <Input
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="输入库区名称"
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">所属仓库</label>
            <select
              value={form.warehouseCode}
              onChange={e => setForm(prev => ({ ...prev, warehouseCode: e.target.value }))}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">请选择仓库</option>
              {warehouses.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">类型</label>
            <select
              value={form.type}
              onChange={e => setForm(prev => ({ ...prev, type: e.target.value as ZoneType }))}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {Object.entries(ZONE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate('/base/zones')}>取消</Button>
          <Button type="submit" size="sm" className="flex items-center gap-1.5">
            <Save size={14} />
            <span>保存</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
