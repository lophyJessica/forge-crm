import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { seedDatabase } from './db'

// 初始化 IndexedDB 种子数据后挂载应用
seedDatabase().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}).catch(err => {
  console.error("数据库初始化失败", err);
});
