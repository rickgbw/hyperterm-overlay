'use strict';

//dependencies
const electron = require('electron');
const {BrowserWindow,globalShortcut,Tray,Menu} = electron;
const path = require('path');

class Overlay {
	constructor() {
		this._app = null;
		this._win = null;
		this._creatingWindow = false;
		this._animating = false;
		this._config = {};
		this.tray = null;
		this._trayAnimation = null;
		this._lastFocus = null;
	}

	//app started
	registerApp(app) {
		//load user configs and watch for changes (only on first time)
		if(!this._app) {
			this._app = app;

			this._refreshConfig();
			this._app.config.subscribe(() => {
				this._refreshConfig(true);
			});
		} else
			this._app = app;

		//creating the overlay window
		this._create(() => {
			//open on startup
			if(this._config.startup)
				this.show();
		});
	}

	//checks if new window could be created
	registerWindow(win) {
		if(!this._creatingWindow && this._config.unique)
			setTimeout(() => { win.close(); },0);
	}

	//apply user overlay window configs
	_refreshConfig(reapply) {
		//get user configs
		let userConfig = this._app.config.getConfig().overlay;

		//comparing old and new configs
		if(userConfig) {
			//hide dock icon or not, check before apply
			if(userConfig.unique && userConfig.hideDock)
				this._app.dock.hide();
			else if(this._config.unique && this._config.hideDock)
				this._app.dock.show();

			//removing the initial windows of hyperterm
			if(userConfig.unique && !this._config.unique) {
				this._app.getWindows().forEach((win) => {
					if(win != this._win)
						win.close();
				});
			}
		}

		//default configuration
		this._config = {
			animate: true,
			alwaysOnTop: true,
			hasShadow: false,
			hideOnBlur: false,
			hideDock: false,
			hotkeys: ['Option+Space'],
			resizable: true,
			position: 'top',
			primaryDisplay: false,
			startup: false,
			size: 0.4,
			tray: true,
			unique: false
		};

		//replacing user preferences
		if(userConfig) Object.assign(this._config,userConfig);

		//registering the hotkeys
		globalShortcut.unregisterAll();
		for(let hotkey of this._config.hotkeys) {
			globalShortcut.register(hotkey, () => {
				this.interact();
			});
		}

		//tray icon
		let trayCreated = false;
		if(this._config.tray && !this._tray) {
			this._tray = new Tray(path.join(__dirname, 'images', 'trayTemplate.png'));
			this._tray.setPressedImage(path.join(__dirname, 'images', 'tray-hover.png'));
			this._tray.on('click', () => {
				if(!this._win)
					this._create(() => {
						this.interact();
					});
				else
					this.interact();
			});
			trayCreated = true;
		} else if(!this._config.tray && this._tray) {
			this._clearTrayAnimation();
			this._tray.destroy();
			this._tray = null;
		}


		if(reapply && this._win) {
			this._setConfigs(this._win);
			this._endBounds(this._win);
			//animate tray
			if(this._win.isVisible() && trayCreated)
				this._animateTray();
		}
	}

	//creating a new overlay window
	_create(fn) {
		if(this._win) return;

		this._creatingWindow = true;

		this._app.createWindow((win) => {
			this._win = win;

			this._setConfigs(win);

			//hide window when loses focus
			win.on('blur', () => {
				if(this._config.hideOnBlur)
					this.hide();
			});

			//store the new size selected
			win.on('resize', () => {
				if(this._config.resizable && !this._creatingWindow && !this._animating) {
					switch(this._config.position) {
					case 'top':
					case 'bottom':
						this._config.size = win.getSize()[1];
						break;

					case 'right':
					case 'left':
						this._config.size = win.getSize()[0];
						break;
					}
				}
			});

			//permanent window
			win.on('closed', () => {
				this._win = null;
				this._clearTrayAnimation();
			});

			//forces hide initially
			this._win.hide();
			this._creatingWindow = false;

			//callback
			if(fn) fn();
		});
	}

	//change windows settings for the overlay window
	_setConfigs(win) {
		win.setHasShadow(this._config.hasShadow);
		win.setResizable(this._config.resizable);
		win.setAlwaysOnTop(this._config.alwaysOnTop);
	}

	//get current display
	_getDisplay() {
		const screen = electron.screen;
		let display = (!this._config.primaryDisplay) ? screen.getDisplayNearestPoint(screen.getCursorScreenPoint()) : screen.getPrimaryDisplay();
		return display;
	}

	//open or close overlay window
	interact() {
		if(!this._win) return;

		if(!this._win.isVisible())
			this.show();
		else
			this.hide();
	}

