//引入
const express=require('express');
const mysql=require('mysql2');
const session=require('express-session');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const app=express();

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
        if(err){
            return res.send('数据库错误');
        }
        if(results.length==0){
            return res.send('用户不存在');
        }
        const user=results[0];
        if(password!=user.password){
            return res.send('密码错误');
        }
        req.session.user={
            id:user.id,
            username:user.username,
        };
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
        if(err){
            return res.send('数据库错误');
        }
        if(results.length>0){
            return res.send('用户名已存在');
        }
        connection.query('INSERT INTO users (username,password) VALUES(?,?)',[username,password],(err)=>{
            if(err){
                return res.send('数据库错误');
            }
            res.send('注册成功');
        });
    });
});

//登出
app.get('/logout',(req,res)=>{
    req.session.destroy((err)=>{
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

//启动npm install express mysql2 express-session

app.listen(3005,()=>{
    console.log('服务启动在3005端口');
});