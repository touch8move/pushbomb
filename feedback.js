'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    deepPopulate = require('mongoose-deep-populate')(mongoose)

var FeedbackModel = new mongoose.Schema({
    // sent: { type: Schema.Types.ObjectId, ref: 'Sent' },
    creator: { type: Schema.Types.ObjectId, ref: 'User' },
    createdDate: { type: Date, default: Date.now },
    text: String
});

FeedbackModel.plugin(deepPopulate);
var Feedback = mongoose.model('Feedback', FeedbackModel);
module.exports.Feedback = Feedback;

module.exports.load = (user, callback) => {
    Feedback.find({ 'recipient': user })
        .deepPopulate('recipient sender')
        .sort({ '_id': -1 })
        .exec()
        .then(
            (feedbacks) => {
                callback(null, feedbacks);
            })
        .catch(
            (err) => {
                callback(err);
            });
}

module.exports.get = (id, callback) => {
    Feedback.findById(id)
        .deepPopulate('recipient sender')
        .exec()
        .then((feedback) => {
            callback(null, feedback);
        })
        .catch((err) => {
            callback(err);
        });
}