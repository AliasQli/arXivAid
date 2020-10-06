'use strict';

let mongo = require("./mongo.js");
let spider = require("./spider.js");
let fs = require("fs");

let data = require("./data.json");
let status = require("./status.json");

const contentsUrl = "https://export.arxiv.org/list/cs.AI/new";

let main = async function () {

    //#region makeAbsPromises()
    let makeAbsPromises = function (arr) {
        return Promise.all(arr.map(async (s) => {
            try {
                let info = await spider.visitAbs(doc.url);
                if (info !== {}) {
                    console.log(info.title);
                    let query = {
                        "id": info.id,
                        "submit": info.submit,
                        "revise": {
                            "$lt": info.revise // newer than the current version
                        }
                    };
                    db.collection("information").updateOne(query, { "$set": info }, { upsert: true });
                }
            } catch (e) {
                console.log(e);
                db.collection("downloadFailure").insertOne({ "type": "Abs", "link": s });
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
    let cursor = db.collection("downloadFailure").find({});
    let doc;
    while (doc = await cursor.next()) {
        try {
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
                case "Abs":                                     // TODO: download!
                    let info = await spider.visitAbs(doc.url);
                    if (info !== {}) {
                        console.log(info.title);
                        let query = { // what shall I query?
                            "id": info.id,
                            "submit": info.submit,
                            "revise": {
                                "$lt": info.revise // newer than the current version
                            }
                        };
                        db.collection("information").updateOne(query, { "$set": info }, { upsert: true });
                    }
                    db.collection("downloadFailure").deleteOne(doc);
                    break;
                case "Download":
                    await spider.getFile(doc.filename, doc.link);
                    console.log(doc.filename);
                    db.collection("information").findOneAndUpdate({ "link": doc.link }, { "$set": { "filename": doc.filename }});
                    db.collection("downloadFailure").deleteOne(doc);
                    break;
            }
        } catch (e) {
            console.log(e);
        }
    }


    //#endregion

    //#region update
    try {
        let arr = await spider.visitNew(contentsUrl, status.update);
        if (arr.length) {
            status.update = Date.now();
            let jsonstr = JSON.stringify(status, undefined, 4);
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