//引入
const express=require('express');
const mysql=require('mysql2');
const session=require('express-session');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const app=express();

//解析表单
app.use(express.urlencoded({extended:false}));
app.use(express.json());

// 创建日志目录
const logDirectory = path.join(__dirname, 'logs');
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

// 配置访问日志
const accessLogStream = fs.createWriteStream(path.join(logDirectory, 'access.log'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));
app.use(morgan('dev'));

//------------ 页面渲染辅助函数（统一美化）------------
function renderPage(title, bodyHTML, extraHead = '') {
    return `<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <!-- Bootstrap 5 美化 -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .card-custom {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
            backdrop-filter: blur(10px);
            padding: 2rem;
            width: 100%;
            max-width: 450px;
        }
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 50px;
            padding: 10px 20px;
            font-weight: bold;
            transition: transform 0.2s;
        }
        .btn-primary:hover {
            transform: scale(1.03);
            background: linear-gradient(135deg, #5a6fd6 0%, #6a419a 100%);
        }
        .btn-outline-light {
            border-radius: 50px;
            padding: 10px 20px;
            font-weight: bold;
        }
        .nav-link {
            color: #fff !important;
        }
        .alert {
            border-radius: 15px;
        }
    </style>
    ${extraHead}
</head>
<body>
    <div class="card-custom">
        ${bodyHTML}
    </div>
    <!-- Bootstrap JS（可选，用于交互组件） -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;
}

//数据库配置
const dbCondig={
    host:'localhost',
    user:'sewm',
    password:'wDEGEMyDL2sYfczc',
    database:'sewm'
};

//连结数据库
const connection=mysql.createConnection(dbCondig);
connection.connect((err)=>{
    if(err){
        console.error('mysql连接失败：');
        console.error(err);
        return;
    }
    console.log('mysql连接成功');
});

//session设置
app.use(session({
    secret:'fsgladhjk',
    resave:false,
    saveUninitialized:false
}));

//全局登录状态
app.use((req,res,next)=>{
    res.locals.isLogin=!!req.session.user;
    res.locals.user=req.session.user||null;
    next();
});

// 添加日志记录功能
function logAction(action, user, details = '') {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} - ${action} - User: ${user || 'Anonymous'} - ${details}\n`;
    fs.appendFileSync(path.join(logDirectory, 'app.log'), logEntry);
}

// 日志页面
app.get('/log', (req, res) => {
    const logFile = path.join(logDirectory, 'app.log');
    let logs = [];
    
    if (fs.existsSync(logFile)) {
        const logContent = fs.readFileSync(logFile, 'utf8');
        logs = logContent.split('\n').filter(line => line.trim() !== '').reverse(); // 最新的在前
    }
    
    let html = '<h1>应用日志</h1><div style="font-family: monospace; white-space: pre-wrap;">';
    
    if (logs.length > 0) {
        logs.slice(0, 100).forEach(log => { // 只显示最近100条
            html += `<p>${log}</p>`;
        });
    } else {
        html += '<p>暂无日志记录</p>';
    }
    
    html += '</div><br><a href="/">返回首页</a>';
    
    res.send(html);
});

//首页
app.get('/',(req,res)=>{
    let body;
    if (req.session.user) {
        body = `
            <div class="text-center">
                <h2 class="mb-3">🎉 欢迎回来</h2>
                <p class="lead">${req.session.user.username}</p>
                <a href="/logout" class="btn btn-outline-danger mt-3">安全登出</a>
            </div>`;
    } else {
        body = `
            <div class="text-center">
                <h2 class="mb-4">📋 欢迎光临</h2>
                <div class="d-grid gap-3">
                    <a href="/login" class="btn btn-primary btn-lg">登录</a>
                    <a href="/register" class="btn btn-outline-secondary btn-lg">注册新账号</a>
                </div>
            </div>`;
    }
    res.send(renderPage('首页', body));
});

//登录界面
app.get('/login',(req,res)=>{
    const successMsg = req.query.registered ?
        '<div class="alert alert-success" role="alert">✅ 注册成功，请登录</div>' : '';
    const body = `
        <h2 class="text-center mb-4">🔐 用户登录</h2>
        ${successMsg}
        <form method="POST" action="/login">
            <div class="mb-3">
                <label for="username" class="form-label">用户名</label>
                <input type="text" class="form-control" id="username" name="username" placeholder="请输入用户名" required>
            </div>
            <div class="mb-3">
                <label for="password" class="form-label">密码</label>
                <input type="password" class="form-control" id="password" name="password" placeholder="请输入密码" required>
            </div>
            <div class="d-grid gap-2">
                <button type="submit" class="btn btn-primary">登录</button>
            </div>
            <div class="mt-3 text-center">
                <span class="text-muted">还没有账号？</span>
                <a href="/register" class="text-decoration-none">立即注册</a>
            </div>
        </form>`;
    res.send(renderPage('登录', body));
})

