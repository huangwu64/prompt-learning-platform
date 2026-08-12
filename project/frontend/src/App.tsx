import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import { useAuthStore } from './store/auth'

/** 路由入口：后续页面（学习地图/对话/作品工厂…）在此注册 */
export default function App() {
  const token = useAuthStore((s) => s.token)

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      {/* 首页占位：登录后可见 */}
      <Route
        path="/"
        element={
          token ? (
            <div className="flex min-h-screen items-center justify-center">
              <p className="text-gray-500">学习地图（待开发，见接口文档 /api/learning/progress）</p>
            </div>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
