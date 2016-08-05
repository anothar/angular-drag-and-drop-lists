/// <reference path="..\typings\index.d.ts" />
/// <reference path="interact.d.ts"/>
/// <reference path="angularDirective.ts" />
/// <reference path="dndService.ts" />

module dndList {
    interface DndDraggableScope extends angular.IScope {
        endDrag: (event) => void
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
            var parent: HTMLElement;
            var nextElement: HTMLElement;
            var initwidth;
            var initheight;
            var isDragging = false;
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
            scope.endDrag = (event) => {
                if (!isDragging) return;
                isDragging = false;
                var target = <HTMLElement>element[0];
                target.style.webkitTransform = null;
                target.style.transform = null;
                element.removeClass("dndDragging");
                element.remove();
                var restoreState = function () {
                    element.css('height', initheight);
                    element.css('width', initwidth);
                    if (nextElement)
                        parent.insertBefore(target, nextElement);
                    else
                        parent.appendChild(target);
                    target.style.webkitTransform = null;
                    //@anothar fix for IE
                    target.style.transform = "translate(0,0)";
                }
                if (self.dndService.isDroped) {
                    if (!self.$parse(attrs.dndMoved)(scope, { event: event })) {
                        restoreState();
                    }
                }
                else {
                    restoreState();
                    self.$parse(attrs.dndCanceled)(scope, { event: event });
                }
                self.$parse(attrs.dndDragend)(scope, { event: event, isDroped: self.dndService.isDroped });
                self.dndService.isDroped = false;
            };
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
                    if (isDragging) return;
                    isDragging = true;
                    var target = <HTMLElement>element[0];
                    var lists = target.querySelectorAll('[dnd-list]');
                    for (var i = 0; i < lists.length; i++) {
                        var list = lists[i];
                        interact(list).dropzone(false);
                    }
                    var rect = target.getBoundingClientRect();
                    mouseX = rect.left - event.clientX;
                    mouseY = rect.top - event.clientY;
                    transformX = 0;
                    transformY = 0;
                    parent = element.parent()[0];
                    initheight = element.css('height');
                    initwidth = element.css('width');
                    nextElement = <HTMLElement>target.nextElementSibling;
                    element.addClass("dndDragging");
                    element.css('width', rect.width + "px");
                    element.css('height', rect.height + "px");
                    element.remove();
                    document.body.appendChild(target);
                    rect = target.getBoundingClientRect();
                    // translate the element
                    transformX += event.clientX - rect.left + mouseX;
                    transformY += event.clientY - rect.top + mouseY;
                    target.style.webkitTransform =
                        target.style.transform =
                        'translate(' + transformX + 'px, ' + transformY + 'px)';
                    self.dndService.draggingObject = scope.$eval(attrs.dndDraggable);
                    self.dndService.stopDrop = nodrop;
                    self.dndService.isDroped = false;
                    self.dndService.draggingElementScope = scope;
                    self.dndService.draggingElement = element[0];
                    self.$timeout(() => {
                        self.$parse(attrs.dndDragstart)(scope, { event: event });
                    }, 0);
                }).on('dragend', (event) => {
                    var lists = element[0].querySelectorAll('[dnd-list]');
                    for (var i = 0; i < lists.length; i++) {
                        var list = lists[i];
                        interact(list).dropzone(true);
                    }
                    var target = <HTMLElement>element[0];
                    target.style.webkitTransform = null;
                    target.style.transform = null;
                    self.$timeout(() => { scope.endDrag(event); }, 0);
                }).on('dragmove', (event) => {
                    var rect = element[0].getBoundingClientRect();
                    var target = <HTMLElement>element[0];
                    // translate the element
                    transformX += event.clientX - rect.left + mouseX;
                    transformY += event.clientY - rect.top + mouseY;
                    target.style.webkitTransform =
                        target.style.transform =
                        'translate(' + transformX + 'px, ' + transformY + 'px)';
                }).on('hold', function (event) {
                    var interaction = event.interaction;

                    if (!interaction.interacting()) {
                        interaction.start({ name: 'drag' },
                            event.interactable,
                            event.currentTarget);
                    }
                });
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