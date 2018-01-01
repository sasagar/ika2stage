"use strict";
const https = require('https');

const Alexa = require('alexa-sdk');


// Lambda関数のメイン処理
exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context); // Alexa SDKのインスタンス生成
    alexa.appId = process.env.ALEXA_APPLICATION_ID;
    alexa.registerHandlers(handlers); // ハンドラの登録
    alexa.execute(); // インスタンスの実行
};

var handlers = {
    // インテントに紐付かないリクエスト
    'LaunchRequest': function() {
        this.emit('AMAZON.HelpIntent'); // AMAZON.HelpIntentの呼び出し
    },
    // スキルの使い方を尋ねるインテント
    'AMAZON.HelpIntent': function() {
        this.emit(':tell', '今のスプラトゥーン2のステージをお調べします。' +
            'たとえば、「イカ ツー で、今のガチマッチのステージを教えて」、と聞いて下さい。');
    },
    // 対話モデルで定義した、スキル実行するインテント
    'GetStageIntent': function() {
        var rule = this.event.request.intent.slots.Rule.value; // スロットRuleを参照
        var timing = this.event.request.intent.slots.Timing.value; // スロットTimingを参照
        if (timing === undefined) {
            timing = "今";
        }

        //var message = 'それでは' + timing + 'の' + rule + 'のステージをお伝えします。'; // 応答メッセージ文字列の作成
        var message = '';
        var cardMessage = '';
        var cardTitle = '';

        // ここからAPI叩く準備
        // まずはAPI用に変数置き換え用の配列を準備
        var apiRule = {
            "サーモンラン": "coop",
            "レギュラーマッチ": "regular",
            "ガチマッチ": "gachi",
            "リーグマッチ": "league"
        };
        var apiTiming = {
            "今": "now",
            "次": "next"
        };

        // サーモンランの場合
        if (apiRule[rule] == "coop") {
            const options = {
                protocol: 'https:',
                host: 'spla2.yuu26.com',
                path: '/' + apiRule[rule] + '/schedule',
                method: 'GET',
                headers: {
                    'User-Agent': 'Ika2Stage/1.0Beta (Twitter:@sasagawaki)'
                }
            };


            // APIから情報を取得
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                    //console.log(data)
                });
                res.on('end', () => {
                    var json = JSON.parse(data);
                    var ikaResult1 = json.result[0];
                    var ikaResult2 = json.result[1];
                    var flag = 0;
                    var now = parseInt(getNow().getTime() / 1000)

                    if (now >= ikaResult1.start_t && now <= ikaResult1.end_t) {
                        flag = 1;
                    }
                    //console.log(ikaResult1);

                    if (flag) {
                        if (timing == "今") {
                            var salmonResult = ikaResult1;

                            // 開催時間などの情報をまとめる
                            var start = new Date(salmonResult.start_t * 1000 + 32400000);
                            var end = new Date(salmonResult.end_t * 1000 + 32400000);

                            var start_time = {
                                "month": start.getMonth() + 1,
                                "date": start.getDate(),
                                "hour": start.getHours()
                            };
                            var end_time = {
                                "month": end.getMonth() + 1,
                                "date": end.getDate(),
                                "hour": end.getHours()
                            };

                            var comingMessage = getSalmonDuration(salmonResult.end_t + 32400, now, "end");

                            var timeMessage = "<p>シフトの時刻は、" + end_time.month + "月" + end_time.date + "日" + end_time.hour + "時までで、";
                            var cardTimeMessage = "シフト:\n ～ " + end_time.month + "月 " + end_time.date + "日 " + end_time.hour + ":00\n";
                            cardTitle = '今の' + rule;
                        }
                        else {
                            var salmonResult = ikaResult2;

                            // 開催時間などの情報をまとめる
                            var start = new Date(salmonResult.start_t * 1000 + 32400000);
                            var end = new Date(salmonResult.end_t * 1000 + 32400000);

                            var start_time = {
                                "month": start.getMonth() + 1,
                                "date": start.getDate(),
                                "hour": start.getHours()
                            };
                            var end_time = {
                                "month": end.getMonth() + 1,
                                "date": end.getDate(),
                                "hour": end.getHours()
                            };

                            var comingMessage = getSalmonDuration(salmonResult.start_t + 32400, now, "start");

                            var timeMessage = "<p>シフトの時刻は、" + start_time.month + "月" + start_time.date + "日" + start_time.hour + "時から、" + end_time.month + "月" + end_time.date + "日" + end_time.hour + "時で、";
                            var cardTimeMessage = "シフト:\n " + start_time.month + "月 " + start_time.date + "日 " + start_time.hour + ":00 ～ " + end_time.month + "月 " + end_time.date + "日 " + end_time.hour + ":00\n";
                            cardTitle = '次の' + rule;
                        }
                        message += '<p>' + timing + 'の' + rule + '<break time="2ms" />のステージは、' + salmonResult.stage.name + '<break time="2ms" />です。</p>';
                        message += timeMessage;
                        var cardStageMessage = "\n---\nステージ: \n" + salmonResult.stage.name + '\n';
                        var cardWeaponMessage = "\n---\n支給ブキ: \n";
                        var cardImage = {
                            'smallImageUrl': salmonResult.stage.image,
                            'largeImageUrl': salmonResult.stage.image
                        };

                        // 支給ブキ
                        message += '支給ブキは、';
                        for (var i in salmonResult.weapons) {
                            if (i > 0) {
                                message += '<break time="150ms" />';
                                cardWeaponMessage += ' ／ ';
                            }
                            message += salmonResult.weapons[i].name;
                            cardWeaponMessage += salmonResult.weapons[i].name;
                        }
                        message += 'です。</p>';
                        message += comingMessage;

                        //console.log(message);
                        cardMessage = cardTimeMessage + cardStageMessage + cardWeaponMessage;
                        this.emit(':tellWithCard', message, cardTitle, cardMessage, cardImage); // レスポンスの生成
                    }
                    else {
                        var salmonResult = ikaResult1;
                        // 開催時間などの情報をまとめる
                        var start = new Date(salmonResult.start_t * 1000 + 32400000);
                        var end = new Date(salmonResult.end_t * 1000 + 32400000);

                        var start_time = {
                            "month": start.getMonth() + 1,
                            "date": start.getDate(),
                            "hour": start.getHours()
                        };
                        var end_time = {
                            "month": end.getMonth() + 1,
                            "date": end.getDate(),
                            "hour": end.getHours()
                        };

                        var comingMessage = getSalmonDuration(salmonResult.start_t + 32400, now, "start");

                        var timeMessage = "<p>シフトの時刻は、" + start_time.month + "月" + start_time.date + "日" + start_time.hour + "時から。" + end_time.month + "月" + end_time.date + "日" + end_time.hour + "時で、";
                        var cardTimeMessage = "シフト:\n " + start_time.month + "月 " + start_time.date + "日 " + start_time.hour + ":00 ～ " + end_time.month + "月 " + end_time.date + "日 " + end_time.hour + ":00\n";
                        cardTitle = '直近の' + rule;
                        var cardStageMessage = "\n---\nステージ: \n" + salmonResult.stage.name + '\n';
                        var cardWeaponMessage = "\n---\n支給ブキ: \n";
                        var cardImage = {
                            'smallImageUrl': salmonResult.stage.image,
                            'largeImageUrl': salmonResult.stage.image
                        };

                        if (timing == "今") {
                            message += '<p>現在進行中の' + rule + 'シフトは、ありません。直近で募集されるシフトをお伝えします。</p>';
                        }
                        message += '<p>ステージは、' + salmonResult.stage.name + '<break time="5ms" />です。</p>';
                        message += timeMessage;

                        // 支給ブキ
                        message += '支給ブキは、';
                        for (var i in salmonResult.weapons) {
                            if (i > 0) {
                                message += '<break time="150ms" />';
                                cardWeaponMessage += ' ／ ';
                            }
                            message += salmonResult.weapons[i].name;
                            cardWeaponMessage += salmonResult.weapons[i].name;
                        }
                        message += 'です。</p>';
                        message += comingMessage;
                        cardMessage = cardTimeMessage + cardStageMessage + cardWeaponMessage;
                        //console.log(message);
                        this.emit(':tellWithCard', message, cardTitle, cardMessage, cardImage); // レスポンスの生成
                    }
                });
            })

            req.on('error', (e) => {
                console.error('problem with request: ' + e.message);
                this.emit(':tell', 'エラーが発生しました。申し訳ありませんが、もう一度お試し下さい。エラータイプはSです。');
            });

            req.end();

        }
        // サーモンラン以外の場合
        else if (apiRule[rule] == "regular" || apiRule[rule] == "gachi" || apiRule[rule] == "league") {
            const requestId = this.event.request.requestId;
            const token = this.event.context.System.apiAccessToken;
            const endpoint = this.event.context.System.apiEndpoint;
            const ds = new Alexa.services.DirectiveService();

            const directive = new Alexa.directives.VoicePlayerSpeakDirective(requestId, "お調べします。");
            const progressiveResponse = ds.enqueue(directive, endpoint, token)
                .catch((err) => {
                    // catch API errors so skill processing an continue
            	console.error('problem with request: ' + err.message);
            	this.emit(':tell', 'エラーが発生しました。申し訳ありませんが、もう一度お試し下さい。エラータイプはPromiseです。');
                });

            const options = {
                protocol: 'https:',
                host: 'spla2.yuu26.com',
                path: '/' + apiRule[rule] + '/' + apiTiming[timing],
                method: 'GET',
                headers: {
                    'User-Agent': 'Ika2Stage/1.0Beta (Twitter:@sasagawaki)'
                }
            };

            Promise.resolve()
                .then(() => { getFromAPI(options) })
                .then((result) => { lobbyStage(result, timing, rule) })
                .then((message) => {
                    this.response.speak(message);
                    this.emit(':responseReady');
                })
                .catch((error) => {console.error(error)});
        }
        // 振分に失敗した場合
        else {
            this.emit(':tell', '何らかのエラーが発生しました。申し訳ありませんが、もう一度お試し下さい。');
        }



        //console.log(message);
    }
};

