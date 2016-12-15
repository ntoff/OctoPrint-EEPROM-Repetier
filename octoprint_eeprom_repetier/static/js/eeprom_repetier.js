/**
 * Created by Salandora on 27.07.2015.
 */
$(function() {
    function EepromRepetierViewModel(parameters) {
        var self = this;

        self.control = parameters[0];
        self.connection = parameters[1];

        self.firmwareRegEx = /FIRMWARE_NAME:([^\s]+)/i;
        self.repetierRegEx = /Repetier_([^\s]*)/i;

        self.eepromDataRegEx = /EPR:(\d+) (\d+) ([^\s]+) (.+)/;

        self.isRepetierFirmware = ko.observable(false);

        /* get eeprom data on connect after a fxed timeout. Disabled for now */
        /*
        self.getEepromOnConnectTimeout = undefined; 
        */

        self.isConnected = ko.computed(function() {
            return self.connection.isOperational() || self.connection.isPrinting() ||
                   self.connection.isReady() || self.connection.isPaused();
        });

        self.eepromData = ko.observableArray([]);

        self.onStartup = function() {
            $('#tab_plugin_eeprom_repetier_link a').on('show', function(e) {
                if (self.isConnected() && !self.isRepetierFirmware())
                    self._requestFirmwareInfo();
            });
        }

        self.fromHistoryData = function(data) {
            _.each(data.logs, function(line) {
                var match = self.firmwareRegEx.exec(line);
                if (match != null) {
                    if (self.repetierRegEx.exec(match[0]))
                        self.isRepetierFirmware(true);
                }
            });
        };

        self.fromCurrentData = function(data) {
            if (!self.isRepetierFirmware()) {
                _.each(data.logs, function (line) {
                    var match = self.firmwareRegEx.exec(line);
                    if (match) {
                        if (self.repetierRegEx.exec(match[0]))
                            self.isRepetierFirmware(true);
                    }
                });
            }
            else
            {
                _.each(data.logs, function (line) {
                    var match = self.eepromDataRegEx.exec(line);
                    if (match) {
                        self.eepromData.push({
                            dataType: match[1],
                            position: match[2],
                            origValue: match[3],
                            value: match[3],
                            description: match[4]
                        });
                    }
                });
            }
        };

        /* get eeprom data on connect after a fxed timeout. Disabled for now.*/
        /*
        self.onEventConnected = function() {
            self._requestFirmwareInfo();
            if (OctoPrint.coreui.selectedTab == "#tab_plugin_eeprom_repetier") {
                self.getEepromOnConnectTimeout = setTimeout(function () {
                    self.getOnConnect();
                }, 3000);
            }
            
        };
        */

        self.onEventConnected = function() {
            self._requestFirmwareInfo();
        };

        self.onEventDisconnected = function() {
            self.isRepetierFirmware(false);
            self.eepromData([]);
        };

        self.loadEeprom = function() {
            self.eepromData([]);
            self._requestEepromData();
        };

        self.saveEeprom = function()  {
            var eepromData = self.eepromData();
            _.each(eepromData, function(data) {
                if (data.origValue != data.value) {
                    self._requestSaveDataToEeprom(data.dataType, data.position, data.value);
                    data.origValue = data.value;
                }
            });
        };

        /* get the eeprom data if the current tab is changed to the eeprom tab. may cause issues while printing if the current tab is changed frequently
        so disabled pending proper testing */
        /*
        self.onTabChange = function (current, previous) {
            if (current == "#tab_plugin_eeprom_repetier") {
                self.getOnConnect();
            } else if (previous == "#tab_plugin_eeprom_repetier") {
                return;
            }
        };
        
        /* getOnConnect is linked primarily to getting the firmware info on connect if the current tab happens to be the eeprom tab but since that + tab change detection
        is disabled, this serves no purpose anymore so disabled pending further testing */
        /*
        self.getOnConnect = function () {
            if (self.isConnected() && self.isRepetierFirmware()) {
                    self.loadEeprom();
                } else {
                    return;
                }
        };
        */
        self._requestFirmwareInfo = function() {
            self.control.sendCustomCommand({ command: "M115" });
        };

        self._requestEepromData = function() {
            self.control.sendCustomCommand({ command: "M205" });
        }
        self._requestSaveDataToEeprom = function(data_type, position, value) {
            var cmd = "M206 T" + data_type + " P" + position;
            if (data_type == 3) {
                cmd += " X" + value;
                self.control.sendCustomCommand({ command: cmd });
            }
            else {
                cmd += " S" + value;
                self.control.sendCustomCommand({ command: cmd });
            }
        }
    }

    OCTOPRINT_VIEWMODELS.push([
        EepromRepetierViewModel,
        ["controlViewModel", "connectionViewModel", "settingsViewModel"],
        ["#tab_plugin_eeprom_repetier"]
    ]);
});
