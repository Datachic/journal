//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require('lodash');
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
//found out we need to require passport-local after all if we are not using passportLocalMongoose...
// const LocalStrategy = require('passport-local').Strategy;
const MongoStore = require('connect-mongo');

const app = express();

app.set('view engine', 'ejs');
mongoose.set('strictQuery', true);
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.json());
app.use(express.static("public"));

 const url = "mongodb://localhost:27017/myBlog";

/* (1) make use of the express-session package by
   resave means for every request to the server we want to
   create a new session of it. we definately dont want this.
   saveUninitailized means save the session only if we have
   touched or modified it. we dont want this also.
   👇
 */
app.use(session({
  secret: "key that will be used to sign the cookie saved to the browser",
  resave: false,
  saveUninitialized: false,
    }
))

// mongoose.connect(url, ()=>{console.log("database connected!!!")})

// 👇 (2) initalize passport, use it and use it to manage sessions.
app.use(passport.initialize());
app.use(passport.session());

// 👇 database connection begin
  mongoose.connect
    ("mongodb+srv://adminAdmin:test123@cluster0.cxrlb.mongodb.net/Journaldb")
        .then((res)=>{
          console.log(" We're now connected to Journaldb mongoDB database!")
        })
  

const userSchema = new mongoose.Schema ({ // ...db for local & google sign on
  email: String,
  password: String,
});

/* (3) Make use of the passportLocalMongoose pkg by pluging it to
    our newly created schema. This is what we are going to use to
    hash & salt our password and to save the user to the database
    👇*/
userSchema.plugin(passportLocalMongoose)

const User = mongoose.model("User", userSchema);

/* (4) configure the passport-local by first creating a strategy
    (in this case a local strategy to authenticate users using their username and password )
    and also to serialise and deserialize our users
    // passport.use(User.createStrategy());
    // ...this makes use of the passport_local package
    👇 */
  passport.use(User.createStrategy());
  passport.serializeUser(User.serializeUser());
  passport.deserializeUser(User.deserializeUser());


const homeStartingContent = "This is an app to record personal activities, reflections, or feelings";
const aboutContent = "I develop backend applications and websites";
const contactContent = "Hello there, Ask me something.";

var Posts=[];
var para;
var blg;

const blogschema = new mongoose.Schema({title: String,
                                        post: String,
                                        usr:String }); // db for post is created
const blogModel = mongoose.model("blog", blogschema);

app.get('/', function(req,res){
  res.render('index');
})

app.get("/register", function(req, res){
  res.render("register");
});

app.post("/register", function(req, res){
  // we make use of passportLocal mongoose here to do this...
  User.register({
    username: req.body.email}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.render("registerErr", { err : err});
    } else {
      res.redirect("/registered");
    }
  });

});

app.get("/registered", function(req, res){
  res.render("registered");
});

app.get("/login", function(req, res, next){
  res.render("login");
});

app.post('/login', passport.authenticate('local', {
  failureRedirect: '/',
  successRedirect: '/home' }
));

var sessionUser;

app.get("/home", function(req, res){
  if (req.isAuthenticated()){
    console.log(req.session)
    sessionUser = req.session.passport.user
    console.log(`The current user is => ${sessionUser}`)

    blogModel.find({usr:sessionUser}, function(err, blog){
      console.log(blog)// blog.find()
      if(!err){
        res.render('home', {
          title:homeStartingContent,
          usr:sessionUser,
           post: blog
        })
      }
    })
  } else {
    res.redirect("/");
  }
});

app.get("/logout", function(req, res){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.render('logout')
   });
   
});

app.get('/about', function(req,res){
  if (req.isAuthenticated()){
      res.render('about', { title:aboutContent})
  } else {
    res.redirect("/");
  }

})

app.get('/contact', function(req,res){
  if (req.isAuthenticated()){
   res.render('contact', {title:contactContent})
  }else {
    res.redirect("/");
  }
  })

app.get('/compose', function(req,res){
  if (req.isAuthenticated()){
  // sessionUser = req.session.passport.user
  console.log(sessionUser)
  res.render('compose', {usr:sessionUser}  )
} else {
  res.redirect("/");
}
})

app.post('/compose', function(req, res){
  // sessionUser = req.session.passport.user
  var pTitle = req.body.title;
  var pBody = req.body.post
  var usrr = req.body.usr
  console.log(`this user is ${usrr}`)
  var newblog = new blogModel({
    title: pTitle,
    post:pBody,
    usr:sessionUser
  })
    if(pTitle!=""|| pBody!=""){
      newblog.save()
      // res.redirect('/')
  }
  res.redirect('/home')
})

app.get('/post/:query', function(req,res){
      para = req.params.query
      var qr = _.lowerCase(para);
      blogModel.find(function(err,itms){
        for(let i of itms){
          var sqr = _.lowerCase(i.title);
          if (sqr===qr){
            res.render('post', {
              title:i.title,
              post: i.post
            })
            console.log('match found')
          }else{
            console.log('try again, match not found')
          }
        }

      })
    })

  app.get('/edit/:query', function(req,res){
          para = req.params.query
          var qr = _.lowerCase(para);
          blogModel.find(function(err, itms){
            for(let i of itms){
              var sqr = _.lowerCase(i.title);
              if (sqr===qr){
                res.render('edit', {
                  title: i.title,
                  post: i.post
                })
                console.log('match found')
              }else{
                console.log('try again, match not found')
               }
              }

           })
        })

  app.post('/editn', function(req,res){
      var pTitle = req.body.pTitle;
        var pBody = req.body.pBody;
        console.log(`Details entered are ${pTitle} and ${pBody}`)
        console.log(req.body)

        blogModel.findOneAndUpdate(
          {title:pTitle},
          {$set:{post:pBody}},
          {new:true, useFindAndModify:false},
          function(err, doc){
            if(!err){ console.log(`doc is => ${doc}`)}
         })
              res.redirect('/home')
         })

    app.post("/delete", function(req,res){
      var title = req.body.bot;
      var post = req.body.bot1;
      blogModel.deleteOne({title:title,
                           post:post}, function(err){
        if(err){
          console.log(err)
        }else{
          console.log(title +' with post '+post+' was deleteted')
        }
      })
      res.redirect("/home")
    })
    app.listen(3002, function() {
      console.log("Server started on port 3002");
    });
    
// app.listen(process.env.PORT || 3002, function() {
//   console.log("Server started on port 3002");
// });
