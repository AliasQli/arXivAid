const mongoUrl = "mongodb://localhost:27017";

let mongodb = require("mongodb");

let connect = async function () {
    let MongoClient = mongodb.MongoClient;
    let client = await MongoClient.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("DB connected.");
    return client;
};

let initCollections = async function (db, collections) {
    let init = async function (name) {
        let docs = await db.listCollections({ "name": name }).toArray();
        if (docs.length === 0) {
            db.createCollection(name);
        } else {
            db.collection(name).deleteMany({});
        }
    };
    await Promise.all(collections.map((c) => init(c)));
    console.log("Collections inited.");
};

let ensureCollections = async function (db, collections) {
    let ensure = async function (name) {
        let docs = await db.listCollections({ "name": name }).toArray();
        if (docs.length === 0) {
            db.createCollection(name);
        }
    };
    await Promise.all(collections.map((c) => ensure(c)));
    console.log("Collections ensured.");
};

exports.connect = connect; 
exports.initCollections = initCollections;
exports.ensureCollections = ensureCollections;