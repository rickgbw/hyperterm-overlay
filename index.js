/* eslint-disable one-var */
const overlay = require('./overlay');

const onApp = (app) => {
  overlay.registerApp(app);
};

const onWindow = (win) => {
  overlay.registerWindow(win);
};

const onUnload = () => {
  overlay.destroy();
};

const decorateBrowserOptions = config => overlay.decorateBrowserOptions(config);

const decorateMenu = menu => menu.map(
  (item) => {
    if (item.label !== 'Plugins') {
      return item;
    }
    const newItem = Object.assign({}, item);

    newItem.submenu = newItem.submenu.concat({
      label: 'Show/Hide Overlay',
      click: () => overlay.interact()
    });

    return newItem;
  }
);

module.exports = {
  onApp,
  onUnload,
  onWindow,
  decorateBrowserOptions,
  decorateMenu
};