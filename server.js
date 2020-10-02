'use strict';

const spider = require("./spider.js");
const mongodb = require("mongodb");

const contentsUrl = "https://arxiv.org/list/cs.AI/20";
const mongoUrl = "mongodb://localhost:27017";

// var makeUrl = function (url, skip, show) {
//     return url + "?skip=" + skip + "&show=" + show;
// }

var client = mongodb.MongoClient;

client.connect(mongoUrl, { useNewUrlParser: true }, function(err, db) {
    if (err) {
        throw err;
    }

    console.log("DB connected.");

    var dbase = db.db("arXivAid");
    
});

