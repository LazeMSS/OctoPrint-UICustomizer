/* UICustomizer START */

// ALways make us able to get the viewport side
$('head').prepend('<link rel="stylesheet" href="./plugin/uicustomizer/static/css/loader.css">');

// Preloader to  make it pretty
$('head').prepend('<meta id="UICViewport" name="viewport" content="width=device-width, initial-scale=1.0">');

// Set theme onload from storage if possible
var UICPreLoadTheme  = "default";
var UICThemeV = 0;
if (Modernizr.localstorage){
    if (window.location.pathname != "/"){
        UICPreLoadTheme = localStorage['plugin.uicustomizer.'+window.location.pathname+'theme'];
        UICThemeV = localStorage['plugin.uicustomizer.'+window.location.pathname+'themeversion'];
    }else{
        UICPreLoadTheme = localStorage['plugin.uicustomizer.theme'];
        UICThemeV = localStorage['plugin.uicustomizer.themeversion'];
    }

    if (UICPreLoadTheme == undefined || UICPreLoadTheme == "" || UICPreLoadTheme == null){
        UICPreLoadTheme = "default";
    }
    if (UICThemeV == undefined || UICThemeV == "" || UICThemeV == null){
        UICThemeV = 0;
    }
}
// Prevent browser caching we use the names
$('body').append('<link class="UICThemeCSS" rel="stylesheet" href="./plugin/uicustomizer/theme/'+UICPreLoadTheme+'.css?v='+UICThemeV+'">');
delete UICPreLoadTheme,UICThemeV;
// we will remove it again if user has opted out - this will just make it more clean on showing the UI
$('body').append('<link class="UICBSResp" rel="stylesheet" href="./plugin/uicustomizer/static/css/bootstrap-responsive.css">');


