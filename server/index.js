const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const model = require('./model');
const db = require('./dbHelpers');
const connection = require('./db-mysql');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const KEYS = require('../env/KEYS.js');
const fileUpload = require('express-fileupload');
const app = express();
const cloudinary = require('cloudinary');
const cloudConfig = require('../env/cloudKey.js');
const path = require('path');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
//Google cloud vision setup:
const gVision = require('./api/vision.js');
//
var localStorage = {};

app.use( bodyParser.json() );
app.use(cors());
app.use(express.static(__dirname + '/../public/dist'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(fileUpload());

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('express-session')({
  secret: KEYS.sessionAuth.sessionSecret,
  resave: true,
  saveUninitialized: true
}));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

passport.use(new FacebookStrategy({
  clientID: KEYS.facebookAuth.clientID,
  clientSecret: KEYS.facebookAuth.clientSecret,
  callbackURL: 'http://localhost:3000/auth/facebook/callback',
  profileFields: ['id', 'email', 'displayName', 'gender', 'link', 'locale', 'name', 'timezone', 'updated_time', 'verified'],
},

  function(accessToken, refreshToken, profile, cb) {
    process.nextTick(function () {
      let userInfo = {
        name: profile._json.name,
        fb_id: profile._json.id,
        token: accessToken,
        email: profile._json.email
      };
      db.createNewUser(userInfo);
      return cb(null, userInfo);
    });
  }
));

// route middleware to make sure a user is logged in
checkAuthentication = (req, res, next) => {
  if (req.isAuthenticated()) {
    //if user is loged in, req.isAuthenticated() will return true
    next();
  } else {
    res.redirect('/login');
  }
};

authHelper = (req, res, next) => {
  localStorage.isAuthenitcated = req.isAuthenticated();
  localStorage.user = req.user;
  next();
};

// route for facebook authentication and login
app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ['email']}));

// handle the callback after facebook has authenticated the user
app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });

app.get('/newUser', db.createNewUser);
app.get('/newTrip', db.createNewTrip);
app.get('/addMembersToTrip', db.addMembersToTrip);
app.get('/addReceipt', db.addReceipt);
app.get('/storeItems', db.storeReceiptItems);
app.get('/assignItems', db.assignItemsToMembers);

app.get('/login', authHelper, (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect('/');
  } else {
    res.sendFile(path.resolve(__dirname, '..', 'public', 'dist', 'index.html'));
  }
});

app.get('/logout', authHelper, function(req, res) {
  req.logout();
  res.redirect('/');
});

app.get('/verify', authHelper, function(req, res) {
  let isAuthenticated = req.isAuthenticated() ? true : false;
  res.send(req.isAuthenticated());
});

app.get('*', checkAuthentication, authHelper, (req, res) => {
  if (!req.user) {
    res.redirect('/login');
  } else {
    res.sendFile(path.resolve(__dirname, '..', 'public', 'dist', 'index.html'));
  }
});

app.get('/testing', function(req, res) {
  res.send('hello world');
  console.log('req.cookies is ========', req.cookies);
  console.log('req.session is ========', req.session);
  console.log('req.session.user is ========', req.session.user);
});

//To be used for testing and seeing requests
app.post('/createTripName', function(req, res) {
  //With the received request, use model function to submit the tripname to the database

  let params = [
    req.body.submittedTripName,
    req.body.submittedTripDesc,
    localStorage.user.fb_id
  ];

  db.createNewTrip(params);
  res.redirect('/upload-receipt');
});

app.post('/upload', function(req, res) {
  //req.body should include receipt name, total, receipt_link;
  //should be an insert query
  console.log('body',req.body)
  if (!req.files) {
    return res.status(400).send('No files were uploaded.');
  }
  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  let sampleFile = req.files.sampleFile;
  console.log(sampleFile);
  // Use the mv() method to place the file somewhere on your server
  sampleFile.mv(__dirname + '/temp/filename.jpg', function(err) {
    if (err) {
      return res.status(500).send(err);
    }
    let image = __dirname + '/temp/filename.jpg'; 
    gVision.promisifiedDetectText(image)
    .then(function(results) {
      let allItems = results[0];
      uploadCloud();
      res.send(gVision.spliceReceipt(allItems.split('\n')));
    })
    .error(function(e) {
      console.log('Error received in appPost, promisifiedDetectText:', e);
    });
  });
});

app.post('/upload/delete', function(req, res) {
  //req.body should include receipt name, total, receipt_link;
  //should be a delete query
});

let uploadCloud = () => {
  cloudinary.uploader.upload(__dirname + '/temp/filename.jpg', function(data) {
      // var params = [1, 1, 1, 'cat', results.url, 150, 10, 15];
      // db.addReceipt(params, function(err, data) {
      //   console.log(data);
      //   res.send('File uploaded!');
      // });
      console.log('+++++++++',data);
  });
}

app.post('/fake', function(req,res) {
  cloudinary.uploader.upload(__dirname + '/temp/filename.jpg', function(data) {
      // var params = [1, 1, 1, 'cat', results.url, 150, 10, 15];
      // db.addReceipt(params, function(err, data) {
      //   console.log(data);
      //   res.send('File uploaded!');
      // });

      res.send(data);
      console.log('+++++++++',data);
  });
})
//gVision.spliceReceipt produces an object of item : price pairs
app.post('/vision', function(req, res) {
  let image = req.body.receipt || __dirname + '/api/testReceipts/test3.jpg'; 
  gVision.promisifiedDetectText(image)
  .then(function(results) {
    let allItems = results[0];
    fs.writeFileAsync('server/api/testResults/test3.js', JSON.stringify(gVision.spliceReceipt(allItems.split('\n'))));
    res.send(gVision.spliceReceipt(allItems.split('\n')));
    // console.log('Successfully created /test.js with:', gVision.spliceReceipt(allItems.split('\n')));
  })
  .error(function(e) {
    console.log('Error received in appPost, promisifiedDetectText:', e);
  });
});


app.listen(3000, function() {
  console.log('listening on port 3000!');
});
