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
    if(req.session.user){
        res.send(`<h1>首页</h1><p>欢迎您,${req.session.user.username}</p><a href="/logout">登出</a>`);
    }else{
        res.send('<h1>首页</h1><a href="/login">登录</a><br/><a href="/register">注册</a>');
    }
})

//登录界面
app.get('/login',(req,res)=>{
    res.send('<h1>登录</h1><form method="POST" action="/login">用户名：<input name="username"><br/>密码：<input name="password" type="password"><br/><button>登录</button></form>');
})

//登录接口
app.post('/login',(req,res)=>{
    const {username,password}=req.body;
    connection.query('SELECT * FROM users WHERE username=?',[username],(err,results)=>{
        if(err) {
            logAction('LOGIN_FAILED', null, `Database error: ${err.message}`);
            return res.send('数据库错误');
        }
        if(results.length==0){
            logAction('LOGIN_FAILED', null, `User not found: ${username}`);
            return res.send('用户不存在');
        }
        const user=results[0];
        if(password!=user.password){
            logAction('LOGIN_FAILED', null, `Invalid password attempt for: ${username}`);
            return res.send('密码错误');
        }
        req.session.user={
            id:user.id,
            username:user.username,
        };
        logAction('LOGIN_SUCCESS', username, `User logged in from IP: ${req.ip}`);
        res.send('登录成功');
    });
});

//注册界面
app.get('/register',(req,res)=>{
    res.send('<h1>注册</h1><form method="POST" action="/register">用户名：<input name="username"><br/>密码：<input name="password" type="password"><br/><button>注册</button></form>');
});

//注册接口
app.post('/register',(req,res)=>{
    const {username,password}=req.body;
    connection.query('SELECT * FROM users WHERE username=?',[username],(err,results)=>{
        if(err) {
            logAction('REGISTER_FAILED', null, `Database error: ${err.message}`);
            return res.send('数据库错误');
        }
        if(results.length>0){
            logAction('REGISTER_FAILED', null, `Registration attempt with existing username: ${username}`);
            return res.send('用户名已存在');
        }
        connection.query('INSERT INTO users (username,password) VALUES(?,?)',[username,password],(err)=>{
            if(err) {
                logAction('REGISTER_FAILED', null, `Database error: ${err.message}`);
                return res.send('数据库错误');
            }
            logAction('REGISTER_SUCCESS', username, `New user registered from IP: ${req.ip}`);
            res.send('注册成功');
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
    console.log('服务启动在3005端口');
});