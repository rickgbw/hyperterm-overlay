'use strict';

const Overlay = require('./overlay');
const obj = new Overlay();

exports.onApp = app => {
	obj.registerApp(app);
};

exports.onWindow = win => {
	obj.registerWindow(win);
};

exports.onUnload = () => {
	obj.destroy();
};

exports.decorateBrowserOptions = config => {
	return obj.decorateBrowserOptions(config);
};

exports.decorateMenu = menu => {
	return menu.map(
		item => {
			if (item.label !== 'Plugins') return item;
			const newItem = Object.assign({}, item);
			newItem.submenu = newItem.submenu.concat({
				label: 'Show/Hide Overlay',
				click: () => obj.interact()
			});
			return newItem;
		}
	);
};
