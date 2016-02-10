var express = require('express');
var util = require('./lib/utility'); // isValidUrl and getUrlTitle functions
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var bcrypt = require('bcrypt');

var db = require('./app/config'); // bookshelf/knex stuff, schemas for urls table and clicks table
var Users = require('./app/collections/users'); // Users = new db.Collection(); Users.model = User. db is same as in here.
var User = require('./app/models/user'); // User = db.Model.extend({});
var Links = require('./app/collections/links'); // Links = new db.Collection(); Links.model = Link;
var Link = require('./app/models/link'); // Link = db.Model.extend({...}); tableName: 'urls'
var Click = require('./app/models/click'); // Click = db.Model.extend({...}); tableName: 'clicks'

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(session({
  secret: 'trash cat',
  resave: false,
  saveUninitialized: false
}));

app.get('/login',
function(req, res) {
  res.render('login');
});

app.get('/signup',
function(req, res) {
  res.render('signup');
});

app.get('/',
function(req, res) {
  if (req.session === undefined || req.session.username === undefined) {
    res.redirect('/login');
  } else {
    res.render('index');
  }
});

app.get('/create',
function(req, res) {
  if (req.session === undefined || req.session.username === undefined) {
    res.redirect('/login');
  } else {
    res.render('index');
  }
});

app.get('/links',
function(req, res) {
  if (req.session === undefined || req.session.username === undefined) {
    res.redirect('/login');
  } else {
    User.query('where', 'username', '=', req.session.username).fetch().then(function(model) {
      var userId = model.attributes.id;

      Links.query('where', 'userId', '=', userId).fetch().then(function (links) {
        console.log("links are:", links);
        res.send(200, links.models);
      });
      // Links.reset().fetch().then(function(links) {
      // });
    });
  }
});

app.post('/signup', function(req, res){
  var username = req.body.username;
  var password = req.body.password;
  bcrypt.hash(password, 8, function (err, hash) {
    if (err) {
      console.log("error in bcrypt.hash:", err);
    } else {
      Users.create({
        username: username,
        password: hash
      })
      .then(function(newUser) {
        req.session.username = username;
        res.redirect('/');
      });
    }
  });
});

app.post('/login', function(req, res){
  var username = req.body.username;
  var password = req.body.password;

  User.query('where', 'username', '=', username).fetch().then(function(model) {
    if (!model) {
      console.log('Invalid login');
      res.redirect('/login');
    } else {
      var hashedPassword = model.attributes.password;
      bcrypt.compare(password, hashedPassword, function (err, result) {
        if (err) {
          console.log("error in bcrypt.compare:", err);
        } else if (result) {
          req.session.username = username;
          res.redirect('/');
        } else {
          console.log('Invalid login');
          res.redirect('/login');
        }
      });
    }
  });
});

app.post('/logout', function(req, res){
  req.session.username = undefined;
  res.redirect('/login');
});

app.post('/links',
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        User.query('where', 'username', '=', req.session.username).fetch().then(function(model) {
          console.log("model is:", model);
          console.log("userId is:", model.attributes.id);
          var userId = model.attributes.id;
          Links.create({
            url: uri,
            title: title,
            baseUrl: req.headers.origin,
            userId: userId
          })
          .then(function(newLink) {
            res.send(200, newLink);
          });
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
