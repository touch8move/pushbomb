var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
mongoose.connect('mongodb://localhost:27017/pushbomb').connection;

mongoose.connection.on('error', (err) => {
    console.error(`MongoDB connection error: ${err}`);
    process.exit(-1); // eslint-disable-line no-process-exit
});

var UserModel = require('./user_m.js');
var MsgModel = require('./msg_m.js');
var async = require('async');

// let index = 0;
// async.whilst(
//     () => {
//         return index < 100
//     },
//     (cb) => {
//         UserModel.create(null, (err, ret) => {
//             index++;
//             cb(null, index);
//         });
//     },
//     (err, n) => {

//     }
// )

// UserModel.UserModel.findById('59488d6cc7cb6f986b8c97fc').exec().then((user) => {
//     // console.log(user);
//     MsgModel.create(user, 'HHHHHH', (err, ret) => {
//         if (err) {
//             console.log(err);
//             return;
//         }

//         // console.log(ret);
//         ret.deepPopulate('sender receives').then((msg) => {
//             console.log(msg);
//         })

//         // MsgModel.Msg.findById('5948ea85f27f1ab80d1449cd').deepPopulate('receives').exec((err, msg) => {
//         //     console.log(msg);
//         // });
//         // MsgModel.Msg
//     });
// });

// UserModel.registDeviceId('59488d6cc7cb6f986b8c97fc', 'deviceid', (err, user) => {
//     // socket.emit("RegDeviceIdComplete");
//     console.log(user);
// });
// UserModel.UserModel.findById('59488d6cc7cb6f986b8c97fc').exec().then((user) => {
//     // console.log(user);
//     MsgModel.load(user, (err, msgs) => {
//         console.log(msgs[0].receives);
//         // console.log(msgs[0].receives.deepPopulate('recipient').exec();
//         // msgs[0].receives.forEach((recipient) => {
//         //     recipient.deepPopulate('sender recipient').exec().then((rec) => {
//         //         console.log(rec);
//         //     });
//         // })
//         mongoose.connection.close();
//     });
// });

UserModel.getRandomUsers((err, users) => {
    console.log('err', err);
    console.log('users', users);
})