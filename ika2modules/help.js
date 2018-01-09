'use strict';

const createHelpMessage = function () {
	var message = 'スプラトゥーン two についてお調べします。';
	message += 'たとえば、';
	message += '「イカ two で、今の ガチ マッチ のステージを教えて。」<break time="500ms"/>';
	message += '「イカ two で、次の Salmon-run のシフト。」<break time="500ms"/>';
	message += '「イカ two で、スプラローラーについて教えて。」、<break time="500ms"/>';
	message += '「イカ two で、ガチ アサリ やりたい。」、<break time="500ms"/>';
	message += '「イカ two で、ブキガチャ。」<break time="200ms"/>';
	message += 'などと、聞いてみて下さい。';

	return message;
};

const createHelpCard = function () {
	var cardTitle = 'イカ2ステージが出来ること';
	var cardMessage = 'Splatoon2のステージ情報や、ブキの情報をお調べします。\n';
	cardMessage += '--- \n';
	cardMessage += '今や次のステージや今やれるルールを知りたいときには、 \n';
	cardMessage += '「イカ2で、今(次)のガチマッチのステージを教えて。」 \n';
	cardMessage += '「イカ2で、今(次)のサーモンランのシフト。」 \n';
	cardMessage += '「イカ2で、ガチアサリやりたい。」 \n';
	cardMessage += '--- \n';
	cardMessage += 'ブキについて調べたり、どれか1つを選んだりしたいときは \n';
	cardMessage += '「イカ2で、スプラローラーについて教えて。」 \n';
	cardMessage += '「イカ2で、ブキガチャ。」「イカ2で、ルーレット。」 \n';
	cardMessage += 'などと質問できます。';

	var res = {
		title: cardTitle,
		message: cardMessage
	};

	return res;
};

module.exports = {
	createHelpMessage: createHelpMessage,
	createHelpCard: createHelpCard
};
