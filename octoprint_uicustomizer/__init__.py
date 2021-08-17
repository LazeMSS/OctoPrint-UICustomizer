
# coding=utf-8
from __future__ import absolute_import
from octoprint.server import user_permission

import octoprint.plugin
import os
import flask
import sys
import shutil
import requests

from flask import send_file
from flask import url_for

class UICustomizerPlugin(octoprint.plugin.StartupPlugin,
                       octoprint.plugin.SettingsPlugin,
                       octoprint.plugin.AssetPlugin,
                       octoprint.plugin.TemplatePlugin,
                       octoprint.plugin.EventHandlerPlugin):

    def __init__(self):
        self.themeURL = 'https://lazemss.github.io/OctoPrint-UICustomizerThemes/css/'
        self.themeVersion = 'https://api.github.com/repos/LazeMSS/OctoPrint-UICustomizerThemes/releases/latest'

    def on_after_startup(self):
        self._logger.info("UI Customizer is initialized.")

    def get_assets(self):
        return dict(
            js=["js/uicustomizer.js","js/Sortable.min.js"],
            css=["css/uicustomizer.css"]
        )

    def on_settings_initialized(self):
        curTheme = self._settings.get(["theme"],merged=True,asdict=True)
        themeLocal = self._settings.get(["themeLocal"],merged=True,asdict=True)
        if curTheme:
            self.setThemeFile(curTheme,themeLocal)

    def setThemeFile(self,source,localTheme = True,themeVersion = False):
        baseFolder = os.path.join(os.path.dirname(os.path.realpath(__file__)),'static','themes','css')
        targetTheme = os.path.join(baseFolder,'active.css')
        srcTheme = os.path.join(baseFolder,source+'.css')

        # Download the file or not
        if localTheme == False and source != "default":
            dlURL = self.themeURL+source+".css"
            try:
                r = requests.get(dlURL, allow_redirects=True)
            except Exception as e:
                self._logger.error("Failed to download theme: %s (%s)",dlURL,e);
                return

            if r.status_code == 200:
                with open(srcTheme, 'wb') as f:
                    f.write(r.content)
                    self._logger.info("Downloaded theme: "+dlURL)
            else:
                self._logger.warning("Unable to download theme: "+dlURL);

        if os.path.exists(baseFolder) and os.path.isfile(srcTheme):
            # remove old
            try:
                os.remove(targetTheme)
            except OSError:
                pass

            # symlink on linux else we copy
            if sys.platform.startswith("linux"):
                os.symlink(srcTheme, targetTheme)
            else:
                shutil.copy2(srcTheme, targetTheme)

            # Set the theme version
            if themeVersion == False:
                themeVersion = self.getRemoteThemeVersion()
            if themeVersion != False:
                self._settings.set(["themeVersion"],str(themeVersion))

        else:
            self._logger.warning("Unable to set the theme: %s",srcTheme)

    def getRemoteThemeVersion(self):
        try:
            r = requests.get(self.themeVersion, allow_redirects=True)
        except Exception as e:
            self._logger.error("Failed to get theme version: %s (%s)",self.themeVersion,e);
            return False
        if r.status_code == 200:
            jsonVersion = r.json()
            if "tag_name" in jsonVersion:
                return jsonVersion['tag_name']
        return False

    def loginui_theming(self):
        return [url_for("plugin.uicustomizer.static", filename="themes/css/active.css")]


    # Check for new versions on login
    def on_event(self,event,payload):
        if event == "UserLoggedIn":
            themeLocal = self._settings.get(["themeLocal"],merged=True,asdict=True)
            # Using remote themes?
            if themeLocal == False:
                # Get the remote theme version
                themeVersionRemote = self.getRemoteThemeVersion()
                # Did we get the version no
                if themeVersionRemote != False:
                    # Get local versio no
                    themeVersionLocal = str(self._settings.get(["themeVersion"],merged=True,asdict=True))
                    # Different versions?
                    if themeVersionLocal != themeVersionRemote:
                        themeName = self._settings.get(["theme"],merged=True,asdict=True)
                        self._logger.info("Newer themes found - starting update. %s < %s : %s", themeVersionLocal, themeVersionRemote,themeName)
                        self.setThemeFile(str(themeName),False,themeVersionRemote)


    def on_settings_save(self,data):
        # save
        octoprint.plugin.SettingsPlugin.on_settings_save(self, data)

        # Theme selected - lets fix it
        if 'theme' in data and data['theme']:
            # Local or not
            themeLocal = self._settings.get(["themeLocal"],merged=True,asdict=True)
            self._logger.info("Setting theme \"%s\"",str(data['theme']))
            self.setThemeFile(str(data['theme']),themeLocal)

    # default settings
    def get_settings_defaults(self):
        return {
            "rows" : [
                {
                    "#sidebar_plugin_firmware_check_wrapper": True,
                    "#files_wrapper": True,
                    "#connection_wrapper": True
                },
                {
                    "div.UICmainTabs": True
                },
                {
                    "#UICWebCamWidget": True,
                    "#UICGcodeVWidget": True,
                    "#UICTempWidget" : True,
                    "#state_wrapper": True,
                    "#sidebar_plugin_action_command_notification_wrapper": True
                }
            ],
            "widths" : [3,6,3],
            "fluidLayout" : True,
            "fixedHeader" : True,
            "fixedFooter" : True,
            "hideGraphBackground" : True,
            "responsiveMode": True,
            "navbarplugintempfix": True,
            "addWebCamZoom" : True,
            "webcamzoomtype" : "float",
            "centerTopIcons": True,
            "compactMenu": True,
            "hideMainCam": False,
            "gcodeFullWidth": False,
            "filesFullHeight": True,
            "compressTempControls" : True,
            "disableTermInactive": False,
            "mainTabsCustomize" : True,
            "mainTabs": [
                ['control_link',True,False,'fas fa-expand-arrows-alt',True,False],
                ['temp_link',True,False,'fas fa-thermometer-half',True,False],
                ['timelapse_link',True,False,'fas fa-film',True,False],
                ['term_link',True,False,'fas fa-terminal',True,False],
                ['gcode_link',True,False,'fab fa-codepen',True,False],
            ],
            'mainTabsIconSize': '',
            "topIconSort" : [],
            "gcodeZoom": 3,
            "theme" : "default",
            "themeLocal" : True,
            "customCSS" : "",
            "themeVersion": "0"
        }

    def get_template_configs(self):
        return [
            dict(type="settings", custom_bindings=False)
        ]

    def get_update_information(self):
        # Define the configuration for your plugin to use with the Software Update
        # Plugin here. See https://docs.octoprint.org/en/master/bundledplugins/softwareupdate.html
        # for details.
        return dict(
            uicustomizer=dict(
                displayName=self._plugin_name,
                displayVersion=self._plugin_version,

                # version check: github repository
                type="github_release",
                user="LazeMSS",
                repo="OctoPrint-UICustomizer",
                current=self._plugin_version,

                # update method: pip
                pip="https://github.com/LazeMSS/OctoPrint-UICustomizer/archive/{target_version}.zip"
            )
        )


__plugin_name__ = "UI Customizer"
__plugin_pythoncompat__ = ">=2.7,<4"

def __plugin_load__():
    global __plugin_implementation__
    __plugin_implementation__ = UICustomizerPlugin()

    global __plugin_hooks__
    __plugin_hooks__ = {
        "octoprint.theming.login": __plugin_implementation__.loginui_theming,
        "octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information
    }
