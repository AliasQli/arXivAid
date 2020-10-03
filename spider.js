'use strict';

// Object
let cheerio = require("cheerio");
let superagent = require("superagent");
let http = require("http");
let https = require("https");

// Function
let randomHeader = require("./randomHeader.js");
//const { resolve } = require("path");

// data
//let regDate = /([\d\d|\d]) (\w\w\w) (2020)/;
let regDateGMT = /\w\w\w, \d+ \w\w\w \d\d\d\d \d\d:\d\d:\d\d GMT/;
let regItem = /\[(\d+)]/;
let regVersion = /\[v(\d+)]/;
let regSeperator = /\W+/;

let domain = "export.arxiv.org";

let urlCon = function (b) { // TODO: not perfected
    if (b.substr(0, 4) === "http") {
        return b;
    } else {
        return "https://" + domain + b;
    }
};

// let get = async function (url, query = null, deadline = 60000) {
//     return new Promise((resolve, reject) => {
//         superagent.get(url)
//             .retry(3)
//             .query(query)
//             .set({ "User-Agent": randomHeader.userAgent() }) //, "Host": randomHeader.host() })
//             .timeout({ response: 10000, deadline: deadline })
//             .end((e, res) => {
//                 if (e) {
//                     reject(e);
//                 } else {
//                     resolve(res.text);
//                 }
//             });
//     });
// };

let get = function (url, timeout = 10000) {

    return new Promise((resolve, reject) => {
        let sender;
        if (url.substr(0, 8) === "https://") {
            sender = https;
        } else if (url.substr(0, 7) === "http://") {
            sender = http;
        } else {
            reject(new Error("Invalid Url."));
        }

        let options = {
            "timeout": timeout,
            "headers": {
                "user-agent": randomHeader.userAgent()
            }
        };

        sender.get(url, options, (res) => {
            let { statusCode } = res;

            if (statusCode < 200 || statusCode >= 300) {
                res.resume();
                reject(new Error("Http status " + statusCode + "."));
            }

            res.setEncoding("utf8");
            let data = "";
            res.on("data", (chunk) => { data += chunk; });
            res.on("end", () => {
                resolve(data);
            });
        }).on("error", (e) => { reject(e); });
    });
};

let visitContents = async function (url, skip = 0, show = 100) {
    let data = await get(url + "?skip=" + skip + "&show=" + show);
    let $ = cheerio.load(data);
    let fst = $("#dlpage > dl > dt:first-child > a")[0];
    let ret = [];

    if (fst) {
        let result = fst.firstChild.data.match(regItem);
        if (result) {
            let fstItem = parseInt(result[1]);
            if (fstItem < skip) {
                return null;
            }
        }
    }

    $("a[title='Abstract']").each(function (i, item) {
        ret.push(urlCon(item.attribs.href));
    });

    return ret;
};

let visitAbs = async function (url) {

    let data = await get(url);
    let $ = cheerio.load(data);
    let ret = {};

    let title = $("h1.title")[0];
    if (title) {
        let t = title.lastChild.data;
        ret.title = t.replace("\n", " ").trim().replace("  ", " ");
        ret.titleKWD = ret.title.toLowerCase().split(regSeperator);
    }

    let id = $("tr:contains(Cite as) > td > span.arxivid > a")[0];
    if (id) {
        ret["id"] = id.firstChild.data;
    }

    let authors = $("div.authors > a");
    ret.authors = [];
    ret.authorsKWD = [];
    authors.each((_, e) => {
        ret.authors.push(e.firstChild.data);
    });
    for (let e of ret.authors) {
        ret.authorsKWD = ret.authorsKWD.concat(e.toLowerCase().split(regSeperator));
    }

    let history = $("div.submission-history")[0];
    if (history) {
        let hasSubmit = false;
        let version = 1;
        for (let item of history.children) {
            if (item.type === "text") {
                let result = item.data.match(regDateGMT);
                if (result) {
                    let date = new Date(result[0]);
                    if (!hasSubmit) {
                        ret.submit = date;
                        hasSubmit = true;
                    }
                    ret.revise = date;
                }
            } else if (item.name === "b" && item.firstChild.type === "text") {
                let result = item.firstChild.data.match(regVersion);
                if (result) {
                    version = parseInt(result[1]);
                }
            }
        }
        ret.version = version;
    }

    let download = $("div.extra-services > div.full-text > ul > li > a")[0];
    if (download) {
        ret.download = urlCon(download.attribs.href);
    }

    let intro = $("blockquote.abstract")[0];
    if (intro) {
        ret.intro = intro.lastChild.data.replace("\n", " ").trim();
        ret.introKWD = ret.intro.toLowerCase().split(regSeperator);
    }

    return ret;
};

exports.visitContents = visitContents;
exports.visitAbs = visitAbs;