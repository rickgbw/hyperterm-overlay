'use strict';

const overlay = require('./overlay');

exports.onApp = app => {
	overlay.registerApp(app);
};

exports.onWindow = win => {
	overlay.registerWindow(win);
};

exports.onUnload = () => {
	overlay.destroy();
};

exports.decorateBrowserOptions = config => {
	return overlay.decorateBrowserOptions(config);
};

exports.decorateMenu = menu => {
	return menu.map(
		item => {
			if (item.label !== 'Plugins') return item;
			const newItem = Object.assign({}, item);
			newItem.submenu = newItem.submenu.concat({
				label: 'Show/Hide Overlay',
				click: () => overlay.interact()
			});
			return newItem;
		}
	);
};
