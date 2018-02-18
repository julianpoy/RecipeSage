var mongoose = require('mongoose'),
    crypto = require('crypto'),
    Session = mongoose.model('Session'),
    moment = require('moment');

//Checks if a token exists, and returns the corrosponding accountId
exports.validateSession = function(token, type, success, fail) {
    // token = '15c9b215fb8f0398564dd15dbef489cf1ae02625c5768602b44f25ab1f15534adc4f2d88bef307a2efe35d2597e6888a'
    var expiry = {
        period: 3,
        unit: "day"
    }
    var grace = {
        period: 1,
        unit: "days",
        add: 3
    }

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
    query.created = {"$gte": moment().subtract(expiry.period, expiry.unit).toDate() };

    Session.findOne(query)
        .select('accountId type assignmentId created')
        .exec(function(err, session) {
            if (err) {
                fail({
                    msg: "Could not search database for session!",
                    status: 500
                });
            } else if (!session) {
                console.log("hi")
                fail({
                    msg: "Session is not valid!",
                    status: 401
                });
            } else {
                success(session.accountId, session);

                //Check if session is within 15 minutes of expiring
                if(moment(session.created).subtract(grace.period, grace.unit).isBefore(moment().subtract(expiry.period, expiry.unit))){
                    //If session is about to expire, add 30 more minutes of valid time
                    var updateCmd = {
                        $set: {
                            created: moment(session.created).add(grace.add, grace.unit)
                        }
                    }

                    session.update(updateCmd).exec(function(err, session){
                      if(err){
                        console.log("Error reading database when extending user token!");
                      }
                    });
                }
            }
        });

        //Clean out all old items
        var removeOld = {
            created: {"$lt": moment().subtract(expiry.period, expiry.unit)}
        }
        Session.find(removeOld).remove().exec();
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
        created: Date.now()
    }).save(function(err, session) {
        if (err) {
            fail({
                msg: "Could not add session to DB!",
                status: 500
            });
        } else {
            success(token, session);
        }
    });
};

//Creates a token and returns the token if successful
exports.deleteSession = function(token, success, fail) {
    Session.findOne({
        token: token
    }).remove(function(err){
      if(err) fail(err);
      else success();
    });
};
