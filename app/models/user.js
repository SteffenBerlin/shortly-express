var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  // hasTimestamps: true,
  links: function() {
    return this.hasMany(Link);
  }
  // ,
  // initialize: function() {
  //   this.on('creating', function(model, attrs, options) {
  //     var password = model.get("password");
  //     // var pwHash = bcrypt(something something);
  //     model.set('pwHash', pwHash);
  //   });
  // }
});

module.exports = User;