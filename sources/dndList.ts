/// <reference path="..\typings\index.d.ts" />
/// <reference path="interact.d.ts"/>
/// <reference path="angularDirective.ts" />
/// <reference path="dndService.ts"/>

module dndList {
    interface DndListScope extends angular.IScope {
        disabled: boolean,
        isDraggingOver: boolean,
        placeholder: JQuery,
        element: JQuery
    }

    @dndList.directive('$parse', '$timeout', 'dndService', '$q')
    class DndList implements ng.IDirective {
        constructor(private $parse: angular.IParseService,
            private $timeout: angular.ITimeoutService,
            private dndService: IDndService,
            private $q: angular.IQService) {
        }

        public isMouseInFirstHalf(position: IDragPosition, targetNode, horizontal = false) {
            var mousePointer = horizontal ? position.x
                : position.y;
            var rect = targetNode.getBoundingClientRect();
            var targetSize = horizontal ? rect.width : rect.height;
            var targetPosition = horizontal ? rect.left : rect.top;
            return mousePointer < targetPosition + targetSize / 2;
        }

        private checkInRange(scope: DndListScope, element: HTMLElement,
            position: IDragPosition) {
            var rect = element.getBoundingClientRect();
            if (position.x > rect.right || position.x < rect.left
                || position.y > rect.bottom || position.y < rect.top
                || !this.dndService.isDragging || scope.disabled)
                return false;
            return true;
        }

        private dragging(scope: DndListScope, element: HTMLElement,
            position: IDragPosition, attrs: any) {
            if (!this.checkInRange(scope, element, position)) {
                this.stopDrag(scope);
            } else {
                if (!scope.isDraggingOver)
                    this.startDrag(scope, element, position, attrs);
                else
                    this.performDrag(scope, element, position, attrs);
            }
        }

        private stopDrag(scope: DndListScope) {
            if (!scope.isDraggingOver) return;
            scope.isDraggingOver = false;
            scope.placeholder.remove();
            scope.element.removeClass("dndDragover");
        }

        private startDrag(scope: DndListScope, element: HTMLElement,
            position: IDragPosition, attrs: any) {
            if (scope.disabled || !this.dndService.isDragging) return;
            var source =angular.element(this.dndService.draggingElement);
            var display = source.css('display');
            source.css('display', 'none');
            var dragTarget = <HTMLElement>document.elementFromPoint(position.x,position.y);
            source.css('display', display);
            if (dragTarget && dragTarget !== element) {
                // Try to find the node direct directly below the list node.
                var listItemNode = dragTarget;
                while (listItemNode.parentNode !== element && listItemNode.parentNode) {
                    listItemNode = <HTMLElement>listItemNode.parentNode;
                }
                if(listItemNode&&listItemNode.parentNode==element)
                {
                    scope.isDraggingOver = true;
                    this.performDrag(scope, element, position, attrs);
                }
            }
        }

        private performDrag(scope: DndListScope, element: HTMLElement,
                position: IDragPosition, attrs: any) {
            if (scope.disabled || !this.dndService.isDragging) return;
            var source = angular.element(this.dndService.draggingElement);
            // First of all, make sure that the placeholder is shown
            // This is especially important if the list is empty
            var placeholderNode = scope.placeholder[0];
            var listNode = scope.element[0];
            if (attrs.dndDragover)
                if (attrs.dndDragover &&
                    !this.invokeCallback(scope, attrs.dndDragover, position,
                        this.getPlaceholderIndex(listNode, placeholderNode), this.dndService.draggingObject)) {
                    this.stopDrag(scope);
                    return;
                }
            if (placeholderNode.parentNode != listNode)
                element.parentNode.appendChild(placeholderNode);
            
            var dragTarget: HTMLElement;
            var display = source.css('display');
            source.css('display', 'none');
            dragTarget = <HTMLElement>document.elementFromPoint(
                position.x, position.y);
            source.css('display', display);


            if (dragTarget && dragTarget !== listNode) {
                // Try to find the node direct directly below the list node.
                var listItemNode = dragTarget;
                while (listItemNode.parentNode !== listNode && listItemNode.parentNode) {
                    listItemNode = <HTMLElement>listItemNode.parentNode;
                }

                if (listItemNode.parentNode === listNode && listItemNode !== placeholderNode) {
                    // If the mouse pointer is in the upper half of the child element,
                    // we place it before the child element, otherwise below it.
                    if (this.isMouseInFirstHalf(position, listItemNode)) {
                        listNode.insertBefore(placeholderNode, listItemNode);
                    } else {
                        listNode.insertBefore(placeholderNode, listItemNode.nextElementSibling);
                    }
                }
            }

            scope.element.addClass("dndDragover");
        }

