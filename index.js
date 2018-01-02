'use strict';
const request = require('request');

const Alexa = require('alexa-sdk');

// Lambda関数のメイン処理
exports.handler = function (event, context, callback) {
	var alexa = Alexa.handler(event, context); // Alexa SDKのインスタンス生成
	alexa.appId = process.env.ALEXA_APPLICATION_ID;
	alexa.registerHandlers(handlers); // ハンドラの登録
	alexa.execute(); // インスタンスの実行
};

var handlers = {
	// インテントに紐付かないリクエスト
	'LaunchRequest': function () {
		this.emit('AMAZON.HelpIntent'); // AMAZON.HelpIntentの呼び出し
	},
	// スキルの使い方を尋ねるインテント
	'AMAZON.HelpIntent': function () {
		this.emit(':tell', '今のスプラトゥーン2のステージをお調べします。' +
			'たとえば、「イカ ツー で、今のガチマッチのステージを教えて」、と聞いて下さい。');
	},
	// 対話モデルで定義した、スキル実行するインテント
	'GetSalmonIntent': function () {
		// スロット情報の取得と穴埋め
		// サーモンランの取得ではtimingのみ渡されるので、情報が無いときだけ、「今」に強制する
		var timing = this.event.request.intent.slots.SalmonTiming.value; // スロットTimingを参照
		if (timing === undefined) {
			timing = '今';
		}

		const requestId = this.event.request.requestId;
		const token = this.event.context.System.apiAccessToken;
		const endpoint = this.event.context.System.apiEndpoint;
		const ds = new Alexa.services.DirectiveService();

		const directive = new Alexa.directives.VoicePlayerSpeakDirective(requestId, 'お調べします。');
		const progressiveResponse = ds.enqueue(directive, endpoint, token)
			.catch((err) => {
				// catch API errors so skill processing an continue
				console.error('problem with request: ' + err.message);
				console.log(this.event.context.System.apiEndpoint);
				this.emit(':tell', 'エラーが発生しました。申し訳ありませんが、もう一度お試し下さい。エラータイプはE03です。');
			});
		// サーモンランのJSON取得関数
		const salmonJson = getSalmonJson();

		// Promiseで順次進行
		Promise.resolve(progressiveResponse)
			.then(() => salmonJson)
			.then((json) => getSalmonResponseMaker(json, timing))
			.then((result) => {
				console.log(result);
				this.response.speak(result.message);
				this.response.cardRenderer(result.card.title, result.card.message, result.card.image);
				this.emit(':responseReady');
			});
		console.log('salmon');
	},
	'GetStageIntent': function () {
		var rule = this.event.request.intent.slots.Rule.value; // スロットRuleを参照
		var timing = this.event.request.intent.slots.Timing.value; // スロットTimingを参照
		if (timing === undefined) {
			timing = '今';
		}

		// ここからAPI叩く準備
		// まずはAPI用に変数置き換え用の配列を準備
		var apiRule = {
			'レギュラーマッチ': 'regular',
			'ガチマッチ': 'gachi',
			'リーグマッチ': 'league'
		};
		var apiTiming = {
			'今': 'now',
			'次': 'next'
		};

		// サーモンラン以外の場合
		const requestId = this.event.request.requestId;
		const token = this.event.context.System.apiAccessToken;
		const endpoint = this.event.context.System.apiEndpoint;
		const ds = new Alexa.services.DirectiveService();

		const directive = new Alexa.directives.VoicePlayerSpeakDirective(requestId, 'お調べします。');
		const progressiveResponse = ds.enqueue(directive, endpoint, token)
			.catch((err) => {
				// catch API errors so skill processing an continue
				console.error('problem with request: ' + err.message);
				console.log(this.event.context.System.apiEndpoint);
				this.emit(':tell', 'エラーが発生しました。申し訳ありませんが、もう一度お試し下さい。エラータイプはE01です。');
			});
		const lobbyJson = getLobbyJson(apiRule, apiTiming, rule, timing);
		Promise.resolve(progressiveResponse)
			.then(() => lobbyJson)
			.then((message) => {
				console.log(message);
				this.response.speak(message);
				this.emit(':responseReady');
			});
	}
};

