
# coding=utf-8
from __future__ import absolute_import
from octoprint.server import user_permission

import octoprint.plugin
import os
import flask
import sys
import shutil

from flask import send_file

class UICustomizerPlugin(octoprint.plugin.StartupPlugin,
                       octoprint.plugin.SettingsPlugin,
                       octoprint.plugin.AssetPlugin,
                       octoprint.plugin.TemplatePlugin,
                       octoprint.plugin.SimpleApiPlugin):

    def on_after_startup(self):
        self._logger.info("UI Customizer is initialized.")

    def get_assets(self):
        return dict(
            js=["js/uicustomizer.js","js/Sortable.min.js"],
            css=["css/uicustomizer.css"]
        )

    def on_settings_initialized(self):
        curTheme = self._settings.get(["theme"],merged=True,asdict=True)
        if curTheme:
            self.setThemeFile(curTheme)

    def setThemeFile(self,source):
        baseFolder = os.path.join(os.path.dirname(os.path.realpath(__file__)),'static','themes','css')
        srcTheme = os.path.join(baseFolder,source+'.css')
        targeTheme = os.path.join(baseFolder,'active.css')
        if os.path.exists(baseFolder) and os.path.isfile(srcTheme):
            # remove old
            try:
                os.remove(targeTheme)
            except OSError:
                pass

            # symlink on linux else we copy
            if sys.platform.startswith("linux"):
                os.symlink(srcTheme, targeTheme)
            else:
                shutil.copy2(srcTheme, targeTheme)

        else:
            self._logger.info("Unable to set the theme: %s",srcTheme)

    def on_settings_save(self,data):
        # save
        octoprint.plugin.SettingsPlugin.on_settings_save(self, data)

        # set theme
        if 'theme' in data and data['theme']:
            self.setThemeFile(str(data['theme']))

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
            "topIconSort" : [],
            "gcodeZoom": 3,
            "theme" : "default",
            "customCSS" : ""
        }

    def get_template_configs(self):
        return [
            dict(type="settings", custom_bindings=False)
        ]


    def get_api_commands(self):
        return dict(
            themes=[],
        )

    def on_api_command(self, command, data):
        if not user_permission.can():
            return flask.make_response("Insufficient rights", 403)

        if command == "themes":
            themeFile = os.path.join(os.path.dirname(os.path.realpath(__file__)),'static','themes.json')
            if os.path.isfile(themeFile):
                return send_file(themeFile, mimetype='application/json')
            else:
                return flask.make_response("Themes not found", 404)

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
        "octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information
    }