const express = require('express');
const userModel = require('./models/user');
const postModel = require('./models/post');
const path = require('path');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


const app = express();
const PORT = 3000;

// Middleware to parse JSON data
app.set("view engine","ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

//Routes
app.get('/', (req, res) => {
    res.render("index");
});

app.get('/login', (req, res) => {
    res.render("login");
});

app.get('/profile',isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({email: req.user.email}).populate("posts");
    res.render("profile",{user:user});
});

app.get('/like/:id',isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({_id: req.params.id}).populate("user");

    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid);
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid),1);
    }

    await post.save();
    res.redirect("/profile");
});

app.get('/edit/:id',isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({_id: req.params.id}).populate("user");
    res.render("edit",{post});
});

app.post('/update/:id',isLoggedIn, async (req, res) => {
    let post = await postModel.findOneAndUpdate({_id: req.params.id},{content:req.body.content});
    res.redirect("/profile");
});

app.post('/post',isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({email: req.user.email});
    let {content} = req.body;

    let post = await postModel.create({
        user: user._id,
        content: content
    });
    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");
});

app.post('/register', async(req, res) => {
    let {email,password,name,age,username} = req.body;

    let user = await userModel.findOne({email: email});
    if(user) return res.status(500).send("user already registered");

    bcrypt.genSalt(10,(err,salt)=>{
        bcrypt.hash(password,salt, async (err,hash)=>{
            let user = await userModel.create({
                username,
                age,
                name,
                email,
                password : hash
            });

            let token = jwt.sign({email:email, userid: user._id}, "shhhhhh");
            res.cookie("token",token);
            res.redirect("/login");
        });
    });

});

app.post('/login', async(req, res) => {
    let {email,password} = req.body;

    let user = await userModel.findOne({email: email});
    if(!user) return res.status(500).send("something went wrong!");

    bcrypt.compare(password,user.password, function (err,result){
        if(result){
            let token = jwt.sign({email:email, userid: user._id}, "shh");
            res.cookie("token",token);
            res.status(200).redirect("/profile");
        }
        else res.redirect("/login");
    });
});

app.get('/logout', (req, res) => {
    res.cookie("token","");
    res.redirect("/login");
});

app.get('/delete/:id',isLoggedIn, async (req, res) => {
    let post = await postModel.findOneAndDelete({_id: req.params.id});

    if (!post) {
        return res.status(404).send("Post not found");
    }
        res.redirect("/profile");
});



function isLoggedIn(req,res,next){
    if(req.cookies.token === "") res.redirect("/login");
    else{
        let data = jwt.verify(req.cookies.token,"shh");
        req.user = data;
        next();
    }
}

app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`);
});
