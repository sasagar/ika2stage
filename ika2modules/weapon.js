'use strict';

const functions = require('./functions.js');

const random = function (json, rand) {
	var i = 0;
	for (var key in json) {
		if (i === rand) {
			return key;
		}
		i++;
	}
};

const speachMaker = function (json, weaponName) {
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
					message += '<break time="5ms"/>や、';
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
			var instTime = functions.timeFormatter(tmpInstTime);
			message += '<p><s>この武器は、<say-as interpret-as="date">' + instTime.year + instTime.month + instTime.date + '</say-as>';
			message += '<break time="5ms"/>' + instTime.hour + '時から導入されています。</s></p>';
		} else {
			message += '<p><s>この武器は、まだ導入されていません。</s></p>';
		}

		resolve(message);
	});
};

const cardMaker = function (json, weaponName) {
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
			cardMessage += functions.getCardFormatDate(tmpInstTime, true) + 'から';
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
};

module.exports = {
	random: random,
	speachMaker: speachMaker,
	cardMaker: cardMaker
};
