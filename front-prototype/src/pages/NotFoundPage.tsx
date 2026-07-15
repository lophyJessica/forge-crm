import React from 'react';
import { ArrowLeft, Home, SearchX } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
      <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <SearchX size={26} />
        </div>
        <p className="mt-5 font-mono text-3xl font-bold text-slate-800">404</p>
        <h1 className="mt-2 text-lg font-bold text-slate-900">页面不存在</h1>
        <p className="mt-2 break-all text-xs leading-5 text-slate-500">
          当前地址 <span className="font-mono text-slate-700">{location.pathname}</span> 没有对应的业务页面。
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={14} />
            返回上一页
          </button>
          <Link
            to="/"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            <Home size={14} />
            返回工作台
          </Link>
        </div>
      </section>
    </div>
  );
}
