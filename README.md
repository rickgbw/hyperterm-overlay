# HyperTerm Overlay

A complete and customizable solution for a permanent / dropdown / hotkey / overlay window in your Hyper.app, accessible via hotkeys and/or toolbar icon (tray).

**Important:** Designed for Hyper.app >= 0.7.0

![home2](https://cloud.githubusercontent.com/assets/924158/17121698/d122bcaa-52ab-11e6-876c-25a267d00e89.gif)

## Install

Edit your `~/.hyper.js` (`Cmd+,`) and insert the `hyperterm-overlay` in your `plugins` array:
```js
plugins: [
  'hyperterm-overlay'
],
```

## Configuration

Add `overlay` in your `~/.hyper.js` config.
The configuration below shows all possibilities with their respective default values.

```js
module.exports = {
  config: {
    // other configs...
    overlay: {
      alwaysOnTop: true,
      animate: true,
      hasShadow: false,
      hideDock: false,
      hideOnBlur: false,
      hotkeys: ['Option+Space'],
      position: 'top',
      primaryDisplay: false,
      resizable: true,
      startAlone: false,
      startup: false,
      size: 0.4,
      tray: true,
      unique: false
    }
  },
  //...
};
```

### alwaysOnTop
- Value: true or false
- Default: true
- Makes Hyperterm Overlay window stay always on top.

### animate
- Value: true or false
- Default: true
- Enable animation when show and hide the window.

### hasShadow
- Value: true or false
- Default: false
- Controls the default macOS window shadows.

### hideOnBlur
- Value: true or false
- Default: false
- Hides the HyperTerm Overlay when it loses focus.

### hideDock
- Value: true or false
- Default: false
- Removes the HyperTerm dock icon. It works only when the `unique` option is activated.

### hotkeys
- Value: array of hotkey strings
- Default: ['Option+Space']
- Specify one or more hotkeys to show and hide the HyperTerm Overlay (see: [`Accelerator`](https://github.com/electron/electron/blob/master/docs/api/accelerator.md))

### position
- Value: 'top', 'bottom', 'left' or 'right'
- Default: 'top'
- Choose where HyperTerm Overlay will be positioned: `top`, `bottom`, `left` or `right`.

### primaryDisplay
- Value: true or false
- Default: false
- Show HyperTerm Overlay only on primary display.

### resizable
- Value: true or false
- Default: true
- Allow the HyperTerm Overlay be resizable.

![resize](https://cloud.githubusercontent.com/assets/924158/17121469/5281a916-52aa-11e6-92f5-fa1c3dff75c8.gif)

### size
- Value: float or number
- Default: 0.4
- The size of HyperTerm Overlay when it is showing.
 The possible values are a `number` or a `float`.
 If is a number, it represents the size um pixels.
 Else, if is a float, it means the percentage of the screen.

### startAlone
- Value: true or false
- Default: false
- Makes HyperTerm Overlay the unique window displayed when started.
- Other windows started will be default Hyper.app windows.

### startup
- Value: true or false
- Default: true
- Open HyperTerm Overlay on Hyper.app startup.

### tray
- Value: true or false
- Default: true
- Add icon to the system notification area, for access HyperTerm Overlay.

![tray](https://cloud.githubusercontent.com/assets/924158/17121470/5294b02e-52aa-11e6-9bca-9d70f186c60b.gif)

### unique
- Value: true or false
- Default: false
- Makes HyperTerm Overlay the unique window of Hyper.app. Any other window will be removed.

## Licence

[MIT](LICENSE.md)
