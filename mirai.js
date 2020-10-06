let WebSocket = require("ws");
let superagent = require("superagent");
let data = require("./data.json")

let printObj = function (obj) {
    let text = "";
    for (k in obj) {
        text += k + ": " + obj[k] + "\n";
    }
    return text.trim();
}

let main = async function () {
    let auth = await superagent.post(data.miraiUrl + "/auth").send({ "authKey": data.authKey });
    if (auth.code === 0) {
        let verify = await superagent.post(data.miraiUrl + "/verify").send({ "session": auth.session, "qq": data.qq });
        if (verify.code === 0) {
            let ws = new WebSocket(data.miraiUrl.replace("http", "ws") + "/message?sessionKey=" + auth.session);
            ws.on("message", async (msg) => {
                msg = JSON.parse(msg);
                if (msg.type === "FriendMessage") {
                    for (msgObj of msg.messageChain) {
                        if (msgObj.type === "Plain") {
                            let result = await superagent
                                .get("http://localhost:" + data.port + "?" + msgObj.text.split("\n").join("&"))
                                .timeout({ "response": 5000 });
                            let text = "";
                            if (typeof result === "object") {
                                for (doc of result) {
                                    text += printObj(doc);
                                }
                                let response = await superagent.post(data.miraiUrl + "/sendFriendMessage").send({
                                    "sessionKey": auth.session,
                                    "target": msg.sender.id,
                                    "messageChain": [
                                        { "type": "Plain", "text": text || "No Match" }
                                    ]
                                });
                                if (!response || response.msg !== "success") {
                                    console.log("Sending failed.");
                                }
                            }
                            break;
                        }
                    }
                } // else if
            });
        } else if (verify.code === 1) {
            console.log("Haven't login.")
        }
    } else {
        console.log("Wrong authKey.");
    }
}
