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

var FCM = require('fcm-node');
var logger = require('./logger.js');
var db = require('./db.js');
var io = require('socket.io')(port);
var async = require('async');

var User = require('./user.js');
var deviceID = "837345606581";
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

// 문자보내기 사이클
/*
    1. 작성자가 문자를 보낸다. - client.socket.emit('sendMsgs')
    2. 서버에서 문자를 받는다. - server.socket.on('sendMsgs')
    3. 서버에 등록된 문자를 등록된 아이디와 함께 다시 보낸사람에게 돌려준다. server.socket.emit('registSendMsgsComplete')
    3. 받은문자를 다른 사용자에게 보내기 위해 사용자 검색을 한다. db
    4. 현재 접속중 사용자와 미접속사용자를 구분한다.
    5. 접속중 사용자는 직접 보내서 토스트를 보여준다. server.socket.emit('receiveMsgs')
    6. 미접속 사용자는 푸시로 보낸다.

    - 해당문자를 받은사람 -
    문자를 받는다. client.socket.on('receiveMsgs')
    문자를 클릭해서 해당 문자에 답변을 한다. client.socket.emit('feedback')
    서버에서 문자를 처리한다. server.socket.on('feedback')
    원 문자보낸사람에게 다시 보낸다. server.socket.emit('feedback_return')
    클라에서 문자를 받아서 보여준다. client.socket.on('feedback_return')


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

        // feedback.load(currentUser, (err, feedbacks) => {
        //     if (err) {
        //         logger.emit('newEvent', 'feedback', err);
        //         return;
        //     }
        //     async.each(feedbacks, (feedback, cb) => {
        // 		if(feedback._id)
        //         feedback.feedbackText = feedbackMsg.feedbackText;
        //         feedback.feedbackDate = new Date();
        //         feedback.save();
        //         socket.emit('sendFeedbackS', feedback);
        //         sendMsg(feedback.sender, feedback, 'sendFeedbackS');
        //         cb();
        //     }, (err) => {
        //         if (err) {
        //             logger.emit('newEvent', 'recipient create', err);
        //         }
        //     });
        // });
    });
});

var sendMsg = (recipient, data, eventName) => {
    if (recipient.isOnline == 1 && recipient.deviceid == null) {
        io.to(recipient.socketid).emit(eventName, data);
    }

    // else {
    //     // 아니면 푸시
    //     fcm.send(Msg(recipient.feedbackText, sender.deviceid), (err, response) => {
    //         if (err) {
    //             console.log(err);
    //             console.log("Something has gone wrong!");
    //         } else {
    //             console.log("Successfully sent with response: ", response);
    //         }
    //     });
    // }
}