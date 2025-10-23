# 支持内网镜像配置
ARG NODE_IMAGE=node:20-slim
ARG NGINX_IMAGE=nginx:stable-alpine

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# 支持内网npm镜像
ARG NPM_REGISTRY=https://registry.npmjs.org/
RUN npm config set registry ${NPM_REGISTRY}
RUN npm install -g corepack@latest && corepack enable

FROM base AS build
COPY . /app
WORKDIR /app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build
RUN pnpm mcp:build

FROM ${NGINX_IMAGE}
# 安装Node.js、htpasswd工具、dos2unix和supervisor
RUN apk add --no-cache apache2-utils dos2unix supervisor nodejs npm gettext curl

# 安装pnpm（支持内网镜像）
ARG NPM_REGISTRY=https://registry.npmjs.org/
RUN npm config set registry ${NPM_REGISTRY}
RUN npm install -g pnpm

# 复制Nginx配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制Web应用
COPY --from=build /app/packages/web/dist /usr/share/nginx/html

# 复制MCP服务器
COPY --from=build /app/packages/mcp-server/dist /app/mcp-server/dist
COPY --from=build /app/packages/mcp-server/package.json /app/mcp-server/
COPY --from=build /app/packages/mcp-server/preload-env.js /app/mcp-server/
COPY --from=build /app/packages/mcp-server/preload-env.cjs /app/mcp-server/

# 复制Node Proxy服务
COPY --from=build /app/node-proxy /app/node-proxy
# 复制构建后的包到正确位置
COPY --from=build /app/packages /app/packages
# 复制必要的node_modules
COPY --from=build /app/node_modules /app/node_modules

# 设置默认环境变量（向前兼容）
ENV NGINX_PORT=80
ENV NODE_ENV=production
ENV MCP_HTTP_PORT=3000
ENV MCP_LOG_LEVEL=info

# 设置MCP服务器工作目录
WORKDIR /app/mcp-server

# 复制并设置启动脚本
COPY generate-config.sh /docker-entrypoint.d/40-generate-config.sh
COPY generate-auth.sh /docker-entrypoint.d/30-generate-auth.sh
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY start.sh /start.sh
COPY start-services.sh /start-services.sh

# 确保脚本有执行权限
RUN chmod +x /docker-entrypoint.d/40-generate-config.sh
RUN chmod +x /docker-entrypoint.d/30-generate-auth.sh
RUN chmod +x /start.sh
RUN chmod +x /start-services.sh

# 转换可能的Windows行尾符为Unix格式
RUN dos2unix /docker-entrypoint.d/40-generate-config.sh
RUN dos2unix /docker-entrypoint.d/30-generate-auth.sh
RUN dos2unix /start.sh
RUN dos2unix /start-services.sh

EXPOSE 80

# 使用简化的启动脚本（可选择使用start.sh或start-services.sh）
CMD ["sh", "/start.sh"]