	_startBounds() {
		const {x, y, width, height} = this._getDisplay().workArea;

		switch(this._config.position) {
		case 'left':
			this._win.setBounds({ x: x, y: y, width: 1, height: height }, this._config.animate);
			break;
		case 'right':
			this._win.setBounds({ x: x + width - 1, y: y, width: 1, height: height }, this._config.animate);
			break;
		case 'bottom':
			this._win.setBounds({ x: x, y: y + height, width: width, height: 0 }, this._config.animate);
			break;
		default:
		case 'top':
			this._win.setBounds({ x: x, y: y, width: width, height: 0 }, this._config.animate);
			break;
		}
	}

	//set window bounds according to config
	_endBounds() {
		const {x, y, width, height} = this._getDisplay().workArea;
		let size;

		//end position
		switch(this._config.position) {
		case 'left':
			size = (this._config.size > 1) ? this._config.size : Math.round(width * this._config.size);
			this._win.setBounds({ x: x, y: y, width: size, height: height }, this._config.animate);
			break;
		case 'bottom':
			size = (this._config.size > 1) ? this._config.size : Math.round(height * this._config.size);
			this._win.setBounds({ x: x, y: height - size, width: width, height: size }, this._config.animate);
			break;
		case 'right':
			size = (this._config.size > 1) ? this._config.size : Math.round(width * this._config.size);
			this._win.setBounds({ x: width - size, y: y, width: size, height: height }, this._config.animate);
			break;
		default:
		case 'top':
			size = (this._config.size > 1) ? this._config.size : Math.round(height * this._config.size);
			this._win.setBounds({ x: x, y: y, width: width, height: size }, this._config.animate);
			break;
		}
	}

	//show the overlay window
	show(force) {
		if(!this._win || this._animating || (this._win.isVisible() && !force)) return;

		//store internal window focus
		this._lastFocus = BrowserWindow.getFocusedWindow();

		//set window initial bounds (for animation)
		if(this._config.animate) {
			this._animating = true;
			setTimeout(() => {
				this._animating = false;
			},250);
			this._startBounds();
		}

		//show and focus window
		this._win.show();
		this._win.focus();

		//set end bounds
		this._endBounds();

		this._animateTray();
	}

	//hides the overlay window
	hide() {
		if(!this._win || this._animating || !this._win.isVisible()) return;

		//search for the better previous windows focus
		let findFocus = () => {
			if(this._win.isFocused()) {
				//chose internal or external focus
				if(this._lastFocus && this._lastFocus.sessions && this._lastFocus.sessions.size)
					this._lastFocus.focus();
				else
					Menu.sendActionToFirstResponder('hide:');
			}
		};

		//control the animation
		if(this._config.animate) {
			this._animating = true;

			//animation end bounds
			this._startBounds();

			setTimeout(() => {
				this._animating = false;
				findFocus();
				this._win.hide();
			}, 250);
		}
		//close without animation
		else {
			findFocus();
			this._win.hide();
		}

		this._clearTrayAnimation();
	}

	//tray animation when overlay window is open
	_animateTray() {
		if(!this._config.tray) return;

		//tool tip
		this._tray.setToolTip('Close HyperTerm Overlay');

		if(this._trayAnimation) clearInterval(this._trayAnimation);
		let type = 0;
		this._trayAnimation = setInterval(() => {
			if(this._tray)
				this._tray.setImage(path.join(__dirname, 'images', (++type % 2) ? 'trayTemplate.png' : 'tray2Template.png'));
		},400);
	}

	//finish tray animation
	_clearTrayAnimation() {
		if(!this._config.tray) return;

		this._tray.setToolTip('Open HyperTerm Overlay');

		if(this._trayAnimation) clearInterval(this._trayAnimation);
		this._tray.setImage(path.join(__dirname, 'images', 'trayTemplate.png'));
	}

	//setting initial configuration for the new window
	decorateBrowserOptions(config) {
		if(this._creatingWindow) {
			return Object.assign({}, config, {
				titleBarStyle: '',
				frame: false,
				minWidth: 0,
				minHeight: 0,
				maximizable: false,
				minimizable: false,
				movable: false,
				show: false
			});
		} else
			return config;
	}

	//unload everything applied
	destroy() {
		if(this._win) {
			this._win.close();
			this._win = null;
		}
		globalShortcut.unregisterAll();
		if(this._tray) {
			this._tray.destroy();
			this._tray = null;
		}
		this._creatingWindow = false;
		this._animating = false;
		this._config = {};
		this._trayAnimation = null;
		this._lastFocus = null;
	}
}

module.exports = Overlay;
