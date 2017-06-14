'use strict';

var mysql = require('mysql');
var crypto = require('crypto');
var User = require('./user.js');
// var conf = require('./config.js');
var pool = mysql.createPool({
    connectionLimit: 20,
    host: 'localhost',
    port: 3306,
    user: 'pushbomb',
    password: 'pushbomb',
    database: 'pushbomb'
});

// 날짜계산기 
var getDays = (millisec) => {
    return Math.floor(millisec / (3600 * 24 * 1000));
}
var ERR_CODE = {
    AUTH_ERR_NO_USER: { name: 'No User' },
    AUTH_ERR_SELECT_USER: { name: 'select user' },
    AUTH_ERR_INSERT_USER: { name: 'insert user' },
    AUTH_ERR_UPDATE_USER: { name: 'update user' },
    AUTH_ERR_HAS_USER: { name: 'has user' }
}
Object.freeze(ERR_CODE);
module.exports.ERR_CODE = ERR_CODE;

// for (var i = 0; i < 99999; i++) {
//     var userdata = { 'id': crypto.randomBytes(10).toString('hex') };
//     pool.query('INSERT INTO Users SET ?', userdata, (err, results) => {
//         // console.log('results', err);
//     });
// }


// 유저검색
module.exports.search = (id, callback) => {
    pool.query('SELECT * FROM Users WHERE id = ? ', [id], (err, user) => {
        if (err) {
            callback(err);
            return;
        }
        console.log(id, user[0]);
        var userObj = new User(user[0]);
        callback(null, userObj);
    });
}

// 로그인 
module.exports.login = (id, socketid, callback) => {
    pool.query('SELECT * FROM Users WHERE id = ? ', [id], (err, user) => {
        if (err) {
            callback(err);
            return;
        }
        // console.log('user', user);
        if (user.length == 0) {
            callback(ERR_CODE.AUTH_ERR_NO_USER);
            return;
        }
        var userObject = new User(user[0]);
        var logindate = new Date();
        // if (userObject.lastLoginDate != null) {
        //     var subtract = logindate.getTime() - userObject.lastLoginDate;
        //     var days = getDays(subtract);
        //     if (days > conf.set.loginWaitTime && userObject.currentPoint > 0) {
        //         userObject.currentPoint -= (days - conf.set.loginWaitTime);
        //     }
        // }
        userObject.lastLoginDate = logindate;
        pool.query('UPDATE Users SET isOnline = 1, lastLoginDate=?, socketid=? WHERE id = ?', [userObject.lastLoginDate, socketid, id], (err, results) => {
            callback(err, userObject);
        });
    });
}

module.exports.logout = (id, callback) => {
    pool.query('SELECT * FROM Users WHERE id = ? ', [id], (err, user) => {
        if (err) {
            callback(err);
            return;
        }
        if (user.length == 0) {
            callback(ERR_CODE.AUTH_ERR_NO_USER);
            return;
        }
        var userObject = new User(user[0]);
        pool.query('UPDATE Users SET isOnline = 0, socketid=NULL WHERE id = ?', [id], (err, results) => {
            callback(err, userObject);
        });
    });
}

// 생성
module.exports.create = (callback) => {
        var id = crypto.randomBytes(10).toString('hex');
        pool.query('SELECT * FROM Users WHERE id = ? ', [id], (err, user) => {
            if (err) {
                callback(err);
                return;
            }
            var userdata = { 'id': id };
            if (user.length == 0) {
                pool.query('INSERT INTO Users SET ?', userdata, (err, results) => {
                    if (err) {
                        callback(err);
                        return;
                    }
                    pool.query('SELECT * FROM Users WHERE id = ? ', [id], (err, insertuser) => {
                        if (err) {
                            callback(err);
                            return;
                        }
                        console.log('create user:', insertuser);
                        var userObj = new User(insertuser[0]);
                        callback(null, userObj);
                    });
                });
            } else {

            }
        });
    }
    // 유저 데이터 업데이트 
module.exports.talkUpdate = (data, callback) => {
    pool.query('SELECT * FROM Users WHERE id = ? ', [data.id], (err, results) => {
        if (err) {
            callback(err);
            return;
        }
        if (results.length == 0) {
            callback(ERR_CODE.AUTH_ERR_NO_USER);
            return;
        }
        var user = new User(results[0]);
        user.talkCount = data.talkCount;
        user.messageCount = data.messageCount;
        pool.query('UPDATE Users SET talkCount = ?, messageCount = ? WHERE id = ?', [user.talkCount, user.messageCount, data.id], (err) => {
            if (err) {
                callback(err);
                return;
            }
            callback(null, user);
        });
    });
}

module.exports.getUserList = (id, count, callback) => {
    // SELECT * FROM Users WHERE id != ? AND deviceid NOT NULL ORDER BY RAND() LIMIT ? 
    pool.query("SELECT * FROM Users WHERE id != ? ORDER BY lastLoginDate DESC LIMIT ?", [id, count], (err, results) => {
        if (err) {
            callback(err);
            return;
        }
        callback(null, results);
    });
}

module.exports.RegisterDeviceId = (id, deviceid, callback) => {
    pool.query("SELECT * FROM Users WHERE id = ?", [id], (err, results) => {
        if (err) {
            callback(err);
            return;
        }

        pool.query("UPDATE Users SET deviceid = ? WHERE id = ?", [deviceid, id], (err, results) => {
            if (err) {
                callback(err);
                return;
            }
            callback(null);
        })
    })
}



//=========================== msg ====================================

module.exports.regMsg = (msg, callback) => {
    // var msgs = { 'sender': id, 'text': text };
    pool.query("INSERT INTO Msgs SET ?", msg, (err, results) => {
        if (err) {
            callback(err);
            return;
        }
        // console.log(results);
        callback(null, results);
        // pool.query("SELECT ")
    })
}

module.exports.msg = (msg, callback) => {
    pool.query("INSERT INTO Msgs SET ?", msg, (err, results) => {
        callback(err, results);
    })
}

module.exports.receive = (msg, callback) => {
    pool.query("INSERT INTO receiveMsgs SET ?", msg, (err, results) => {
        callback(err, results);
    });
}

module.exports.feedback = (feedback, callback) => {
    pool.query("INSERT INTO Feedbacks SET ?", feedback, (err, result) => {
        callback(err, result);
    })
}

module.exports.insert = (data, tablename, callback) => {
    pool.query("INSERT INTO " + tablename + " SET ?", data, (err, result) => {
        callback(err, result);
    });
}

module.exports.select = (where, tablename, callback) => {
    var select = "SELECT * FROM " + tablename + " WHERE " + where + " ORDER BY id DESC";
    // console.log(select);
    pool.query(select, (err, results) => {
        callback(err, results);
    });
}