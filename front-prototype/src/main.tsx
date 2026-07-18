import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { seedDatabase } from './db'

const root = createRoot(document.getElementById('root')!);

const renderApp = () => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

// 预先装载 Dexie 数据库种子，装载成功后挂载应用
seedDatabase()
  .then(renderApp)
  .catch(err => {
    console.error('数据库初始化失败，回退直接挂载渲染', err);
    renderApp();
  });
