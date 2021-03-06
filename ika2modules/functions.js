'use strict';

const getJson = function (endpoint) {
	// requestを使うのはコレだけ。
	const request = require('request');

	return new Promise((resolve, reject) => {
		const options = {
			url: 'https://spla2.yuu26.com/' + endpoint,
			method: 'GET',
			headers: {
				'User-Agent': 'Ika2Stage/1.0Beta (Twitter:@sasagawaki)'
			},
			json: true
		};

		// コールバック関数を設定
		request.get(options, (error, res, data) => {
			if (!error && res.statusCode === 200) {
				resolve(data);
			} else {
				var rejMessage = res.statusCode + ': ' + error;
				reject(rejMessage);
			}
		});
	});
};

const getCardFormatDate = function (targetVal, yearFlag = false) {
	var formatDate = '';
	var targetDate = new Date(targetVal);
	var targetTime = timeFormatter(targetDate);
	if (targetTime.minute < 10) {
		targetTime.minute = '0' + targetTime.minute;
	}

	if (yearFlag) {
		formatDate += targetTime.year + '年 ';
	}
	formatDate += targetTime.month + '月 ' + targetTime.date + '日 ' + targetTime.hour + ':' + targetTime.minute;

	return formatDate;
};

const getNow = function () {
	// 現在時刻の取得
	var dt = new Date();

	// 出力
	return dt;
};

const getS3Json = function (filename) {
	// s3を利用する為の諸々
	const aws = require('aws-sdk');
	aws.config.region = 'ap-northeast-1';
	const s3 = new aws.S3();
	const bucket = 'ika2stage';

	var imageJson;
	var params = {
		Bucket: bucket,
		Key: filename
	};

	return new Promise((resolve, reject) => {
		s3.getObject(params, function (err, data) {
			if (err) {
				// console.error(err, err.stack);
				reject(err);
			} else {
				imageJson = JSON.parse(data.Body.toString());
				resolve(imageJson);
			}
		});
	});
};

const timeFormatter = function (targetTime) {
	var formatTime;
	formatTime = {
		'year': targetTime.getFullYear(),
		'month': targetTime.getMonth() + 1,
		'date': targetTime.getDate(),
		'hour': targetTime.getHours(),
		'minute': targetTime.getMinutes()
	};
	if (formatTime.month < 10) { formatTime.month = '0' + formatTime.month; }
	if (formatTime.date < 10) { formatTime.date = '0' + formatTime.date; }
	return formatTime;
};

const durationFormatter = function (targetTimeA, targetTimeB) {
	var comingInTime = targetTimeA - targetTimeB;

	var comingIn = {
		'D': Math.floor((comingInTime / (24 * 60 * 60)) * 10) / 10,
		'H': Math.floor((comingInTime / (60 * 60)) * 10) / 10,
		'M': Math.floor(comingInTime / 60) // 分のみ整数で提供
	};

	return comingIn;
};

const getValue = function (obj, key) {
	const functions = require('./functions.js');
	var value = '';
	var eventObj = obj.event.request.intent.slots[key];
	if (eventObj.resolutions) {
		if (eventObj.resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_NO_MATCH') {
			functions.errorLogging(obj.event, 'getValue', 'ER_SUCCESS_NO_MATCH');
			var err = new Error('キーワード取得時にエラーが発生しました。正しいキーワードか確かめて、もう一度お試し下さい。');
			throw err;
		} else {
			value = eventObj.resolutions.resolutionsPerAuthority[0].values[0].value.name;
		}
	} else {
		value = eventObj.value;
	}
	return value;
};

const logging = function (obj, processName) {
	const util = require('util');

	var inspectUtil = util.inspect(obj, false, null);

	console.log('Intent: ' + processName);
	console.log(inspectUtil);
};

const errorLogging = function (obj, processName, err) {
	const util = require('util');

	var inspectUtil = util.inspect(obj, false, null);

	console.error('Intent: ' + processName);
	console.error(err);
	console.error(inspectUtil);
};

module.exports = {
	getJson: getJson,
	getCardFormatDate: getCardFormatDate,
	getNow: getNow,
	getS3Json: getS3Json,
	timeFormatter: timeFormatter,
	durationFormatter: durationFormatter,
	getValue: getValue,
	logging: logging,
	errorLogging: errorLogging
};
