const {app, mongoose} = require('./server/server')(
    {
        db: {
            address: 'mongodb://localhost/db',
            predefined_users: [
                
                {
                    username: 'admin',
                    password: 'password',
                    role: 'admin'
                }
                
            ]
        }
    }
)

let port = process.env.PORT || 8002;
app.listen(port)