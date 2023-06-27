if (process.env.NODE_ENV !== "production") {
  require("dotenv").config()
}


// importing libraries
const express = require('express');
const path = require('path');
const app = express();
const bcrypt = require("bcrypt")
const passport = require("passport")
const initializePassport = require("C:/Users/leuol/OneDrive/Documentos/SmartPizza/passport-config.js")
const flash = require("express-flash")
const session = require("express-session");
const { config } = require("process");
const methodOverride = require("method-override")

// Configurando o diretório público
app.use(express.static('views'));


initializePassport(
  passport,
  email => users.find(user => user.email === email),  
  id => users.find(user => user.id === id)
)

const users = []

app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false, // we wont resave the session variable if nothing is changed
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride("_method"))


// Configuring the login post functionality
app.post("/login", checkNotAuthenticated, passport.authenticate("local", {
  successRedirect: "/app",
  failureRedirect: "/login",
  failureFlash: true
}))

// Configuring the register post functionality
app.post("/register", checkNotAuthenticated, async (req, res) => {
  try{
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    users.push({
      id: Date.now().toString(),
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
    })
    console.log(users)
    res.redirect("/login")
  } catch (e){
    console.log(e)
    res.redirect("register")
  }
})

// ================================ ROTAS ========================================
app.get('/', (req, res) => {
  res.render("home.ejs")
});

app.get('/plans', (req, res) => {
  res.render("plans.ejs")
})

app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render("login.ejs")
});

app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render("register.ejs")
});

app.get('/app', checkAuthenticated, (req, res) => {
  res.render("app.ejs", {name: req.user.name})
});
//============================= FIM DAS ROTAS ================================

app.delete("/logout", (req, res) =>{
  req.logout(req.user, err => {
    if(err) return next(err)
    res.redirect("/login")
  })
})

function checkAuthenticated(req, res, next){
  if(req.isAuthenticated()){
    return next();
  }
  res.redirect("/login");
}

function checkNotAuthenticated(req, res, next){
  if(req.isAuthenticated()){
     return res.redirect("/app");
  }
  next(); 
}


// Inicia o servidor
const port = 8080;
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
