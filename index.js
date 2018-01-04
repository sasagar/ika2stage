'use strict';
const request = require('request');
const Alexa = require('alexa-sdk');

// s3を利用する為の諸々
const aws = require('aws-sdk');
aws.config.region = 'ap-northeast-1';
const bucket = 'ika2stage';
const s3 = new aws.S3();

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
		this.emit(':tell', 'スプラトゥーン2についてお調べします。' +
			'たとえば、「イカ ツー で、今のガチマッチのステージを教えて」、「イカ ツー で、次のサーモンランのシフト」、「イカ ツー で、スプラローラーについて教えて」、と聞いて下さい。');
	},
	// 対話モデルで定義した、スキル実行するインテント
	'GetSalmonIntent': function () {
		// スロット情報の取得と穴埋め
		// サーモンランの取得ではtimingのみ渡されるので、情報が無いときだけ、「今」に強制する
		var timing = this.event.request.intent.slots.SalmonTiming.value; // スロットTimingを参照
		if (timing === undefined) {
			timing = '今';
		}

		// サーモンランのJSON取得関数
		const salmonJson = getSalmonJson();

		// Promiseで順次進行
		Promise.resolve()
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
		// ステージ情報を教えるIntent
		var obj = this.event.request.intent.slots.Rule.resolutions.resolutionsPerAuthority[0].values[0];
		// var rule = this.event.request.intent.slots.Rule.value; // スロットRuleを参照
		var rule = obj.value.name;
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

		// const stageJson = getLobbyJson(apiRule, apiTiming, rule, timing);
		var stageJson;
		var imgJson;
		Promise.resolve()
			.then(() => getLobbyJson(apiRule, apiTiming, rule, timing))
			.then((json) => {
				stageJson = json;
				return stageJson;
			})
			.then((stageJson) => getLobbyMessageMaker(stageJson, rule, timing))
			.then((message) => {
				this.response.speak(message);
			})
			.then(() => getLobbyImageJson())
			.then((json) => {
				imgJson = json[rule];
			})
			.then(() => getLobbyCardMaker(stageJson, rule, timing, imgJson))
			.then((card) => {
				this.response.cardRenderer(card.title, card.message, card.image);
				this.emit(':responseReady');
			});
	},
	'GetWeaponDataIntent': function () {
		var obj = this.event.request.intent.slots.WeaponName.resolutions.resolutionsPerAuthority[0].values[0];
		// console.log(obj.value.name);
		// ブキ情報を回答するintent
		var weaponName = obj.value.name;
		// var weaponName = this.event.request.intent.slots.WeaponName.value; // スロットRuleを参照
		var weaponJson;

		var params = {
			Bucket: bucket,
			Key: 'weaponData.json'
		};

		Promise.resolve()
			.then(() => getWeaponJson(params))
			.then((json) => {
				var targetJson = json[weaponName];
				return targetJson;
			})
			.then((json) => {
				weaponJson = json;
			})
			.then(() => getWeaponSpeachMaker(weaponJson, weaponName))
			.then((message) => {
				this.response.speak(message);
			})
			.then(() => getWeaponCardMaker(weaponJson, weaponName))
			.then((card) => {
				this.response.cardRenderer(card.title, card.message, card.image);
				this.emit(':responseReady');
			});
	}
};

function getWeaponJson (params) {
	return new Promise((resolve, reject) => {
		s3.getObject(params, function (err, data) {
			if (err) {
				console.log(err, err.stack);
			} else {
				var json = JSON.parse(data.Body.toString());
				resolve(json);
			}
		});
	});
}

function getWeaponSpeachMaker (json, weaponName) {
	return new Promise((resolve, reject) => {
		var weaponData = json;
		var weaponInstalledTime = new Date(weaponData.released_at);
		var now = new Date();
		var splReleaseTime = new Date('2017-07-21T00:00:00Z');
		/*
		スプラシューターは、通称スシと呼ばれる事のあるシュータータイプのブキです。
		サブは○○で、スペシャルは○○です。
		スペシャルに必要な塗りは180ポイントです。
		ランク2で開放されるブキで、価格は1800です。
		○○から導入されています。
		*/
		var message = '<p><s>';
		message += weaponData.speak + 'は、';
		if (weaponName !== weaponData.common_name[0]) {
			message += '通称<break time="5ms"/>';
			for (var i in weaponData.common_name) {
				if (i > 0) {
					message += 'や、';
				}
				message += weaponData.common_name[i];
			}
			message += '<break time="5ms"/>と呼ばれる事のある、';
		}
		message += weaponData.type_key + '系<break time="5ms"/>' + weaponData.subtype_key + 'タイプの武器です。</s>';
		message += '<s>サブは<prosody pitch="high">' + weaponData.sub_key + '</prosody>で、';
		message += 'スペシャルは<prosody pitch="high">' + weaponData.special_key + '</prosody>です。</s>';
		message += '<s>スペシャルに必要な塗りは、<prosody pitch="high">';
		message += weaponData.special_points + 'ポイント</prosody>です。</s></p>';
		message += '<p><s>ランク<prosody pitch="high">' + weaponData.unlocked_rank + '</prosody>で解放される武器で、';
		message += '価格は、<prosody pitch="high">' + weaponData.cost + '</prosody>です。</s></p>';

		if (weaponInstalledTime.getTime() === splReleaseTime.getTime()) {
			message += '<p><s>この武器は、最初から導入されています。</s></p>';
		} else if (weaponInstalledTime.getTime() <= now.getTime()) {
			var tmpInstTime = new Date(weaponInstalledTime.getTime() + (9 * 60 * 60 * 1000));
			var instTime = {
				'year': tmpInstTime.getFullYear(),
				'month': tmpInstTime.getMonth() + 1,
				'date': tmpInstTime.getDate(),
				'hour': tmpInstTime.getHours()
			};
			if (instTime.month < 10) { instTime.month = '0' + instTime.month; }
			if (instTime.date < 10) { instTime.date = '0' + instTime.date; }
			message += '<p><s>この武器は、<say-as interpret-as="date">' + instTime.year + instTime.month + instTime.date + '</say-as>';
			message += '<break time="5ms"/>' + instTime.hour + '時から導入されています。</s></p>';
		} else {
			message += '<p><s>この武器は、まだ導入されていません。</s></p>';
		}

		resolve(message);
	});
}

