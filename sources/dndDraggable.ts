/// <reference path="..\typings\index.d.ts" />
/// <reference path="interact.d.ts"/>
/// <reference path="angularDirective.ts" />
/// <reference path="dndService.ts" />
/// <reference path="browserHelper.ts"/>
module dndList {
    interface DndDraggableScope extends angular.IScope {
        endDrag: (event) => Promise<boolean>,
        disabled: boolean,
        mouseStartPosition: IDragPosition,
        transform: IDragPosition,
        dragging: boolean
    }

    @dndList.directive('$parse', '$timeout', 'dndService', '$window')
    class DndDraggable implements ng.IDirective {
        constructor(private $parse: angular.IParseService,
            private $timeout: angular.ITimeoutService,
            private dndService: IDndService,
            private $window: angular.IWindowService) {
        }

        private async dragEnd(scope: DndDraggableScope, element: ng.IAugmentedJQuery,
            event: JQueryMouseEventObject, attrs: any): Promise<void> {
            if (!scope.dragging) return;
            this.performDrag(scope, element, event, attrs);
            scope.dragging = false;
            //I don't know why but in quickrun dragend is called twice

            (<HTMLElement>this.dndService.draggingElement).parentNode.removeChild(this.dndService.draggingElement);
            element.removeClass("dndDragging");
            var drop = await this.dndService.drop();
            this.$timeout(() => {
                element[0].style.display = 'block';
                //bug with edge - it selects just after drop
                //var selection = document.getSelection();
                //if (selection)
                //    selection.removeAllRanges();

                angular.element(document.body).removeClass('dndDraggingBody');
                if (drop.success) {
                    if (!this.$parse(attrs.dndMoved)(scope, { event: event })) {
                        if (drop.callback)
                            drop.callback(true);
                        return;
                    }
                }
                else {
                    this.$parse(attrs.dndCanceled)(scope, { event: event });
                    if (drop.callback)
                        drop.callback(false);
                    return;
                }
                this.$parse(attrs.dndDragend)(scope, { event: event, isDroped: true });
                if (drop.callback)
                    drop.callback(true);
            }, 0);
        }

        private dragStart(scope: DndDraggableScope, element: ng.IAugmentedJQuery,
            event: JQueryMouseEventObject, attrs: any) {
            if (scope.disabled) return;
            if (scope.dragging) return;
            //var selection = document.getSelection();
            //if (selection)
            //    selection.removeAllRanges();
            scope.dragging = true;
            angular.element(document.body).addClass('dndDraggingBody');
            var source = <HTMLElement>element[0];
            var rect = source.getBoundingClientRect();
            var mouseX = rect.left - event.clientX;
            var mouseY = rect.top - event.clientY;
            scope.mouseStartPosition = {
                x: mouseX,
                y: mouseY
            }
            var transformX = 0;
            var transformY = 0;
            var newNode = <HTMLElement>element[0].cloneNode(true);
            var newElement = angular.element(newNode);
            newElement.addClass("dndDragging");
            newElement.css('width', rect.width + "px");
            newElement.css('height', rect.height + "px");
            document.body.appendChild(newElement[0]);
            rect = source.getBoundingClientRect();
            // translate the element
            transformX += event.clientX - rect.left + mouseX;
            transformY += event.clientY - rect.top + mouseY;
            scope.transform = {
                x: transformX,
                y: transformY
            };
            newNode.style.webkitTransform =
                newNode.style.transform =
                'translate(' + transformX + 'px, ' + transformY + 'px)';
            source.style.display = 'none';

            this.dndService.draggingObject = scope.$eval(attrs.dndDraggable);
            this.dndService.draggingElementScope = scope;
            this.dndService.draggingElement = newNode;
            this.dndService.draggingSourceElement = <HTMLElement>element[0];
            this.dndService.isDragging = true;
            this.$timeout(() => {
                this.$parse(attrs.dndDragstart)(scope, { event: event });
                this.performDrag(scope,element,event,attrs);
            }, 0);
        }

        private performDrag(scope: DndDraggableScope, element: ng.IAugmentedJQuery,
            event: JQueryMouseEventObject, attrs: any) {
            if (scope.disabled) return;
            if (!scope.dragging) return;
            var target = this.dndService.draggingElement;
            var rect = target.getBoundingClientRect();
            // translate the element

            scope.transform.x += event.clientX - rect.left + scope.mouseStartPosition.x;
            scope.transform.y += event.clientY - rect.top + scope.mouseStartPosition.y;
            if (event.clientX >= 0 && event.clientX < this.$window.outerWidth &&
                event.clientY >= 0 && event.clientY < this.$window.outerHeight) {
                target.style.webkitTransform =
                    target.style.transform =
                    'translate(' + scope.transform.x + 'px, ' + scope.transform.y + 'px)';
                this.dndService.dragPosition = {
                    x: event.clientX,
                    y: event.clientY
                };
            }
        }

        public link: angular.IDirectiveLinkFn = async (scope: DndDraggableScope, element: ng.IAugmentedJQuery,
            attrs: any): Promise<void> => {
            var self = this;
            var isMouseDown;
            var mousemove = (event: JQueryMouseEventObject) => {
                this.performDrag(scope, element, event, attrs);
            }
            var mousedown = (event: JQueryMouseEventObject) => {
                if (isMouseDown) {
                    mouseUp(event);
                    return;
                }
                event.preventDefault();
                isMouseDown = true;
                angular.element(window).off('mouseup', mouseUp);
                angular.element(window).on('mouseup', mouseUp);
                setTimeout(() => {
                    if (isMouseDown && !scope.dragging) {
                        this.dragStart(scope, element, event, attrs);
                        angular.element(window).off('mousemove', mousemove);
                        angular.element(window).on('mousemove', mousemove);
                    }
                }, 200);
            }
            var mouseUp = (event: JQueryMouseEventObject) => {
                isMouseDown = false;
                angular.element(window).off('mouseup', mouseUp);
                if (scope.dragging) {
                    this.dragEnd(scope, element, event, attrs);
                    angular.element(window).off('mousemove', mousemove);
                }
            }

            var unregisterDrag = () => {
                if (scope.dragging)
                    this.dragEnd(scope, element, <any>{
                        clientX: this.dndService.dragPosition.x,
                        clientY: this.dndService.dragPosition.y
                    }, attrs);
                angular.element(window).off('mouseup', mouseUp);
                angular.element(window).off('mousemove', mousemove);
                if (draggableElements)
                    angular.element(draggableElements).off('mousedown', mousedown);
            }
            var registerDrag = (elements: any, remember: boolean = true) => {
                if (typeof elements == 'string') {
                    elements = element[0].querySelectorAll(elements);
                    if (remember)
                        draggableElements = elements;
                    for (var i = 0; i < elements.length; i++)
                        registerDrag(elements[i], false);
                    return;
                }
                if (remember)
                    draggableElements = elements;
                angular.element(elements).off('mousedown', mousedown);
                angular.element(elements).on('mousedown', mousedown);
            }
            if (attrs.ngDisabled) {
                scope.disabled = scope.$eval(attrs.ngDisabled);
                scope.$watch(attrs.ngDisabled, async (newValue, oldValue) => {
                    scope.disabled = <boolean>newValue;
                    if (!newValue)
                        registerDrag(draggableElements);
                    else
                        unregisterDrag();
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
            scope.$on('$destroy', () =>
                unregisterDrag());
        }
    }
    angular.module('dndLists').directive('dndDraggable',
        <any>DndDraggable);

}