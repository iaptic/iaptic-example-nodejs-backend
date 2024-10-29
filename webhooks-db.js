/**
 * WebhooksDB to track webhook information for users.
 */

const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('webhooks.db');

db.run(`CREATE TABLE IF NOT EXISTS webhooks (
    username TEXT PRIMARY KEY,
    last_webhook_date TEXT,
    wait_start_date TEXT,
    wait_end_date TEXT
)`);

/**
 * Update webhook information for a user
 * @param {string} username - The user's identifier
 * @param {Object} data - Object containing webhook data
 * @param {string} [data.lastWebhookDate] - ISO8601 formatted date string of the last received webhook
 * @param {string} [data.waitStartDate] - ISO8601 formatted date string for when to start waiting
 * @param {string} [data.waitEndDate] - ISO8601 formatted date string for when to stop waiting
 */
function updateWebhookInfo(username, data) {
    const { lastWebhookDate, waitStartDate, waitEndDate } = data;
    db.run(`INSERT OR REPLACE INTO webhooks 
        (username, last_webhook_date, wait_start_date, wait_end_date) 
        VALUES (?, 
            COALESCE(?, (SELECT last_webhook_date FROM webhooks WHERE username = ?)),
            COALESCE(?, (SELECT wait_start_date FROM webhooks WHERE username = ?)),
            COALESCE(?, (SELECT wait_end_date FROM webhooks WHERE username = ?))
        )`,
        username, 
        lastWebhookDate, username,
        waitStartDate, username,
        waitEndDate, username
    );
}

/**
 * Get webhook information for a user
 * @param {string} username - The user's identifier
 * @param {function} callback - Callback function(err, webhookInfo)
 */
function getWebhookInfo(username, callback) {
    db.get('SELECT * FROM webhooks WHERE username = ?', 
        [username],
        (err, row) => {
            if (err) {
                callback(err, null);
            } else {
                callback(null, row || {});
            }
        }
    );
}

/**
 * Check if a user is waiting for a webhook
 * @param {string} username - The user's identifier
 * @param {function} callback - Callback function(err, isWaiting)
 *
function isWaitingForWebhook(username, callback) {
    const now = new Date().toISOString();
    db.get('SELECT * FROM webhooks WHERE username = ? AND wait_start_date <= ? AND wait_end_date > ?', 
        [username, now, now],
        (err, row) => {
            if (err) {
                callback(err, false);
            } else {
                callback(null, !!row);
            }
        }
    );
}
*/

/**
 * Clean up expired webhook waits
 */
function cleanupExpiredWaits() {
    const now = new Date().toISOString();
    db.run('UPDATE webhooks SET wait_start_date = NULL, wait_end_date = NULL WHERE wait_end_date <= ?', now);
}

// Run cleanup periodically (e.g., every hour)
setInterval(cleanupExpiredWaits, 60 * 60 * 1000);

module.exports = {
    updateWebhookInfo,
    getWebhookInfo
};