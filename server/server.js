const express = require('express');
const fs = require('fs')
const path = require('path');
const bodyParser = require('body-parser');
const formData = require("express-form-data");
const { promisify } = require("util");
const bcrypt = require('bcrypt');
const session = require('express-session');
const csp = require('express-csp-header');
const mongoose = require('mongoose')
const MarkdownPreprocess = require("./MarkdownPreprocess")
const engine = require('ejs-mate');

global.window = {document: {createElementNS: () => {return {}} }};
global.navigator = {};
global.btoa = () => {};

const app = express();

app.use(csp({
    policies: {
        'script-src': [csp.SELF, csp.INLINE, csp.EVAL, 'somehost.com', '*', 'cdn.rawgit.com/showdownjs'],
        'style-src': [csp.SELF, csp.INLINE, csp.EVAL, 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/css/bootstrap.min.css'],//[csp.SELF, csp.INLINE],
        'img-src': [csp.SELF,
                , 'blob:' // this is for dropping images
                ],
        'object-src': [ csp.SELF, "blob:", csp.INLINE, csp.EVAL, 'localhost:8002/*']
    }
}));


app.use(bodyParser.urlencoded({extended: true}));
app.use(express.json());
app.use(formData.parse({autoClean: true}))
app.use(express.static(path.join(__dirname, 'public')));
const dotenv = require('dotenv');
dotenv.config();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public', 'views'));

app.use(session({
    name: 'sid',
    cookie: {
        maxAge: 60 * 60 * 1000,
        sameSite: true,

    },
    resave: false,
    saveUninitialized: false,
    secret: "24tegfdfutDFG4754GV"
}));

app.engine('ejs', engine);


let tmpStorage = 'public/tmp_store';
const multer = require("multer");
let storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, tmpStorage);
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname);
    }
});

var storeDir = '';


const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const upload = multer({
  storage: storage,
  limits: {
      fileSize: 1024 * 1024 * 5
  },
  fileFilter: fileFilter
});

const UserDataSchema = new mongoose.Schema({
    username: String,
    password: String,
    email: String,
    role: String,
    SessionID: [String]
})

const UserData = mongoose.model("UserData", UserDataSchema);

//--------------------------------------------------------------------------------------------------------------

app.get('/login', (req, res) => {
    res.render('login.ejs', {role: req.auth ? req.auth.role: undefined});
})

app.get('/logout', (req, res) => {
    res.cookie('username', {expires: Date.now()});
    res.cookie('Session-id', {expires: Date.now()})
    res.clearCookie('username');
    res.clearCookie('Session-id');
    req.session.destroy(function(err){  
        if(err){  
            console.log(err);  
        }  
        else  
        {  
            res.redirect('/');  
        }  
    });  
})

const uuidv1 = require('uuid/v1');
const crypto = require('crypto');
const cookieParser = require('cookie-parser')
app.use(cookieParser())

app.use((req, res, next) => {
    const name = req.cookies['username'];
    const passedEncryptedSessionId = req.cookies['Session-id'];
    if (name && passedEncryptedSessionId)
    {
        UserData.findOne({username: name}, (err, foundUser) => {
            if (foundUser)
            {
                if (foundUser.SessionID)
                {

                    for (let sessionID of foundUser.SessionID)
                    {
                        let hmac = crypto.createHmac('sha512', process.env.TOKEN_SECRET); // put somewhere globally
                        hmac.write(sessionID);
	                    hmac.end()
                        let encryptedSessionId = hmac.read().toString('hex');
                        if (encryptedSessionId === passedEncryptedSessionId)
                        {
                            req.auth = foundUser;
                            return next();
                        }
                    }
                    res.status(401).send('user authentication fail');
                }
                else
                {
                    next();
                }
            }
            else
            {
                res.status(401).send('user authentication fail');
                return;
            }
        })
    }
    else
    {
        next();
    }

});

app.post('/login', (req, res) => {
    console.log("-------------------- post /login");
    UserData.findOne({username: req.body.username}, async (err, foundUser) => {
        if (foundUser)
        {
            const hashedPassword = foundUser.password;
            try {
                if (await bcrypt.compare(req.body.password, hashedPassword))
                {
                    // console.log("bcrypt compare success ", process.env.TOKEN_SECRET, ", role ", user.role);
                    // const token = jwt.sign({username:  req.body.username, role: user.role}, process.env.TOKEN_SECRET);
                    // console.log("token received");

                    let uid = uuidv1();
                    foundUser.SessionID.push(uid);
                    foundUser.save();
                    var hmac = crypto.createHmac('sha512', process.env.TOKEN_SECRET);
                    hmac.write(uid);
	                hmac.end()
                    let signedSessionId = hmac.read().toString('hex');
                    res.cookie('username', foundUser.username, { maxAge: 900000, httpOnly: true });
                    res.cookie('Session-id', signedSessionId, { maxAge: 900000, httpOnly: true });
                    return res.redirect('/');
                }
                else
                {
                    res.status(400).send("wrong password or user");
                    console.log("wrong password");
                }
            }
            catch(err)
            {
                res.status(500);
            }
        }
        else
        {
            res.status(400).send('wrong password or user');
            console.log("wrong user");
        }
    })
})

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register', 'register.html'));
})

