'use strict';
const Alexa = require('alexa-sdk');

// 独自モジュールの読み込み
const ika2 = require('./ika2modules');

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
		var endPoint = 'coop/schedule';
		var salmonJson;
		// スロット情報の取得と穴埋め
		// サーモンランの取得ではtimingのみ渡されるので、情報が無いときだけ、「今」に強制する
		var timing = this.event.request.intent.slots.SalmonTiming.value; // スロットTimingを参照
		if (timing === undefined) {
			timing = '今';
		}

		// Promiseで順次進行
		Promise.resolve()
			.then(() => ika2.getJson(endPoint))
			.then((json) => {
				salmonJson = json;
				return salmonJson;
			})
			.then((json) => ika2.salmon.responseMaker(json, timing))
			.then((result) => {
				// console.log(result);
				this.response.speak(result.message);
				this.response.cardRenderer(result.card.title, result.card.message, result.card.image);
				this.emit(':responseReady');
			});
		console.log('salmon');
		console.log(this.event);
	},
	'GetStageIntent': function () {
		// ステージ情報を教えるIntent
		var rule;
		if (!this.event.request.intent.slots.Rule.resolutions) {
			rule = 'レギュラーマッチ';
		} else {
			var obj = this.event.request.intent.slots.Rule.resolutions.resolutionsPerAuthority[0].values[0];
			rule = obj.value.name;
		}
		var timing = this.event.request.intent.slots.Timing.value; // スロットTimingを参照
		if (rule === undefined) {
			rule = 'レギュラーマッチ';
		}
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

		var stageJson;
		var imgJson;
		var endPoint = apiRule[rule] + '/' + apiTiming[timing];
		var s3Json = 'stageImage.json';

		Promise.resolve()
			.then(() => ika2.getJson(endPoint))
			.then((json) => {
				stageJson = json.result[0];
				return stageJson;
			})
			.then((stageJson) => ika2.lobby.messageMaker(stageJson, rule, timing))
			.then((message) => {
				this.response.speak(message);
			})
			.then(() => ika2.functions.getS3Json(s3Json))
			.then((json) => {
				imgJson = json[rule];
			})
			.then(() => ika2.lobby.cardMaker(stageJson, rule, timing, imgJson))
			.then((card) => {
				this.response.cardRenderer(card.title, card.message, card.image);
				this.emit(':responseReady');
			});
		console.log('getStage');
		console.log(this.event);
	},
	'GetWeaponDataIntent': function () {
		// ブキ情報を回答するintent
		var weaponName = ika2.functions.getValue(this, 'WeaponName');

		var weaponJson;
		var s3Json = 'weaponData.json';

		Promise.resolve()
			.then(() => ika2.functions.getS3Json(s3Json))
			.then((json) => {
				weaponJson = json[weaponName];
			})
			.then(() => ika2.weapon.speachMaker(weaponJson, weaponName))
			.then((message) => {
				this.response.speak(message);
			})
			.then(() => ika2.weapon.cardMaker(weaponJson, weaponName))
			.then((card) => {
				this.response.cardRenderer(card.title, card.message, card.image);
				this.emit(':responseReady');
			});
		console.log('getWeaponData');
		console.log(this.event);
	},
	'RouletteIntent': function () {
		var length;
		var getJson;
		var weaponJson;
		var weaponName;
		var s3Json = 'weaponData.json';

		Promise.resolve()
			.then(() => ika2.functions.getS3Json(s3Json))
			.then((json) => {
				getJson = json;
				length = Object.keys(getJson).length;
				var rand = Math.floor(Math.random() * length);
				weaponName = ika2.weapon.random(getJson, rand);
			})
			.then(() => {
				weaponJson = getJson[weaponName];
			})
			.then(() => ika2.weapon.speachMaker(weaponJson, weaponName))
			.then((message) => {
				var jingleMessage = '<audio src="https://s3-ap-northeast-1.amazonaws.com/ika2stage/audio/jingle.mp3" />';
				jingleMessage += '<p><s>お薦めブキをお知らせします。</s></p>';
				jingleMessage += message;
				this.response.speak(jingleMessage);
			})
			.then(() => ika2.weapon.cardMaker(weaponJson, weaponName))
			.then((card) => {
				this.response.cardRenderer('ブキルーレットによる' + card.title, card.message, card.image);
				this.emit(':responseReady');
			});
		console.log('roulette');
		console.log(this.event);
	},
	'GetNextIntent': function () {
		// 次のガチ系ルールを検索するIntent
		var rule = ika2.functions.getValue(this, 'GachiRule');

		var endPoints = {
			'nowGachi': 'gachi/now',
			'nowLeague': 'league/now',
			'scheduleGachi': 'gachi/next_all',
			'scheduleLeague': 'league/next_all'
		};
		var jsons;
		var message = '';

		Promise.all([
			ika2.getJson(endPoints.nowGachi),
			ika2.getJson(endPoints.nowLeague),
			ika2.getJson(endPoints.scheduleGachi),
			ika2.getJson(endPoints.scheduleLeague)
		])
			.then((allJson) => {
				jsons = {
					'nowGachi': allJson[0].result,
					'nowLeague': allJson[1].result,
					'scheduleGachi': allJson[2].result,
					'scheduleLeague': allJson[3].result
				};
			})
			.then(() => {
				var now = [
					ika2.getNext.nowCheck(jsons.nowGachi, rule, 'ガチマッチ'),
					ika2.getNext.nowCheck(jsons.nowLeague, rule, 'リーグマッチ')
				];
				return now;
			})
			.then((res) => {
				message += ika2.getNext.nowMessageComposer(res, rule);
			})
			.then(() => {
				var schedule = [
					ika2.getNext.scheduleCheck(jsons.scheduleGachi, rule, 'ガチマッチ'),
					ika2.getNext.scheduleCheck(jsons.scheduleLeague, rule, 'リーグマッチ')
				];
				return schedule;
			})
			.then((res) => {
				var schedule = res[0].concat(res[1]);
				schedule.sort(function (a, b) {
					return (a.start_t < b.start_t ? -1 : 1);
				});
				var tmpMessage = ika2.getNext.scheduleMessageMaker(schedule, rule);
				return tmpMessage;
			})
			.then((tmpMessage) => {
				message += tmpMessage;
				this.response.speak(message);
				this.emit(':responseReady');
			});
		console.log('getNext');
		console.log(this.event.request.intent.slots);
	}
};
