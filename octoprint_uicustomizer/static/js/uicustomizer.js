/* UICustomizer START */
/*
Nice to:
    icon picker/search
    graph background set
    icon changer
*/
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
            'div.UICmainTabs' : '<i class="fa fa-columns"></i> Main tabs',
            '#UICWebCamWidget' : '<i class="fa fa-camera"></i> Webcam'
        }

        self.customWidgets = {
            '#UICWebCamWidget' : {
                'dom': '<div id="UICWebCamWidget" class="accordion-group " data-bind="visible: loginState.hasAnyPermissionKo(access.permissions.WEBCAM)">\
                            <div class="accordion-heading">\
                                <a class="accordion-toggle" data-toggle="collapse" data-test-id="sidebar-IUCWebcam-toggle" data-target="#IUCWebcamContainer">\
                                    <i class="fa icon-black fa-camera"></i> Webcam\
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

        // Quick debug
        self.logToConsole = function(msg){
            return true;
            console.log('UICustomizer:',msg)
        }

        // Initial bound and init the custom layout
        self.onAllBound = function(){
            // Store webcam
            self.onWebCamOrg = OctoPrint.coreui.viewmodels.controlViewModel.onWebcamLoaded;
            self.onWebCamErrorOrg = OctoPrint.coreui.viewmodels.controlViewModel.onWebcamErrored;

            // Set names
            $('div.octoprint-container div.tabbable').addClass('UICmainTabs').wrap( '<div class="UICRow2"></div>');
            $('#sidebar').addClass('UICRow1');
            $('div.octoprint-container').addClass('UICMainCont');

            // Always add this?
            $('head').append('<meta name="viewport" content="width=device-width, initial-scale=1.0">');

            // Load custom layout
            self.UpdateLayout(self.settings.settings.plugins.uicustomizer);
        }

        // Add an item to settings UI
        self.addToSorter = function(row,item,visible){
            var title = $(item+' div.accordion-heading a.accordion-toggle').html();
            if (title == undefined){
                if (item in self.nameLookup){
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
            $($('#UICSortRows ul')[row]).append($('<li data-id="'+item+'"><a>'+title+'<i class="pull-right fa '+checkclass+' UICToggleVis"></i></a><input class="hide" type="checkbox"'+checked+'></li>'));
        }

        // Update the entire layout
        self.UpdateLayout= function(settingsPlugin){
            self.logToConsole('Updating UI/layout');
            // Remove widths if any
            $('div.UICmainTabs').removeClass('span8');
            $('#sidebar').removeClass('span4');

            // Fixed header
            if (settingsPlugin.fixedHeader()){
                self.set_fixedHeader(true);
            }

            // Fixed footer
            if (settingsPlugin.fixedFooter()){
                self.set_fixedFooter(true);
            }

            // remove graph background
            if (settingsPlugin.hideGraphBackground()){
                self.set_hideGraphBackground(true);
            }

            // Make it fluid
            if (settingsPlugin.fluidLayout()){
                self.set_fluidLayout(true);
            }

            // Run in responsive mode
            if (settingsPlugin.responsiveMode()){
                self.set_responsiveMode(true);
            }

            // Fix temp bar plugin
            if (settingsPlugin.navbarplugintempfix()){
                self.set_navbarplugintempfix(true);
            }

            // Center the icons
            if (settingsPlugin.centerTopIcons()){
                self.set_centerTopIcons(true);
            }

            // Compact menus
            if (settingsPlugin.compactMenu()){
                self.set_compactMenu(true);
            }

            self.set_rowsLayout(settingsPlugin);

            // addWebCamZoom
            if (settingsPlugin.addWebCamZoom()){
                self.set_addWebCamZoom(true);
            }
        }

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
                    if (shown && ($(widgetid).length || widgetid in self.customWidgets)){
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
                    }else if (val2 in self.customWidgets){
                        self.logToConsole('Adding custom widget "'+val2+'" to row '+keyoffset);
                        $(self.customWidgets[val2].dom).appendTo('div.UICRow'+keyoffset);
                    }

                    // Init custom widget
                    if (val2 in self.customWidgets && 'init' in self.customWidgets[val2] && typeof self[self.customWidgets[val2].init] == "function"){
                        self.logToConsole('Launching custom widget "'+val2+'" js init');
                        self[self.customWidgets[val2].init](true);
                    }
                });
            });

            // Remove marked for delition
            $('div.UICRowDELETEME').remove();
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
                var zoomclick = $('<div class="UICWebCamClick"><a href="javascript:void(0);"><i class="fa fa-expand"></i></a></div>');
                obj.prepend(zoomclick);
                if (!self.previewOn){
                    zoomclick.hide();
                }
                zoomclick.off('click.UICWebCamClick').on('click.UICWebCamClick',function(){
                    $('.UIWebcamZoomSrc').hide();
                    // Remove previous if any
                    $('#UICWebCamFull').remove();

                    // Append floating cam to body
                    $('body').append('<div id="UICWebCamFull" draggable="true" class="UICWebcam"><div class="nowebcam text-center"><i class="fa fa-spinner fa-spin"></i> <span class="UIC-pulsate">Loading webcam&hellip;</span></div><div id="UICWebCamShrink" class="UICWebCamClick"><a href="javascript: void(0);"><i class="fa fa-compress"></i></a></div><img></div>');
                    $('#UICWebCamShrink').hide();

                    // Set source item
                    if (hlsCam){
                        // Fix and setup video
                        $('#UICWebCamFull img').replaceWith('<video muted="" autoplay=""></video>');
                        $('#UICWebCamFull video').off('playing.UICCam').on('playing.UICCam',function(event){
                            $('#UICWebCamShrink').show();
                            $('#UICWebCamFull div.nowebcam').remove();
                        });
                        // Add hls player
                        var video = $('#UICWebCamFull video')[0];
                        self.startHLSstream(video,streamURL);
                    }else{
                        // Clone to fix rotation etc.
                        var clone = $('#webcam_rotator').clone();
                        clone.attr('id','UICWebCamFullInnerDIV');
                        $('#UICWebCamFull img').replaceWith(clone).find('*').removeAttr('id');
                        $('#UICWebCamFull img').on('load',function(){
                            $('#UICWebCamShrink').show();
                            $('#UICWebCamFull div.nowebcam').remove();
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
                        $('#IUCWebcamContainer > div').append('<div class="nowebcam text-center"><i class="fa fa-spinner fa-spin"></i> <span class="UIC-pulsate">Loading webcam&hellip;</span></div>');
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
            $('#IUCWebcamContainer > div').append('<div class="nowebcam text-center"><i class="fa fa-spinner fa-spin"></i> <span class="UIC-pulsate">Loading webcam&hellip;</span></div>');

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
                    $('#IUCWebcamContainer > div').append($('<div class="nowebcam text-center"><i class="fa fa-exclamation-triangle"></i> Error loading webcam</div>').off('click.UICWebCamErrror').on('click.UICWebCamErrror',function(){
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
                            $('#IUCWebcamContainer > div').append($('<div class="nowebcam text-center"><i class="fa fa-exclamation-triangle"></i> Error loading webcam</div>').off('click.UICWebCamErrror').on('click.UICWebCamErrror',function(){
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
                $('#IUCWebcamContainer > div').append(clone).find('*').removeAttr('id');
                clone.attr('id',"IUCWebcamContainerInner").hide();

                // Error handling
                var webcamLoader = function(){
                    $('#IUCWebcamContainerInner img').off('error').on('error',function(){
                        // Error loading
                        $('#IUCWebcamContainerInner').hide();
                        $('.UICWebCamClick').hide();
                        $('#IUCWebcamContainer div.nowebcam').remove();
                        $('#IUCWebcamContainer > div').append($('<div class="nowebcam text-center"><i class="fa fa-exclamation-triangle"></i> Error loading webcam</div>').off('click.UICWebCamErrror').on('click.UICWebCamErrror',function(){
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
                                $('#IUCWebcamContainer > div').append(clone).find('*').removeAttr('id');
                                clone.attr('id',"IUCWebcamContainerInner");
                                // Setup error handling again
                                webcamLoader();

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

        // Set compact drop down menu
        self.set_compactMenu= function(enabled){
            if (enabled){
                $('div.UICMainMenu').addClass('UICCompactMenu');
            }else{
                $('div.UICMainMenu').removeClass('UICCompactMenu');
            }
        }

        // Fix modal
        self.fixSettingsModal = function(eventType){
            // Nothing to do
            if (!$('body').hasClass('UICResponsiveMode')){
                return true;
            }
            self.logToConsole('FixSettingsModal triggered : ' + eventType);

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

                // Fix dropdown menus on low height screens
                if (!$('#settings_dialog_menu').hasClass('nav-collapse')){
                    var offsetTop = $('#UICsettingsMenu').offset().top + $('#UICsettingsMenu').outerHeight();
                    $('#settings_dialog_menu ul.dropdown-menu').each(function(){
                        var menuopen = $(this);
                        if (menuopen.data('UIC-height') != undefined && menuopen.data('UIC-height') > 0){
                            var menuH = menuopen.data('UIC-height');
                        }else{
                            var menuH = offsetTop+menuopen.outerHeight();
                            menuopen.data('UIC-height',menuH);
                        }
                        if ($(window).height() < menuH+44){
                            menuopen.height($(window).height() - (offsetTop+44)).addClass('pre-scrollable').scrollTop(0);
                        }else{
                            menuopen.removeClass('pre-scrollable').css({'height':''});
                        }
                    });
                }else{
                     $('#settings_dialog_menu ul.dropdown-menu').removeClass('pre-scrollable').css({'height':''});
                }
            }

            // Fix modal sizing
            if ($('div.modal-body:visible').length && $('div.modal-body:visible').attr('style') != undefined && $('div.modal-body:visible').attr('style').match(/(^|\s)max-height: \d+px !important;/i) == null){
                var newstyle = $('div.modal-body:visible').attr('style').replace(/(^|\s)max-height: \d+px/i,`$& !important`);
                $('div.modal-body:visible').attr('style',newstyle);
            }

            // Fix settingslists
            if ($('div.modal-body:visible').length){
                var setfixheight = $('#settings_dialog div.modal-body:first').height();
                $('#settings_plugin_pluginmanager_pluginlist').height(setfixheight-300);
                $('#settings_plugin_softwareupdate_updatelist').height(setfixheight-300);
            }
        }

        // Set fixed header on/off
        self.set_responsiveMode = function(enabled){
            if (enabled){
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
                    var settingsMenuTxt = $(this).closest('li.dropdown').find('a:first').text() + '&nbsp;<i class="fa fa-chevron-right"></i>&nbsp;'+$(this).text();
                    $('#UICsetMenuShow').html(settingsMenuTxt);
                    $('#UICSettingsHeader').html(settingsMenuTxt);
                });

                // Fix drop down menus
                $('#settings_dialog_menu a.dropdown-toggle').off('click.UICSetMenu').on('click.UICSetMenu',function(){
                    // Fix menu height
                    if ($('#UICsettingsMenu ul > li:visible:last').length && $('#settings_dialog div.modal-body:first').height() < $('#UICsettingsMenu ul > li:visible:last').offset().top){
                        $('#UICsettingsMenu').addClass('pre-scrollable');
                    }else{
                        $('#UICsettingsMenu').removeClass('pre-scrollable');
                    }
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

                // Make it easier
                $('#navbar div.navbar-inner > div > div.nav-collapse').addClass('UICMainMenu');

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
                $('div.UICMainCont .btn > i.fa').each(function(){
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

            }else{
                if (!$('body').hasClass('UICResponsiveMode')){
                    return true;
                }
                $('.UICHideTablet').removeClass('UICHideTablet hidden-tablet');

                // Remmove events
                $('body').off('shown.bs.modal.UICHandler');
                $(window).off('resize.UICHandler');
                $('#settings_dialog_menu a').off('click.UICSetMenu');
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
                $('div.UICMainMenu').removeClass('UICMainMenu');

                $('.UICToolTipLeft').removeClass('UICToolTipLeft');


                $('body').removeClass('UICResponsiveMode');


            }
        }

        // Should we center the icons or not?
        self.set_centerTopIcons = function(enabled){
            if (enabled){
                if ($('ul.UICHeaderIcons').length){
                    return true;
                }
                // Move header icons out of menu
                $('#navbar div.navbar-inner > div > div.nav-collapse').addClass('UICMainMenu');
                $('div.UICMainMenu').before($('<ul class="UICHeaderIcons nav"></ul>').append($('div.UICMainMenu ul.nav li[id^="navbar_plugin"] > :not(a[href])').parent()));
            }else{
                if (!$('ul.UICHeaderIcons').length){
                    return true;
                }
                $('div.UICMainMenu > ul.nav').prepend($('ul.UICHeaderIcons li'));
                $('ul.UICHeaderIcons').remove();
            }
        }

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

        // Set graph background
        self.set_hideGraphBackground = function(enabled){
            if (enabled){
                $('#temperature-graph').addClass('UICnoBackground');
            }else{
                $('#temperature-graph').removeClass('UICnoBackground');
            }
        }


        // Fix fluid layout
        self.set_fluidLayout = function(enabled){
            if (enabled){
                $('#navbar > div.navbar-inner.default > div.container').removeClass("container").addClass("container-fluid").removeAttr("style","");
                $('div.UICMainCont').removeClass("container").addClass("container-fluid");
                $('div.UICMainCont > div.row').removeClass("row").addClass("row-fluid");
            }else{
                $('#navbar > div.navbar-inner.default > div.container-fluid').removeClass("container-fluid").addClass("container");
                $('div.UICMainCont').removeClass("container-fluid").addClass("container");
                $('div.UICMainCont > div.row-fluid ').removeClass("row-fluid").addClass("row");
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

        // Save handler and update
        self.onSettingsBeforeSave = function () {
            // Update if we have been shown/edited
            if (self.settingsBeenShown){
                self.saved = true;
                var rowData = self.buildRows(true);

                // Save and update
                self.settings.settings.plugins.uicustomizer.rows = rowData[0];
                self.settings.settings.plugins.uicustomizer.widths = rowData[1];
                self.UpdateLayout(self.settings.settings.plugins.uicustomizer);

                var streamURL = self.settings.webcam_streamUrl();
                if (/.m3u8/i.test(streamURL)){
                    $('#webcam_container img').attr('src','');
                    $('#webcam_container').hide();
                }else{
                    $('#webcam_hls_container video').attr('src','');
                    $('#webcam_hls_container').hide();
                }
            }
        }

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

        // Settings handler
        self.onSettingsShown = function() {
            self.settingsBeenShown = true;
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
            $('#UICRealPrev').prop('checked', false);
            self.previewOn = false;
            $('#UICRealPrev').on('click.uicus',function(){
                self.previewOn = !self.previewOn;
                $('body').toggleClass('UICPreviewON');
                $(window).trigger('resize');

                if (self.previewOn){
                    self.previewHasBeenOn = true;
                    // Update all
                    $('#settings_plugin_uicustomizer input:checkbox[data-settingtype]').trigger('change.uicus');
                    var rowData = self.buildRows(false);
                    self.set_rowsLayout({'rows': rowData[0],'widths':rowData[1]});

                    // Trigger us self if checking another settings
                    $('#settingsTabs').off('click.uicus').one('click.uicus','a',function(){
                        if (self.previewOn){
                            $('#UICRealPrev').trigger('click.uicus');
                        }
                    });
                }else{
                    $('#settingsTabs').off('click.uicus');
                }
            })


            // Realtime preview
            $('#settings_plugin_uicustomizer input:checkbox[data-settingtype]').on('change.uicus',function(){
                 if (self.previewOn && typeof self['set_'+$(this).data('settingtype')] == "function"){
                    self['set_'+$(this).data('settingtype')]($(this).is(':checked'));
                 }
            });
        }

        // When settings are hidden
        self.onSettingsHidden = function() {
            self.settingsBeenShown = false;
            // Revert if not saved and we have been previewing anything
            if (!self.saved && self.previewHasBeenOn){
                self.UpdateLayout(self.settings.settings.plugins.uicustomizer);
                $('.UICpreviewToggle').toggle();
                $('.UICpreviewToggle').removeClass('UICpreviewToggle');
            }
            $('body').removeClass('UICPreviewON');


            // Remove sorts
            $(self.SortableSet).each(function(){
                this.destroy();
            });

            // Fix on close settings
            self.set_navbarplugintempfix(self.settings.settings.plugins.uicustomizer.navbarplugintempfix());

            // Disable event listners
            $('#settings_plugin_uicustomizer input').off('input.uicus change.uicus click.uicus');
        }

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