app.post('/register', async (req, res) => {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        const usr = {
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword,
            role: req.body.role,
            sessionID: []
        };
        const userData = new UserData(usr);
        await userData.save();
        res.redirect("/login");
    }
    catch(err)
    {
        res.status(500).send();
    }
})

app.get('/', (req, res) => {
    res.render('main', {role: req.auth ? req.auth.role: undefined});

})

// dev only
app.get('/userIdentify', (req, res) => {

})

// dev only
app.get('/users', (req, res) => {

})

app.get('/createPost', (req, res) => {
    if (req.auth && req.auth.role === 'admin')
    {
        res.render('PostCreator.ejs', {role: req.auth ? req.auth.role: undefined})
    }
    else
    {
        res.status(403).send('only admin can access the page!')
    }
})

app.get('/articles', (req, res) => {
    let articlesPath = path.join(__dirname, 'public', '_articles');

    promisify(fs.readdir)(articlesPath)
        .catch((err) => {console.log(err); res.status(500).send('cannot get the list of articles');})
        .then ( (directoryContent) => 
        {
            let articleData = [];
            
            for (let i = 0; i < directoryContent.length; ++i)
            {
                let subDir = path.join(articlesPath, directoryContent[i]);
                let indexFile = path.join(subDir, 'index.html');
                if (fs.statSync(subDir).isDirectory() && fs.existsSync(indexFile) && fs.statSync(indexFile).isFile())
                {
                    try {
                        let metadata = fs.readFileSync(path.join(subDir, 'metadata.json'));
                        let publisher = JSON.parse(metadata).owner;
                        articleData.push({
                            directoryName: directoryContent[i],
                            owner: publisher
                        });
                    }
                    catch (e) {}
                }
            }
            console.log(articleData);
            res.render("ArticleList", {
                articleList: articleData,
                role: req.auth ? req.auth.role: undefined,
                username: req.auth ? req.auth.username: undefined
            });
        });
})

app.get('/articles/view/:requestedResource', (req, res) => {
    let articlePath = path.join(__dirname, 'public', '_articles', req.params.requestedResource);
    promisify(fs.exists)(articlePath)
    .then( (result) => {
        if (result)
        {
            let indexFilename = path.join(articlePath, 'index.html');
            let metadataFilename = path.join(articlePath, 'metadata.json');
            if (fs.existsSync(indexFilename) && fs.existsSync(metadataFilename))
            {
                fs.readFile(metadataFilename, (err, fileContent) => {
                    if (err)
                    {
                        res.status(404).send("can't read metadata file, error: " + err);
                    }
                    else
                    {
                        let metadata = JSON.parse(fileContent);
                        res.render("showArticle", {
                            fullArticlePath: articlePath,
                            articleDirname: req.params.requestedResource,
                            articleOwner: metadata.owner,
                            articleName: metadata.articleName,
                            role: req.auth ? req.auth.role: undefined,
                            username:  req.auth ? req.auth.username: undefined
                        });
                    }
                })
            }
            else {
                res.status(404).send("can't read index or metadata file");
            }
        }
    })
    .catch((err) => {
        res.status(404).send("no article available");
    });
})

app.get('/articles/edit/:requestedResource', (req, res) => {
    if (req.params.requestedResource.indexOf('.') === -1 && req.auth && req.auth.username)
    {
        console.log("get /articles/edit/" + req.params.requestedResource);
        let articlePath = path.join(__dirname, 'public', '_articles', req.params.requestedResource);
        console.log(articlePath);
        promisify(fs.exists)(articlePath)
        .then( (result) => {
            console.log("fs.exists", result);
            if (result)
            {
                let indexFilename    = path.join(articlePath, 'index.html');
                let markdownFilename = path.join(articlePath, 'index.md');
                let metadataFilename = path.join(articlePath, 'metadata.json');

                let indexFilenameExists = fs.existsSync(indexFilename);
                let markdownFilenameExists = fs.existsSync(markdownFilename);
                let metadataFilenameExists = fs.existsSync(metadataFilename);
                if (indexFilenameExists && markdownFilenameExists && metadataFilenameExists)
                {
                    fs.readFile(metadataFilename, (err, fileContent) => {
                        if (fileContent)
                        {
                            console.log('metadataFilename read!!')
                            try
                            {
                                let metadata = JSON.parse(fileContent);
                                if ((metadata.owner === req.auth.username || req.auth.role === 'admin') && metadata.articleName)
                                {
                                    
                                    if (fs.existsSync(markdownFilename)) {
                                        let mdContent = fs.readFileSync(markdownFilename);
                                        res.render('PostEditor', {
                                            markdownContent: mdContent,
                                            owner: metadata.owner,
                                            article_name: metadata.articleName,
                                            username: req.auth.username,
                                            role: req.auth.role,
                                        })
                                    }
                                    else
                                    {
                                        res.status(500).send("no markdown file of the article!");
                                    }
                                }
                                else {
                                    res.status(403).send("you are not an owner");
                                }
                            }
                            catch (e)
                            {
                                res.status(500).send("internal error: " + e);
                            }
                        } 
                    });
                }
                else 
                {
                    let errorDescription = req.params.requestedResource + " article lacks the following files: " 
                        + (indexFilenameExists ? "": ('index.html '))
                        + (markdownFilenameExists ? "": ('index.md '))
                        + (metadataFilenameExists ? "": ('metadata.json '));

                    res.status(500).send(errorDescription);
                }
            }
        })
        .catch((err) => {
            res.status(404).send("no article available");
        });
    }
    else
    {
        res.status(403).send("please log in to edit the article");
    }
})

