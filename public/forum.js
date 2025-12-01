// forum.js

const API_BASE_URL = '/api';

// ----------------------------------------------------
// I. 辅助函数
// ----------------------------------------------------

/**
 * 封装的 API 请求函数
 * 自动添加 Authorization Header
 */
async function apiFetch(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('jwt_token');

    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        method: method,
        headers: headers,
    };

    if (data) {
        config.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, config);
        const result = await response.json();
        
        if (!response.ok) {
            // 检查 401 错误，可能是 token 过期或无效
            if (response.status === 401) {
                handleLogout(); // 强制登出
                alert("登录状态已过期或无效，请重新登录。");
                return { success: false, message: "认证失败" };
            }
            throw new Error(result.message || `API Error: ${response.status}`);
        }
        return result;
    } catch (error) {
        console.error(`Fetch Error on ${endpoint}:`, error);
        alert(error.message || '请求失败，请检查网络或后端');
        return { success: false, message: error.message };
    }
}

// 渲染文章列表项到 DOM
function renderPost(post) {
    const date = new Date(post.created_at).toLocaleDateString('zh-CN');
    return `
        <div class="topic-item">
            <div class="topic-title">
                <a href="post.html?id=${post.id}">${post.title}</a>
            </div>
            <div class="topic-meta">
                <span><i class="fas fa-user"></i> ${post.author_name} (Lv.${post.level})</span>
                <span><i class="fas fa-eye"></i> ${post.views}</span>
                <span><i class="fas fa-clock"></i> ${date}</span>
                <span class="topic-category tag">${post.category}</span>
            </div>
        </div>
    `;
}

// 渲染会员卡片到 DOM
function renderMember(member) {
    const joinDate = new Date(member.created_at).toLocaleDateString('zh-CN');
    return `
        <div class="member-card">
            <div class="member-avatar">
                <i class="fas fa-user-circle"></i>
            </div>
            <div class="member-info">
                <h3>${member.username}</h3>
                <p class="member-level">等级: LV.${member.level}</p>
                <p class="member-points">积分: ${member.points}</p>
                <p class="member-role">${member.role === 'admin' ? '管理员' : '会员'}</p>
                <p class="member-join">加入于: ${joinDate}</p>
            </div>
        </div>
    `;
}

// 清除本地存储并刷新页面
function handleLogout() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_data');
    window.location.reload();
}

// ----------------------------------------------------
// II. 用户状态和认证
// ----------------------------------------------------

/**
 * 检查并根据登录状态更新 UI
 */
function checkLoginStatus() {
    const token = localStorage.getItem('jwt_token');
    const userDataRaw = localStorage.getItem('user_data');
    
    const guestNav = document.getElementById('user-auth-guest');
    const loggedInNav = document.getElementById('user-auth-logged-in');
    const sidebarCard = document.getElementById('sidebar-user-card');
    
    if (token && userDataRaw) {
        // 1. 登录状态
        const userData = JSON.parse(userDataRaw);
        
        // 导航栏切换
        if (guestNav) guestNav.style.display = 'none';
        if (loggedInNav) loggedInNav.style.display = 'flex';
        
        // 导航栏用户等级/信息
        const navLevel = document.getElementById('nav-user-level');
        if (navLevel) navLevel.textContent = `Lv.${userData.level}`;
        
        // 侧边栏用户卡片 (仅在 index.html 存在)
        if (sidebarCard) {
            sidebarCard.style.display = 'block';
            document.getElementById('sidebar-user-name').textContent = userData.username;
            document.getElementById('sidebar-user-level').textContent = `Lv.${userData.level}`;
            document.getElementById('sidebar-user-points').textContent = userData.points;
            // 帖子和回复数量需要单独的 API 接口来获取，这里先保持 0 或静态占位
            // document.getElementById('sidebar-user-posts').textContent = '...'; 
        }

    } else {
        // 2. 未登录状态
        if (guestNav) guestNav.style.display = 'flex';
        if (loggedInNav) loggedInNav.style.display = 'none';
        if (sidebarCard) sidebarCard.style.display = 'none';
    }
}

