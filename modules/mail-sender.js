const nodemailer = require('nodemailer');
const validator = require('./validator');

const OUR_EMAIL = 'smart.city.lviv@gmail.com';
const TRNASPORT_OPTIONS = {
    service: 'gmail',
    auth: {
        user: OUR_EMAIL,
        pass: process.env.EMAIL_PASSWORD || 'SmartCity2017'
    }
}

function sendEmail(req, res, next) {
    let isEmailBodyValid = validator.isEmailBodyValid(req);
    let transporter = nodemailer.createTransport(TRNASPORT_OPTIONS);
    let emailTo = req.body.email;
    let mailOptions = {
        from: OUR_EMAIL,
        to: emailTo,
        subject: req.body.subject,
        text: req.body.text,
        html: req.body.html
    };    

    if (isEmailBodyValid.error) {
        next(isEmailBodyValid.error);
        return;
    }

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            next(error);
            return;
        }
        res.json({
            message:`Email has been sent to ${emailTo}`,
            info: info
        });
    });    
}

module.exports = {
    sendEmail
}

