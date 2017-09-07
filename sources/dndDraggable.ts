/// <reference path="..\typings\index.d.ts" />
/// <reference path="interact.d.ts"/>
/// <reference path="angularDirective.ts" />
/// <reference path="dndService.ts" />

module dndList {
    interface DndDraggableScope extends angular.IScope {
        endDrag: (event) => boolean,
        disabled: boolean
    }

    @dndList.directive('$parse', '$timeout', 'dndService')
    class DndDraggable implements ng.IDirective {
        constructor(private $parse: angular.IParseService,
            private $timeout: angular.ITimeoutService,
            private dndService: IDndService) {
        }

        public link: angular.IDirectiveLinkFn = (scope: DndDraggableScope, element: ng.IAugmentedJQuery,
            attrs: any): void => {
            var self = this;
            var mouseX = 0;
            var mouseY = 0;
            var transformX = 0;
            var transformY = 0;
            var parent: HTMLElement;
            var nextElement: HTMLElement;
            var initwidth;
            var initheight;
            var isDragging = false;
            var registerDrag = (elements: any) => {
                if (typeof elements == 'string') {
                    elements = element[0].querySelectorAll(elements);
                    for (var i = 0; i < elements.length; i++)
                        registerDrag(elements[i]);
                    return;
                }
                draggableElements = elements;
                interact(elements).draggable({
                    // disable the default drag start by down->move
                    manualStart: true
                }).on('move', (event) => {
                    if (isDragging) return;
                    if (scope.disabled) return;
                    var interaction = event.interaction;
                   
                    // if the pointer was moved while being held down
                    // and an interaction hasn't started yet
                    if (!interaction.pointerIsDown || interaction.interacting())
                        return;
                    angular.element(document.body).addClass('dndDraggingBody');
                    isDragging = true;
                    var source = <HTMLElement>element[0];
                    var lists = source.querySelectorAll('[dnd-list]');
                    for (var i = 0; i < lists.length; i++) {
                        var list = lists[i];
                        interact(list).dropzone(false);
                    }
                    var rect = source.getBoundingClientRect();
                    mouseX = rect.left - event.clientX;
                    mouseY = rect.top - event.clientY;
                    transformX = 0;
                    transformY = 0;
                    var newNode = <HTMLElement>element[0].cloneNode(true);
                    var newElement = angular.element(newNode);
                    parent = element.parent()[0];
                    initheight = element.css('height');
                    initwidth = element.css('width');
                    nextElement = <HTMLElement>source.nextElementSibling;
                    newElement.addClass("dndDragging");
                    newElement.css('width', rect.width + "px");
                    newElement.css('height', rect.height + "px");
                    document.body.appendChild(newElement[0]);
                    rect = source.getBoundingClientRect();
                    // translate the element
                    transformX += event.clientX - rect.left + mouseX;
                    transformY += event.clientY - rect.top + mouseY;
                    newNode.style.webkitTransform =
                        newNode.style.transform =
                        'translate(' + transformX + 'px, ' + transformY + 'px)';
                    self.dndService.draggingObject = scope.$eval(attrs.dndDraggable);
                    self.dndService.isDroped = false;
                    self.dndService.draggingElementScope = scope;
                    self.dndService.draggingElement = newNode;
                    self.dndService.draggingSourceElement= <HTMLElement>element[0];
                    self.$timeout(() => {
                        self.$parse(attrs.dndDragstart)(scope, { event: event });
                    }, 0);
                    interact(newNode).draggable({
                        inertia: true,
                        autoScroll: false,
                    })
                    event.interaction.start({ name: 'drag' },
                        event.interactable, newNode);
                    source.style.display = 'none';
                    
                }).on('dragend', (event) => {
                    
                    if (scope.disabled) return;
                    event.interaction.stop();
                    //I don't know why but in quickrun dragend is called twice
                    if(!event.target||!event.target.parentNode)
                        return;
                    (<HTMLElement>event.target).parentNode.removeChild(event.target);
                    var lists = element[0].querySelectorAll('[dnd-list]');
                    for (var i = 0; i < lists.length; i++) {
                        var list = lists[i];
                        interact(list).dropzone(true);
                    }
                    self.$timeout(() => { 
                        scope.endDrag(event); 
                        element[0].style.display = 'block';
                        angular.element(document.body).removeClass('dndDraggingBody');
                    }, 0);
                }).on('dragmove', (event) => {
                    if (scope.disabled) return;
                    var rect = event.target.getBoundingClientRect();
                    var target = event.target;
                    // translate the element
                    transformX += event.clientX - rect.left + mouseX;
                    transformY += event.clientY - rect.top + mouseY;
                    target.style.webkitTransform =
                        target.style.transform =
                        'translate(' + transformX + 'px, ' + transformY + 'px)';
                });
            }
            if (attrs.ngDisabled) {
                scope.disabled = scope.$eval(attrs.ngDisabled);
                scope.$watch(attrs.ngDisabled, function (newValue, oldValue) {
                    scope.disabled = <boolean>newValue;
                    if (!newValue)
                        registerDrag(draggableElements);
                    else {
                        unregisterDrag();
                        scope.endDrag(null);
                    }
                });
            }
            var clickHandler = function (event) {
                if (scope.disabled) return;
                if (!attrs.dndSelected) return;

                scope.$apply(function () {
                    self.$parse(attrs.dndSelected)(scope, { event: event });
                });

                // Prevent triggering dndSelected in parent elements.
                event.stopPropagation();
            };
            var registerClick = () => {
                element.off('click touchstart', clickHandler);
                element.on('click touchstart', clickHandler);
            };
            registerClick();
            var draggableElements: any;
            var unregisterDrag = () => {
                interact(draggableElements).draggable(false);
            }
            scope.endDrag = (event) => {
                if (!isDragging) return;
                isDragging = false;
                element.removeClass("dndDragging");
                if (self.dndService.isDroped) {
                    if (!self.$parse(attrs.dndMoved)(scope, { event: event })) {
                        self.dndService.isDroped = false;
                        return false;
                    }
                }
                else {
                    self.$parse(attrs.dndCanceled)(scope, { event: event });
                    return false;
                }
                self.$parse(attrs.dndDragend)(scope, { event: event, isDroped: self.dndService.isDroped });
                self.dndService.isDroped = false;
                return true;
            };
            

            if (attrs.dndHandle) {
                var handleString = scope.$eval(attrs.dndHandle);
                registerDrag(handleString);
                scope.$watch(attrs.dndHandle, function (newValue, oldValue, scope) {
                    unregisterDrag();
                    registerDrag(newValue);
                });
            } else {
                registerDrag(element[0]);
            }
        }
    }
    angular.module('dndLists').directive('dndDraggable',
        <any>DndDraggable);

}