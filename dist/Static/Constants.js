"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Filters = exports.WSEvents = exports.WSOpCodes = void 0;
var WSOpCodes;
(function (WSOpCodes) {
    WSOpCodes[WSOpCodes["HELLO"] = 0] = "HELLO";
    WSOpCodes[WSOpCodes["VOICE_STATE_UPDATE"] = 1] = "VOICE_STATE_UPDATE";
    WSOpCodes[WSOpCodes["IDENTIFY"] = 10] = "IDENTIFY";
})(WSOpCodes = exports.WSOpCodes || (exports.WSOpCodes = {}));
var WSEvents;
(function (WSEvents) {
    WSEvents["READY"] = "READY";
    WSEvents["TRACK_ADD"] = "TRACK_ADD";
    WSEvents["TRACKS_ADD"] = "TRACKS_ADD";
    WSEvents["TRACK_START"] = "TRACK_START";
    WSEvents["TRACK_FINISH"] = "TRACK_FINISH";
    WSEvents["TRACK_ERROR"] = "TRACK_ERROR";
    WSEvents["QUEUE_END"] = "QUEUE_END";
    WSEvents["QUEUE_STATE_UPDATE"] = "QUEUE_STATE_UPDATE";
    WSEvents["VOICE_CONNECTION_READY"] = "VOICE_CONNECTION_READY";
    WSEvents["VOICE_CONNECTION_ERROR"] = "VOICE_CONNECTION_ERROR";
    WSEvents["VOICE_CONNECTION_DISCONNECT"] = "VOICE_CONNECTION_DISCONNECT";
    WSEvents["AUDIO_PLAYER_ERROR"] = "AUDIO_PLAYER_ERROR";
    WSEvents["AUDIO_PLAYER_STATUS"] = "AUDIO_PLAYER_STATUS";
})(WSEvents = exports.WSEvents || (exports.WSEvents = {}));
var Filters;
(function (Filters) {
    Filters["bassboost"] = "bass=g=20";
    Filters["eight"] = "apulsator=hz=0.09";
    Filters["vaporwave"] = "aresample=48000,asetrate=48000*0.8";
    Filters["nightcore"] = "aresample=48000,asetrate=48000*1.25";
    Filters["phaser"] = "aphaser=in_gain=0.4";
    Filters["tremolo"] = "tremolo";
    Filters["vibrato"] = "vibrato=f=6.5";
    Filters["reverse"] = "areverse";
    Filters["treble"] = "treble=g=5";
    Filters["normalizer"] = "dynaudnorm=g=101";
    Filters["surrounding"] = "surround";
    Filters["pulsator"] = "apulsator=hz=1";
    Filters["subboost"] = "asubboost";
    Filters["karaoke"] = "stereotools=mlev=0.03";
    Filters["flanger"] = "flanger";
    Filters["gate"] = "agate";
    Filters["haas"] = "haas";
    Filters["mcompand"] = "mcompand";
    Filters["mono"] = "pan=mono|c0=.5*c0+.5*c1";
    Filters["mstlr"] = "stereotools=mode=ms>lr";
    Filters["mstrr"] = "stereotools=mode=ms>rr";
    Filters["compressor"] = "compand=points=-80/-105|-62/-80|-15.4/-15.4|0/-12|20/-7.6";
    Filters["expander"] = "compand=attacks=0:points=-80/-169|-54/-80|-49.5/-64.6|-41.1/-41.1|-25.8/-15|-10.8/-4.5|0/0|20/8.3";
    Filters["softlimiter"] = "compand=attacks=0:points=-80/-80|-12.4/-12.4|-6/-8|0/-6.8|20/-2.8";
    Filters["chorus"] = "chorus=0.7:0.9:55:0.4:0.25:2";
    Filters["chorus2d"] = "chorus=0.6:0.9:50|60:0.4|0.32:0.25|0.4:2|1.3";
    Filters["chorus3d"] = "chorus=0.5:0.9:50|60|40:0.4|0.32|0.3:0.25|0.4|0.3:2|2.3|1.3";
    Filters["fadein"] = "afade=t=in:ss=0:d=10";
})(Filters = exports.Filters || (exports.Filters = {}));
