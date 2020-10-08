'use strict';

let WebSocket = require("ws");
let superagent = require("superagent");

let data = require("../config/data.json")

let printObj = function (obj) {
    let text = (obj.title.length > 50 ? obj.title.substr(0, 47) + "..." : obj.title);
    text += " (" + obj.id + ")\n";
    text += obj.aidLink ? obj.aidLink + "\n" : "";
    //text += "\n";
    return text;
}

const MAX_LENGTH = 850;

let main = async function () {
    console.log("Mirai.");
    let auth = await superagent.post(data.miraiUrl + "/auth").send({ "authKey": data.authKey });
    console.log("Auth.");
    if (auth.body.code === 0) {
        let verify = await superagent.post(data.miraiUrl + "/verify").send({ "sessionKey": auth.body.session, "qq": data.qq });
        console.log("Verify.");
        if (verify.body.code === 0) {
            let ws = new WebSocket(data.miraiUrl.replace("http", "ws") + "/message?sessionKey=" + auth.body.session);
            console.log("WS connection made.");
            ws.on("message", async (msg) => {
                msg = JSON.parse(msg);
                if (msg.type === "FriendMessage") {
                    for (let msgObj of msg.messageChain) {
                        if (msgObj.type === "Plain") {
                            let result = await superagent
                                .get("http://localhost:" + data.port + "?" + msgObj.text.split("\n").join("&"))
                                .timeout({ "response": 5000 });
                            if (typeof result.body === "object") {
                                let text = [""];
                                if (result.body.length >= 1) {
                                    let i = 0;
                                    for (let doc of result.body) {
                                        let temp =  printObj(doc);
                                        if (text[i].length + temp.length > MAX_LENGTH) {
                                            text[i] = text[i].trim();
                                            i++;
                                            text[i] = "";
                                        }
                                        text[i] += temp;
                                    }
                                }
                                if (text[0] !== "") {
                                    for (let t of text) {
                                        try {
                                            let response = await superagent.post(data.miraiUrl + "/sendFriendMessage").send({
                                                "sessionKey": auth.body.session,
                                                "target": msg.sender.id,
                                                "messageChain": [{
                                                    "type": "Plain", "text": t
                                                }]
                                            });
                                            if (!response.body || response.body.msg !== "success") {
                                                console.log("Sending failed.");
                                            }
                                        } catch (e) {
                                            console.log(e);
                                        }
                                    }
                                } else {
                                    try {
                                        let response = await superagent.post(data.miraiUrl + "/sendFriendMessage").send({
                                            "sessionKey": auth.body.session,
                                            "target": msg.sender.id,
                                            "messageChain": [{
                                                "type": "Plain", "text": "No match."
                                            }]
                                        });
                                        if (!response.body || response.body.msg !== "success") {
                                            console.log("Sending failed.");
                                        }
                                    } catch (e) {
                                        console.log(e);
                                    }
                                }
                            }
                            break;
                        }
                    }
                } // else if
            });
        } else if (verify.body.code === 1) {
            console.log("Haven't login.")
        }
    } else {
        console.log("Wrong authKey.");
    }
}

main();