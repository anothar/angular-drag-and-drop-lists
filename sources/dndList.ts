/// <reference path="..\typings\index.d.ts" />
/// <reference path="interact.d.ts"/>
/// <reference path="angularDirective.ts" />
/// <reference path="dndService.ts"/>

module dndList {
    interface DndListScope extends angular.IScope {
        disabled: boolean,
        scroll: {
            auto: boolean,
            timer?: any,
            speed?: number
        }
    }

    @dndList.directive('$parse', '$timeout', 'dndService')
    class DndList implements ng.IDirective {
        constructor(private $parse: angular.IParseService,
            private $timeout: angular.ITimeoutService,
            private dndService: IDndService) {
        }

        public isMouseInFirstHalf(event, targetNode, horizontal = false) {
            var dragEvent = event.dragEvent;
            var mousePointer = horizontal ? dragEvent.clientX
                : dragEvent.clientY;
            var rect = targetNode.getBoundingClientRect();
            var targetSize = horizontal ? rect.width : rect.height;
            var targetPosition = horizontal ? rect.left : rect.top;
            return mousePointer < targetPosition + targetSize / 2;
        }
        private startScroll(scope: DndListScope,listNode:HTMLElement,direction:1|-1)
        {
            this.stopScroll(scope);
            this.performScroll(scope,listNode,direction);
        }

        private performScroll(scope: DndListScope,listNode:HTMLElement,direction:1|-1)
        {
            if(!scope.scroll.auto)
                return;
            var scrollOffset=0;
            if(direction==1)
            {
                scrollOffset=scope.scroll.speed;
                if(listNode.scrollTop+scrollOffset+listNode.offsetHeight>listNode.scrollHeight)
                    scrollOffset=listNode.scrollHeight-listNode.scrollTop-listNode.offsetHeight;
                if(scrollOffset<0)
                    scrollOffset=0;
            }
            else if(direction==-1)
            {
                scrollOffset=-scope.scroll.speed;
                if(listNode.scrollTop+scrollOffset<0)
                    scrollOffset=-listNode.scrollTop;
            }
            listNode.scrollTop+=scrollOffset;
            scope.scroll.timer=setTimeout(()=>{
                this.performScroll(scope,listNode,direction);
            },20);
        }

        private stopScroll(scope: DndListScope)
        {
            if(!scope.scroll.timer)
                return;
            clearTimeout(scope.scroll.timer);
            scope.scroll.timer=null;
        }

