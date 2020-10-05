'use strict';

// Object
let cheerio = require("cheerio");
let http = require("http");
let https = require("https");
let superagent = require("superagent");
let fs = require("fs");
let path = require("path");
const { resolve } = require("path");

// Function
//let randomHeader = require("./randomHeader.js");

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

let queue = new Array();

let queueLen = function () {
    return queue.length;
}

setInterval(() => {
    if (queue.length !== 0) {
        let task = queue.shift();
        let req = superagent.get(task.url)
            .set("user-agent", "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 \
            (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36")
            .query(task.query)
            .retry(3)
            .timeout({"timeout": 10000});
        if (task.filename) {
            let writestream = fs.createWriteStream(task.filename);
            writestream.on("close", () => {
                task.resolve(); // maybe this works, however I can't test it now
            });
            writestream.on("error", (e) => {
                task.reject(e);
            })
            req.on("error", (e) => {
                task.resolve(e);
            })
            req.pipe(writestream);
        } else {
            req.end((e, res) => {
                e ? reject(e) : resolve(res,text);
            })
        }
        // let options = {
        //     "timeout": task.timeout,
        //     "headers": {
        //         "user-agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 \
        //             (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36"
        //     }
        // };
        // task.sender.get(task.url, options, (res) => {
        //     let { statusCode } = res;

        //     if (statusCode < 200 || statusCode >= 300) { // 302 found: moved temply to another url
        //         res.resume();
        //         task.reject(new Error("Http status " + statusCode + "."));
        //     }

        //     if (task.filename) {
        //         let writestream = fs.createWriteStream(task.filename);
        //         writestream.on("error", (e) => {
        //             task.reject(e);
        //         })
        //         res.on("data", (chunk) => {
        //             writestream.write(chunk);
        //         });
        //         res.on("end", () => {
        //             writestream.close();
        //             task.resolve();
        //         });
        //     } else {
        //         res.setEncoding("utf8");
        //         let data = "";
        //         res.on("data", (chunk) => {
        //             data += chunk;
        //         });
        //         res.on("end", () => {
        //             task.resolve(data);
        //         });
        //     }
        // }).on("error", (e) => { task.reject(e); });
    }
}, 15000);

let get = function (url, query, timeout = 10000) {

    return new Promise((resolve, reject) => {
        // let sender;
        // if (url.substr(0, 8) === "https://") {
        //     sender = https;
        // } else if (url.substr(0, 7) === "http://") {
        //     sender = http;
        // } else {
        //     reject(new Error("Invalid Url."));
        // }

        queue.push({
            "url": url,
            "query": query,
            "timeout": timeout,
            "resolve": resolve,
            "reject": reject
        });

    });
};

let getFile = function (url, query, filename, timeout = 10000) {

    return new Promise((resolve, reject) => {
        // let sender;
        // if (url.substr(0, 8) === "https://") {
        //     sender = https;
        // } else if (url.substr(0, 7) === "http://") {
        //     sender = http;
        // } else {
        //     reject(new Error("Invalid Url."));
        // }

        queue.push({
            "url": url,
            "query": query,
            "timeout": timeout,
            "filename": filename,
            "resolve": resolve,
            "reject": reject
        });
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
                    if (item.nextSibling.data && item.nextSibling.data.search("cross-list") === -1) {
                        ret.push(urlCon(item.attribs.href));
                    }
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

    let id = $("td.tablecell.arxivid > a")[0];
    if (id) {
        ret.id = id.firstChild.data;
    }

    let catagory = $("div.subheader > h1")[0];
    if (catagory) {
        ret.catagory = catagory.firstChild.data;
        // if (ret.catagory !== "Computer Science > Artificial Intelligence") {
        //     return {};
        // }
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

    let link = $("div.extra-services > div.full-text > ul > li > a")[0];
    if (link) {
        ret.link = urlCon(link.attribs.href);
    }

    let intro = $("blockquote.abstract")[0];
    if (intro) {
        ret.intro = intro.lastChild.data.replace("\n", " ").trim();
        ret.introKWD = ret.intro.toLowerCase().split(regSeperator);
    }

    return ret;
};

exports.get = get; // Exposed for debugging purposes
exports.getFile = getFile;
exports.queueLen = queueLen;
exports.visitNew = visitNew;
exports.visitContents = visitContents;
exports.visitAbs = visitAbs;