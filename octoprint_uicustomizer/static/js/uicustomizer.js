/* UICustomizer START */

// ALways make us able to get the viewport side
$('head').prepend('<link rel="stylesheet" href="./plugin/uicustomizer/static/css/loader.css">');

// Preloader to  make it pretty
$('head').prepend('<meta id="UICViewport" name="viewport" content="width=device-width, initial-scale=1.0">');

// Set theme onload
var UICPreLoadTheme  = "default";
if (Modernizr.localstorage){
    UICPreLoadTheme = localStorage['plugin.uicustomizer.theme'];
    if (UICPreLoadTheme == undefined || UICPreLoadTheme == "" || UICPreLoadTheme == null){
        UICPreLoadTheme = "default";
    }
}
$('body').append('<link class="UICThemeCSS" rel="stylesheet" href="./plugin/uicustomizer/static/themes/css/active.css?theme='+UICPreLoadTheme+'">');
delete UICPreLoadTheme;
// we will remove it again if user has opted out - this will just make it more clean on showing the UI
$('body').append('<link class="UICBSResp" rel="stylesheet" href="./plugin/uicustomizer/static/css/bootstrap-responsive.css">');


// Now we start
$(function() {
    function UICustomizerViewModel(parameters) {
        var self = this;
        // Run in debug/verbose mode
        self.debug = false;

        // Set settings
        self.settings = parameters[0];
        // max column width
        self.maxCWidth = 12;

        self.saved = false;

        // Setting preview
        self.previewOn = false;
        self.previewHasBeenOn = false;
        self.settingsBeenShown = false;

        self.getReturnData = false;

        self.ThemesLoaded = false;
        self.ThemesInternalURL = './plugin/uicustomizer/static/themes/';
        self.ThemesExternalURL = 'https://lazemss.github.io/OctoPrint-UICustomizerThemes/';
        self.ThemesBaseURL = self.ThemesInternalURL;


        // timer for resize fix modal
        self.modalTimer = null;

        self.nameLookup = {
            'div.UICmainTabs' : '<i class="fas fa-columns"></i> Main tabs',
            '#UICWebCamWidget' : '<i class="fas fa-camera"></i> Webcam',
            '#UICGcodeVWidget' : '<i class="fab icon-black fa-codepen"></i> Gcode'
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
                                <div class="btn-group UICWidgetSelector"><a class="btn btn-small dropdown-toggle" data-toggle="dropdown" href="#">Zoom:<span id="UICGcodeVWidgetZL"></span><span class="caret"></span></a><ul class="dropdown-menu"><li><a href="javascript:void(0);" data-zoomlvl=4>4</a></li><li><a href="javascript:void(0);" data-zoomlvl=3>3</a></li><li><a href="javascript:void(0);" data-zoomlvl=2>2</a></li><li><a href="javascript:void(0);" data-zoomlvl=1.5>1.5</a></li><li><a href="javascript:void(0);" data-zoomlvl=1>1</a></li></ul></div>\
                            </div>\
                            <div id="UICGcodeVWidgetContainer" class="accordion-body in collapse">\
                                <div class="accordion-inner">\
                                    <canvas id="UICGcodeVWidgetCan"/>\
                                </div>\
                            </div>\
                        </div>',
                'init' : 'CustomW_initGcode',
            }
        }

        // Store webcam init
        self.onWebCamOrg = null;
        self.onWebCamErrorOrg = null;

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
            // Cleanup everything if using touch ui
            if (typeof OctoPrint.coreui.viewmodels.touchUIViewModel != "undefined"){
                if(window.location.hash == "#touch"){
                    OctoPrint.coreui.viewmodels.touchUIViewModel.DOM.storage.set('active',true);
                    $('#page-container-loading-header').html($('#page-container-loading-header').html()+ "<br><small>Disabling UI Customizer..</small>")
                    $('link.UICThemeCSS,link.UICBSResp').remove();
                    return;
                }else if(OctoPrint.coreui.viewmodels.touchUIViewModel.DOM.storage.get('active') == true){
                    $('#page-container-loading-header').html($('#page-container-loading-header').html()+ "<br><small>Disabling Touch UI and reloading...</small>")
                    OctoPrint.coreui.viewmodels.touchUIViewModel.DOM.storage.set('active',false);
                    document.location.hash = "";
                    document.location.reload();
                    return;
                }
            }

            // Load from storage
            self.curTheme = self.getStorage('theme');

            // Store WebCam
            self.onWebCamOrg = OctoPrint.coreui.viewmodels.controlViewModel.onWebcamLoaded;
            self.onWebCamErrorOrg = OctoPrint.coreui.viewmodels.controlViewModel.onWebcamErrored;

            // Set names
            $('div.octoprint-container div.tabbable').addClass('UICmainTabs').wrap( '<div class="UICCol2"></div>');
            $('#sidebar').addClass('UICCol1');
            $('div.octoprint-container').addClass('UICMainCont');
            $('#navbar div.navbar-inner > div > div.nav-collapse').addClass('UICMainMenu');
            $('#navbar_plugin_announcements').addClass('UICExcludeFromTopIcons');

            // Disable output off the terminal if inactive
            var oldfunction = OctoPrint.coreui.viewmodels.terminalViewModel._processCurrentLogData;
            OctoPrint.coreui.viewmodels.terminalViewModel._processCurrentLogData = function(data) {
                if (OctoPrint.coreui.viewmodels.settingsViewModel.settings.plugins.uicustomizer.disableTermInactive() && (!OctoPrint.coreui.viewmodels.terminalViewModel.tabActive || !OctoPrint.coreui.browserTabVisible)){
                    return;
                }
                oldfunction(data);
            };

            // Fix SD card upload
            $('#gcode_upload_sd').parent().find('i.fas.fa-upload').removeClass('fa-upload').addClass('fa-sd-card');

            // Load custom layout
            self.UpdateLayout(self.settings.settings.plugins.uicustomizer);

            // Fix consolidate_temp_control layout issues
            if (typeof OctoPrint.coreui.viewmodels.settingsViewModel.settings.plugins.consolidate_temp_control !== "undefined"){
                $('div.page-container').css({'min-width':''});
                $('div.footer').css({'padding-left':'','padding-right':''});
                $('div.UICMainCont > div:first').css({'margin-left':'','padding-right':''});
                $('div.UICMainCont').removeClass('row-fluid');
                $('div.UICmainTabs').removeClass('span10');
                $('div#tabs_content div.tab-pane:not("#tab_plugin_consolidate_temp_control") > div > div.span6').unwrap();
                $('div#tabs_content div.tab-pane:not("#tab_plugin_consolidate_temp_control") > div.span6').children().unwrap();
            }

            // Rewrite the tab selector for settings - https://github.com/LazeMSS/OctoPrint-UICustomizer/issues/95
            var prevTab = OctoPrint.coreui.viewmodels.settingsViewModel.selectTab;
            OctoPrint.coreui.viewmodels.settingsViewModel.selectTab = function(tab){
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

            // Observe theme changes
            OctoPrint.coreui.viewmodels.settingsViewModel.appearance_color.subscribe(function(color) {
                self.updateStandardTheme(color);
            });
            if (OctoPrint.coreui.viewmodels.settingsViewModel.settings.plugins.hasOwnProperty('themeify')){
                OctoPrint.coreui.viewmodels.settingsViewModel.settings.plugins.themeify.theme.subscribe(function(theme) {
                    self.updateThemify(theme);
                });
                OctoPrint.coreui.viewmodels.settingsViewModel.settings.plugins.themeify.enabled.subscribe(function(enabled) {
                    self.updateThemify(OctoPrint.coreui.viewmodels.settingsViewModel.settings.plugins.themeify.theme());
                });
            }

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

            // Check these plugins
            var knowPluginIssues = {
                'widescreen' : {
                    'text': 'The plugin OctoPrint-WideScreen collides with the functionality of UI Customizer.\n\nEither disable UI Customizer or OctoPrint-WideScreen plugin for optimal performance.',
                    'action' : function(){
                        if (!$('#settings_dialog:visible').length){
                            $('#navbar_show_settings').trigger('click');
                            $('#settings_plugin_pluginmanager_link a').trigger('click');
                        }
                    }
                },
                /*
                'consolidate_temp_control': {
                    'text': 'Running the plugins Consolidate Temp Control and UI Customizer together can cause problems.\n\nThe UI Customizer plugin has tried to fix these problems but there might be layout issues.',
                    'action' : null
                },*/
            }

            // Notify options main options
            var options = {
                title: "Plugin compatibility issue",
                text: "",
                type: "notice",
                hide: false,
                confirm: {
                    confirm: true,
                    buttons: [
                        {
                            text: gettext("Cancel"),
                            click: function (notice) {
                                notice.remove();
                                notice.get().trigger("pnotify.cancel", notice);
                            }
                        }
                    ]
                },
                buttons: {sticker: false,closer: false}
            };

            // Check for any issues with installed plugins
            $.each(knowPluginIssues,function(key,val){
                if (typeof OctoPrint.coreui.viewmodels.settingsViewModel.settings.plugins[key] !== "undefined"){
                    self.logToConsole("Plugin issues detected: " + key);
                    if (val.action != null){
                        var optionsCust = $.extend(true,{},options);
                        optionsCust.text = val.text;
                        optionsCust.confirm.buttons.unshift({
                            text: gettext("Open"),
                            click: function (notice) {
                                val.action();
                                notice.close();
                            }
                        });
                        new PNotify(optionsCust);
                    }else{
                        new PNotify({
                          title: options.title,
                          text: val.text,
                          hide: false
                        });
                    }
                }
            });

             // Fix height problem on first run
            $('div.UICMainMenu a.dropdown-toggle').one('click.UICMainMenu',function(){
                $('div.UICMainMenu').css({'height':'auto'});
            });

            // Refresh all
            window.setTimeout(function() {
                $(window).trigger('resize');
            },500);

            // Final check to make sure CSS is not broken by other plugins etc.
            if($('link.UICBSResp').length || $('link.UICThemeCSS').length){
                window.setTimeout(function() {
                    // Make sure responsive and themes are last
                    var allCSS = $('link[rel="stylesheet"]');
                    if ((allCSS.length-1) > allCSS.index($('link.UICBSResp')) || (allCSS.length-2) > allCSS.index($('link.UICThemeCSS'))){
                        $('link.UICThemeCSS').appendTo('body');
                        $('link.UICBSResp').appendTo('body');
                    };
                },1000);
            }

        }


        // ------------------------------------------------------------------------------------------------------------------------
        // Update the entire layout
        self.UpdateLayout= function(settingsPlugin){

            self.logToConsole('Updating UI/layout');
            // Remove widths if any
            $('div.UICmainTabs').removeClass('span8');
            $('#sidebar').removeClass('span4');

            // Fixed header
            self.set_fixedHeader(settingsPlugin.fixedHeader());

            // Fixed footer
            self.set_fixedFooter(settingsPlugin.fixedFooter());

            // remove graph background
            self.set_hideGraphBackground(settingsPlugin.hideGraphBackground());

            // Make it fluid
            self.set_fluidLayout(settingsPlugin.fluidLayout());

            // Set theme on startup
            self.set_theme(settingsPlugin.theme(),false);

            // Run in responsive mode
            self.set_responsiveMode(settingsPlugin.responsiveMode());

            // Center the icons
            self.set_centerTopIcons(settingsPlugin.centerTopIcons());

            // Fix temp bar plugin
            self.set_navbarplugintempfix(settingsPlugin.navbarplugintempfix());

            // Compact menus
            self.set_compactMenu(settingsPlugin.compactMenu());

            // BUild the main layout
            self.set_mainLayout(settingsPlugin);

            // Customize tabs
            self.set_mainTabsCustomize(settingsPlugin.mainTabsCustomize(),settingsPlugin.mainTabs());

            // Sort top icons
            self.set_sortTopIcons(settingsPlugin.topIconSort());

            // Hide main cams
            self.set_hideMainCam(self.settings.settings.plugins.uicustomizer.hideMainCam());

            // add webcam zoom option
            self.set_addWebCamZoom(settingsPlugin.addWebCamZoom());

            // Full widh Gcode
            self.set_gcodeFullWidth(settingsPlugin.gcodeFullWidth());

            // Full height files
            self.set_filesFullHeight(settingsPlugin.filesFullHeight());

            // Compress the temperature controls
            self.set_compressTempControls(settingsPlugin.compressTempControls());

            self.set_customCSS(settingsPlugin.customCSS());

        }

        // ------------------------------------------------------------------------------------------------------------------------
        self.set_theme = function(themeName,preview){
            // if empty we try the others - else we cleanup from everything else
            if (themeName == "default" || themeName == null){
                $('html').removeClass('UICCustomTheme');
                if (self.updateThemify(null) == false){
                    self.updateStandardTheme(OctoPrint.coreui.viewmodels.settingsViewModel.settings.appearance.color());
                };
            }else{
                $('html').addClass('UICDefaultTheme UICCustomTheme');
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

                var themeURL = self.ThemesBaseURL+"/css/"+themeName+'.css?theme='+themeName;

                // Preview or for real?
                if (!preview){
                    // Store it for easier loading
                    self.setStorage('theme',themeName);
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
            if (self.settings.settings.plugins.uicustomizer.theme() != null && self.settings.settings.plugins.uicustomizer.theme() != "default"){
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
            if (self.settings.settings.plugins.uicustomizer.theme() != null && self.settings.settings.plugins.uicustomizer.theme() != "default"){
                $('#UICCustThemeify').remove();
                return;
            }
            if (!OctoPrint.coreui.viewmodels.settingsViewModel.settings.plugins.hasOwnProperty('themeify') || OctoPrint.coreui.viewmodels.settingsViewModel.settings.plugins.themeify.enabled() == false){
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
                curTheme = OctoPrint.coreui.viewmodels.settingsViewModel.settings.plugins.themeify.theme();
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
        self.set_mainLayout = function(settingsPlugin){
            // Fix layout and width - using magic
            var TempCols = [...settingsPlugin.rows()];

            // Check for empty object
            if($.isEmptyObject(TempCols[0])){
                new PNotify({title:"UI Customizer failure", type: "error","text":"Failed to load proper settings for layout.\nSorry :(","hide":false});
                console.log(TempCols);
                return true;
            }
            var widths = settingsPlugin.widths();

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
                    $('div.UICCol'+keyRevFix).addClass('UICColDELETEME');
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

            // Remove marked for delition
            $('div.UICColDELETEME').remove();
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
            if (enable){
                $('#canvas_container').addClass('UICMaxi');
            }else{
                $('#canvas_container').removeClass('UICMaxi');
            }
        }

        self.set_filesFullHeight = function(enable){
             if (enable){
                $('#files .gcode_files .scroll-wrapper').addClass('UICFullHeight');
            }else{
                $('#files .gcode_files .scroll-wrapper').removeClass('UICFullHeight');
            }
        }

        self.set_compressTempControls= function(enable){
            if (enable){
                $('#temp').addClass('UICTempTableSmall');
            }else{
                $('#temp').removeClass('UICTempTableSmall');
            }
        }

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

        // ------------------------------------------------------------------------------------------------------------------------
        self.set_addWebCamZoom = function(enable){
            var streamURL = self.settings.webcam_streamUrl();
            if (!enable || (self.settings.webcam_webcamEnabled() == false || streamURL == "")){
                $('div.UICWebCamClick').remove();
                return true;
            }

            // drag handler - http://jsfiddle.net/robertc/kKuqH/
            var dragstart = function (event) {
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

            // HLS handling
            var hlsCam = false;
            var containers = ['#webcam_container','#IUCWebcamContainer > div'];
            if (/.m3u8/i.test(streamURL)){
                hlsCam = true;
                containers = ['#webcam_hls_container','#IUCWebcamContainer > div'];
                // fix position of hls
                $('#webcam_hls_container').css('position','relative');
                $('#webcam_container img').attr('src','data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
                $('#webcam_container').hide();
            }else{
                $('#webcam_hls_container video').attr('src','');
                $('#webcam_hls_container').hide();
            }

            // Remove all zoom classes
            $('.UIWebcamZoomSrc').removeClass('UIWebcamZoomSrc');

            // Append containers to all webcams
            $('div.UICWebCamClick').not('#UICWebCamFull > div.UICWebCamClick').remove();
            $.each(containers,function(i,idx){
                var obj = $(idx);

                // Skip hidden
                if (obj.hasClass('UICHideHard')){
                    return true;
                }

                obj.addClass('UIWebcamZoomSrc');
                var zoomclick = $('<div class="UICWebCamClick"><a href="javascript:void(0);"><i class="fas fa-expand"></i></a></div>');
                obj.prepend(zoomclick);
                if (!self.previewOn){
                    zoomclick.hide();
                }
                // Double click
                obj.off('dblclick').on('dblclick',function(){
                    zoomclick.trigger('click.UICWebCamClick');
                });
                zoomclick.off('click.UICWebCamClick').on('click.UICWebCamClick',function(){
                    var streamURL = self.settings.webcam_streamUrl();
                    var hlsCam = false;
                    if (/.m3u8/i.test(streamURL)){
                        hlsCam = true;
                    }
                    $('.UIWebcamZoomSrc').hide();
                    // Remove previous if any
                    $('#UICWebCamFull').remove();

                    // Append floating cam to body
                    $('body').append('<div id="UICWebCamFull" draggable="true" class="UICWebcam"><div class="nowebcam text-center"><i class="fas fa-spinner fa-spin"></i> <span class="UIC-pulsate text-info">Loading webcam&hellip;</span></div><div id="UICWebCamShrink" class="UICWebCamClick"><a href="javascript: void(0);"><i class="fas fa-compress"></i></a></div><div class="UICWebCamTarget"></div></div>');
                    $('#UICWebCamShrink').hide();

                    // Set top offset
                    if ($(window).scrollTop() > 0){
                        $('#UICWebCamFull').css('top',$(window).scrollTop()+$('#UICWebCamFull').height());
                    }

                    // Set source item
                    if (hlsCam){
                        // Fix and setup video
                        $('#UICWebCamFull div.UICWebCamTarget').replaceWith('<video muted="" autoplay=""></video>');
                        $('#UICWebCamFull video').off('playing.UICCam').on('playing.UICCam',function(event){
                            $('#UICWebCamShrink').show();
                            $('#UICWebCamFull div.nowebcam').remove();
                        });
                        // Add hls player
                        var video = $('#UICWebCamFull video')[0];
                        self.startHLSstream(video,streamURL);

                        // Tired of waiting
                        window.setTimeout(function(){
                            $('#UICWebCamShrink').show();
                            $('#UICWebCamFull div.nowebcam').remove();
                        },5000);

                    }else{
                        var rotated = $('#webcam_rotator').hasClass('webcam_rotated');
                        var imgsrc = obj.find('img')[0];
                        if (rotated){
                            var nHeight = imgsrc.naturalWidth;
                            var nWidth = imgsrc.naturalHeight;
                        }else{
                            var nWidth = imgsrc.naturalWidth;
                            var nHeight = imgsrc.naturalHeight;
                        }
                        var aspect = nWidth/nHeight;
                        // Resize a bit
                        nWidth -= 100;
                        nHeight = nWidth/aspect;
                        // Inside window or not?
                        var fixed = false;
                        var wWidth = $(window).width();
                        var wHeight = $(window).height();
                        // Cam wider than screen - then fit to screen width
                        if (nWidth > wWidth){
                            fixed = true;
                            nWidth = (wWidth - 120);
                            nHeight = nWidth/aspect;
                        }
                        if (nHeight > wHeight){
                            fixed = true;
                            nHeight = (wHeight - 120);
                            nWidth = nHeight*aspect;
                        }

                        var clone = $('#webcam_rotator').clone();
                        clone.find('>div:not(:first-child)').remove();
                        clone.attr('id','UICWebCamFullInnerDIV');
                        clone.find('*').removeAttr('id').removeAttr('data-bind');
                        clone.find('img').off('load');
                        clone.find('img').attr('src','data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
                        $('#UICWebCamFull img').off('load');
                        $('#UICWebCamFull div.UICWebCamTarget').html(clone.html());
                        if (rotated){
                            $('#UICWebCamFull div.UICWebCamTarget').addClass('webcam_rotated');
                            $('#UICWebCamFull').css('max-height','initial');
                            $('#UICWebCamFull').css('max-width','initial');
                        }

                        // Tired of waiting
                        var timeoutLoad = window.setTimeout(function(){
                            $('#UICWebCamFull img').trigger('load',[true]);
                        },5000);

                        // Fix sizing
                        $('#UICWebCamFull img').css({'width':nWidth});
                        $('#UICWebCamFull img').css({'height':nHeight});

                        // Set max if needed
                        if (!fixed){
                            $('#UICWebCamFull img').css({'max-width':$(window).width()-120});
                            $('#UICWebCamFull img').css({'max-height':$(window).height()-120});
                        }
                        // Load it
                        $('#UICWebCamFull img').off('load').on('load',function(event,forced){
                            if (streamURL != $(this).attr('src')){
                                if (forced){
                                    $(this).attr('src',streamURL);
                                }else{
                                    return false;
                                }
                                return false;
                            }else{
                                $('#UICWebCamFull img').off('load');
                            }
                            if (timeoutLoad != null){
                                window.clearTimeout(timeoutLoad);
                                timeoutLoad = null;
                            };
                            $('#UICWebCamShrink').show();
                            $('#UICWebCamFull img').show();
                            $('#UICWebCamFull div.nowebcam').remove();
                            // Set the size i running a fixed size
                            if (fixed){
                                $('#UICWebCamFull').css({'width':nWidth+10});
                            }
                            $('#UICWebCamFull img').css({'width':''});
                            $('#UICWebCamFull img').css({'height':''});
                        });
                        $('#UICWebCamFull img').attr('src',streamURL);
                    }

                    // Fix on resize done
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
                    var dm = document.getElementById('UICWebCamFull');
                    $('#UICWebCamFull').on('dragstart.UICCam',dragstart);
                    $('body').on('dragover.UICCam',drag_over);
                    $('body').on('drop.UICCam',drop);

                    // Close again
                    $('#UICWebCamShrink').one('click',function(){
                        $('#UICWebCamFull').off('dragstart.UICCam');
                        $('body').off('dragover.UICCam');
                        $('body').off('drop.UICCam');
                        $('#drop_overlay').removeClass('UICHideHard in');
                        $('.UIWebcamZoomSrc').show();
                        $('#UICWebCamFull').remove();
                    });

                    // Todo: add styling for fullscreen and add overlays with print info and gcode preview etc. https://www.w3schools.com/howto/howto_js_fullscreen.asp
                    // self.openFullscreen(document.getElementById('UICWebCamFull'));
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
        }

        /* Close fullscreen */
        self.closeFullscreen = function(){
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) { /* Safari */
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { /* IE11 */
                document.msExitFullscreen();
            }
        }

        // ------------------------------------------------------------------------------------------------------------------------
        // Hide main cams
        self.set_hideMainCam = function(enable){
            if (enable){
                if ($('#webcam_image').data("isHidden") === true){
                    self.logToConsole("Main cam already hidden");
                    return true;
                }
                if ($('#webcam_hls').length){
                    $('#webcam_hls_container').addClass('UICHideHard');
                    $('#webcam_hls')[0].pause();
                }
                $('#webcam_container').addClass('UICHideHard');
                $('#webcam_container').next().addClass('UICHideHard');
                $('#webcam_image').attr('src','data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
                $('#webcam_image').data("isHidden",true);
            }else{
                if ($('#webcam_image').data("isHidden") === false){
                    self.logToConsole("Main cam is already shown");
                    return true;
                }
                if ($('#webcam_hls').length){
                    $('#webcam_hls_container').removeClass('UICHideHard');
                }
                $('#webcam_container').removeClass('UICHideHard');
                $('#webcam_container').next().removeClass('UICHideHard');
                $('#webcam_image').data("isHidden",false);
            }
        }

        self.CustomW_initGcode = function(enable){
            self.getReturnData = enable;
            if (enable){
                $('#UICGcodeVWidget ul.dropdown-menu a').off('click').on('click',function(event,dontLoad){
                    $('#UICGcodeVWidget  ul.dropdown-menu li.active').removeClass('active');
                    $(this).parent().addClass('active');
                    $('#UICGcodeVWidgetZL').text($(this).text());
                    $('#UICGcodeVWidget').data('zoomlvl',$(this).data('zoomlvl'));
                    // Save the settings
                    OctoPrint.settings.savePluginSettings('uicustomizer',{'gcodeZoom':$(this).data('zoomlvl')})
                });
                if (typeof self.settings.settings.plugins.uicustomizer.gcodeZoom == "undefined" && $('#UICGcodeVWidget ul.dropdown-menu a[data-zoomlvl="'+self.settings.settings.plugins.uicustomizer.gcodeZoom()+'"]').length == 0){
                    $('#UICGcodeVWidget ul.dropdown-menu a:first').trigger('click');
                }else{
                    $('#UICGcodeVWidget ul.dropdown-menu a[data-zoomlvl="'+self.settings.settings.plugins.uicustomizer.gcodeZoom()+'"]').trigger('click')
                }
            }
        }

        // ------------------------------------------------------------------------------------------------------------------------
        self.CustomW_initWebCam = function(enable){
            self.logToConsole('WebCam custom init');

            // Hide main cams
            self.set_hideMainCam(self.settings.settings.plugins.uicustomizer.hideMainCam());

            // Disable it all
            if (!enable){
                 // Remove subscribe
                 if ($('body').data("webcamSubscribed") != undefined){
                    $('body').data("webcamSubscribed").dispose();
                    $('body').removeData("webcamSubscribed");
                 }
                 OctoPrint.coreui.viewmodels.controlViewModel.onWebcamLoaded = self.onWebCamOrg;
                 OctoPrint.coreui.viewmodels.controlViewModel.onWebcamErrored = self.onWebCamErrorOrg;
                 $('#UICWebCamWidget').remove();
                 return true;
            }

            // Cleanup
            $('#IUCWebcamContainer > div').html('');
            var hlsCam = false;
            var streamURL = self.settings.webcam_streamUrl();

            // Not configured - then do nothing
            if (self.settings.webcam_webcamEnabled() == false || streamURL == ""){
                $('#IUCWebcamContainer > div').append('<div class="nowebcam text-center"><i class="fas fa-question"></i> <span>Webcam not configured&hellip;</span></div>');
                self.CustomW_initWebCam(false);
                return true;
            }

            // Check for multicam
            if (OctoPrint.coreui.viewmodels.settingsViewModel.settings.plugins.hasOwnProperty('multicam') && OctoPrint.coreui.viewmodels.settingsViewModel.settings.plugins.multicam.multicam_profiles().length > 1 && !$('.UICMultiCamSelector').length ){
                var multicamSelector = $('<div class="btn-group UICMultiCamSelector UICWidgetSelector"><a class="btn btn-small dropdown-toggle" data-toggle="dropdown" href="#"><span id="UICMultiCamLbl">Cam</span><span class="caret"></span></a><ul class="dropdown-menu"></ul></div>');
                var ulCamSel = multicamSelector.find('ul');
                $.each(OctoPrint.coreui.viewmodels.settingsViewModel.settings.plugins.multicam.multicam_profiles(),function(idx,item){
                    // Set the label
                    var className = '';
                    if (idx == 0){
                        multicamSelector.find('span:first').text(item.name());
                        className = ' class="active" ';
                    }
                    // Build the selector
                    ulCamSel.append($('<li'+className+' data-streamURL="'+item.URL()+'"><a href="#">'+item.name()+'</a></li>').on('click','a',function(event,dontLoad){
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

            // BROKEN due to loading/changes not triggering at the right time: || (typeof OctoPrint.coreui.viewmodels.controlViewModel.webcamHlsEnabled == "function" && OctoPrint.coreui.viewmodels.controlViewModel.webcamHlsEnabled()
            if (/.m3u8/i.test(streamURL)){
                self.logToConsole("HLS WebCam detected: " + streamURL);
                hlsCam = true;
            }

            // Fix changes - this fixes also multicam etc.
            if ($('body').data("webcamSubscribed") == undefined){
                var subs = OctoPrint.coreui.viewmodels.settingsViewModel.webcam_streamUrl.subscribe(function(streamURL) {
                    if ($('#settings_dialog:visible').length){
                        self.logToConsole("Webcam url changed inside settings - skipping!");
                        return true;
                    }

                    // Update dropdown for multicam
                    if ($('.UICMultiCamSelector').length){
                        $('.UICMultiCamSelector li.active').removeClass('active');
                        $('.UICMultiCamSelector li[data-streamurl="'+streamURL+'"]:first a').trigger('click',[true]);
                    }

                    // Change URL
                    self.logToConsole("Webcam URL changed to: "+streamURL);
                    if (/.m3u8/i.test(streamURL)){
                        // We are switching to HLS or not?
                        if (!$('#IUCWebcamContainer video').length){
                            self.logToConsole("Webcam is switching from IMG to HLS format");
                            self.CustomW_initWebCam(enable);
                            return true;
                        }
                        if ($('#IUCWebcamContainer video').data('streamURL').indexOf(streamURL) != 0){
                            self.logToConsole("Webcam HLS stream triggered - Starting: " + streamURL);
                            $('#IUCWebcamContainer video').data('streamURL',streamURL);
                            $('#IUCWebcamContainer video').data('playing',true);
                            // Start HLS player - a seperate stream is better - tried canvas copy etc.
                            var video = $('#IUCWebcamContainer video')[0];
                            self.startHLSstream(video,streamURL);
                        }else{
                            self.logToConsole("Webcam HLS stream triggered same URL: " + streamURL + "/"+$('#IUCWebcamContainer video').data('streamURL'));
                        }
                    }else{
                        var imgsrc = $('#IUCWebcamContainerInner img');
                        // We are switching to HLS or not?
                        if (!imgsrc.length){
                            self.logToConsole("Webcam is switching from HLS to IMG format");
                            self.CustomW_initWebCam(enable);
                            return true;
                        }
                        if (imgsrc.attr('src').indexOf(streamURL) != 0){
                            self.logToConsole("Webcam IMG stream triggered - Starting: " + streamURL);
                            webcamLoader(streamURL);
                            imgsrc.attr('src',streamURL);
                        }else{
                            self.logToConsole("Webcam IMG stream triggered same URL: " +streamURL + "/"+imgsrc.attr('src'));
                        }
                    }
                });
                $('body').data("webcamSubscribed",subs);
            }


            // Webcam loader
            var webcamLoader = function(targetStreamURL){
                self.logToConsole("webcamLoader init");
                $('#IUCWebcamContainerInner img').off('error').on('error',function(){
                    // Error loading
                    $('#webcam_image').data("isLoaded",false);
                    $('#IUCWebcamContainerInner').hide();
                    $('.UICWebCamClick').hide();
                    $('#IUCWebcamContainer div.nowebcam').remove();
                    $('#IUCWebcamContainer > div').append($('<div class="nowebcam text-center"><i class="fas fa-exclamation"></i> Error loading webcam</div>').off('click.UICWebCamErrror').on('click.UICWebCamErrror',function(){
                        $('#control_link a').trigger('click');
                    }));
                }).off('load').on('load',function(){
                    // Loaded okay
                    if ($(this).attr('src').indexOf(targetStreamURL) == 0){
                        self.logToConsole("IUCWebcamContainerInner img loaded ok");
                        // Turn off load due to it being a webcam stream firring multiple times
                        $(this).off('load');
                        // Loaded
                        $('.UICWebCamClick').show();
                        $('#IUCWebcamContainerInner').show();
                        $('#IUCWebcamContainerInner img').show();
                        $('#IUCWebcamContainer div.nowebcam').hide();
                    }
                });
            };

            // Visibilty handler custom
            // https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
            var hidden, visibilityChange;
            if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
                hidden = "hidden";
                visibilityChange = "visibilitychange";
            } else if (typeof document.msHidden !== "undefined") {
                hidden = "msHidden";
                visibilityChange = "msvisibilitychange";
            } else if (typeof document.webkitHidden !== "undefined") {
                hidden = "webkitHidden";
                visibilityChange = "webkitvisibilitychange";
            }

            // Event handler for visibility
            var eventVIS = function(){
                // If not shown then dont do
                if (!$('#UICWebCamWidget').length){
                    self.logToConsole("WebCam widget not active");
                    return true;
                }
                var hlsCam = false;
                var streamURL = self.settings.webcam_streamUrl();
                if (/.m3u8/i.test(streamURL)){
                    hlsCam = true;
                }
                // What to do
                if (document[hidden]) {
                    self.logToConsole("Visibility changed to hidden");
                    $('#IUCWebcamContainer').data('pausedByVis',true);
                    if (hlsCam){
                        $('#IUCWebcamContainer video')[0].pause();
                    }else{
                        // Hide the cam widget
                        $('#IUCWebcamContainer').hide();
                        $('#IUCWebcamContainerInner img').attr('src','data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
                    }
                }else{
                    self.logToConsole("Visibility changed to visible");
                    $('#IUCWebcamContainer').data('pausedByVis',false);
                    if (hlsCam){
                        $('#IUCWebcamContainer video')[0].play();
                    }else{
                        // Reload the webcam
                        $('.UICWebCamClick').hide();
                        $('#IUCWebcamContainer div.nowebcam').remove();
                        $('#IUCWebcamContainer > div').append('<div class="nowebcam text-center"><i class="fas fa-spinner fa-spin"></i> <span class="UIC-pulsate text-info">Loading webcam&hellip;</span></div>');
                        $('#IUCWebcamContainerInner').hide();
                        $('#IUCWebcamContainer').show();
                        // Reinit the loader
                        webcamLoader(streamURL);
                        $('#IUCWebcamContainerInner img').attr('src',streamURL);
                    }
                }
            }

            // Do we have the visibility handler?
            if (typeof document.addEventListener === "undefined" || hidden === undefined) {
                self.logToConsole("NO event handler for visibility :( ");
            } else if($(document).data('IUCEventVis') != true){
                // Handle page visibility change
                $(document).data('IUCEventVis',true);
                document.addEventListener(visibilityChange, eventVIS, false);
            }

            // Set loading
            $('.UICWebCamClick').hide();
            $('#IUCWebcamContainer > div').append('<div class="nowebcam text-center"><i class="fas fa-spinner fa-spin"></i> <span class="UIC-pulsate text-info">Loading webcam&hellip;</span></div>');

            // HLS cam handling is a bit easier than normal stuff
            if(hlsCam){
                // reset
                OctoPrint.coreui.viewmodels.controlViewModel.onWebcamLoaded = self.onWebCamOrg;
                // Clone it
                var clone = $('#webcam_hls').clone();
                clone.removeAttr('id').removeAttr('data-bind');
                $('#IUCWebcamContainer > div').html(clone).find('*').removeAttr('id').removeAttr('data-bind');

                // Event handling on the main player
                $('#IUCWebcamContainer video').off('error').on('error',function(event){
                    self.logToConsole("webcam_hls HLS error");
                    $('#IUCWebcamContainer video').data('playing',false);

                    // Error loading sign and show info
                    $('#IUCWebcamContainer video').hide();
                    $('.UICWebCamClick').hide();
                    $('#IUCWebcamContainer div.nowebcam').remove();
                    $('#IUCWebcamContainer > div').append($('<div class="nowebcam text-center"><i class="fas fa-exclamation"></i> Error loading webcam</div>').off('click.UICWebCamErrror').on('click.UICWebCamErrror',function(){
                        $('#control_link a').trigger('click');
                    }));

                }).off('playing').on('playing',function(event){
                    // Clean up and show the player again
                    $('#IUCWebcamContainer div.nowebcam').remove();
                    $('#IUCWebcamContainer video').show();
                    $('.UICWebCamClick').show();

                    // Foobar trigger - then just skip if nothing new
                    if (!$('#IUCWebcamContainer div.nowebcam').length && self.settings.webcam_streamUrl() == $('#IUCWebcamContainer video').data('streamURL') && $('#IUCWebcamContainer video').data('playing') === true){
                        self.logToConsole("Webcam HLS playing not updated!");
                        return false;
                    }
                    self.logToConsole("Webcam HLS playing");

                    // Play HLS and store URL + state
                    var streamURL = self.settings.webcam_streamUrl();
                    $('#IUCWebcamContainer video').data('streamURL',streamURL);
                    $('#IUCWebcamContainer video').data('playing',true);

                    // Start HLS player - a seperate stream is better - tried canvas copy etc.
                    var video = $('#IUCWebcamContainer video')[0];
                    self.startHLSstream(video,streamURL);
                });

                // Error handling on webcam handler
                OctoPrint.coreui.viewmodels.controlViewModel.onWebcamErrored = (function(old) {
                    function extendCam(){
                        self.onWebCamErrorOrg();
                        self.logToConsole("Webcam HLS onWebcamErrored triggered");
                        if ($('#IUCWebcamContainer video')[0].paused && $('#IUCWebcamContainer').data('pausedByVis') !== true){
                            // Error loading sign and show info
                            $('#IUCWebcamContainer video').hide();
                            $('#IUCWebcamContainer div.nowebcam').remove();
                            $('#IUCWebcamContainer > div').append($('<div class="nowebcam text-center"><i class="fas fa-exclamation"></i> Error loading webcam</div>').off('click.UICWebCamErrror').on('click.UICWebCamErrror',function(){
                                $('#control_link a').trigger('click');
                            }));
                        }else{
                            $('#IUCWebcamContainer video').show();
                            $('#IUCWebcamContainer div.nowebcam').remove();
                        }
                    }
                    return extendCam;
                })();

            }else{
                $('#webcam_hls_container').hide();
                // Pause if present
                if ($('#webcam_hls video').length){
                    $('#webcam_hls video')[0].pause();
                }
                $('#UICWebCamWidget').addClass('UICWebcam');

                // Remove old just in case
                OctoPrint.coreui.viewmodels.controlViewModel.onWebcamErrored = self.onWebCamErrorOrg;

                // Normal webcam stream
                self.logToConsole("WebCam NON-hls starting");

                // Clone and cleanup
                var clone = $('#webcam_rotator').clone();
                clone.find('>div:not(:first-child)').remove();
                // Avoid any children added
                clone.find('>div:not(:first-child)').remove();
                $('#IUCWebcamContainer > div').append(clone).find('*').removeAttr('id').removeAttr('data-bind');
                clone.attr('id',"IUCWebcamContainerInner").hide();

                // init the handler
                webcamLoader(streamURL);

                // Event handlers
                OctoPrint.coreui.viewmodels.controlViewModel.onWebcamLoaded = (function(old) {
                    function extendWebCam() {
                        self.onWebCamOrg();
                        if ($('#IUCWebcamContainer:visible').length && $('#webcam_image').data("isHidden") !== true){
                            if (OctoPrint.coreui.viewmodels.controlViewModel.webcamLoaded() && $('#webcam_image').data("isLoaded")){
                                self.logToConsole("extendWebCam skipped");
                                return true;
                            }
                            self.logToConsole("extendWebCam called");
                            // Remove the no webcam container
                            $('#IUCWebcamContainer div.nowebcam').remove();
                            $('.UICWebCamClick').show();
                            $('#IUCWebcamContainerInner img').show();
                            var clone = $('#webcam_rotator').clone();
                            clone.find('>div:not(:first-child)').remove();
                            // Compare content of the containers
                            if ($('#IUCWebcamContainerInner').clone().wrap('<p/>').parent().find('*').removeAttr('id').removeAttr('src').html().replace(' style=""' ,'').trim() != clone.wrap('<p/>').parent().find('*').removeAttr('id').removeAttr('data-bind').removeAttr('src').html().replace(' style=""','').trim()){
                                self.logToConsole("WebCam updated TOTAL");
                                $('#IUCWebcamContainerInner').remove();
                                $('#IUCWebcamContainer > div').append(clone).find('*').removeAttr('id');
                                clone.attr('id',"IUCWebcamContainerInner");
                                // Setup error handling again
                                webcamLoader(streamURL);

                                // Fix the fullscreen overlay if present
                                if ($('#UICWebCamFullInnerDIV').length){
                                    clone.attr('id','UICWebCamFullInnerDIV');
                                    $('#UICWebCamFullInnerDIV').html(clone).find('*').removeAttr('id');
                                    $('#UICWebCamFull img').off('load').on('load',function(){
                                        $('#UICWebCamFull div.nowebcam').remove();
                                    });
                                    $('#UICWebCamFull img').attr('src',streamURL);
                                }

                            }

                            // Check if the url is right - on first load this sometimes breaks on fast webcam streams: https://github.com/LazeMSS/OctoPrint-UICustomizer/issues/82
                            if($('#IUCWebcamContainerInner img').attr('src') != streamURL){
                                self.logToConsole("WebCam updated SRC");
                                $('#IUCWebcamContainerInner img').attr('src',streamURL);
                            }

                            // Make sure its shown
                            $('#IUCWebcamContainer > div >div').show();
                            $('#webcam_image').data("isLoaded",true);
                        }
                    }
                    return extendWebCam;
                })();

                // Set url if not found or not the same
                if ($('#IUCWebcamContainerInner img').attr('src') == undefined || $('#IUCWebcamContainerInner img').attr('src').indexOf(streamURL) == -1){
                    if (streamURL[streamURL.length-1] == "?"){
                        streamURL += "&"
                    }else{
                        streamURL += "?"
                    }
                    streamURL += new Date().getTime();
                    self.logToConsole("Setting webcam url:"+ streamURL);
                    $('#IUCWebcamContainerInner img').attr('src',streamURL);
                    // Fix the fullscreen overlay if present
                    if ($('#UICWebCamFull img').length){
                        $('#UICWebCamFull img').attr('src',streamURL);
                    }
                }

                // Fix the fullscreen overlay if present
                if ($('#UICWebCamFullInnerDIV').length){
                    var clone = $('#webcam_rotator').clone();
                    clone.find('>div:not(:first-child)').remove();
                    clone.attr('id','UICWebCamFullInnerDIV');
                    $('#UICWebCamFullInnerDIV').html(clone).find('*').removeAttr('id').removeAttr('data-bind');
                    $('#UICWebCamFull img').off('load').on('load',function(){
                        $('#UICWebCamFull div.nowebcam').remove();
                    });
                    $('#UICWebCamFull img').attr('src',streamURL);
                }
            }

            // Hack the webcam start flow
            var prevVal = OctoPrint.coreui.browserTabVisible;
            OctoPrint.coreui.browserTabVisible = true;
            var prevVal2 = OctoPrint.coreui.selectedTab;
            OctoPrint.coreui.selectedTab = '#control'
            // Trigger change
            OctoPrint.coreui.onTabChange('#control');
            // Restore
            OctoPrint.coreui.browserTabVisible = prevVal;
            OctoPrint.coreui.selectedTab = prevVal2;

            // Start the HLS cam just to make sure
            if (hlsCam){
                // Play HLS and store URL + state
                var streamURL = self.settings.webcam_streamUrl();
                $('#IUCWebcamContainer video').data('streamURL',streamURL);
                $('#IUCWebcamContainer').data('pausedByVis',true);
                $('#IUCWebcamContainer video').data('playing',true);

                // Start HLS player - a seperate stream is better - tried canvas copy etc.
                var video = $('#IUCWebcamContainer video')[0];
                self.startHLSstream(video,streamURL);
            }

            // Fix zoom overlay
            self.set_addWebCamZoom(self.settings.settings.plugins.uicustomizer.addWebCamZoom());
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
                var curactive = null;
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
                            curactive = $(this);
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
                    var settingsMenuTxt = $(this).closest('li.dropdown').find('a:first').text() + '&nbsp;<i class="fas fa-chevron-right"></i>&nbsp;'+$(this).text();
                    $('#UICsetMenuShow').html(settingsMenuTxt);
                    $('#UICSettingsHeader').html(settingsMenuTxt);
                });

                // Click the active menu to make it all look goode
                if (curactive != null){
                    curactive.find('a:first').trigger('click');
                }

                // Fix floating errors
                $('#UICFullSettingsBox div.control-group:not(.row-fluid)').addClass('row-fluid UICRemoveFluidRow');

                $('#settings_dialog_content').addClass('span12').removeClass('span9');

                // Fix buttons footer
                $('#settings_dialog > div.modal-footer button:has(i)').not('.btn-primary').each(function(){$(this).contents().eq(1).wrap('<span class="hidden-phone"/>')});

                // Build settings hack --------------------------------------------------------- END

                // Fix modals on show
                $('body').on('shown.bs.modal.UICHandler','#settings_dialog', function(event) {
                    if ($('body').hasClass('UICResponsiveMode') && $('#settings_dialog_menu:visible').length ){
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
                        $(this).append('<span class="UICHideDesktop">'+title+'</span>');
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
            // Remove it not request and not running responsive
            if ((!enabled && !$('body').hasClass('UICResponsiveMode')) && $('ul.UICHeaderIcons').length){
                $('div.UICMainMenu > ul.nav').prepend($('ul.UICHeaderIcons > li'));
                $('ul.UICHeaderIcons').remove();
                return true;
            }
            // Build header icons always to fix responsive or on request
            if ((enabled || $('body').hasClass('UICResponsiveMode')) && !$('ul.UICHeaderIcons').length){
                // Move header icons out of menu
                $('div.UICMainMenu').after($('<ul class="UICHeaderIcons nav"></ul>').append($('div.UICMainMenu ul.nav > li[id^="navbar_plugin"]:not(.UICExcludeFromTopIcons)')));
            }
            if (enabled){
                $('ul.UICHeaderIcons').addClass('CenterMe');
            }else{
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
            if (!$('#navbar_plugin_navbartemp').length){
                return true;
            }
            if (enabled){
                OctoPrint.coreui.viewmodels.settingsViewModel.settings.plugins.navbartemp.useShortNames(true);
                OctoPrint.coreui.viewmodels.settingsViewModel.settings.plugins.navbartemp.makeMoreRoom(true);
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
        // Improve the HLS playback method
        self.startHLSstream = function(element,streamURL){
            if (element.canPlayType('application/vnd.apple.mpegurl')) {
                self.logToConsole("HLS Playing APPLE style : " + streamURL);
                element.src = streamURL;
            }else if (Hls.isSupported()) {
                self.logToConsole("HLS Playing oldschool style : " + streamURL);
                var hls = new Hls();
                hls.loadSource(streamURL);
                hls.attachMedia(element);
                // Play
                hls.on(Hls.Events.MANIFEST_PARSED, function() {
                    element.play();
                });
            }else{
                self.logToConsole("HLS NOT playing ANY style :  " + streamURL);
            }
        }

        // ------------------------------------------------------------------------------------------------------------------------
        // Build columns layout and width
        self.buildColumns = function(prefix){
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

            var widths = $('#UICSortCols input.uiccolwidth').map(function(){return $(this).val();}).get();
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
            $('#tabs li:not(.tabdrop) a').each(function(pos,val){
                if ($(this).data('orgPos') == undefined){
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
                $(newtabcontent).prepend($('<i class="UICPadRight hidden-tablet '+data[3]+'"></i>').css(colorclass));
            }else if (data[4] === false && data[3] != ''){
                $(newtabcontent).append($('<i class="UICPadLeft hidden-tablet '+data[3]+'"></i>').css(colorclass));
            }else if (data[4] == "iconOnly" && data[3] != ''){
                $(newtabcontent).append($('<i class="'+data[3]+'"></i>').css(colorclass));
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
            // Cleanup
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
                    error: function (request, status, error) {
                         $.ajax({
                            url: self.ThemesInternalURL+'../themes.json',
                            success: function(response){
                                self.loadSettingsThemes(response,self.ThemesInternalURL);
                            },
                            error: function (request, status, error) {
                                alert("FAILED TO LOAD THEMES!");
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
                <p><a href="[org]" class="UICMargLeft pull-right btn-mini btn" target="_blank">Source</a><button class="btn-mini btn btn-primary UICsetTheme pull-right">Select</button>\
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
                theme = self.settings.settings.plugins.uicustomizer.theme();
            }
            // Do we have the requested theme - if not then use default
            if (!$('#settings_uicustomizer_themesContent li[data-uictheme="'+theme+'"]').length){
                theme = "default";
            }
            $('#settings_uicustomizer_themesContent li').removeClass('UICThemeSelected');
            $('#settings_uicustomizer_themesContent li[data-uictheme="'+theme+'"]').addClass('UICThemeSelected');
        }

        // ------------------------------------------------------------------------------------------------------------------------
        // Settings handler
        self.onSettingsShown = function() {
            self.saved = false;
            self.previewHasBeenOn = false;
            var settingsPlugin = self.settings.settings.plugins.uicustomizer;

            // Load themes
            if (!self.ThemesLoaded){
                $('#settings_plugin_uicustomizer a[href="#settings_uicustomizer_themes"]').one('click',function(){
                    if (self.getStorage("getThemesApproved") == 1){
                        // Dont load again
                        self.ThemesLoaded = true;
                        self.loadSettingsThemes(null);
                        return;
                    }
                    // Show warning
                    $('#settings_uicustomizer_themesContent').html('<div class="alert alert-info">\
                    <strong>Information regarding themes</strong>\
                    <p>In order to download new and updated themes UI Customizer will download the themes, using a secure connection, from <a href="'+self.ThemesExternalURL+'" target="_blank">'+self.ThemesExternalURL+'</a>.</p><p>No personal data is sent to this URL. The only data being sent is your public IP address due to the nature of the internet.</p><p>Click "Continue" to downlad themes.</p>\
                    <button class="btn btn-success">Continue</button>\
                    </div>').find('button').one('click',function(){
                        self.setStorage("getThemesApproved",1);
                        self.ThemesLoaded = true;
                        self.loadSettingsThemes(null);
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
                $(Object.entries(OctoPrint.coreui.viewmodels.settingsViewModel.settings.plugins.uicustomizer)).each(function(x,item){
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
            if (typeof OctoPrint.coreui.viewmodels.settingsViewModel.settings.plugins.navbartemp !== "undefined"){
                $('#settings_uicustomizer_general input[data-settingtype="navbarplugintempfix"]').prop( "disabled", false );
            }else{
                $('#settings_uicustomizer_general input[data-settingtype="navbarplugintempfix"]').prop( "disabled", true );
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
                }
                // Get plugin data
                var pdata = self.findPluginData(key);
                if (pdata == null){
                    var name = key.replace("_", " ").toLowerCase();
                }else{
                    var name = pdata.name.toLowerCase();
                }
                tiCon.append($('<div class="accordion-group" data-tid="'+tid+'"><div class="accordion-heading"><button class="UICDragVHandle btn btn-small" type="button" title="Sort item"><i class="fas fa-arrows-alt-v"></i></button><span class="UICPadLeft UICTopIconLbl">'+name+'</span>'+iconstr+'</div></div>'));
            }

            // Get the data
            var sortList = settingsPlugin.topIconSort();
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
            var tabsData = self.initTabs(settingsPlugin.mainTabs());
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
                    if (typeof OctoPrint.coreui.viewmodels.settingsViewModel.settings.plugins.themeify == "object" && OctoPrint.coreui.viewmodels.settingsViewModel.settings.plugins.themeify.tabs.enableIcons()){
                        $('.UICthemeifyAlert').fadeIn();
                    }else{
                        $('.UICthemeifyAlert').hide();
                    }
                    tabsorter.option("disabled", false);
                    $('#settings_uicustomizer_tabs_look').fadeTo(300,1);
                    $('#settings_uicustomizer_tabs_look :input').prop( "disabled", false );
                    if (self.previewOn){
                        var tabData = self.buildCustomTabsSave();
                        self.set_mainTabsCustomize(true,tabData);
                    }
                }else{
                    $('.UICthemeifyAlert').hide();
                    tabsorter.option("disabled", true);
                    $('#settings_uicustomizer_tabs_look').fadeTo(300,0.5);
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

            /// ---------------------- COLS LAYOUT

            // Cleanup
            $('#UICSortCols ul li').remove();
            $('#UICSortCols ul').addClass('nav-tabs'); // hack due to this: https://github.com/OctoPrint/OctoPrint/blob/3ab84ed7e4c3aaaf71fe0f184b465f25d689f929/src/octoprint/static/js/app/main.js#L737

            // Build the sorter to make it ready
            var colsTemp = settingsPlugin.rows();

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

            // Keep the maxium width
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
                                diff -= (thisVal-1);
                                $(item).val(1).trigger('input');
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

                if (self.previewOn){
                    self.previewHasBeenOn = true;

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

                }else{
                    // Remove preview toggles and restore the views when turning preview off/on
                    if (self.previewHasBeenOn){
                        // Restore theme
                        self.set_theme(settingsPlugin.theme(),false);

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
                    }
                    $('#settingsTabs').off('click.uicusPrev');
                }
            }).find('i').removeClass('fa-check-square').addClass('fa-square');


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
                if (typeof self.settings.settings.plugins.navbartemp !== "undefined" && self.settings.settings.plugins.uicustomizer.navbarplugintempfix()){
                    self.settings.settings.plugins.navbartemp.useShortNames(true);
                }

                // Get the data
                self.saved = true;
                var colData = self.buildColumns(true);
                if (colData[0]().length == 0 || $.isEmptyObject(colData[0]()[0])){
                    console.log(colData);
                    alert("Critical failure saving UI Customizer settings - not saved!\nPlease look in the developer console.");
                    return false;
                }
                var topIconsSort = $('#settings_uicustomizer_topicons_container > div').map(function(){return $(this).data('tid')}).get();

                // Save and update
                self.settings.settings.plugins.uicustomizer.topIconSort = ko.observableArray(topIconsSort);
                self.settings.settings.plugins.uicustomizer.rows = colData[0];
                self.settings.settings.plugins.uicustomizer.widths = colData[1];
                self.settings.settings.plugins.uicustomizer.mainTabsCustomize = ko.observable($('#UICMainTabCustomizerToggle').is(':checked'));
                self.settings.settings.plugins.uicustomizer.mainTabs = ko.observableArray(self.buildCustomTabsSave());

                // Set theme into settings and storage
                var theme = $('#settings_uicustomizer_themesContent li.UICThemeSelected').data('uictheme');
                if (self.ThemesBaseURL != self.ThemesInternalURL){
                    self.settings.settings.plugins.uicustomizer.themeLocal(false);
                }else{
                    self.settings.settings.plugins.uicustomizer.themeLocal(true);
                }
                self.settings.settings.plugins.uicustomizer.theme(theme);

                var streamURL = self.settings.webcam_streamUrl();
                if (/.m3u8/i.test(streamURL)){
                    $('#webcam_container img').attr('src','data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
                    $('#webcam_container').hide();
                }else{
                    $('#webcam_hls_container video').attr('src','');
                    $('#webcam_hls_container').hide();
                }

                self.logToConsole(" ----> Settings have been saved/updated <----");
            }
        }

        self.fromCurrentData = function(data){
            if (!self.getReturnData) return;

            // Gcode widget on and visible
            if (!$('#UICGcodeVWidgetContainer.collapse.in').length || !$('#gcode_canvas').length || typeof OctoPrint.coreui.viewmodels.gcodeViewModel != "object") return;

            // load the file is needed
            if (OctoPrint.coreui.viewmodels.gcodeViewModel.needsLoad){
                OctoPrint.coreui.viewmodels.gcodeViewModel.loadFile(OctoPrint.coreui.viewmodels.gcodeViewModel.selectedFile.path(), OctoPrint.coreui.viewmodels.gcodeViewModel.selectedFile.date());
            }

            // Update if gcode if not centered
            if (OctoPrint.coreui.selectedTab !== "#gcode") OctoPrint.coreui.viewmodels.gcodeViewModel._renderPercentage(data.progress.completion);

            // Make a clone and parse to
            var clone = $('#UICGcodeVWidgetCan')[0];
            var clonecon = clone.getContext('2d');
            var source = $('#gcode_canvas')[0];
            var factor = $('#UICGcodeVWidget').data('zoomlvl');
            clone.width = source.width/factor
            clone.height = source.height/factor
            clonecon.drawImage( source, 0, 0, clone.width, clone.height);
        }


        // ------------------------------------------------------------------------------------------------------------------------
        // When settings are hidden
        self.onSettingsHidden = function() {
            self.settingsBeenShown = false;
            // Revert if not saved and we have been previewing anything
            if (!self.saved && self.previewHasBeenOn){
                self.previewHasBeenOn = false;
                // Cancel the data to revert settings
                OctoPrint.coreui.viewmodels.settingsViewModel.cancelData();
            }
            // Update
            self.UpdateLayout(self.settings.settings.plugins.uicustomizer);

            // Always hide previewed stuff
            $('.UICpreviewHide').hide();
            $('.UICpreviewHide').removeClass('UICpreviewHide');
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
        }

        // ------------------------------------------------------------------------------------------------------------------------

        self.getStyleSheet = function(cssUrlPart){
            var cssSel = $('link[href*="'+cssUrlPart+'"][rel="stylesheet"]');
            if (cssSel.length){
                return cssSel[0];
            }
            return null;
        }

        self.setStorage = function(cname,cvalue){
            if (!Modernizr.localstorage) return;
            if (window.location.pathname != "/"){
                cname = window.location.pathname+cname;
            }
            localStorage['plugin.uicustomizer.'+cname] = cvalue;
        }

        self.getStorage = function(cname){
            if (!Modernizr.localstorage) return undefined;
            if (window.location.pathname != "/"){
                cname = window.location.pathname+cname;
            }
            return localStorage['plugin.uicustomizer.'+cname];
        }

        self.findPluginData = function(pluginKey){
            var returnItem = null;
            $.each(OctoPrint.coreui.viewmodels.pluginManagerViewModel.plugins.allItems,function(x,item){
                if (item.key == pluginKey){
                    returnItem = item;
                    return false;
                }
            });
            return returnItem;
        }
    }

    // This is how our plugin registers itself with the application, by adding some configuration information to
    // the global variable ADDITIONAL_VIEWMODELS
    OCTOPRINT_VIEWMODELS.push([
        // This is the constructor to call for instantiating the plugin
        UICustomizerViewModel,

        // This is a list of dependencies to inject into the plugin, the order which you request here is the order
        // in which the dependencies will be injected into your view model upon instantiation via the parameters
        // argument
        ["settingsViewModel"],

        // Finally, this is the list of all elements we want this view model to be bound to.
        []
    ]);
});

/* UICustomizer END */
