/// <reference path="..\typings\index.d.ts" />
/// <reference path="interact.d.ts"/>
/// <reference path="angularDirective.ts" />
/// <reference path="dndService.ts"/>

module dndList {
    export function IsIE(): boolean {
        if (/MSIE 10/i.test(navigator.userAgent)) {
            // This is internet explorer 10
            return true;
        }

        if (/MSIE 9/i.test(navigator.userAgent) || /rv:11.0/i.test(navigator.userAgent)) {
            // This is internet explorer 9 or 11
            return true;
        }

        // if (/Edge\/\d./i.test(navigator.userAgent)) {
        //     // This is Microsoft Edge
        //     return true;
        // }
        return false;
    }
}