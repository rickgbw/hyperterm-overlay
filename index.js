'use strict';

const Overlay = require('./overlay');
const obj = new Overlay();

exports.onApp = (app) => {
	obj.registerApp(app);
};

exports.onWindow = (win) => {
	obj.registerWindow(win);
};

exports.decorateBrowserOptions = (config) => {
	return obj.decorateBrowserOptions(config);
};
