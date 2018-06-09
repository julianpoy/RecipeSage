var mongoose = require('mongoose');
var crypto = require('crypto');
var Schema = mongoose.Schema;

var currentPasswordVersion = 2;

var User = new Schema({
  name: {
    type: String
  },
  email: {
    type: String
  },
  password: {
    type: String
  },
  salt: {
    type: String
  },
  passwordVersion: {
    type: String,
    default: currentPasswordVersion
  },
  created: {
    type: Date,
    default: Date.now
  },
  updated: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  fcmTokens: [{
    type: String
  }]
});

User.statics.generateHashedPassword = function(password, cb) {
  var salt = crypto.randomBytes(128).toString('base64');
  var hash = crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512').toString('base64');

  cb({
    hash: hash,
    salt: salt,
    version: currentPasswordVersion
  });
};

User.statics.validateHashedPassword = function(password, hash, salt, version, cb) {
  switch(version) {
    case "1":
      var comp = crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512');
      cb(comp == hash);
      break;
    case "2":
      var comp = crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512').toString('base64');
      cb(comp == hash);
      break;
  }
};

User.statics.login = function(email, password, cb) {
  this.model('User').findOne({
    email: email.toLowerCase()
  }).exec(function(err, user) {
    if (err) {
      cb(err);
    } else if (!user) {
      cb();
    } else {
      user.validatePassword(password, function(err, valid) {
        if (err) {
          cb(err);
        } else if (!valid) {
          cb();
        } else {
          
        }
      });
    }
  });
}

User.methods.updatePassword = function(password, cb) {
  var me = this;
  this.model('User').generateHashedPassword(password, function(data) {
    me.password = data.hash;
    me.salt = data.salt;
    me.passwordVersion = data.version;
    me.updated = Date.now();
    
    me.save(cb);
  });
}

User.methods.validatePassword = function(password, cb) {
  var me = this;
  this.model('User').validateHashedPassword(password, this.password, this.salt, this.passwordVersion, function(passwordIsValid) {
    // Don't update if password isn't valid, or password is of current version
    if (!passwordIsValid || me.passwordVersion == currentPasswordVersion) {
      cb(null, passwordIsValid);
      return;
    }

    User.methods.updatePassword.call(me, password, function(err, user) {
      cb(err, passwordIsValid);
    });
  });
};


mongoose.model('User', User);
