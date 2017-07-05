'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    User = require('./user_m.js'),
    async = require('async');

var MsgModel = new Schema({
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    text: String,
    createdDate: { type: Date, default: Date.now },
    isDel: Boolean,
    sents: [{ type: Schema.Types.ObjectId, ref: 'Sent' }]
});

var deepPopulate = require('mongoose-deep-populate')(mongoose);
MsgModel.plugin(deepPopulate);

var Msg = mongoose.model('Msg', MsgModel);

module.exports.Msg = Msg;
module.exports.create = (sender, text, callback) => {
    Msg.create({
        'sender': sender,
        'text': text,
        'isDel': false
    }).then((msg) => {
        callback(null, msg);
    }).catch((err) => {
        callback(err);
    })
}

module.exports.load = (user, callback) => {
    Msg.find({ 'sender': user })
        .populate({
            path: 'sents',
            match: { 'feedback': { $exists: true } },
        })
        .deepPopulate('sender sents sents.feedback sents.feedback.creator')
        .sort({ '_id': -1 })
        .exec()
        .then((msgs) => {
            callback(null, msgs);
        });
}