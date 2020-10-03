'use strict';

let spider = require("./spider.js");
let mongodb = require("mongodb");

const contentsUrl = "https://export.arxiv.org/list/cs.AI/20";
const mongoUrl = "mongodb://localhost:27017";

// let makeUrl = function (url, skip, show) {
//     return url + "?skip=" + skip + "&show=" + show;
// }

let main = async function () {
    let client = mongodb.MongoClient;
    let db = await client.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
    let dbase = db.db("arXivAid");
    console.log("DB connected.");

    let initCollection = async function (name) {
        let docs = await dbase.listCollections({ "name": name }).toArray();
        if (docs.length === 0) {
            dbase.createCollection(name);
        } else {
            dbase.collection(name).deleteMany({});
        }
    };
    await Promise.all([initCollection("information"), initCollection("downloadFailure")]);
    console.log("Collections inited.");

    let i = 0;

    let makeVisit = async function () {
        console.log("contents:" + i);
        let skip = 100 * i;
        try {
            let arr = await spider.visitContents(contentsUrl, skip);
            await Promise.all(arr.map(async (s) => {
                try {
                    let info = await spider.visitAbs(s);
                    console.log(info.title);
                    await dbase.collection("information").insertOne(info);
                } catch (e) {
                    console.log(e);
                    await dbase.collection("downloadFailure").insertOne({ "type": "Abs", "url": s});
                }
            }));
        } catch (e) {
            console.log(e);
            await dbase.collection("downloadFailure").insertOne({ "type": "Contents", "url": contentsUrl, "skip": skip});
        }
        i++;
    };

    await makeVisit();
}

main();