function getSalmonJson () {
	return new Promise((resolve, reject) => {
		const options = {
			url: 'https://spla2.yuu26.com/coop/schedule',
			method: 'GET',
			headers: {
				'User-Agent': 'Ika2Stage/1.0Beta (Twitter:@sasagawaki)'
			}
		};

		// コールバック関数を設定
		request.get(options, (error, res, data) => {
			var json = JSON.parse(data);
			resolve(json);
		});
	});
}

function getSalmonResponseMaker (json, timing) {
	return new Promise((resolve, reject) => {
		var message = '';
		var cardMessage;
		var cardTitle;
		var cardTitleTiming;
		var salmonResult;

		var ikaResultA = json.result[0];
		var ikaResultB = json.result[1];
		var flag = 0;
		var comingMessageFlag = 'start';
		var targetTime;
		var entireFlag;
		var timeMessage;

		var now = parseInt(getNow().getTime() / 1000);

		var checkStart = parseInt(ikaResultA.start_t) + 32400;
		var checkEnd = parseInt(ikaResultA.end_t) + 32400;

		if (now >= checkStart && now <= checkEnd) {
			flag = 1;
		}

		// 条件により振分
		if (flag && timing === '今') {
			// 現在シフトが進行中の場合
			entireFlag = 0;
			message += '<p>現在進行中のシフトをお伝えします。</p>';
			cardTitleTiming = '現在の';
			salmonResult = ikaResultA;
			comingMessageFlag = 'end';
		} else if (flag && timing === '次') {
			// 現在進行中のシフトがあり、次を聞かれている場合
			entireFlag = 1;
			message += '<p>現在進行中の次に募集されるシフトをお伝えします。</p>';
			cardTitleTiming = '次の';
			salmonResult = ikaResultB;
		} else {
			// 現在進行中のシフトが無い
			entireFlag = 2;
			if (timing === '今') {
				// 今を聞かれている場合は前振り
				message += '<p>現在進行中のシフトは、ありません。</p>';
			}
			message += '<p>次に募集されるシフトをお伝えします。</p>';
			cardTitleTiming = '直近の';
			salmonResult = ikaResultA;
		}

		// カードのタイトルを作る
		cardTitle = 'サーモンラン: ' + cardTitleTiming + 'シフト';

		// 開催時間などの情報をまとめる
		var start = new Date(salmonResult.start_t * 1000 + 32400000);
		var end = new Date(salmonResult.end_t * 1000 + 32400000);

		var startTime = {
			'month': start.getMonth() + 1,
			'date': start.getDate(),
			'hour': start.getHours()
		};
		var endTime = {
			'month': end.getMonth() + 1,
			'date': end.getDate(),
			'hour': end.getHours()
		};

		// サーモンランの開始・終了のメッセージを取得
		if (comingMessageFlag === 'start') {
			targetTime = salmonResult.start_t;
		} else {
			targetTime = salmonResult.end_t;
		}
		var comingMessage = getSalmonDuration(targetTime + 32400, now, comingMessageFlag);

		// ステージについて
		var cardStageMessage = '\n---\nステージ: \n' + salmonResult.stage.name + '\n';
		message += '<p>ステージは、' + salmonResult.stage.name + '<break time="5ms" />です。</p>';

		// シフト時刻について
		if (entireFlag) {
			timeMessage = '<p>シフトは、' + startTime.month + '月' + startTime.date + '日' + startTime.hour + '時から、' + endTime.month + '月' + endTime.date + '日' + endTime.hour + '時で、';
		} else {
			timeMessage = '<p>シフトは、' + endTime.month + '月' + endTime.date + '日' + endTime.hour + '時までで、';
		}

		var cardTimeMessage = 'シフト:\n ' + startTime.month + '月 ' + startTime.date + '日 ' + startTime.hour + ':00 ～ ' + endTime.month + '月 ' + endTime.date + '日 ' + endTime.hour + ':00\n';

		// ここまでを結合
		message += timeMessage;

		// 支給ブキ
		var cardWeaponMessage = '\n---\n支給ブキ: \n';
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
		// カードに載せるイメージ
		var cardImage = {
			'smallImageUrl': salmonResult.stage.image,
			'largeImageUrl': salmonResult.stage.image
		};
		// カードに載せる情報を結合
		cardMessage = {
			'title': cardTitle,
			'message': cardTimeMessage + cardStageMessage + cardWeaponMessage,
			'image': cardImage
		};

		var result = {
			'message': message,
			'card': cardMessage
		};

		resolve(result);
	});
}

