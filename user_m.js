'use strict';

var mongoose = require('mongoose'),
    async = require('async'),
    deepPopulate = require('mongoose-deep-populate')(mongoose);

var UserModel = new mongoose.Schema({
    socketid: String,
    createDate: Date,
    lastLoginDate: Date,
    deviceid: String,
    deviceType: Number,
    isOnline: Boolean,
    nickname: String
});


var User = mongoose.model('User', UserModel);
UserModel.plugin(deepPopulate)
module.exports.UserModel = User;
module.exports.create = (socketid, callback) => {
    User.create({
        'socketid': socketid,
        'createDate': new Date(),
        'lastLoginDate': null,
        // 'deviceid': deviceid,
        'deviceType': 0,
        'isOnline': false
    }).then((user) => {
        callback(null, user);
    }).catch((err) => {
        callback(err);
    });
}

module.exports.login = (id, socketid, callback) => {
    User.findById(id).exec()
        .then((user) => {
            // console.log(user);
            user.socketid = socketid;
            user.lastLoginDate = new Date();
            user.isOnline = true;
            user.save();
            callback(null, user);
        }).catch((err) => {
            callback(err);
        });
}

module.exports.logout = (id, callback) => {
    User.findById(id).exec()
        .then((user) => {
            // user.lastLoginDate = new Date();
            user.socketid = null;
            user.isOnline = false;
            user.save();
            callback(null, user);
        });
}

module.exports.registDeviceId = (id, deviceid, callback) => {
    User.findById(id).exec()
        .then((user) => {
            user.deviceid = deviceid;
            user.save();
            callback(null, user);
        })
        .catch((err) => {
            callback(err);
        });
}

module.exports.getRandomUsers = (exceptUser, callback) => {
    let maxReceiverCount = 10;
    let rows = [];
    let users = [];
    let multi_hit = 0;
    let index = 0;
    User.count().exec().then((count) => {
        // console.log('maxCount', count);
        async.during(
            (cb) => {
                return cb(null, index < maxReceiverCount);
            },
            (cb) => {
                index++;
                let random = Math.floor(Math.random() * count);
                // console.log(index, random);
                if (rows.indexOf(random) == -1) {
                    rows.push(random);
                    User.findOne().skip(random).exec((err, user) => {
                        users.push(user);
                        cb();
                    });
                } else {
                    multi_hit++;
                    // console.log('multihit', multi_hit);
                    if (multi_hit > 3) {
                        index = maxReceiverCount;
                    }
                    cb();
                }
            },
            function(err) {
                let removeIndex = -1;
                for (let i = 0; i < users.length; i++) {
                    if (users[i].id == exceptUser.id) {
                        // console.log('users[', i, ']', users[i].id);
                        // console.log('exceptUser', exceptUser.id);
                        removeIndex = i;
                    }
                }
                if (removeIndex != -1) {
                    // console.log('before', users);
                    let exceptedUser = users.splice(removeIndex, 1);

                    // console.log('exceptedUser', removeIndex, exceptedUser.id);
                    // console.log('users', users);
                } else {
                    // console.log('no except', users);
                }
                callback(err, users);
            }
        );
    });
}