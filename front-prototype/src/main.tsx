import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { seedDatabase } from './db'

const root = createRoot(document.getElementById('root')!);

const renderApp = () => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

// 初始化 IndexedDB 种子数据后挂载应用，失败时保留可见的诊断页面。
seedDatabase().then(renderApp).catch(err => {
  console.error('数据库初始化失败', err);
  root.render(
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="forge-state-panel forge-state-panel--error max-w-lg">
        数据库初始化失败，请刷新页面重试。
      </div>
    </div>,
  );
});
