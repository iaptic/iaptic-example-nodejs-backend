/**
 * Unsafe user session.
 */

const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('sessions.db');
db.run('CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, username TEXT)');

/** Who needs passwords, let the user login with just a username, return an authentication token */
function login(username) {
    const token = generateToken();
    db.run('INSERT INTO sessions VALUES (?, ?)', token, username);
    return token;
}

/** Restore the user sessio from the authentication token */
function fromToken(token, callback) {

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
        callback(new Error('NotFound'));
    });
}

/** Generate a random token */
function generateToken() {
    return '' + Math.round(9999999 * Math.random());
}

module.exports = {login, fromToken}