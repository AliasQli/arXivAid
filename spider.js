// Object
var cheerio = require("cheerio");
var superagent = require("superagent");

// Function
var userAgent = require("./userAgent.js");

// data
var regDate = /([\d\d|\d]) (\w\w\w) (2020)/;
var regDateUTC = /([\d\d|\d]) (\w\w\w) (2020) (\d\d):(\d\d):(\d\d) UTC/;
var domain = "arxiv.org";

var urlCon = function (b) { // TODO: not perfected
    if (b.substr(0, 4) == "http") {
        return b;
    } else {
        return "https://" + domain + b;
    }
}

var parseDate = function (result) { // TODO: revise
    var date = new Date();
    date.setDate(result[1]);
    switch (result[2]) {
        case "Jan": date.setMonth(0); break;
        case "Feb": date.setMonth(1); break;
        case "Mar": date.setMonth(2); break;
        case "Apr": date.setMonth(3); break;
        case "May": date.setMonth(4); break;
        case "Jun": date.setMonth(5); break;
        case "Jly": date.setMonth(6); break;
        case "Aug": date.setMonth(7); break;
        case "Sep": date.setMonth(8); break;
        case "Oct": date.setMonth(9); break;
        case "Nov": date.setMonth(10); break;
        case "Dec": date.setMonth(11); break;

    }
    date.setFullYear(result[3]);
    return date;
}

var download = function (url, callback) {
    superagent.get(url)
        .retry(3)
        .set({ "User-Agent": userAgent() })
        .timeout({ response: 10000, deadline: 60000 })
        .end((e, res) => {
            e != null ? callback(e, null) : callback(null, res.text);
        });
}

var parseContents = function (url, callback) {
    download(url, function (e, data) {
        if (e != null) {
            callback(e, null);
        } else {
            var $ = cheerio.load(data);
            var ret = [];

            $("a[title='Abstract']").each(function (i, item) {
                ret.push(urlCon(item.attribs.href));
            });

            callback(null, ret);
        }
    });
}

var parseAbs = function (url, callback) {
    download(url, function (e, data) {
        if (e != null) {
            callback(e, null);
        } else {
            var $ = cheerio.load(data);
            var ret = {};

            var title = $("h1.title")[0];
            if (title != undefined) {
                ret["title"] = title.lastChild.data;
            }

            var id = $("tr:contains(Cite as) td span.arxivid a")[0];
            if (id != undefined) {
                ret["id"] = id.firstChild.data;
            }

            var authors = $("div.authors a");
            ret["authors"] = [];
            authors.each((i, e) => {
                ret["authors"].push(e.firstChild.data);
            });

            var date = $("div.dateline")[0];
            if (date != undefined) {
                let i = 0;
                for (let item of date.children) {
                    if (item.type == "text") {
                        let result = regDate.exec(item.data);
                        if (result != null) {
                            if (i == 0) {
                                ret["submit"] = parseDate(result);
                                i++;
                            } else if (i == 1) {
                                ret["revise"] = parseDate(result);
                                break;
                            }
                        }
                    }
                }
            }

            var download = $("a.download-pdf")[0];
            if (download != undefined) {
                ret["download"] = urlCon(download.attribs.href);
            }

            callback(null, ret);
        }
    });
}

exports.parseContents = parseContents;
exports.parseAbs = parseAbs;