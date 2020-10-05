'use strict';

let mongo = require("./mongo.js");
let spider = require("./spider.js");
let fs = require("fs");
let path = require("path");

let data = require("./data.json");

const contentsUrl = "https://export.arxiv.org/list/cs.AI/"; // reverse the order if possible

let n2s2 =  function (n) {
    if (n === 20) {
        return "recent";
    }else{
        let s = n.toString();
        return s.length === 1 ? "0" + s : s;
    }
    
}

let main = async function () {
    let client = await mongo.connect();
    let db = client.db("arXivAid");
    mongo.initCollections(db, ["information", "downloadFailure"]);

    let i = 0;

    let makeVisit = async function () {
        while (true){
            let year = 20;
            while (true) 
            {
                console.log("contents:" + i);
                let skip = 100 * i;
                try {
                    let arr = await spider.visitContents(contentsUrl + n2s2(year), skip);
                    if (arr.length === 0) {
                        break;
                    }
                    // I require specifically that the 100 requests be dealt with 
                    // before the next page of the contents is visited
                    // so the queue won't be too long
                    await Promise.all(arr.map(async (s) => { 
                        try {
                            let info = await spider.visitAbs(s);
                            console.log(info.title);
                            info.downloaded = false;
                            if (year === 20) {
                                try {   
                                    await spider.getFile(info.link, "./download/" + info.id + ".pdf");
                                    info.downloaded = true;
                                } catch (e) {
                                    console.log(e);
                                    db.collection("downloadFailure").insertOne({ "type": "Download", "url": info.link, "id": info.id });
                                }
                            }
                            db.collection("information").insertOne(info).then((res, e) => { console.log(e || "take in " + info.title); });
                        } catch (e) {
                            console.log(e);
                            db.collection("downloadFailure").insertOne({ "type": "Abs", "url": s });
                        }
                    }));
                } catch (e) {
                    console.log(e);
                    db.collection("downloadFailure").insertOne({ "type": "Contents", "url": contentsUrl, "skip": skip });
                }
                i++;
            }
            year--;
            if (year < 0) {
                year += 100;
            }
            if (year < 93 && year > 50) {
                break;
            }
        }
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