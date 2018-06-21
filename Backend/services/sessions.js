var mongoose = require('mongoose'),
    crypto = require('crypto'),
    Session = mongoose.model('Session'),
    moment = require('moment'),
    Raven = require('raven');

var SESSION_VALIDITY_LENGTH = 7; // Initial session validity time
var SET_GRACE_WHEN = 5; // Set token expiry equal to grace period if session will expire in X days
var SESSION_GRACE_PERIOD = 7; // Should always be more than SET_GRACE_WHEN

//Checks if a token exists, and returns the corrosponding accountId
exports.validateSession = function(token, type, success, fail) {
    var query;
    if(typeof type == "string"){
        query = {
            type: type
        }
    } else {
        query = {
            type: { $in : type }
        }
    }
    query.token = token;
    query.expires = {"$gte": Date.now() };

    Session.findOne(query)
        .select('token accountId type expires')
        .exec(function(err, session) {
            if (err) {
                var payload = {
                    msg: "Could not search database for session!",
                    status: 500
                };
                fail(payload);
                payload.err = err;
                Raven.captureException(payload);
            } else if (!session) {
                fail({
                    msg: "Session is not valid!",
                    status: 401
                });
            } else {
                success(session.accountId, session);

                // Extend the session expiry if necessary
                if (moment(session.expires).subtract(SET_GRACE_WHEN, "days").isBefore(moment())) {
                    var updateCmd = {
                        $set: {
                            updated: Date.now(),
                            expires: moment().add(SESSION_GRACE_PERIOD, "days")
                        }
                    }

                    session.update(updateCmd).exec(function(err, session){
                      if(err){
                        var payload = {
                            msg: "Error reading database when extending user token!",
                            err: err
                        }
                        Raven.captureException(payload);
                      }
                    });
                }
            }
        });

        //Clean out all old items
        var removeOld = {
            expires: {"$lt": Date.now()}
        }
        Session.find(removeOld).remove().exec(function(err) {
            if (err) {
                var payload = {
                    msg: "Error removing old sessions!",
                    err: err
                }
                Raven.captureException(payload);
            }
        });
};

//Creates a token and returns the token if successful
exports.generateSession = function(accountId, type, success, fail) {
    //Create a random token
    var token = crypto.randomBytes(48).toString('hex');
    //New session!
    new Session({
        accountId: accountId,
        type: type,
        token: token,
        created: Date.now(),
        updated: Date.now(),
        expires: moment().add(SESSION_VALIDITY_LENGTH, "days")
    }).save(function(err, session) {
        if (err) {
            var payload = {
                msg: "Could not add session to DB!",
                status: 500
            }
            fail(payload);
            payload.err = err;
            Raven.captureException(payload);
        } else {
            success(token, session);
        }
    });
};

//Creates a token and returns the token if successful
exports.deleteSession = function(token, success, fail) {
    Session.findOneAndRemove({
        token: token
    }).exec(function(err){
      if (err) {
        var payload = {
            msg: "Could not delete session!",
            status: 500
        }
        fail(payload);
        payload.err = err;
        Raven.captureException(payload);
      } else success();
    });
};
