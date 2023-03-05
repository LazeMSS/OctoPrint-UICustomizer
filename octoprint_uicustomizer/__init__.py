
# coding=utf-8
from __future__ import absolute_import
from octoprint.server import user_permission

import octoprint.plugin
import os
import flask
import sys
import shutil
import requests
import time

class UICustomizerPlugin(octoprint.plugin.StartupPlugin,
                       octoprint.plugin.SettingsPlugin,
                       octoprint.plugin.AssetPlugin,
                       octoprint.plugin.TemplatePlugin,
                       octoprint.plugin.EventHandlerPlugin,
                       octoprint.plugin.BlueprintPlugin):

    def __init__(self):
        self.remoteThemeCheck = 0
        self.baseFolder  = os.path.join(os.path.dirname(os.path.realpath(__file__)),'static','themes','css')
        self.themeURL = 'https://lazemss.github.io/OctoPrint-UICustomizerThemes/css/'
        self.themeVersion = 'https://api.github.com/repos/LazeMSS/OctoPrint-UICustomizerThemes/releases/latest'

    def on_after_startup(self):
        # self._logger.warning(self.get_plugin_data_folder())
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
        srcTheme = os.path.join(self.baseFolder,source+'.css')

        # Download the file or not
        if localTheme == False and source != "default":
            dlURL = self.themeURL+source+".css"
            try:
                r = requests.get(dlURL, allow_redirects=True)
            except Exception as e:
                self._logger.error("Failed to download theme: %s (%s)",dlURL,e)
                return

            if r.status_code == 200:
                with open(srcTheme, 'wb') as f:
                    f.write(r.content)
                    self._logger.info("Downloaded theme: "+dlURL + " into: " + srcTheme)
            else:
                self._logger.warning("Unable to download theme: "+dlURL + " into: " + srcTheme)

        # Set the theme version
        if themeVersion == False:
            themeVersion = self.getRemoteThemeVersion()

        # anything found then lets store it
        if themeVersion != False:
            self._settings.set(["themeVersion"],str(themeVersion))

    def getRemoteThemeVersion(self):
        try:
            r = requests.get(self.themeVersion, allow_redirects=True)
        except Exception as e:
            self._logger.error("Failed to get theme version: %s (%s)",self.themeVersion,e)
            return False
        if r.status_code == 200:
            jsonVersion = r.json()
            if "tag_name" in jsonVersion:
                return jsonVersion['tag_name']
        return False

    def loginui_theming(self):
        theme = self._settings.get(["theme"],merged=True,asdict=True)
        return [flask.url_for("plugin.uicustomizer.static", filename="../theme/"+theme+".css")]

    # Check for new versions on login
    def on_event(self,event,payload):
        if event == "UserLoggedIn":
            # only check for new themes every hour
            curTime = int(time.time())
            if (curTime-self.remoteThemeCheck > 3600):
                self._logger.info("Checking for updated themes")
                self.remoteThemeCheck = curTime
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
                            self._logger.info("New themes found - starting update. %s != %s : %s", themeVersionLocal, themeVersionRemote, themeName)
                            self.setThemeFile(str(themeName),False,themeVersionRemote)

    def on_settings_save(self,data):
        # save
        octoprint.plugin.SettingsPlugin.on_settings_save(self, data)

        # Theme selected - lets download and update
        if 'theme' in data and data['theme']:
            # Local or not
            themeLocal = self._settings.get(["themeLocal"],merged=True,asdict=True)
            self._logger.info("Saving theme \"%s\"",str(data['theme']))
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
            "saveAccordions" : False,
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

    # Download services
    @octoprint.plugin.BlueprintPlugin.route("/download", methods=["GET"])
    def download(self):
        if not "settings" in flask.request.values:
            flask.abort(400, description="Nothing requested to download")

        settingsData = self._settings.get_all_data()
        settingsData['UICSettings'] = self._plugin_version
        self._logger.info("Sending settings")
        return settingsData, 200, {"Content-Disposition": "attachment; filename=\"UICustomizerSettings.json\""}

    def is_blueprint_csrf_protected(self):
        return True

    def route_hook(self, server_routes, *args, **kwargs):
        from octoprint.server.util.tornado import LargeResponseHandler, path_validation_factory
        from octoprint.util import is_hidden_path
        return [
            (r"theme/(.*)", LargeResponseHandler,
             {'path': self.baseFolder, 'as_attachment': False, 'path_validation': path_validation_factory(
                 lambda path: not is_hidden_path(path), status_code=404)})
        ]

__plugin_name__ = "UI Customizer"
__plugin_pythoncompat__ = ">=2.7,<4"

def __plugin_load__():
    global __plugin_implementation__
    __plugin_implementation__ = UICustomizerPlugin()

    global __plugin_hooks__
    __plugin_hooks__ = {
        "octoprint.theming.login": __plugin_implementation__.loginui_theming,
        "octoprint.server.http.routes": __plugin_implementation__.route_hook,
        "octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information
    }
