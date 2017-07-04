'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    deepPopulate = require('mongoose-deep-populate')(mongoose)

var SentModel = new mongoose.Schema({
    msgId: { type: Schema.Types.ObjectId, ref: 'Msg' },
    recipient: { type: Schema.Types.ObjectId, ref: 'User' },
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    text: { type: String },
    createdDate: { type: Date, default: Date.now },
    msg: { type: Schema.Types.ObjectId, ref: 'Sent' },
    feedback: { type: Schema.Types.ObjectId, ref: 'Feedback' }
});
SentModel.plugin(deepPopulate);
var Sent = mongoose.model('Sent', SentModel);
module.exports.Sent = Sent;

module.exports.load = (user, callback) => {
    Sent.find({ 'recipient': user })
        .deepPopulate('recipient sender feedback')
        .sort({ '_id': -1 }).exec()
        .then(
            (sents) => {
                callback(null, sents);
            })
        .catch(
            (err) => {
                callback(err);
            });
}

module.exports.get = (id, callback) => {
    Sent.findById(id)
        .deepPopulate('recipient sender feedback').exec()
        .then(
            (sent) => {
                callback(null, sent);
            })
        .catch((err) => {
            callback(err);
        });
}