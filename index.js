'use strict';

var port = 7777;
// process.argv.forEach((val, index, array) => {
//     console.log(index + ': ' + val);
// });
if (process.argv[2] != undefined) {
    port = process.argv[2];
}
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
mongoose.connect('mongodb://localhost:27017/pushbomb');
// mongoose.connect(process.env.OPENSHIFT_MONGODB_DB_URL + process.env.OPENSHIFT_APP_NAME);

var FCM = require('fcm-node');
var logger = require('./logger.js');
var db = require('./db.js');
var io = require('socket.io')(port);
var async = require('async');

var User = require('./user.js');
var fcm = new FCM('AAAAwvWv-7U:APA91bFBa9BtddemjfFDYyByXzrTKff_hGTEH4X8UUzqf8iKllUt2DyArfDy5GcWp5znZ9ssZgO72LxOc47C_XD0agM5flLKT_4J2i2EttNvnw-yLHFWJpj8_hvE63Di0MWv2zsd26RE');


var user_m = require('./user_m.js'),
    msg_m = require('./msg_m.js'),
    feedback = require('./feedback.js')

// var message = {
//     to: 'fXA7mguvYHU:APA91bHfOYttx5x9BR5769Vnh6SvzBN_Gv_7UqtNlsgMlqRhfKSfSsqCgQRPMApgLSFCLR2TZfU06B20wI4EefYCQJqF_sCeba0Ry3hE_BhJ44xcibLiwtSQKc3EncEomvzrSbMQGqQX',
//     notification: {
//         "title": "NotiTitle",
//         "body": "NotiBody",
//         "sound": "default",
//         "click_action": "FCM_PLUGIN_ACTIVITY",
//         "icon": "fcm_push_icon",
//     },
//     // data: { //you can send only notification or only data(or include both)
//     //     title: 'Title',
//     //     message: 'Message',
//     //     body: 'Body',
//     //     my_key: 'my value',
//     //     my_another_key: 'my another value',
//     //     image: 'twitter'
//     // }
// };

var Msg = (msg, to, options) => {
    return {
        "to": to,
        "notification": {
            // "title": "NotiTitle",
            "body": msg,
            "sound": "default",
            "click_action": "FCM_PLUGIN_ACTIVITY",
            "icon": "fcm_push_icon",
        }
    }
}
var MsgData = (msg, to, options) => {
    return {
        "to": to,
        "data": {
            // "title": "NotiTitle",
            "body": msg,
        }
    }
}

// 문자보내기 사이클
/*
    랜덤 문자발송 (PostMsg)
	- 보내는 사람 sender
	- 내용 text
	- 받는사람 recipient

	받는사람이 보낸는 문자 (Feedback)
	- 보내는 사람 feedbacker
	- 내용 feedbackText
*/

io.on('connection', (socket) => {
    console.log('new connection', socket.id);
    var currentUser;
    // 앱 종료
    socket.on('disconnect', () => {
        db.logout(currentUser.id, (err, data) => {
            console.log('logout');
        });
    });

    // 신규유저 
    socket.on('newUser', (deviceid) => {
        user_m.create(socket.id, (err, user) => {
            if (err) {
                logger.emit('newEvent', 'new user', err);
                return;
            }
            currentUser = user;
            socket.emit('newuser_complete', { 'id': user.id });
        })
    });

    // 로그인 
    socket.on('login', (data) => {
        user_m.login(data.id, socket.id, (err, user) => {
            if (err) {
                socket.emit('client_newuser');
                return;
            }
            currentUser = user;
            logger.emit('newEvent', 'login', currentUser.id);
            socket.emit('logon');
        })
    });

    // 메세지 전송
    socket.on('PostMsg', (msg) => {
        logger.emit('newEvent', 'PostMsg', msg);
        // 다른 사람들에게 메세지 전달하기 
        var send = { 'sender': currentUser.id, 'text': msg.msg };
        msg_m.create(currentUser.id, send.text, (err, ret_msg) => {
            user_m.getRandomUsers(currentUser, (err, users) => {
                if (err) {
                    logger.emit('newEvent', 'send', err);
                    return;
                }
                async.each(users, (user, cb) => {
                    feedback.Feedback.create({ 'recipient': user, 'sender': currentUser, 'msgText': send.text, 'msgId': ret_msg.id })
                        .then((feedbackData) => {
                            ret_msg.receives.push(feedbackData);
                            sendMsg(user, feedbackData, 'receiveMsgs');
                            logger.emit('newEvent', 'feedback', feedbackData);
                            cb();
                        });
                }, (err) => {
                    if (err) {
                        logger.emit('newEvent', 'recipient create', err);
                    }
                    ret_msg.save((err, res) => {
                        msg_m.Msg.findById(res.id).deepPopulate('sender receives').exec()
                            .then((ret) => {
                                logger.emit('newEvent', 'PostMsg', ret);
                                socket.emit('registSendMsgsComplete', ret);
                            });
                    });
                });
            });
        });
    });


    socket.on('RegisterDeviceId', (data) => {
        user_m.registDeviceId(data.id, data.deviceid, (err, user) => {
            socket.emit("RegDeviceIdComplete");
        })
    });

    socket.on('load_send', (data) => {
        msg_m.load(currentUser, (err, msgs) => {
            socket.emit('load_send_complete', { 'sendMsgs': msgs });
        })
    });

    socket.on('load_receive', (data) => {
        feedback.load(currentUser, (err, feedbacks) => {
            socket.emit('load_receive_complete', { 'receiveMsgs': feedbacks });
        })
    });

    // 답장을 보내면 원래 메세지를 보낸 사람에게 답장을 보내준다.
    socket.on('feedback', (feedbackMsg) => {
        console.log(feedbackMsg);

        feedback.get(feedbackMsg.id, (err, feedbackTarget) => {
            feedbackTarget.feedbackText = feedbackMsg.text;
            feedbackTarget.feedbackDate = new Date();
            feedbackTarget.save();
            socket.emit('feedbackReturn', feedbackTarget);
            sendMsg(feedbackTarget.sender, feedbackTarget, 'pushBomb');
        });
    });
});

var sendMsg = (recipient, data, eventName) => {
    // 서버에 온라인이라면 
    var recipientSocket = io.sockets.connected[recipient.socketid];
    if (recipientSocket != undefined) {
        recipientSocket.emit(eventName, data);
        // return;
    }

    if (recipient.deviceid == null || recipient.deviceid == undefined) {
        console.log('recipient deviceid null or undefined');
        return;
    }
    fcm.send(Msg(recipient.feedbackText, recipient.deviceid), (err, response) => {
        if (err) {
            console.log(err);
            console.log("Something has gone wrong!");
        } else {
            console.log("Successfully sent with response: ", response);
        }
    });
}