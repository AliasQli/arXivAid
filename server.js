'use strict';

const e = require("express");
let express = require("express");

let mongo = require("./mongo.js");
let search = require("./routes/search.js");

let main = async function () {
    let client = await mongo.connect();
    let db = client.db("information");
    await mongo.ensureCollections(db, ["information"]);

    let server = express();

    server.get("/*", function (req, res, next) {
        console.log(req.path);
        next();
    });

    server.use("/", search.makeRouter(db));

    server.use("/download", express.static("./download"));

    server.listen(3000, () => {
        console.log("Server listening.");
    });
}

main();

