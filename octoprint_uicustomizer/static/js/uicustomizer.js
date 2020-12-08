/* UICustomizer START */
$(function() {
    function UICustomizerViewModel(parameters) {
        var self = this;

        // Set settings
        self.settings = parameters[1];

        // max rows
        self.maxRows = 12;

        self.saved = false;

        // Setting preview
        self.previewOn = false;
        self.previewHasBeenOn = false;
        self.settingsBeenShown = false;

        // timer for resize fix modal
        self.modalTimer = null;

        self.nameLookup = {
            'div.UICmainTabs' : '<i class="fas fa-columns"></i> Main tabs',
            '#UICWebCamWidget' : '<i class="fas fa-camera"></i> Webcam'
        }

        self.customWidgets = {
            '#UICWebCamWidget' : {
                'dom': '<div id="UICWebCamWidget" class="accordion-group " data-bind="visible: loginState.hasAnyPermissionKo(access.permissions.WEBCAM)">\
                            <div class="accordion-heading">\
                                <a class="accordion-toggle" data-toggle="collapse" data-test-id="sidebar-IUCWebcam-toggle" data-target="#IUCWebcamContainer">\
                                    <i class="fas icon-black fa-camera"></i> Webcam\
                                </a>\
                            </div>\
                            <div id="IUCWebcamContainer" class="accordion-body in collapse">\
                                <div class="accordion-inner" data-test-id="sidebar-IUCWebcam-content">\
                                </div>\
                            </div>\
                        </div>',
                'init' : 'CustomW_initWebCam',
            }
        }

        // Store webcam init
        self.onWebCamOrg = null;
        self.onWebCamErrorOrg = null;

        // Store sort
        self.SortableSet = [];

        // ------------------------------------------------------------------------------------------------------------------------
        // Quick debug
        self.logToConsole = function(msg){
            return true;
            console.log('UICustomizer:',msg)
        }

        // ------------------------------------------------------------------------------------------------------------------------
        // Initial bound and init the custom layout
        self.onAllBound = function(){
            // Store WebCam
            self.onWebCamOrg = OctoPrint.coreui.viewmodels.controlViewModel.onWebcamLoaded;
            self.onWebCamErrorOrg = OctoPrint.coreui.viewmodels.controlViewModel.onWebcamErrored;

            // Set names
            $('div.octoprint-container div.tabbable').addClass('UICmainTabs').wrap( '<div class="UICRow2"></div>');
            $('#sidebar').addClass('UICRow1');
            $('div.octoprint-container').addClass('UICMainCont');
            $('#navbar div.navbar-inner > div > div.nav-collapse').addClass('UICMainMenu');

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
                // More hacks to keep people happy
                window.setTimeout(function() {
                    $('#temperature-table .btn').addClass('btn-mini');
                    $('#temperature-table').addClass('UICFix table-condensed');
                }, 1000);
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
                'consolidate_temp_control': {
                    'text': 'Running the plugins Consolidate Temp Control and UI Customizer together can cause problems.\n\nThe UI Customizer plugin has tried to fix these problems but there might be layout issues.',
                    'action' : null
                },
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

            // Run in responsive mode
            self.set_responsiveMode(settingsPlugin.responsiveMode());

            // Fix temp bar plugin
            self.set_navbarplugintempfix(settingsPlugin.navbarplugintempfix());

            // Center the icons
            self.set_centerTopIcons(settingsPlugin.centerTopIcons());

            // Compact menus
            self.set_compactMenu(settingsPlugin.compactMenu());

            // BUild the rows layout
            self.set_rowsLayout(settingsPlugin);

            // Customize tabs
            self.set_mainTabsCustomize(settingsPlugin.mainTabsCustomize(),settingsPlugin.mainTabs());

            // addWebCamZoom
            self.set_addWebCamZoom(settingsPlugin.addWebCamZoom());
        }

        // ------------------------------------------------------------------------------------------------------------------------
        self.set_rowsLayout = function(settingsPlugin){
            // Fix layout and width - using magic
            var TempRows = [...settingsPlugin.rows()];
            var widths = settingsPlugin.widths();

            // Build only visible items in a simple array
            var CleanedRows = [];
            $.each(TempRows,function(rowid,items){
                CleanedRows[rowid] = [];
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
                    self.logToConsole("Building row " +rowid + ": " + widgetid + (shown?" Adding":" Hiding"));
                    // Add the widgets if visible or in custom list
                    if (shown && ($(widgetid).length || self.customWidgets.hasOwnProperty(widgetid))){
                        CleanedRows[rowid].push(widgetid);
                        $(widgetid).removeClass('UICHide');
                    }else{
                        // Hide the widget if not requested to be shown
                        $(widgetid).addClass('UICHide');
                        self.logToConsole("Hiding widget:" + widgetid);
                    }
                });
            });
            // Remove empty right siderows and bit of magic
            var rows = [];
            var rowfound = false;
            CleanedRows.reverse();
            $(CleanedRows).each(function(key,val){
                if (val.length > 0 || rowfound){
                    rowfound = true;
                    rows.push(val);
                }else{
                    // Find the row index in the reversed order and mark them for deletion - we can just delete empty ones because we can have an empty filler
                    var keyRevFix = Math.abs(2-key)+1;
                    $('div.UICRow'+keyRevFix).addClass('UICRowDELETEME');
                }
            });
            rows.reverse();
            self.logToConsole('Building '+rows.length+ ' row layouts:' + JSON.stringify(rows));

            // Build the layout requested
            $(rows).each(function(key,val){
                var keyoffset = key+1;
                // Set width
                var spanW = widths[key];

                // Add row if not built yet
                if ($('div.UICRow'+keyoffset).length == 0){
                    $('div.UICMainCont > div:first').append('<div class="accordion UICRow'+keyoffset+'"></div>');
                }

                // Remove and set span for the rows
                if (!$('div.UICRow'+keyoffset).hasClass('span'+spanW)){
                    $('div.UICRow'+keyoffset).attr('class', function(i, c){
                        return c.replace(/(^|\s)span\d+/g, '');
                    });
                    $('div.UICRow'+keyoffset).addClass('span'+spanW);
                }

                // Add items
                $(val).each(function(key2,val2){
                    if ($(val2).length){
                        // Append to UI row
                        self.logToConsole('Adding standard widget "'+val2+'" to row '+keyoffset);
                        $(val2).appendTo('div.UICRow'+keyoffset);
                    // Append custom widgets
                    }else if (self.customWidgets.hasOwnProperty(val2)){
                        self.logToConsole('Adding custom widget "'+val2+'" to row '+keyoffset);
                        $(self.customWidgets[val2].dom).appendTo('div.UICRow'+keyoffset);
                    }

                    // Init custom widget
                    if (self.customWidgets.hasOwnProperty(val2) && 'init' in self.customWidgets[val2] && typeof self[self.customWidgets[val2].init] == "function"){
                        self.logToConsole('Launching custom widget "'+val2+'" js init');
                        self[self.customWidgets[val2].init](true);
                    }
                });
            });

            // Remove marked for delition
            $('div.UICRowDELETEME').remove();
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
                    }
                });
                if (orgSort.length > 0){
                     $.each(orgSort,function(idx,val){
                        $('#tabs').append($('#'+val));
                    });
                }
            }
        }


        // ------------------------------------------------------------------------------------------------------------------------
        self.set_addWebCamZoom = function(enable){
            if (!enable){
                $('div.UICWebCamClick').remove();
                return true;
            }

            // drag handler - http://jsfiddle.net/robertc/kKuqH/
            var dragstart = function (event) {
                $('#drop_overlay').addClass('UICHideHard');
                var style = window.getComputedStyle(event.target, null);
                event.dataTransfer.setData("text/plain",(parseInt(style.getPropertyValue("left"),10) - event.clientX) + ',' + (parseInt(style.getPropertyValue("top"),10) - event.clientY));
            }

            var drag_over = function(event) {
                $('#drop_overlay').addClass('UICHideHard');
                event.preventDefault();
                return false;
            }

            var drop = function(event) {
                var offset = event.dataTransfer.getData("text/plain").split(',');
                var dm = document.getElementById('UICWebCamFull');
                dm.style.left = (event.clientX + parseInt(offset[0],10)) + 'px';
                dm.style.top = (event.clientY + parseInt(offset[1],10)) + 'px';
                event.preventDefault();
                $('#drop_overlay').removeClass('UICHideHard in');
                return false;
            }


            // HLS handling
            var hlsCam = false;
            var containers = ['#webcam_container','#IUCWebcamContainer > div'];
            var streamURL = self.settings.webcam_streamUrl();
            if (/.m3u8/i.test(streamURL)){
                hlsCam = true;
                containers = ['#webcam_hls_container','#IUCWebcamContainer > div'];
                // fix position of hls
                $('#webcam_hls_container').css('position','relative');
                $('#webcam_container img').attr('src','');
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
                zoomclick.off('click.UICWebCamClick').on('click.UICWebCamClick',function(){
                    $('.UIWebcamZoomSrc').hide();
                    // Remove previous if any
                    $('#UICWebCamFull').remove();

                    // Append floating cam to body
                    $('body').append('<div id="UICWebCamFull" draggable="true" class="UICWebcam"><div class="nowebcam text-center"><i class="fas fa-spinner fa-spin"></i> <span class="UIC-pulsate">Loading webcam&hellip;</span></div><div id="UICWebCamShrink" class="UICWebCamClick"><a href="javascript: void(0);"><i class="fas fa-compress"></i></a></div><span class="UICWebCamTarget"/></div>');
                    $('#UICWebCamShrink').hide();

                    // Set source item
                    if (hlsCam){
                        // Fix and setup video
                        $('#UICWebCamFull span.UICWebCamTarget').replaceWith('<video muted="" autoplay=""></video>');
                        $('#UICWebCamFull video').off('playing.UICCam').on('playing.UICCam',function(event){
                            $('#UICWebCamShrink').show();
                            $('#UICWebCamFull div.nowebcam').remove();
                        });
                        // Add hls player
                        var video = $('#UICWebCamFull video')[0];
                        self.startHLSstream(video,streamURL);
                    }else{
                        var rotated = $('#webcam_rotator').hasClass('webcam_rotated');
                        if (rotated){
                            var nHeight = $('#webcam_image')[0].naturalWidth;
                            var nWidth = $('#webcam_image')[0].naturalHeight;
                        }else{
                            var nWidth = $('#webcam_image')[0].naturalWidth;
                            var nHeight = $('#webcam_image')[0].naturalHeight;
                        }
                        var aspect = nWidth/nHeight;
                        nWidth -= 100;
                        var wWidth = $(window).width()/1.5;
                        var wHeight = $(window).height()/1.5;
                        // Cam wider than screen - then fit to screen width
                        if (nWidth > wWidth){
                            nWidth = (wWidth - 100);
                            nHeight = nWidth/aspect;
                        }
                        // Cam height than screen - then fit to screen height
                        if (nHeight > wHeight){
                            nHeight = (wHeight - 200);
                            nWidth = nHeight*aspect;
                        }

                        // Clone to fix rotation etc.
                        var clone = $('#webcam_rotator').clone();
                        clone.attr('id','UICWebCamFullInnerDIV');
                        clone.find('*').removeAttr('id');

                        $('#UICWebCamFull span.UICWebCamTarget').replaceWith(clone);
                        $('#UICWebCamFull img').css({'width':nWidth});
                        $('#UICWebCamFull img').css({'height':nHeight});
                        $('#UICWebCamFull img').off('load').on('load',function(){
                            $('#UICWebCamShrink').show();
                            $('#UICWebCamFull img').show();
                            $('#UICWebCamFull div.nowebcam').remove();
                            $('#UICWebCamFull img').css({'width':''});
                            $('#UICWebCamFull img').css({'height':''});
                        });
                        $('#UICWebCamFull img').attr('src',streamURL);
                    }

                    // Fix on resize done
                    $('#UICWebCamFull').off('mouseup').on('mouseup',function(){
                        $('#UICWebCamFull').css('height','');
                    })

                    // Start draghandler
                    var dm = document.getElementById('UICWebCamFull');
                    dm.addEventListener('dragstart',dragstart,false);
                    document.body.addEventListener('dragover',drag_over,false);
                    document.body.addEventListener('drop',drop,false);

                    // Close again
                    window.setTimeout(function(){$('#UICWebCamShrink').show();},5000);
                    $('#UICWebCamShrink').one('click',function(){
                        $('.UIWebcamZoomSrc').show();
                        $('#UICWebCamFull').remove();
                    });
                });
            });
        }

        // ------------------------------------------------------------------------------------------------------------------------
        // Hide main cams
        self.set_hideMainCam = function(enable){
            if (enable){
                if ($('#webcam_hls').length){
                    $('#webcam_hls_container').addClass('UICHideHard');
                    $('#webcam_hls')[0].pause();
                }
                $('#webcam_container').addClass('UICHideHard');
                $('#webcam_container').next().addClass('UICHideHard');
                $('#webcam_image').attr('src','data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
                $('#webcam_image').data("isHidden",true);
            }else{
                if ($('#webcam_hls').length){
                    $('#webcam_hls_container').removeClass('UICHideHard');
                }
                $('#webcam_container').removeClass('UICHideHard');
                $('#webcam_container').next().removeClass('UICHideHard');
                $('#webcam_image').data("isHidden",false);
            }
        }

        // ------------------------------------------------------------------------------------------------------------------------
        self.CustomW_initWebCam = function(enable){
            self.logToConsole('WebCam custom init');

            // Hide main cams
            self.set_hideMainCam(self.settings.settings.plugins.uicustomizer.hideMainCam());

            // Disable it all
            if (!enable){
                 OctoPrint.coreui.viewmodels.controlViewModel.onWebcamLoaded = self.onWebCamOrg;
                 OctoPrint.coreui.viewmodels.controlViewModel.onWebcamErrored = self.onWebCamErrorOrg;
                 $('#UICWebCamWidget').remove();
                 return true;
            }
            // Cleanup
            $('#IUCWebcamContainer > div').html('');
            var hlsCam = false;
            var streamURL = self.settings.webcam_streamUrl();
            // BROKEN due to loading/changes not triggering at the right time: || (typeof OctoPrint.coreui.viewmodels.controlViewModel.webcamHlsEnabled == "function" && OctoPrint.coreui.viewmodels.controlViewModel.webcamHlsEnabled()
            if (/.m3u8/i.test(streamURL)){
                self.logToConsole("HLS WebCam detected: " + streamURL);
                hlsCam = true;
            }

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

            // Event handler
            var eventVIS = function(){
                var hlsCam = false;
                var streamURL = self.settings.webcam_streamUrl();
                if (/.m3u8/i.test(streamURL)){
                    hlsCam = true;
                }
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
                        $('#IUCWebcamContainer > div').append('<div class="nowebcam text-center"><i class="fas fa-spinner fa-spin"></i> <span class="UIC-pulsate">Loading webcam&hellip;</span></div>');
                        $('#IUCWebcamContainerInner').hide();
                        $('#IUCWebcamContainer').show();
                        $('#IUCWebcamContainerInner img').attr('src',streamURL);
                    }
                }
            }

            // Warn if the browser doesn't support addEventListener or the Page Visibility API
            if (typeof document.addEventListener === "undefined" || hidden === undefined) {
                self.logToConsole("NO event handler for visibility :( ");
            } else {
                // Handle page visibility change
                document.removeEventListener(visibilityChange, eventVIS ,false);
                document.addEventListener(visibilityChange, eventVIS, false);
            }

            // Set loading
            $('.UICWebCamClick').hide();
            $('#IUCWebcamContainer > div').append('<div class="nowebcam text-center"><i class="fas fa-spinner fa-spin"></i> <span class="UIC-pulsate">Loading webcam&hellip;</span></div>');

            // HLS cam handling is a bit easier than normal stuff
            if(hlsCam){
                // reset
                OctoPrint.coreui.viewmodels.controlViewModel.onWebcamLoaded = self.onWebCamOrg;
                // Clone it
                var clone = $('#webcam_hls').clone();
                clone.removeAttr('id');
                $('#IUCWebcamContainer > div').html(clone).find('*').removeAttr('id');

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
                $('#webcam_hls')[0].pause();
                $('#UICWebCamWidget').addClass('UICWebcam');
                // Remove old just in case
                OctoPrint.coreui.viewmodels.controlViewModel.onWebcamErrored = self.onWebCamErrorOrg;

                // Normal webcam stream
                self.logToConsole("WebCam NON-hls starting");

                // Clone and cleanup
                var clone = $('#webcam_rotator').clone();
                // Avoid any children added
                clone.find('>div:not(:first-child)').remove();
                $('#IUCWebcamContainer > div').append(clone).find('*').removeAttr('id');
                clone.attr('id',"IUCWebcamContainerInner").hide();

                // Error handling
                var webcamLoader = function(){
                    $('#IUCWebcamContainerInner img').off('error').on('error',function(){
                        // Error loading
                        $('#IUCWebcamContainerInner').hide();
                        $('.UICWebCamClick').hide();
                        $('#IUCWebcamContainer div.nowebcam').remove();
                        $('#IUCWebcamContainer > div').append($('<div class="nowebcam text-center"><i class="fas fa-exclamation"></i> Error loading webcam</div>').off('click.UICWebCamErrror').on('click.UICWebCamErrror',function(){
                            $('#control_link a').trigger('click');
                        }));
                    }).on('load',function(){
                        // Loaded
                        $('.UICWebCamClick').show();
                        $('#IUCWebcamContainerInner').show();
                        $('#IUCWebcamContainerInner img').show();
                        $('#IUCWebcamContainer div.nowebcam').hide();
                    });
                };
                webcamLoader();

                // Event handlers
                OctoPrint.coreui.viewmodels.controlViewModel.onWebcamLoaded = (function(old) {
                    function extendWebCam() {
                        self.onWebCamOrg();
                        if ($('#IUCWebcamContainer:visible').length && $('#webcam_image').data("isHidden") !== true){
                            // Remove the no webcam container
                            $('#IUCWebcamContainer div.nowebcam').remove();
                            $('.UICWebCamClick').show();
                            $('#IUCWebcamContainerInner img').show();
                            // Compare content of the containers
                            if ($('#IUCWebcamContainerInner').clone().wrap('<p/>').parent().find('*').removeAttr('id').removeAttr('src').html().replace(' style=""' ,'').trim() != $('#webcam_rotator').clone().wrap('<p/>').parent().find('*').removeAttr('id').removeAttr('src').html().replace(' style=""','').trim()){
                                self.logToConsole("WebCam updated TOTAL");
                                $('#IUCWebcamContainerInner').remove();
                                // Clone and cleanup
                                var clone = $('#webcam_rotator').clone();
                                clone.find('>div:not(:first-child)').remove();
                                $('#IUCWebcamContainer > div').append(clone).find('*').removeAttr('id');
                                clone.attr('id',"IUCWebcamContainerInner");
                                // Setup error handling again
                                webcamLoader();

                                // Fix the fullscreen overlay if present
                                if ($('#UICWebCamFullInnerDIV').length){
                                    var clone = $('#webcam_rotator').clone();
                                    clone.find('>div:not(:first-child)').remove();
                                    clone.attr('id','UICWebCamFullInnerDIV');
                                    $('#UICWebCamFullInnerDIV').html(clone).find('*').removeAttr('id');
                                    $('#UICWebCamFull img').on('load',function(){
                                        $('#UICWebCamFull div.nowebcam').remove();
                                    });
                                    $('#UICWebCamFull img').attr('src',streamURL);
                                }

                            }else if($('#IUCWebcamContainerInner img').attr('src') != streamURL){
                                self.logToConsole("WebCam updated SRC");
                                $('#IUCWebcamContainerInner img').attr('src',streamURL);
                            }
                            // Make sure its shown
                            $('#IUCWebcamContainer > div >div').show();
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
                    clone.attr('id','UICWebCamFullInnerDIV');
                    $('#UICWebCamFullInnerDIV').html(clone).find('*').removeAttr('id');
                    $('#UICWebCamFull img').on('load',function(){
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
            var screenroom = $(window).height()-($('#UICsettingsMenuNav').offset().top+50);
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
                        return true;
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
                // Skip if active
                if ($('body').hasClass('UICResponsiveMode')){
                    return true;
                }

                // Add dynamic viewport
                $('head').append('<meta id="UICViewport" name="viewport" content="width=device-width, initial-scale=1.0">');

                // Check for touch
                if (typeof Modernizr !== 'undefined' && Modernizr.touchevents) {
                    $('body').addClass('UICTouchDevice');
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
                // For restoring
                $('#settingsTabs').addClass('UICsettingsMOldTabs');
                $('#UICsettingsNewMenu').attr('id','settingsTabs');;

                // hide the "collapse/responsive" stuff
                $('#UICsettingsMenuNav a.btn-navbar').hide();
                $('#UICsetMenuShow').hide();

                $('#settings_dialog_label').prepend('<span class="hidden-phone pull-right" id="UICSettingsHeader""></span>');

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
                $('#navbar > div.navbar-inner.default > div:first').prepend('<a class="btn btn-navbar collapsed" data-toggle="collapse" data-target=".UICMainMenu"><span class="icon-bar"></span><span class="icon-bar"></span><span class="icon-bar"></span></a>');

                // Close menu on click
                $('div.UICMainMenu a:not(.dropdown-toggle)').off('click.UICMainMenu').on('click.UICMainMenu',function(){
                    if ($('div.UICMainMenu').hasClass('in')){
                        $('#navbar div.navbar-inner a.btn-navbar').trigger('click');
                    }
                });


                // Add title to menu items
                $('div.UICMainMenu > ul.nav > li > a').each(function(){
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
                if (!$('body').hasClass('UICResponsiveMode')){
                    return true;
                }
                // Remove meta viewport
                $('#UICViewport').remove();
                $('.UICHideTablet').removeClass('UICHideTablet hidden-tablet');
                $('body').removeClass('UICTouchDevice');

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
                $('#settingsTabs').removeAttr('id');
                $('ul.UICsettingsMOldTabs').attr('id','settingsTabs').removeClass('UICsettingsMOldTabs');
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
                $('#navbar div.navbar-inner > div > div.nav-collapse').addClass('UICMainMenu');
                $('div.UICMainMenu').after($('<ul class="UICHeaderIcons nav"></ul>').append($('div.UICMainMenu ul.nav > li[id^="navbar_plugin"]:not(#navbar_plugin_announcements)')));
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
            }else{
                $('body').removeClass('UICfixedHeader');
                $('#navbar').addClass('navbar-static-top').removeClass('navbar-fixed-top');
            }
        }

        // ------------------------------------------------------------------------------------------------------------------------
        // Set Compact icons
        self.set_navbarplugintempfix = function(enabled){
            if (!$('#navbar_plugin_navbartemp').length){
                return true;
            }
            if (enabled){
                $('#navbar_plugin_navbartemp').addClass('UICIconHack');
                $('#navbar_plugin_navbartemp.UICIconHack >div > span').wrap('<div></div>');
            }else{
                $('#navbar_plugin_navbartemp.UICIconHack >div > div > span').unwrap('div');
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
        // Build row layout and width
        self.buildRows = function(prefix){
            var prefixItem = '';
            var rowsSave = [];
            $('#UICSortRows ul').each(function(key,val){
                rowsSave[key] = {};
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
                        rowsSave[key][prefixItem+$(this).data('id')] = true;
                    }else{
                        rowsSave[key][prefixItem+$(this).data('id')] = false;
                    }
                });
            });
            self.logToConsole("Built these rows:"+JSON.stringify(rowsSave));

            var widths = $('#UICSortRows input.uicrowwidth').map(function(){return $(this).val();}).get();
            return [ko.observableArray(rowsSave), ko.observableArray(widths)];
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
                    listItems.push(val[0]);
                }
            });

            // Store all tabs names and add uknown
            $('#tabs li:not(.tabdrop) a').each(function(pos,val){
                if ($(this).data('orgPos') == undefined){
                    $(this).data('orgPos',pos);
                }
                if ($(this).data('orgName') == undefined){
                    var name = $.trim($(this).text());
                    $(this).data('orgName',name);
                    var parid = $(this).parent().attr('id');
                    // Append any items
                    if (!(indexobj.hasOwnProperty(parid))){
                        listItems.push(parid);
                        // Default params
                        var prevIcon = $(this).find('i');
                        var prevIconName = '';
                        if (prevIcon.length){
                            prevIconName = prevIcon.attr('class');
                        }
                        indexobj[parid] = [parid,true,false,prevIconName,true];
                    }
                }
            });
            return [indexobj,listItems];
        }

        // ------------------------------------------------------------------------------------------------------------------------
        self.buildCustomTab = function(data){
            // PARAMS:
            // [parid,true,false,'icon',true/false]
            // ID, Shown,Customlabel,icon align:true = right
            // 0 ,   1  ,    2      , 3
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
            // Set label
            if (data[2] != false){
                $(newtabcontent).html(data[2]);
            }else{
                $(newtabcontent).html(target.data('orgName'));
            }
            // Set icon
            if (data[3] != ''){
                // On the right or the left hand side
                if (data[4]){
                    $(newtabcontent).prepend('<i class="UICPadRight hidden-tablet '+data[3]+'"></i>');
                }else{
                    $(newtabcontent).append('<i class="UICPadLeft hidden-tablet '+data[3]+'"></i>');
                }
            }
            $(target).html(newtabcontent.html());
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
                newData.push(
                    [$(this).parent().data('tabid'),
                    $(this).find('button.UICTabToggle i').hasClass('fa-eye'),
                    label,
                    classtxt,
                    $(this).find('ul.UICTabIconAlign li.active a').data('align')]
                );
            });
            return newData;
        }

        // ------------------------------------------------------------------------------------------------------------------------
        // Inspired by: https://itsjavi.com/fontawesome-iconpicker/
        self.iconSearchPopover = function(searchNow,callback,addDelete){
            if (typeof searchNow == "string"){
                searchNow = searchNow.replace(/fa-|fas |far |fal |fad |fab |fa /gi,"");
            }
            return {
                'html': true,
                'container': '#settings_uicustomizer_tabs',
                'placement' : 'left',
                'title' : function(){
                    var myself = $(this);
                    if (myself.data("frun") != true){
                        myself.data("frun",true);
                        return false;
                    }
                    // Lookup dynamic if possible
                    var defaultstr = searchNow;
                    if (typeof searchNow == "object"){
                        // Dont search empty icons
                        if (searchNow.hasClass('UICIconEmpty')){
                            defaultstr = '';
                        }else{
                            defaultstr = searchNow.attr('class').replace(/fa-|fas |far |fal |fad |fab |fa /gi,"");
                        }
                    }
                    // hide others
                    $('button.UICTabIcon').not(myself).popover('hide');
                    var searchInput = $('<input type="search" autocomplete="off" class="UICiconSearchFilter form-control" value="'+defaultstr+'" placeholder="Type to search">');
                    var closebtn = $('<button type="button" class="UICiconSearchClose btn btn-mini pull-right"><i class="fas fa-times"></i></button>');
                    // Close
                    closebtn.off('click').on('click',function(){
                        myself.popover('hide');
                    });
                    // Search
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
                                data: JSON.stringify({query: "query { search(version: \"5.13.0\", query: \""+search+"\", first: 35) { label id membership{ free } } }"}),
                            }).always(function(data){
                                if (data.status == 200){
                                    try {
                                        var jsonObj = JSON.parse(data.responseText);
                                    }
                                    catch(err) {
                                        return false;
                                    }
                                    $this.data('prevSearch',search);
                                    self._iconSearchBuildResults(jsonObj,target,myself,callback);
                                }
                            })
                            $this.data('prevAjax',xhr);
                        },350);
                        $this.data('keyTime',timeout);
                    });
                    window.setTimeout(function(){
                        searchInput.focus();
                        searchInput.select();
                        if (defaultstr != ""){
                            searchInput.trigger('keyup');
                        }
                    },200);

                    // Add delete button
                    if (addDelete){
                        var delbtn = $('<button type="button" title="Dont select an icon, blank" class="btn btn-warning pull-right"><i class="fas fa-trash"></i></button>');
                        delbtn.on('click',function(){
                            if (typeof callback == "function"){
                                callback(false);
                            }
                            myself.popover('hide');
                        });
                    }else{
                        var delbtn = $('');
                    }
                    return $('<form/>').append(searchInput.add(delbtn).add(closebtn)).submit(function(e){
                        e.preventDefault();
                        return false;
                    });
                },
                'content': function(){
                    var searchRes = $('<div class="UICiconSearchResults"><div class="text-center UICiconSearchInfo"><i class="fas fa-info-circle"></i>&nbsp;Type to search&hellip;</div></div>');
                    return searchRes;
                }
            };
        }

        // ------------------------------------------------------------------------------------------------------------------------
        self._iconSearchBuildResults = function(jsonData,target,src,callback){
            if (!jsonData.hasOwnProperty('data') || !jsonData.data.hasOwnProperty('search') || jsonData.data.search.length == 0){
                target.html('<div class="text-center UICiconSearchInfo"><i class="fas fa-heart-broken"></i> Sorry no results found&hellip;</div>')
                return true;
            }
            target.html('');
            $.each(jsonData.data.search,function(id,val){
                if (!val.hasOwnProperty('id')){
                    return true;
                }
                if (val.hasOwnProperty('membership') && val.membership.hasOwnProperty('free')){
                    $.each(val.membership.free,function(id2,itype){
                        var itypeL = itype.slice(0,1);
                        target.append('<a role="button" href="javascript:void(0)"" title="' + val.label +'"><i class="fa' + itypeL + ' fa-' + val.id +'"></i></a>');
                    })
                }
            });
            target.find('a').off('click').on('click',function(){
                var iconsel = $(this).find('i').attr('class');
                if (typeof callback == "function"){
                    callback(iconsel);
                }
                src.find('i').attr('class',iconsel);
                src.popover('hide');
                // target.find('.UICIconSelected').removeClass('UICIconSelected');
                // $(this).addClass('UICIconSelected');
            });
        }

        // ------------------------------------------------------------------------------------------------------------------------
        // Settings handler
        self.onSettingsShown = function() {
            self.settingsBeenShown = true;
            $('#UICReportBug').off('click').on('click',function(){
                $(this).find('i').toggleClass('skull-crossbones bug');
                url = 'https://github.com/LazeMSS/OctoPrint-UICustomizer/issues/new';
                var body = "[\n ENTER DESCRIPTION HERE- ALSO ADD SCREENSHOT IF POSSIBLE!\n Describe your problem?\n What is the problem?\n Can you recreate it?\n Did you try disabling plugins?\n Did you remeber to update the subject?\n]\n\n**Plugins installed:**\n";
                $(Object.entries(OctoPrint.coreui.viewmodels.settingsViewModel.settings.plugins)).each(function(x,item){
                    body += '- ' + item[0] + "\n";
                })
                body += "\n\n**Software versions:**\n- "+$('#footer_version li').map(function(){return $(this).text()}).get().join("\n- ");
                window.open(url+'?body='+encodeURI(body),'UICBugReport');
                $(this).blur();
            });
            // Widgets found
            var sidebarItems = ['div.UICmainTabs'];
            $('#sidebar div.accordion-group').each(function(){
                sidebarItems.push('#'+$(this).attr('id'));
            });

            self.saved = false;
            self.previewHasBeenOn = false;
            var settingsPlugin = self.settings.settings.plugins.uicustomizer;

            // Fix on load
            window.setTimeout(function(){
                self.set_navbarplugintempfix(settingsPlugin.navbarplugintempfix());
            },500);

            // Check for navbar
            if (typeof OctoPrint.coreui.viewmodels.settingsViewModel.settings.plugins.navbartemp !== "undefined"){
                $('#settings_uicustomizer_general input[data-settingtype="navbarplugintempfix"]').prop( "disabled", false );
            }else{
                $('#settings_uicustomizer_general input[data-settingtype="navbarplugintempfix"]').prop( "disabled", true );
            }


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
                // ID, Shown,Customlabel,icon align
                // 0 ,   1  ,    2      , 3, 4
                // Build values
                var target = $('#'+val).find('a');
                var targetLink = target.attr('href');
                var orgName = target.data('orgName');
                var localObj = indexobj[val];

                // Build settings for the rows
                var classVis = 'fa-eye';
                if (localObj[1] == false){
                    classVis = "fa-eye-slash";
                }
                var custname = '';
                if (localObj[2] != false){
                    custname = localObj[2];
                }
                var icon = 'fas fa-search UICIconEmpty';
                if (localObj[3] != false){
                    icon = localObj[3];
                }

                var alignclassL = localObj[4] ? ' class="active" ' : '';
                var alignclassR = localObj[4] ? '' : ' class="active" ';
                var alignText = localObj[4] ? 'Left' : 'Right';

                // BVuild new row
                var newRow = $('\
                    <div class="control-group row-fluid UICRemoveFluidRow" data-tabid="'+val+'">\
                        <label class="control-label">'+orgName+'</label>\
                        <div class="controls">\
                            <div class="input-append">\
                                <input title="Enter tab name, blank = default" class="input-large UICTabNameInput" placeholder="Name: '+orgName+'" type="text" value="'+custname+'">\
                                <button class="btn UICTabToggle" type="button" title="Hide/Show tab"><i class="fas '+classVis+'"></i></button>\
                                <button class="btn UICTabIcon" type="button"><i class="'+icon+'"></i></button><div class="btn-group">\
                                <ul class="dropdown-menu UICTabIconAlign">\
                                    <li'+alignclassL+'><a href="#" data-align="true">Left</a></li>\
                                    <li'+alignclassR+'><a href="#" data-align="false">Right</a></li>\
                                </ul>\
                                <button class="btn dropdown-toggle" data-toggle="dropdown" title="Change icon position in tab" ><span class="UICTabIconPos">'+alignText+'</span> <span class="caret"></span></button>\
                            </div>\
                        </div>\
                        <button class="UICDragVHandle btn" type="button" title="Sort item"><i class="fas fa-arrows-alt-v"></i></button>\
                    </div>');

                // Toggle tabs on/off
                newRow.find('button.UICTabToggle').off('click').on('click',function(){
                    var icon = $(this).find('i');
                    icon.toggleClass('fa-eye fa-eye-slash');
                    if (self.previewOn){
                        var cloneobj = $.extend(true,{},localObj);
                        cloneobj[1] = icon.hasClass('fa-eye');
                        self.buildCustomTab(cloneobj);
                        if (cloneobj[1]){
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
                newRow.find('input.UICTabNameInput').off('blur keyup').on('blur keyup',function(){
                    if (self.previewOn){
                        var cloneobj = $.extend(true,{},localObj);
                        var val = $.trim($(this).val());
                        cloneobj[2] = val;
                        self.buildCustomTab(cloneobj);
                    }
                });

                // Change tab icon
                newRow.find('button.UICTabIcon').removeData("frun").popover(
                    self.iconSearchPopover(newRow.find('button.UICTabIcon >i'),function(newicon){
                        if (self.previewOn){
                            var cloneobj = $.extend(true,{},localObj);
                            cloneobj[3] = newicon;
                            self.buildCustomTab(cloneobj);
                        }
                        // Delete
                        if (newicon === false){
                            newRow.find('button.UICTabIcon >i').attr('class','fas fa-search UICIconEmpty');
                        }
                    },true)
                ).attr('Title','Click to change icon');

                // Change icon alignment
                newRow.find('ul.UICTabIconAlign li a').off('click').on('click',function(){
                    newRow.find('ul.UICTabIconAlign li.active').removeClass('active');
                    $(this).parent().addClass('active');
                    if($(this).data('align')){
                        newRow.find('.UICTabIconPos').text('Left');
                    }else{
                        newRow.find('.UICTabIconPos').text('Right');
                    }
                    if (self.previewOn){
                        // Dont align blank icons
                        var iconsrc = newRow.find('button.UICTabIcon >i');
                        if (iconsrc.hasClass('UICIconEmpty')){
                            return true;
                        }
                        var cloneobj = $.extend(true,{},localObj);
                        cloneobj[4] = $(this).data('align');
                        // add icon also to make sure we get it all
                        cloneobj[3] =  iconsrc.attr('class');
                        self.buildCustomTab(cloneobj);
                    }
                });

                $('#settings_uicustomizer_tabs_look ').append(newRow);
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
                        var rowData = self.buildCustomTabsSave();
                        self.set_mainTabsCustomize(settingsPlugin.mainTabsCustomize(),rowData);
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
                        var rowData = self.buildCustomTabsSave();
                        self.set_mainTabsCustomize(true,rowData);
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

            /// ---------------------- ROWS LAYOUT


            // Cleanup
            $('#UICSortRows ul li').remove();
            $('#UICSortRows ul').addClass('nav-tabs'); // hack due to this: https://github.com/OctoPrint/OctoPrint/blob/3ab84ed7e4c3aaaf71fe0f184b465f25d689f929/src/octoprint/static/js/app/main.js#L737

            // Build the sorter to make it ready
            var rows = settingsPlugin.rows();

            // Join and filter on unique values
            sidebarItems = sidebarItems.concat(Object.keys(self.customWidgets)).filter(function(value, index, self) {
                    return self.indexOf(value) === index;
            });
            self.logToConsole("Sidebar and custom widgets:" + JSON.stringify([...sidebarItems]));

            // Run trough each row
            $(rows).each(function(rowid,items){
                // add to the editor
                $.each(items, function(widgetid,shown){
                    // prefix removal
                    if (widgetid.charAt(0) == "_"){
                        self.logToConsole("Slicing 3 chars of: " + widgetid);
                        widgetid = widgetid.slice(3);
                        self.logToConsole("new widgetid: " + widgetid);
                    }
                    self.logToConsole('Adding widget "' + widgetid + '"('+shown() + ") to selector");
                    self.addToSorter(rowid,widgetid,shown());
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
            $('#UICSortRows ul > li> a  > i.UICToggleVis').off('click').on('click',function(event){
                $(this).toggleClass('fa-eye fa-eye-slash');
                // Change checkbox
                var chbox = $(this).parent().parent().find('input');
                chbox.prop("checked", !chbox.prop("checked"));
                if (self.previewOn){
                    $($(this).closest('li').data('id')).toggle().addClass('UICpreviewToggle');
                    self.previewHasBeenOn = true;
                }
                event.stopPropagation();
            });

            // Update min max
            var fixMinMax = function(){
                // Update min/max for all items and disable the last one
                $('#UICSortRows ul:empty').parent().find('input.uicrowwidth').attr('min',0);
                $('#UICSortRows ul:not(:empty)').parent().find('input.uicrowwidth').attr('min',1);
                $('#UICSortRows ul').parent().find('input.uicrowwidth').attr('max',(10+$('#UICSortRows ul:empty').length));
                $('#UICSortRows ul:last:empty').parent().find('input.uicrowwidth').val(0).prop('disabled',true);
                $('#UICSortRows ul:last:not(:empty)').parent().find('input.uicrowwidth').prop('disabled',false);
                $('#settings_plugin_uicustomizer input.uicrowwidth').trigger('input');
            }

            // Sort/draghandler layout
            $('#UICSortRows ul').each(function(key,val){
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
                            var rowData = self.buildRows(false);
                            self.set_rowsLayout({'rows': rowData[0],'widths':rowData[1]});
                        }
                    }
                });
            });

            // width settings updater
            $('#settings_plugin_uicustomizer input.uicrowwidth').off('input.uicus').on('input.uicus',function(){
                $(this).next().html($(this).val());
            });

            // Keep the maxium width
            $('#settings_plugin_uicustomizer input.uicrowwidth').off('change.uicus').on('change.uicus',function(){
                var thisItem = this;
                var spanW = $('#UICSortRows input.uicrowwidth');

                var totalspan = spanW.map(function(){return $(this).val();}).get().reduce(function(a, b){
                    return parseInt(a,10) + parseInt(b,10);
                }, 0);

                // Over?
                if (totalspan > self.maxRows){
                    var diff = totalspan - self.maxRows;
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
                    var rowData = self.buildRows(false);
                    self.set_rowsLayout({'rows': rowData[0],'widths':rowData[1]});
                }
            });

            // Set all empty to minimum
            fixMinMax();

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
                    // Update all
                    $('#settings_plugin_uicustomizer input:checkbox[data-settingtype]').trigger('change.uicus');
                    var rowData = self.buildRows(false);
                    self.set_rowsLayout({'rows': rowData[0],'widths':rowData[1]});

                    // Trigger us self if checking anything but our own menu item
                    $('#settingsTabs a, #UICsettingsMenu a:not(.dropdown-toggle)').not('#settings_plugin_uicustomizer_link a').off('click.uicusPrev').one('click.uicusPrev',function(){
                        if (self.previewOn){
                            $('#UICRealPrevCheck').trigger('click.uicusPrev');
                        }
                    });

                    // Update main tabs
                    $('#UICMainTabCustomizerToggle').trigger('change');

                }else{
                    $('#settingsTabs').off('click.uicusPrev');
                }
            }).find('i').removeClass('fa-check-square').addClass('fa-square');


            // Realtime preview
            $('#settings_plugin_uicustomizer input:checkbox[data-settingtype]').on('change.uicus',function(){
                var settingType = $(this).data('settingtype');
                if (self.previewOn && typeof self['set_'+settingType] == "function"){
                    if ($(this).data('clickthis') !== undefined){
                        $($(this).data('clickthis')).trigger('click');
                    }
                    self['set_'+settingType]($(this).is(':checked'));
                 }
            });
        }

         // ------------------------------------------------------------------------------------------------------------------------
        // Add an item to settings UI
        self.addToSorter = function(row,item,visible){
            var title = $(item+' div.accordion-heading a.accordion-toggle').html();
            if (title == undefined){
                if (self.nameLookup.hasOwnProperty(item)){
                    title = self.nameLookup[item];
                }else{
                    title = item;
                }
            }
            var checked = '';
            var checkclass = 'fa-eye-slash'
            if (visible){
                checked = ' checked';
                checkclass = 'fa-eye';
            }
            // Add to sort rows in settings
            $($('#UICSortRows ul')[row]).append($('<li data-id="'+item+'"><a>'+title+'<i class="pull-right fas '+checkclass+' UICToggleVis"></i></a><input class="hide" type="checkbox"'+checked+'></li>'));
        }


        // ------------------------------------------------------------------------------------------------------------------------
        // Save handler and update
        self.onSettingsBeforeSave = function () {
            // Update if we have been shown/edited
            if (self.settingsBeenShown){
                if (typeof self.settings.settings.plugins.navbartemp !== "undefined" && self.settings.settings.plugins.uicustomizer.navbarplugintempfix()){
                    self.settings.settings.plugins.navbartemp.useShortNames(true);
                }

                self.saved = true;
                var rowData = self.buildRows(true);

                // Save and update
                self.settings.settings.plugins.uicustomizer.rows = rowData[0];
                self.settings.settings.plugins.uicustomizer.widths = rowData[1];
                self.settings.settings.plugins.uicustomizer.mainTabsCustomize = ko.observable($('#UICMainTabCustomizerToggle').is(':checked'));
                self.settings.settings.plugins.uicustomizer.mainTabs = ko.observableArray(self.buildCustomTabsSave());
                self.UpdateLayout(self.settings.settings.plugins.uicustomizer);

                var streamURL = self.settings.webcam_streamUrl();
                if (/.m3u8/i.test(streamURL)){
                    $('#webcam_container img').attr('src','');
                    $('#webcam_container').hide();
                }else{
                    $('#webcam_hls_container video').attr('src','');
                    $('#webcam_hls_container').hide();
                }

                self.logToConsole(" ----> Settings have been saved/updated <----");
            }
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
                self.UpdateLayout(self.settings.settings.plugins.uicustomizer);
                $('.UICpreviewToggle').toggle();
                $('.UICpreviewToggle').removeClass('UICpreviewToggle');
            }
            $('body').removeClass('UICPreviewON');


            // Remove sorts
            $(self.SortableSet).each(function(){
                this.destroy();
            });

            // Remove sorter on tabs
            $('#settings_uicustomizer_tabs_look').data('sorter').destroy();
            $('#settings_uicustomizer_tabs_look').removeData('sorter');
            // Cleanup to prevent listners etc
            $('#settings_uicustomizer_tabs_look').empty();
            // Remove popovers
            $('button.UICTabIcon').popover('hide');
            $('#settings_uicustomizer_tabs div.popover').remove();

            // Fix on close settings
            self.set_navbarplugintempfix(self.settings.settings.plugins.uicustomizer.navbarplugintempfix());

            // Disable event listners
            $('#settings_plugin_uicustomizer input').off('input.uicus change.uicus click.uicus');
        }

        // ------------------------------------------------------------------------------------------------------------------------
        self.onStartupComplete = function (){
            if (self.settings.settings.plugins.uicustomizer.navbarplugintempfix()){
                // hackish - wait for the normal plugin
                window.setTimeout(function(){self.set_navbarplugintempfix(true)},1000);
            }
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
        ["loginStateViewModel", "settingsViewModel"],

        // Finally, this is the list of all elements we want this view model to be bound to.
        []
    ]);
});

/* UICustomizer END */

