'use strict';

//dependencies
const electron = require('electron');
const {BrowserWindow,globalShortcut,Tray,Menu,nativeImage} = electron;
const path = require('path');

//check if platform is Mac
const isMac = process.platform === 'darwin';

class Overlay {
	constructor() {
		this._app = null;
		this._win = null;
		this._creatingWindow = false;
		this._decoratingWindow = false;
		this._animating = false;
		this._config = {};
		this._tray = null;
		this._trayAnimation = null;
		this._lastFocus = null;
		this._forceStartup = false;

		//store tray images
		this._trayImage = nativeImage.createFromPath(path.join(__dirname, 'images', 'trayTemplate.png'));
		this._tray2Image = nativeImage.createFromPath(path.join(__dirname, 'images', 'tray2Template.png'));
		this._trayPressedImage = nativeImage.createFromPath(path.join(__dirname, 'images', 'tray-hover.png'));
	}

	//app started
	registerApp(app) {
		let startup = false;

		//subscribe for config changes only on first time
		if(!this._app) {
			app.config.subscribe(() => {
				if(this._win)
					this._refreshConfig(true);
			});
			startup = true;
		}

		//load user configs
		this._app = app;

		//creating the overlay window
		this._create(() => {
			//open on startup
			if((startup && this._config.startup) || this._forceStartup)
				this.show();
		});
	}

	//checks if new window could be created
	registerWindow(win) {
		if(!this._creatingWindow && this._config.unique)
			win.close();
		else if(this._decoratingWindow)
			this._decoratingWindow = false;
	}

	//creating a new overlay window
	_create(fn) {
		if(this._win) return;

		this._creatingWindow = true;
		this._decoratingWindow = true;

		this._app.createWindow(win => {
			this._win = win;

			//apply configurations
			this._refreshConfig();

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
			win.hide();

			//activate terminal
			win.rpc.emit('termgroup add req');

			//callback
			this._creatingWindow = false;
			if(fn) fn();
		});
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
			if((userConfig.unique && !this._config.unique) || (userConfig.startAlone && !reapply)) {
				this._app.getWindows().forEach(win => {
					if(win != this._win)
						win.close();
				});
			}
		}

		//default configuration
		this._config = {
			alwaysOnTop: true,
			animate: true,
			hasShadow: false,
			hideDock: false,
			hideOnBlur: false,
			hotkeys: ['Option+Space'],
			position: 'top',
			primaryDisplay: false,
			resizable: true,
			size: 0.4,
			startAlone: false,
			startup: false,
			tray: true,
			unique: false
		};

		//replacing user preferences
		if(userConfig) Object.assign(this._config,userConfig);

		//registering the hotkeys
		globalShortcut.unregisterAll();
		for(let hotkey of this._config.hotkeys)
			globalShortcut.register(hotkey, () => this.interact());

		//tray icon
		let trayCreated = false;
		if(this._config.tray && !this._tray) {
			//prevent destroy / create bug
			this._tray = new Tray(this._trayImage);
			this._tray.setToolTip('Open HyperTerm Overlay');
			this._tray.setPressedImage(this._trayPressedImage);
			this._tray.on('click', () => this.interact());
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

	//tray animation when overlay window is open
	_animateTray() {
		if(!this._config.tray || !this._tray) return;

		//tool tip
		this._tray.setToolTip('Close HyperTerm Overlay');

		if(isMac) {
			if(this._trayAnimation) clearInterval(this._trayAnimation);
			let type = 0;
			this._trayAnimation = setInterval(() => {
				if(this._tray)
					this._tray.setImage((++type % 2) ? this._trayImage : this._tray2Image);
			},400);
		}
	}

	//finish tray animation
	_clearTrayAnimation() {
		if(this._trayAnimation) clearInterval(this._trayAnimation);

		if(this._tray) {
			this._tray.setToolTip('Open HyperTerm Overlay');
			if(isMac) this._tray.setImage(this._trayImage);
		}
	}

	//setting initial configuration for the new window
	decorateBrowserOptions(config) {
		if(this._decoratingWindow) {
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

	//open or close overlay window
	interact() {
		if(!this._win) {
			//re-create overlay window and show
			this._create(() => this.show());
			return;
		}

		if(!this._win.isVisible())
			this.show();
		else
			this.hide();
	}

	//show the overlay window
	show() {
		if(!this._win || this._animating || this._win.isVisible()) return;

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
				else if(isMac)
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

	//unload everything applied
	destroy() {
		if(this._tray) {
			this._tray.destroy();
			this._tray = null;
		}
		if(this._win) {
			//open again if is a plugin reload
			this._forceStartup = (this._win.isVisible());
			this._win.close();
			this._win = null;
		}
		globalShortcut.unregisterAll();
		this._creatingWindow = false;
		this._decoratingWindow = false;
		this._animating = false;
		this._config = {};
		this._lastFocus = null;
	}
}

module.exports = new Overlay();
