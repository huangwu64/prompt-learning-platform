import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

/** 注册页（联调：POST /api/auth/register） */
export default function Register() {
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register({ email, password, username })
      navigate('/')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-lg bg-white p-8 shadow">
        <h1 className="text-xl font-bold text-center">注册</h1>
        <input
          className="w-full rounded border p-2"
          type="text"
          placeholder="用户名（2-30 字符）"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          className="w-full rounded border p-2"
          type="email"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded border p-2"
          type="password"
          placeholder="密码（至少 6 位）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="w-full rounded bg-blue-500 py-2 text-white disabled:opacity-50" disabled={loading}>
          {loading ? '注册中…' : '注册'}
        </button>
        <p className="text-sm text-center text-gray-500">
          已有账号？<Link to="/login" className="text-blue-500">去登录</Link>
        </p>
      </form>
    </div>
  )
}
