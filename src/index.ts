import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { readFileSync } from 'fs'  // 用于读取 HTML 文件
import { join } from 'path'   
import checkIp from 'ip-range-check'
import accessLogger from './logger.js'
interface MenuItem {
  icon: string
  title: string
  ips?: string[] // 可选字段，类型为字符串数组（存储IP范围）
}
// 定义数据项类型
interface DataItem {
  title: string
  url: string
  img: string
  overflowClip: string
  ips?: string[] // 可选的IP范围字段
}

// 定义分类类型
interface Category {
  title: string
  icon: string
  data: DataItem[] // 分类下的数据项数组
}

let indexHtmlCache: string = ''
let dataJsonCache: Category[] = []
let menuJsonCache: MenuItem[] = []
const initCache = () => {
  try {
    // 缓存 HTML
    const htmlPath = join(process.cwd(), 'public', 'data', 'index.html')
    indexHtmlCache = readFileSync(htmlPath, 'utf-8')

    // 缓存 JSON
    const jsonPath = join(process.cwd(), 'public', 'data', 'data.json')
    const jsonContent = readFileSync(jsonPath, 'utf-8')
    dataJsonCache = JSON.parse(jsonContent)

    // 缓存 JSON
    const menuJsonPath = join(process.cwd(), 'public', 'data', 'menu.json')
    const menuJsonContent = readFileSync(menuJsonPath, 'utf-8')
    menuJsonCache = JSON.parse(menuJsonContent)

    console.log('缓存初始化成功')
  } catch (error) {
    console.error('缓存初始化失败:', error)
  }
}
const refreshCache = () => {
  try {
   const htmlPath = join(process.cwd(), 'public', 'data', 'index.html')
    indexHtmlCache = readFileSync(htmlPath, 'utf-8')

    const jsonPath = join(process.cwd(), 'public', 'data', 'data.json')
    const jsonContent = readFileSync(jsonPath, 'utf-8')
    dataJsonCache = JSON.parse(jsonContent)

    const menuJsonPath = join(process.cwd(), 'public', 'data', 'menu.json')
    const menuJsonContent = readFileSync(menuJsonPath, 'utf-8')
    menuJsonCache = JSON.parse(menuJsonContent)

    console.log('缓存刷新成功')
    return true
  } catch (error) {
    console.error('缓存刷新失败:', error)
    return false
  }
}
initCache()

const app = new Hono()
app.use(async (c, next) => {
  // 记录请求开始时间（用于计算响应耗时）
  const start = Date.now()
  
  // 执行后续中间件/路由
  await next()
  
  // 计算响应耗时（毫秒）
  const duration = Date.now() - start
  
  // 获取请求信息
  const method = c.req.method
  const path = c.req.path
  const status = c.res.status
  const clientIp = c.req.header('x-real-ip') || 'unknown'
  const userAgent = c.req.header('user-agent') || 'unknown'
  
  // 记录访问日志
  accessLogger.info('access', {
    ip: clientIp,
    method,
    path,
    status,
    duration: `${duration}ms`,
    userAgent
  })
})
app.use('/public/assets/*', serveStatic({ root: './' }));
app.get('/', (c) => {
 if (!indexHtmlCache) {
    return c.text('HTML 缓存未初始化', 500)
  }
  return c.html(indexHtmlCache)
})
app.get('/index.html', (c) => {
 if (!indexHtmlCache) {
    return c.text('HTML 缓存未初始化', 500)
  }
  return c.html(indexHtmlCache)
})
app.get('/data.json', (c) => {
  if (dataJsonCache.length === 0) {
    return c.text('JSON 缓存未初始化', 500)
  }

  const clientIp = c.req.header('x-real-ip') || ''

  // 从缓存中过滤数据
  const filteredCategories = dataJsonCache
    .map(category => {
      const filteredData = category.data.filter((item: DataItem) => {
        if (!item.ips) return true
        if (!clientIp) return false
        return item.ips.some(range => checkIp(clientIp, range))
      })
      return { ...category, data: filteredData }
    })
    .filter(category => category.data.length > 0)

  return c.json(filteredCategories)
})
app.get('/menu.json', (c) => {
  if (menuJsonCache.length === 0) {
    return c.text('JSON 缓存未初始化', 500)
  }

  const clientIp = c.req.header('x-real-ip') || ''

  const filteredMenu = menuJsonCache.filter((item: MenuItem) => {
      if (!item.ips) return true // 无 ips 字段默认保留
      if (!clientIp) return false // 有 ips 但无 IP 则过滤
      return item.ips.some(range => checkIp(clientIp, range)) // 校验 IP 范围
    })

  return c.json(filteredMenu)
})
app.get('/webstack', (c) => {
  const success = refreshCache()
  return c.json({
    success,
    message: success ? '缓存已刷新' : '缓存刷新失败'
  })
})

serve({
  fetch: app.fetch,
  port: 3000,
  hostname: '0.0.0.0',
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
