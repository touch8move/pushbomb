var FCM = require('fcm-node');
var logger = require('./logger.js');
var db = require('./db.js');
var io = require('socket.io')(7777);
var async = require('async');
var deviceID = "837345606581";
var fcm = new FCM('AAAAwvWv-7U:APA91bFBa9BtddemjfFDYyByXzrTKff_hGTEH4X8UUzqf8iKllUt2DyArfDy5GcWp5znZ9ssZgO72LxOc47C_XD0agM5flLKT_4J2i2EttNvnw-yLHFWJpj8_hvE63Di0MWv2zsd26RE');
var message = {
    to: 'fXA7mguvYHU:APA91bHfOYttx5x9BR5769Vnh6SvzBN_Gv_7UqtNlsgMlqRhfKSfSsqCgQRPMApgLSFCLR2TZfU06B20wI4EefYCQJqF_sCeba0Ry3hE_BhJ44xcibLiwtSQKc3EncEomvzrSbMQGqQX',
    notification: {
        "title": "NotiTitle",
        "body": "NotiBody",
        "sound": "default",
        "click_action": "FCM_PLUGIN_ACTIVITY",
        "icon": "fcm_push_icon",
    },
    // data: { //you can send only notification or only data(or include both)
    //     title: 'Title',
    //     message: 'Message',
    //     body: 'Body',
    //     my_key: 'my value',
    //     my_another_key: 'my another value',
    //     image: 'twitter'
    // }
};

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
    socket.on('newUser', () => {
        console.log('newUser');
        db.create((err, user) => {
            if (err) {
                logger.emit('newEvent', 'user create', err);
                return;
            }
            logger.emit('newEvent', 'userConnected', { 'userid': user.id });
            if (err) {
                logger.emit('newEvent', 'new user', err);
                return;
            }
            logger.emit('newEvent', 'new user', user);
            currentUser = user;
            socket.emit('newuser_complete', { 'id': user.id });
        });
    });

    // 로그인 
    socket.on('login', (data) => {
        console.log('login', socket.id);
        db.login(data.id, socket.id, (err, user) => {
            if (err) {
                logger.emit('newEvent', 'login error', err);
                if (err == db.ERR_CODE.db_ERR_NO_USER) {
                    socket.emit('client_newuser');
                }
                return;
            }
            currentUser = user;
            logger.emit('newEvent', 'login', currentUser.id);
            socket.emit('logon');
        });
    });

    // 메세지 전송
    socket.on('sendMsg', (msg) => {
        // 다른 사람들에게 메세지 전달하기 
        console.log(msg);
        var send = { 'sender': currentUser.id, 'text': msg.msg };
        db.insert(send, 'Msgs', (err, result) => {
            socket.emit('registSendMsgsComplete', { 'msgId': result.insertId, 'text': msg.msg });
            db.getUserList(currentUser.id, 10, (err, results) => {
                if (results == undefined) {
                    return;
                }
                // 거기서 걸리는 유저는 
                results.forEach((user) => {
                    var receive = { 'msgId': result.insertId, 'text': msg.msg, 'recipient': user.id, 'sender': currentUser.id };
                    db.insert(receive, 'Receives', (err, results) => {
                        if (user.isOnline == 1 && user.deviceid == null) {
                            io.to(user.socketid).emit('receiveMsgs', receive);
                        } else {
                            // 아니면 푸시
                            fcm.send(Msg(msg.msg, user.deviceid), (err, response) => {
                                if (err) {
                                    console.log(err);
                                    console.log("Something has gone wrong!");
                                } else {
                                    console.log("Successfully sent with response: ", response);
                                }
                            });
                        }
                    });
                });
            });
        });
    });


    socket.on('RegisterDeviceId', (data) => {
        db.RegisterDeviceId(data.id, data.deviceid, (err) => {
            if (err) {
                console.log(err);
                return;
            }

            socket.emit("RegDeviceIdComplete");
        });
    });

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
    */

    // socket.on('load_send', (data) => {
    //     db.select(" 'from' = '" + data.id + "' ", "Msgs", (err, results) => {
    //         var msgs = [];

    //         results.forEach((msg) => {
    //             db.select(" msgId = '" + msg.id + "' ", "Feedbacks", (err, pFeedbacks) => {
    //                 msg.feedbacks = pFeedbacks;
    //                 msgs.push(msg);
    //             });
    //         });
    //         socket.emit('load_send_complete', msg);
    //     });
    // });

    socket.on('load_send', (data) => {
        db.select(" sender = '" + data.id + "' ", "Msgs", (err, rows) => {
            if (err) {
                console.log(err);
                return;
            }
            let sends = rows;
            let index = 0;
            async.whilst(
                () => {
                    return index < sends.length;
                },
                (callback) => {
                    db.select(" msgId = '" + sends[index].id + "' ", "Feedbacks", (err, pFeedbacks) => {
                        if (err) return callback(err);
                        sends[index].feedbacks = pFeedbacks;
                        index++;
                        callback(null, index);
                    });
                },
                function(err, n) {
                    socket.emit('load_send_complete', { 'sendMsgs': sends });
                }
            );
        });
    });

    socket.on('load_receive', (data) => {
        db.select(" recipient ='" + data.id + "' ", "Receives", (err, results) => {
            var msg = { 'receiveMsgs': results };
            socket.emit('load_receive_complete', msg);
        });
    });

    socket.on('feedback', (feedback) => {
        console.log('feedback', feedback);
        db.insert(feedback, 'Feedbacks', (err, result) => {
            if (err) {
                logger.emit('newEvent', 'feedback', err);
                return;
            }
            if (result.isOnline == 1 && result.deviceid == null) {
                io.to(result.socketid).emit('sendFeedback', feedback);
            } else {
                // 아니면 푸시
                fcm.send(Msg(feedback.text, result.deviceid), (err, response) => {
                    if (err) {
                        console.log(err);
                        console.log("Something has gone wrong!");
                    } else {
                        console.log("Successfully sent with response: ", response);
                    }
                });
            }
        });
    });
});