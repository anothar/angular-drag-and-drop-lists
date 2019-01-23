/// <reference path="..\typings\index.d.ts" />
/// <reference path="interact.d.ts"/>

module dndList {
    export interface IDndService {
        draggingObject: any,
        isDragging: boolean;
        drop: () => Promise<IDropResult>;
        subscribeDrop($scope: angular.IScope,
            onDropHandler: (position: IDragPosition) => IDropResult | Promise<IDropResult>)
            : void;
        draggingElement: any,
        draggingElementScope: any,
        dragPosition: IDragPosition;
        draggingSourceElement: HTMLElement,
        subscribeIsDraggingChanged: ($scope: angular.IScope,
            onDraggingChangedHandler: (isDragging: boolean) => void)
            => void;
        subscribeDragPositionChanged: ($scope: angular.IScope,
            onDragPositionChangedHandler: (position: IDragPosition) => void)
            => void;
    }

    export interface IDropResult {
        success: boolean,
        callback?: (result:boolean) => void
    }

    export interface IDragPosition {
        x: number;
        y: number;
    }
    /**
     * DndService
     */
    class DndService implements IDndService {
        private _isDragging: boolean;
        private _dragPositionChangedHandlers: ((position: IDragPosition) => void)[] = [];
        private _dropHandlers: ((position: IDragPosition) => IDropResult | Promise<IDropResult>)[] = [];

        private _dragPosition: IDragPosition;

        public draggingObject: any;
        public draggingElement: any;
        public draggingSourceElement: HTMLElement;
        public draggingElementScope: any;


        static _DndService_IsDraggingChanged_ =
            '_DndService_IsDraggingChanged_';
        static $inject = ['$rootScope'];

        constructor(private $rootScope: angular.IRootScopeService) { }

        get isDragging(): boolean {
            return this._isDragging;
        }

        set isDragging(value: boolean) {
            if (this._isDragging !== value) {
                this._isDragging = value;
                this.broadcastIsDraggingChanged(value);
            }
        }

        get dragPosition(): IDragPosition {
            return angular.copy(this._dragPosition);
        }

        set dragPosition(value: IDragPosition) {
            if (value && (!this._dragPosition || this._dragPosition.x != value.x ||
                this._dragPosition.y != value.y)) {
                this._dragPosition = angular.copy(value);
                this.broadcastDragPositionChanged();
            }
        }

        public subscribeIsDraggingChanged($scope: angular.IScope,
            onDraggingChangedHandler: (isDragging: boolean) => void)
            : void {
            $scope.$on(DndService._DndService_IsDraggingChanged_,
                (event, args) => {
                    onDraggingChangedHandler(args);
                });
        }

        public subscribeDragPositionChanged($scope: angular.IScope,
            onDragPositionChangedHandler: (position: IDragPosition) => void) {
            this._dragPositionChangedHandlers.push(onDragPositionChangedHandler);
            $scope.$on('$destroy', () => {
                this._dragPositionChangedHandlers.splice(
                    this._dragPositionChangedHandlers.indexOf(onDragPositionChangedHandler), 1);
            });
        }

        public subscribeDrop($scope: angular.IScope,
            onDropHandler: (position: IDragPosition) => IDropResult | Promise<IDropResult>)
            : void {
            this._dropHandlers.push(onDropHandler);
            $scope.$on('$destroy', () => {
                this._dropHandlers.splice(
                    this._dropHandlers.indexOf(onDropHandler), 1);
            });
        }

        public async drop(): Promise<IDropResult> {
            var position = angular.copy(this._dragPosition);
            for (let index = 0; index < this._dropHandlers.length; index++) {
                var handler = this._dropHandlers[index];
                var result = handler(position);

                if ((<IDropResult>result).success !== undefined) {
                    if ((<IDropResult>result).success) {
                        this.isDragging = false;
                        return result;
                    }
                } else {
                    var res = await <Promise<IDropResult>>result;
                    if (res.success) {
                        this.isDragging = false;
                        return result;
                    }
                }
            }

            this.isDragging = false;
            return {
                success: false
            };
        }

        private broadcastDragPositionChanged(): void {
            var position = angular.copy(this._dragPosition);
            for (var handler of this._dragPositionChangedHandlers)
                handler(position);
        }

        private broadcastIsDraggingChanged(isDragging: boolean): void {
            this.$rootScope.$broadcast(DndService._DndService_IsDraggingChanged_,
                isDragging);
        }
    }

    angular.module('dndLists', []).service('dndService',
        DndService);
}