const bodyParser = require('body-parser');
const express    = require('express');
const users = require('./users');
 
const router = express.Router();
router.get('/', (req, res, next) => {
    res.json({ok: true});
});

router.post('/login', (req, res, next) => {
    const token = users.userLogin(req.query['username']);
    res.json({token});
});

router.get('/me/:token', (req, res, next) => {
    users.userSession(req.params.token, (err, user) => {
        res.json(err ? {error: err.message} : user);
    })
});

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/', router);
module.exports = app;
