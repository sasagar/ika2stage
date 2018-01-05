'use strict';
const request = require('request');

module.exports = function (endpoint) {
	return new Promise((resolve, reject) => {
		const options = {
			url: 'https://spla2.yuu26.com/' + endpoint,
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
};
