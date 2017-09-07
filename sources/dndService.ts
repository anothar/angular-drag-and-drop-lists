/// <reference path="..\typings\index.d.ts" />
/// <reference path="interact.d.ts"/>

module dndList {
    export interface IDndService {
        draggingObject: any,
        isDroped: boolean
        stopDrop: boolean,
        draggingElement: any,
        draggingElementScope:any,
        draggingSourceElement:HTMLElement
    }
    /**
     * DndService
     */
    class DndService {
        public draggingObject: any;
        public stopDrop: boolean;
        public isDroped: boolean;
        public draggingElement: any;
        public draggingSourceElement:HTMLElement;
        public draggingElementScope:any;
    }

    angular.module('dndLists', []).service('dndService',
        DndService);
}