'use strict';

let fs = require("fs");

let mongo = require("../aid/mongo.js");
let spider = require("../aid/spider.js");

let status = require("./status.json");

const contentsUrl = "https://export.arxiv.org/list/cs.AI/";

let n2s2 = function (n) {
    if (n === 20) {
        return "recent";
    } else {
        let s = n.toString();
        return s.length === 1 ? "0" + s : s;
    }

}

let main = async function () {
    let client = await mongo.connect();
    let db = client.db("arXivAid");
    mongo.ensureCollections(db, ["information", "downloadFailure"]);

    let makeVisit = async function () {
        while (true) {
            while (true) {
                try {
                    let arr = await spider.visitContents(contentsUrl + n2s2(status.year), status.skip);  // 2 contents visited at a time is the best (unsolved)
                    console.log("Contents: skip " + status.skip);
                    if (arr.length === 0) {
                        break;
                    }
                    // I require specifically that the 100 requests be dealt with 
                    // before the next page of the contents is visited
                    // so the queue won't be too long
                    await Promise.all(arr.map(async (s) => {
                        let download = status.year === 20;
                        try {
                            let info = await spider.visitAbs(s);
                            console.log("Abs: " + info.title);
                            if (download) {
                                let filename = info.id.split(":").pop() + ".pdf";
                                try {
                                    await spider.getFile(filename, info.link);
                                    console.log("PDF: " + info.title);
                                    info.filename = filename;
                                } catch (e) {
                                    console.log(e);
                                    let doc = { "type": "Download", "link": info.link, "filename": filename };
                                    await db.collection("downloadFailure").updateOne(doc, { "$set": doc }, { "upsert": true });
                                }
                            }
                            await db.collection("information").updateOne(info, { "$set": info }, { "upsert": true });
                        } catch (e) {
                            console.log(e);
                            let doc = { "type": "Abs", "link": s, "download": download };
                            await db.collection("downloadFailure").updateOne(doc, { "$set": doc }, { "upsert": true });
                        }
                    }));
                } catch (e) {
                    console.log(e);
                    let doc = { "type": "Contents", "link": contentsUrl, "skip": status.skip };
                    await db.collection("downloadFailure").updateOne(doc, { "$set": doc }, { "upsert": true });
                }
                status.skip += 100;
            }
            status.year--;
            if (status.year < 0) {
                status.year += 100;
            }
            if (status.year < 93 && status.year > 50) {
                break;
            }
        }
    };

    status.update = Date.now();
    let jsonstr = JSON.stringify(status, undefined, 4);
    fs.writeFile('./status.json', jsonstr, async function (e) {
        if (e) {
            throw e;
        } else {
            let safeVisit = async function () {
                try {
                    await makeVisit();
                    process.exit(1); // exit manually
                } catch (e) {
                    try {
                        // reconnect
                        try { client.close(); } catch { }
                        client = await mongo.connect();
                        db = client.db("arXivAid");
                        mongo.ensureCollections(db, ["information", "downloadFailure"]);
                        // do it again
                        safeVisit();
                    } catch (e) {
                        // cannot reconnect, write status to file and quit
                        let jsonstr = JSON.stringify(status, undefined, 4);
                        fs.writeFileAsync('./status.json', jsonstr);
                        process.exit(1);
                    }
                }
            }
            safeVisit();
        }
    });
}

main();