// 绑定认证事件：登录、注册、登出
function bindAuthEvents() {
    // 登出按钮
    const logoutBtn = document.getElementById('nav-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }

    // 假设您使用模态框进行登录/注册
    // 这里只处理提交事件，模态框的显示/隐藏需要额外 JS
    
    // 登录表单提交
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = loginForm.username.value;
            const password = loginForm.password.value;
            
            const result = await apiFetch('/auth/login', 'POST', { username, password });
            
            if (result.success) {
                localStorage.setItem('jwt_token', result.token);
                // 存储用户基本信息
                localStorage.setItem('user_data', JSON.stringify(result.user)); 
                alert('登录成功！欢迎回来。');
                window.location.reload(); 
            }
        });
    }

    // 注册表单提交
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = registerForm.username.value;
            const email = registerForm.email.value;
            const password = registerForm.password.value;
            
            const result = await apiFetch('/auth/register', 'POST', { username, email, password });
            
            if (result.success) {
                alert('注册成功！请登录。');
                // 假设注册成功后清空表单
                registerForm.reset(); 
            }
        });
    }
}

// ----------------------------------------------------
// III. 页面内容加载
// ----------------------------------------------------

// 首页：加载文章列表
async function loadPosts() {
    // 【已修复】使用 ID 选择器
    const postsContainer = document.getElementById('posts-list-container');
    if (!postsContainer) return;

    postsContainer.innerHTML = '<p class="loading-message">正在从 D1 数据库加载最新的帖子...</p>';
    
    const result = await apiFetch('/posts');
    
    if (result.success && result.posts.length > 0) {
        postsContainer.innerHTML = result.posts.map(renderPost).join('');
    } else if (result.success) {
        postsContainer.innerHTML = '<p class="empty-message">暂无已审核的文章。</p>';
    }
    // 错误信息已在 apiFetch 中 alert 出来
}

// 会员页：加载会员列表
async function loadMembers() {
    // 【已修复】使用 ID 选择器
    const membersContainer = document.getElementById('members-grid-container');
    if (!membersContainer) return;

    membersContainer.innerHTML = '<p class="loading-message">正在从 D1 数据库加载会员列表...</p>';
    
    const result = await apiFetch('/members');
    
    if (result.success && result.members.length > 0) {
        membersContainer.innerHTML = result.members.map(renderMember).join('');
    } else if (result.success) {
        membersContainer.innerHTML = '<p class="empty-message">暂无会员信息。</p>';
    }
}

// 绑定文章发布事件 (与之前代码一致)
function bindPostSubmission() {
    const postForm = document.getElementById('post-submission-form');
    // 注意：这个表单可能在单独的 new-post.html 或 index.html 的模态框中
    if (postForm) {
        postForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const title = postForm.title.value;
            const category = postForm.category.value;
            const content = postForm.content.value; 
            
            const result = await apiFetch('/posts', 'POST', { title, category, content });
            
            if (result.success) {
                alert(result.message); // 显示“文章已提交审核”
                postForm.reset();
                window.location.href = 'index.html';
            }
        });
    }
}


// ----------------------------------------------------
// IV. 页面初始化
// ----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // 1. 检查并更新用户登录状态（所有页面都需要）
    checkLoginStatus();
    
    // 2. 绑定认证相关事件（所有页面都需要）
    bindAuthEvents();
    
    // 3. 根据 body ID 决定加载哪个页面的主要内容
    const bodyId = document.body.id; 

    if (bodyId === 'forum-index') { 
        loadPosts();
        bindPostSubmission(); // 假设首页也有发帖按钮/模态框
    } else if (bodyId === 'member-list') { 
        loadMembers();
    }
    // TODO: 如果有 post.html (文章详情页)，在这里添加 loadPostDetail 逻辑
});