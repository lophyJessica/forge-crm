import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { baseDataApi } from '../api/baseData';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Warehouse, Zone } from '../types/baseData';
import PageHeader from '../components/shared/PageHeader';
import { Save } from 'lucide-react';

export default function LocationForm() {
  const navigate = useNavigate();
  const { code } = useParams();
  const isEdit = !!code;

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [form, setForm] = useState({
    code: '',
    warehouseCode: '',
    zoneCode: '',
    barcode: '',
  });
  const [loading, setLoading] = useState(isEdit);

  const filteredZones = useMemo(() => {
    if (!form.warehouseCode) return [];
    return zones.filter(item => item.warehouseCode === form.warehouseCode);
  }, [form.warehouseCode, zones]);

  useEffect(() => {
    baseDataApi.getWarehouses({ activeOnly: true }).then(setWarehouses);
    baseDataApi.getZones({ activeOnly: true }).then(setZones);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!code) return;
      setLoading(true);
      const data = await baseDataApi.getLocationByCode(code);
      if (!data) {
        alert('货位档案不存在');
        navigate('/base/locations');
        return;
      }
      setForm({
        code: data.code,
        warehouseCode: data.warehouseCode,
        zoneCode: data.zoneCode,
        barcode: data.barcode,
      });
      setLoading(false);
    };
    loadData();
  }, [code]);

  const handleWarehouseChange = (warehouseCode: string) => {
    setForm(prev => ({
      ...prev,
      warehouseCode,
      zoneCode: '',
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await baseDataApi.saveLocation({
        originalCode: code,
        ...form,
      });
      alert(isEdit ? '货位档案已保存' : '货位档案已新增');
      navigate('/base/locations');
    } catch (err: any) {
      alert(err.message || '保存失败');
    }
  };

  if (loading) {
    return <div className="forge-state-panel">正在加载货位档案...</div>;
  }

  return (
    <div className="space-y-4 max-w-3xl text-xs">
      <PageHeader
        onBack={() => navigate('/base/locations')}
        title={isEdit ? `编辑货位 ${code}` : '新增货位'}
        description="货位按启用仓库筛选启用库区"
      />

      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">编码</label>
            <Input
              value={form.code}
              disabled={isEdit}
              onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
              placeholder="例：LOC-A03"
              className="h-9 font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">条码</label>
            <Input
              value={form.barcode}
              onChange={e => setForm(prev => ({ ...prev, barcode: e.target.value }))}
              placeholder="默认使用货位编码"
              className="h-9 font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">所属仓库</label>
            <select
              value={form.warehouseCode}
              onChange={e => handleWarehouseChange(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">请选择仓库</option>
              {warehouses.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-500">所属库区</label>
            <select
              value={form.zoneCode}
              onChange={e => setForm(prev => ({ ...prev, zoneCode: e.target.value }))}
              disabled={!form.warehouseCode}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
            >
              <option value="">请选择库区</option>
              {filteredZones.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate('/base/locations')}>取消</Button>
          <Button type="submit" size="sm" className="flex items-center gap-1.5">
            <Save size={14} />
            <span>保存</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
