'use strict';

let fs = require("fs");

let mongo = require("../aid/mongo.js");
let spider = require("../aid/spider.js");

let status = require("./status.json");

const contentsUrl = "https://export.arxiv.org/list/cs.AI/new";

let main = async function () {

    //#region makeAbsPromises()
    let makeAbsPromises = function (arr) {
        return Promise.all(arr.map(async (s) => {
            try {
                let info = await spider.visitAbs(doc.url);
                if (info !== {} && info.id) {
                    console.log(info.title);
                    let filename = info.id.split(":").pop() + ".pdf";
                    try {
                        await spider.getFile(filename, info.link);
                        console.log("PDF: " + info.title);
                        info.filename = filename;
                    } catch (e) {
                        console.log(e);
                        let doc = { "type": "Download", "link": info.link, "filename": filename };
                        db.collection("downloadFailure").updateOne(doc, { "$set": doc }, { "upsert": true });
                    }
                    let query = {
                        "id": info.id
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
                case "Abs":
                    let info = await spider.visitAbs(doc.url);
                    if (info !== {} && info.id) {
                        console.log(info.title);
                        let filename = info.id.split(":").pop() + ".pdf";
                        try {
                            await spider.getFile(filename, info.link);
                            console.log("PDF: " + info.title);
                            info.filename = filename;
                        } catch (e) {
                            console.log(e);
                            let doc = { "type": "Download", "link": info.link, "filename": filename };
                            db.collection("downloadFailure").updateOne(doc, { "$set": doc }, { "upsert": true });
                        }
                        let query = { // what shall I query?
                            "id": info.id
                        };
                        db.collection("information").updateOne(query, { "$set": info }, { upsert: true }); // TODO: ! if revise > today, it would be upserted
                        // to solve it I gave up revise
                        
                        // let query = {
                        //     "id": info.id
                        // };
                        // let doc = await db.collection("information").findOne(query);
                        // if (doc) {
                        //     db.collection("information").updateOne(doc, info);
                        // } else {
                        //     db.collection("information").insertOne(info); // !
                        // }
                    }
                    db.collection("downloadFailure").deleteOne(doc);
                    break;
                case "Download":
                    await spider.getFile(doc.filename, doc.link);
                    console.log(doc.filename);
                    db.collection("information").updateOne({ "link": doc.link }, { "$set": { "filename": doc.filename }});
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
            fs.writeFile('./status.json', jsonstr, async function (e) {
                if (e) {
                    throw e;
                } else {
                    makeAbsPromises(arr);
                }
            });
        }
    } catch (e) {
        console.log(e);
        let doc = { "type": "New", "url": contentsUrl };
        db.collection("downloadFailure").updateOne(doc, doc, { "upsert": true });
    }
    //#endregion
}

main();