        private tryDrop(scope: DndListScope, position: IDragPosition, attrs: any):
            Promise<IDropResult> | IDropResult {

            if (!this.checkInRange(scope, scope.element[0], position))
                return {
                    success: false
                };
            if (!scope.isDraggingOver)
                return {
                    success: false
                };
            var transferredObject = this.dndService.draggingObject;
            if (!transferredObject)
                return {
                    success: true
                };
            transferredObject = angular.copy(transferredObject);
            var placeholderNode = scope.placeholder[0];
            var listNode = scope.element[0];
            return new Promise((resolve: (result: IDropResult) => void, reject) => {
                this.$timeout(() => {
                    // Invoke the callback, which can transform the transferredObject and even abort the drop.
                    var index = this.getPlaceholderIndex(listNode, placeholderNode);
                    if (index < 0) {
                        this.stopDrag(scope);
                        resolve({
                            success: false
                        });
                        return;
                    }

                    if (attrs.dndDragover &&
                        !this.invokeCallback(scope, attrs.dndDragover, position,
                            index, transferredObject)) {
                        this.stopDrag(scope);
                        resolve({
                            success: false
                        });
                        return;
                    }
                    if (attrs.dndBeforeDrop) {
                        var result = this.invokeCallback(scope,
                            attrs.dndBeforeDrop, position, index, transferredObject);
                        if (!result) {
                            this.stopDrag(scope);
                            resolve({
                                success: false
                            });
                            return;
                        }
                    }
                    index = this.getPlaceholderIndexWithoutNode(listNode, placeholderNode,
                        this.dndService.draggingSourceElement);

                    resolve({
                        success: true,
                        callback: (result: boolean) => {
                            this.stopDrag(scope);
                            if (!result)
                                return;

                            if (attrs.dndDrop) {
                                transferredObject = this.invokeCallback(scope, attrs.dndDrop, position, index, transferredObject);
                            }

                            // Insert the object into the array, unless dnd-drop took care of that (returned true).
                            if (transferredObject !== true) {
                                scope.$eval(attrs.dndList).splice(index, 0, transferredObject);
                            }
                            this.invokeCallback(scope, attrs.dndInserted, position, index, transferredObject);
                        }
                    });
                }, 0);
            });
        }

        public link: angular.IDirectiveLinkFn = (scope: DndListScope, element: ng.IAugmentedJQuery,
            attrs: any): void => {
            // While an element is dragged over the list, this placeholder element is inserted
            // at the location where the element would be inserted after dropping
            var placeholder = this.getPlaceholderElement(element);
            placeholder.remove();
            var self = this;
            scope.placeholder = placeholder;
            scope.element = element;
            var interactOptions: { accept?: HTMLElement | string } = {};
            if (attrs.dndAccept)
                interactOptions.accept = attrs.dndAccept;
            var dragEvent = (position: IDragPosition) => {
                this.dragging(scope, element[0], position, attrs);
            }
            this.dndService.subscribeDragPositionChanged(scope, (value) => {
                dragEvent(value);
            });
            this.dndService.subscribeIsDraggingChanged(scope, value => {
                if (!value)
                    this.stopDrag(scope);
            });
            this.dndService.subscribeDrop(scope, position => {
                return this.tryDrop(scope, position, attrs);
            });
            if (attrs.ngDisabled) {
                scope.disabled = scope.$eval(attrs.ngDisabled);
                scope.$watch(attrs.ngDisabled, (newValue, oldValue) => {
                    scope.disabled = <boolean>newValue;
                    if (!newValue)
                        this.stopDrag(scope);
                });
            }
        }

        getPlaceholderIndex(listNode, placeholderNode) {
            return Array.prototype.indexOf.call(listNode.children, placeholderNode);
        }

        getPlaceholderIndexWithoutNode(listNode, placeholderNode, ignoreNode) {
            var result = 0;
            for (var i = 0; i < listNode.children.length; i++ , result++) {
                if (listNode.children[i] == placeholderNode)
                    return result;
                if (listNode.children[i] == ignoreNode)
                    result--;
            }
            return result;
        }

        invokeCallback(scope, expression, position: IDragPosition, index, item = null) {
            return this.$parse(expression)(scope, {
                position: position,
                index: index,
                item: item || undefined
            });
        }

        public getPlaceholderElement(element: JQuery) {
            var placeholder: JQuery;
            angular.forEach(element.children(),
                (childNode) => {
                    var child = angular.element(childNode);
                    if (child.hasClass('dndPlaceholder')) {
                        placeholder = child;
                    }
                });
            return placeholder || angular.element("<li class='dndPlaceholder'></li>");
        }
    }
    angular.module('dndLists').directive('dndList',
        <any>DndList);

}