'use strict';

// Object
let cheerio = require("cheerio");
let http = require("http");
let https = require("https");

// Function
let randomHeader = require("./randomHeader.js");

// data
let regDateTime = /\w\w\w,? +\d+ \w\w\w \d\d\d\d \d\d:\d\d:\d\d/;
let regDate = /\w\w\w,? +\d+ \w\w\w \d\d/g;
let regItem = /\[(\d+)]/;
let regSeperator = /\W+/;

let domain = "export.arxiv.org";

let urlCon = function (b) { // TODO: not perfected
    if (b.substr(0, 4) === "http") {
        return b;
    } else {
        return "https://" + domain + b;
    }
};

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
        if (result && result.length >= 2) {
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

let visitNew = async function (url, datetime) {
    let data = await get(url);
    let $ = cheerio.load(data);
    let dateline = $("#dlpage > div.list-dateline")[0];
    let ret = [];

    if (dateline) {
        let result = dateline.firstChild.data.match(regDate);

        if (result && result.length === 3) {
            let date = new Date(result[2]);
            if (!datetime || date > new Date(datetime)) {
                $("a[title='Abstract']").each(function (i, item) {
                    ret.push(urlCon(item.attribs.href));
                });
            }
        }
    }

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
        ret.id = id.firstChild.data;
    }

    let catagory = $("div.subheader > h1")[0];
    if (catagory) {
        ret.catagory = catagory.firstChild.data;
        if (ret.catagory !== "Computer Science > Artificial Intelligence") {
            return {};
        }
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
        for (let item of history.children) {
            if (item.type === "text") {
                let result = item.data.match(regDateTime);
                if (result && result.length >= 1) {
                    let date = new Date(result[0]);
                    if (!hasSubmit) {
                        ret.submit = date;
                        hasSubmit = true;
                    }
                    ret.revise = date;
                }
            }
        }
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

exports.get = get; // Exposed for debug
exports.visitNew = visitNew;
exports.visitContents = visitContents;
exports.visitAbs = visitAbs;