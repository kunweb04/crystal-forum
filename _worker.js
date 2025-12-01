// _worker.js
// 纯原生 Cloudflare Pages Function 实现，不依赖任何第三方库。

// ------------------------------------
// 辅助函数：等级计算
// ------------------------------------

function calculateLevel(points) {
    if (points >= 5000) return 5;
    if (points >= 2000) return 4;
    if (points >= 500) return 3;
    if (points >= 100) return 2;
    if (points >= 10) return 1;
    return 0;
}

// ------------------------------------
// 辅助函数：JSON 响应
// ------------------------------------

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status: status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*', // 允许跨域请求
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

// ------------------------------------
// 辅助函数：JWT 验证和用户获取 (简化版)
// ------------------------------------
async function getAuthenticatedUser(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { authorized: false, user: null };
    }

    const token = authHeader.substring(7);

    // ⚠️ 实际环境中，您需要在这里验证 JWT 的签名和有效期。
    // 简化演示：我们假设 token 就是 user ID
    const userId = parseInt(token, 10); 
    
    if (isNaN(userId)) {
         // token 格式不对
         return { authorized: false, user: null };
    }

    // 查找用户数据
    const user = await env.DB.prepare(
        "SELECT id, username, email, points, level, role FROM users WHERE id = ?"
    ).bind(userId).first();

    if (!user) {
        return { authorized: false, user: null };
    }
    
    return { authorized: true, user };
}

// ------------------------------------
// Pages Function 入口
// ------------------------------------

export const onRequest = async (context) => {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    // 处理 OPTIONS 请求 (CORS 预检请求)
    if (method === 'OPTIONS') {
        return jsonResponse(null, 204); // 返回 204 No Content
    }

    // 只处理 /api 路由
    if (path.startsWith('/api/')) {
        
        // ------------------------------------
        // 1. POST /api/auth/register (用户注册)
        // ------------------------------------
        if (method === 'POST' && path === '/api/auth/register') {
            try {
                const { username, email, password } = await request.json();
                
                // ⚠️ 密码哈希需要更复杂的实现，这里仅是占位符
                const password_hash = `hashed_${password}`; 

                const result = await env.DB.prepare(
                    "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)"
                ).bind(username, email, password_hash).run();

                return jsonResponse({ success: true, message: "注册成功", userId: result.lastRowId });
            } catch (e) {
                if (e.message.includes('UNIQUE constraint failed')) {
                    return jsonResponse({ success: false, message: "用户名或邮箱已被使用" }, 409);
                }
                console.error(e);
                return jsonResponse({ success: false, message: "注册失败" }, 500);
            }
        }
        
        // ------------------------------------
        // 2. POST /api/auth/login (用户登录)
        // ------------------------------------
        if (method === 'POST' && path === '/api/auth/login') {
            try {
                const { username, password } = await request.json();

                const user = await env.DB.prepare(
                    "SELECT id, username, password_hash, points, level, role FROM users WHERE username = ?"
                ).bind(username).first();
                
                if (!user || user.password_hash !== `hashed_${password}`) {
                    return jsonResponse({ success: false, message: "用户名或密码错误" }, 401);
                }

                // ⚠️ 实际代码需要：生成一个真实的 JWT Token
                const token = user.id.toString(); 

                // 返回脱敏后的用户数据和 token
                const userData = {
                    id: user.id,
                    username: user.username,
                    points: user.points,
                    level: user.level,
                    role: user.role
                };

                return jsonResponse({ success: true, token, user: userData, message: "登录成功" });

            } catch (e) {
                console.error(e);
                return jsonResponse({ success: false, message: "登录失败" }, 500);
            }
        }

        // ------------------------------------
        // 3. POST /api/posts (文章发布)
        // ------------------------------------
        if (method === 'POST' && path === '/api/posts') {
            const auth = await getAuthenticatedUser(request, env);
            if (!auth.authorized) {
                return jsonResponse({ success: false, message: "认证失败，请登录" }, 401);
            }

            try {
                const { category, title, content } = await request.json();
                const author_id = auth.user.id;

                await env.DB.prepare(
                    "INSERT INTO posts (author_id, category, title, content, status) VALUES (?, ?, ?, ?, ?)"
                ).bind(author_id, category, title, content, 'pending_review').run();

                return jsonResponse({ success: true, message: "文章已提交审核" });
            } catch (e) {
                console.error(e);
                return jsonResponse({ success: false, message: "文章发布失败" }, 500);
            }
        }

        // ------------------------------------
        // 4. GET /api/posts (获取文章列表)
        // ------------------------------------
        if (method === 'GET' && path === '/api/posts') {
             try {
                const query = `
                    SELECT 
                        p.id, p.title, p.views, p.created_at, p.category, 
                        u.username AS author_name, u.level
                    FROM posts p
                    INNER JOIN users u ON p.author_id = u.id
                    WHERE p.status = 'approved'
                    ORDER BY p.created_at DESC
                    LIMIT 20
                `;
                
                const { results: posts } = await env.DB.prepare(query).all();

                return jsonResponse({ success: true, posts });
            } catch (e) {
                console.error("Get Posts Error:", e);
                return jsonResponse({ success: false, message: "获取文章列表失败" }, 500);
            }
        }
        
        // ------------------------------------
        // 5. GET /api/members (获取会员列表)
        // ------------------------------------
        if (method === 'GET' && path === '/api/members') {
            try {
                const query = `
                    SELECT id, username, role, level, points, created_at
                    FROM users
                    ORDER BY points DESC, created_at ASC
                `;
                
                const { results: members } = await env.DB.prepare(query).all();

                return jsonResponse({ success: true, members });
            } catch (e) {
                console.error("Get Members Error:", e);
                return jsonResponse({ success: false, message: "获取会员列表失败" }, 500);
            }
        }
        
        // ------------------------------------
        // 6. POST /api/upload (R2 文件上传)
        // ------------------------------------
        if (method === 'POST' && path === '/api/upload') {
            // ⚠️ 实际代码需要验证用户是否有上传权限
            const auth = await getAuthenticatedUser(request, env);
            if (!auth.authorized) {
                return jsonResponse({ success: false, message: "认证失败，请登录" }, 401);
            }
            
            // 确保 R2 绑定名为 MY_BUCKET
            if (!env.MY_BUCKET) {
                return jsonResponse({ success: false, message: "R2 存储桶未绑定" }, 500);
            }
            
            try {
                const form = await request.formData();
                const file = form.get('file');

                if (!file || typeof file === 'string') {
                    return jsonResponse({ success: false, message: "未找到文件" }, 400);
                }
                
                const fileBuffer = await file.arrayBuffer();
                const fileName = file.name;
                const fileKey = `uploads/${Date.now()}-${fileName}`; 

                await env.MY_BUCKET.put(fileKey, fileBuffer, {
                    httpMetadata: {
                        contentType: file.type,
                    },
                });
                
                // ⚠️ 注意：R2 公共 URL 需要根据您的 Pages 或 Workers 配置来决定
                const publicUrl = `/r2-assets/${fileKey}`; 
                
                return jsonResponse({ success: true, url: publicUrl, message: "文件上传成功" });
            } catch (e) {
                console.error("R2 Upload Error:", e);
                return jsonResponse({ success: false, message: "文件上传失败" }, 500);
            }
        }

        // ------------------------------------
        // 未匹配的 /api 路由
        // ------------------------------------
        return jsonResponse({ success: false, message: "API Endpoint Not Found" }, 404);
    }

    // 非 /api 请求：将控制权交给 Pages 处理静态文件
    return context.next(); 
};