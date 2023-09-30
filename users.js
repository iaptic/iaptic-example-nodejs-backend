const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('sessions.db');

db.run('CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, username TEXT)');

function userLogin(username) {
    const token = generateToken();
    db.run('INSERT INTO sessions VALUES (?, ?)', token, username);
    return token;
}

function userSession(token, callback) {

    db.each('SELECT * FROM sessions WHERE token = (?)', token, (err, row) => {
        if (!callback) return;
        if (err) {
            callback(err);
            callback = null;
        }
        else {
            callback(null, row);
            callback = null;
        }
    }, () => {
        if (!callback) return;
        callback(new Error('UserNotFound'));
    });
}

function generateToken() {
    return '' + Math.round(9999999 * Math.random());
}

module.exports = {userLogin, userSession}