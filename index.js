if (process.env.NODE_ENV !== "production") {
  require("dotenv").config()
}


// importing libraries
const express = require('express');
const app = express();
const mongoose = require("mongoose")
const jwt = require('jsonwebtoken')
const path = require('path');
const bcrypt = require("bcrypt")
const passport = require("passport")
const initializePassport = require("./passport-config.js")
const flash = require("express-flash")
const session = require("express-session");
const { config } = require("process");
const methodOverride = require("method-override")
const ejs = require('ejs');
const port = 8080;
const cookieParser = require('cookie-parser');


// Configurando o diretório público
app.use(express.static('views'));


initializePassport(
  passport,
  email => users.find(user => user.email === email),
  id => users.find(user => user.id === id)
)

//Models
const User = require('./models/User')

// Configure imports
app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride("_method"))
app.set('view engine', 'ejs');
app.engine('ejs', ejs.__express);
app.use(cookieParser());



// Login functionality
app.post("/login", async (req, res) => {
  const { email, password } = req.body

  // validations
  if (!email) {
    const errors = { msg: 'Digite seu email' }
    return res.status(422).render('login', { errors })
  }
  if (!password) {
    const errors = { msg: 'Digite sua senha' }
    return res.status(422).render('login', { errors })
  }

  // check if user exists
  const user = await User.findOne({ email: email })

  if (!user) {
    const errors = { msg: 'Usuário não encontrado' }
    return res.status(404).render('login', { errors })
  }

  // check if password match
  const checkPassword = await bcrypt.compare(password, user.password)

  if (!checkPassword) {
    const errors = { msg: 'Senha incorreta!' }
    return res.status(422).render('login', { errors })
  }

  try {
    const secret = process.env.SECRET;
  
    const token = jwt.sign(
      {
        id: user._id,
      },
      secret
    );
  
    // Redirecione para a rota privada
    return res.redirect(`/app/${user._id}?token=${token}`);
  } catch (err) {
    console.log(err);
  
    const errors = { msg: 'Erro de servidor. Tente novamente mais tarde!' };
    return res.status(422).render('login', { errors });
  }
  
  
});

// Register funcionality
app.post("/register", async (req, res) => {
  const { name, email, password, confirmpassword } = req.body

  // validations
  if (!name) {
    const errors = { msg: 'O Nome é Obrigatório' }
    return res.status(422).render('register', { errors })
  }

  if (!email) {
    const errors = { msg: 'O email é obrigatório' }
    return res.status(422).render('register', { errors })
  }

  if (!password) {
    const errors = { msg: 'A senha é obrigatória' }
    return res.status(422).render('register', { errors })
  }

  if (password !== confirmpassword) {
    const errors = { msg: 'As senhas não conferem' }
    return res.status(422).render('register', { errors })
  }

  //check if user exists
  const userExists = await User.findOne({ email: email })

  if (userExists) {
    const errors = { msg: 'Email já cadastrado' }
    return res.status(422).render('register', { errors })
  }

  //create password
  const salt = await bcrypt.genSalt(12)
  const passwordHash = await bcrypt.hash(password, salt)

  //create user
  const user = new User({
    name,
    email,
    password: passwordHash,
  })

  try {
    await user.save()
    res.status(201)
    console.log('Usuário criado com sucesso!')
    res.redirect("/login")

  } catch (error) {
    const errors = { msg: 'Erro de servidor. Tente novamente mais tarde!' }
    return res.status(422).render('register', { errors })
  }
})

// ================================ ROTAS ========================================
app.get('/', (req, res) => {
  res.render("home.ejs")
});

app.get('/plans', (req, res) => {
  res.render("plans.ejs")
})

app.get('/login', (req, res) => {
  const errors = null;

  res.render("login.ejs", { errors })
});

app.get('/register', (req, res) => {
  const errors = null; // Defina a variável errors como null

  res.render('register', { errors }); // Passe a variável errors para o template
});

// Rota privada
app.get('/app/:id', checkToken, async (req, res) => {
  const id = req.params.id;
  const token = req.query.token;

  try {
    // Busque o nome do usuário no banco de dados com base no ID
    const user = await User.findById(id);
    const name = user.name;

    // Renderize o arquivo app.ejs e passe o nome como propriedade
    res.render('app.ejs', { name, token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ msg: 'Erro de servidor. Tente novamente mais tarde!' });
  }
});



// Função de verificação do token
function checkToken(req, res, next) {
  const token = req.query.token;

  if (!token) {
    // Redirecione para a rota pública ("/login" no exemplo)
    return res.redirect('/login');
  }

  try {
    const secret = process.env.SECRET;
    jwt.verify(token, secret);

    // Continue para a próxima middleware
    next();
  } catch (err) {
    console.log(err);
    res.status(400).json({ msg: 'Token inválido!' });
  }
}

//============================= FIM DAS ROTAS ================================

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

//Credencials
const dbUser = process.env.DB_USER
const dbPassword = process.env.DB_PASS

mongoose
  .connect(`mongodb+srv://${dbUser}:${dbPassword}@cluster0.cbik5ms.mongodb.net/?retryWrites=true&w=majority`)
  .then(() => {
    app.listen(port, () => {
      console.log(`Servidor rodando em http://localhost:${port} & conectado ao DB`);
    });
  }).catch((err) => console.log(err))
