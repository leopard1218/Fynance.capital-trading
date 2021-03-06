const User = require('./user.model');
const crypto = require('crypto');
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const FRONTEND_URL = 'https://fynance.capital'
// const jwtSecret = 'abc123'
require('dotenv').config()
const jwtSecret = process.env.JWT_SECRET;
// const mailgun = require('mailgun-js')({ apiKey: 'd560ceed36a73261abb532e4e047322a-10eedde5-35c14a1e',
//   domain: 'sandbox35ed4aa6ac36478aab8c2299326a8b94.mailgun.org' });

// // Create and export function to send emails through Mailgun API

//   const data = {
//     from: 'pr@fynance.capital',
//     to: 'snowleopards1218@gmail.com',
//     subject: 'message.subject',
//     text: 'message.text'
//   };

//   mailgun.messages().send(data, (error, body) => {
//     console.log('ddd');
//      console.log("body:", body);
//      console.log('error:', error);
//   })
// const sgMail = require('@sendgrid/mail')

function load(req, res, next, id) {
  User.get(id)
    .then((user) => {
      req.user = user; // eslint-disable-line no-param-reassign
      return next();
    })
    .catch(e => next(e));
}

/**
 * Get user
 * @returns {User}
 */
async function get(req, res) {
  const userId = req.params.userId;
  const user = await User.findById(userId)
  return res.json(user.toAuthJSON());
}

/**
 * Create new user
 * @returns {User}
 */
async function register(req, res, next) {
  const verificationCode = crypto.randomBytes(30).toString('hex');
  const { firstName, lastName, email, birthday, password } = req.body
  let user = await User.findOne({ email })
  if (user) {
    return res.json({
      error: 'User Already Exists'
    })
  }
  user = new User({
    firstName,
    lastName,
    email,
    birthday,
    password,
    verificationCode,
    activated: true
  });
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);
  user.save()
    .then(usr => {
      const mailOptions = {
        from: 'btcbetting.herokuapp.com/',
        to: email,
        subject: 'Trading Platform Signup Success',
        text: `<div>Congratulations. You have signed up to our trading platform.<br/>You can now enjoy trading.<br/>Please verify your email.</div><a href='${FRONTEND_URL}/verification/${verificationCode}'>Verify Email</a>`,
        html: `<div>Congratulations. You have signed up to our trading platform.<br/>You can now enjoy trading.<br/>Please verify your email.</div><a href='${FRONTEND_URL}/verification/${verificationCode}'>Verify Email</a>`,
      };
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        name: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.email,
          pass: process.env.pass
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
      transporter.verify((err, success) => {
        if (err) {
          console.log(err);
        } else {
          console.log("Server is ready to take our message");
        }
      });
      transporter.sendMail(mailOptions, res => console.log(res))

      res.json(usr.toAuthJSON())
    })
    .catch(e => {
      console.log("failed register")
      return next(e)
    });
}

/**
 * Update existing user
 * @property {string} req.body.username - The username of user.
 * @property {string} req.body.mobileNumber - The mobileNumber of user.
 * @returns {User}
 */
async function update(req, res) {
  const { firstName, lastName, birthday, password, currentPassword } = req.body;
  const { userId } = req.params;
  console.log(currentPassword)
  if (currentPassword) {
    console.log(currentPassword)
    User.findById(userId)
      .then(user => {
        const validUser = bcrypt.compare(currentPassword, user.password)
          .then(validUser => {
            if (!validUser) {
              return res.json({ error: 'Password incorrect' });
            }
            bcrypt.genSalt(10).then(salt => {
              user.password = bcrypt.hash(password, salt).then(password => {
                user.password = password;
                user.save()
                  .then(updateUser => {
                    res.json('successfully updated')
                  })
              })

            })

          })
      })
      .catch((e) => next(e));
  } else {
    console.log(currentPassword)
    const user = await User.findById(userId)
    user.firstName = firstName;
    user.lastName = lastName;
    user.birthday = birthday;
    const updateUser = await user.save()
    const updateUserId = updateUser.id;
    const updateUserFirstName = updateUser.firstName;
    const updateUserLastName = updateUser.lastName;
    const updateUserBirthday = updateUser.birthday;
    const updateUserEmail = updateUser.email;
    // In jwt.sign set the data that you want to get
    const token = await jwt.sign({
      id: updateUserId,
      firstName: updateUserFirstName,
      lastName: updateUserLastName,
      email: updateUserEmail,
      birthday: updateUserBirthday
    }, jwtSecret, { expiresIn: 3600 });
    const bearerToken = `Bearer ${token}`;
    res.json({ token: bearerToken });
  }

}

/**
 * Get user list.
 * @property {number} req.query.skip - Number of users to be skipped.
 * @property {number} req.query.limit - Limit number of users to be returned.
 * @returns {User[]}
 */
function list(req, res, next) {
  const { limit = 50, skip = 0 } = req.query;
  User.list({ limit, skip })
    .then(users => res.json(users))
    .catch(e => next(e));
}

/**
 * Delete user.
 * @returns {User}
 */
function remove(req, res, next) {
  const user = req.user;
  user.remove()
    .then(deletedUser => res.json(deletedUser))
    .catch(e => next(e));
}

/**
 * Login user.
 * @returns {User}
 */

module.exports = { load, get, register, update, list, remove };
