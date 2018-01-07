'use strict';
const functions = require('./functions.js');

const nowCheck = function (json, rule, game) {
	var check = checker(json[0], rule, game);
	return check;
};

const scheduleCheck = function (json, rule, game) {
	var check = [];
	for (var i in json) {
		var tmp = checker(json[i], rule, game);
		if (tmp) {
			check.push(checker(json[i], rule, game));
		}
	}
	return check;
};

function nowMessageMaker (json, rule, game) {
	var message = '<p>現在、' + game + 'で' + rule + 'をプレイ出来ます。</p>';
	message += '<p>ステージは、';
	for (var i in json.maps) {
		if (i > 0) {
			message += 'と、';
		}
		message += json.maps[i];
	}
	message += 'です。</p>';
	return message;
};

const scheduleMessageMaker = function (json, rule) {
	return new Promise((resolve, reject) => {
		var message = '<p>このあと、24時間以内で' + rule + 'をプレイ出来る時間帯とルールをお伝えします。';
		for (var j in json) {
			var start = new Date(json[j].start_t * 1000 + 32400000);
			var time = functions.timeFormatter(start);
			if (j > 0) {
				message += '、</s>';
				message += '<break time="10ms" />';
			}
			message += '<s>' + time.hour + '時から、' + json[j].game + 'で、ステージは、';
			for (var i in json[j].maps) {
				if (i > 0) {
					message += 'と、';
				}
				message += json[j].maps[i];
			}
		}
		message += 'です。</s></p>';
		resolve(message);
	});
};

const nowMessageComposer = function (res, rule) {
	var message = '';
	if (res[0]) {
		message += nowMessageMaker(res[0], rule, res[0].game);
	} else if (res[1]) {
		message += nowMessageMaker(res[1], rule, res[1].game);
	} else {
		message += '<p>現在、' + rule + 'のゲームはありません。</p>';
	};
	return message;
};

function checker (json, rule, game) {
	var result;
	if (json.rule === rule) {
		result = {
			'maps': json.maps,
			'start_t': json.start_t,
			'end_t': json.end_t,
			'game': game
		};
	}
	return result;
}

module.exports = {
	nowCheck: nowCheck,
	scheduleCheck: scheduleCheck,
	nowMessageComposer: nowMessageComposer,
	scheduleMessageMaker: scheduleMessageMaker
};
