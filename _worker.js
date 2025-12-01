// 最小化版本，只处理基本请求
export const onRequest = async (context) => {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;
    
    console.log(`请求路径: ${path}`);
    
    // 只处理 API 请求，其他请求交给 Pages 处理静态文件
    if (path.startsWith('/api/')) {
        try {
            // 测试数据库连接
            if (path === '/api/test' && request.method === 'GET') {
                if (!env.DB) {
                    return new Response(JSON.stringify({ error: "DB 未绑定" }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                
                // 简单测试查询
                const result = await env.DB.prepare("SELECT 1 as test").first();
                return new Response(JSON.stringify({ 
                    success: true, 
                    message: "数据库连接正常",
                    test: result 
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            // 健康检查端点
            if (path === '/api/health') {
                return new Response(JSON.stringify({ 
                    status: 'ok',
                    timestamp: new Date().toISOString()
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            // 默认 API 响应
            return new Response(JSON.stringify({ 
                message: "API 端点未实现",
                path: path
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
            
        } catch (error) {
            console.error('Worker 错误:', error);
            return new Response(JSON.stringify({ 
                error: "服务器内部错误",
                message: error.message
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 非 API 请求：将控制权交给 Pages 处理静态文件
    return context.next();
};
