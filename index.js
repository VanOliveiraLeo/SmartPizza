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
const flash = require("express-flash")
const session = require("express-session");
const { config, env } = require("process");
const methodOverride = require("method-override")
const ejs = require('ejs');
const cookieParser = require('cookie-parser');
const multer = require('multer')
const fs = require('fs')
const nodemailer = require('nodemailer');
const Mailgen = require('mailgen')


// Configurando o diretório público
app.use(express.static('views'));

//Models
const User = require('./models/User')
const UploadModel = require('./models/schema');
const { promises } = require("dns");

// Configure imports
app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(methodOverride("_method"))
app.set('view engine', 'ejs');
app.engine('ejs', ejs.__express);
app.use(cookieParser());
app.use(express.json())

//set storage
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads')
  },
  filename: function (req, file, cb) {
    //image.jpg
    var ext = file.originalname.substr(file.originalname.lastIndexOf(''))

    cb(null, file.fieldname + '-' + Date.now() + ext)
  }
})

storage = multer({ storage: storage })


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

  /*let testAccount = await nodemailer.createTestAccount();

  transporter.sendMail(message).then((info) => {
    return res.status(201)
    .json({
      msg:"você deve ter recebido um email",
      info: info.messageId,
      preview: nodemailer.getTestMessageUrl(info)
    })
  }).catch(error => {
    return res.status(500).json({ error })
  }) */

  let config = {
    service: 'gmail',
    auth:{
      user:'leuolivera442@gmail.com',
      pass:'bqkdqyhbxvnjjqeh'
    }
  }

  let transporter = nodemailer.createTransport(config)

  let MailGenerator = new Mailgen({
    theme: "default",
    product:{
      name: "Mailgen",
      link: 'https://mailgen.js/'
    }
  })

  let response = {
    body:{
      name : "Daily Tuition",
      intro: "Seu email foi enviado",
      table : {
        data:[
          {
          item: "Nodemailer Stack Book",
          description: "A Backend apliccation",
          price: "R$10,99"
        }
      ]
      },
      outro: "Looking forward to do more business"
    }
  }

  let mail = MailGenerator.generate(response)

  let message = {
    from: 'leuolivera442@gmail.com',
    to: email,
    subject: "Place Order",
    html: mail
  }

  transporter.sendMail(message).then(() => {
    return res.status(201)
  }).catch(error => {
    return res.status(500)
  })

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

// Adicionando as imagens na página logada
app.post('/uploadmultiple', storage.array('images', 12), async (req, res) => {
  const files = req.files;

  if (!files) {
    const error = new Error('Please choose files');
    error.httpStatusCode = 400;
    return next(error)
  }

  //convert images
  let imgArray = files.map((file) => {
    let img = fs.readFileSync(file.path)

    return encode_image = img.toString('base64')

  })

  let result = imgArray.map((src, index) => {

    //create object to store data in the collection
    let finalImg = {
      filename: files[index].originalname,
      contentType: files[index].mimetype,
      imageBase64: src
    }

    let newUpload = new UploadModel(finalImg)

    return newUpload
      .save()
      .then(() => {
        return { msg: `${files[index].originalname} Uploaded Successfuly!` }
      })
      .catch(error => {
        if (error) {
          if (error.name === 'MongoError' && error.code === 11000) {
            return Promise.reject({ error: `Duplicate ${files[index].originalname}.File Already exists` })
          }
          return Promise.reject({ error: error.message || `Cannot Upload ${files[index].originalname}Something Missing!` })
        }
      })

  })

  Promise.all(result)
    .then(msg => {
      try {
        const secret = process.env.SECRET;

        const token = jwt.sign(
          {
            id: user._id,
          },
          secret
        );

        // Redirecionando para a rota privada
        return res.redirect(`/app/${user._id}?token=${token}`);
      } catch (err) {
        console.log(err);

        const errors = { msg: 'Erro de servidor. Tente novamente mais tarde!' };
        return res.status(422).render('app', { errors });
      }
    })
    .catch(err => {
      res.json(err)
    })
})

// Enviando email
app.post('/', async (req,res) => {
  const email = req.body.email

 

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
    const all_images = await UploadModel.find();
    const images = all_images

    // Renderize o arquivo app.ejs e passe o nome e as imagens como propriedades
    res.render('app.ejs', { name, token, images });
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
const port = 8080;

mongoose
  .connect(`mongodb+srv://${dbUser}:${dbPassword}@cluster0.cbik5ms.mongodb.net/?retryWrites=true&w=majority`)
  .then(() => {
    app.listen(port, () => {
      console.log(`Servidor rodando em http://localhost:${port} & conectado ao DB`);
    });
  }).catch((err) => console.log(err))