// logger.ts
import { createLogger, format, transports } from 'winston'
import 'winston-daily-rotate-file'

// 定义日志格式（包含时间、级别、IP、路径、方法、状态码等信息）
const logFormat = format.printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} [${level.toUpperCase()}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`
})

// 滚动日志配置（按日期+大小分割）
const rotateTransport = new transports.DailyRotateFile({
  filename: './public/logs/access-%DATE%.log', // 日志文件路径+命名格式（按日期）
  datePattern: 'YYYY-MM-DD', // 日期格式
  maxSize: '20m', // 单个文件最大 20MB
  maxFiles: '365d', // 保留 14 天日志
  zippedArchive: true, // 旧日志压缩
})

// 创建日志实例
const accessLogger = createLogger({
  level: 'info', // 日志级别（info及以上）
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // 时间戳
    logFormat
  ),
  transports: [
    rotateTransport, // 滚动文件输出
    // new transports.Console(), // 同时输出到控制台
  ],
})

export default accessLogger