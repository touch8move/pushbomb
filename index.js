'use strict';

var port = 7777;
// process.argv.forEach((val, index, array) => {
// console.log(index + ': ' + val);
// });
if (process.argv[2] != undefined) {
    port = process.argv[2];
}

if (process.argv[3] != undefined) {
    process.env.mode = process.argv[3];
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
var sizeof = require('object-sizeof');

var User = require('./user.js');
var fcm = new FCM('AAAAwvWv-7U:APA91bFBa9BtddemjfFDYyByXzrTKff_hGTEH4X8UUzqf8iKllUt2DyArfDy5GcWp5znZ9ssZgO72LxOc47C_XD0agM5flLKT_4J2i2EttNvnw-yLHFWJpj8_hvE63Di0MWv2zsd26RE');
var user_m = require('./user_m.js'),
    msg_m = require('./msg_m.js'),
    sent = require('./sent.js'),
    feedback = require('./feedback.js');

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
var MsgData = (data, to) => {
    return {
        "to": to,
        "data": data
    }
}
var sentEventName = 'pushbomb';
var receiveMsgEventName = 'receiveMsgs';
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
    // logger.emit('log', 'connection', socket.id);
    var currentUser;
    // 앱 종료
    socket.on('disconnect', () => {
        db.logout(currentUser.id, (err, data) => {
            logger.emit('log', 'logout', currentUser.id);
        });
    });

    // 신규유저 
    socket.on('newUser', (deviceid) => {
        user_m.create(socket.id, (err, user) => {
            if (err) {
                logger.emit('err', 'new user', err);
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
            logger.emit('log', 'login', currentUser.id);
            socket.emit('logon', { 'nickname': currentUser.nickname });
        })
    });

    // 메세지 전송
    socket.on('PostMsg', (msg) => {
        // 다른 사람들에게 메세지 전달하기 
        var send = { 'sender': currentUser.id, 'text': msg.msg };
        msg_m.create(currentUser.id, send.text, (err, ret_msg) => {
            user_m.getRandomUsers(currentUser, (err, users) => {
                if (err) {
                    logger.emit('err', 'send', err);
                    return;
                }
                socket.emit('registSendMsgsComplete', ret_msg);
                async.each(users, (user, cb) => {
                    sent.Sent.create({ 'msgId': ret_msg.id, 'recipient': user, 'text': send.text, 'sender': currentUser })
                        .then((sentData) => {
                            ret_msg.sents.push(sentData);
                            sendMsg(user, { 'data': sentData }, receiveMsgEventName);
                            cb();
                        });
                }, (err) => {
                    if (err) {
                        logger.emit('log', 'recipient create', err);
                    }
                    ret_msg.save();
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
        sent.load(currentUser, (err, sents) => {
            socket.emit('load_receive_complete', { 'receiveMsgs': sents });
        })
    });

    // 답장을 보내면 원래 메세지를 보낸 사람에게 답장을 보내준다.
    socket.on('feedback', (sentMsg) => {
        sent.get(sentMsg.id, (err, sentTarget) => {
            feedback.Feedback.create({ 'sent': sentTarget, 'creator': currentUser, 'text': sentMsg.text }).then((feedbackResult) => {
                sentTarget.feedback = feedbackResult.toObject();
                sentTarget.save((err, res) => {
                    sent.Sent.findById(sentTarget.id).deepPopulate('recipient sender feedback feedback.creator').exec().then((result) => {
                        logger.emit('log', 'sent', result);
                        socket.emit('feedbackReturn', { 'sentId': sentTarget.id, 'data': result });

                        sendMsg(result.sender, { 'data': result }, sentEventName);
                    });
                });
            });
        });
    });

    socket.on('newMsgConfirm', (data) => {
        user_m.UserModel.findById(data._id).exec()
            .then((user) => {
                logger.emit('log', 'newMsgConfirm', '');
            });
    });

    socket.on('nickname', (data) => {
        currentUser.nickname = data.nickname;
        currentUser.save(() => {
            socket.emit('nickname_update', { 'nickname': currentUser.nickname });
        });
    })
});

var sendMsg = (recipient, data, eventName) => {

    var recipientSocket = io.sockets.connected[recipient.socketid];
    // 앱이 켜있다면 
    if (recipientSocket != undefined) {
        logger.emit('log', eventName, data);
        recipientSocket.emit(eventName, data);
        return;
    }

    if (recipient.deviceid == null || recipient.deviceid == undefined) {
        logger.emit('log', 'sendMsg', 'recipient deviceid null or undefined');
        return;
    }

    fcm.send(Msg(recipient.sentText, recipient.deviceid), (err, response) => {
        if (err) {
            logger.emit('err', 'fcm error', err);
        } else {
            logger.emit('log', 'fcm send', response);
        }
    });
}