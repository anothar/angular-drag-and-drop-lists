/// <reference path="..\typings\index.d.ts" />
/// <reference path="interact.d.ts"/>
/// <reference path="angularDirective.ts" />
/// <reference path="dndService.ts" />

module dndList {
    interface DndDraggableScope extends angular.IScope {
    }

    @dndList.directive('$parse', '$timeout', 'dndService')
    class DndDraggable implements ng.IDirective {
        constructor(private $parse: angular.IParseService,
            private $timeout: angular.ITimeoutService,
            private dndService: IDndService) {
        }

        public link: Function = (scope: DndDraggableScope, element: ng.IAugmentedJQuery,
            attrs: any): void => {
            var self = this;
            var mouseX = 0;
            var mouseY = 0;
            var transformX = 0;
            var transformY = 0;
            var nodrop: boolean = false;
            element.on('click touchstart', function (event) {
                if (!attrs.dndSelected) return;

                scope.$apply(function () {
                    self.$parse(attrs.dndSelected)(scope, { event: event });
                });

                // Prevent triggering dndSelected in parent elements.
                event.stopPropagation();
            });
            var unregisterDrag = (elements: any) => {
                if (typeof elements == 'string') {
                    elements = element[0].querySelectorAll(elements);
                    for (var i = 0; i < elements.length; i++)
                        unregisterDrag(elements[i]);
                    return;
                }
                interact(elements).draggable(false);
            }
            var registerDrag = (elements: any) => {
                if (typeof elements == 'string') {
                    elements = element[0].querySelectorAll(elements);
                    for (var i = 0; i < elements.length; i++)
                        registerDrag(elements[i]);
                    return;
                }
                interact(elements).draggable({
                    inertia: true,
                    autoScroll: true,
                }).on('dragstart', (event) => {
                    var rect = element[0].getBoundingClientRect();
                    mouseX = rect.left - event.clientX;
                    mouseY = rect.top - event.clientY;
                    transformX = 0;
                    transformY = 0;
                    element.addClass("dndDragging");
                    self.dndService.draggingObject = scope.$eval(attrs.dndDraggable);
                    self.dndService.stopDrop = nodrop;
                    self.dndService.isDroped = false;
                    self.dndService.draggingElement = element[0];
                    self.$timeout(() => {
                        self.$parse(attrs.dndDragstart)(scope, { event: event });
                    }, 0);
                }).on('dragend', (event) => {
                    self.$timeout(() => {
                        var target = <HTMLElement>element[0];
                        target.style.webkitTransform =
                            target.style.transform = null;
                        element.removeClass("dndDragging");
                        if (self.dndService.isDroped)
                            self.$parse(attrs.dndMoved)(scope, { event: event });
                        else
                            self.$parse(attrs.dndCanceled)(scope, { event: event });
                        self.$parse(attrs.dndDragend)(scope, { event: event, isDroped: self.dndService.isDroped });
                        self.dndService.isDroped = false;
                    }, 0);

                }).on('dragmove', (event) => {
                    var rect = element[0].getBoundingClientRect();
                    var target = <HTMLElement>element[0];
                    // translate the element
                    transformX += event.clientX - rect.left + mouseX;
                    transformY += event.clientY - rect.top + mouseY;
                    target.style.webkitTransform =
                        target.style.transform =
                        'translate(' + transformX + 'px, ' + transformY + 'px)';
                })
            }
            if (attrs.dndHandle) {
                var handleString = scope.$eval(attrs.dndHandle);
                registerDrag(handleString);
                scope.$watch(attrs.dndHandle, function (newValue, oldValue, scope) {
                    unregisterDrag(oldValue);
                    registerDrag(newValue);
                });
            } else {
                registerDrag(element[0]);
            }

            if (attrs.dndNodrop) {
                nodrop = scope.$eval(attrs.dndNodrop);
                scope.$watch(attrs.dndNodrop, function (value) {
                    if (value == true)
                        interact(element[0]).draggable(false);
                    else
                        interact(element[0]).draggable(true);
                    nodrop = <boolean>value;
                });
            }
        }
    }
    angular.module('dndLists').directive('dndDraggable',
        <any>DndDraggable);

}