function getFromAPI(options) {
    return new Promise(function(resolve, reject) {
        console.log('getFromAPI');

        var jsonResult;

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                var json = JSON.parse(data);
                jsonResult = json.result[0];
            });
        });

        req.on('error', (e) => {
            console.error('problem with request: ' + e.message);
            this.emit(':tell', 'APIエラーが発生しました。申し訳ありませんが、もう一度お試し下さい。続けて発生する場合には、開発元へご連絡下さい。');
            reject(new Error('error'));
        });
        req.end();

        //console.log(jsonResult);
        resolve(jsonResult);
    });
}

function lobbyStage(json, timing, rule) {
    console.log('lobbyStage');
    console.log(json);
    return new Promise(function(resolve, reject) {
        var now = parseInt(getNow().getTime() / 1000)
        var ikaResult = json;

        var message = '<p>';
        message += timing + 'の' + rule + 'は' + ikaResult.rule + 'です。</p>';
        message += '<p>ステージは、';
        for (var i in ikaResult.maps) {
            if (i > 0) {
                message += '、';
            }
            message += ikaResult.maps[i];
        }
        message += 'です。</p>';

        if (timing == '今') {
            var durationMessage = getButtleDuration(ikaResult.end_t + 32400, now, 'end');
        }
        else {
            var durationMessage = getButtleDuration(ikaResult.start_t + 32400, now, 'start');
        }

        message += durationMessage;
        resolve(message);
    });
}

