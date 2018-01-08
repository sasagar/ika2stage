'use strict';

const functions = require('./functions.js');

const messageMaker = function (json, rule, timing) {
	var durationMessage;

	return new Promise((resolve, reject) => {
		var ikaResult = json;
		var now = parseInt(functions.getNow().getTime() / 1000);

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
			durationMessage = getButtleDuration(ikaResult.end_t, now, 'end');
		} else {
			durationMessage = getButtleDuration(ikaResult.start_t, now, 'start');
		}

		message += durationMessage;
		resolve(message);
	});
};

const cardMaker = function (json, rule, timing, imgJson) {
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

		var start = functions.getCardFormatDate(ikaResult.start_t * 1000);
		var end = functions.getCardFormatDate(ikaResult.end_t * 1000);

		cardMessage += start + ' ～ ' + end;

		// カードに載せる情報を結合
		var card = {
			'title': cardTitle,
			'message': cardMessage,
			'image': cardImage
		};

		resolve(card);
	});
};

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
	var durationTime = functions.durationFormatter(targetVal, nowVal);

	if (durationTime.D >= 1) {
		comingMessage = '<p>このステージは、' + targetTime.hour + '時' + durationMessage1 + 'ですので、およそ' + durationTime.D + '日後に' + durationMessage2 + '</p>';
	} else if (durationTime.H >= 1) {
		comingMessage = '<p>このステージは、' + targetTime.hour + '時' + durationMessage1 + 'ですので、およそ' + durationTime.H + '時間後に' + durationMessage2 + '</p>';
	} else if (durationTime.M >= 10) {
		comingMessage = '<p>このステージは、' + targetTime.hour + '時' + durationMessage1 + 'ですので、およそ' + durationTime.M + '分後に' + durationMessage2 + '</p>';
	} else {
		comingMessage = '<p>このステージは、' + targetTime.hour + '時' + durationMessage1 + 'ですので、まもなく' + durationMessage2 + '</p>';
	}

	return comingMessage;
};

module.exports = {
	messageMaker: messageMaker,
	cardMaker: cardMaker
};
