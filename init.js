'use strict';

let mongo = require("./mongo.js");
let spider = require("./spider.js");
let fs = require("fs");
let path = require("path");

let data = require("./data.json");

const contentsUrl = "https://export.arxiv.org/list/cs.AI/20";

// let makeUrl = function (url, skip, show) {
//     return url + "?skip=" + skip + "&show=" + show;
// }

let main = async function () {
    let client = await mongo.connect();
    let db = client.db("arXivAid");
    mongo.initCollections(db, ["information", "downloadFailure"]);

    let i = 0;

    let makeVisit = async function () {
        console.log("contents:" + i);
        let skip = 100 * i;
        try {
            let arr = await spider.visitContents(contentsUrl, skip);
            await Promise.all(arr.map(async (s) => {
                try {
                    let info = await spider.visitAbs(s);
                    if (info !== {}) {
                        console.log(info.title);
                        await db.collection("information").insertOne(info);
                    }
                } catch (e) {
                    console.log(e);
                    await db.collection("downloadFailure").insertOne({ "type": "Abs", "url": s });
                }
            }));
        } catch (e) {
            console.log(e);
            await db.collection("downloadFailure").insertOne({ "type": "Contents", "url": contentsUrl, "skip": skip });
        }
        i++;
    };

    data.update = Date.now();
    let jsonstr = JSON.stringify(data, undefined, 4);
    fs.writeFile('./data.json', jsonstr, async function (e) {
        if (e) {
            throw e;
        } else {
            await makeVisit();
        }
    });
}

main();