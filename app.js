require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");
const app = express();
const passport = require("passport");
const passportLocal = require("passport-local");
const passportLocalMongoose = require("passport-local-mongoose");
const session = require("express-session");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
const aboutContent = process.env.ABOUT_CONTENT;
let posts = [];

app.use(session({
    secret: "Our noob Secret",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/projectDb");// Created a Schema --- 

const dataSchema = new mongoose.Schema({
    title: {
        type: String,
        unique: false
    },
    post: String,
    name: String
});
const Data = new mongoose.model("Data", dataSchema);

const userSchema = new mongoose.Schema({
    email: String,
    post: [dataSchema],
    password: String,
    username: String,
    googleId: String,
    githubId: String,
    facebookId: String
});
userSchema.plugin(findOrCreate);
userSchema.plugin(passportLocalMongoose);
// Created a model for db  ---
const User = new mongoose.model("User", userSchema);
passport.use(User.createStrategy());

passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        cb(null, { id: user.id, username: user.username, name: user.name });
    });
});
passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_ID,
    clientSecret: process.env.GOOGLE_SECRET,
    callbackURL: "http://localhost:3000/auth/google/trailProject"
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            // console.log(profile);
            user.username = profile.name.givenName;
            // user.googleId=profile.id;
            user.save();
            return cb(err, user);
        });
    }
));

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_ID,
    clientSecret: process.env.GITHUB_SECRET,
    callbackURL: "http://localhost:3000/auth/github/trailProject"
},
    function (accessToken, refreshToken, profile, done) {
        User.findOrCreate({ githubId: profile.id }, function (err, user) {
            user.username = profile.username;
            user.save();
            return done(err, user);
        });
    }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_ID,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/trailProject"
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ facebookId: profile.id }, function (err, user) {
            user.username = profile.displayName;
            user.save();
            return cb(err, user);
        });
    }
));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// const test = new Compose({
//     title: "HTML",
//     post: process.env.HTML
// });
// const test1 = new Compose({
//     title: "CSS",
//     post: process.env.CSS
// });
// const test2 = new Compose({
//     title: "JavaScript",
//     post: process.env.JS
// });
// // test.save();
// defaultContent = [test, test2];



app.get("/home", function (req, res) {
    if (req.isAuthenticated()) {
        // console.log(req.user.id);
        Data.find({}, function (err, foundUser) {
            if (err) {
                console.log(err);
            } else {
                // console.log(req.user.id);
                // console.log(foundUser.username);
                // console.log(name);
                // Compose.find({ "post": { $ne: null } }, function (err, cp) {
                //     if (err) {
                //         console.log(err);
                //     } else {
                //         posts=cp;

                //     }
                // });
                let name = req.user.username;
                posts = foundUser;
                res.render("home", { postContent: foundUser, name: name });
            }
        });
    } else {
        res.redirect("/");
    }

});
// console.log(posts);
app.get("/about", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("about", { aboutContent: aboutContent });
    } else {
        res.redirect("/");
    }
});
app.get("/contact", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("contact");
    } else {
        res.redirect("/");
    }
});
app.get("/compose", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("compose");
    } else {
        res.redirect("/");
    }
});
app.get("/uniqueTitle", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("uniqueTitle");
    } else {
        res.redirect("/");
    }
});

app.get("/posts/:postName", function (req, res) {
    if (req.isAuthenticated()) {
        // console.log(posts);
        // console.log(_.lowerCase(req.params.postName));
        posts.forEach(function (name) {
            if (_.lowerCase(name.title) == _.lowerCase(req.params.postName)) {
                // console.log(_.lowerCase(name.title)+" "+_.lowerCase(req.params.postName));
                res.render("post", { title: name.title, content: name.post, name: name.name });
            } else {
                // console.log("NOt a Match");
            }
        });
    } else {
        res.redirect("/");
    }

});

app.get("/", function (req, res) {
    res.render("signin");
});

app.get("/login", function (req, res) {
    res.render("login");
});
app.get("/register", function (req, res) {
    res.render("register");
});

app.get("/logout", function (req, res) {
    req.logout(function (err) {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/");
        }
    });

});

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] })
);

app.get('/auth/google/trailProject',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/home');
    }
);

app.get('/auth/github',
    passport.authenticate('github', { scope: ['user:email'] })
);

app.get('/auth/github/trailProject',
    passport.authenticate('github', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/home');
    }
);

app.get('/auth/facebook',
    passport.authenticate('facebook'));

app.get('/auth/facebook/trailProject',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/home');
    }
);

app.post("/register", function (req, res) {
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/home");
            });
        }
    });
});

app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/home");
            })
        }
    });
});

// let newPost = new Post({
//     title: "default post",
//     post: "default post",
//     name: " default name"
// });
// newPost.save();

app.post("/compose", function (req, res) {
    if (req.isAuthenticated()) {
        const title = req.body.titleInput;
        const post = req.body.postInput;
        const id = req.user.id;
        const name = req.user.username;
        // console.log();
        // console.log(posts);
        User.findById(req.user.id, function (err, foundUser) {
            if (err) {
                console.log("Lol");
            } else {

                let newPost = new Data({
                    title: title,
                    post: post,
                    name: name
                });
                newPost.save();
                foundUser.post.push(newPost);
                foundUser.save(function () {
                    res.redirect("/home");
                });
            }
        });

    } else {
        res.redirect("/");
    }
});


app.listen(process.env.PORT || 3000, function () {
    console.log("Server is running at server 3000");
});
