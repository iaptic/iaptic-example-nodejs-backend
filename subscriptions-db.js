
/**
 * @typedef {Object} Subscription
 * @property {string} username
 * @property {string} expirationDate - Expiry date, ISO8601 formatted
 * @property {Object} purchase - Information about the user's purchases status, as provided by iaptic
 */

const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('subscriptions.db');
db.run('CREATE TABLE IF NOT EXISTS subscriptions (username TEXT PRIMARY KEY, expirationDate TEXT, purchase TEXT)');

/**
 * Update the user's subscription
 *
 * @param subscription {Subscription}
 */
function update(username, purchase) {
    const expirationDate = purchase ? purchase.expirationDate : null;
    const purchaseJSON = purchase ? JSON.stringify(purchase) : null;
    db.run('INSERT INTO subscriptions VALUES (?, ?, ?) ON CONFLICT(username) DO UPDATE SET expirationDate = ?, purchase = ?',
        username,
        expirationDate,
        purchaseJSON,
        expirationDate,
        purchaseJSON,
    );
}

/** Fetch the user's subscription, if any */
function fetch(username, callback) {

    db.each('SELECT * FROM subscriptions WHERE username = ?', username, (err, row) => {
        if (!callback) return;
        if (err) {
            callback(err);
            callback = null;
        }
        else {
            callback(null, {
                username: row.username,
                expirationDate: row.expirationDate,
                purchase: row.purchase ? JSON.parse(row.purchase) : null,
            });
            callback = null;
        }
    }, () => {
        if (!callback) return;
        callback(null, {username, purchase: null, expirationDate: null});
    });
}

module.exports = {update, fetch}
