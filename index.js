const {app, mongoose} = require('./server/server')(
    {
        db: {
            address: 'mongodb://localhost/db',
            predefined_users: [
                
                {
                    username: 'admin',
                    encryptedPassword: '$2b$10$P06V61cbJDisNKizTM.yR.HFuvyg/1dX1yJtg.JRW4F40o5SosmQu',
                    role: 'admin'
                }
                
            ]
        }
    }
)

let port = process.env.PORT || 8002;
app.listen(port)