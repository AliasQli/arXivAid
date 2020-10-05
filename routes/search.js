let express = require("express");

let regSeperator = /\W+/;

let options = {
    "projection": {
        "_id": 0,
        "title": 1,
        "authors": 1,
        "submit": 1,
        "revise": 1,
        "intro": 1,
        "id": 1
    }
};

let makeRouter = function (db) {
    let infoCollection = db.collection("information");

    let router = express.Router();

    router.get("/", async function (req, res) {

        let query = {};
        if (req.query.titlereg) {
            query.title = { "$regex": req.query.titlereg };
            if (req.query.titleregopt) {
                query.title.$options = req.query.titleregopt;
            }
        } else if (req.query.title) {
            query.titleKWD = { "$all": req.query.title.toLowerCase().split(regSeperator) };
        }
        if (req.query.authors) {
            query.authorsKWD = { "$all": req.query.authors.toLowerCase().split(regSeperator) };
        }
        if (req.query.introreg) {
            query.intro = { "$regex": req.query.introreg };
            if (req.query.introregopt) {
                query.intro.$options = req.query.introregopt;
            }
        } else if (req.query.intro) {
            query.introKWD = { "$all": req.query.intro.toLowerCase().split(regSeperator) };
        }
        if (req.query.submit) {
            let dates = req.query.submit.split("~").map((s) => s.trim());
            if (dates.length === 1) {
                query.submit = new Date(dates[0]);
            } else {
                query.submit = {
                    "$gte": new Date(dates[0]),
                    "$lte": new Date(dates[1])
                };
            }
        }
        if (req.query.revise) {
            let dates = req.query.revise.split("~").map((s) => s.trim());
            if (dates.length === 1) {
                query.revise = new Date(dates[0]);
            } else {
                query.revise = {
                    "$gte": new Date(dates[0]),
                    "$lte": new Date(dates[1])
                };
            }
        }

        let docs = await infoCollection.find(query, options).sort({ "revise": -1 }).limit(100).toArray(); // TODO: may use cursor instead
        docs.map((doc) => {
            if (doc.downloaded) {
                doc.aidLink = "xxxxx/" + doc.id + ".pdf"; // xxxxx -> domain name
            }
            doc.download = undefined;
        });
        res.send(docs);
        res.end();
    });

    return router;
};

exports.makeRouter = makeRouter;