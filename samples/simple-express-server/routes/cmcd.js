const express = require('express');
const router = express.Router();


router.post('/', function (req, res) {
    res.status(200).send('OK')
});

router.post('/response-received', function (req, res) {
    res.status(200).send('response-received')
});

router.post('/event-mode', function (req, res) {
    res.status(200).send('event-mode')
});

router.post('/vent-body-mode', function (req, res) {
    res.status(200).send('event-body-mode')
});


module.exports = router;
