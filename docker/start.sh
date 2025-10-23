#!/bin/sh

echo "##### Starting Prompt Optimizer Services"
cd /app

echo "##### Environment Configuration"
echo "NODE_ENV: ${NODE_ENV:-production}"
echo "NGINX_PORT: ${NGINX_PORT:-80}"
echo "MCP_LOG_LEVEL: ${MCP_LOG_LEVEL:-info}"
echo "MCP_HTTP_PORT: ${MCP_HTTP_PORT:-3000}"

# 企业级配置信息
if [ -n "$APOLLO_CONFIG_SERVER_URL" ]; then
    echo "Apollo Config Server: $APOLLO_CONFIG_SERVER_URL"
fi
if [ "$NODE_TRACE_ENABLED" = "true" ]; then
    echo "Node Trace: Enabled"
fi
if [ "$XLOG_ENABLED" = "true" ]; then
    echo "XLog: Enabled"
fi

current_date_time="`date "+%Y-%m-%d %H:%M:%S"`"
echo "Start time: $current_date_time"

# 创建日志目录
mkdir -p /var/log/supervisor

# 处理nginx配置文件中的环境变量
echo "Processing nginx configuration with environment variables..."
envsubst '${NGINX_PORT}' < /etc/nginx/conf.d/default.conf > /tmp/nginx.conf
mv /tmp/nginx.conf /etc/nginx/conf.d/default.conf
echo "Nginx configuration updated with NGINX_PORT=${NGINX_PORT}"

# 运行原有的nginx初始化脚本
echo "Running nginx initialization scripts..."
for script in /docker-entrypoint.d/*.sh; do
    if [ -f "$script" ]; then
        echo "Running $script"
        sh "$script"
    fi
done

echo "Starting services with supervisor..."
echo "MCP Server will run on port: ${MCP_HTTP_PORT}"
echo "MCP Server log level: ${MCP_LOG_LEVEL}"

# 启动supervisor
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
