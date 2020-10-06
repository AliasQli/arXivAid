'use strict';

let express = require("express");

let mongo = require("./mongo.js");
let search = require("./routes/search.js");

let data = require("./data.json");

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

    server.listen(data.port, () => {
        console.log("Server listening at port " + data.port + ".");
    });
}

main();