'use strict';

const spider = require("./spider.js");

const contentsUrl = "https://arxiv.org/list/cs.AI/20";

// var makeUrl = function (url, skip, show) {
//     return url + "?skip=" + skip + "&show=" + show;
// }

spider.parseContents(contentsUrl, function (e, arr) {
    if (e != null) {
        console.log(e);
    } else {
        for (let s of arr) {
            spider.parseAbs(s, function(e, info) {
                console.log(s);
                if (e != null) {
                    console.log(e);
                } else {
                    console.log(info);
                }
            });
        }
    }
});