function getNow() {
    // 現在時刻の取得
    var dt = new Date();

    // 日本の時間に修正
    dt.setTime(dt.getTime() + 32400000); // 1000 * 60 * 60 * 9(hour)

    // 日付を数字として取り出す
    var year = dt.getFullYear();
    var month = dt.getMonth() + 1;
    var day = dt.getDate();
    var hour = dt.getHours();
    var min = dt.getMinutes()

    // 出力
    return dt;
    //console.log('Received event:' + Date_now);
}

function getSalmonDuration(targetVal, nowVal, checkVal) {
    // 開始までか、終了までか。
    if (checkVal == 'start') {
        var durationMessage = '始まります。';
    }
    else {
        var durationMessage = '終了します。';
    }
    // 開催時期をまとめる
    var comingInTime = targetVal - nowVal;
    var comingInTime_d = Math.floor(comingInTime / (24 * 60 * 60));
    var comingInTime_h = Math.floor(comingInTime / (60 * 60));
    var comingInTime_m = Math.floor(comingInTime / 60);

    if (comingInTime_d > 0) {
        var comingMessage = '<p>このシフトは、およそ' + comingInTime_d + '日後に' + durationMessage + '</p>';
    }
    else if (comingInTime_h > 0) {
        var comingMessage = '<p>このシフトは、およそ' + comingInTime_h + '時間後に' + durationMessage + '</p>';
    }
    else {
        var comingMessage = '<p>このシフトは、およそ' + comingInTime_m + '分後に' + durationMessage + '</p>';
    }

    return comingMessage;
}

function getButtleDuration(targetVal, nowVal, checkVal) {
    var targetDate = new Date(targetVal * 1000);

    var targetTime = {
        "month": targetDate.getMonth() + 1,
        "date": targetDate.getDate(),
        "hour": targetDate.getHours()
    };
    // 開始までか、終了までか。
    if (checkVal == 'start') {
        var durationMessage1 = 'から';
        var durationMessage2 = '更新され、始まります。';
    }
    else {
        var durationMessage1 = 'まで';
        var durationMessage2 = '更新され、終了します。';
    }
    // 開催時期をまとめる
    var comingInTime = targetVal - nowVal;
    var comingInTime_d = Math.floor(comingInTime / (24 * 60 * 60));
    var comingInTime_h = Math.floor(comingInTime / (60 * 60));
    var comingInTime_m = Math.floor(comingInTime / 60);

    if (comingInTime_d > 0) {
        var comingMessage = '<p>このステージは、' + targetTime.hour + '時' + durationMessage1 + 'ですので、およそ' + comingInTime_d + '日後に' + durationMessage2 + '</p>';
    }
    else if (comingInTime_h > 0) {
        var comingMessage = '<p>このステージは、' + targetTime.hour + '時' + durationMessage1 + 'ですので、およそ' + comingInTime_h + '時間後に' + durationMessage2 + '</p>';
    }
    else {
        var comingMessage = '<p>このステージは、' + targetTime.hour + '時' + durationMessage1 + 'ですので、およそ' + comingInTime_m + '分後に' + durationMessage2 + '</p>';
    }

    return comingMessage;
}
