# 第一阶段：构建（使用 Node.js 22 LTS + 清华源）
FROM node:22-alpine AS builder

# 设置工作目录
WORKDIR /app

# 配置 npm 镜像为清华源（加速依赖下载）
RUN npm config set registry https://registry.npmmirror.com/

# 复制依赖配置文件
COPY package*.json ./
RUN npm install
# 安装所有依赖（包括 devDependencies）
RUN npm ci

# 复制源代码并编译
COPY tsconfig.json ./
COPY src ./src
COPY public ./public
RUN npm run build


# 第二阶段：运行（同样使用 Node.js 22 LTS + 清华源）
FROM node:22-alpine

WORKDIR /app

# 配置 npm 镜像为清华源（避免生产依赖安装时使用默认源）
RUN npm config set registry https://registry.npmmirror.com/

# 复制依赖配置并安装生产依赖
COPY package*.json ./
RUN npm install --only=production

# 复制编译产物和静态资源
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "dist/index.js"]
