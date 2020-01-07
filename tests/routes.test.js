const request = require('supertest');
const {app, mongoose} = require('../server/server')(
    {
        db: {
            address: 'mongodb://localhost/db_test',
            predefined_users: [
                {
                    username: 'testadmin',
                    password: 'admin_password',
                    role: 'admin',
                },
                {
                    username: 'testuser',
                    password: 'user_password',
                    role: 'user',
                }
            ]
        }
    }
)
const cookieParser = require('cookie-parser');
var session = require('supertest-session');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

app.use(cookieParser());

const deleteFolderRecursive = async path =>  {
    if (fs.existsSync(path)) {
        for (let entry of fs.readdirSync(path)) {
            const curPath = path + "/" + entry;
            if ((fs.lstatSync(curPath)).isDirectory())
                await deleteFolderRecursive(curPath);
            else fs.unlinkSync(curPath);
        }
        fs.rmdirSync(path);
    }
};




describe('GET /', function () {
  it('get main', (done) => {
      request(app)
          .get('/')
          .expect(200)
          .end( 
              function(err, res){
                  if (err) done(err);
                  else done();
              });
  });
});


describe('POST /login', function () {
  it('successful login', async () => {
      await request(app)
          .post('/login')
          .field('username', 'testadmin')
          .field('password', 'admin_password')
          .redirects('/')
          .expect(200)
          
          /*
          .end( 
              function(err, res){
                  if (err) done(err);
                  else done();
              });
            */
  });
});


describe('POST unsuccessfull /login', function () {
  it('unsuccessful login', (done) => {
      request(app)
          .post('/login')
          .field('username', 'adubas')
          .field('password', '123445') // wrong password
          .redirects('/')
          .expect(400)
          .end( 
              function(err, res){
                  if (err) done(err);
                  else done();
              });
  });
});


describe('create post check authenticated & authorized', function () {

    var authenticatedSession;
    it('login admin', (done) => {
        testSession.post('/login')
            .send({ username: 'testadmin', password: 'admin_password' })
            .expect(302)
            .end(
                (err, res) => {
                    if (err) return done(err);
                    authenticatedSession = testSession;
                    done();
                }
            )
    });

    it('post begin article', (done) => {
        let anArticlePath = path.join(__dirname, '../server/public/_articles/an_article');
        deleteFolderRecursive(anArticlePath);;
        authenticatedSession
            .post('/api/createPostStart')
            .field('article_name', 'an article')
            .expect(201)
            .end( 
                function(err, res){
                    if (err) done(err);
                    else done();
                });
    });

    it('post an image', (done) => {
        authenticatedSession
            .post('/api/image')
            .attach('image', './tests/a_pic.jpg')
            .expect(201)
            .end( 
                function(err, res){
                    if (err) done(err);
                    else done();
                });
    });

    it('/api/createPostEnd', (done) => {
        authenticatedSession
            .post('/api/createPostEnd')
            .attach('image', './tests/a_pic.jpg')
            .field('article_name', 'an article')
            .field('article_content', 'this is an article with a pic <img src="a_pic.jpg">')
            .field('markdown_content', 'this is an article with a pic !["/_article/an_article/a_pic.jpg]">')
            .redirects('/')
            .end( 
                function(err, res){
                    if (err) done(err);
                    else done();
                });
    });
    
    it('/articles/an_article', (done) => {
        authenticatedSession
            .get('/articles/view/an_article')
            .expect(200)
            .expect(function(res) {
                assert(
                    res.text.includes('<img src="/_articles/an_article/a_pic.jpg">')
                );
              })
            .end( 
                function(err, res){
                    if (err) done(err);
                    else done();
                });
    });
});


describe('create post check authenticated but not authorized', function () {

    var authenticatedSession;

    it('create post check authenticated but not authorized', async () => {

        testSession.post('/login')
            .send({ username: 'testuser', password: 'user_password' })
            .expect(302)
            authenticatedSession = testSession;
    });

    it('post begin article', (done) => {
        let anArticlePath = path.join(__dirname, '../server/public/_articles/an_article');
        deleteFolderRecursive(anArticlePath);
        authenticatedSession
            .post('/api/createPostStart')
            .field('article_name', 'an article')
            .expect(401)
            .end( 
                function(err, res){
                    if (err) done(err);
                    else done();
                });
    });

    it('post an image', (done) => {
        authenticatedSession
            .post('/api/image')
            .attach('image', './tests/a_pic.jpg')
            .expect(401)
            .end( 
                function(err, res){
                    if (err) done(err);
                    else done();
                });
    });
});


  


let testSession = null;
before(
    () => {
        server = app.listen(5000);
    }
)

after(
    () => {
        server.close();
        mongoose.connection.close();
    }
)

beforeEach(
    () => {
        testSession = session(server);
    }
)