function getLobbyJson (apiRule, apiTiming, rule, timing) {
	var durationMessage;
	return new Promise((resolve, reject) => {
		const options = {
			url: 'https://spla2.yuu26.com/' + apiRule[rule] + '/' + apiTiming[timing],
			method: 'GET',
			headers: {
				'User-Agent': 'Ika2Stage/1.0Beta (Twitter:@sasagawaki)'
			}
		};

		// コールバック関数を設定
		request.get(options, (error, res, data) => {
			var json = JSON.parse(data);
			var ikaResult = json.result[0];
			var now = parseInt(getNow().getTime() / 1000);

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

			if (timing === '今') {
				durationMessage = getButtleDuration(ikaResult.end_t + 32400, now, 'end');
			} else {
				durationMessage = getButtleDuration(ikaResult.start_t + 32400, now, 'start');
			}

			message += durationMessage;
			// console.log(message);
			resolve(message);
		});
	});
}

function getNow () {
	// 現在時刻の取得
	var dt = new Date();

	// 日本の時間に修正
	dt.setTime(dt.getTime() + 32400000); // 1000 * 60 * 60 * 9(hour)

	// 日付を数字として取り出す
	/*
	var year = dt.getFullYear();
	var month = dt.getMonth() + 1;
	var day = dt.getDate();
	var hour = dt.getHours();
	var min = dt.getMinutes();
	*/

	// 出力
	return dt;
}

function getSalmonDuration (targetVal, nowVal, checkVal) {
	// 開始までか、終了までか。
	var durationMessage;
	var comingMessage;

	if (checkVal === 'start') {
		durationMessage = '始まります。';
	} else {
		durationMessage = '終了します。';
	}
	// 開催時期をまとめる
	var comingInTime = targetVal - nowVal;
	var comingInTimeD = Math.floor(comingInTime / (24 * 60 * 60));
	var comingInTimeH = Math.floor(comingInTime / (60 * 60));
	var comingInTimeM = Math.floor(comingInTime / 60);

	if (comingInTimeD > 0) {
		comingMessage = '<p>このシフトは、およそ' + comingInTimeD + '日後に' + durationMessage + '</p>';
	} else if (comingInTimeH > 0) {
		comingMessage = '<p>このシフトは、およそ' + comingInTimeH + '時間後に' + durationMessage + '</p>';
	} else if (comingInTimeM > 0) {
		comingMessage = '<p>このシフトは、およそ' + comingInTimeM + '分後に' + durationMessage + '</p>';
	} else {
		comingMessage = '<p>このシフトは、まもなく' + durationMessage + '</p>';
	}

	return comingMessage;
}

function getButtleDuration (targetVal, nowVal, checkVal) {
	var durationMessage1;
	var durationMessage2;
	var comingMessage;
	var targetDate = new Date(targetVal * 1000);
	var targetTime = {
		'month': targetDate.getMonth() + 1,
		'date': targetDate.getDate(),
		'hour': targetDate.getHours()
	};
	// 開始までか、終了までか。
	if (checkVal === 'start') {
		durationMessage1 = 'から';
		durationMessage2 = '更新され、始まります。';
	} else {
		durationMessage1 = 'まで';
		durationMessage2 = '更新され、終了します。';
	}
	// 開催時期をまとめる
	var comingInTime = targetVal - nowVal;
	var comingInTimeD = Math.floor(comingInTime / (24 * 60 * 60));
	var comingInTimeH = Math.floor(comingInTime / (60 * 60));
	var comingInTimeM = Math.floor(comingInTime / 60);

	if (comingInTimeD > 0) {
		comingMessage = '<p>このステージは、' + targetTime.hour + '時' + durationMessage1 + 'ですので、およそ' + comingInTimeD + '日後に' + durationMessage2 + '</p>';
	} else if (comingInTimeH > 0) {
		comingMessage = '<p>このステージは、' + targetTime.hour + '時' + durationMessage1 + 'ですので、およそ' + comingInTimeH + '時間後に' + durationMessage2 + '</p>';
	} else if (comingInTimeD > 0) {
		comingMessage = '<p>このステージは、' + targetTime.hour + '時' + durationMessage1 + 'ですので、およそ' + comingInTimeM + '分後に' + durationMessage2 + '</p>';
	} else {
		comingMessage = '<p>このステージは、' + targetTime.hour + '時' + durationMessage1 + 'ですので、まもなく' + durationMessage2 + '</p>';
	}

	return comingMessage;
}