function getWeaponCardMaker (json, weaponName) {
	return new Promise((resolve, reject) => {
		var weaponData = json;
		var weaponInstalledTime = new Date(weaponData.released_at);
		var now = new Date();
		var splReleaseTime = new Date('2017-07-21T00:00:00Z');
		/*
		タイトル: ブキ情報「スプラシューター」
		画像: imageからURL取得
		本文:
		通称: スシ・スシ
		---
		シューター系 シュータータイプ
		サブ: ○○ / スペシャル: ○○(180pt)
		---
		解放ランク: 2 / 価格: 1800
		---
		導入時期: 最初から
		*/
		var cardTitle = 'ブキ情報 「' + weaponName + '」';
		var cardImage = {
			'smallImageUrl': weaponData.images.small,
			'largeImageUrl': weaponData.images.large
		};
		var cardMessage = '';

		if (weaponName !== weaponData.common_name[0]) {
			cardMessage += '通称: ';
			for (var i in weaponData.common_name) {
				if (i > 0) {
					cardMessage += '・';
				}
				cardMessage += weaponData.common_name[i];
			}
			cardMessage += '\n';
			cardMessage += '---\n';
		}
		cardMessage += weaponData.type_key + '系 ' + weaponData.subtype_key + 'タイプ\n';
		cardMessage += 'サブ: ' + weaponData.sub_key + ' / ';
		cardMessage += 'スペシャル: ' + weaponData.special_key;
		cardMessage += ' (' + weaponData.special_points + ' pt)\n';
		cardMessage += '---\n';
		cardMessage += '解放ランク: ' + weaponData.unlocked_rank + ' / ';
		cardMessage += '価格: ' + weaponData.cost + '\n';
		cardMessage += '---\n';
		cardMessage += '導入時期: ';

		if (weaponInstalledTime.getTime() === splReleaseTime.getTime()) {
			cardMessage += '最初から';
		} else if (weaponInstalledTime.getTime() <= now.getTime()) {
			var tmpInstTime = new Date(weaponInstalledTime.getTime() + (9 * 60 * 60 * 1000));
			var instTime = {
				'year': tmpInstTime.getFullYear(),
				'month': tmpInstTime.getMonth() + 1,
				'date': tmpInstTime.getDate(),
				'hour': tmpInstTime.getHours()
			};
			cardMessage += instTime.year + '年 ' + instTime.month + '月 ' + instTime.date + '日 ' + instTime.hour + '時から';
		} else {
			cardMessage += '未導入';
		}

		// カードに載せる情報を結合
		var card = {
			'title': cardTitle,
			'message': cardMessage,
			'image': cardImage
		};

		resolve(card);
	});
}

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
			resolve(ikaResult);
		});
	});
}

function getLobbyMessageMaker (json, rule, timing) {
	var durationMessage;

	return new Promise((resolve, reject) => {
		var ikaResult = json;
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
}

function getLobbyImageJson () {
	var imageJson;
	var params = {
		Bucket: bucket,
		Key: 'stageImage.json'
	};

	return new Promise((resolve, reject) => {
		s3.getObject(params, function (err, data) {
			if (err) {
				console.log(err, err.stack);
			} else {
				imageJson = JSON.parse(data.Body.toString());
				resolve(imageJson);
			}
		});
	});
}

function getLobbyCardMaker (json, rule, timing, imgJson) {
	var imageJson = imgJson;
	var ikaResult = json;

	return new Promise((resolve, reject) => {
		// カードに載せるイメージ
		var cardImage = {
			'smallImageUrl': imageJson.images.small,
			'largeImageUrl': imageJson.images.large
		};

		var cardTitle = timing + 'の' + rule;

		/*
		ルール: ナワバリバトル
		---
		ステージ情報:
		・ハコフグ倉庫
		・ザトウマーケット
		---
		1月 3日 19:00 ～ 1月 3日 21:00
		*/
		var cardMessage = '';
		cardMessage += 'ルール: ' + ikaResult.rule + '\n';
		cardMessage += '---\n';
		cardMessage += 'ステージ情報:\n';
		for (var i in ikaResult.maps) {
			cardMessage += '・' + ikaResult.maps[i] + '\n';
		}
		cardMessage += '---\n';

		var start = getCardFormatDate(ikaResult.start_t + 32400);
		var end = getCardFormatDate(ikaResult.end_t + 32400);

		cardMessage += start + ' ～ ' + end;

		// カードに載せる情報を結合
		var card = {
			'title': cardTitle,
			'message': cardMessage,
			'image': cardImage
		};

		resolve(card);
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

function getCardFormatDate (targetVal) {
	var formatDate;
	var targetDate = new Date(targetVal * 1000);
	var targetTime = {
		'month': targetDate.getMonth() + 1,
		'date': targetDate.getDate(),
		'hour': targetDate.getHours(),
		'minute': targetDate.getMinutes()
	};
	if (targetTime.minute < 10) {
		targetTime.minute = '0' + targetTime.minute;
	}

	formatDate = targetTime.month + '月 ' + targetTime.date + '日 ' + targetTime.hour + ':' + targetTime.minute;

	return formatDate;
}
