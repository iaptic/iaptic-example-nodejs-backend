const bodyParser = require('body-parser');
const express    = require('express');
const cors = require('cors');
const sessionsDB = require('./sessions-db');
const subscriptionsDB = require('./subscriptions-db');
const verboseLogger = require('./verboseLogger');
const webhooksDB = require('./webhooks-db');

const router = express.Router();
router.get('/', (req, res, next) => {
    res.json({ok: true});
});

/**
 * Opens a session for the user.
 *
 * Pass in the username as JSON in the body.
 * Password is not required, as this is just a demo.
 */
router.post('/login', (req, res, next) => {
    const username = req.body.username;
    console.log('POST /login: ' + username);
    if (!username) return res.json({error: 'BadRequest'});
    const token = sessionsDB.login(username);
    res.json({token});
});

/**
 * Load user information from a session token passed as a query parameter.
 *
 * User object is stored in `req.user`
 */
function fetchUser(req, res, next) {
    const token = req.query['token'];
    if (!token) return res.json({error: 'BadRequest'});
    sessionsDB.fromToken(token, (err, user) => {
        if (err)
            return res.json({error: err.message});
        subscriptionsDB.fetch(user.username, (err, subscription) => {
            if (err)
                return res.json({error: err.message});
            user.subscription = subscription;
            const expirationDate = user.subscription.expirationDate;
            if (expirationDate) {
                user.subscription.isExpired = expirationDate < new Date().toISOString();
                user.subscription.isActive = expirationDate > new Date().toISOString();
            }
            else {
                user.subscription.isActive = false;
                user.subscription.isExpired = false;
            }
            req.user = user;
            next();
        });
    });
}

/**
 * Fetch information about the logged-in user.
 *
 * usage: GET /me?token=<value>
 */
router.get('/me', fetchUser, (req, res, next) => {
    console.log('GET /me: ' + req.user.username);
    webhooksDB.getWebhookInfo(req.user.username, (err, webhookInfo) => {
        if (err) {
            console.error('Error getting webhook info:', err);
            webhookInfo = {};
        }
        req.user.webhookInfo = webhookInfo;
        const isWaiting = webhookInfo.wait_start_date && !webhookInfo.last_webhook_date || webhookInfo.last_webhook_date < webhookInfo.wait_start_date || webhookInfo.last_webhook_date > webhookInfo.wait_end_date;
        req.user.isWaitingForWebhook = isWaiting;
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('ETag', Date.now().toString());
        res.set('Last-Modified', new Date().toUTCString());
        res.status(200);
        res.json(req.user);
    });
});

/**
 * Handle webhook calls from iaptic.
 *
 * Store the subscription expiry date, and full information.
 */
router.post('/webhooks/iaptic', (req, res, next) => {
    const body = req.body;
    console.log('POST /webhooks/iaptic: ' + JSON.stringify(body, null, 2));
    if (body.password !== process.env.IAPTIC_PASSWORD) {
        console.log('Webhook request rejected: Invalid password');
        res.status(401);
        res.json({ok: false, error: 'Invalid password'});
        return;
    }
    switch (body.type) {
        case 'TEST':
            res.json({ok: true, result: 'TEST_PASSED'});
            break;
        case 'purchases.updated':
            if (!body.applicationUsername) {
                console.log('Webhook request missing applicationUsername');
                res.status(200);
                res.json({ok: false, error: 'Missing applicationUsername'});
                return;
            }
            // Update the last webhook date for this user
            webhooksDB.updateWebhookInfo(body.applicationUsername, {
                lastWebhookDate: new Date().toISOString()
            });
            const lastPurchase = Object.values(body.purchases).reduce((lastPurchase, purchase) => {
                if (!lastPurchase || purchase.expirationDate > lastPurchase.expirationDate) {
                    return purchase;
                }
                return lastPurchase;
            }, undefined);
            if (!lastPurchase) {
                console.log(`Removing subscription for user ${body.applicationUsername}`);
                subscriptionsDB.remove(body.applicationUsername, (err, wasRemoved) => {
                    res.status(200);
                    res.json({ok: true, result: wasRemoved ? 'REMOVED' : 'NO_SUBSCRIPTION'});
                });
                return;
            }
            console.log(`Updating subscription for user ${body.applicationUsername}`);
            console.log(`Last purchase details: ${JSON.stringify(lastPurchase, null, 2)}`);
            subscriptionsDB.update(body.applicationUsername, lastPurchase);
            
            res.json({ok: true});
            break;
        default:
            console.log(`Webhook request rejected: Unsupported type ${body.type}`);
            res.json({ok: true, result: 'UNSUPPORTED'});
            break;
    }
});

// Add this new endpoint for initiating webhook wait
router.post('/pending-webhooks', fetchUser, (req, res, next) => {
    const username = req.user.username;
    const waitStartDate = new Date(Date.now() - 10 * 1000).toISOString(); // Assume the webbook might have been sent a few seconds ago already
    const waitEndDate = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // Wait for 1 hour

    webhooksDB.updateWebhookInfo(username, { waitStartDate, waitEndDate });
    res.json({ok: true, message: 'Webhook wait initiated'});
});

/**
 * Access public content.
 *
 * usage: GET /content/public/12345
 */
router.get('/content/public/:id', (req, res, next) => {
    console.log('GET /content/public/' + req.params.id);
    res.json({
        title: 'Free Content',
        content: 'This is some public content that everybody can access. 🍫',
    });
});

/**
 * Access content reserved to subscribers.
 *
 * usage: GET /content/protected/12345?token=<value>
 */
router.get('/content/protected/:id', fetchUser, (req, res, next) => {
    console.log('GET /content/protected/' + req.params.id);
    const expirationDate = req.user.subscription ? req.user.subscription.expirationDate : undefined;
    if (!expirationDate || expirationDate < new Date().toISOString())
        return res.json({error: 'NoSubscription'});
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json({
        title: 'Premium Content',
        content: 'This is some information only subscribers can access. 💰',
    });
});

const prefix = process.env.ROUTE_PREFIX || '/demo';
console.log('Using prefix: ' + prefix);
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(verboseLogger); // Add verbose logger middleware
app.use(prefix, router);
module.exports = app;