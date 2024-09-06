# 使用官方的 Node.js 作为基础镜像
FROM node:18

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装项目依赖
RUN npm install

# 复制项目文件到容器内
COPY . .

# 安装 FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

# 开放端口
EXPOSE 3000

# 运行应用
CMD ["node", "index.js"]