app.get('/check', (req, res) => {
    res.sendFile(path.join(__dirname, 'checker.html'));
})

app.get('/api/createPost', (req, res) => {
    res.status(200);
})

app.post('/api/image', upload.single('imageFile'), (req, res) => {
    console.log('/api/image');
    if (req.auth && req.auth.role === 'admin')
    {
        console.log("save directory to ", storeDir);
        let destination = path.join(storeDir, req.files.image.originalFilename);
        promisify(fs.exists)(destination)
            .then ( (result) => {
            if (!result)
            {
                fs.rename(req.files.image.path, destination);
                res.status(201).end();
            }
            else {
                res.status(200).end();
            }
        }).catch( (err) => {
            res.status(500).end();
        })
    }
    else {
        console.log("aeeror pushing image");
        res.status(401).end();
    }
})

app.post('/api/createPostStart', (req, res) => {
    if (req.auth && req.auth.role === 'admin')
    {
        console.log('call /api/createPostStart');
        let dirName = req.body.article_name.split(' ').join('_');
        storeDir = path.join(__dirname, 'public', '_articles', dirName);

        if (!fs.existsSync(storeDir))
        {
            fs.mkdir( storeDir, (err) => {
                if (err)
                {
                    res.status(500).end();
                    console.log("error creating directory")
                }
                else
                {
                    let metadataPath = path.join(storeDir, 'metadata.json');
                    let f = fs.createWriteStream(metadataPath);
                    let metadata = JSON.stringify(
                        {
                            articleName: req.body.article_name,
                            user: req.auth.username,
                            owner: req.auth.username,
                        }
                    );
                    let writePromise = promisify(f.write.bind(f))(metadata);
                    writePromise.catch( err => { console.log('metadata.json write error: ', err) ; res.status(500).end();} )
                                .then( () => { console.log('written', metadata); res.status(201).end();})
                }
            });
        }
        else
        {
            // has metadata changed???
            res.status(200).end();
        }
    }
    else
    {
        res.status(401).end();
    }

})

app.post('/api/createPostEnd', (req, res) => {
    if (req.auth && req.auth.role === 'admin')
    {
        let dirName = req.body.article_name.split(' ').join('_');
        
        {
            
            let f = fs.createWriteStream(path.join(storeDir, 'index.html'));
            let preprocessed = MarkdownPreprocess.preprocessHtmlImageTag(req.body.article_content, dirName);
            f.write(preprocessed, {flags: 'w'});
        }

        {
            let preprocessed = MarkdownPreprocess.preprocessMarkdown(req.body.markdown_content, dirName);
            let f = fs.createWriteStream(path.join(storeDir, 'index.md'));
            f.write(preprocessed, {flags: 'w'});
        }

        res.redirect('/articles');
    }
    else{
        res.status(401).end();
    }
})

app.get('/CV', (req, res) => {
    res.render('CV', {
        role: req.auth ? req.auth.role: undefined,
        title: "Andrii Dubas' CV"
    })
})

app.get('/CV_pdf', (req, res) => {
    let html = res.render('CV_pdf');

})

let articlesPath = path.join(__dirname, 'public', '_articles')

if (!fs.existsSync(articlesPath))
{
    fs.mkdirSync(articlesPath)
}

module.exports = (configuration) => {
    let dbAddress = configuration.db.address;
    mongoose.connect(dbAddress, { useNewUrlParser: true,  useUnifiedTopology: true }, (err) =>
        {
            if (configuration.mode === 'test') { 
                mongoose.connection.db.dropDatabase();
            }

            for (let user of configuration.db.predefined_users)
            {
                let encryptedPassword;
                if (user.decryptedPassword) // for debugging
                {
                    encryptedPassword = bcrypt.hashSync(user.decryptedPassword, 10);
                }
                else
                {
                    encryptedPassword = user.encryptedPassword;
                }
                console.log(encryptedPassword);

                user.password = encryptedPassword;
                user.SessionID = [];
                user.email = "email@email.com";

                let dbUser = new UserData(user);
                dbUser.save({}, (err, product) => {if (err) {console.log('error saving user')}});
                
                UserData.find({}, (err, res) => {});
            }
        });
        
        return { app, mongoose};
}