/// <reference path="..\typings\index.d.ts" />
/// <reference path="interact.d.ts"/>

module dndList {
    export interface IDndService {
        draggingObject: any,
        isDroped: boolean
        stopDrop: boolean,
        draggingElement: any,
        draggingElementScope:any
    }
    /**
     * DndService
     */
    class DndService {
        public draggingObject: any;
        public stopDrop: boolean;
        public isDroped: boolean;
        public draggingElement: any;
        public draggingElementScope:any;
    }

    angular.module('dndLists', []).service('dndService',
        DndService);
}