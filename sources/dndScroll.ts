/// <reference path="..\typings\index.d.ts" />
/// <reference path="interact.d.ts"/>
/// <reference path="angularDirective.ts" />
/// <reference path="dndService.ts"/>

module dndList {
    interface IDndScrollScope extends angular.IScope {
        dndScroll: IDndScrollSettings;
        timer: any;
    }

    export interface IDndScrollSettings {
        speed: number;
        offset: number;
        offsetOuter: number;
    }

    @dndList.directive('$timeout', 'dndService')
    class DndScroll implements ng.IDirective {
        scope = {
            dndScroll: "="
        };

        constructor(private $timeout: angular.ITimeoutService,
            private dndService: IDndService) {
        }

        private isInRange(scope: IDndScrollScope, element: HTMLElement,
            x: number,
            y: number): boolean {
            var offset = scope.dndScroll.offset;
            var offsetOuter = scope.dndScroll.offsetOuter;
            var rect = element.getBoundingClientRect();
            if (x > rect.right || x < rect.left) {
                return false;
            } else
                if (y >= rect.bottom - offset && y <= rect.bottom + offsetOuter)
                    return true;
                else if (y <= rect.top + offset && y >= rect.top - offsetOuter)
                    return true;
                else
                    return false;
            return false;
        }

        private dragging(scope: IDndScrollScope, element: HTMLElement,
            x: number,
            y: number) {
            var offset = scope.dndScroll.offset;
            var offsetOuter = scope.dndScroll.offsetOuter;
            var rect = element.getBoundingClientRect();
            if (x > rect.right || x < rect.left) {
                this.stopScroll(scope);
            } else
                if (y >= rect.bottom - offset && y <= rect.bottom + offsetOuter)
                    this.startScroll(scope, element, 1);
                else if (y <= rect.top + offset && y >= rect.top - offsetOuter)
                    this.startScroll(scope, element, -1);
                else
                    this.stopScroll(scope);
        }

        private startScroll(scope: IDndScrollScope, element: HTMLElement, direction: 1 | -1) {
            this.stopScroll(scope);
            this.performScroll(scope, element, direction);
        }

        private performScroll(scope: IDndScrollScope, element: HTMLElement, direction: 1 | -1) {
            if (!this.dndService.isDragging)
                return;
            if (!this.isInRange(scope, element, this.dndService.dragPosition.x,
                this.dndService.dragPosition.y))
                return;
            var scrollOffset = 0;
            if (direction == 1) {
                scrollOffset = scope.dndScroll.speed;
                if (element.scrollTop + scrollOffset + element.offsetHeight > element.scrollHeight)
                    scrollOffset = element.scrollHeight - element.scrollTop - element.offsetHeight;
                if (scrollOffset < 0)
                    scrollOffset = 0;
            }
            else if (direction == -1) {
                scrollOffset = -scope.dndScroll.speed;
                if (element.scrollTop + scrollOffset < 0)
                    scrollOffset = -element.scrollTop;
            }
            element.scrollTop += scrollOffset;
            scope.timer = setTimeout(() => {
                this.performScroll(scope, element, direction);
            }, 20);
        }

        private stopScroll(scope: IDndScrollScope) {
            if (!scope.timer)
                return;
            clearTimeout(scope.timer);
            scope.timer = null;
        }

        public link: angular.IDirectiveLinkFn = (scope: IDndScrollScope,
            element: ng.IAugmentedJQuery,
            attrs: any): void => {
            if (!scope.dndScroll.speed)
                scope.dndScroll.speed = 6;
            if (!scope.dndScroll.offset)
                scope.dndScroll.offset = 20;
            if (!scope.dndScroll.offsetOuter)
                scope.dndScroll.offsetOuter = 0;
            var dragEvent = (position: IDragPosition) => {
                this.dragging(scope, element[0], position.x,
                    position.y);
            }

            this.dndService.subscribeDragPositionChanged(scope, (value) => {
                dragEvent(value);
            });
            this.dndService.subscribeIsDraggingChanged(scope, value => {
                if (!value)
                    this.stopScroll(scope);
            });
        }
    }
    angular.module('dndLists').directive('dndScroll',
        <any>DndScroll);
}