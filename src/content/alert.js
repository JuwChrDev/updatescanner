/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is mozilla.org code.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 1998
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Scott MacGregor <mscott@netscape.com>
 *   Jens Bannmann <jens.b@web.de>
 *   Pete Burgers <updatescanner@gmail.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

if (typeof(USc_alert_exists) != 'boolean') {
var USc_alert_exists = true;
var USc_alert = {    

gFinalHeight : 50,
gSlideIncrement : 1,
gSlideTime : 10,
gOpenTime : 3000, // total time the alert should stay up once we are done animating.

gAlertListener : null,
gAlertTextClickable : false,
gAlertCookie : "",

g_MAX_HEIGHT : 134,

prefillAlertInfo : function() 
{
    var label = document.getElementById("message");
    label.value=window.arguments[0];
              
},

onAlertLoad : function()
{
  // read out our initial settings from prefs.
  try 
  {
    var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService();
    prefService = prefService.QueryInterface(Components.interfaces.nsIPrefService);
    var prefBranch = prefService.getBranch(null);
    this.gSlideIncrement = prefBranch.getIntPref("alerts.slideIncrement");
    this.gSlideTime = prefBranch.getIntPref("alerts.slideIncrementTime");
    this.gOpenTime = prefBranch.getIntPref("alerts.totalOpenTime");
  } catch (ex) {}

  sizeToContent();

  this.gFinalHeight = window.outerHeight;  //134  5 lines - 152 6 lines
  if ( this.gFinalHeight > this.g_MAX_HEIGHT ) {
      this.gFinalHeight = this.g_MAX_HEIGHT;
  }

  window.outerHeight = 1;

  // be sure to offset the alert by 10 pixels from the far right edge of the screen
  window.moveTo( (screen.availLeft + screen.availWidth - window.outerWidth) - 10, screen.availTop + screen.availHeight - window.outerHeight);

  setTimeout(this.animateAlert, this.gSlideTime);
 
},


onAlertClick : function()
{
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                       .getService(Components.interfaces.nsIWindowMediator);
    var win = wm.getMostRecentWindow("navigator:browser");

    if (win.toggleSidebar) {
       win.toggleSidebar('viewUpdateScanSidebar');
    }
    win.focus()
},


animateAlert : function()
{
  var me = USc_alert;
  if (window.outerHeight < me.gFinalHeight)
  {
    window.screenY -= me.gSlideIncrement;
    window.outerHeight += me.gSlideIncrement;
    setTimeout(me.animateAlert, me.gSlideTime);
  }
  else
    setTimeout(me.closeAlert, me.gOpenTime);  
},

closeAlert : function()
{
  var me = USc_alert;
  if (window.outerHeight > 1)
  {
    window.screenY += me.gSlideIncrement;
    window.outerHeight -= me.gSlideIncrement;
    setTimeout(me.closeAlert, me.gSlideTime);
  }
  else
  {
    if (me.gAlertListener)
      me.gAlertListener.observe(null, "alertfinished", me.gAlertCookie); 
    window.close(); 
  }
}
}
}
