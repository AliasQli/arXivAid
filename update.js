'use strict';

let mongo = require("./mongo.js");
let spider = require("./spider.js");
let fs = require("fs");

let data = require("./data.json");

const contentsUrl = "https://export.arxiv.org/list/cs.AI/new";

let main = async function () {

    //#region makeAbsPromises()
    let makeAbsPromises = function (arr) {
        return Promise.all(arr.map(async (s) => {
            try {
                let info = await spider.visitAbs(s);
                if (info !== {}) {
                    console.log(info.title);
                    let query = {
                        "title": info.title,
                        "authors": info.authors,
                        "submit": info.submit,
                        "revise": {
                            "$gt": info.revise
                        }
                    };
                    db.collection("information").updateOne(query, info, { upsert: true });
                }
            } catch (e) {
                console.log(e);
                db.collection("downloadFailure").insertOne({ "type": "Abs", "url": s });
            }
        }));
    };
    //#endregion

    //#region connect
    let client = await mongo.connect();
    let db = client.db("arXivAid");
    mongo.ensureCollections(db, ["information", "downloadFailure"]);
    //#endregion

    //#region re-download the failed
    try {
        let docs = await db.collection("downloadFailure").find({}).toArray(); // TODO: use cursor instead
        for (doc in docs) {
            let arr;
            switch (doc.type) {
                case "Contents":
                    arr = await spider.visitContents(doc.url, doc.skip);
                    Promise.all([db.collection("downloadFailure").deleteOne(doc), makeAbsPromises(arr)]);
                    break;
                case "New":
                    arr = await spider.visitNew(doc.url);
                    Promise.all([db.collection("downloadFailure").deleteOne(doc), makeAbsPromises(arr)]);
                    break;
                case "Abs":
                    let info = await spider.visitAbs(doc.url);
                    if (info !== {}) {
                        console.log(info.title);
                        let query = { // maybe too much
                            "title": info.title,
                            "id": info.id,
                            "authors": info.authors,
                            "submit": info.submit,
                            "revise": {
                                "$gt": info.revise
                            }
                        };
                        db.collection("information").updateOne(query, info, { upsert: true });
                    }
                    db.collection("downloadFailure").deleteOne(doc);
                    break;
                case "Download":
                    await spider.getFile(doc.link, "./download/" + doc.id + ".pdf");
                    db.collection("information").findOneAndUpdate(doc, { "downloaded": true });
                    db.collection("downloadFailure").deleteOne(doc);
                    break;
            }
        }
    } catch (e) {
        console.log(e);
    }
    //#endregion

    //#region update
    try {
        let arr = await spider.visitNew(contentsUrl, data.update);
        if (arr.length) {
            data.update = Date.now();
            let jsonstr = JSON.stringify(data, undefined, 4);
            fs.writeFile('./data.json', jsonstr, async function (e) {
                if (e) {
                    throw e;
                } else {
                    makeAbsPromises(arr);
                }
            });
        }
    } catch (e) {
        console.log(e);
        db.collection("downloadFailure").insertOne({ "type": "New", "url": contentsUrl });
    }
    //#endregion
}

main();