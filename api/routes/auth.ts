import { Router, type Request, type Response } from 'express'
import { queryAll, queryOne, execute } from '../db/database.js'
import { v4 as uuid } from 'uuid'

const router = Router()

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { username, password, role = 'agronomist' } = req.body
  if (!username || !password) {
    res.status(400).json({ success: false, error: '用户名和密码必填' })
    return
  }
  const exist = queryOne(`SELECT id FROM users WHERE username = ?`, [username])
  if (exist) {
    res.status(400).json({ success: false, error: '用户名已存在' })
    return
  }
  const id = uuid()
  execute(`INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)`, [id, username, password, role])
  res.json({ success: true, data: { id, username, role } })
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body
  const row: any = queryOne(`SELECT id, username, role, active FROM users WHERE username = ? AND password = ?`, [username, password])
  if (!row) {
    res.status(401).json({ success: false, error: '用户名或密码错误' })
    return
  }
  if (!row.active) {
    res.status(403).json({ success: false, error: '账号已被禁用' })
    return
  }
  res.json({
    success: true,
    data: {
      id: row.id,
      username: row.username,
      role: row.role,
      token: 'mock-token-' + row.id,
    },
  })
})

router.post('/logout', async (_req: Request, res: Response): Promise<void> => {
  res.json({ success: true, message: '已退出登录' })
})

router.get('/me', async (req: Request, res: Response): Promise<void> => {
  const userId = (req.headers['x-user-id'] as string) || 'u1'
  const row: any = queryOne(`SELECT id, username, role, active FROM users WHERE id = ?`, [userId])
  if (row) {
    res.json({ success: true, data: row })
  } else {
    res.status(401).json({ success: false, error: '用户不存在' })
  }
})

router.get('/users', async (_req: Request, res: Response): Promise<void> => {
  const rows = queryAll(`SELECT id, username, role, active, created_at FROM users ORDER BY role, username`)
  res.json({ success: true, data: rows })
})

export default router