// Now we start
$(function() {
    $('#control > #webcam_container > #webcam_rotator').attr('data-webcamorg','true');
    $('#control > #webcam_container').attr('data-webcamorg','true');
    function UICustomizerViewModel(parameters) {
        var self = this;
        // Run in debug/verbose mode
        self.debug = false;

        // Set settings
        self.coreSettings = parameters[0];
        self.settings = null;
        self.UICsettings = null;
        self.tempModel = parameters[2] ? parameters[2] : parameters[1];
        self.newCam = parameters[3] ? true : false;
        self.camModel = parameters[3];

        // Ignore these accordions - warnings about safety should always be shown
        self.accordIgnore = ['sidebar_plugin_firmware_check_info','sidebar_plugin_firmware_check_warning'];

        // max column width
        self.maxCWidth = 12;

        self.saved = false;

        // Setting preview
        self.previewOn = false;
        self.previewHasBeenOn = false;
        self.settingsBeenShown = false;

        self.gCodeViewerActive = false;
        self.tempGraphActive = false;

        self.ThemesLoaded = false;
        self.ThemesInternalURL = './plugin/uicustomizer/static/themes/';
        self.ThemesBaseURL = self.ThemesInternalURL;

        self.ThemesExternalURL = 'https://lazemss.github.io/OctoPrint-UICustomizerThemes/';
        self.GitHubBaseUrL = 'LazeMSS/OctoPrint-UICustomizerThemes/releases/latest';

        // timer for resize fix modal
        self.modalTimer = null;

        self.nameLookup = {
            'div.UICmainTabs' : '<i class="fas fa-columns"></i> Main tabs',
            '#UICWebCamWidget' : '<i class="fas fa-camera"></i> Webcam',
            '#UICGcodeVWidget' : '<i class="fab icon-black fa-codepen"></i> Gcode',
            '#UICTempWidget' : '<i class="fas fa-thermometer-half icon-black"></i> Temperature'
        }

        self.customWidgets = {
            '#UICWebCamWidget' : {
                'dom': '<div id="UICWebCamWidget" class="accordion-group " data-bind="visible: loginState.hasAnyPermissionKo(access.permissions.WEBCAM)">\
                            <div class="accordion-heading">\
                                <a class="accordion-toggle" data-toggle="collapse" data-target="#IUCWebcamContainer">\
                                    <i class="fas icon-black fa-camera"></i> Webcam\
                                </a>\
                            </div>\
                            <div id="IUCWebcamContainer" class="accordion-body in collapse">\
                                <div class="accordion-inner">\
                                    <div id="IUCWebcamContainerSrc" class="UIC_webcam_container_clone"></div>\
                                    <div class="UICwebcamdockinfo muted">Webcam is active in Control section&hellip;</div>\
                                    <div class="UICWebCamWidgetWait text-center UIC-pulsate text-info"><i class="fas fa-spinner fa-spin"></i> Loading webcam&hellip;</div>\
                                </div>\
                            </div>\
                        </div>',
                'init' : 'CustomW_initWebCam',
            },
            '#UICGcodeVWidget' : {
                'dom': '<div id="UICGcodeVWidget" class="accordion-group " data-bind="allowBindings: true, visible: loginState.hasAllPermissionsKo(access.permissions.GCODE_VIEWER, access.permissions.FILES_DOWNLOAD)">\
                            <div class="accordion-heading">\
                                <a class="accordion-toggle" data-toggle="collapse" data-target="#UICGcodeVWidgetContainer">\
                                    <i class="fab icon-black fa-codepen"></i> Gcode\
                                </a>\
                                <div class="btn-group UICWidgetSelector"><a class="btn btn-small dropdown-toggle" data-toggle="dropdown" href="#">Zoom:<span id="UICGcodeVWidgetZL"></span><span class="caret"></span></a><ul class="dropdown-menu"><li><a href="javascript:void(0);" data-zoomlvl=3>3</a></li><li><a href="javascript:void(0);" data-zoomlvl=2>2</a></li><li><a href="javascript:void(0);" data-zoomlvl=1.5>1.5</a></li><li><a href="javascript:void(0);" data-zoomlvl=1>1</a></li></ul></div>\
                            </div>\
                            <div id="UICGcodeVWidgetContainer" class="accordion-body in collapse">\
                                <div class="accordion-inner">\
                                    <canvas id="UICGcodeVWidgetCan"/>\
                                </div>\
                            </div>\
                        </div>',
                'init' : 'CustomW_initGcode',
            },
            '#UICTempWidget' : {
                'dom': '<div id="UICTempWidget" class="accordion-group " data-bind="allowBindings: true, visible: loginState.hasAnyPermissionKo(access.permissions.STATUS)">\
                            <div class="accordion-heading">\
                                <a class="accordion-toggle" data-toggle="collapse" data-target="#UICTempWidgetContainer">\
                                    <i class="fas fa-thermometer-half icon-black"></i> Temperature\
                                </a>\
                            </div>\
                            <div id="UICTempWidgetContainer" class="accordion-body in collapse">\
                                <div class="accordion-inner">\
                                    <div id="UICTempWidgetGraph"></div>\
                                </div>\
                            </div>\
                        </div>',
                'init' : 'CustomW_initTempGraph',
            }
        }

        // Store sort
        self.SortableSet = [];

        // Load theme first up when ready
        self.curTheme = "default";


        // ------------------------------------------------------------------------------------------------------------------------
        // Quick debug
        self.logToConsole = function(msg){
            if (!self.debug){
                return true;
            }
            if (typeof console.log == "function"){
                console.log('UICustomizer:',msg)
            }
        }

        // ------------------------------------------------------------------------------------------------------------------------
        // Initial bound and init the custom layout
        self.onAllBound = function(){

            self.settings = self.coreSettings.settings;
            self.UICsettings = self.coreSettings.settings.plugins.uicustomizer;



            // Cleanup everything if using touch ui
            if (typeof OctoPrint.coreui.viewmodels.touchUIViewModel != "undefined"){
                if(window.location.hash == "#touch"){
                    OctoPrint.coreui.viewmodels.touchUIViewModel.DOM.storage.set('active',true);
                    $('#page-container-loading-header').html($('#page-container-loading-header').html()+ "<br><small>Disabling UI Customizer..</small>");
                    $('link.UICThemeCSS,link.UICBSResp').remove();
                    return;
                }else if(OctoPrint.coreui.viewmodels.touchUIViewModel.DOM.storage.get('active') == true){
                    $('#page-container-loading-header').html($('#page-container-loading-header').html()+ "<br><small>Disabling Touch UI and reloading...</small>");
                    OctoPrint.coreui.viewmodels.touchUIViewModel.DOM.storage.set('active',false);
                    document.location.hash = "";
                    document.location.reload();
                    return;
                }
            }

            // Handle main webcam on off stuff
            if (self.newCam){
                $('#tabs').on('shown.bs.tab.uicust','a[data-toggle="tab"]', function (e) {
                    if ($('#UICWebCamFull:visible').length == 0){
                        self.webcamAttachHandler();
                    }
                });
            }else{
                // Assign the fallback method
                self.camModel = OctoPrint.coreui.viewmodels.controlViewModel;
            }

            // Load from storage
            self.curTheme = self.getStorage('theme',false);

            // Set theme version
            var curVersion = self.UICsettings.themeVersion();
            var curVersionStor = self.getStorage('themeversion',false);
            if (curVersion != curVersionStor && curVersionStor != undefined){
                var titleStr = "Themes updated";
                var textStr = 'UI Customizer themes has been updated.';
                var textStrFooter = '<hr class="UICUpdateHR">UICustomizer<a target="_blank" class="pull-right" href="https://github.com/'+self.GitHubBaseUrL+'">Release notes <i class="fas fa-external-link-alt"></i></a>';

                // Markup fixer - not pretty
                var htmlmarkupfix = function(str){
                    str = str + "\r\n";
                    var regex = /^(###|##|#)(.*)$/gm;
                    var newStr = str.replace(regex, "<b>$2</b>");

                    regex = /\*\*/gm;
                    var boldOn = true;
                    newStr = newStr.replace(regex, function(x){
                        boldOn = !boldOn;
                        if (boldOn){
                            return "</b>";
                        }else{
                            return "<b>";
                        }
                    });
                     regex = /\_/gm;
                    var italicOn = true;
                    newStr = newStr.replace(regex, function(x){
                        italicOn = !italicOn;
                        if (italicOn){
                            return "</em>";
                        }else{
                            return "<em>";
                        }
                    });

                    regex = /^(?:[*+-]) */gm;
                    newStr = newStr.replace(regex, '<li>');
                    regex = /<li>(.*)/gm;
                    newStr = newStr.replace(regex, `<li>$1</li>`);
                    regex = /^(?!<li>)^(?!\s*$)(.+)\r\n<li>/gm;
                    newStr = newStr.replace(regex, `$1\r\n<ul><li>`);
                    regex = /^(<li>|<ul><li>)(.*)$(\r\n)(?!<li>)/gm;
                    newStr = newStr.replace(regex, `$1$2</ul>`);
                    regex = /^<li>/;
                    newStr = newStr.replace(regex, `<ul><li>`);

                    regex = /^\d{1,9}[.)]/gm;
                    newStr = newStr.replace(regex, '<lino>');
                    regex = /<lino>(.*)/gm;
                    newStr = newStr.replace(regex, `<lino>$1</lino>`);
                    regex = /^(?!<lino>)^(?!\s*$)(.+)\r\n<lino>/gm;
                    newStr = newStr.replace(regex, `$1\r\n<ol><lino>`);
                    regex = /^(<lino>|<ul><lino>)(.*)$(\r\n)(?!<lino>)/gm;
                    newStr = newStr.replace(regex, `$1$2</ol>`);
                    newStr = newStr.replace("lino>","li>");

                    regex = /(<\/li>|<\/ul>)\r\n/gm;
                    newStr = newStr.replace(regex, "$1");
                    return $.trim(newStr);
                };

                $.ajax({
                    url: "https://api.github.com/repos/"+self.GitHubBaseUrL,
                    dataType: 'jsonp'
                }).done(function( response ) {
                    if ("data" in response){
                        if ("name" in response.data){
                            textStr = '<b>'+response.data.name+'</b>' + "\n";
                        }
                        if ("body" in response.data){
                            textStr += htmlmarkupfix(response.data.body);
                        }
                    }
                    new PNotify({title:titleStr, type: "info","text": textStr + textStrFooter,"hide":false});
                }).fail(function( data ) {
                    new PNotify({title:titleStr, type: "info","text": textStr + textStrFooter,"hide":false});
                }).always(function(){
                    self.setStorage('themeversion',self.UICsettings.themeVersion(),false);
                });
            }

            // Set names
            $('#tabs').parent().addClass('UICmainTabs').wrap( '<div class="UICCol2"></div>');
            $('#sidebar').addClass('UICCol1');
            $('div.octoprint-container').addClass('UICMainCont');
            $('#navbar div.navbar-inner > div > div.nav-collapse').addClass('UICMainMenu');
            $('#navbar_plugin_announcements').addClass('UICExcludeFromTopIcons');

            // Disable output off the terminal if inactive
            var oldfunction = OctoPrint.coreui.viewmodels.terminalViewModel._processCurrentLogData;
            OctoPrint.coreui.viewmodels.terminalViewModel._processCurrentLogData = function(data) {
                if (self.UICsettings.disableTermInactive() && (!OctoPrint.coreui.viewmodels.terminalViewModel.tabActive || !OctoPrint.coreui.browserTabVisible)){
                    return;
                }
                oldfunction(data);
            };

            // Fix SD card upload
            $('#gcode_upload_sd').parent().find('i.fas.fa-upload').removeClass('fa-upload').addClass('fa-sd-card');

            // Load custom layout
            self.UpdateLayout(self.UICsettings);

            // Rewrite the tab selector for settings - https://github.com/LazeMSS/OctoPrint-UICustomizer/issues/95
            var prevTab = self.coreSettings.selectTab;
            self.coreSettings.selectTab = function(tab){
                if ($('body').hasClass('UICResponsiveMode')){
                    if (tab != undefined) {
                        if (tab[0] != "#") { tab = "#" + tab; }
                        $('#UICsettingsMenu a[href="'+tab+'"]').tab('show')
                    } else {
                        $('#UICsettingsMenu a[data-toggle="tab"]:first').tab('show')
                    }
                }else{
                    prevTab(tab);
                }
            }

            // All the old school webcam stuff
            if (!self.newCam){
                // Unload on tab change wrapper for handle webcam widget/fullscreen not getting disabled
                var orgTabChange = OctoPrint.coreui.viewmodels.controlViewModel.onTabChange;
                OctoPrint.coreui.viewmodels.controlViewModel.onTabChange = function(current, previous){
                    if (self.coreSettings.webcam_webcamEnabled()){
                        // When the full screen webcam is running dont do anything
                        if ($('#UICWebCamFull:visible').length){
                            return;
                        }
                        // If we have the widget then we need to dock or not dock based on which tabs we are joining/leaving
                        if ($('#UICWebCamWidget').length){
                            // undock/Redock the main cam
                            if (current == "#control"){
                                self.webcamAttachHandler();
                                OctoPrint.coreui.viewmodels.controlViewModel.onBrowserTabVisibilityChange(true);
                            }
                            if (previous == "#control"){
                                self.webcamAttachHandler();
                            }
                            if (self.camModel.webcamDisableTimeout != undefined) {
                                clearTimeout(self.camModel.webcamDisableTimeout);
                                self.camModel.webcamDisableTimeout = undefined;
                            }
                            return;
                        }
                    }
                    orgTabChange(current, previous);
                };

                // When octoprint get focus back from the user we check to see if we wan't the streamning to start or not - by default streamning will only resume if the control tab is open
                var orgBTabVis = OctoPrint.coreui.viewmodels.controlViewModel.onBrowserTabVisibilityChange;
                OctoPrint.coreui.viewmodels.controlViewModel.onBrowserTabVisibilityChange = function(status){
                    if (self.coreSettings.webcam_webcamEnabled()){
                        // Back
                        if (status){
                            var bForceWCLoad = false;
                            // full screen
                            if ($('#UICWebCamFull:visible').length){
                                bForceWCLoad = true;
                            // On the control tab
                            }else if (OctoPrint.coreui.selectedTab == "#control" && !self.UICsettings.hideMainCam()){
                                bForceWCLoad = true;
                            // Webcam widget active
                            }else if ($('#IUCWebcamContainer').hasClass('in')){
                                bForceWCLoad = true;
                            }
                            if (bForceWCLoad){
                                var selTab = OctoPrint.coreui.selectedTab;
                                OctoPrint.coreui.selectedTab = '#control';
                                // Trigger change
                                orgBTabVis(true);
                                // Restore
                                OctoPrint.coreui.selectedTab = selTab;
                                return;
                            }
                        }
                    }
                    orgBTabVis(status);
                }

                self.camModel.webcamLoaded.subscribe(function(loadStatus){
                    if (self.coreSettings.webcam_webcamEnabled() && self.webcamInWidget()){
                        if (loadStatus){
                            $('.UICWebCamWidgetWait,.UICwebcamLoading').hide();
                        }else{
                            $('.UICWebCamWidgetWait,.UICwebcamLoading').show();
                        }
                    }
                });

                self.camModel.webcamError.subscribe(function(){
                    if (self.coreSettings.webcam_webcamEnabled() && self.webcamInWidget()){
                        $('.UICWebCamWidgetWait,.UICwebcamLoading').show();
                    }
                });
            }


            // Observe theme changes
            self.coreSettings.appearance_color.subscribe(function(color) {
                self.updateStandardTheme(color);
            });

            // Remove hardcode css to make it easier to use skins
            var styleSrcs = [];
            var cssLookUp = [
                'static/webassets/packed_core.css',
                'static/css/octoprint.css',
                'static/webassets/packed_plugins.css',
                'plugin/navbartemp/static/css/navbartemp.css'
            ];
            var cssFind = null;
            $.each(cssLookUp,function(i,cval){
                if ((cssFind = self.getStyleSheet(cval)) != null){
                    styleSrcs.push(cssFind);
                }
            });
            if (styleSrcs.length){
                $.each(styleSrcs,function(idx,styleSrc){
                    $.each(styleSrc.sheet.cssRules,function(index,val){
                        if (this.selectorText != undefined){
                            if (this.selectorText == ".octoprint-container .accordion-heading .accordion-heading-button a"){
                                this.selectorText = ".octoprint-container .accordion-heading .accordion-heading-button >a";
                            }
                            if (this.selectorText.indexOf('#navbar .navbar-inner .nav') != -1){
                                this.selectorText = '#navbardisabledByUIC'
                            }
                            if (this.selectorText == "#navbar .navbar-inner"){
                                this.selectorText = '#navbardisabledByUIC'
                            }
                            // Fix coding for navbar temp
                            if (this.selectorText == "#navbar_plugin_navbartemp .navbar-text"){
                                this.selectorText = '#navbardisabledByUIC'
                            }
                        }
                    })
                });
            }


            // Fix height problem on first run
            $('div.UICMainMenu a.dropdown-toggle').one('click.UICMainMenu',function(){
                $('div.UICMainMenu').css({'height':'auto'});
            });


            // Wait for plugins to be ready
            var subPlugins = OctoPrint.coreui.viewmodels.pluginManagerViewModel.plugins.items.subscribe(function(data) {
                subPlugins.dispose();
                if (OctoPrint.coreui.viewmodels.pluginManagerViewModel.plugins.allItems.length != 0){
                    self.handleOtherPlugins();
                }
            });


            // Refresh all
            window.setTimeout(function() {
                $(window).trigger('resize');

                if (!self.newCam && self.coreSettings.webcam_webcamEnabled() && $('#UICWebCamWidget').length && $('#IUCWebcamContainer').hasClass('in')){
                    self.webcamAttachHandler();
                    OctoPrint.coreui.viewmodels.controlViewModel.onBrowserTabVisibilityChange(true);
                }

                // Restore saved accordion states and heights
                if (self.UICsettings.saveAccordions()){
                    var curAccords = self.getStorage('accordions',true);
                    if (curAccords != undefined){
                        $.each(curAccords,function(id,state){
                            if ($.inArray(id.replace("#",""),self.accordIgnore) != -1){
                                return true;
                            }
                            var target = $(id);
                            if(target && state != target.hasClass('in')){
                                $(id).collapse("toggle");
                                // Files is kinda special
                                if (id == "#files"){
                                    $(id).removeClass('overflow_visible');
                                    OctoPrint.coreui.viewmodels.filesViewModel.filesListVisible(false);
                                }
                            }
                        });
                    }
                }

                // Fix gcode widget if empty
                if (self.gCodeViewerActive && $('#UICGcodeVWidgetCan').attr('width') == undefined){
                    self.cloneGcodeWidget();
                }

                // Disable/Enable storage of accordion states again just to make sure
                self.set_saveAccordions(self.UICsettings.saveAccordions());

                if (self.UICsettings.filesFullHeight()){
                    // Restore saved heights
                    var vertHeights = self.getStorage('vertHeights',true);
                    if (vertHeights != undefined){
                        $.each(vertHeights,function(id,height){
                            var target = $(id);
                            if(target && height > 0){
                                target.css('height',height+"px");
                            }
                        });
                    }
                }
            },500);

            // Fix slow loading plugin navbar icons and fix css problems
            window.setTimeout(function() {
                $('ul.UICHeaderIcons').append($('div.UIHeaderWrap > li[id^="navbar_plugin"]:not(.UICExcludeFromTopIcons)'));
                self.fixWrapWidth();

                // Final check to make sure CSS is not broken by other plugins etc.
                if($('link.UICBSResp').length || $('link.UICThemeCSS').length){
                    // Make sure responsive and themes are last
                    var allCSS = $('link[rel="stylesheet"]');
                    if ($('body').hasClass('UICResponsiveMode') && $('link.UICBSResp').length && (allCSS.length-1) > allCSS.index($('link.UICBSResp'))){
                        $('link.UICThemeCSS').appendTo('body');
                    }
                    if ($('link.UICThemeCSS').length && (allCSS.length-2) > allCSS.index($('link.UICThemeCSS'))){
                        $('link.UICBSResp').appendTo('body');
                    };
                }
            },1000);
        }


        self.handleOtherPlugins = function(){
            // Remove all broken webcam duplicates
            $('[id="webcam_rotator"]').parent().addClass('UIC_webcam_container_clone');
            $('[id="webcam_rotator"]').not('[data-webcamorg="true"]').removeAttr('id');
            $('[id="webcam_container"]').not('[data-webcamorg="true"]').removeAttr('id');
            $('#webcam_rotator').removeAttr('data-webcamorg');
            $('#webcam_container').removeAttr('data-webcamorg');

            var IgnoredConflictPlugins = self.getStorage('IgnoredConflictPlugins',true);
            if (IgnoredConflictPlugins == undefined){
                IgnoredConflictPlugins = {};
            }
            // Notify options main options
            var options = {
                title: "Plugin compatibility issue",
                text: "",
                type: "notice",
                hide: false,
                confirm: {
                    confirm: true,
                    buttons: []
                },
                buttons: {sticker: false,closer: true}
            };

            // Fix consolidate_temp_control layout issues
            var pluginData = self.findPluginData('consolidate_temp_control',true)
            if (pluginData){
                $('div.page-container').css({'min-width':''});
                $('div.footer').css({'padding-left':'','padding-right':''});
                $('div.UICMainCont > div:first').css({'margin-left':'','padding-right':''});
                $('div.UICMainCont').removeClass('row-fluid');
                $('div.UICmainTabs').removeClass('span10');
                $('div#tabs_content div.tab-pane:not("#tab_plugin_consolidate_temp_control") > div > div.span6').unwrap();
                $('div#tabs_content div.tab-pane:not("#tab_plugin_consolidate_temp_control") > div.span6').children().unwrap();
            }

            // Fix themify
            pluginData = self.findPluginData('themeify',true)
            if (pluginData){
                self.settings.plugins.themeify.theme.subscribe(function(theme) {
                    self.updateThemify(theme);
                });
                self.settings.plugins.themeify.enabled.subscribe(function(enabled) {
                    self.updateThemify(self.settings.plugins.themeify.theme());
                });
            }

            // Test multicam
            pluginData = self.findPluginData('multicam',true)
            if (pluginData){
                self.multicamPluginHandler();
                self.settings.plugins.multicam.multicam_profiles.subscribe(function(theme) {
                    self.multicamPluginHandler();
                });
            }

            // Test navbartemp
            if (self.UICsettings.navbarplugintempfix()){
                pluginData = self.findPluginData('navbartemp',true);
                if (pluginData){
                    self.set_navbarplugintempfix(true);
                }
            }

            // Check for any issues with installed plugins
            var genericPluginsWarning = ['widescreen','taborder','statefulsidebar','fullscreen','themeify','octoflat','webcam_iframe','floatingnavbar'];
            $.each(genericPluginsWarning,function(key,plugKeyName){
                if (IgnoredConflictPlugins.hasOwnProperty(plugKeyName) && IgnoredConflictPlugins[plugKeyName] == true){
                    self.logToConsole("Plugin issues for " + plugKeyName + " ignored.");
                    return true;
                }
                var pluginData = self.findPluginData(plugKeyName,false);
                if (pluginData != null && 'enabled' in pluginData && pluginData.enabled == true){
                    self.logToConsole("Plugin issues detected: " + plugKeyName);
                    var optionsCust = $.extend(true,{},options);
                    optionsCust.text = '"'+pluginData.name+'" plugin is installed and enabled. This might cause problems, ie. conflicts, broken layout, etc. when running together with UICustomizer.<br><br>It’s recommended to either disable UICustomizer or '+pluginData.name+'. <hr class="UICUpdateHR">';
                     optionsCust.confirm.buttons =
                     [
                        {
                            text: "Ignore warning",
                            addClass:"btn-small btn-warning",
                            click: function (notice) {
                                IgnoredConflictPlugins = self.getStorage('IgnoredConflictPlugins',true);
                                if (IgnoredConflictPlugins == undefined){
                                    IgnoredConflictPlugins = {};
                                }
                                IgnoredConflictPlugins[plugKeyName] = true;
                                self.setStorage('IgnoredConflictPlugins',IgnoredConflictPlugins,true);
                                notice.remove();
                                notice.get().trigger("pnotify.cancel", notice);
                            }
                        },
                        {
                            text: 'Open Plugin Manager',
                            addClass:"btn-small btn-info",
                            click: function (notice) {
                                $('#settings_plugin_pluginmanager_pluginlist table tr.UIC-pulsateShort').removeClass('UIC-pulsateShort');
                                self.coreSettings.settingsDialog.off('shown.uic').on('shown.uic', function () {
                                    self.coreSettings.settingsDialog.off('shown.uic');
                                    $('#settings_plugin_pluginmanager_pluginlist tr td span[data-bind="text: name"]:contains("'+pluginData.name+'")').closest('tr').addClass('UIC-pulsateShort');
                                });
                                // Show - if already shown then highlight
                                if (self.coreSettings.show('#settings_plugin_pluginmanager') == false){
                                    $('#settings_plugin_pluginmanager_pluginlist tr td span[data-bind="text: name"]:contains("'+pluginData.name+'")').closest('tr').addClass('UIC-pulsateShort');
                                }
                                notice.remove();
                                notice.get().trigger("pnotify.cancel", notice);
                            }
                        }
                    ];
                    new PNotify(optionsCust);
                }
            });
        }

        // Calc topmenu width
        self.fixWrapWidth = function(){
            var menuWidth = $('div.UICMainMenu > ul').outerWidth();
            if ($(window).width() <= 979 ){
                // Fix small screens
                menuWidth = 0;
                $('div.UICMainMenu > ul > li > a:visible').each(function(){
                    $(this).parent().css('float','left');
                    menuWidth += $(this).outerWidth();
                    if ($(this).find('.UICHideDesktop').length){
                        menuWidth -= $(this).find('.UICHideDesktop').outerWidth();
                    }
                    $(this).parent().css('float','');
                });
            }
            if($('#UICWrapFix').length){
                $('#UICWrapFix').text(':root {--uicmainwidth: '+menuWidth+'px !important;}');
            }else{
                $('head').append('<style id="UICWrapFix">:root {--uicmainwidth: '+menuWidth+'px !important;}</style>');
            }

        }


        // ------------------------------------------------------------------------------------------------------------------------
        // Update the entire layout
        self.UpdateLayout= function(){

            self.logToConsole('Updating UI/layout');
            // Remove widths if any
            $('div.UICmainTabs').removeClass('span8');
            $('#sidebar').removeClass('span4');

            // Fixed header
            self.set_fixedHeader(self.UICsettings.fixedHeader());

            // Fixed footer
            self.set_fixedFooter(self.UICsettings.fixedFooter());

            // remove graph background
            self.set_hideGraphBackground(self.UICsettings.hideGraphBackground());

            // Make it fluid
            self.set_fluidLayout(self.UICsettings.fluidLayout());

            // Set theme on startup
            self.set_theme(self.UICsettings.theme(),false);

            // Run in responsive mode
            self.set_responsiveMode(self.UICsettings.responsiveMode());

            // Center the icons
            self.set_centerTopIcons(self.UICsettings.centerTopIcons());

            // Fix temp bar plugin
            self.set_navbarplugintempfix(self.UICsettings.navbarplugintempfix());

            // Compact menus
            self.set_compactMenu(self.UICsettings.compactMenu());

            // BUild the main layout
            self.set_mainLayout(self.UICsettings);

            // Customize tabs
            self.set_mainTabsCustomize(self.UICsettings.mainTabsCustomize(),self.UICsettings.mainTabs());

            // Sort top icons
            self.set_sortTopIcons(self.UICsettings.topIconSort());

            // add webcam zoom option
            self.set_addWebCamZoom(self.UICsettings.addWebCamZoom());

            // Full widh Gcode
            self.set_gcodeFullWidth(self.UICsettings.gcodeFullWidth());

            // Makes files and terminal full height and resizeable
            self.set_filesFullHeight(self.UICsettings.filesFullHeight());

            // Compress the temperature controls
            self.set_compressTempControls(self.UICsettings.compressTempControls());

            self.set_customCSS(self.UICsettings.customCSS());

            self.set_saveAccordions(self.UICsettings.saveAccordions());
        }

        // ------------------------------------------------------------------------------------------------------------------------
        self.set_theme = function(themeName,preview){
            // if empty we try the others - else we cleanup from everything else
            if (themeName == "default" || themeName == null){
                $('html').removeClass('UICCustomTheme');
                $('html').removeClass (function (index, className) {
                    return (className.match (/UICTheme_\S+/g) || []).join(' ');
                });
                if (self.updateThemify(null) == false){
                    self.updateStandardTheme(self.settings.appearance.color());
                };
            }else{
                // Add UI Customizer related theming
                $('html').addClass('UICDefaultTheme UICCustomTheme UICTheme_'+themeName);
                $('#UICCustStandardTheme,#UICCustThemeify').remove();
            }
            if (self.curTheme != themeName && themeName != null){
                self.logToConsole("Loading theme: " + themeName + " - old theme: " + self.curTheme);
                // Show loading UI if slow
                var hideLoader = null;
                if (!$('#page-container-loading:visible').length){
                    hideLoader = setTimeout(function(){
                         $('#page-container-loading').show();
                    }, 200);
                }

                // Remove the current css to trigger reload
                $('link.UICThemeCSS').remove();

                var themeversion = "0";
                if('themeVersion' in self.UICsettings){
                    themeversion = self.UICsettings.themeVersion();
                }
                var themeURL = "./plugin/uicustomizer/theme/"+themeName+'.css?v='+themeversion;

                // Preview or for real?
                if (!preview){
                    // Store it for easier loading
                    self.setStorage('theme',themeName,false);
                    self.setStorage('themeversion',themeversion,false);
                }

                // Load style sheet
                var styleCSS = $('<link class="UICThemeCSS" rel="stylesheet"/>');

                // Load handler
                styleCSS.on('load',function (){
                    // Hide loader
                    if (hideLoader != null){
                        clearTimeout(hideLoader);
                        hideLoader = null;
                        setTimeout(function(){
                            $('#page-container-loading').fadeOut();
                        },300);
                    }
                }).on('error',function (){
                    if (hideLoader != null){
                        clearTimeout(hideLoader);
                        hideLoader = null;
                        $('#page-container-loading').fadeOut();
                    }
                });
                styleCSS.attr('href',themeURL);

                // Insert to the document at the right place
                if ($('link.UICBSResp').length){
                    styleCSS.insertBefore($('link.UICBSResp'));
                }else{
                    $('body').append(styleCSS);
                }

                self.curTheme = themeName;
            }
        }

        // ------------------------------------------------------------------------------------------------------------------------
        self.updateStandardTheme = function(curTheme){
            if (self.UICsettings.theme() != null && self.UICsettings.theme() != "default"){
                $('#UICCustStandardTheme').remove();
                return;
            }
            if (curTheme == "default"){
                // Cleanup
                self.logToConsole("Removing standard theme mods");
                $('html').addClass('UICDefaultTheme');
                $('#UICCustStandardTheme').remove();
            }else{
                $('html').removeClass('UICDefaultTheme');
                self.logToConsole("Standard theme is: " + curTheme);
                if ($('#UICCustStandardTheme').length){
                    self.logToConsole("Standard theme mods founnd");
                }else{
                    self.logToConsole("Standard theme mods added");
                    $('head').append('<style type="text/css" id="UICCustStandardTheme"/>');
                }
                // Find the style sheet
                var hasCompact = $('div.UICMainMenu').hasClass('UICCompactMenu');
                var hasResponsive = $('body').hasClass('UICResponsiveMode');
                var cleanRep = new RegExp('\.'+curTheme, "gi");
                var newStyle = '';
                var styleSrc = self.getStyleSheet('static/webassets/packed_core.css');
                if (styleSrc == null){
                    styleSrc = self.getStyleSheet('static/css/octoprint.css');
                }
                if (styleSrc == null){
                    self.logToConsole("Standard theme css src not found!");
                    return;
                }
                $.each(styleSrc.sheet.cssRules,function(){
                    var cssSel = this.selectorText;
                    if (cssSel != undefined && cssSel.indexOf('#navbar .navbar-inner.'+curTheme) != -1){
                        newStyle += this.cssText.replace(/#navbar/gi,'#page-container-main > div.footer').replace(cleanRep,'');
                        if (hasCompact){
                            newStyle += this.cssText.replace(/#navbar \.navbar-inner/gi,'div.UICMainMenu.UICCompactMenu').replace(cleanRep,'');
                        }
                        if (hasResponsive){
                            newStyle += this.cssText.replace(/#navbar/gi,'#UICsettingsMenuNav').replace(cleanRep,'');
                        }
                    };
                });
                newStyle = newStyle.replace(/background-image: url.+?;/gmi,'');

                $('#UICCustStandardTheme').text(newStyle)
                delete newStyle;
            }
        }

        // ------------------------------------------------------------------------------------------------------------------------
        self.updateThemify = function(curTheme){
            if (self.UICsettings.theme() != null && self.UICsettings.theme() != "default"){
                $('#UICCustThemeify').remove();
                return;
            }
            if (!self.findPluginData('themeify',true) || self.settings.plugins.themeify.enabled() == false){
                self.logToConsole("Removing themeify theme mods");
                $('#UICCustThemeify').remove();
                return false;
            }

            // Remove default theme
            $('html').removeClass('UICDefaultTheme');
            // remove octoprint theme mods
            $('#UICCustStandardTheme').remove();

            // Get the current theme from themify
            if (curTheme == null){
                curTheme = self.settings.plugins.themeify.theme();
            }
            // Build our copy
            self.logToConsole("themeify theme is: " + curTheme);
            if ($('#UICCustThemeify').length){
                self.logToConsole("themeify theme mods founnd");
            }else{
                self.logToConsole("themeify theme mods added");
                $('head').append('<style type="text/css" id="UICCustThemeify"/>');
            }

            // Find the style sheets
            var hasCompact = $('div.UICMainMenu').hasClass('UICCompactMenu');
            var hasResponsive = $('body').hasClass('UICResponsiveMode');
            var cleanRep = new RegExp('\.'+curTheme, "gi");
            var navbarClean = new RegExp('\.themeify\.'+curTheme+' #navbar', "gi");
            var newStyle = '';
            var bgcolor = '';
            var styleSrc = false;
            var styleSrc = self.getStyleSheet('static/webassets/packed_plugins.css');
            if (styleSrc == null){
                styleSrc = self.getStyleSheet('plugin/themeify/static/dist/themeify.min.css');
            }
            if (styleSrc == null){
                self.logToConsole("Themeify css src not found!");
                return;
            }
            $.each(styleSrc.sheet.cssRules,function(){
                var cssSel = this.selectorText;
                if (cssSel != undefined && cssSel.indexOf('.themeify.'+curTheme+' #navbar .navbar-inner') != -1){
                    newStyle += this.cssText.replace(navbarClean,'#page-container-main > div.footer').replace(cleanRep,'');
                    if (hasCompact){
                        newStyle += this.cssText.replace(/#navbar \.navbar-inner/gi,'div.UICMainMenu.UICCompactMenu').replace(cleanRep,'');
                    }
                    if (hasResponsive){
                        newStyle += this.cssText.replace(/#navbar/gi,'#UICsettingsMenuNav').replace(cleanRep,'');
                    }
                };
                if (bgcolor == '' && cssSel != undefined && cssSel.indexOf('.themeify.'+curTheme+' .modal') != -1 && this.cssText.indexOf('background-color') != -1){
                    var regBack = /background-color:(.*);/gmi;;
                    var matches = regBack.exec(this.cssText);
                    var matchstr = matches[1]+";";
                    bgcolor = $.trim(matchstr.slice(0, matchstr.indexOf(';')));
                };
            });
            if (bgcolor != ""){
                var bgcolorClean = bgcolor.slice(bgcolor.indexOf('(')+1);
                bgcolorClean = bgcolorClean.slice(0,bgcolorClean.indexOf(')'));
                newStyle += '\
                    html.'+curTheme+' #UICsettingsMenuNav{\
                        background-color:'+bgcolor+';\
                        background: linear-gradient(180deg, rgba('+bgcolorClean+',1) 0px, rgba('+bgcolorClean+',1) 55px, rgba('+bgcolorClean+',0) 100%);\
                    }\
                ';
            }
            $('#UICCustThemeify').text(newStyle);

            delete newStyle;
            return true;
        }

        // ------------------------------------------------------------------------------------------------------------------------
        self.set_mainLayout = function(settingsData){
            // Fix layout and width - using magic
            var TempCols = [...settingsData.rows()];

            // Check for empty object
            if($.isEmptyObject(TempCols[0])){
                new PNotify({title:"UI Customizer failure", type: "error","text":"Failed to load proper settings for layout.\nSorry :(","hide":false});
                console.log(TempCols);
                return true;
            }
            var widths = settingsData.widths();

            // Build only visible items in a simple array
            var CleanedCols = [];
            $.each(TempCols,function(colID,items){
                CleanedCols[colID] = [];
                $.each(items, function(widgetid,shown){
                    // Fix function missing
                    if (typeof shown == "function"){
                        shown = shown();
                    }
                    // Remove prefixes - they are added to keep the order in json object
                    if (widgetid.charAt(0) == "_"){
                        self.logToConsole("Slicing 3 chars of: " + widgetid);
                        widgetid = widgetid.slice(3);
                        self.logToConsole("new widgetid: " + widgetid);
                    }
                    self.logToConsole("Building collumn " +colID + ": " + widgetid + (shown?" Adding":" Hiding"));
                    // Add the widgets if visible or in custom list
                    if (shown && ($(widgetid).length || self.customWidgets.hasOwnProperty(widgetid))){
                        CleanedCols[colID].push(widgetid);
                        $(widgetid).removeClass('UICHide');
                    }else{
                        // Hide the widget if not requested to be shown
                        $(widgetid).addClass('UICHide');
                        self.logToConsole("Hiding widget:" + widgetid);
                        if (self.customWidgets.hasOwnProperty(widgetid) && 'init' in self.customWidgets[widgetid] && typeof self[self.customWidgets[widgetid].init] == "function"){
                            self[self.customWidgets[widgetid].init](false);
                        }
                    }
                });
            });

            // Remove empty right cols and bit of magic
            var cols = [];
            var colFound = false;
            CleanedCols.reverse();
            $(CleanedCols).each(function(key,val){
                if (val.length > 0 || colFound){
                    colFound = true;
                    cols.push(val);
                }else{
                    // Find the column index in the reversed order and mark them for deletion - we can just delete empty ones because we can have an empty filler
                    var keyRevFix = Math.abs(2-key)+1;
                    $('div.UICCol'+keyRevFix).addClass('UICColHIDEME');
                }
            });
            cols.reverse();
            self.logToConsole('Building '+cols.length+ ' columns layouts:' + JSON.stringify(cols));

            // Build the layout requested
            $(cols).each(function(key,val){
                var keyoffset = key+1;
                // Set width
                var spanW = widths[key];

                // Add if not built yet
                if ($('div.UICCol'+keyoffset).length == 0){
                    $('div.UICMainCont > div:first').append('<div class="accordion UICCol'+keyoffset+'"></div>');
                }

                // Remove and set span width
                if (!$('div.UICCol'+keyoffset).hasClass('span'+spanW)){
                    $('div.UICCol'+keyoffset).attr('class', function(i, c){
                        return c.replace(/(^|\s)span\d+/g, '');
                    });
                    $('div.UICCol'+keyoffset).addClass('span'+spanW);
                    if (spanW >= 6){
                        $('div.UICCol'+keyoffset).addClass('UICLargeSpan');
                    }
                }

                // Add items
                $(val).each(function(key2,val2){
                    if ($(val2).length){
                        // Append to UI
                        self.logToConsole('Adding standard widget "'+val2+'" to column '+keyoffset);
                        $(val2).appendTo('div.UICCol'+keyoffset);
                    // Append custom widgets
                    }else if (self.customWidgets.hasOwnProperty(val2)){
                        self.logToConsole('Adding custom widget "'+val2+'" to column '+keyoffset);
                        $(self.customWidgets[val2].dom).appendTo('div.UICCol'+keyoffset);
                    }else{
                        self.logToConsole('Skipping widget "'+val2+'"');
                    }

                    // Init custom widget
                    if (self.customWidgets.hasOwnProperty(val2) && 'init' in self.customWidgets[val2] && typeof self[self.customWidgets[val2].init] == "function"){
                        self.logToConsole('Launching custom widget "'+val2+'" js init');
                        self[self.customWidgets[val2].init](true);
                    }
                });
            });

            // Hide empty
            $('div.UICColHIDEME').hide();
        }

        // ------------------------------------------------------------------------------------------------------------------------
        self.set_sortTopIcons = function(iconsort){
            var iconsortTmp = [...iconsort];
            if (iconsortTmp.length == 0){
                self.logToConsole('No topIcons to sort');
                return true;
            }
            // Which container are we using
            if ($('ul.UICHeaderIcons').length){
                self.logToConsole('Sorting top icons: UICHeaderIcons');
                var container = $('ul.UICHeaderIcons');
            }else{
                self.logToConsole('Sorting top icons: UICMainMenu');
                var container = $('div.UICMainMenu ul.nav');
            }
            iconsortTmp.reverse();
            $.each(iconsortTmp,function(x,idx){
                self.logToConsole('Sorting top icons - adding: '+idx);
                container.prepend($('#'+idx));
            });
        }

        // ------------------------------------------------------------------------------------------------------------------------
        self.get_TopIcons = function(){
            if ($('ul.UICHeaderIcons').length){
                return $('ul.UICHeaderIcons >li').map(function(){return $(this).attr('id')}).get();
            }else{
                return $('div.UICMainMenu ul.nav > li[id^="navbar_plugin"]:not(.UICExcludeFromTopIcons)').map(function(){return $(this).attr('id')}).get();
            }
        }

        // ------------------------------------------------------------------------------------------------------------------------
        self.set_mainTabsCustomize = function(enable,tabsSource){
            if (enable){
                var tabsData = self.initTabs(tabsSource);
                // Build an index based lookup
                var indexobj = tabsData[0];
                var listItems = tabsData[1];

                $.each(listItems,function(idx,val){
                    $('#tabs').append($('#'+val));
                    self.buildCustomTab(indexobj[val]);
                });
            }else{
                $('#tabs li:not(.tabdrop) a >i').remove();
                var orgSort = [];
                $('#tabs li:not(.tabdrop) a').each(function(){
                    if ($(this).data('orgName') != undefined){
                        $(this).text($(this).data('orgName'));
                    }
                    if ($(this).data('orgPos') != undefined){
                        orgSort[$(this).data('orgPos')] = $(this).parent().attr('id');
                    }else{
                        orgSort.push($(this).parent().attr('id'));
                    }
                });
                if (orgSort.length > 0){
                     $.each(orgSort,function(idx,val){
                        $('#tabs').append($('#'+val));
                    });
                }
            }
            // Trigger tabover
            $('#tabs').trigger('resize');
        }


        self.set_gcodeFullWidth= function(enable){
            if (enable && !('cancelobjectViewModel' in OctoPrint.coreui.viewmodels)){
                $('#canvas_container').addClass('UICMaxi');
            }else{
                $('#canvas_container').removeClass('UICMaxi');
            }
        }

        // full height and resize able
        self.set_filesFullHeight = function(enable){
            // Cleanup and remove any observers
            $('.UICvertResize').off('mousedown.UICvertResizeSave');
            $(document).off('mouseup.UICvertResizeSave');
            self.ResizeObserverVertH.disconnect();

            // Remove it
            if (!enable){
                $('#files .gcode_files .scroll-wrapper').removeClass('UICFullHeight');
                $('.UICvertResize').removeClass('UICvertResize');
                return;
            }

            // make them resizable
            $('#term .terminal pre').addClass('UICvertResize')
            $('#files .gcode_files .scroll-wrapper').addClass('UICFullHeight UICvertResize');

            // Handle resize event
            $('.UICvertResize').on('mousedown.UICvertResizeSave',function(event){
                // Not the same target - ie children etc. - filter don't work
                if(event.target !== event.currentTarget){
                    return;
                }
                // Save for later
                var thisItem = $(this);
                thisItem.data('UICResizing',true);
                thisItem.removeData('prevVerH');

                // Release on the entire document - we cant trust mouseup on the element due to drag etc
                $(document).one('mouseup.UICvertResizeSave',function(event){
                    thisItem.data('UICResizing',false);
                    var saveH = thisItem.data('prevVerH');
                    if (saveH > 0){
                        // Identify the element
                        if (thisItem.prop('id') != ''){
                            var saveid = "#"+thisItem.prop('id');
                        }else{
                            var saveid = thisItem.prop("tagName") +"."+thisItem.prop("class").replaceAll(" ",".")
                        }

                        // Get existing
                        var curHeights = self.getStorage('vertHeights',true);
                        if (curHeights == undefined){
                            curHeights = {};
                        }
                        curHeights[saveid] = saveH;
                        self.setStorage('vertHeights',curHeights,true);
                    }
                    thisItem.removeData('prevVerH');
                });
            });
            // Observe them
            $('.UICvertResize').each(function(){
                self.ResizeObserverVertH.observe(this);
            });
        }

        // Make the temp displays small
        self.set_compressTempControls= function(enable){
            if (enable){
                $('#temp').addClass('UICTempTableSmall');
            }else{
                $('#temp').removeClass('UICTempTableSmall');
            }
        }

        // Advanced css injection
        self.set_customCSS= function(cssStr){
            if ($.trim(cssStr) != ""){
                // Create or update
                if ($('#UICCustomCSSS').length){
                    $('#UICCustomCSSS').text(cssStr);
                }else{
                    $('<style id="UICCustomCSSS">'+cssStr+'</style>').appendTo('body');
                }
            }else{
                $('#UICCustomCSSS').remove();
            }
        }

        self.ResizeObserverVertH = new ResizeObserver(entries => {
            for (let entry of entries) {
                var target = $(entry.target);
                // Ignore items not clicked
                if (target.data('UICResizing') != true){
                    return;
                }
                target.data('prevVerH',entry.contentRect.height);
            }
        });

        // ------------------------------------------------------------------------------------------------------------------------
        self.set_saveAccordions = function(enable){
            $('#page-container-main a.accordion-toggle').off('click.UICAccordStore');
            // Do nothing
            if (!enable){
                return;
            }

            // Save current state if we don't have anything stored
            var curAccords = self.getStorage('accordions',true);
            if (curAccords == undefined){
                curAccords = {};
                $('#page-container-main a.accordion-toggle').each(function(){
                    var targetAcco = $(this).data('target');
                    // Ignore these
                    if ($.inArray(targetAcco.replace("#",""),self.accordIgnore) != -1){
                        return true;
                    }
                    // We want the current state here
                    curAccords[targetAcco] = !$(this).hasClass('collapsed');
                });
                self.setStorage('accordions',curAccords,true);
            }

            // Update status on click
            $('#page-container-main a.accordion-toggle').on('click.UICAccordStore',function(event){
                var targetAcco = $(this).data('target');
                // Ignore these
                if ($.inArray(targetAcco.replace("#",""),self.accordIgnore) != -1){
                    return true;
                }
                var curAccords = self.getStorage('accordions',true);
                // The use could have deleted the storage
                if (curAccords == undefined){
                    curAccords = {};
                }
                // The class hasn't shifted yet
                curAccords[targetAcco] = $(this).hasClass('collapsed')
                self.setStorage('accordions',curAccords,true);
                return true;
            });
        }

        // ------------------------------------------------------------------------------------------------------------------------
        self.set_addWebCamZoom = function(enable){
            if (self.newCam){
                var streamURL = self.camModel.webcamStreamType();
                var hlsCam = (self.camModel.webcamStreamType() != "mjpg");
            }else{
                var streamURL = self.coreSettings.webcam_streamUrl();
                var hlsCam = (determineWebcamStreamType(streamURL) != "mjpg");
            }
            // Remove all webcam zoom to cleanup
            $('#UICWebCamFull').remove();
            $('div.UICWebCamClick').remove();

            // Nothing to do
            if (!enable || (self.coreSettings.webcam_webcamEnabled() == false || streamURL == "")){
                return true;
            }

            // drag handler - http://jsfiddle.net/robertc/kKuqH/
            var dragstart = function (event) {
                if (event.originalEvent != undefined && event.originalEvent.dataTransfer != undefined){
                    event.originalEvent.dataTransfer.effectAllowed = "move";
                }
                $('#drop_overlay').addClass('UICHideHard');
                var style = window.getComputedStyle(event.target, null);
                $('#drop_overlay').data('positionData',[(parseInt(style.getPropertyValue("left"),10) - event.clientX),(parseInt(style.getPropertyValue("top"),10) - event.clientY)]);
            }

            var drag_over = function(event) {
                // Avoid conflict with dropzone uploading
                if ($('#drop_overlay').hasClass('UICHideHard')){
                    event.preventDefault();
                    return false;
                }
            }
            var drop = function(event) {
                // Avoid conflict with dropzone uploading
                if(!$(event.target).hasClass('dropzone')){
                    var offset = $('#drop_overlay').data('positionData');
                    var dm = document.getElementById('UICWebCamFull');
                    dm.style.left = (event.clientX + parseInt(offset[0],10)) + 'px';
                    dm.style.top = (event.clientY + parseInt(offset[1],10)) + 'px';
                    $('#drop_overlay').removeClass('UICHideHard in');
                    event.preventDefault();
                    return false;
                }
            }

            var ZoomType = self.UICsettings.webcamzoomtype();

            if (self.newCam){
                var containers = {'#webcam_plugins_container' : 'webcam_plugins_container'}
            }else{
                var containers = {'#webcam_container' : '#webcam_rotator', '#webcam_hls_container' : '#webcam_hls', '#IUCWebcamContainerSrc' : '#webcam_rotator, #webcam_hls'};
                if (hlsCam){
                    // fix position of hls container
                    $('#webcam_hls_container').css('position','relative');
                }
            }

            // Append containers to all webcams
            $.each(containers,function(mainstr,childstr){
                let main = $(mainstr);

                // Zoom widget
                var zoomclick = $('<div class="UICWebCamClick"><a href="javascript:void(0);"><i class="fas fa-expand"></i></a></div>');
                main.prepend(zoomclick);
                // Double click
                main.off('dblclick').on('dblclick',function(){
                    zoomclick.trigger('click.UICWebCamClick');
                });

                if (!('ontouchstart' in window)){
                    zoomclick.hide();
                    main.off('mouseenter.UICWebCamZoom mousemove.UICWebCamZoom').on('mouseenter.UICWebCamZoom mousemove.UICWebCamZoom',function(e){
                        if (hlsCam || self.camModel.webcamLoaded()){
                            zoomclick.show();
                        }
                    }).off('mouseleave.UICWebCamZoom').on('mouseleave.UICWebCamZoom',function(e){
                        zoomclick.hide();
                    });
                }

                zoomclick.off('click.UICWebCamClick').on('click.UICWebCamClick',function(){
                    // Just in case
                    $('#UICWebCamFull').remove();
                    // Hide any loading/info in the widget
                    $('#IUCWebcamContainer').find('.UICWebCamWidgetWait,.UICwebcamdockinfo').hide();
                    if (!self.newCam){
                        main.hide();
                    }

                    // Get the data
                    if (self.newCam){
                        streamURL = self.camModel.webcamStreamType();
                        hlsCam = (self.camModel.webcamStreamType() != "mjpg");
                    }else{
                        streamURL = self.coreSettings.webcam_streamUrl();
                        hlsCam = (determineWebcamStreamType(streamURL) != "mjpg");
                    }

                    // Append floating cam to body
                    var CamClass = " FullCam"
                    if (ZoomType == "float"){
                        CamClass = " FloatCam";
                    }

                    // build overlay for webcam
                    var html = `
                    <div id="UICWebCamFull" draggable="true" class="UICWebcam${CamClass}">
                        <div class="UICWebCamClick" id="UICWebCamShrink">
                            <a href="#"><i class="fas fa-compress"></i></a>
                        </div>
                        <div class="UICwebcamLoading text-center UIC-pulsate text-info"><i class="fas fa-spinner fa-spin"></i> Loading webcam&hellip;</div>
                        <div id="UICWebCamTarget" class="UIC_webcam_container_clone"></div>
                        <div class="navbar navbar-fixed-bottom" id="UICWebCamFullProgress">
                            <div title="Printer state" class="label"><i class="fas fa-info"></i>${OctoPrint.coreui.viewmodels.printerStateViewModel.stateString()}</div>
                        </div>
                    </div>`;
                    $('body').append(html);

                    // Set top offset
                    if ($(window).scrollTop() > 0 && ZoomType == "float"){
                        $('#UICWebCamFull').css('top',$(window).scrollTop()+$('#UICWebCamFull').height());
                    }

                    // Move the webcam to the placeholder
                    if (self.newCam){
                        $('#UICWebCamFull > div.UICwebcamLoading').remove();
                        main.prependTo('#UICWebCamTarget');
                        OctoPrint.coreui.viewmodels.controlViewModel.recreateIntersectionObservers();
                    }else{
                        main.find(childstr).detach().appendTo('#UICWebCamTarget');
                    }

                    // Now show it all
                    if (ZoomType == "float"){
                        // Reszing the webcam float
                        $('#UICWebCamFull').off('mouseup').on('mouseup',function(){
                            $('#UICWebCamFull img').css({'width':''});
                            $('#UICWebCamFull img').css({'height':''});
                            $('#UICWebCamFull').css('height','');
                        }).off('dblclick').on('dblclick',function(){
                            $('#UICWebCamShrink').trigger('click');
                        }).off('resize').on('resize',function(){
                            // Resize timer
                            if ($(this).data("resizeTimer") != undefined){
                                clearTimeout($(this).data("resizeTimer"));
                            }
                            $(this).data("resizeTimer",window.setTimeout(function(){
                                $('#UICWebCamFull').trigger('mouseup');
                            },500));
                        });

                        // Start draghandler
                        $('#UICWebCamFull').on('dragstart.UICCam',dragstart);
                        $('body').on('dragover.UICCam',drag_over);
                        $('body').on('drop.UICCam',drop);
                    }else{
                        self.openFullscreen(document.getElementById('UICWebCamFull'));
                        var mouseMover = window.setTimeout(function(){
                            $('#UICWebCamShrink').fadeOut();
                            $('#UICWebCamFull').addClass('UICnoCursor');
                        },3000);
                        var mouseMover = null;
                        $('#UICWebCamFull').off('mousemove.UICWebCamZoom').on('mousemove.UICWebCamZoom',function(e){
                            if (mouseMover != null){
                                window.clearTimeout(mouseMover);
                                $('#UICWebCamFull').removeClass('UICnoCursor');
                            }
                            mouseMover = window.setTimeout(function(){
                                $('#UICWebCamShrink').fadeOut();
                                $('#UICWebCamFull').addClass('UICnoCursor');
                                mouseMover = null;
                            },3000);
                            $('#UICWebCamShrink').show();
                        }).off('mouseleave.UICWebCamZoom').on('mouseleave.UICWebCamZoom',function(e){
                            $('#UICWebCamShrink').hide();
                        });
                    }

                    // Close zoom/fullscreen
                    $('#UICWebCamShrink').on('click.UICWebCamShrink',function(event){
                        $('#UICWebCamFull').removeClass('UICnoCursor');
                        event.preventDefault();
                        event.stopPropagation();
                        if (document.fullscreenElement) {
                            document.exitFullscreen();
                            return;
                        }
                        $('#UICWebCamFull').off('dragstart.UICCam');
                        $('body').off('dragover.UICCam');
                        $('body').off('drop.UICCam');
                        $('#drop_overlay').removeClass('UICHideHard in');
                        self.webcamAttachHandler();
                        $('#UICWebCamFull').remove();
                        return false;
                    });
                });
            });
        }

        /*https://www.w3schools.com/howto/howto_js_fullscreen.asp*/
        /* View in fullscreen */
        self.openFullscreen = function(elem){
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) { /* Safari */
                elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) { /* IE11 */
                elem.msRequestFullscreen();
            }
            var screenChange = function(event){
                if (document.fullscreenElement != undefined && document.fullscreenElement != null && document.fullscreenElement.id == "UICWebCamFull"){
                    return true;
                }
                $(window).off('resize.UICFullscreen');
                $(document).off('fullscreenchange.UICFullscreen');
                if($('#UICWebCamFull').length){
                    $('#UICWebCamShrink').trigger('click');
                }
            };
            // user exit fullscreen
            $(window).off('resize.UICFullscreen').on('resize.UICFullscreen',screenChange);
            $(document).off('fullscreenchange.UICFullscreen').on('fullscreenchange.UICFullscreen',function(event){
                screenChange(event);
            });
        }


        // ------------------------------------------------------------------------------------------------------------------------

        self.CustomW_initGcode = function(enable){
            self.logToConsole('CustomW_initGcode',enable);
            self.gCodeViewerActive = enable;
            if (enable){
                $('#UICGcodeVWidget ul.dropdown-menu a').off('click').on('click',function(event,dontLoad){
                    $('#UICGcodeVWidget  ul.dropdown-menu li.active').removeClass('active');
                    $(this).parent().addClass('active');
                    $('#UICGcodeVWidgetZL').text($(this).text());
                    $('#UICGcodeVWidget').data('zoomlvl',$(this).data('zoomlvl'));
                    // Save the settings but not when the settings has been opened
                    if (!self.settingsBeenShown){
                        OctoPrint.settings.savePluginSettings('uicustomizer',{'gcodeZoom':$(this).data('zoomlvl')});
                    }
                });
                if (typeof self.UICsettings.gcodeZoom == "undefined" && $('#UICGcodeVWidget ul.dropdown-menu a[data-zoomlvl="'+self.UICsettings.gcodeZoom()+'"]').length == 0){
                    $('#UICGcodeVWidget ul.dropdown-menu a:first').trigger('click');
                }else{
                    $('#UICGcodeVWidget ul.dropdown-menu a[data-zoomlvl="'+self.UICsettings.gcodeZoom()+'"]').trigger('click')
                }
            }
        }

        self.CustomW_initTempGraph = function(enable){
            self.logToConsole('CustomW_initTempGraph',enable);
            self.tempGraphActive = enable;
            if (enable){
                // Include chartist if not included already by toptemp
                if (typeof OctoPrint.coreui.viewmodels.topTempViewModel != "undefined"){
                    return;
                }
                if (typeof Chartist != "object"){
                    $('head').append('<link rel="stylesheet" href="./plugin/uicustomizer/static/css/chartist.min.css">');
                    var script = document.createElement('script');
                    script.onload = function () {
                        self.logToConsole('Main chartist js loaded');
                    };
                    script.src = './plugin/uicustomizer/static/js/chartist.min.js';
                    document.body.appendChild(script);
                }else{
                    self.logToConsole('Main chartist js ALREADY loaded');
                }
            }
        }

        // Handles the multicam plugin into our webcam widget
        self.multicamPluginHandler = function(){
            self.logToConsole('multicamPluginHandler');
            if (!$('#UICWebCamWidget').length){
                return true;
            }
            // Check for multicam
            $('div.UICMultiCamSelector').remove();
            if (self.findPluginData('multicam',true) && self.settings.plugins.multicam.multicam_profiles().length > 1){
                var multicamSelector = $('<div class="btn-group UICMultiCamSelector UICWidgetSelector"><a class="btn btn-small dropdown-toggle" data-toggle="dropdown" href="javascript:void(0);"><span id="UICMultiCamLbl">Cam</span><span class="caret"></span></a><ul class="dropdown-menu"></ul></div>');
                var ulCamSel = multicamSelector.find('ul');
                $.each(self.settings.plugins.multicam.multicam_profiles(),function(idx,item){
                    // Set the label
                    var className = '';
                    if (idx == 0){
                        multicamSelector.find('span:first').text(item.name());
                        className = ' class="active" ';
                    }
                    // Build the selector
                    ulCamSel.append($('<li'+className+' data-streamURL="'+item.URL()+'"><a href="javascript:void(0);">'+item.name()+'</a></li>').on('click','a',function(event,dontLoad){
                        $('.UICMultiCamSelector li.active').removeClass('active');
                        $(this).parent().addClass('active');
                        $('#UICMultiCamLbl').text(item.name());
                        if(dontLoad !== true){
                            OctoPrint.coreui.viewmodels.multiCamViewModel.loadWebcam(item);
                        }
                    }));
                })
                $('#UICWebCamWidget div.accordion-heading').append(multicamSelector);
            }
        }

        // ------------------------------------------------------------------------------------------------------------------------
        self.CustomW_initWebCam = function(enable){
            if (!$('#UICWebCamWidget').length){
                return false;
            }
            if (!self.newCam){
                return self.CustomW_initWebCamOld(enable);
            }

            self.logToConsole('CustomW_initWebCam',enable);

            // Cleanup old stuff
            $('#IUCWebcamContainerSrc,div.UICWebCamWidgetWait').remove();

            // Not configured - then show a warning
            if (OctoPrint.coreui.viewmodels.classicWebcamSettingsViewModel.webcamEnabled() == false || OctoPrint.coreui.viewmodels.classicWebcamSettingsViewModel.streamUrl() == ""){
                $('#IUCWebcamContainer div.nowebcam').remove();
                $('#IUCWebcamContainer > div').append('<div class="nowebcam"><i class="fas fa-question"></i> <span>Webcam not configured&hellip;</span></div>');
                $('#IUCWebcamContainer').find('.UICWebCamWidgetWait,.UICwebcamdockinfo').hide();
                return;
            }
            $('#IUCWebcamContainer div.nowebcam').remove();

            // stop / start on hidden
            $('#UICWebCamWidget').on('hidden.bs.collapse.UIC',function(){
                if (self.webcamInWidget()){
                    OctoPrint.coreui.viewmodels.controlViewModel.recreateIntersectionObservers();
                }
            });
            $('#UICWebCamWidget').on('shown.bs.collapse.UIC',function(){
                if (self.webcamInWidget()){
                    OctoPrint.coreui.viewmodels.controlViewModel.recreateIntersectionObservers();
                }
            });
        }

         self.CustomW_initWebCamOld = function(enable){
            self.logToConsole('CustomW_initWebCam OLD',enable);
            // Not configured - then show a warning
            if (self.coreSettings.webcam_webcamEnabled() == false || self.coreSettings.webcam_streamUrl() == ""){
                $('#IUCWebcamContainer > div').append('<div class="nowebcam"><i class="fas fa-question"></i> <span>Webcam not configured&hellip;</span></div>');
                $('#IUCWebcamContainer').find('.UICWebCamWidgetWait,.UICwebcamdockinfo').hide();
                return;
            }
            $('#IUCWebcamContainer div.nowebcam').remove();

            // stop / start on hidden
            $('#UICWebCamWidget').on('hidden.bs.collapse.UIC',function(){
                OctoPrint.coreui.viewmodels.controlViewModel.onBrowserTabVisibilityChange(false);
            });
            $('#UICWebCamWidget').on('shown.bs.collapse.UIC',function(){
                OctoPrint.coreui.viewmodels.controlViewModel.onBrowserTabVisibilityChange(true);
            });
        }

        self.webcamInWidget = function(){
            if (self.newCam){
                return $('#IUCWebcamContainer >div > #webcam_plugins_container').length;
            }
            return ($('#IUCWebcamContainerSrc').length && (self.UICsettings.hideMainCam() || OctoPrint.coreui.selectedTab != "#control"));
        }

        self.webcamAttachHandler = function(){
            if (!$('#UICWebCamWidget').length){
                return;
            }
            if (!self.newCam){
                return self.webcamAttachHandlerOLD();
            }
            var caminWid = self.webcamInWidget();

            // Always hide main
            if (self.UICsettings.hideMainCam()){
                if (!caminWid){
                    $('div.UICwebcamdockinfo').hide();
                    $('#webcam_plugins_container').prependTo('#IUCWebcamContainer >div.accordion-inner');
                    OctoPrint.coreui.viewmodels.controlViewModel.recreateIntersectionObservers();
                }
                return;
            }

            // toggle control/widget webcam
            if ($('#control_link').hasClass('active')){
                $('div.UICwebcamdockinfo').show();
                // Foree into the control element
                if ($('#control #webcam_plugins_container').length == 0){
                    $('#webcam_plugins_container').prependTo('#control');
                    OctoPrint.coreui.viewmodels.controlViewModel.recreateIntersectionObservers();
                }
            }else{
                $('div.UICwebcamdockinfo').hide();
                if (!caminWid){
                    $('#webcam_plugins_container').prependTo('#IUCWebcamContainer >div.accordion-inner');
                    OctoPrint.coreui.viewmodels.controlViewModel.recreateIntersectionObservers();
                }
            }
        }


        self.webcamAttachHandlerOLD = function(){
            var curCam = '#webcam_rotator';
            if (self.coreSettings.webcam_streamUrl() != "" && determineWebcamStreamType(self.coreSettings.webcam_streamUrl()) != "mjpg"){
                curCam = '#webcam_hls';
            }
            var curCamParent = '#'+$(curCam).parent().attr('id');
            var targetParent = '';
            var hideThese = 'div.UICWebCamWidgetWait, #IUCWebcamContainerSrc';
            var showloaders = 'div.UICwebcamdockinfo';

            // Is the webcam in the widget?
            if (self.webcamInWidget()){
                targetParent = '#IUCWebcamContainerSrc';
                hideThese = 'div.UICwebcamdockinfo, #webcam_hls_container, #webcam_container';
                showloaders = 'div.UICWebCamWidgetWait';

                // Always hide the main webcam if told so - make sure all is hidden
                if (self.UICsettings.hideMainCam()){
                     if ($('#webcam_hls').length){
                        $('#webcam_hls_container').addClass('UICHideHard');
                     }
                     $('#webcam_container').addClass('UICHideHard');
                     $('#webcam_container').next().addClass('UICHideHard');
                }

                // kill stream if widget is hidden
                if (!$('#IUCWebcamContainer').hasClass('in')){
                    OctoPrint.coreui.viewmodels.controlViewModel.onBrowserTabVisibilityChange(false);
                }

            }else{
                if ($('#webcam_hls').length){
                    $('#webcam_hls_container').removeClass('UICHideHard');
                }
                $('#webcam_container').removeClass('UICHideHard');
                $('#webcam_container').next().removeClass('UICHideHard');
                if (curCam == '#webcam_hls'){
                    targetParent = '#webcam_hls_container';
                }else{
                    targetParent = '#webcam_container';
                }
            }
            // Hide any other from the current one
            if (hideThese != ""){
                $(hideThese).hide();
            }
            if (showloaders != ""){
                $(showloaders).show();
            }
            if (curCamParent == targetParent){
                return;
            };
            // More to the new target
            $(curCam).detach().prependTo(targetParent);
            $(targetParent).show();
        }


        // ------------------------------------------------------------------------------------------------------------------------
        // Set compact drop down menu
        self.set_compactMenu= function(enabled){
            if (enabled){
                $('div.UICMainMenu').addClass('UICCompactMenu');
            }else{
                $('div.UICMainMenu').removeClass('UICCompactMenu');
            }
        }

        // ------------------------------------------------------------------------------------------------------------------------
        // Fix modal
        self.fixSettingsModal = function(eventType){
            // Nothing to do
            if (!$('body').hasClass('UICResponsiveMode')){
                return true;
            }

            self.logToConsole('FixSettingsModal triggered : ' + eventType);

            // Fix modal sizing
            if ($('#settings_dialog:visible').length && $('#settings_dialog:visible').attr('style') != undefined && $('#settings_dialog:visible').attr('style').match(/(^|\s)max-height: \d+px !important/i) == null){
                var newstyle = $('#settings_dialog div.modal-body:first').attr('style').replace(/(^|\s)max-height: \d+px/i,`$& !important`);
                // Quick and dirty
                newstyle = newstyle.replace("!important !important","!important");
                $('#settings_dialog div.modal-body:first').attr('style',newstyle);
            }

            // Fix settingslists
            if ($('div.modal-body:visible').length){
                var setfixheight = $('#settings_dialog div.modal-body:first').height();
                $('#settings_plugin_pluginmanager_pluginlist').height(setfixheight-300);
                $('#settings_plugin_softwareupdate_updatelist').height(setfixheight-300);
            }

            // Fix collapse menu hack for smaller screens than normal bootstrap 2 :(  All these hacks are terrible i know but fun to make - Maybe I should have spent my time making a implementation using BootStap4 instead - well...
            if ($('#settings_dialog_menu:visible').length && $('#UICsettingsMenu').length){

                // Set width
                $('#UICsettingsMenuNav').width($('#UICFullSettingsBox').width());
                var curClass = $('#settings_dialog_menu').attr('class');
                // turn on/off collapse
                if ($('#UICsettingsMenuNav div.container:first').width() < $('#UICsettingsMenu').data('UICOrgWidth')){
                    if (!$('#settings_dialog_menu').hasClass('UICHackResponseActive')){
                        curClass = curClass.replace(/-UICHackResponse/g,"") + " UICHackResponseActive";
                        $('#settings_dialog_menu').attr('class',curClass);
                        $('#UICsettingsMenuNav a.btn-navbar').show();
                        $('#UICsetMenuShow').show();
                        $('#UICsettingsMenu li.dropdown.open').removeClass('open');
                    }
                }else if($('#settings_dialog_menu').hasClass('UICHackResponseActive')){
                    curClass = curClass.replace(/collapse/g,"collapse-UICHackResponse").replace("UICHackResponseActive","");
                    $('#settings_dialog_menu').attr('class',curClass);
                    $('#UICsettingsMenuNav a.btn-navbar').removeClass('collapsed').hide();
                    $('#settings_dialog_menu').removeClass('in').css('height',0);
                    $('#UICsetMenuShow').hide();
                    $('#UICsettingsMenu li.dropdown.open').removeClass('open');
                }
            }

            // Fix for the dropdown menu
            // how much space do we have
            var screenroom = $(window).height()-($('#UICsettingsMenuNav').offset().top+70);
            // Menu item length
            var menuih = $('#settings_dialog_menu li.dropdown').first().outerHeight()+3;
            // Calc each length
            var mlength = menuih*$('#settings_dialog_menu li.dropdown').length;
            var smallscreen = false;
            if (mlength <= screenroom){
                // Should the main menu have overflow
                $('#settings_dialog_menu li.dropdown').each(function(idx,val){
                    var thislen = ($(this).find('li').length*menuih)+((idx+1)*menuih);
                    if (thislen > screenroom){
                        smallscreen = true;
                        return false;
                    }
                })
            }else{
                smallscreen = true;
            }

            // Fix or not
            if (smallscreen){
                // Different menu types - different layout
                if ($('#settings_dialog_menu').hasClass('nav-collapse')){
                    $('#UICsettingsMenu , #UICsettingsMenu ul').addClass('UICscrollMenu').scrollTop(0);
                    $('#UICsettingsMenu').css('max-height',screenroom+"px");
                    $('#UICsettingsMenu ul').css('max-height','');
                }else{
                    $('#UICsettingsMenu ul').addClass('UICscrollMenu').scrollTop(0);
                    $('#UICsettingsMenu').removeClass('UICscrollMenu');
                    $('#UICsettingsMenu').css('max-height','');
                    $('#UICsettingsMenu ul').css('max-height',screenroom+"px");
                }
            }else{
                $('#UICsettingsMenu , #UICsettingsMenu ul').removeClass('UICscrollMenu');
                $('#UICsettingsMenu').css('max-height','none');
            }
        }

        // Set
        self.set_settingsMenuTxt = function(link){
            var settingsMenuTxt = link.closest('li.dropdown').find('a:first').text() + '&nbsp;<i class="fas fa-chevron-right"></i>&nbsp;'+link.text();
            $('#UICsetMenuShow').html(settingsMenuTxt);
            $('#UICSettingsHeader').html(settingsMenuTxt);
        }

        // ------------------------------------------------------------------------------------------------------------------------
        // Set responsive
        self.set_responsiveMode = function(enabled){
            if (enabled){
                // Append responsive
                if (!$('link.UICBSResp').length){
                    $('body').append('<link class="UICBSResp" rel="stylesheet" href="./plugin/uicustomizer/static/css/bootstrap-responsive.css">');
                }else{
                    // Make sure responsive is last
                    var allCSS = $('link[rel="stylesheet"]');
                    if ((allCSS.length-1) > allCSS.index($('link.UICBSResp'))){
                        $('link.UICBSResp').appendTo('body');
                    }
                }

                $('.UICMainMenu').addClass('nav-collapse')
                // Skip if active
                if ($('body').hasClass('UICResponsiveMode')){
                    return true;
                }

                // Fix gcode
                $('#gcode div.tooltip.right').removeClass('right').addClass('left UICToolTipLeft');

                // Build settings hack --------------------------------------------------------- START
                // Fix an id
                $('#settings_dialog > div.modal-body > div.full-sized-box:first').attr('id','UICFullSettingsBox');

                // Make container for top menu layout
                $('#UICFullSettingsBox').prepend('\
                <div class="navbar navbar-static" id="UICsettingsMenuNav">\
                    <div class="navbar-inner">\
                        <div class="container">\
                            <span class="brand" id="UICsetMenuShow"></span>\
                            <a class="btn btn-navbar" data-target=".UICsettingsNewMenu" data-toggle="collapse"><span class="icon-bar"></span><span class="icon-bar"></span><span class="icon-bar"></span></a>\
                            <div class="nav-collapse-UICHackResponse collapse-UICHackResponse UICsettingsNewMenu pull-left">\
                                <ul class="nav" id="UICsettingsMenu"></ul>\
                            </div>\
                        </div>\
                    </div>\
                </div>');

                // Convert the existing to the other format
                var menuitem = null;
                var menuItems = null;
                $('#settings_dialog_menu ul li').each(function(){
                    if ($(this).hasClass('nav-header')){
                        if (menuitem != null){
                            menuitem.append(menuItems);
                            $('#UICsettingsMenu').append(menuitem);
                        }
                        menuitem = $('<li class="dropdown"><a class="dropdown-toggle" role="button" data-toggle="dropdown" href="#">'+$(this).text()+' <b class="caret"></b></a></lI>');
                        menuItems = $('<ul class="dropdown-menu" role="menu"></ul>');
                    }else{
                        if ($(this).hasClass('active')){
                            $(this).removeClass('active');
                        }
                        menuItems.append($(this));
                    }
                });
                // Append the last item
                if (menuitem != null){
                    menuitem.append(menuItems);
                    $('#UICsettingsMenu').append(menuitem);
                }
                // Remove it all
                $('#settingsTabs').html('');
                // Insert menu
                $('#settings_dialog_content').insertAfter($('#UICsettingsMenuNav')).removeClass('scrollable');
                // Hide the container fpr the old menu
                $('#settings_dialog_menu').parent().hide();
                // Remove the id and move it to the new one
                $('#settings_dialog_menu').removeAttr('id').addClass('UICsettingsMenuOldMenu');
                $('#UICsettingsMenuNav div.UICsettingsNewMenu').attr('id','settings_dialog_menu');

                // hide the "collapse/responsive" stuff
                $('#UICsettingsMenuNav a.btn-navbar').hide();
                $('#UICsetMenuShow').hide();

                $('#settings_dialog_label').prepend('<span class="hidden-phone pull-right" id="UICSettingsHeader"></span>');

                // Close menu on click if open and set item title
                $('#settings_dialog_menu a:not(.dropdown-toggle)').off('click.UICSetMenu').on('click.UICSetMenu',function(){
                    $('#settings_dialog div.modal-body:first').scrollTop(0);
                    if ($('#settings_dialog_menu').hasClass('in')){
                        $('#UICsettingsMenuNav a.btn-navbar').trigger('click');
                    }
                    self.set_settingsMenuTxt($(this));
                });

                // Fix floating errors
                $('#UICFullSettingsBox div.control-group:not(.row-fluid)').addClass('row-fluid UICRemoveFluidRow');

                $('#settings_dialog_content').addClass('span12').removeClass('span9');

                // Fix buttons footer
                $('#settings_dialog > div.modal-footer button:has(i)').not('.btn-primary').each(function(){$(this).contents().eq(1).wrap('<span class="hidden-phone"/>')});

                // Build settings hack --------------------------------------------------------- END

                // Fix modals on show
                $('body').on('shown.bs.modal.UICHandler','#settings_dialog', function(event) {
                    if ($('body').hasClass('UICResponsiveMode') && $('#settings_dialog_menu:visible').length ){
                        // reopen last used setting again
                        if (event.target.id === 'settings_dialog') self.set_settingsMenuTxt($('.nav>.active .active>a',event.target));
                        // open active submenu
                        if (event.target.id === 'settings_dialog_menu') $('.dropdown.active',event.target).addClass('open')
                        // Save size for mobile resizing for settings
                        if ($('#settings_dialog_menu:visible').length && $('#UICsettingsMenu').data('UICOrgWidth') == undefined || $('#UICsettingsMenu').data('UICOrgWidth') == 0){
                            $('#settings_dialog_menu').width('2000px');
                            $('#UICsettingsMenu').data('UICOrgWidth',$('#UICsettingsMenu').width()+20);
                            $('#settings_dialog_menu').width('');
                             // Hack on modal heights
                            self.fixSettingsModal('resize');
                        }else{
                            // Hack on modal heights
                            self.fixSettingsModal('shown');
                        }
                    }
                });

                // Fix resizing of modals
                $(window).off('resize.UICHandler').on('resize.UICHandler',function(){
                    if (self.modalTimer != null){
                        window.clearTimeout(self.modalTimer);
                    }
                    self.modalTimer = setTimeout(function(){self.fixSettingsModal('resize')}, 100);
                });

                // Add menu button to the main menu
                $('#navbar > div.navbar-inner > div:first').prepend('<a class="btn btn-navbar collapsed" data-toggle="collapse" data-target=".UICMainMenu"><span class="icon-bar"></span><span class="icon-bar"></span><span class="icon-bar"></span></a>');

                // Close menu on click
                $('div.UICMainMenu a:not(.dropdown-toggle)').off('mouseup.UICMainMenu').on('mouseup.UICMainMenu',function(event){
                    if ($('div.UICMainMenu').hasClass('in')){
                        $('div.UICMainMenu').css({'height':'0px'});
                        $('div.UICMainMenu').removeClass('in');
                    }
                    return true;
                });

                // Add title to menu items
                $('div.UICMainMenu > ul.nav > li:not([id^="navbar_plugin"]) > a,li.UICExcludeFromTopIcons > a').each(function(){
                    var title= $(this).attr('title');
                    if (title != undefined){
                       $('<span class="UICHideDesktop">&nbsp;'+title+'</span>').insertAfter($('.fas',this));
                    }
                });

                $('body').addClass('UICResponsiveMode');

                // Trigger any open menu
                if ($('#settings_dialog_menu:visible').length){
                    $('#settings_dialog_menu').width('2000px');
                    $('#UICsettingsMenu').data('UICOrgWidth',$('#UICsettingsMenu').width()+20);
                    $('#settings_dialog_menu').width('');
                    $(window).trigger('resize.UICHandler');
                }

                // Fix labels on buttons
                $('div.UICMainCont .btn > i.fa,div.UICMainCont .btn > i.fas').each(function(){
                    if ($(this).next().prop("tagName") == "SPAN" && $(this).next().text() != ""){
                        $(this).next().addClass('hidden-tablet UICHideTablet');
                    }
                    if ($(this).prev().prop("tagName") == "SPAN" && $(this).prev().text() != ""){
                        $(this).prev().addClass('hidden-tablet UICHideTablet');
                    }
                    if (!$(this).next().length){
                        var parent = $(this).parent();
                        if (parent.text() != undefined && $.trim(parent.text()) != "" && !parent.find('span').length){
                            var texitem = parent.contents().filter(function() {
                                return this.nodeType == 3 && $.trim(this.textContent) != '';
                            });
                            var textval = texitem.text();
                            texitem.remove();
                            parent.append('<span class="hidden-tablet">'+textval+'</span>');
                            if ($(this).parent().prop('title') == ""){
                                $(this).parent().prop('title',textval);
                            }
                        }
                    }
                });

                // Hack this special button
                $('#job_pause span:not(.hidden-tablet.UICHideTablet)').addClass('hidden-tablet UICHideTablet');

            }else{
                // Allow full menu when not responsive
                $('.UICMainMenu').removeClass('nav-collapse');
                $('#UICViewport').remove();
                $('link.UICBSResp').remove();
                if (!$('body').hasClass('UICResponsiveMode')){
                    return true;
                }
                $('.UICHideTablet').removeClass('UICHideTablet hidden-tablet');

                // Remmove events
                $('body').off('shown.bs.modal.UICHandler');
                $(window).off('resize.UICHandler');
                // Remove fluid hack
                $('#UICFullSettingsBox div.control-group.UICRemoveFluidRow').removeClass('row-fluid UICRemoveFluidRow');

                // Clean menu height hacks
                $('#UICsettingsMenu .pre-scrollable').removeClass('pre-scrollable');
                $('#UICsettingsMenu .dropdown-menu').css({'height':''});

                // revert settings menu
                $('#UICSettingsHeader').remove();
                $('#settings_dialog_menu').removeAttr('id');
                $('div.UICsettingsMenuOldMenu').attr('id','settings_dialog_menu').removeClass('UICsettingsMenuOldMenu');
                $('#UICsettingsMenu li ').each(function(){
                   if ($(this).hasClass('dropdown')){
                        $('#settingsTabs').append($('<li class="nav-header">'+$(this).find('a:first').text()+'</li>'));
                   }else{
                        $('#settingsTabs').append($(this));
                   }
                });
                $('#settings_dialog_content').addClass('span9').removeClass('span12');
                $('#settings_dialog > div.modal-footer span.hidden-phone').each(function(){$(this).parent().append($(this).text());$(this).remove();})

                $('#settings_dialog_content').insertAfter($('#settings_dialog_menu'));
                $('#settings_dialog_content').addClass('scrollable');
                $('#settings_dialog_menu').parent().show();
                $('#settings_dialog_menu a:not(.dropdown-toggle)').off('click.UICSetMenu');
                $('#UICsettingsMenuNav').remove();
                $('#UICFullSettingsBox').removeAttr('id');


                // Remove menu hacks
                $('#navbar div.navbar-inner a.btn-navbar').remove();
                $('div.UICMainMenu .UICHideDesktop').remove();

                $('.UICToolTipLeft').removeClass('UICToolTipLeft');


                $('body').removeClass('UICResponsiveMode');


            }
        }

        // ------------------------------------------------------------------------------------------------------------------------
        // Should we center the icons or not?
        self.set_centerTopIcons = function(enabled){
            self.fixWrapWidth();
            // Build header icons always to fix wrap or on request
            if (!$('ul.UICHeaderIcons').length){
                // $('div.UICMainMenu').after($('<div class="UIHeaderWrap"><ul class="UICHeaderIcons nav"></ul></div>').append($('div.UICMainMenu ul.nav > li[id^="navbar_plugin"]:not(.UICExcludeFromTopIcons)')));
                $('div.UICMainMenu').after($('<ul class="UICHeaderIcons nav"></ul>').append($('div.UICMainMenu ul.nav > li[id^="navbar_plugin"]:not(.UICExcludeFromTopIcons)')));
            }
            if (enabled){
                // $('div.UIHeaderWrap').addClass('CenterMe');
                $('ul.UICHeaderIcons').addClass('CenterMe');
            }else{
                // $('div.UIHeaderWrap').removeClass('CenterMe');
                $('ul.UICHeaderIcons').removeClass('CenterMe');
            }
        }

        // ------------------------------------------------------------------------------------------------------------------------
        // Set fixed header on/off
        self.set_fixedHeader = function(enabled){
            if (enabled){
                $('body').addClass('UICfixedHeader');
                $('#navbar').removeClass('navbar-static-top').addClass('navbar-fixed-top')
                $('#navbar').css('overflow','visible');
            }else{
                $('body').removeClass('UICfixedHeader');
                $('#navbar').addClass('navbar-static-top').removeClass('navbar-fixed-top');
                $('#navbar').css('overflow','');
            }
        }

        // ------------------------------------------------------------------------------------------------------------------------
        // Set Compact icons
        self.set_navbarplugintempfix = function(enabled){
            if (!$('#navbar_plugin_navbartemp').length || !self.findPluginData('navbartemp',true)){
                return true;
            }
            if (enabled){
                self.settings.plugins.navbartemp.useShortNames(true);
                self.settings.plugins.navbartemp.makeMoreRoom(true);
                self.settings.plugins.navbartemp.soc_name('SoC');
                $('#navbar_plugin_navbartemp').addClass('UICIconHack');
            }else{
                $('#navbar_plugin_navbartemp').removeClass('UICIconHack');
            }
        }

        // ------------------------------------------------------------------------------------------------------------------------
        // Set fixed footer on/off
        self.set_fixedFooter = function(enabled){
            if (enabled){
                // Skip if active
                if ($('body').hasClass('UICfixedFooter')){
                    return true;
                }
                $('body').addClass('UICfixedFooter');
                $('div.footer').addClass('navbar navbar-fixed-bottom');
                $('div.footer').append($('<div class="navbar-inner"></div>'));
                $('div.footer >ul').appendTo('div.footer > div.navbar-inner');
                $('#footer_links').addClass('nav');
                $('#footer_version').addClass('brand nav');
                $("div.octoprint-container" ).after( $('div.footer'));
            }else{
                // Skip if not active
                if (!$('body').hasClass('UICfixedFooter')){
                    return true;
                }

                $('body').removeClass('UICfixedFooter');
                $('div.footer').removeClass('navbar navbar-fixed-bottom');
                $('div.footer > div.navbar-inner > ul').appendTo('div.footer');
                $('div.footer > div.navbar-inner').remove();
                $('#footer_links').removeClass('nav');
                $('#footer_version').removeClass('brand nav');
                $("div.octoprint-container" ).append( $('div.footer'));
            }
        }

        // ------------------------------------------------------------------------------------------------------------------------
        // Set graph background
        self.set_hideGraphBackground = function(enabled){
            if (enabled){
                $('#temperature-graph').addClass('UICnoBackground');
            }else{
                $('#temperature-graph').removeClass('UICnoBackground');
            }
        }

        // ------------------------------------------------------------------------------------------------------------------------
        // Fix fluid layout
        self.set_fluidLayout = function(enabled){
            if (enabled){
                $('#navbar > div.navbar-inner > div:first').removeClass("container").addClass("container-fluid").removeAttr("style","");
                $('div.UICMainCont').removeClass("container").addClass("container-fluid");
                $('div.UICMainCont > div.row:first').removeClass("row").addClass("row-fluid");
            }else{
                $('#navbar > div.navbar-inner > div:first').removeClass("container-fluid").addClass("container");
                $('div.UICMainCont').removeClass("container-fluid").addClass("container");
                $('div.UICMainCont > div.row-fluid:first ').removeClass("row-fluid").addClass("row");
            }
        }

        // ------------------------------------------------------------------------------------------------------------------------
        // Build columns layout and width
        self.buildColumns = function(prefix){
            var totalw = 0
            var widths = $('#UICSortCols input.uiccolwidth').map(function(){totalw += $(this).val()*1; return $(this).val();}).get();
            // Fallback if something went wrong
            if (totalw > self.maxCWidth){
                var indexpos = widths.indexOf(Math.max(...widths)+'');
                var diff = totalw-self.maxCWidth;
                widths[indexpos] -= diff;
                if (widths[indexpos] < 0){
                    widths = Array($('#UICSortCols input.uiccolwidth').length).fill('4');
                }else{
                    widths[indexpos] = widths[indexpos] +'';
                }
            }

            var prefixItem = '';
            var colsSave = [];
            $('#UICSortCols ul').each(function(key,val){
                colsSave[key] = {};
                $(this).find('li').each(function(key2,val2){
                    if (prefix){
                        if (key2 < 10){
                            prefixItem = '_0'+key2;
                        }else{
                            prefixItem = '_'+key2;
                        }
                    }
                    // Hidden or shown
                    if ($(this).find('input:checkbox').is(":checked")){
                        colsSave[key][prefixItem+$(this).data('id')] = true;
                    }else{
                        colsSave[key][prefixItem+$(this).data('id')] = false;
                    }
                });
            });
            self.logToConsole("Built these cols:"+JSON.stringify(colsSave));

            return [ko.observableArray(colsSave), ko.observableArray(widths)];
        }

        // ------------------------------------------------------------------------------------------------------------------------
        self.initTabs = function(usageList){
             // Build tabs selectors
            var indexobj = {};
            var listItems = [];
            $(usageList).each(function(idx,val){
                // Append if found only
                if ($('#'+val[0]).length){
                    indexobj[val[0]] = val;
                    // Old data bug
                    // No icon if not found
                    if (indexobj[val[0]][3] == null){
                        indexobj[val[0]][3] = false;
                    }
                    // Default design if not found
                    if (indexobj[val[0]][4] == null){
                        indexobj[val[0]][4] = 'textOnly';
                    }
                    // Default color if not found
                    if (indexobj[val[0]][5] == null){
                        indexobj[val[0]][5] = '#000000';
                    }
                    listItems.push(val[0]);
                }
            });

            // Store all tabs names and add any unknown
            var offset = $('#tabs > li:not(.tabdrop) a').length;
            var dropdown = $('#tabs >li > ul.dropdown-menu > li').length;
            $('#tabs li:not(.tabdrop) a').each(function(pos,val){
                // Handle the dropdown
                if (dropdown > 0){
                    if ($(this).parent().parent().hasClass('dropdown-menu')){
                        $(this).data('orgPos',pos+offset);
                    }else{
                        $(this).data('orgPos',offset-dropdown);
                    }
                }else{
                    $(this).data('orgPos',pos);
                }
                if ($(this).data('orgName') == undefined){
                    var name = $.trim($(this).text());
                    $(this).data('orgName',name);
                }
                // Get the parent id
                var parid = $(this).parent().attr('id');

                // Add any unknown items
                if (!(indexobj.hasOwnProperty(parid))){
                    listItems.push(parid);
                    // Get default icon design
                    var prevIcon = $(this).find('i');
                    var prevIconName = '';
                    if (prevIcon.length){
                        prevIconName = prevIcon.attr('class');
                    }
                    // ID, Shown,Customlabel,icon class string, tab design =(true,false,iconOnly,textOnly), icon color
                    // 0 ,   1  ,    2      ,     3           ,      4                                    ,   5
                    indexobj[parid] = [parid,true,false,prevIconName,'textOnly','#000000'];
                }
            });
            return [indexobj,listItems];
        }

        // ------------------------------------------------------------------------------------------------------------------------
        self.buildCustomTab = function(data){
            // PARAMS:
            // [parid,true,false,'icon',true/false/textOnly/iconOnly]
            // ID, Shown,Customlabel,tab design:, color code
            // 0 ,   1  ,    2      , 3         , 5
            // Append them
            var tabIconSize = self.UICsettings.mainTabsIconSize();
            if (tabIconSize != ""){
                tabIconSize += " UICTabIconSize";
            }
            var val = data[0];
            var target = $('#'+val).find('a');
            var newtabcontent = target.clone();
            var targetID = target.attr('href');
            newtabcontent.find('i').remove();
            // Hide them
            if (data[1]){
                $('#'+val).show();
            }else{
                $('#'+val).hide();
                $(targetID).removeClass('active');
            }
            var title = target.data('orgName');
            // Remove label if icon is present only
            if (data[4] == "iconOnly" && data[3] != ''){
                $(newtabcontent).html('');
            }else{
                if (data[2] != false){
                    title = data[2];
                    $(newtabcontent).html(data[2]);
                }else{
                    $(newtabcontent).html(target.data('orgName'));
                }
            }
            // Set color
            var colorclass = {};
            if (data[5] != undefined && data[5] != false){
                colorclass ={'color':data[5]};
            }
            // On the right or the left hand side icon only
            if (data[4] === true && data[3] != ''){
                $(newtabcontent).prepend($('<i class="UICPadRight hidden-tablet '+data[3]+' '+ tabIconSize +'"></i>').css(colorclass));
            }else if (data[4] === false && data[3] != ''){
                $(newtabcontent).append($('<i class="UICPadLeft hidden-tablet '+data[3]+' '+ tabIconSize +'"></i>').css(colorclass));
            }else if (data[4] == "iconOnly" && data[3] != ''){
                $(newtabcontent).append($('<i class="'+data[3]+' '+ tabIconSize +'"></i>').css(colorclass));
            }
            $(target).html(newtabcontent.html()).attr('title',title);
        }

        // ------------------------------------------------------------------------------------------------------------------------
        self.buildCustomTabsSave = function(){
            var newData = [];
            $('#settings_uicustomizer_tabs_look div.controls').each(function(){
                var label = $(this).find('input.UICTabNameInput').val();
                if (label == ""){
                    label = false;
                }
                var iconSrc = $(this).find('button.UICTabIcon i');
                if (iconSrc.hasClass('UICIconEmpty')){
                    var classtxt = false;
                }else{
                    var classtxt = $.trim(iconSrc.attr('class'));
                }
                var color = "#000000";
                if (iconSrc.data('color') != undefined){
                    color = iconSrc.data('color');
                }
                newData.push(
                    [
                        $(this).parent().data('tabid'),
                        $(this).find('button.UICTabToggle i').hasClass('fa-eye'),
                        label,
                        classtxt,
                        $(this).find('ul.UICTabDesign li.active a').data('design'),
                        color
                    ]
                );
            });
            return newData;
        }

        // ------------------------------------------------------------------------------------------------------------------------
        self.buildCustomTabSettings = function(tabsData){
             // Build an index based lookup
            var indexobj = tabsData[0];
            var listItems = tabsData[1];

            // Build selector - yes I could use knockout but i hate it :)
            $('#settings_uicustomizer_tabs_look').empty();
            $.each(listItems,function(idx,val){
                // PARAMS:
                // [parid,true,false,'icon','left']
                // ID, Shown,Customlabel,icon class string, tab design =(true,false,iconOnly,textOnly), icon color
                // 0 ,   1  ,    2      ,     3           ,      4                                    ,   5
                // Build values
                var target = $('#'+val).find('a');
                var targetLink = target.attr('href');
                var orgName = target.data('orgName');
                var localObj = indexobj[val];

                // Build settings for the cols
                var classVis = 'fa-eye';
                if (localObj[1] == false){
                    classVis = "fa-eye-slash";
                }
                var custname = '';
                if (localObj[2] != false){
                    custname = localObj[2];
                }
                // Build colors
                var color = '';
                var colorData = false;
                if (localObj[5] != undefined){
                    colorData = localObj[5];
                    color = 'style="color:'+localObj[5]+'"';
                }
                // Default is empty icon
                var icon = 'fas fa-search UICIconEmpty';
                var disbaledLI = ' disabled';
                if (localObj[3] != false){
                    icon = localObj[3];
                    disbaledLI = '';
                }else{
                    color = '';
                }


                // Build new tabs
                var newTab = $('\
                    <div class="control-group row-fluid UICRemoveFluidRow" data-tabid="'+val+'">\
                        <label class="control-label">'+orgName+'</label>\
                        <div class="controls">\
                            <div class="input-append input-prepend">\
                                <button class="UICDragVHandle btn" type="button" title="Sort item"><i class="fas fa-arrows-alt-v"></i></button>\
                                <input title="Enter tab name, blank = default" class="input-medium UICTabNameInput" placeholder="Name: '+orgName+'" type="text" value="'+custname+'">\
                                <button class="btn UICTabToggle" type="button" title="Hide/Show tab"><i class="fas '+classVis+'"></i></button>\
                                <button class="btn UICTabIcon UICShowIconPicker" type="button"><i class="'+icon+'" '+color+' data-color="'+colorData+'"></i></button><div class="btn-group">\
                                <ul class="dropdown-menu UICTabDesign">\
                                    <li class="UICTabIconReq'+disbaledLI+'"><a href="#" data-design="true"><span class="visible-phone"><i class="fas fa-align-left UICPadRight"></i><i class="fas fa-heading"></i></span><span class="hidden-phone">Icon+Text</span></a></li>\
                                    <li class="UICTabIconReq'+disbaledLI+'"><a href="#" data-design="false"><span class="visible-phone"><i class="fas fa-heading UICPadRight"></i><i class="fas fa-align-right"></i></span><span class="hidden-phone">Text+Icon</span></a></li>\
                                    <li class="UICTabIconReq'+disbaledLI+'"><a href="#" data-design="iconOnly"><i class="visible-phone fas fa-icons"></i><span class="hidden-phone">Icon only</span></a></li>\
                                    <li><a href="#" data-design="textOnly"><i class="visible-phone fas fa-heading"></i><span class="hidden-phone">Text only</span></a></a></li>\
                                </ul>\
                                <button class="btn dropdown-toggle" data-toggle="dropdown" title="Change view mode"><span class="UICTabIconPos"></span> <span class="caret"></span></button>\
                            </div>\
                        </div>\
                    </div>');

                // Toggle tabs on/off
                newTab.find('button.UICTabToggle').off('click').on('click',function(){
                    // Hide all popovers
                    $('.UICShowIconPicker').popover('hide');
                    var icon = $(this).find('i');
                    icon.toggleClass('fa-eye fa-eye-slash');
                    if (self.previewOn){
                        // Update
                        var tabData = self.buildCustomTabsSave();
                        self.set_mainTabsCustomize(true,tabData);
                        if (icon.hasClass('fa-eye')){
                            // Remove all other active
                            $('.UICmainTabs .tab-pane.active').removeClass('active');
                            // Set this as active
                            $(target).trigger('click');
                            $(targetLink).addClass('active');
                        }else{
                            // Trigger first visible
                            $('#tabs li:not(.tabdrop) a:visible:first').trigger('click');
                        }
                    }
                });

                // Change tab text
                newTab.find('input.UICTabNameInput').off('blur keyup').on('blur keyup',function(){
                    // Hide all popovers
                    $('.UICShowIconPicker').popover('hide');
                    if (self.previewOn){
                        // Update
                        var tabData = self.buildCustomTabsSave();
                        self.set_mainTabsCustomize(true,tabData);
                    }
                });

                // Change tab icon
                var newIconSrc = newTab.find('button.UICTabIcon >i');
                newTab.find('button.UICTabIcon').removeData("frun").popover(
                    self.iconSearchPopover(newIconSrc,function(newicon,newcolor){
                        if (newcolor == null || newicon == false){
                            newcolor = false;
                        }
                        newIconSrc.data('color',newcolor);
                        // Delete
                        if (newicon === false){
                            newTab.find('li.UICTabIconReq').addClass('disabled');
                            newTab.find('ul.UICTabDesign li:not(.UICTabIconReq) a').trigger('click');
                            newIconSrc.attr('class','fas fa-search UICIconEmpty');
                            newIconSrc.css({'color':''});
                        }else{
                            newTab.find('ul.UICTabDesign li.UICTabIconReq').removeClass('disabled');
                            newIconSrc.attr('class',newicon);
                            if (newcolor != false){
                                newIconSrc.css({'color':newcolor});
                            }else{
                                newIconSrc.css({'color':''});
                            }
                        }
                        if (self.previewOn){
                             // Update
                            var tabData = self.buildCustomTabsSave();
                            self.set_mainTabsCustomize(true,tabData);
                        }
                    },true,true,newIconSrc,'#settings_uicustomizer_tabs','left')
                ).attr('Title','Click to change icon');


                // Change icon design
                newTab.find('button.dropdown-toggle').off('click').on('click',function(){
                     // Hide all popovers
                    $('.UICShowIconPicker').popover('hide');
                });
                newTab.find('ul.UICTabDesign li a').off('click').on('click',function(event,force){
                    if (force !== true && $(this).parent().hasClass('disabled')){
                        return true;
                    }
                    newTab.find('ul.UICTabDesign li.active').removeClass('active');
                    $(this).parent().addClass('active');
                    newTab.find('span.UICTabIconPos').html($(this).html());
                    if (self.previewOn){
                        // Update
                        var tabData = self.buildCustomTabsSave();
                        self.set_mainTabsCustomize(true,tabData);
                    }
                });

                // Add to the UI
                $('#settings_uicustomizer_tabs_look ').append(newTab);

                // update selector
                newTab.find('ul.UICTabDesign li a[data-design="'+localObj[4].toString()+'"]').trigger('click',[true]);
            })

            // sort the tabs
            var tabsorter = Sortable.create($('#settings_uicustomizer_tabs_look')[0],{
                group: 'UICTabSort',
                draggable: 'div.control-group',
                delay: 200,
                delayOnTouchOnly: true,
                sort: true,
                chosenClass: 'alert-info',
                handle: '.UICDragVHandle',
                direction: 'vertical',
                dragoverBubble: false,
                onStart: function(){
                    $('#drop_overlay').addClass('UICHideHard');
                },
                onEnd: function(evt){
                    $('#drop_overlay').removeClass('UICHideHard in');
                    if (self.previewOn){
                        var tabData = self.buildCustomTabsSave();
                        self.set_mainTabsCustomize(true,tabData);
                    }
                }
            })
            // Store for later reference
            $('#settings_uicustomizer_tabs_look').data('sorter',tabsorter);

            // Toggle main customizing on/off
            $('#UICMainTabCustomizerToggle').off('change').on('change',function(){
                if ($(this).is(':checked')){
                    // Check for themify
                    if (self.findPluginData('themeify',true) && self.settings.plugins.themeify.tabs.enableIcons()){
                        $('.UICthemeifyAlert').fadeIn();
                    }else{
                        $('.UICthemeifyAlert').hide();
                    }
                    tabsorter.option("disabled", false);
                    $('#settings_uicustomizer_tabs_look').fadeTo(300,1);
                    $('#UICMainTabsIconSize').prop( "disabled", false );
                    $('#settings_uicustomizer_tabs_look :input').prop( "disabled", false );
                    if (self.previewOn){
                        var tabData = self.buildCustomTabsSave();
                        self.set_mainTabsCustomize(true,tabData);
                    }
                }else{
                    $('.UICthemeifyAlert').hide();
                    tabsorter.option("disabled", true);
                    $('#settings_uicustomizer_tabs_look').fadeTo(300,0.5);
                    $('#UICMainTabsIconSize').prop( "disabled", true );
                    $('#settings_uicustomizer_tabs_look :input').prop( "disabled", true );
                    if (self.previewOn){
                        self.set_mainTabsCustomize(false,false);
                    }
                }
            });
            if (!$('#UICMainTabCustomizerToggle').is(':checked')){
                $('#UICMainTabCustomizerToggle').trigger('change');
            }else{
                $('.UICthemeifyAlert').hide();
            }

            // Hook into themifiy settings
            if ($('input[data-bind="checked: tabIcons.enabled"]').length){
                $('input[data-bind="checked: tabIcons.enabled"]').off('change.UICThem').on('change.UICThem',function(){
                    $('#UICMainTabCustomizerToggle').trigger('change');
                });
            }
        }

        // ------------------------------------------------------------------------------------------------------------------------
        // Inspired by: https://itsjavi.com/fontawesome-iconpicker/
        self.iconSearchPopover = function(searchNow,callback,addDelete,addColorSelector,startcolor,container,placement){
            if (addDelete === undefined){
                addDelete = true;
            }
            if (addColorSelector === undefined){
                addColorSelector = true;
            }
            // Set blank start color
            if (startcolor === undefined){
                startcolor = false;
            }
            if (container === undefined){
                container = 'body';
            }
            // Set placement
            if (placement === undefined){
                placement = 'left';
            }
            if (typeof searchNow == "string"){
                searchNow = searchNow.replace(/fa-|fas |far |fal |fad |fab |fa /gi,"");
            }
            return {
                'html': true,
                'container': container,
                'placement' : placement,
                'title' : function(){
                    var myself = $(this);
                    // Hack apply class to myself
                    myself.data('popover').$tip.addClass('UICIconPicker');
                    if (myself.data("frun") != true){
                        myself.data("frun",true);
                        return false;
                    }
                    // Lookup dynamic source if possible
                    var defaultstr = searchNow;
                    if (typeof searchNow == "object"){
                        // Dont search empty icons
                        if (searchNow.hasClass('UICIconEmpty')){
                            defaultstr = '';
                        }else{
                            defaultstr = searchNow.attr('class');
                        }
                    }else if (typeof searchNow == "function"){
                        defaultstr = searchNow();
                    }
                    defaultstr = defaultstr.replace(/fa-|fas |far |fal |fad |fab |fa /gi,"");
                    // Convert colors from object or string
                    var strcolor = false;
                    if (typeof startcolor == "object"){
                        if ($(startcolor).data('color') !== undefined){
                            strcolor = $(startcolor).data('color');
                        }else if(typeof $(startcolor).css('color') == "string"){
                            var rgb = $(startcolor).css('color').match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+))?\)$/);
                            hexcolor = function(x) {
                                return ("0" + parseInt(x).toString(16)).slice(-2);
                            }
                            strcolor =  "#" + hexcolor(rgb[1]) + hexcolor(rgb[2]) + hexcolor(rgb[3]);
                        }else{
                            strcolor = false
                        }
                    }else{
                        strcolor = startcolor;
                    }

                    // hide others
                    $('.UICShowIconPicker').not(myself).popover('hide');
                    // Build main forms
                    var searchInput = $('<input type="search" autocomplete="off" class="UICiconSearchFilter form-control" value="'+defaultstr+'" placeholder="Type to search">');
                    var closebtn = $('<button type="button" class="UICiconSearchClose btn btn-mini pull-right"><i class="fas fa-times"></i></button>');
                    // Close
                    closebtn.off('click').on('click',function(){
                        myself.popover('hide');
                    });

                    // auto search handler
                    searchInput.off('keyup').on('keyup',function(e){
                        e.preventDefault();
                        if (e.key == "Escape") {
                            myself.popover('hide');
                            e.stopPropagation();
                            return false;
                        }
                        $this = $(this);
                        if ($this.data('keyTime') != undefined && $this.data('keyTime') != null){
                            window.clearTimeout($this.data('keyTime'));
                            $this.data('keyTime',null);
                        }
                        // Dont search small string
                        var search = $.trim($this.val());
                        if (search.length <= 2 || $this.data('prevSearch') == search){
                            return true;
                        }
                        var target = searchInput.closest('div.popover').find('div.UICiconSearchResults');
                        target.html('<div class="text-center UICiconSearchInfo"><i class="fas fa-spinner fa-pulse"></i>&nbsp;Searching&hellip;</div>');

                        // Set a time before searching
                        var timeout = window.setTimeout(function(){
                            if ($this.data('prevAjax') != undefined && $this.data('prevAjax') != null){
                                $this.data('prevAjax').abort();
                            }
                            var xhr = $.ajax({
                                method: "POST",
                                url: "https://api.fontawesome.com",
                                contentType: 'application/json',
                                dataType: 'application/json',
                                headers: {'Accept':'application/json'},
                                data: JSON.stringify({query: "query { search(version: \"5.13.0\", query: \""+search+"\", first: 100) { label id membership{ free } } }"}),
                            }).always(function(data){
                                if (data.status == 200){
                                    try {
                                        var jsonObj = JSON.parse(data.responseText);
                                    }
                                    catch(err) {
                                        target.html('<div class="text-center UICiconSearchInfo"><i class="fas fa-exclamation-circle"></i> Error searching&hellip;<br><code>Error: Bad JSON</code></div>');
                                        return false;
                                    }
                                    $this.data('prevSearch',search);
                                    // Trigger the icon refresher
                                    self._iconSearchBuildResults(jsonObj,target,myself,search,callback);
                                }else{
                                    target.html('<div class="text-center UICiconSearchInfo"><i class="fas fa-exclamation-circle"></i> Error searching&hellip;<hr/><code>Error: '+data.status +' ('+data.statusText +')</code></div>');
                                }
                            })
                            $this.data('prevAjax',xhr);
                        },350);
                        $this.data('keyTime',timeout);
                    });

                    // Build a form
                    var newForm = $('<form/>').submit(function(e){
                        e.preventDefault();
                        return false;
                    })
                    var inputcontainer = $('<div class="UICIconPickHeader"/>').append(searchInput);;

                    // Add color selector
                    if (addColorSelector){
                        var colorStyle = 'style="color:'+strcolor+'"';
                        var preColor = 'value="'+strcolor+'"';
                        if (strcolor == false){
                            colorStyle = '';
                            preColor = '';
                        }
                        var colorSelector = $('<label class="btn UICTabIconColorLbl" title="Set icon color"><i class="fas fa-eye-dropper" '+colorStyle+'></i><input type="color" class="UICTabIconColor btn" '+preColor+'></label>');
                        colorSelector.find('.UICTabIconColor').on('change input',function(){
                            $('.UICTabIconClear').removeClass('active')
                            $(this).data('color',$(this).val());
                            $(this).prev().css('color',$(this).val());
                            $(this).closest('div.popover').find('.UICiconSearchResults').css('color',$(this).val());
                        });
                        if (strcolor != false){
                            colorSelector.find('.UICTabIconColor').data('color',strcolor);
                            $('div.UICiconSearchResults').css('color',strcolor);
                        }
                        inputcontainer.append(colorSelector);
                        var noColor = $('<button class="btn UICTabIconClear" title="No icon color is applied"><span class="UIC-fa-stack"><i class="fas fa-slash"></i> <i class="fas fa-eye-dropper fa-stack-1x"></i></span></button>');
                        noColor.on('click',function(){
                            $('.UICTabIconColor').data('color',false);
                            $('.UICTabIconColor').prev().css('color','inherit');
                            $(this).addClass('active');
                            $(this).closest('div.popover').find('.UICiconSearchResults').css('color','inherit');
                        });
                        if (strcolor == false){
                            noColor.addClass('active');
                        }
                        inputcontainer.append(noColor);
                        inputcontainer.addClass('input-append');
                    }
                    // Delete/trash
                    if (addDelete){
                        var delbtn = $('<button type="button" title="Dont select an icon, blank" class="btn"><i class="fas fa-trash"></i></button>');
                        delbtn.on('click',function(){
                            if (typeof callback == "function"){
                                callback(false,false);
                            }
                            myself.popover('hide');
                        });
                        inputcontainer.append(delbtn);
                        inputcontainer.addClass('input-append');
                    }
                    // Build it all
                    newForm.append(inputcontainer).append(closebtn);
                    window.setTimeout(function(){
                        searchInput.focus();
                        searchInput.select();
                        if (addColorSelector){
                            colorSelector.trigger('change');
                        }
                        if (defaultstr != ""){
                            if (strcolor != false){
                                $('div.UICiconSearchResults').css('color',strcolor);
                            }
                            searchInput.trigger('keyup');
                        }
                    },200);
                    self.logToConsole(newForm.children());
                    return newForm;
                },
                'content': function(){
                    var searchRes = $('<div class="UICiconSearchResults"><div class="text-center UICiconSearchInfo"><i class="fas fa-info-circle"></i>&nbsp;Type to search&hellip;</div></div>');
                    return searchRes;
                }
            };
        }


        // ------------------------------------------------------------------------------------------------------------------------
        self._iconSearchBuildResults = function(jsonData,target,src,search,callback){
            if (!jsonData.hasOwnProperty('data') || !jsonData.data.hasOwnProperty('search') || jsonData.data.search.length == 0){
                target.html('<div class="text-center UICiconSearchInfo"><i class="fas fa-heart-broken"></i> Sorry no results found&hellip;</div>')
                return true;
            }
            var color = null;
            var colorsel = $('div.UICIconPickHeader input.UICTabIconColor');
            if (colorsel.length && colorsel.data('color') != undefined){
                color = colorsel.data('color');
            }

            // Cleanup
            var iconsFound = false;
            target.html('');
            $.each(jsonData.data.search,function(id,val){
                if (!val.hasOwnProperty('id')){
                    return false;
                }
                // Lookup free stuff only
                if (val.hasOwnProperty('membership') && val.membership.hasOwnProperty('free')){
                    $.each(val.membership.free,function(id2,itype){
                        var itypeL = itype.slice(0,1);
                        var matched = '';
                        // Disabled to it didn't look good
                        if (search == val.id){
                        //     matched = 'class="UICIconSelected"';
                        }
                        iconsFound = true;
                        target.append('<a role="button" '+matched+' href="javascript:void(0)" title="' + val.label +'"><i class="fa' + itypeL + ' fa-' + val.id +'"></i></a>');
                    })
                }
            });

            // Click handler for selecting an icon
            target.find('a').off('click').on('click',function(){
                var iconsel = $(this).find('i').attr('class');
                // Should we trigger a callback
                if (typeof callback == "function"){
                    var color = null;
                    var colorsel = target.closest('div.popover').find('input.UICTabIconColor');
                    if (colorsel.length && colorsel.data('color') != undefined){
                        color = colorsel.data('color');
                    }
                    callback(iconsel,color);
                }
                src.popover('hide');
                target.find('.UICIconSelected').removeClass('UICIconSelected');
                $(this).addClass('UICIconSelected');
            });
            if (iconsFound){
                target.prepend($('<div class="searchResultHelper"><span class="label label-info">Click icon to save changes</span></div>'));
            }
        }


        // Load themes
        self.loadSettingsThemes = function(responseData,baseURL){
            if (responseData == null){
                $('#settings_uicustomizer_themesContent').html('<div class="UIC-pulsate text-info text-center">Loading themes&hellip;</div>');
                $.ajax({
                    url: self.ThemesExternalURL+'themes.json',
                    success: function(response){
                        self.loadSettingsThemes(response,self.ThemesExternalURL);
                    },
                    // Try local as a workaround
                    error: function (jqXHR) {
                        console.log("FAILED TO LOAD: "+ self.ThemesExternalURL, jqXHR);
                        new PNotify({
                            title: 'Unable to load themes',
                            text: 'Failed to load "'+self.ThemesExternalURL+'themes.json" file - internal files loaded as fallback.<br><br>Do you have any plugins blocking access to external sites, for example NoScript.<br><br><code>Error message: ' + jqXHR.status + " " + jqXHR.statusText   + '</code>',
                            type: "error",
                            hide: false
                        });
                        $.ajax({
                            url: self.ThemesInternalURL+'../themes.json',
                            success: function(response){
                                self.loadSettingsThemes(response,self.ThemesInternalURL);
                            },
                            error: function (jqXHR2) {
                                alert("FAILED TO LOAD THEMES!: " + jqXHR2.status + " " + jqXHR2.statusText );
                            }
                        });
                    }
                });
                return;
            }
            self.ThemesBaseURL = baseURL;
            var themesHTML = '<ul class="thumbnails">';
            var template = '\
            <li class="span4" data-uictheme="[key]">\
                <a title="Click to select theme" href="#" class="UICsetTheme thumbnail"><img src="'+self.ThemesBaseURL+'thumbs/[key].png"/></a>\
                <p><a href="[org]" class="UICMargLeft pull-right btn-mini btn" target="_blank">Author</a><button class="btn-mini btn btn-primary UICsetTheme pull-right">Select</button>\
                <strong>[name]</strong><br><small>[desc]</small>\
                </p>\
            </li>';
            // Sort result
            var keys = Object.keys(responseData);
            keys.sort();
            // Put default last
            keys.push(keys.splice(keys.indexOf('default'), 1)[0]);

            // Parse them
            $.each(keys,function(id,key){
                var addThis = template+'';
                addThis = addThis.replaceAll('\[key\]',key);
                theme = responseData[key];
                $.each(theme,function(key,attr){
                    if (key == "org"){
                        if (attr == false){
                            attr = '#;" style="display:none" ';
                        }else{
                            attr = encodeURI(attr);
                        }
                    }else{
                        attr = $('<div/>').text(attr).html();
                    }
                    addThis = addThis.replace('\['+key+'\]',attr);
                });
                themesHTML += addThis;
            });
            themesHTML += '</ul>';
            $('#settings_uicustomizer_themesContent').html(themesHTML);

            // Click handler
            $('.UICsetTheme').off('click').on('click',function(event){
                var selectedTheme = $(this).closest('li').data('uictheme');
                // Update preview
                if (self.previewOn){
                    self.set_theme(selectedTheme,true);
                }
                self.setThemeSelected(selectedTheme);
                return false;
            });

            // Set themes when done
            self.setThemeSelected();
        }

        // Set theme selected
        self.setThemeSelected = function(theme){
            if (theme == undefined){
                theme = self.UICsettings.theme();
            }
            // Do we have the requested theme - if not then use default
            if (!$('#settings_uicustomizer_themesContent li[data-uictheme="'+theme+'"]').length){
                theme = "default";
            }
            $('#settings_uicustomizer_themesContent li').removeClass('UICThemeSelected');
            $('#settings_uicustomizer_themesContent li[data-uictheme="'+theme+'"]').addClass('UICThemeSelected');

            // Show warning about "appearance" styling conflict
            if ($('div.alert.UICappearWarn').length == 0 && (self.coreSettings.appearance_colorTransparent() == true || self.coreSettings.appearance_color() != "default")){
                $('#settings_uicustomizer_themesContent').prepend('<div class="alert alert-info UICappearWarn">\
                    <strong>Styling/Theme conflict</strong>\
                    <p>You currently have one or more "Appearance" settings that might make the themes look wrong. Check under OctoPrint > Appearance and make sure Color is "Default" and "Transparent color" is unchecked.</p>\
                    <button class="btn btn-success">Fix it</button>\
                    </div>')
                .find('button').one('click',function(){
                    self.coreSettings.appearance_color('default');
                    self.coreSettings.appearance_colorTransparent(false);
                    $('div.alert.UICappearWarn').remove();
                    return false;
                });
            }
        }

        // ------------------------------------------------------------------------------------------------------------------------
        // Settings handler
        self.onSettingsShown = function() {
            self.saved = false;
            self.previewHasBeenOn = false;

            // Hide webcam on setting open
            $('#UICWebCamShrink').trigger('click');

            // Upload of settings JSON
            $('#UICUploadSettings').off('change');
            // Allow upload of the same file
            $('#UICUploadSettings').off('click').on('click',function(){
                $(this).val('');
            });
            if (window.FileList && window.File && window.FileReader) {
                $('#UICUploadSettings').on('change',function(event){
                    $('#UISettingsImportAlert').removeClass('alert-success alert-warning alert-info').hide();
                    // https://web.dev/read-files/
                    var file = event.target.files[0];
                    if (!file.type) {
                        $('#UISettingsImportAlert').html('<strong>Error</strong><br>The File.type property does not appear to be supported on this browser.').addClass('alert-warning').show();
                        event.preventDefault();
                        return false;
                    }
                    if (!file.type.match('json')) {
                        $('#UISettingsImportAlert').html('<strong>Error</strong><br>The selected file does not appear to be an UI Customizer JSON settings file.').addClass('alert-warning').show();
                        event.preventDefault();
                        return false;
                    }
                    // Read the file
                    var reader = new FileReader();
                    reader.addEventListener("load", () => {
                        try {
                            var JSONLoadSet = JSON.parse(reader.result);
                        } catch(e) {
                            event.preventDefault();
                            $('#UISettingsImportAlert').html('<strong>Error</strong><br>'+ e).addClass('alert-warning').show();
                            return false;
                        }
                        // Check data
                        if (!('UICSettings' in JSONLoadSet)){
                            $('#UISettingsImportAlert').html('<strong>Error</strong><br>The selected file does not appear to be an UI Customizer JSON settings file.').addClass('alert-warning').show();
                            event.preventDefault();
                            return false;
                        }
                        // Handle the data
                        self.loadJSONsettings(JSONLoadSet);

                        var localVersion = self.findPluginData('uicustomizer').version;
                        if (self.findPluginData('uicustomizer').version != JSONLoadSet.UICSettings){
                            $('#UISettingsImportAlert').html('Settings was successfully imported<br>Note that imported file is from a different version of UI Customizer than the installed version, some settings might not be missing.<br>Installed version: ' + localVersion+"<br>Imported version:"+JSONLoadSet.UICSettings).addClass('alert-info').show();
                        }else{
                            $('#UISettingsImportAlert').html('Settings was successfully imported').addClass('alert-success').show();
                        }

                        JSONLoadSet = null;
                    }, false);

                    if (file) {
                        reader.readAsText(file);
                    }
                    event.preventDefault();
                    return false;
                });
            }else{
                $('#UICUploadSettings').on('change',function(event){
                    alert("You browser does not support file uploading");
                    event.preventDefault();
                    return false;
                });
            }

            // Hide highligths
            $('#settings_plugin_pluginmanager_pluginlist table tr.UIC-pulsateShort').removeClass('UIC-pulsateShort');

            // Load themes
            if (!self.ThemesLoaded){
                $('#settings_plugin_uicustomizer a[href="#settings_uicustomizer_themes"]').one('click',function(){
                    if (self.getStorage("getThemesApproved",true) == 1){
                        // Dont load again
                        self.ThemesLoaded = true;
                        self.loadSettingsThemes(null);
                        return;
                    }
                    // Show warning
                    $('#settings_uicustomizer_themesContent').html('<div class="alert alert-info">\
                    <strong>Information regarding themes</strong>\
                    <p>In order to download new and updated themes UI Customizer will download the themes, using a secure connection, from <a href="'+self.ThemesExternalURL+'" target="_blank">'+self.ThemesExternalURL+'</a>.</p><p>No personal data is sent to this URL. The only data being sent is your public IP address due to the nature of the internet.</p><p>If you have any plugins (ie. NoScript) installed that might block access to external sites then please allow access to https://github.io</p><p>Click "Continue" to download themes.</p>\
                    <button class="btn btn-success">Continue</button>\
                    </div>').find('button').one('click',function(){
                        self.setStorage("getThemesApproved",1,false);
                        self.ThemesLoaded = true;
                        self.loadSettingsThemes(null);
                        return false;
                    });

                });
            }else{
                self.setThemeSelected();
            }
            self.settingsBeenShown = true;
            $('#UICReportBug').removeData('updateCheck');
            $('#UICReportBug').off('click').on('click',function(){
                var $this = $(this);
                if ($this.data('updateCheck') == "pending"){
                    return true;
                }

                if ($this.data('updateCheck') != "done"){
                    self.logToConsole("Checking for updates to myself");
                    $this.attr('disabled',true).addClass('disabled');
                    $this.data('updateCheck',"pending");
                    // Check for updates
                    $.get("./plugin/softwareupdate/check?force=true", function(data) {
                        // We have an update then show the real dialog
                        if (data.hasOwnProperty('information') && data.information.hasOwnProperty('uicustomizer') && data.information.uicustomizer.updateAvailable){
                            self.logToConsole("Updates found");
                            new PNotify({
                                title: 'Update UI Customizer<i class="fas fa-download pull-right"></i>',
                                text: 'Before sending in a bug report please update to the latest version...\nThanks<i class="far fa-smile-wink"></i>',
                                type: "notice",
                                hide: false
                            });
                            // Trigger the update dialog
                            OctoPrint.coreui.viewmodels.softwareUpdateViewModel.performCheck(true,true,true);
                        }else{
                            self.logToConsole("No updates found");
                            $this.data('updateCheck','done');
                            $this.attr('disabled',false).removeClass('disabled');
                            $this.trigger('click');
                        }
                    }).fail(function(){
                        self.logToConsole("Update check failed");
                        $this.data('updateCheck','done');
                        $this.attr('disabled',false).removeClass('disabled');
                        $this.trigger('click');
                    }).always(function() {
                        $this.data('updateCheck','done');
                        $this.attr('disabled',false).removeClass('disabled');
                    });
                    return true;
                }

                // Send the bug report from here
                $(this).find('i').toggleClass('skull-crossbones bug');
                url = 'https://github.com/LazeMSS/OctoPrint-UICustomizer/issues/new';
                var body = "## Description\n**ENTER DESCRIPTION HERE\nDescribe your problem?\nWhat is the problem?\nCan you recreate it?\nDid you try disabling plugins?\nDid you remember to update the subject?**\n<hr>\n\n**Plugins installed**\n";
                // Get plugin info
                $.each(OctoPrint.coreui.viewmodels.pluginManagerViewModel.plugins.allItems,function(x,item){
                    if (item.enabled && item.bundled == false){
                        var version = "";
                        if (item.version != null){
                            version = " v"+ item.version;
                        }
                        if (item.key == "uicustomizer"){
                            body += '- **' + item.name +"["+item.key+"]" + version + "**\n";
                        }else{
                            body += '- ' + item.name +"["+item.key+"]" + version + "\n";
                        }
                    }
                });
                // Settings
                body += "\n\n**UI Customizer settings**\n";
                $(Object.entries(self.UICsettings)).each(function(x,item){
                    if (typeof item[1]() == "boolean"){
                        body += '- ' + item[0] + ": " +item[1]() + "\n";
                    }
                });
                body += "\n\n**Software versions**\n- "+$('#footer_version li').map(function(){return $(this).text()}).get().join("\n- ");
                body += "\n\n**Browser**\n- "+navigator.userAgent
                window.open(url+'?body='+encodeURIComponent(body),'UICBugReport');
                $(this).blur();
            });

            // Widgets found
            var sidebarItems = ['div.UICmainTabs'];
            $('#sidebar div.accordion-group').each(function(){
                sidebarItems.push('#'+$(this).attr('id'));
            });

            // Check for navbar
            if (self.findPluginData('navbartemp',true)){
                $('#settings_uicustomizer_topicons input[data-settingtype="navbarplugintempfix"]').prop( "disabled", false ).parent().show();
            }else{
                $('#settings_uicustomizer_topicons input[data-settingtype="navbarplugintempfix"]').prop( "disabled", true ).parent().hide();
            }

            // Top icon sorting
            OctoPrint.coreui.viewmodels.pluginManagerViewModel.plugins.allItems; // init it
            var tiCon = $('#settings_uicustomizer_topicons_container');
            tiCon.empty();
            // Build item
            var buildTopIconItem = function(tid){
                self.logToConsole("Building sorter for: " + tid);
                $thisIcon = $('#'+tid);
                // Not found or already there
                if (!$thisIcon.length || tiCon.find('div[data-tid="'+tid+'"]').length){
                    return true;
                }
                var key = tid.replace('navbar_plugin_',"");
                var icon = $thisIcon.find('i:first');
                var iconstr = '';
                // Add an icon or not?
                if (icon.length){
                    iconstr = icon.clone().wrap('<p>').parent().html();
                }else{
                    if (key == "wifistatus"){
                        iconstr = '<i class="fas fa-wifi"></i>';
                    }
                }
                // Overwrite our own
                if (key == "toptemp"){
                    iconstr = '<i class="fas fa-thermometer-full"></i>';
                }
                // Overwrite pi support
                if (key == "pi_support"){
                    iconstr = '<i style="font-weight:bold" class="fab fa-raspberry-pi"></i>';
                }
                // Get plugin data
                var pdata = self.findPluginData(key,false);
                if (pdata == null){
                    var name = key.replace("_", " ").toLowerCase();
                }else{
                    var name = pdata.name.toLowerCase();
                }
                tiCon.append($('<div class="accordion-group" data-tid="'+tid+'"><div class="accordion-heading"><button class="UICDragVHandle btn btn-small" type="button" title="Sort item"><i class="fas fa-arrows-alt-v"></i></button><span class="UICPadLeft UICTopIconLbl">'+name+'</span>'+iconstr+'</div></div>'));
            }

            // Get the data
            var sortList = self.UICsettings.topIconSort();
            var topIcons = self.get_TopIcons();
            $.each(sortList,function(i,item){
                buildTopIconItem(item);
            });
            $.each(topIcons,function(i,item){
                buildTopIconItem(item);
            });

            // sort the icons
            var topIconSorter = Sortable.create(tiCon[0],{
                group: 'UICTopIconSort',
                draggable: 'div.accordion-group',
                delay: 200,
                delayOnTouchOnly: true,
                sort: true,
                chosenClass: 'alert-info',
                direction: 'vertical',
                dragoverBubble: false,
                onStart: function(){
                    $('#drop_overlay').addClass('UICHideHard');
                },
                onEnd: function(evt){
                    $('#drop_overlay').removeClass('UICHideHard in');
                    // prewivew sort
                    if (self.previewOn){
                        var newlist = $('#settings_uicustomizer_topicons_container > div').map(function(){return $(this).data('tid')}).get();
                        self.set_sortTopIcons(newlist);
                    }
                }
            })
            // Store for later reference
            tiCon.data('sorter',topIconSorter);


            /// ---------------------- MAIN TABS

            // Get the tabs data
            var tabsData = self.initTabs(self.UICsettings.mainTabs());
            self.buildCustomTabSettings(tabsData);

            // Change icon size
            $('#UICMainTabsIconSize').off('change.uicus').on('change.uicus',function(){
                if (self.previewOn){
                    self.set_mainTabsCustomize(true,self.buildCustomTabsSave());
                }
            });

            /// ---------------------- COLS LAYOUT

            // Cleanup
            $('#UICSortCols ul li').remove();
            $('#UICSortCols ul').addClass('nav-tabs'); // hack due to this: https://github.com/OctoPrint/OctoPrint/blob/3ab84ed7e4c3aaaf71fe0f184b465f25d689f929/src/octoprint/static/js/app/main.js#L737

            // Build the sorter to make it ready
            var colsTemp = self.UICsettings.rows();

            // Join and filter on unique values
            sidebarItems = sidebarItems.concat(Object.keys(self.customWidgets)).filter(function(value, index, self) {
                    return self.indexOf(value) === index;
            });
            self.logToConsole("Sidebar and custom widgets:" + JSON.stringify([...sidebarItems]));

            // Run trough each col
            $(colsTemp).each(function(colid,items){
                // Skip if broken
                if (typeof items != "object"){
                    return;
                }
                // add to the editor
                $.each(items, function(widgetid,shown){
                    if (typeof widgetid != "string"){
                        return;
                    }
                    // prefix removal
                    if (widgetid.charAt(0) == "_"){
                        self.logToConsole("Slicing 3 chars of: " + widgetid);
                        widgetid = widgetid.slice(3);
                        self.logToConsole("new widgetid: " + widgetid);
                    }
                    // This is bad
                    if ($(widgetid).length == 0){
                        self.logToConsole("Skipping widgetid: " + widgetid + ", not found");
                        return;
                    }
                    if (typeof shown == "function"){
                        shown = shown();
                    }
                    self.logToConsole('Adding widget "' + widgetid + '"('+shown + ") to selector");
                    self.addToSorter(colid,widgetid,shown);
                    // Remove from add defaults
                    var arpos = $.inArray(widgetid,sidebarItems);
                    if (arpos >= 0){
                        self.logToConsole('Removing widget "' + widgetid + '" from sidebarItems');
                        sidebarItems.splice(arpos, 1);
                    }
                });
            });

            // Append the missing items from the initial load items
            if(sidebarItems.length >0){
                $(sidebarItems).each(function(key,val){
                    self.logToConsole('Adding non-placed widget "'+ val+'"');
                    self.addToSorter(0,val,false);
                })
            }

            // Hide/show widget
            $('#UICSortCols ul > li> a  > i.UICToggleVis').off('click').on('click',function(event){
                $(this).toggleClass('fa-eye fa-eye-slash');
                var granpar = $(this).parent().parent();
                // Change checkbox
                var chbox = granpar.find('input');
                chbox.prop("checked", !chbox.prop("checked"));
                if (self.previewOn){
                    $($(this).closest('li').data('id')).toggleClass('UICHide');
                    self.previewHasBeenOn = true;
                }
                granpar.addClass('UICPreviewRestore');
                event.stopPropagation();
            });

            // Update min max
            var fixMinMax = function(){
                // Update min/max for all items and disable the last one
                $('#UICSortCols ul:empty').parent().find('input.uiccolwidth').attr('min',0);
                $('#UICSortCols ul:not(:empty)').parent().find('input.uiccolwidth').attr('min',1);
                $('#UICSortCols ul').parent().find('input.uiccolwidth').attr('max',(10+$('#UICSortCols ul:empty').length));
                $('#UICSortCols ul:last:empty').parent().find('input.uiccolwidth').val(0).prop('disabled',true);
                $('#UICSortCols ul:last:not(:empty)').parent().find('input.uiccolwidth').prop('disabled',false);
                $('#settings_plugin_uicustomizer input.uiccolwidth').trigger('input');
            }

            // Sort/draghandler layout
            $('#UICSortCols ul').each(function(key,val){
                self.SortableSet[key] = Sortable.create(this,{
                    group: 'UICsortList',
                    draggable: 'li',
                    filter: "i.UICToggleVis",
                    delay: 200,
                    delayOnTouchOnly: true,
                    sort: true,
                    dragoverBubble: false,
                    onStart: function(){
                        $('#drop_overlay').addClass('UICHideHard');
                    },
                    onEnd: function(evt){
                        $('#drop_overlay').removeClass('UICHideHard in');
                        // Update min/max for all items
                        fixMinMax();
                        // Preview
                        if (self.previewOn){
                            var colData = self.buildColumns(false);
                            self.set_mainLayout({'rows': colData[0],'widths':colData[1]});
                        }
                    }
                });
            });

            // width settings updater
            $('#settings_plugin_uicustomizer input.uiccolwidth').off('input.uicus').on('input.uicus',function(){
                $(this).next().html($(this).val());
            });

            // Inforce the maxium total width
            $('#settings_plugin_uicustomizer input.uiccolwidth').off('change.uicus').on('change.uicus',function(){
                var thisItem = this;
                var spanW = $('#UICSortCols input.uiccolwidth');

                var totalspan = spanW.map(function(){return $(this).val();}).get().reduce(function(a, b){
                    return parseInt(a,10) + parseInt(b,10);
                }, 0);

                // Over?
                if (totalspan > self.maxCWidth){
                    var diff = totalspan - self.maxCWidth;
                    $(spanW).each(function(key,item){
                        if (item != thisItem){
                            var thisVal = parseInt($(item).val(),10);
                            var thisDiff = (thisVal-diff);

                            // To much diff?
                            if(thisDiff < 1){
                                if ($(item).parent().next().is(':empty')){
                                    diff -= thisVal;
                                    $(item).val(0).trigger('input');
                                }else{
                                    diff -= (thisVal-1);
                                    $(item).val(1).trigger('input');
                                }
                            }else{
                                diff -= thisDiff;
                                $(item).val(thisDiff).trigger('input');
                            }
                            // No more needed
                            if (diff <= 0){
                                return false;
                            }
                        }
                    });
                    spanW.trigger('input');
                }
                // Preview
                if (self.previewOn){
                    var colData = self.buildColumns(false);
                    self.set_mainLayout({'rows': colData[0],'widths':colData[1]});
                }
            });

            // Set all empty to minimum
            fixMinMax();

            // Hide icon pickers
            $('#settings_plugin_uicustomizer ul.nav.nav-pills a').off('click.uicus').on('click.uicus',function(){
                $('.UICShowIconPicker').popover('hide');
            });

            // Toggle preview on/off
            self.previewOn = false;
            $('#UICRealPrevCheck').off('click.uicusPrev').on('click.uicusPrev',function(){
                // Toggle icon
                $(this).find('i').toggleClass('fa-square fa-check-square');
                // Set status
                self.previewOn = !self.previewOn;
                $('body').toggleClass('UICPreviewON');
                $(window).trigger('resize');
                self.renderPreview();
            }).find('i').removeClass('fa-check-square').addClass('fa-square');

            if ('cancelobjectViewModel' in OctoPrint.coreui.viewmodels){
                $('#settings_plugin_uicustomizer input[data-settingtype="gcodeFullWidth"]').attr('disabled',true).parent().attr('title','Disabled because of incompatibility with Cancel Objects plugin.')
            }else{
                $('#settings_plugin_uicustomizer input[data-settingtype="gcodeFullWidth"]').attr('disabled',false);
            }

            // Realtime preview
            $('#settings_plugin_uicustomizer input:checkbox[data-settingtype]').on('change.uicus',function(){
                var settingType = $(this).data('settingtype');
                if (self.previewOn && typeof self['set_'+settingType] == "function"){
                    self['set_'+settingType]($(this).is(':checked'));
                    if ($(this).data('previewtab') !== null){
                        $('#'+$(this).data('previewtab')+ ' a').trigger('click');
                    }
                 }
            });
        }

        self.renderPreview = function(){
            if (self.previewOn){
                self.previewHasBeenOn = true;

                // Set custom css
                if($('textarea.UICCustomCSS').data('uicPreVal') == undefined){
                    $('textarea.UICCustomCSS').data('uicPreVal',$('textarea.UICCustomCSS').val());
                }
                self.set_customCSS($('textarea.UICCustomCSS').val());
                $('textarea.UICCustomCSS').on('blur.uicus',function(){
                    self.set_customCSS($('textarea.UICCustomCSS').val());
                });

                // Set theme when updating it all
                var themeSel = $('#settings_uicustomizer_themesContent li.UICThemeSelected').data('uictheme');
                self.set_theme(themeSel,true);

                // Update all
                $('#settings_plugin_uicustomizer input:checkbox[data-settingtype]').trigger('change.uicus');
                var colData = self.buildColumns(false);
                self.set_mainLayout({'rows': colData[0],'widths':colData[1]});

                // Trigger us self if checking anything but our own menu item
                $('#settingsTabs a, #UICsettingsMenu a:not(.dropdown-toggle)').not('#settings_plugin_uicustomizer_link a').off('click.uicusPrev').one('click.uicusPrev',function(){
                    $('.UICShowIconPicker').popover('hide');
                    if (self.previewOn){
                        $('#UICRealPrevCheck').trigger('click.uicusPrev');
                    }
                });

                // Update main tabs
                $('#UICMainTabCustomizerToggle').trigger('change');

                // Show all top icons to preview
                if ($('ul.UICHeaderIcons').length){
                    $('ul.UICHeaderIcons >li a:hidden').addClass('UICpreviewHide').show();
                }else{
                    $('div.UICMainMenu ul.nav >li a:hidden').addClass('UICpreviewHide').show();
                }
                // Fix missing rpi icon if nothing wrong
                if ($('#navbar_plugin_pi_support i:visible').length == 0){
                    $('#navbar_plugin_pi_support a').prepend('<i style="font-weight:bold" class="UICRPIFix fab fa-raspberry-pi"></i>');
                }
                window.scrollTo(0,0);
            }else{
                $('textarea.UICCustomCSS').off('blur.uicus');
                // Remove preview toggles and restore the views when turning preview off/on
                if (self.previewHasBeenOn){
                    // Restore theme
                    self.set_theme(self.UICsettings.theme(),false);

                    // Restore
                    $('.UICPreviewRestore[data-orgvis]').each(function(){
                        var item = $($(this).data('id'))
                        if ($(this).data('orgvis')){
                            item.removeClass('UICHide');
                        }else{
                            item.addClass('UICHide');
                        }
                    });
                    $('.UICpreviewHide').hide();
                    $('.UICpreviewHide').removeClass('UICpreviewHide');
                    $('#navbar_plugin_pi_support i.UICRPIFix').remove();

                    self.set_customCSS($('textarea.UICCustomCSS').data('uicPreVal'));
                }
                $('#settingsTabs').off('click.uicusPrev');
            }
        }

         // ------------------------------------------------------------------------------------------------------------------------
        // Add an item to settings UI
        self.addToSorter = function(col,item,visible){
            var accord = $(item+' div.accordion-heading a.accordion-toggle').clone();
            var icon = accord.find('i');
            var title = $.trim(accord.text());
            if (title == "" && self.nameLookup.hasOwnProperty(item)){
                accord = $('<a>').append(self.nameLookup[item]);
                icon = accord.find('i');
                title = $.trim(accord.text());
            }
            if (title == ""){
                if ($(item).attr('id') != undefined){
                    title = $(item).attr('id')+"";
                }else{
                    title= "Unknown";
                }
            }
            if (title.length > 25){
                title = title.slice(0,25)+"&hellip;";
            }

             // Set checkbox and eye icon
            var checked = '';
            var checkclass = 'fa-eye-slash'
            if (visible || $(item).is(':visible')){
                checked = ' checked';
                checkclass = 'fa-eye';
            }

            // Main tabs can't be skinned
            if (item == "div.UICmainTabs"){
               $($('#UICSortCols ul')[col]).append(
                    $('<li data-id="'+item+'" data-orgvis="'+visible+'"><a><i class="'+icon.attr('class')+' UICPadRight"></i>'+title+'<i class="pull-right fas '+checkclass+' UICToggleVis"></i></a><input class="hide" type="checkbox"'+checked+'></li>')
                );
            }else{
                $($('#UICSortCols ul')[col]).append(
                    $('<li data-id="'+item+'" data-orgvis="'+visible+'"><a><i class="'+icon.attr('class')+' UICPadRight"></i>'+title+'<i class="pull-right fas '+checkclass+' UICToggleVis"></i></a><input class="hide" type="checkbox"'+checked+'></li>')
                );
            }
        }

        // ------------------------------------------------------------------------------------------------------------------------
        // Save handler and update
        self.onSettingsBeforeSave = function () {
            // Update if we have been shown/edited
            if (self.settingsBeenShown){

                // Get the data
                self.saved = true;
                var colData = self.buildColumns(true);
                if (colData[0]().length == 0 || $.isEmptyObject(colData[0]()[0])){
                    console.log(colData[0]());
                    alert("Critical failure saving UI Customizer settings - not saved!\nPlease look in the developer console.");
                    return false;
                }
                var topIconsSort = $('#settings_uicustomizer_topicons_container > div').map(function(){return $(this).data('tid')}).get();

                // Save and update
                self.UICsettings.topIconSort = ko.observableArray(topIconsSort);
                self.UICsettings.rows = colData[0];
                self.UICsettings.widths = colData[1];
                self.UICsettings.mainTabsCustomize = ko.observable($('#UICMainTabCustomizerToggle').is(':checked'));
                self.UICsettings.mainTabs = ko.observableArray(self.buildCustomTabsSave());

                // Set theme into settings and storage
                if (self.ThemesLoaded){
                    self.logToConsole(" ----> Themes have been loaded - we can save <----");
                    self.UICsettings.theme($('#settings_uicustomizer_themesContent li.UICThemeSelected').data('uictheme'));
                    // we are usin the external URL for themes - normal but it might fail and we use the local
                    if (self.ThemesBaseURL != self.ThemesInternalURL){
                        self.UICsettings.themeLocal(false);
                    }else{
                        self.UICsettings.themeLocal(true);
                    }
                }else{
                    self.logToConsole(" ----> Themes NOT loaded - we will not update the theme <----");
                }
                self.logToConsole(" ----> Settings have been saved/updated <----");
            }
        }

        // ------------------------------------------------------------------------------------------------------------------------
        // When settings are hidden
        self.onSettingsHidden = function() {
            // Revert if not saved and we have been previewing anything
            if (!self.saved && self.previewHasBeenOn){
                self.previewHasBeenOn = false;
                // Cancel the data to revert settings
                self.coreSettings.cancelData();
            }
            // Reset preview of custom css
            $('textarea.UICCustomCSS').data('uicPreVal',undefined);
            // Update
            self.UpdateLayout(self.UICsettings);

            // Always hide previewed stuff
            $('.UICpreviewHide').hide();
            $('.UICpreviewHide').removeClass('UICpreviewHide');
            $('#navbar_plugin_pi_support i.UICRPIFix').remove();
            // Remove preview
            $('body').removeClass('UICPreviewON');

            // Remove sorts
            $(self.SortableSet).each(function(){
                this.destroy();
            });

            $('#settings_uicustomizer_topicons_container').data('sorter').destroy();
            $('#settings_uicustomizer_topicons_container').removeData('sorter');
            // Remove sorter on tabs
            $('#settings_uicustomizer_tabs_look').data('sorter').destroy();
            $('#settings_uicustomizer_tabs_look').removeData('sorter');
            // Cleanup to prevent listners etc
            $('#settings_uicustomizer_tabs_look').empty();
            // Remove popovers
            $('.UICShowIconPicker').popover('hide');
            $('#settings_uicustomizer_tabs div.popover').remove();


            // Trigger
            $('#tabs').trigger('resize');

            // Disable event listners
            $('#settings_plugin_uicustomizer input').off('input.uicus change.uicus click.uicus');
            // Fix webcam
            self.webcamAttachHandler();

            self.settingsBeenShown = false;
        }

        // ------------------------------------------------------------------------------------------------------------------------
        self.loadJSONsettings = function(settingsdata){
            $.each(settingsdata,function(idx,val){
                if (idx in OctoPrint.coreui.viewmodels.settingsViewModel.settings.plugins.uicustomizer){
                    // Special handling for custom settings :
                    if (idx == "theme"){
                        $('li[data-uictheme="'+val+'"] a').trigger('click')
                    }else if (idx == "rows"){
                        $.each(val,function(rowid,entries){
                            $.each(entries,function(entryid,entryVal){
                                entryid = entryid.slice(3);
                                var widget = $('#UICSortCols li[data-id="'+entryid+'"]');
                                if (widget.length){
                                    widget.appendTo($('#UICSortCols ul').get(rowid));
                                    var widgetVis = widget.find('input[type="checkbox"]');
                                    if (widgetVis.prop('checked') != entryVal){
                                        widget.find('i.UICToggleVis').trigger('click');
                                    }
                                }
                            });
                        });
                    }else if (idx == "topIconSort"){
                        $.each(val.reverse(),function(topid,topicon){
                            if ($('#settings_uicustomizer_topicons_container div[data-tid="'+topicon+'"]').length){
                                $('#settings_uicustomizer_topicons_container div[data-tid="'+topicon+'"]').prependTo($('#settings_uicustomizer_topicons_container'));
                            }
                        });
                    }else if (idx == "mainTabs"){
                        // Tabs needs alot of love
                        var tabData = OctoPrint.coreui.viewmodels.uICustomizerViewModel.initTabs(val);
                        self.buildCustomTabSettings(tabData);
                    }else{
                        // Hit the knockout view model
                        OctoPrint.coreui.viewmodels.settingsViewModel.settings.plugins.uicustomizer[idx](val);
                    }
                }else{
                    if (idx != 'UICSettings'){
                        console.log(idx, "not found");
                    }
                }
            })
            $('#UICMainTabCustomizerToggle').trigger('change');
            if (self.previewOn){
                self.renderPreview();
            }
        }

        // ------------------------------------------------------------------------------------------------------------------------
        // Handling of input data
        self.fromCurrentData = function(data){

            // add the progress data to webcam overlay
            if ($('#UICWebCamFullProgress').length){
                // Active state?
                var printActive = false;
                if (data.state.flags.printing || data.state.flags.finishing || data.state.flags.paused || data.state.flags.pausing || data.state.flags.resuming){
                    printActive = true;
                }
                var divstatus = "";
                // 0: id, 1: label, 2: icon, 3: value, 4: need active print
                var items = [
                    ['data.state.text','Printer state','fas fa-info','data.state.text',false],
                    ['data.job.file.display','data.job.file.display','fas fa-file','data.job.file.display',false],
                    ['data.progress.completion', '% completed','fas fa-percent','OctoPrint.coreui.viewmodels.printerStateViewModel.progressBarString()',true],
                    ['data.progress.printTime', 'Print time progress/left','fas fa-stopwatch','OctoPrint.coreui.viewmodels.printerStateViewModel.printTimeString()+" / "+OctoPrint.coreui.viewmodels.printerStateViewModel.printTimeLeftExactString()',true],
                    ['data.currentZ', 'Z-axis position','fas fa-level-down-alt','data.currentZ'],
                ];
                var setLabelFSWC = function(id,title,icon,val,activePrint){
                    var pItem = $('#UICWCLbl_'+id);
                    var pclass = '';
                    if ((activePrint && !printActive) || val == "-" || val == ""){
                        val = "-";
                        pclass = " paused";
                        title += " (no data available)";
                    }
                    if (pItem.length){
                        if (pItem.data('prevval') != val){
                            pItem.data('prevval',val);
                            pItem.find('span').html(val);
                            pItem.attr('title',title);
                        }
                        if (pclass != ""){
                            pItem.addClass(pclass);
                        }else{
                            pItem.removeClass('paused');
                        }
                    }else{
                        divstatus += '<div id="UICWCLbl_'+id+'" data-prevval="'+val+'" title="'+title+'" class="label'+pclass+'"><i class="'+icon+'"></i><span>'+val+'</span></div>';
                    }
                }

                // Build each and update
                $.each(items,function(x,val){
                    var title = val[1];
                    // Title should be full filename
                    if (val[0] == "data.job.file.display"){
                        title = eval(val[3]);
                    }
                    if (eval(val[0]) != undefined){
                        setLabelFSWC(x,title,val[2], eval(val[3]),val[4]);
                    }else{
                        setLabelFSWC(x,title,val[2], "-",val[4]);
                    }
                });

                // Build temps - these are kinda special
                if(data.temps && data.temps[0]){
                    if(self.tempModel.hasTools() && data.temps[0].tool0 != undefined){
                        var calcVal = formatTemperature(data.temps[0].tool0.actual,false)+" / "+formatTemperature(data.temps[0].tool0.target,false);
                        setLabelFSWC('t0','Tool temperature','fas fa-fire', calcVal,false);
                    }
                    if(self.tempModel.hasBed() && data.temps[0].bed != undefined){
                        var calcVal = formatTemperature(data.temps[0].bed.actual,false)+" / "+formatTemperature(data.temps[0].bed.target,false);
                        setLabelFSWC('bed','Bed temperature','fas fa-window-minimize', calcVal,false);
                    }
                }else{
                    if(self.tempModel.hasTools() && self.tempModel.temperatures['tool0'].actual.length > 0 && self.tempModel.temperatures['tool0'].actual[self.tempModel.temperatures['tool0'].actual.length-1][1] != undefined){
                        var tempAct  = self.tempModel.temperatures['tool0'].actual[self.tempModel.temperatures['tool0'].actual.length-1][1];
                        var tempTrg  = self.tempModel.temperatures['tool0'].target[self.tempModel.temperatures['tool0'].target.length-1][1];
                        var calcVal = formatTemperature(tempAct,false)+" / "+formatTemperature(tempTrg,false);
                       setLabelFSWC('t0','Tool temperature','fas fa-fire', calcVal,false);
                    }
                    if(self.tempModel.hasBed() && self.tempModel.temperatures['bed'].actual.length > 0 && self.tempModel.temperatures['bed'].actual[self.tempModel.temperatures['bed'].actual.length-1][1] != undefined){
                        var tempAct  = self.tempModel.temperatures['bed'].actual[self.tempModel.temperatures['bed'].actual.length-1][1];
                        var tempTrg  = self.tempModel.temperatures['bed'].target[self.tempModel.temperatures['bed'].target.length-1][1];
                        var calcVal = formatTemperature(tempAct,false)+" / "+formatTemperature(tempTrg,false);
                        setLabelFSWC('bed','Bed temperature','fas fa-window-minimize', calcVal,false);
                    }
                }

                // Anything new to add
                if (divstatus != ""){
                    if ($('#UICWebCamFullProgress').data('built') == true){
                        $('#UICWebCamFullProgress').append(divstatus);
                    }else{
                        $('#UICWebCamFullProgress').data('built',true)
                        // Add progessbar
                        divstatus += '<span id="UICWCLbl_pBar" class="progress progress-striped"><span class="bar"></span></span>';
                        $('#UICWebCamFullProgress').html(divstatus);
                    }
                }

                // Update progressbar
                if (printActive){
                    if (data.state.flags.printing){
                        $('#UICWCLbl_pBar').addClass('active');
                    }else{
                        $('#UICWCLbl_pBar').removeClass('active');
                    }
                    $('#UICWCLbl_pBar').prop('title',OctoPrint.coreui.viewmodels.printerStateViewModel.progressBarString());
                    $('#UICWCLbl_pBar span.bar').width(OctoPrint.coreui.viewmodels.printerStateViewModel.progress()+'%');
                }else{
                    $('#UICWCLbl_pBar').prop('title','0%');
                    $('#UICWCLbl_pBar span.bar').width('0px');
                }

            }

            // Nothing to show
            if (!self.tempGraphActive && !self.gCodeViewerActive) return;


            // Get temp graph data
            if (self.tempGraphActive && data.temps.length && typeof Chartist == "object"){
                var nowTs = Date.now();
                var buildSeries = function(temp){
                    temp.reverse();
                    var series = [];
                    $.each(temp,function(x,val){
                        var seconds = Math.round((val[0]-nowTs)/1000);
                        // only get last 10 min
                        if (seconds < -600){
                            return false;
                        }
                        series.push({y:val[1],x:seconds});
                    });
                    return series;
                }

                var seriesData = [];
                if (self.tempModel.hasBed() && data.temps[0].bed != undefined){
                    seriesData.push({'data':buildSeries([...self.tempModel.temperatures['bed'].actual]),'className':'ct-series-g'});
                    seriesData.push({'data':buildSeries([...self.tempModel.temperatures['bed'].target]),'className':'ct-series-h'});
                }
                if (self.tempModel.hasTools()){
                    $.each(self.tempModel.tools(),function(indx,val){
                        var keyGraph = String.fromCharCode(97+indx);
                        var keyGraphT = String.fromCharCode(98+indx);
                        seriesData.push({'data':buildSeries([...self.tempModel.temperatures['tool'+indx].actual]),'className':'ct-series-'+keyGraph});
                        seriesData.push({'data':buildSeries([...self.tempModel.temperatures['tool'+indx].target]),'className':'ct-series-'+keyGraphT});
                    });
                }
                var options = {
                    axisX: {
                        offset: 0,
                        position: 'end',
                        labelOffset: {
                            x: 0,
                            y: 0
                        },
                        showLabel: true,
                        showGrid: true,
                        divisor: 10,
                        labelInterpolationFnc: function(value) {
                            return Math.round((value/60) * 10) / 10;
                        },
                        type: Chartist.FixedScaleAxis,
                        onlyInteger: true
                    },
                    axisY: {
                        offset: 25,
                        position: 'start',
                        labelOffset: {
                            x: 0,
                            y: 0
                        },
                        showLabel: true,
                        showGrid: true,
                        type: Chartist.AutoScaleAxis,
                        scaleMinSpace: 20,
                        onlyInteger: true,
                        referenceValue: 0,
                        low: 0,
                    },
                    low: 0,
                    showLine: true,
                    showPoint: false,
                    showArea: false,
                    lineSmooth: false,
                    chartPadding: {
                        top: 0,
                        right: 0,
                        bottom:30,
                        left: 5
                    },
                    fullWidth: true
                };
                new Chartist.Line('#UICTempWidgetGraph', {'series' : seriesData},options);
            }

            // Update gcode widget
            if (self.gCodeViewerActive){
                // Gcode widget on and visible
                if (!$('#UICGcodeVWidgetContainer.collapse.in').length || !$('#gcode_canvas').length || typeof OctoPrint.coreui.viewmodels.gcodeViewModel != "object") return;

                // load the file is needed
                if (OctoPrint.coreui.viewmodels.gcodeViewModel.needsLoad){
                    OctoPrint.coreui.viewmodels.gcodeViewModel.loadFile(OctoPrint.coreui.viewmodels.gcodeViewModel.selectedFile.path(), OctoPrint.coreui.viewmodels.gcodeViewModel.selectedFile.date());
                }

                // Update if gcode if not centered
                if (OctoPrint.coreui.selectedTab !== "#gcode") OctoPrint.coreui.viewmodels.gcodeViewModel._renderPercentage(data.progress.completion);

                self.cloneGcodeWidget();
            }
        }


        // ------------------------------------------------------------------------------------------------------------------------

        self.cloneGcodeWidget = function(){
            // Make a clone and parse to
            var widgetWidth = $('#UICGcodeVWidgetContainer div').width();
            var clone = $('#UICGcodeVWidgetCan')[0];
            var clonecon = clone.getContext('2d');
            var source = $('#gcode_canvas')[0];
            var factor = $('#UICGcodeVWidget').data('zoomlvl');
            var newWidth = source.width/factor;
            if (newWidth > widgetWidth){
                newWidth = widgetWidth/factor;
            }
            var newHeight = newWidth;
            if (newWidth != clone.width){
                clone.width = newWidth;
            }
            if (newHeight != clone.height){
                clone.height = newWidth;
            }
            clonecon.drawImage( source, 0, 0, clone.width, clone.height);
        }

        self.getStyleSheet = function(cssUrlPart){
            var cssSel = $('link[href*="'+cssUrlPart+'"][rel="stylesheet"]');
            if (cssSel.length){
                return cssSel[0];
            }
            return null;
        }

        self.setStorage = function(cname,cvalue,jsonData){
            if (!Modernizr.localstorage) return;
            if (window.location.pathname != "/"){
                cname = window.location.pathname+cname;
            }
            if (jsonData){
                cvalue = JSON.stringify(cvalue);
            }
            localStorage['plugin.uicustomizer.'+cname] = cvalue;
        }

        self.getStorage = function(cname,jsonParse){
            if (!Modernizr.localstorage) return undefined;
            if (window.location.pathname != "/"){
                cname = window.location.pathname+cname;
            }
            var returnVal = localStorage['plugin.uicustomizer.'+cname];
            if (returnVal != undefined && jsonParse){
                returnVal = JSON.parse(returnVal);
            }
            return returnVal;
        }

        self.findPluginData = function(pluginKey,checkEnabled){
            var returnItem = null;
            $.each(OctoPrint.coreui.viewmodels.pluginManagerViewModel.plugins.allItems,function(x,item){
                if (item.key == pluginKey){
                    returnItem = item;
                    return false;
                }
            });
            if (checkEnabled){
                if (returnItem != null && 'enabled' in returnItem && returnItem.enabled == true){
                    return true;
                }else{
                    return false;
                }
            }
            return returnItem;
        }
    }

    OCTOPRINT_VIEWMODELS.push({
        construct: UICustomizerViewModel,
        dependencies: ["settingsViewModel","temperatureViewModel","plotlytempgraphViewModel","classicWebcamViewModel"],
        optional: ["plotlytempgraphViewModel","classicWebcamViewModel"],
        elements: []
    });
});

/* UICustomizer END */