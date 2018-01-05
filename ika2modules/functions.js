'use strict';
// s3を利用する為の諸々
const aws = require('aws-sdk');
aws.config.region = 'ap-northeast-1';
const s3 = new aws.S3();
const bucket = 'ika2stage';

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
	// 日本の時間に修正
	dt.setTime(dt.getTime() + 32400000); // 1000 * 60 * 60 * 9(hour)

	// 出力
	return dt;
};

const getS3Json = function (filename) {
	var imageJson;
	var params = {
		Bucket: bucket,
		Key: filename
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
		'D': Math.floor(comingInTime / (24 * 60 * 60)),
		'H': Math.floor(comingInTime / (60 * 60)),
		'M': Math.floor(comingInTime / 60)
	};

	return comingIn;
};

module.exports = {
	getCardFormatDate: getCardFormatDate,
	getNow: getNow,
	getS3Json: getS3Json,
	timeFormatter: timeFormatter,
	durationFormatter: durationFormatter
};
