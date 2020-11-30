# UI Customizer

A [OctoPrint](https://github.com/foosel/OctoPrint) plugin that allows you to customize the look and feel of the user interface.
It also features a lot of other fixes and improvements:
* Change width of the columns
* Move "widgets" around in columns
* Turn on/off responsive layout
* Improved settings window
* Fixed header/topbar
* Fixed footer/bottombar
* Fluid/full width layout
* Hide temperature background graphics
* Zoomed/Floating webcam option
* Extra Webcam "widget"
* [Compact Navbar temp](https://plugins.octoprint.org/plugins/navbartemp/) icons
* Hide widget
* Realtime preview of changes
* Center top bar icons

## Setup

Install via the bundled [Plugin Manager](https://github.com/foosel/OctoPrint/wiki/Plugin:-Plugin-Manager)
or manually using this URL:

    https://github.com/LazeMSS/OctoPrint-UICustomizer/archive/main.zip


## Configuration
The configuration is split into two sections - the top checkboxes for switching features on and off.
![](extras/settings.png)

### Features
* Realtime preview - switching this on will minimize the settingsdialog and preview any changes made to UI Customizer settings directly in the UI
* Fixed header/topbar - should the top menubar stay fixed when scrolling or not
* Fixed footer/bottombar - should the bottom bar stay fixed when scrolling or not
* Compact ["Navbar temperature plugin"](https://plugins.octoprint.org/plugins/navbartemp/) - will add icons and shrink the temperature display on this awesome plugin
* Fluid/full width layout - should the entire screen width be used or not
* Improve mobile/responsive - enable the improved responsive modes including settings for mobile screens etc.
* Zoom/float webcam icon - will add an zoom icon to the webcam live feed that will popup out the webcam video feed into a floating resizeable overlay

### Layout
The layout of the screen can be made into 1,2 or 3 columns and the size of the columns can be adjusted. The total width of the columns added together must not be greater than 12. Each column can contain zero or more widgets, widgets are the diffent "containers" for all the user interface, ie. the webcam, files etc.
If you want a two or one column layout then just drag the "widgets" all the widgets into the left hand side columns.
Each widget can be moved by draging. The widgets can also be hidden by clicking the eye on the right hand side of the widget.

## Screenshots/Video
[YouTube](https://youtu.be/BTiI6i1Rc5c)
### Responsive layouts
![](extras/responsive.png)
### Overview with webcam widget
![](extras/camwidget.png)
### Floating webcam
![](extras/floating.png)
### Compact Navbar temp
![](extras/compactnav.png)
