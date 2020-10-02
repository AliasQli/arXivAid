'use strict';

const spider = require("./spider.js");
const mongodb = require("mongodb");

const contentsUrl = "https://export.arxiv.org/list/cs.AI/20";
const mongoUrl = "mongodb://localhost:27017";

// var makeUrl = function (url, skip, show) {
//     return url + "?skip=" + skip + "&show=" + show;
// }

var client = mongodb.MongoClient;

client.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true }, function (e, db) {
    if (e) throw e;

    console.log("DB connected.");

    var dbase = db.db("arXivAid");

    var callback = function () {
        console.log("Collections created.");
        var i = 0;
        var recurse = function () {
            //console.log("recurse");
            var query = { skip: 100 * i, show: 100 };
            spider.visitContents(contentsUrl, query, function (e, arr) {
                console.log("content:" + i);
                i++;
                recurse();
                if (e) {
                    console.log(e);
                    dbase.collection("downloadFailure").insertOne({"url": contentsUrl, "query": query}, (e) => {
                        if (e) console.log(e);
                    });
                } else {
                    for (let s of arr) {
                        spider.visitAbs(s, function (e, info) {
                            if (e) {
                                console.log(e);
                                dbase.collection("downloadFailure").insertOne({url: s, "query": null}, (e) => {
                                    if (e) console.log(e);
                                });
                            } else if (info) {
                                console.log(info.title);
                                dbase.collection("information").insertOne(info, (e) => {
                                    if (e) console.log(e);
                                });
                            }
                        });
                    }
                }
            });
            //setTimeout(recurse, 10000);
            //i++;
        };
        recurse();
    };

    var semaphore = 0;
    
    var initCollection = function (name) {
        dbase.listCollections({"name": name}).toArray((e, docs) => {
            if (e) throw e;

            var cb = function (e) {
                if (e) throw e;
                semaphore--;
                if (semaphore == 0) {
                    callback();
                }
            };
            
            semaphore++;
            if (docs == 0) {
                dbase.createCollection(name, cb);
            }else{
                dbase.collection(name).deleteMany({}, cb);
            }
        });
    };

    initCollection("information");
    initCollection("downloadFailure");
});

