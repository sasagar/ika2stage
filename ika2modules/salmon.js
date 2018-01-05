'use strict';

const functions = require('./functions.js');

const responseMaker = function (json, timing) {
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

		var now = parseInt(functions.getNow().getTime() / 1000);

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

		var startTime = functions.timeFormatter(start);
		var endTime = functions.timeFormatter(end);

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
};

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
	var durationTime = functions.durationFormatter(targetVal, nowVal);

	if (durationTime.D > 0) {
		comingMessage = '<p>このシフトは、およそ' + durationTime.D + '日後に' + durationMessage + '</p>';
	} else if (durationTime.H > 0) {
		comingMessage = '<p>このシフトは、およそ' + durationTime.H + '時間後に' + durationMessage + '</p>';
	} else if (durationTime.M > 0) {
		comingMessage = '<p>このシフトは、およそ' + durationTime.M + '分後に' + durationMessage + '</p>';
	} else {
		comingMessage = '<p>このシフトは、まもなく' + durationMessage + '</p>';
	}

	return comingMessage;
};

module.exports = {
	responseMaker: responseMaker
};
