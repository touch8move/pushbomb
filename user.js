'use strict';

class User {
    constructor(data) {
        this.id = data.id;
        this.socketid = data.socketid;
        this.createDate = data.createDate;
        this.nickname = null;

        this.lastLoginDate = data.lastLoginDate;
        this.deviceid = data.deviceid;
        this.devicetype = data.devicetype;
        this.isOnline = data.isOnline;
    }
}

module.exports = User;