        public link: angular.IDirectiveLinkFn = (scope: DndListScope, element: ng.IAugmentedJQuery,
            attrs: any): void => {
            // While an element is dragged over the list, this placeholder element is inserted
            // at the location where the element would be inserted after dropping

            var horizontal = attrs.dndHorizontalList && scope.$eval(attrs.dndHorizontalList);
            var placeholder = this.getPlaceholderElement(element);
            var placeholderNode = placeholder[0];
            var listNode = element[0];
            placeholder.remove();
            var self = this;
            var dropX = 0;
            var dropY = 0;
            var unsubscribeDragStart: () => void;
            var interactOptions:{accept?:HTMLElement|string}={};
            var scrollOffset=null;
            scope.scroll={
                auto:false
            }
            if(attrs.dndScroll)
            {
                scrollOffset=parseFloat(attrs.dndScroll);
                scope.scroll={
                    auto:true,
                    speed:scrollOffset
                }
            }
            if(attrs.dndAccept)
                interactOptions.accept=attrs.dndAccept;
            interact(element[0]).dropzone(interactOptions).on('dragenter', (event) => {
                this.stopScroll(scope);
                if (scope.disabled) return;
                dropX = 0;
                dropY = 0;
                self.dndService.isDroped = false;
            }).on('dragleave', (event) => {
                this.stopScroll(scope);
                return self.stopDragover(placeholder, element);
            }).on('dropmove', (event) => {
                if (scope.disabled) return self.stopDragover(placeholder, element);
                var source = angular.element(self.dndService.draggingElement);
                // First of all, make sure that the placeholder is shown
                // This is especially important if the list is empty
                if (placeholderNode.parentNode != listNode) {
                    element.append(placeholder);
                }
                var dragTarget: HTMLElement;
                var display = source.css('display');
                source.css('display', 'none');
                dragTarget = <HTMLElement>document.elementFromPoint(event.dragEvent.clientX, event.dragEvent.clientY);
                source.css('display', display);
                if (dragTarget&&dragTarget !== listNode) {
                    // Try to find the node direct directly below the list node.
                    var listItemNode = dragTarget;
                    while (listItemNode.parentNode !== listNode && listItemNode.parentNode) {
                        listItemNode = <HTMLElement>listItemNode.parentNode;
                    }

                    if (listItemNode.parentNode === listNode && listItemNode !== placeholderNode) {
                        // If the mouse pointer is in the upper half of the child element,
                        // we place it before the child element, otherwise below it.
                        if (self.isMouseInFirstHalf(event, listItemNode)) {
                            listNode.insertBefore(placeholderNode, listItemNode);
                        } else {
                            listNode.insertBefore(placeholderNode, listItemNode.nextElementSibling);
                        }
                    }
                }

                if (attrs.dndDragover &&
                    !self.invokeCallback(scope, attrs.dndDragover, event,
                        self.getPlaceholderIndex(listNode, placeholderNode), self.dndService.draggingObject)) {
                    self.stopDragover(placeholder, element);
                }
                if(scrollOffset)
                {
                    var height=source[0].offsetHeight/2;
                    var rect=listNode.getBoundingClientRect();
                    if(event.dragEvent.clientY>=rect.bottom-height&&
                        event.dragEvent.clientY<=rect.bottom+height)
                            this.startScroll(scope,listNode,1);
                    else if(event.dragEvent.clientY<=rect.top+height&&
                        event.dragEvent.clientY>=rect.top-height)
                            this.startScroll(scope,listNode,-1);
                    else
                        this.stopScroll(scope);
                }

                element.addClass("dndDragover");
            }).on('drop', (event) => {
                this.stopScroll(scope);
                //disable duplicate invoke
                if (self.dndService.isDroped)
                    return;
                if (scope.disabled) return self.stopDragover(placeholder, element);
                var transferredObject = self.dndService.draggingObject;
                if (!transferredObject)
                    return self.stopDragover(placeholder, element);
                transferredObject = angular.copy(transferredObject);
                self.$timeout(() => {
                    if (self.dndService.stopDrop) {
                        self.dndService.isDroped = false;
                        self.dndService.draggingElementScope.endDrag();
                        return self.stopDragover(placeholder, element);
                    }
                    // Invoke the callback, which can transform the transferredObject and even abort the drop.
                    var index = self.getPlaceholderIndex(listNode, placeholderNode);
                    if (index < 0)
                        return self.stopDragover(placeholder, element);

                    if (attrs.dndDragover &&
                        !self.invokeCallback(scope, attrs.dndDragover, event,
                            index, transferredObject)) {
                        return self.stopDragover(placeholder, element);
                    }
                    if(attrs.dndBeforeDrop)
                    {
                        var result = self.invokeCallback(scope, attrs.dndBeforeDrop, event, index, transferredObject);
                        if (!result) {
                            self.dndService.isDroped = false;
                            self.dndService.draggingElementScope.endDrag(event);
                            return self.stopDragover(placeholder, element);
                        }
                    }
                    
                    self.dndService.isDroped = true;
                    if (!self.dndService.draggingElementScope.endDrag(event))
                        return self.stopDragover(placeholder, element);
                    index = self.getPlaceholderIndexWithoutNode(listNode, placeholderNode,
                        self.dndService.draggingSourceElement);
                    if (attrs.dndDrop) {
                        transferredObject = self.invokeCallback(scope, attrs.dndDrop, event, index, transferredObject);
                    }

                    // Insert the object into the array, unless dnd-drop took care of that (returned true).
                    if (transferredObject !== true) {
                        scope.$eval(attrs.dndList).splice(index, 0, transferredObject);
                    }
                    self.invokeCallback(scope, attrs.dndInserted, event, index, transferredObject);

                    self.stopDragover(placeholder, element);
                }, 0);
            });
            if (attrs.ngDisabled) {
                scope.disabled = scope.$eval(attrs.ngDisabled);
                if (scope.disabled)
                    interact(element[0]).dropzone(false);
                scope.$watch(attrs.ngDisabled, function (newValue, oldValue) {
                    scope.disabled = <boolean>newValue;
                    if (!newValue)
                        interact(element[0]).dropzone(true);
                    else {
                        interact(element[0]).dropzone(false);
                    }
                });
            }
        }

        stopDragover(placeholder, element) {
            placeholder.remove();
            element.removeClass("dndDragover");
            return true;
        }

        getPlaceholderIndex(listNode, placeholderNode) {
            return Array.prototype.indexOf.call(listNode.children, placeholderNode);
        }

        getPlaceholderIndexWithoutNode(listNode, placeholderNode,ignoreNode) {
            var result=0;
            for(var i=0;i<listNode.children.length;i++,result++)
                {
                    if(listNode.children[i]==placeholderNode)
                        return result;
                    if(listNode.children[i]==ignoreNode)
                        result--;
                }
                return result;
        }

        invokeCallback(scope, expression, event, index, item = null) {
            return this.$parse(expression)(scope, {
                event: event,
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