//登录接口（修改为成功后重定向到首页）
app.post('/login',(req,res)=>{
    const {username,password}=req.body;
    connection.query('SELECT * FROM users WHERE username=?',[username],(err,results)=>{
        if(err) {
            logAction('LOGIN_FAILED', null, `Database error: ${err.message}`);
            return res.send(renderPage('错误', '<div class="alert alert-danger">数据库错误</div><a href="/login" class="btn btn-secondary mt-3">返回</a>'));
        }
        if(results.length==0){
            logAction('LOGIN_FAILED', null, `User not found: ${username}`);
            return res.send(renderPage('错误', '<div class="alert alert-warning">用户不存在</div><a href="/login" class="btn btn-secondary mt-3">返回</a>'));
        }
        const user=results[0];
        if(password!=user.password){
            logAction('LOGIN_FAILED', null, `Invalid password attempt for: ${username}`);
            return res.send(renderPage('错误', '<div class="alert alert-danger">密码错误</div><a href="/login" class="btn btn-secondary mt-3">返回</a>'));
        }
        // 登录成功，保存session后重定向
        req.session.user={
            id:user.id,
            username:user.username,
        };
        logAction('LOGIN_SUCCESS', username, `User logged in from IP: ${req.ip}`);
        res.redirect('/');
    });
});

//注册界面
app.get('/register',(req,res)=>{
    const body = `
        <h2 class="text-center mb-4">📝 注册新账号</h2>
        <form method="POST" action="/register">
            <div class="mb-3">
                <label for="username" class="form-label">用户名</label>
                <input type="text" class="form-control" id="username" name="username" placeholder="请输入用户名" required>
            </div>
            <div class="mb-3">
                <label for="password" class="form-label">密码</label>
                <input type="password" class="form-control" id="password" name="password" placeholder="请设置密码" required>
            </div>
            <div class="d-grid gap-2">
                <button type="submit" class="btn btn-primary">注册</button>
            </div>
            <div class="mt-3 text-center">
                <span class="text-muted">已有账号？</span>
                <a href="/login" class="text-decoration-none">去登录</a>
            </div>
        </form>`;
    res.send(renderPage('注册', body));
});

//注册接口（成功后带参数重定向到登录页）
app.post('/register',(req,res)=>{
    const {username,password}=req.body;
    connection.query('SELECT * FROM users WHERE username=?',[username],(err,results)=>{
        if(err) {
            logAction('REGISTER_FAILED', null, `Database error: ${err.message}`);
            return res.send(renderPage('错误', '<div class="alert alert-danger">数据库错误</div><a href="/register" class="btn btn-secondary mt-3">返回</a>'));
        }
        if(results.length>0){
            logAction('REGISTER_FAILED', null, `Registration attempt with existing username: ${username}`);
            return res.send(renderPage('错误', '<div class="alert alert-warning">用户名已存在</div><a href="/register" class="btn btn-secondary mt-3">返回</a>'));
        }
        connection.query('INSERT INTO users (username,password) VALUES(?,?)',[username,password],(err)=>{
            if(err) {
                logAction('REGISTER_FAILED', null, `Database error: ${err.message}`);
                return res.send(renderPage('错误', '<div class="alert alert-danger">注册失败</div><a href="/register" class="btn btn-secondary mt-3">返回</a>'));
            }
            logAction('REGISTER_SUCCESS', username, `New user registered from IP: ${req.ip}`);
            // 注册成功，跳转登录页并显示成功提示
            res.redirect('/login?registered=1');
        });
    });
});

//登出
app.get('/logout',(req,res)=>{
    const username = req.session.user ? req.session.user.username : 'Anonymous';
    req.session.destroy((err)=>{
        if(err) {
            logAction('LOGOUT_FAILED', username, `Error destroying session: ${err.message}`);
        } else {
            logAction('LOGOUT_SUCCESS', username, `User logged out from IP: ${req.ip}`);
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

//启动npm install express mysql2 express-session

app.listen(3005,()=>{
    console.log('服务启动在 http://localhost:3005');
});